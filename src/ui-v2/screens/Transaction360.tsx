import { useMemo } from 'react';
import { buildTransaction360PreviewSource } from '../../features/transactions/transaction360Preview.ts';
import { buildTransaction360Snapshot, type Transaction360SectionState, type Transaction360Snapshot } from '../../features/transactions/transaction360Model.ts';
import { useTransaction360, type Transaction360Controller } from '../../features/transactions/useTransaction360.ts';
import { EzButton, EzChip, EzNotice, EzStatPill, EzSurface } from '../components/primitives.tsx';

function formatMoney(value: number, safe: boolean): string {
  if (!safe) return 'تحقق من المالية';
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع`;
}

function formatDate(value: string | null): string {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'وقت غير متاح';
  return new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function stateLabel(state: Transaction360SectionState): string {
  if (state === 'unavailable') return 'غير متاح مؤقتًا';
  if (state === 'truncated') return 'عرض محدود';
  return 'مكتمل';
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  const value = status.trim().toLowerCase();
  if (['stalled', 'delayed'].includes(value)) return 'warning';
  if (['completed', 'closed', 'archived'].includes(value)) return 'neutral';
  return 'success';
}

function priorityTone(priority: string): 'danger' | 'warning' | 'neutral' {
  const value = priority.trim().toLowerCase();
  if (value === 'urgent' || value === 'critical') return 'danger';
  if (value === 'high') return 'warning';
  return 'neutral';
}

function isLifecycleClosed(snapshot: Transaction360Snapshot): boolean {
  const status = snapshot.status.trim().toLowerCase();
  return snapshot.archivedAt !== null || snapshot.completedAt !== null || ['completed', 'closed', 'archived'].includes(status);
}

function SectionHealth({ snapshot }: Readonly<{ snapshot: Transaction360Snapshot }>) {
  const entries = Object.entries(snapshot.sectionStates) as Array<[string, Transaction360SectionState]>;
  const unavailable = entries.filter(([, state]) => state === 'unavailable').map(([name]) => name);
  const truncated = entries.filter(([, state]) => state === 'truncated').map(([name]) => name);
  if (!unavailable.length && !truncated.length) return null;
  return (
    <EzNotice
      tone={unavailable.length ? 'warning' : 'info'}
      title="بعض سياق 360° يحتاج انتباهًا"
      body={unavailable.length ? `تعذر تحميل ${unavailable.length} قسم/أقسام دون اختلاق بيانات بديلة.${truncated.length ? ` كما أن ${truncated.length} قسم/أقسام محدودة لحماية الأداء.` : ''}` : `${truncated.length} قسم/أقسام محدودة لحماية الأداء، مع بقاء المصدر الكامل محفوظًا.`}
    />
  );
}

function Transaction360Ready({ snapshot }: Readonly<{ snapshot: Transaction360Snapshot }>) {
  const lifecycleClosed = isLifecycleClosed(snapshot);
  return (
    <article className="ez-transaction-360" data-pattern="transaction-360" data-transaction-360={snapshot.id}>
      <header className="ez-transaction-360__hero">
        <div className="ez-transaction-360__identity">
          <span>360° · {snapshot.shortId}</span>
          <h2>{snapshot.type}</h2>
          <p>{snapshot.companyLabel}</p>
        </div>
        <div className="ez-transaction-360__chips">
          <EzChip tone={statusTone(snapshot.status)}>{snapshot.status}</EzChip>
          <EzChip tone={priorityTone(snapshot.priority)}>{snapshot.priority}</EzChip>
          {snapshot.companyMissing ? <EzChip tone="warning">ربط الشركة يحتاج تحققًا</EzChip> : null}
        </div>
      </header>

      <section className="ez-transaction-360__summary" aria-label="ملخص المعاملة 360">
        <EzStatPill value={formatMoney(snapshot.currentFee, snapshot.feePrecisionSafe)} label="الأتعاب الحالية" tone="dark" />
        <EzStatPill value={String(snapshot.followupSummary.active)} label="متابعات نشطة" tone={snapshot.followupSummary.overdue ? 'gold' : 'soft'} />
        <EzStatPill value={String(snapshot.documents.items.length)} label="مستندات مرتبطة" />
        <EzStatPill value={String(snapshot.risk.open)} label="عوائق مفتوحة" tone={snapshot.risk.highOrCritical ? 'gold' : 'soft'} />
      </section>

      <SectionHealth snapshot={snapshot} />

      <section className="ez-transaction-360__facts">
        <EzSurface tone="warm" emphasis="raised"><small>الجهة</small><strong>{snapshot.department ?? 'غير محددة'}</strong><span>آخر حركة: {formatDate(snapshot.lastActivityAt)}</span></EzSurface>
        <EzSurface tone="paper" emphasis="raised"><small>جهة الاتصال</small><strong>{snapshot.contactLabel ?? (snapshot.contactState === 'unavailable' ? 'تعذر التحميل' : 'غير مرتبطة')}</strong><span>الحالة: {snapshot.contactState}</span></EzSurface>
        <EzSurface tone="paper" emphasis="raised"><small>سير العمل</small><strong>{snapshot.workflow.current ? `المرحلة ${snapshot.workflow.current.current_stage_position}` : 'لا يوجد مسار نشط'}</strong><span>{snapshot.workflow.current?.status ?? stateLabel(snapshot.workflow.state)}</span></EzSurface>
        <EzSurface tone={snapshot.risk.highOrCritical ? 'gold' : 'paper'} emphasis="raised"><small>المخاطر</small><strong>{snapshot.risk.highOrCritical ? `${snapshot.risk.highOrCritical} عائق مرتفع/حرج` : `${snapshot.risk.open} عائق مفتوح`}</strong><span>{stateLabel(snapshot.risk.state)}</span></EzSurface>
      </section>

      <section className="ez-transaction-360__grid">
        <section className="ez-transaction-360__panel ez-transaction-360__panel--timeline" data-transaction-360-timeline="true">
          <header><div><span>السياق الزمني</span><h3>الخط الزمني والنشاط</h3></div><EzChip tone={snapshot.timelineTruncated ? 'warning' : 'neutral'}>{snapshot.timeline.length}</EzChip></header>
          {snapshot.timeline.length ? <ol className="ez-transaction-360__timeline">{snapshot.timeline.map((item) => <li key={item.id} data-timeline-kind={item.kind}><i aria-hidden="true" /><div><strong>{item.title}</strong>{item.detail ? <p>{item.detail}</p> : null}<small>{formatDate(item.timestampValid ? item.occurredAt : null)}</small></div></li>)}</ol> : <p className="ez-transaction-360__empty">لا توجد حركة مسجلة حتى الآن.</p>}
        </section>

        <div className="ez-transaction-360__stack">
          <section className="ez-transaction-360__panel" data-transaction-360-followups="true">
            <header><div><span>العمل التالي</span><h3>المتابعات</h3></div><EzChip tone={snapshot.followupSummary.overdue ? 'warning' : 'neutral'}>{snapshot.followupSummary.overdue} متأخرة</EzChip></header>
            {snapshot.followups.items.length ? <ul className="ez-transaction-360__list">{snapshot.followups.items.slice(0, 6).map((row) => <li key={row.id}><div><strong>{row.title}</strong><small>{formatDate(row.due_at)}</small></div><EzChip tone={row.completed_at ? 'success' : 'neutral'}>{row.status}</EzChip></li>)}</ul> : <p className="ez-transaction-360__empty">لا توجد متابعات مرتبطة.</p>}
          </section>

          <section className="ez-transaction-360__panel" data-transaction-360-finance="true">
            <header><div><span>علاقة مالية</span><h3>المالية المرتبطة</h3></div><EzChip>{snapshot.financialSummary.postedCount} دفعة</EzChip></header>
            <div className="ez-transaction-360__money"><small>إجمالي الدفعات المرحلة</small><strong>{formatMoney(snapshot.financialSummary.postedTotal, snapshot.financialSummary.precisionSafe)}</strong><span>{snapshot.financialSummary.feeChanges} تغييرات أتعاب مسجلة</span></div>
            <p className="ez-transaction-360__scope-note">هذا سياق مالي للمعاملة فقط؛ العمليات المالية الكاملة تبقى في Phase 7.</p>
          </section>
        </div>
      </section>

      <section className="ez-transaction-360__lower-grid">
        <section className="ez-transaction-360__panel" data-transaction-360-notes="true">
          <header><div><span>السجل</span><h3>الملاحظات</h3></div><EzChip>{snapshot.notes.items.length}</EzChip></header>
          {snapshot.notes.items.length ? <ul className="ez-transaction-360__notes">{snapshot.notes.items.slice(0, 5).map((row) => <li key={row.id}><p>{row.body}</p><small>{formatDate(row.created_at)}</small></li>)}</ul> : <p className="ez-transaction-360__empty">لا توجد ملاحظات.</p>}
        </section>

        <section className="ez-transaction-360__panel" data-transaction-360-documents="true">
          <header><div><span>الملف</span><h3>المستندات</h3></div><EzChip tone={snapshot.documents.state === 'unavailable' ? 'warning' : 'neutral'}>{stateLabel(snapshot.documents.state)}</EzChip></header>
          {snapshot.documents.items.length ? <ul className="ez-transaction-360__list">{snapshot.documents.items.slice(0, 6).map((row) => <li key={row.id}><div><strong>{row.title}</strong><small>{row.document_type ?? row.mime_type}</small></div><EzChip>{row.status}</EzChip></li>)}</ul> : <p className="ez-transaction-360__empty">{snapshot.documents.state === 'unavailable' ? 'تعذر تحميل المستندات الآن.' : 'لا توجد مستندات مرتبطة.'}</p>}
        </section>
      </section>

      <footer className="ez-transaction-360__footer">
        <span>إنشاء: {formatDate(snapshot.createdAt)}</span>
        <span>تحديث: {formatDate(snapshot.updatedAt)}</span>
        {lifecycleClosed ? <span>المعاملة غير نشطة؛ إعادة التفعيل أو الاستعادة تبقى في Phase 5.4.</span> : null}
      </footer>
    </article>
  );
}

export function Transaction360Screen(props: Readonly<Transaction360Controller>) {
  if (props.status === 'loading') return <section className="ez-transaction-360__loading" aria-label="جارٍ تحميل عرض المعاملة 360"><i /><i /><i /></section>;
  if (props.status === 'error') return <EzNotice tone="danger" title="تعذر فتح 360°" body={props.errorMessage ?? 'تعذر تجهيز تفاصيل المعاملة.'} action={<EzButton tone="dark" onClick={props.retry}>إعادة المحاولة</EzButton>} />;
  if (!props.snapshot) return <EzNotice tone="warning" title="لا توجد تفاصيل" body="لم يتم تجهيز لقطة 360° لهذه المعاملة." />;
  return <Transaction360Ready snapshot={props.snapshot} />;
}

export function ConnectedTransaction360(props: Readonly<{ transactionId: string }>) {
  return <Transaction360Screen {...useTransaction360(props.transactionId)} />;
}

export function FixtureTransaction360(props: Readonly<{ transactionId: string }>) {
  const snapshot = useMemo(() => buildTransaction360Snapshot(buildTransaction360PreviewSource(props.transactionId), Date.parse('2026-09-05T12:00:00.000Z')), [props.transactionId]);
  const controller = useMemo<Transaction360Controller>(() => Object.freeze({ status: 'ready', snapshot, errorMessage: null, retry() {} }), [snapshot]);
  return <Transaction360Screen {...controller} />;
}
