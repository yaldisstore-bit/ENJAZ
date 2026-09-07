import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import {
  type FieldAssignmentSummary,
  type FieldEvidenceType,
  type FieldFailureReason,
  type FieldLocationEvidence,
  type FieldLocationPolicy,
  type FieldOperationsContext,
  type FieldPriority,
  type FieldVisitOutcome,
  type FieldVisitSummary,
} from '../../features/field-operations/fieldOperationsCommands.ts';
import {
  createFieldOfflineQueue,
  syncFieldOfflineQueue,
  type FieldOfflineOperation,
  type FieldOfflineQueueItem,
} from '../../features/field-operations/fieldOperationsOfflineQueue.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';

type LoadState = 'loading' | 'ready' | 'error';
type ViewMode = 'operations' | 'runner';
type TransactionOption = Readonly<{ id: string; label: string }>;
type AssignmentDraft = Readonly<{ transactionId: string; assignedUserId: string; scheduledFor: string; destinationLabel: string; department: string; priority: FieldPriority }>;
type VisitDraft = Readonly<{ outcome: FieldVisitOutcome; failureReason: FieldFailureReason | ''; outcomeNote: string; counterDepartment: string; officialReference: string; officialFeePaid: string }>;
type EvidenceDraft = Readonly<{ evidenceType: FieldEvidenceType; documentId: string; note: string }>;

const OFFLINE_QUEUE = createFieldOfflineQueue();
const EMPTY_VISIT_DRAFT: VisitDraft = Object.freeze({ outcome: 'completed', failureReason: '', outcomeNote: '', counterDepartment: '', officialReference: '', officialFeePaid: '' });
const EMPTY_EVIDENCE_DRAFT: EvidenceDraft = Object.freeze({ evidenceType: 'other', documentId: '', note: '' });
const PRIORITY_LABELS: Readonly<Record<FieldPriority, string>> = Object.freeze({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' });
const ASSIGNMENT_STATUS_LABELS: Readonly<Record<FieldAssignmentSummary['status'], string>> = Object.freeze({ queued: 'بالانتظار', in_progress: 'في الميدان', visit_complete: 'بانتظار التسليم', handoff_complete: 'مسلّمة للمكتب', cancelled: 'ملغاة' });
const VISIT_STATUS_LABELS: Readonly<Record<FieldVisitSummary['status'], string>> = Object.freeze({ checked_in: 'داخل الزيارة', completed: 'مكتملة', could_not_complete: 'تعذر الإكمال' });
const FAILURE_LABELS: Readonly<Record<FieldFailureReason, string>> = Object.freeze({ office_closed: 'الدائرة مغلقة', missing_requirement: 'متطلب ناقص', payment_issue: 'مشكلة دفع', authority_delay: 'تأخير لدى الجهة', rejected: 'رفضت الجهة الإجراء', technical_issue: 'عطل تقني', other: 'سبب آخر' });

function localDateInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function safeDate(value: string | null): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(parsed));
}
function messageFor(error: unknown): string {
  if (error instanceof DataAccessError) {
    if (error.dataCode === 'DATA_OUTCOME_UNKNOWN') return 'تعذر تأكيد النتيجة. احتفظ إنجاز بالعملية محلياً وسيعيد إرسالها بنفس الهوية عند الاتصال دون تكرار.';
    if (error.dataCode === 'DATA_UNAVAILABLE') return 'الاتصال غير متاح. حُفظت العملية محلياً بانتظار المزامنة.';
    if (error.dataCode === 'DATA_CONFLICT') return 'تعارضت العملية مع حالة أحدث. لم تتم الكتابة فوق الحالة الموجودة.';
    if (error.dataCode === 'DATA_FORBIDDEN') return 'لا تملك صلاحية تنفيذ هذه العملية أو لم تعد أنت الموظف المكلّف.';
    if (error.dataCode === 'DATA_VALIDATION_FAILED') return 'رفض المصدر الموثوق البيانات. راجع الحقول المطلوبة.';
  }
  return 'تعذر إكمال العملية. لم ينشئ إنجاز نتيجة بديلة أو مزيفة.';
}
function isQueueable(error: unknown) {
  return error instanceof DataAccessError && (error.dataCode === 'DATA_UNAVAILABLE' || error.dataCode === 'DATA_OUTCOME_UNKNOWN');
}
function getOneShotLocation(policy: FieldLocationPolicy): Promise<FieldLocationEvidence | null> {
  if (policy === 'disabled') return Promise.resolve(null);
  if (!('geolocation' in navigator)) {
    return policy === 'required' ? Promise.reject(new Error('LOCATION_REQUIRED_UNAVAILABLE')) : Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracyMeters: position.coords.accuracy }),
      () => policy === 'required' ? reject(new Error('LOCATION_REQUIRED_DENIED')) : resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  });
}
function locationError(error: unknown) {
  if (error instanceof Error && (error.message === 'LOCATION_REQUIRED_UNAVAILABLE' || error.message === 'LOCATION_REQUIRED_DENIED')) return 'سياسة مساحة العمل تتطلب دليل موقع لهذه الزيارة، ولم يتمكن المتصفح من توفيره.';
  return messageFor(error);
}

export function LiveFieldOperationsExperience() {
  const userId = useCurrentUserId();
  const dataFactory = useDataLayerFactory();
  const gateway = useFieldOperationsCommandGateway();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<ViewMode>('operations');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [context, setContext] = useState<FieldOperationsContext | null>(null);
  const [transactions, setTransactions] = useState<readonly TransactionOption[]>([]);
  const [queueItems, setQueueItems] = useState<readonly FieldOfflineQueueItem[]>([]);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>(() => ({ transactionId: '', assignedUserId: '', scheduledFor: localDateInput(), destinationLabel: '', department: '', priority: 'normal' }));
  const [visitDrafts, setVisitDrafts] = useState<Readonly<Record<string, VisitDraft>>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Readonly<Record<string, EvidenceDraft>>>({});
  const [handoffNotes, setHandoffNotes] = useState<Readonly<Record<string, string>>>({});
  const [reassignUsers, setReassignUsers] = useState<Readonly<Record<string, string>>>({});
  const [reassignReasons, setReassignReasons] = useState<Readonly<Record<string, string>>>({});

  const refreshQueue = useCallback((resolvedWorkspaceId: string) => setQueueItems(OFFLINE_QUEUE.list(resolvedWorkspaceId)), []);
  const reload = useCallback(async (resolvedWorkspaceId: string) => {
    const next = await gateway.loadContext(resolvedWorkspaceId);
    setContext(next);
    const layer = dataFactory.forWorkspace(resolvedWorkspaceId);
    const [txPage, companyPage] = await Promise.all([layer.transactions.list({ limit: 100 }), layer.companies.list({ limit: 100 })]);
    const names = new Map(companyPage.items.map((company) => [company.id, company.display_name || company.legal_name] as const));
    setTransactions(Object.freeze(txPage.items.filter((tx) => !tx.deleted_at && !tx.archived_at && tx.status !== 'completed').map((tx) => Object.freeze({ id: tx.id, label: `${tx.type} · ${names.get(tx.company_id) ?? 'شركة'} · ${tx.id.slice(0, 8)}` }))));
    refreshQueue(resolvedWorkspaceId);
    setLoadState('ready');
    return next;
  }, [dataFactory, gateway, refreshQueue]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!userId) throw new Error('AUTH_REQUIRED');
        const resolved = await dataFactory.resolveWorkspaceId(userId);
        if (!resolved) throw new Error('WORKSPACE_REQUIRED');
        if (!active) return;
        setWorkspaceId(resolved);
        await reload(resolved);
      } catch (error) {
        if (!active) return;
        setLoadState('error');
        setNotice(messageFor(error));
      }
    })();
    return () => { active = false; };
  }, [dataFactory, reload, userId]);

  useEffect(() => {
    const setConnected = () => setOnline(true);
    const setDisconnected = () => setOnline(false);
    window.addEventListener('online', setConnected);
    window.addEventListener('offline', setDisconnected);
    return () => { window.removeEventListener('online', setConnected); window.removeEventListener('offline', setDisconnected); };
  }, []);

  const syncOffline = useCallback(async () => {
    if (!workspaceId || !online || busyKey) return;
    setBusyKey('sync');
    setNotice(null);
    try {
      const result = await syncFieldOfflineQueue(OFFLINE_QUEUE, gateway, workspaceId);
      refreshQueue(workspaceId);
      if (result.blockedOperationId) setNotice('توقفت المزامنة عند عملية متعارضة. لم يتجاوز إنجاز التعارض تلقائياً؛ راجع الحالة قبل المتابعة.');
      else if (result.remaining === 0) setNotice(result.synced > 0 ? `تمت مزامنة ${result.synced} عملية ميدانية دون تكرار.` : 'لا توجد عمليات محلية معلقة.');
      else setNotice('لا تزال بعض العمليات محلية بانتظار اتصال موثوق.');
      await reload(workspaceId);
    } catch (error) { setNotice(messageFor(error)); }
    finally { setBusyKey(null); }
  }, [busyKey, gateway, online, refreshQueue, reload, workspaceId]);

  useEffect(() => { if (online && workspaceId && queueItems.some((item) => item.state === 'pending')) void syncOffline(); }, [online, queueItems.length, syncOffline, workspaceId]);

  const queueOrRun = useCallback(async (key: string, operation: FieldOfflineOperation, run: () => Promise<unknown>) => {
    if (!workspaceId || busyKey) return;
    setBusyKey(key);
    setNotice(null);
    try {
      if (!navigator.onLine) {
        OFFLINE_QUEUE.enqueue(operation);
        refreshQueue(workspaceId);
        setNotice('لا يوجد اتصال. حُفظت العملية محلياً وستُرسل بنفس الهوية عند عودة الشبكة.');
        return;
      }
      try {
        await run();
        await reload(workspaceId);
      } catch (error) {
        if (!isQueueable(error)) throw error;
        OFFLINE_QUEUE.enqueue(operation);
        refreshQueue(workspaceId);
        setNotice(messageFor(error));
      }
    } catch (error) { setNotice(locationError(error)); }
    finally { setBusyKey(null); }
  }, [busyKey, refreshQueue, reload, workspaceId]);

  const createAssignment = async () => {
    if (!workspaceId || busyKey) return;
    if (!assignmentDraft.transactionId || !assignmentDraft.assignedUserId || !assignmentDraft.destinationLabel.trim()) { setNotice('اختر المعاملة والموظف واكتب وجهة الزيارة.'); return; }
    setBusyKey('assignment:create'); setNotice(null);
    try {
      await gateway.upsertAssignment({ workspaceId, assignmentId: null, expectedVersion: null, transactionId: assignmentDraft.transactionId, assignedUserId: assignmentDraft.assignedUserId, scheduledFor: assignmentDraft.scheduledFor, destinationLabel: assignmentDraft.destinationLabel, department: assignmentDraft.department || null, priority: assignmentDraft.priority });
      setAssignmentDraft({ transactionId: '', assignedUserId: '', scheduledFor: localDateInput(), destinationLabel: '', department: '', priority: 'normal' });
      await reload(workspaceId);
    } catch (error) { setNotice(messageFor(error)); }
    finally { setBusyKey(null); }
  };

  const changeLocationPolicy = async (policy: FieldLocationPolicy) => {
    if (!workspaceId || busyKey || !online) return;
    setBusyKey('policy'); setNotice(null);
    try { await gateway.setLocationPolicy(workspaceId, policy); await reload(workspaceId); }
    catch (error) { setNotice(messageFor(error)); }
    finally { setBusyKey(null); }
  };

  const checkIn = async (assignment: FieldAssignmentSummary) => {
    if (!workspaceId || !context) return;
    try {
      const location = await getOneShotLocation(context.locationPolicy);
      const operationId = crypto.randomUUID();
      const operation: FieldOfflineOperation = { kind: 'check_in', operationId, workspaceId, assignmentId: assignment.id, expectedAssignmentVersion: assignment.version, location, queuedAt: new Date().toISOString() };
      await queueOrRun(`checkin:${assignment.id}`, operation, () => gateway.checkIn(workspaceId, assignment.id, assignment.version, location, operationId));
    } catch (error) { setNotice(locationError(error)); }
  };

  const checkOut = async (visit: FieldVisitSummary | { readonly id: string; readonly version: number }) => {
    if (!workspaceId || !context) return;
    const draft = visitDrafts[visit.id] ?? EMPTY_VISIT_DRAFT;
    if (draft.outcome === 'could_not_complete' && !draft.failureReason) { setNotice('اختر سبب تعذر إكمال الزيارة.'); return; }
    try {
      const location = await getOneShotLocation(context.locationPolicy);
      const operationId = crypto.randomUUID();
      const operation: FieldOfflineOperation = { kind: 'check_out', operationId, workspaceId, visitId: visit.id, expectedVisitVersion: visit.version, outcome: draft.outcome, failureReason: draft.outcome === 'could_not_complete' ? draft.failureReason as FieldFailureReason : null, outcomeNote: draft.outcomeNote || null, counterDepartment: draft.counterDepartment || null, officialReference: draft.officialReference || null, officialFeePaid: draft.officialFeePaid || null, location, queuedAt: new Date().toISOString() };
      await queueOrRun(`checkout:${visit.id}`, operation, () => gateway.checkOut({ workspaceId, visitId: visit.id, expectedVisitVersion: visit.version, outcome: draft.outcome, failureReason: draft.outcome === 'could_not_complete' ? draft.failureReason as FieldFailureReason : null, outcomeNote: draft.outcomeNote || null, counterDepartment: draft.counterDepartment || null, officialReference: draft.officialReference || null, officialFeePaid: draft.officialFeePaid || null, location, clientOperationId: operationId }));
    } catch (error) { setNotice(locationError(error)); }
  };

  const addEvidence = async (visit: FieldVisitSummary) => {
    if (!workspaceId) return;
    const draft = evidenceDrafts[visit.id] ?? EMPTY_EVIDENCE_DRAFT;
    if (draft.evidenceType !== 'other' && !draft.documentId.trim()) { setNotice('أدخل معرّف مستند إنجاز الموثوق للملف. لا يخزّن Runner ملفات وهمية أو bytes داخل Offline Queue.'); return; }
    if (draft.evidenceType === 'other' && !draft.note.trim()) { setNotice('أضف ملاحظة للدليل النصي.'); return; }
    const operationId = crypto.randomUUID();
    const operation: FieldOfflineOperation = { kind: 'evidence', operationId, workspaceId, visitId: visit.id, expectedVisitVersion: visit.version, evidenceType: draft.evidenceType, documentId: draft.documentId.trim() || null, note: draft.note.trim() || null, queuedAt: new Date().toISOString() };
    await queueOrRun(`evidence:${visit.id}`, operation, () => gateway.addEvidence(workspaceId, visit.id, visit.version, draft.evidenceType, draft.documentId.trim() || null, draft.note.trim() || null, operationId));
  };

  const handoff = async (assignment: FieldAssignmentSummary) => {
    if (!workspaceId) return;
    const note = (handoffNotes[assignment.id] ?? '').trim();
    if (note.length < 3) { setNotice('اكتب ملخص التسليم للمكتب.'); return; }
    const operationId = crypto.randomUUID();
    const operation: FieldOfflineOperation = { kind: 'handoff', operationId, workspaceId, assignmentId: assignment.id, expectedVersion: assignment.version, note, queuedAt: new Date().toISOString() };
    await queueOrRun(`handoff:${assignment.id}`, operation, () => gateway.handoff(workspaceId, assignment.id, assignment.version, note, operationId));
  };

  const reassign = async (assignment: FieldAssignmentSummary) => {
    if (!workspaceId) return;
    const nextUser = reassignUsers[assignment.id] ?? '';
    const reason = (reassignReasons[assignment.id] ?? '').trim();
    if (!nextUser || reason.length < 3) { setNotice('اختر الموظف الجديد واكتب سبب إعادة التكليف.'); return; }
    const operationId = crypto.randomUUID();
    const operation: FieldOfflineOperation = { kind: 'reassign', operationId, workspaceId, assignmentId: assignment.id, expectedVersion: assignment.version, assignedUserId: nextUser, reason, queuedAt: new Date().toISOString() };
    await queueOrRun(`reassign:${assignment.id}`, operation, () => gateway.reassign(workspaceId, assignment.id, assignment.version, nextUser, reason, operationId));
  };

  const runnerAssignments = useMemo(() => context?.assignments.filter((assignment) => assignment.assignedUserId === userId && assignment.status !== 'handoff_complete' && assignment.status !== 'cancelled') ?? [], [context, userId]);
  const serverVisitByAssignment = useMemo(() => new Map((context?.visits ?? []).filter((visit) => visit.status === 'checked_in').map((visit) => [visit.assignmentId, visit] as const)), [context]);
  const localCheckInByAssignment = useMemo(() => new Map(queueItems.filter((item) => item.operation.kind === 'check_in').map((item) => [item.operation.kind === 'check_in' ? item.operation.assignmentId : '', item] as const)), [queueItems]);
  const blockedCount = queueItems.filter((item) => item.state === 'blocked').length;

  return <div className="r2-screen r2-field-live" data-field-stage="8.3" data-field-authority="field_assignments_visits_evidence_receipts" data-finance-write-authority="none" data-shadow-workflow="false" data-location-tracking="visit_scoped_only">
    <header className="r2-field-hero">
      <div><p className="r2-eyebrow">Phase 8.3 · Operations + M5</p><h1>مركز العمليات</h1><p className="r2-supporting">تشغيل مكتبي وميداني من مصدر واحد: لا Workflow ظلّي، لا دفع مالي من Runner، ولا تتبع موقع بالخلفية.</p></div>
      <div className="r2-field-hero__status"><span className={`r2-field-network ${online ? 'is-online' : 'is-offline'}`}>{online ? 'متصل' : 'Offline'}</span><span className="r2-chip">{queueItems.length} معلّقة</span></div>
    </header>

    <div className="r2-field-tabs" role="tablist" aria-label="وضع التشغيل">
      <button type="button" role="tab" aria-selected={view === 'operations'} onClick={() => setView('operations')}>مركز العمليات</button>
      <button type="button" role="tab" aria-selected={view === 'runner'} onClick={() => setView('runner')}>Runner Mode</button>
    </div>

    {notice && <div className="r2-field-alert" role="alert">{notice}</div>}
    {queueItems.length > 0 && <section className="r2-field-syncbar" data-offline-pending={queueItems.length} data-offline-blocked={blockedCount}><div><strong>{queueItems.length} عملية محلية</strong><span>{blockedCount ? `${blockedCount} متعارضة وتحتاج مراجعة` : 'ستُرسل بنفس UUID؛ إعادة المحاولة لا تنشئ نسخة ثانية.'}</span></div><button type="button" className="r2-action r2-action--secondary" disabled={!online || Boolean(busyKey)} onClick={() => void syncOffline()}>{busyKey === 'sync' ? 'جارٍ التحقق…' : 'مزامنة الآن'}</button></section>}

    {loadState === 'loading' && <section className="r2-intel-card r2-field-state"><strong>جارٍ تحميل التشغيل الموثوق…</strong></section>}
    {loadState === 'error' && <section className="r2-intel-card r2-field-state"><strong>تعذر تحميل مركز العمليات.</strong><p>لم يتم إنشاء لوحة بديلة أو بيانات تجريبية.</p></section>}

    {loadState === 'ready' && context && view === 'operations' && <>
      <section className="r2-field-kpis" aria-label="الصحة التشغيلية">
        <article><span>معاملات نشطة</span><strong>{context.metrics.activeTransactions}</strong></article>
        <article><span>متلكئة</span><strong>{context.metrics.stalledTransactions}</strong></article>
        <article className={context.metrics.highCriticalBlockers ? 'is-risk' : ''}><span>مانعات High/Critical</span><strong>{context.metrics.highCriticalBlockers}</strong></article>
        <article><span>موافقات أتمتة</span><strong>{context.metrics.pendingAutomationApprovals}</strong></article>
        <article><span>زيارات بالطابور</span><strong>{context.metrics.queuedAssignments}</strong></article>
        <article><span>زيارات جارية</span><strong>{context.metrics.activeVisits}</strong></article>
      </section>

      <section className="r2-field-grid">
        <article className="r2-intel-card r2-field-panel">
          <div className="r2-field-panel__head"><div><p className="r2-eyebrow">Workspace Policy</p><h2>دليل الموقع</h2></div><span className="r2-chip">{context.locationPolicy}</span></div>
          <p>موقع الزيارة لحظي فقط عند Check-in/Check-out. لا يوجد background tracking.</p>
          <div className="r2-field-segmented">
            {(['disabled','optional','required'] as const).map((item) => <button key={item} type="button" aria-pressed={context.locationPolicy === item} disabled={!online || Boolean(busyKey)} onClick={() => void changeLocationPolicy(item)}>{item === 'disabled' ? 'معطل' : item === 'optional' ? 'اختياري' : 'إلزامي'}</button>)}
          </div>
        </article>

        <article className="r2-intel-card r2-field-panel r2-field-assignment-form">
          <div className="r2-field-panel__head"><div><p className="r2-eyebrow">Office → Field</p><h2>تكليف زيارة</h2></div></div>
          <label>المعاملة<select value={assignmentDraft.transactionId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, transactionId: event.target.value }))}><option value="">اختر معاملة نشطة</option>{transactions.map((tx) => <option key={tx.id} value={tx.id}>{tx.label}</option>)}</select></label>
          <label>الموظف<select value={assignmentDraft.assignedUserId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, assignedUserId: event.target.value }))}><option value="">اختر موظفاً</option>{context.members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
          <div className="r2-field-form-row"><label>التاريخ<input type="date" value={assignmentDraft.scheduledFor} onChange={(event) => setAssignmentDraft((current) => ({ ...current, scheduledFor: event.target.value }))} /></label><label>الأولوية<select value={assignmentDraft.priority} onChange={(event) => setAssignmentDraft((current) => ({ ...current, priority: event.target.value as FieldPriority }))}>{Object.entries(PRIORITY_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          <label>الجهة / الوجهة<input maxLength={320} value={assignmentDraft.destinationLabel} onChange={(event) => setAssignmentDraft((current) => ({ ...current, destinationLabel: event.target.value }))} placeholder="مثال: دائرة تسجيل الشركات" /></label>
          <label>القسم / الشباك المتوقع<input maxLength={240} value={assignmentDraft.department} onChange={(event) => setAssignmentDraft((current) => ({ ...current, department: event.target.value }))} placeholder="اختياري" /></label>
          <button type="button" className="r2-action r2-action--primary" disabled={!online || Boolean(busyKey)} onClick={() => void createAssignment()}>{busyKey === 'assignment:create' ? 'جارٍ الحفظ…' : 'إنشاء التكليف'}</button>
          {!online && <small>إنشاء التكليف إجراء مكتبي موثوق ويحتاج اتصالاً؛ Runner فقط يحتفظ بعمليات الزيارة المحلية.</small>}
        </article>
      </section>

      <section className="r2-field-section" aria-labelledby="operations-queue-title">
        <div className="r2-field-section__head"><div><p className="r2-eyebrow">Operational Queue</p><h2 id="operations-queue-title">طابور الزيارات</h2></div><span className="r2-chip">{context.assignments.length}</span></div>
        {context.assignments.length === 0 ? <div className="r2-intel-card r2-field-empty">لا توجد تكليفات ميدانية. لا يعرض إنجاز مهاماً مختلقة.</div> : <div className="r2-field-cards">{context.assignments.map((assignment) => <article className="r2-intel-card r2-field-assignment" key={assignment.id} data-assignment-status={assignment.status}>
          <div className="r2-field-assignment__top"><div><p className="r2-eyebrow">{assignment.companyName}</p><h3>{assignment.destinationLabel}</h3><p>{assignment.transactionType} · {assignment.department ?? 'قسم غير محدد'}</p></div><span className={`r2-field-priority is-${assignment.priority}`}>{PRIORITY_LABELS[assignment.priority]}</span></div>
          <div className="r2-field-meta"><span><b>الموظف</b>{assignment.assignedUserName}</span><span><b>الموعد</b>{assignment.scheduledFor}</span><span><b>الحالة</b>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</span><span><b>المانعات</b>{assignment.openBlockers}</span></div>
          <div className="r2-field-next"><small>الخطوة المطلوبة</small><strong>{assignment.nextRequiredAction}</strong></div>
          {assignment.status !== 'handoff_complete' && assignment.status !== 'cancelled' && <details className="r2-field-reassign"><summary>إعادة تكليف طارئة</summary><div><select value={reassignUsers[assignment.id] ?? ''} onChange={(event) => setReassignUsers((current) => ({ ...current, [assignment.id]: event.target.value }))}><option value="">الموظف الجديد</option>{context.members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select><input maxLength={1200} value={reassignReasons[assignment.id] ?? ''} onChange={(event) => setReassignReasons((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="سبب إعادة التكليف" /><button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => void reassign(assignment)}>إعادة التكليف</button></div></details>}
        </article>)}</div>}
      </section>
    </>}

    {loadState === 'ready' && context && view === 'runner' && <section className="r2-field-runner" aria-labelledby="runner-title">
      <div className="r2-field-section__head"><div><p className="r2-eyebrow">M5 · Mobile-first</p><h2 id="runner-title">Runner Mode</h2><p>زياراتك فقط. دليل الموقع حسب السياسة، والمصاريف المسجلة هنا دليل ميداني وليست دفعة مالية.</p></div><span className="r2-chip">{runnerAssignments.length}</span></div>
      {runnerAssignments.length === 0 ? <div className="r2-intel-card r2-field-empty">لا توجد زيارة مكلّف بها حالياً.</div> : <div className="r2-field-runner-list">{runnerAssignments.map((assignment) => {
        const serverVisit = serverVisitByAssignment.get(assignment.id);
        const localCheckIn = localCheckInByAssignment.get(assignment.id);
        const localVisitId = localCheckIn?.operation.kind === 'check_in' ? localCheckIn.operation.operationId : null;
        const activeVisit = serverVisit ?? (localVisitId ? { id: localVisitId, version: 1 } : null);
        const draft = activeVisit ? (visitDrafts[activeVisit.id] ?? EMPTY_VISIT_DRAFT) : EMPTY_VISIT_DRAFT;
        return <article className="r2-field-runner-card" key={assignment.id} data-runner-assignment={assignment.id}>
          <header><div><p className="r2-eyebrow">{assignment.scheduledFor} · {PRIORITY_LABELS[assignment.priority]}</p><h3>{assignment.destinationLabel}</h3><p>{assignment.companyName} · {assignment.transactionType}</p></div><span className="r2-chip">{localVisitId && !serverVisit ? 'محلي غير مزامن' : ASSIGNMENT_STATUS_LABELS[assignment.status]}</span></header>
          <div className="r2-field-next"><small>التالي</small><strong>{assignment.nextRequiredAction}</strong></div>

          {!activeVisit && assignment.status === 'queued' && <button type="button" className="r2-action r2-action--primary r2-field-big-action" disabled={Boolean(busyKey)} onClick={() => void checkIn(assignment)}>{busyKey === `checkin:${assignment.id}` ? 'جارٍ بدء الزيارة…' : 'تسجيل الوصول'}</button>}

          {activeVisit && <div className="r2-field-checkout" data-local-visit={serverVisit ? 'false' : 'true'}>
            <div className="r2-field-checkout__banner"><strong>الزيارة جارية</strong><span>{serverVisit ? `بدأت ${safeDate(serverVisit.checkInAt)}` : 'محفوظة محلياً ولم تصل الخادم بعد'}</span></div>
            <div className="r2-field-segmented"><button type="button" aria-pressed={draft.outcome === 'completed'} onClick={() => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, outcome: 'completed', failureReason: '' } }))}>تم الإنجاز</button><button type="button" aria-pressed={draft.outcome === 'could_not_complete'} onClick={() => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, outcome: 'could_not_complete' } }))}>تعذر الإكمال</button></div>
            {draft.outcome === 'could_not_complete' && <label>السبب<select value={draft.failureReason} onChange={(event) => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, failureReason: event.target.value as FieldFailureReason | '' } }))}><option value="">اختر السبب</option>{Object.entries(FAILURE_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            <label>ملخص الزيارة<textarea maxLength={1600} value={draft.outcomeNote} onChange={(event) => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, outcomeNote: event.target.value } }))} placeholder="ماذا حدث؟" /></label>
            <div className="r2-field-form-row"><label>القسم/الشباك<input maxLength={320} value={draft.counterDepartment} onChange={(event) => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, counterDepartment: event.target.value } }))} /></label><label>الرقم الرسمي<input maxLength={320} value={draft.officialReference} onChange={(event) => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, officialReference: event.target.value } }))} /></label></div>
            <label>رسم رسمي مدفوع — دليل فقط، ليس Payment<input inputMode="decimal" value={draft.officialFeePaid} onChange={(event) => setVisitDrafts((current) => ({ ...current, [activeVisit.id]: { ...draft, officialFeePaid: event.target.value.replace(/[^0-9.]/g,'') } }))} placeholder="0.00" /></label>
            <button type="button" className="r2-action r2-action--primary r2-field-big-action" disabled={Boolean(busyKey)} onClick={() => void checkOut(activeVisit)}>{busyKey === `checkout:${activeVisit.id}` ? 'جارٍ تثبيت النتيجة…' : 'إنهاء الزيارة'}</button>
          </div>}

          {serverVisit && <details className="r2-field-evidence"><summary>إضافة دليل للزيارة</summary>{(() => { const evidence = evidenceDrafts[serverVisit.id] ?? EMPTY_EVIDENCE_DRAFT; return <div><select value={evidence.evidenceType} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [serverVisit.id]: { ...evidence, evidenceType: event.target.value as FieldEvidenceType } }))}><option value="other">ملاحظة ميدانية</option><option value="photo">صورة موجودة في مستندات إنجاز</option><option value="document">مستند إنجاز</option><option value="receipt">وصل موجود في إنجاز</option></select>{evidence.evidenceType !== 'other' && <input value={evidence.documentId} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [serverVisit.id]: { ...evidence, documentId: event.target.value } }))} placeholder="Document UUID" dir="ltr" />}<textarea maxLength={1200} value={evidence.note} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [serverVisit.id]: { ...evidence, note: event.target.value } }))} placeholder="ملاحظة الدليل" /><button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => void addEvidence(serverVisit)}>ربط الدليل</button><small>رفع bytes جديد غير مزيف: حتى تُربط قناة Storage موثوقة، Runner يربط مستنداً موجوداً أو يسجل ملاحظة نصية فقط.</small></div>; })()}</details>}

          {assignment.status === 'visit_complete' && <div className="r2-field-handoff"><label>تسليم للمكتب<textarea maxLength={1200} value={handoffNotes[assignment.id] ?? ''} onChange={(event) => setHandoffNotes((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="ما الذي يجب أن يعرفه المكتب؟" /></label><button type="button" className="r2-action r2-action--primary" disabled={Boolean(busyKey)} onClick={() => void handoff(assignment)}>تسليم للمكتب</button></div>}
        </article>;
      })}</div>}
    </section>}
  </div>;
}
