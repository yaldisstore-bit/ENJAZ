import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useAutomationCommandGateway } from '../../features/automation/AutomationCommandContext.tsx';
import { createCommandCenterOrchestrator, type CommandCenterSnapshot, type CommandWorkflowDecision } from '../../features/command/commandCenter.ts';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import { useFinanceCommandGateway } from '../../features/finance/FinanceCommandContext.tsx';
import { useGovernmentProcedureCommandGateway } from '../../features/workflow/GovernmentProcedureCommandContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type LoadState = 'loading' | 'ready' | 'error';
type Props = Readonly<{ navigate: (id: R2DestinationId) => void }>;

function errorMessage(): string {
  return 'تعذر تأكيد الحالة من جميع السلطات الموثوقة. لم يعرض مركز القيادة صورة جزئية قد تكون مضللة.';
}

function priorityLabel(level: CommandWorkflowDecision['level']): string {
  if (level === 'critical') return 'حرج';
  if (level === 'high') return 'مرتفع';
  return 'متوسط';
}

function snapshotAge(loadedAt: string): string {
  const timestamp = Date.parse(loadedAt);
  if (!Number.isFinite(timestamp)) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { timeStyle: 'short' }).format(new Date(timestamp));
}

function actionSnapshotLabel(snapshot: Readonly<Record<string, unknown>>): string {
  const type = typeof snapshot.type === 'string' ? snapshot.type : null;
  if (type === 'workflow_transition') return 'انتقال سير عمل حساس';
  if (type === 'create_followup') return 'إنشاء متابعة';
  return 'إجراء أتمتة يحتاج قرارًا';
}

export function LiveCommandCenterExperience({ navigate }: Props) {
  const userId = useCurrentUserId();
  const dataFactory = useDataLayerFactory();
  const finance = useFinanceCommandGateway();
  const workflow = useGovernmentProcedureCommandGateway();
  const automation = useAutomationCommandGateway();
  const field = useFieldOperationsCommandGateway();
  const orchestrator = useMemo(() => createCommandCenterOrchestrator({ dataFactory, finance, workflow, automation, field }), [automation, dataFactory, field, finance, workflow]);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [workflowReasons, setWorkflowReasons] = useState<Readonly<Record<string, string>>>({});
  const [approvalNotes, setApprovalNotes] = useState<Readonly<Record<string, string>>>({});
  const [fieldMembers, setFieldMembers] = useState<Readonly<Record<string, string>>>({});
  const [fieldReasons, setFieldReasons] = useState<Readonly<Record<string, string>>>({});

  const reload = useCallback(async () => {
    if (!userId) throw new Error('AUTH_USER_REQUIRED');
    const next = await orchestrator.load(userId);
    setSnapshot(next);
    setLoadState('ready');
    return next;
  }, [orchestrator, userId]);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    setMessage(null);
    void (async () => {
      try {
        if (!userId) throw new Error('AUTH_USER_REQUIRED');
        const next = await orchestrator.load(userId);
        if (!active) return;
        setSnapshot(next);
        setLoadState('ready');
      } catch {
        if (!active) return;
        setSnapshot(null);
        setLoadState('error');
        setMessage(errorMessage());
      }
    })();
    return () => { active = false; };
  }, [orchestrator, userId]);

  const runCommand = useCallback(async (key: string, operation: (current: CommandCenterSnapshot) => Promise<unknown>) => {
    if (!snapshot || busyKey) return;
    setBusyKey(key);
    setMessage(null);
    try {
      await operation(snapshot);
      await reload();
      setMessage('تم تأكيد القرار من السلطة المالكة وإعادة مزامنة مركز القيادة.');
    } catch {
      setMessage('تعذر تأكيد القرار. لم يفترض مركز القيادة نجاحه؛ أُعيدت القراءة من المصدر الموثوق إن أمكن.');
      try { await reload(); } catch { setLoadState('error'); setSnapshot(null); }
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, reload, snapshot]);

  const decideApproval = (approvalId: string, decision: 'approved' | 'rejected') => {
    void runCommand(`approval:${approvalId}`, (current) => orchestrator.decideAutomationApproval({
      workspaceId: current.workspaceId,
      approvalId,
      decision,
      note: approvalNotes[approvalId]?.trim() || null,
      decisionKey: crypto.randomUUID(),
    }));
  };

  const transitionWorkflow = (decision: CommandWorkflowDecision, transitionKey: string) => {
    const transition = decision.allowedTransitions.find((item) => item.key === transitionKey);
    if (!transition) return;
    const reason = workflowReasons[`${decision.instanceId}:${transitionKey}`]?.trim() || null;
    if (transition.requiresReason && !reason) {
      setMessage('هذا الانتقال يتطلب سببًا موثقًا قبل التنفيذ.');
      return;
    }
    void runCommand(`workflow:${decision.instanceId}:${transitionKey}`, (current) => orchestrator.transitionWorkflow({
      workspaceId: current.workspaceId,
      instanceId: decision.instanceId,
      transitionKey,
      expectedStagePosition: decision.currentStagePosition,
      reason,
      idempotencyKey: crypto.randomUUID(),
    }));
  };

  const reassignField = (assignmentId: string, version: number) => {
    const memberId = fieldMembers[assignmentId]?.trim();
    const reason = fieldReasons[assignmentId]?.trim();
    if (!memberId || !reason || reason.length < 3) {
      setMessage('إعادة الإسناد تحتاج عضوًا جديدًا وسببًا موثقًا من 3 أحرف على الأقل.');
      return;
    }
    void runCommand(`field:${assignmentId}`, (current) => orchestrator.reassignField({
      workspaceId: current.workspaceId,
      assignmentId,
      expectedVersion: version,
      assignedUserId: memberId,
      reason,
      clientOperationId: crypto.randomUUID(),
    }));
  };

  const commandSignals = snapshot ? snapshot.home.criticalBlockers + snapshot.home.overdueFollowups + snapshot.automation.pendingApprovals.length + snapshot.finance.reconciliation.integrityWarnings + snapshot.field.metrics.highCriticalBlockers : 0;
  const fieldCandidates = snapshot?.field.assignments.filter((assignment) => assignment.status === 'queued' || assignment.status === 'in_progress').slice(0, 4) ?? [];

  return <div className="r2-screen r2-command-live" data-command-stage="8.6" data-command-authority="delegated_existing_domain_gateways_only" data-command-write-authority="none" data-finance-write-authority="none">
    <header className="r2-command-hero">
      <div>
        <p className="r2-eyebrow">Phase 8.6 · Global Command Center</p>
        <h1>مركز القيادة</h1>
        <p className="r2-supporting">صورة تنفيذية واحدة فوق السلطات الحقيقية الموجودة. مركز القيادة لا يكتب مباشرة في أي جدول ولا يملك RPC خاصًا يتجاوز المالية أو سير العمل أو الأتمتة أو العمليات الميدانية.</p>
      </div>
      <div className="r2-command-hero__status"><span>Live · Delegated Authority</span>{snapshot && <small>آخر مزامنة {snapshotAge(snapshot.loadedAt)}</small>}</div>
    </header>

    {message && <div className="r2-command-alert" role="status">{message}</div>}
    {loadState === 'loading' && <section className="r2-command-state" aria-live="polite"><strong>جارٍ تكوين صورة القيادة من السلطات الموثوقة…</strong><p>يتم التحميل كوحدة واحدة لتجنب قرار مبني على بيانات جزئية.</p></section>}
    {loadState === 'error' && <section className="r2-command-state r2-command-state--error"><strong>لم يتم فتح صورة قيادة جزئية.</strong><p>{message ?? errorMessage()}</p><button type="button" className="r2-action r2-action--secondary" onClick={() => void reload().catch(() => setMessage(errorMessage()))}>إعادة المحاولة</button></section>}

    {loadState === 'ready' && snapshot && <>
      <section className="r2-command-overview" aria-label="نبض القيادة">
        <article className="r2-command-metric r2-command-metric--focus"><span>إشارات قرار</span><strong>{commandSignals}</strong><small>عوائق + تأخير + موافقات + نزاهة</small></article>
        <article className="r2-command-metric"><span>العمل النشط</span><strong>{snapshot.home.activeTransactions}</strong><small>{snapshot.home.stalledTransactions} متلكئة · {snapshot.home.urgentTransactions} عاجلة</small></article>
        <article className="r2-command-metric"><span>الميدان</span><strong>{snapshot.field.metrics.queuedAssignments + snapshot.field.metrics.activeVisits}</strong><small>{snapshot.field.metrics.queuedAssignments} إسناد · {snapshot.field.metrics.activeVisits} زيارة</small></article>
        <article className="r2-command-metric"><span>نزاهة المالية</span><strong>{snapshot.finance.reconciliation.integrityWarnings}</strong><small>سلطة الكتابة المالية هنا = لا شيء</small></article>
      </section>

      <section className="r2-command-grid">
        <article className="r2-command-panel r2-command-panel--decisions">
          <div className="r2-command-panel__head"><div><p className="r2-eyebrow">Decision Queue</p><h2>قرارات العمل ذات الأولوية</h2></div><button type="button" className="r2-command-link" onClick={() => navigate('transactions')}>المعاملات</button></div>
          {snapshot.workflowDecisions.length === 0 ? <p className="r2-command-empty">لا توجد معاملة ذات أولوية تحمل انتقال سير عمل متاحًا الآن.</p> : <div className="r2-command-stack">{snapshot.workflowDecisions.map((decision) => <section className="r2-command-decision" key={decision.instanceId} data-priority={decision.level}>
            <div className="r2-command-decision__copy"><span className="r2-command-badge">{priorityLabel(decision.level)}</span><div><strong>{decision.title}</strong><small>{decision.companyLabel ?? 'شركة غير متاحة'} · المرحلة {decision.currentStagePosition} · {decision.pendingRequiredCount} متطلب معلق</small></div></div>
            {decision.allowedTransitions.length === 0 ? <p className="r2-command-empty">لا يوجد انتقال مسموح به من الحالة الحالية.</p> : <div className="r2-command-transition-list">{decision.allowedTransitions.map((transition) => {
              const key = `${decision.instanceId}:${transition.key}`;
              const busy = busyKey === `workflow:${decision.instanceId}:${transition.key}`;
              return <div className="r2-command-transition" key={transition.key}><div><strong>{transition.label}</strong><small>{transition.requiresReason ? 'يتطلب سببًا موثقًا' : 'انتقال مسموح من Workflow Gateway'}</small></div><input aria-label={`سبب ${transition.label} — ${decision.title}`} placeholder={transition.requiresReason ? 'السبب مطلوب…' : 'سبب اختياري…'} value={workflowReasons[key] ?? ''} onChange={(event) => setWorkflowReasons((current) => ({ ...current, [key]: event.target.value }))} /><button type="button" className="r2-action r2-action--primary" disabled={Boolean(busyKey)} onClick={() => transitionWorkflow(decision, transition.key)}>{busy ? 'جارٍ التأكيد…' : transition.label}</button></div>;
            })}</div>}
          </section>)}</div>}
        </article>

        <article className="r2-command-panel r2-command-panel--automation">
          <div className="r2-command-panel__head"><div><p className="r2-eyebrow">Human Approval</p><h2>موافقات الأتمتة</h2></div><button type="button" className="r2-command-link" onClick={() => navigate('automation')}>الأتمتة</button></div>
          {snapshot.automation.pendingApprovals.length === 0 ? <p className="r2-command-empty">لا توجد موافقات أتمتة معلقة.</p> : <div className="r2-command-stack">{snapshot.automation.pendingApprovals.map((approval) => <section className="r2-command-approval" key={approval.id}>
            <div><strong>{actionSnapshotLabel(approval.actionSnapshot)}</strong><small>طلب {approval.id.slice(0, 8)} · التنفيذ يبقى خلف الموافقة البشرية</small></div>
            <input aria-label={`ملاحظة قرار الأتمتة ${approval.id}`} placeholder="ملاحظة القرار — اختيارية" value={approvalNotes[approval.id] ?? ''} onChange={(event) => setApprovalNotes((current) => ({ ...current, [approval.id]: event.target.value }))} />
            <div className="r2-command-actions"><button type="button" className="r2-action r2-action--primary" disabled={Boolean(busyKey)} onClick={() => decideApproval(approval.id, 'approved')}>{busyKey === `approval:${approval.id}` ? 'جارٍ التأكيد…' : 'موافقة'}</button><button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => decideApproval(approval.id, 'rejected')}>رفض</button></div>
          </section>)}</div>}
        </article>
      </section>

      <section className="r2-command-grid r2-command-grid--lower">
        <article className="r2-command-panel r2-command-panel--field">
          <div className="r2-command-panel__head"><div><p className="r2-eyebrow">Operational Ownership</p><h2>إعادة إسناد العمل الميداني</h2></div><button type="button" className="r2-command-link" onClick={() => navigate('operations')}>العمليات</button></div>
          {fieldCandidates.length === 0 ? <p className="r2-command-empty">لا توجد إسنادات ميدانية قابلة لإعادة التوجيه الآن.</p> : <div className="r2-command-stack">{fieldCandidates.map((assignment) => <section className="r2-command-field-row" key={assignment.id}>
            <div><span className="r2-command-badge">{assignment.priority}</span><strong>{assignment.companyName}</strong><small>{assignment.destinationLabel} · المالك الحالي {assignment.assignedUserName}</small></div>
            <label><span>المالك الجديد</span><select value={fieldMembers[assignment.id] ?? ''} onChange={(event) => setFieldMembers((current) => ({ ...current, [assignment.id]: event.target.value }))}><option value="">اختر عضوًا…</option>{snapshot.field.members.filter((member) => member.userId !== assignment.assignedUserId).map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
            <label><span>سبب إعادة الإسناد</span><input value={fieldReasons[assignment.id] ?? ''} onChange={(event) => setFieldReasons((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="سبب تشغيلي موثق…" /></label>
            <button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => reassignField(assignment.id, assignment.version)}>{busyKey === `field:${assignment.id}` ? 'جارٍ التأكيد…' : 'إعادة الإسناد'}</button>
          </section>)}</div>}
        </article>

        <article className="r2-command-panel r2-command-panel--integrity">
          <div className="r2-command-panel__head"><div><p className="r2-eyebrow">Authority Boundaries</p><h2>حدود السلطة والنزاهة</h2></div><button type="button" className="r2-command-link" onClick={() => navigate('finance')}>المالية</button></div>
          <dl className="r2-command-integrity"><div><dt>Command write authority</dt><dd>none</dd></div><div><dt>Finance write authority</dt><dd>none</dd></div><div><dt>Finance money authority</dt><dd>{snapshot.finance.reconciliation.moneyAuthority}</dd></div><div><dt>Shadow ledger entries</dt><dd>{snapshot.finance.reconciliation.shadowLedgerEntries}</dd></div><div><dt>Reconciliation warnings</dt><dd>{snapshot.finance.reconciliation.integrityWarnings}</dd></div></dl>
          <p className="r2-command-truth">أي كتابة تُنفذ من هذه الشاشة تمر إلى Gateway صاحب السلطة الأصلي، مع version/idempotency/approval guards الموجودة أصلًا. لا توجد جداول Command Center ولا RPC التفافي.</p>
        </article>
      </section>
    </>}
  </div>;
}
