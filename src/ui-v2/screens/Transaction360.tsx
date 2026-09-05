import { useMemo, type ReactNode } from 'react';
import { buildTransaction360PreviewSource } from '../../features/transactions/transaction360Preview.ts';
import { buildTransaction360Snapshot, type Transaction360SectionState, type Transaction360Snapshot } from '../../features/transactions/transaction360Model.ts';
import { useTransaction360, type Transaction360Controller } from '../../features/transactions/useTransaction360.ts';
import { EzButton, EzChip, EzNotice, EzStatPill } from '../components/primitives.tsx';

type SectionId = 'timeline' | 'followups' | 'finance' | 'notes' | 'documents';
const EMPTY = 'ez-transaction-360__empty';
const LIST = 'ez-transaction-360__list';

function money(value: number, safe: boolean) {
  return safe ? `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع` : 'تحقق من المالية';
}
function date(value: string | null) {
  if (!value) return 'غير متاح';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'وقت غير متاح' : new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(parsed);
}
function state(value: Transaction360SectionState) {
  return value === 'unavailable' ? 'غير متاح' : value === 'truncated' ? 'عرض محدود' : 'مكتمل';
}
function statusTone(value: string): 'success' | 'warning' | 'neutral' {
  value = value.trim().toLowerCase();
  return ['stalled', 'delayed'].includes(value) ? 'warning' : ['completed', 'closed', 'archived'].includes(value) ? 'neutral' : 'success';
}
function priorityTone(value: string): 'danger' | 'warning' | 'neutral' {
  value = value.trim().toLowerCase();
  return ['urgent', 'critical'].includes(value) ? 'danger' : value === 'high' ? 'warning' : 'neutral';
}

function Panel(props: Readonly<{ id: SectionId; eyebrow: string; title: string; badge?: ReactNode; className?: string; children: ReactNode }>) {
  return <section className={`ez-transaction-360__panel${props.className ? ` ${props.className}` : ''}`} data-transaction-360-section={props.id}>
    <header><div><span>{props.eyebrow}</span><h3>{props.title}</h3></div>{props.badge}</header>{props.children}
  </section>;
}

function Health({ snapshot }: Readonly<{ snapshot: Transaction360Snapshot }>) {
  const states = Object.values(snapshot.sectionStates);
  const unavailable = states.filter((value) => value === 'unavailable').length;
  const truncated = states.filter((value) => value === 'truncated').length;
  if (!unavailable && !truncated) return null;
  return <EzNotice tone={unavailable ? 'warning' : 'info'} title="سياق 360° يحتاج انتباهًا" body={unavailable ? `${unavailable} قسم غير متاح.${truncated ? ` ${truncated} قسم محدود.` : ''}` : `${truncated} قسم معروض بشكل محدود.`} />;
}

function Ready({ snapshot: s }: Readonly<{ snapshot: Transaction360Snapshot }>) {
  const closed = s.archivedAt !== null || s.completedAt !== null || ['completed', 'closed', 'archived'].includes(s.status.trim().toLowerCase());
  const workflow = s.workflow.current;
  const facts = [
    ['الجهة', s.department ?? 'غير محددة', `آخر حركة: ${date(s.lastActivityAt)}`],
    ['جهة الاتصال', s.contactLabel ?? (s.contactState === 'unavailable' ? 'تعذر التحميل' : 'غير مرتبطة'), `الحالة: ${s.contactState}`],
    ['سير العمل', workflow ? `المرحلة ${workflow.current_stage_position}` : 'لا يوجد مسار نشط', workflow?.status ?? state(s.workflow.state)],
    ['المخاطر', s.risk.highOrCritical ? `${s.risk.highOrCritical} عائق مرتفع/حرج` : `${s.risk.open} عائق مفتوح`, state(s.risk.state)],
  ] as const;
  return <article className="ez-transaction-360" data-pattern="transaction-360" data-transaction-360={s.id}>
    <header className="ez-transaction-360__hero"><div className="ez-transaction-360__identity"><span>360° · {s.shortId}</span><h2>{s.type}</h2><p>{s.companyLabel}</p></div><div className="ez-transaction-360__chips"><EzChip tone={statusTone(s.status)}>{s.status}</EzChip><EzChip tone={priorityTone(s.priority)}>{s.priority}</EzChip>{s.companyMissing ? <EzChip tone="warning">ربط الشركة يحتاج تحققًا</EzChip> : null}</div></header>

    <section className="ez-transaction-360__summary" aria-label="ملخص 360">
      <EzStatPill value={money(s.currentFee, s.feePrecisionSafe)} label="الأتعاب الحالية" tone="dark" />
      <EzStatPill value={String(s.followupSummary.active)} label="متابعات نشطة" tone={s.followupSummary.overdue ? 'gold' : 'soft'} />
      <EzStatPill value={String(s.documents.items.length)} label="مستندات مرتبطة" />
      <EzStatPill value={String(s.risk.open)} label="عوائق مفتوحة" tone={s.risk.highOrCritical ? 'gold' : 'soft'} />
    </section>
    <Health snapshot={s} />
    <section className="ez-transaction-360__facts">{facts.map(([label, value, meta]) => <article key={label}><small>{label}</small><strong>{value}</strong><span>{meta}</span></article>)}</section>

    <section className="ez-transaction-360__grid">
      <Panel id="timeline" eyebrow="السياق الزمني" title="الخط الزمني والنشاط" className="ez-transaction-360__panel--timeline" badge={<EzChip tone={s.timelineTruncated ? 'warning' : 'neutral'}>{s.timeline.length}</EzChip>}>
        {s.timeline.length ? <ol className="ez-transaction-360__timeline">{s.timeline.map((item) => <li key={item.id} data-timeline-kind={item.kind}><i aria-hidden="true" /><div><strong>{item.title}</strong>{item.detail ? <p>{item.detail}</p> : null}<small>{date(item.timestampValid ? item.occurredAt : null)}</small></div></li>)}</ol> : <p className={EMPTY}>لا توجد حركة مسجلة.</p>}
      </Panel>
      <div className="ez-transaction-360__stack">
        <Panel id="followups" eyebrow="العمل التالي" title="المتابعات" badge={<EzChip tone={s.followupSummary.overdue ? 'warning' : 'neutral'}>{s.followupSummary.overdue} متأخرة</EzChip>}>
          {s.followups.items.length ? <ul className={LIST}>{s.followups.items.slice(0, 6).map((row) => <li key={row.id}><div><strong>{row.title}</strong><small>{date(row.due_at)}</small></div><EzChip tone={row.completed_at ? 'success' : 'neutral'}>{row.status}</EzChip></li>)}</ul> : <p className={EMPTY}>لا توجد متابعات.</p>}
        </Panel>
        <Panel id="finance" eyebrow="علاقة مالية" title="المالية المرتبطة" badge={<EzChip>{s.financialSummary.postedCount} دفعة</EzChip>}>
          <div className="ez-transaction-360__money"><small>إجمالي الدفعات المرحلة</small><strong>{money(s.financialSummary.postedTotal, s.financialSummary.precisionSafe)}</strong><span>{s.financialSummary.feeChanges} تغييرات أتعاب</span></div><p className="ez-transaction-360__scope-note">للعمليات الكاملة افتح مركز المالية.</p>
        </Panel>
      </div>
    </section>

    <section className="ez-transaction-360__lower-grid">
      <Panel id="notes" eyebrow="السجل" title="الملاحظات" badge={<EzChip>{s.notes.items.length}</EzChip>}>
        {s.notes.items.length ? <ul className="ez-transaction-360__notes">{s.notes.items.slice(0, 5).map((row) => <li key={row.id}><p>{row.body}</p><small>{date(row.created_at)}</small></li>)}</ul> : <p className={EMPTY}>لا توجد ملاحظات.</p>}
      </Panel>
      <Panel id="documents" eyebrow="الملف" title="المستندات" badge={<EzChip tone={s.documents.state === 'unavailable' ? 'warning' : 'neutral'}>{state(s.documents.state)}</EzChip>}>
        {s.documents.items.length ? <ul className={LIST}>{s.documents.items.slice(0, 6).map((row) => <li key={row.id}><div><strong>{row.title}</strong><small>{row.document_type ?? row.mime_type}</small></div><EzChip>{row.status}</EzChip></li>)}</ul> : <p className={EMPTY}>{s.documents.state === 'unavailable' ? 'تعذر تحميل المستندات.' : 'لا توجد مستندات.'}</p>}
      </Panel>
    </section>

    <footer className="ez-transaction-360__footer"><span>إنشاء: {date(s.createdAt)}</span><span>تحديث: {date(s.updatedAt)}</span>{closed ? <span>المعاملة للعرض فقط داخل 360°؛ تغييرات دورة الحياة تتم من إدارة الحالة.</span> : null}</footer>
  </article>;
}

export function Transaction360Screen(props: Readonly<Transaction360Controller>) {
  if (props.status === 'loading') return <section className="ez-transaction-360__loading" aria-label="تحميل 360"><i /><i /><i /></section>;
  if (props.status === 'error') return <EzNotice tone="danger" title="تعذر فتح 360°" body={props.errorMessage ?? 'تعذر تجهيز التفاصيل.'} action={<EzButton tone="dark" onClick={props.retry}>إعادة المحاولة</EzButton>} />;
  return props.snapshot ? <Ready snapshot={props.snapshot} /> : <EzNotice tone="warning" title="لا توجد تفاصيل" body="لم تتوفر لقطة 360°." />;
}
export function ConnectedTransaction360({ transactionId }: Readonly<{ transactionId: string }>) { return <Transaction360Screen {...useTransaction360(transactionId)} />; }
export function FixtureTransaction360({ transactionId }: Readonly<{ transactionId: string }>) {
  const snapshot = useMemo(() => buildTransaction360Snapshot(buildTransaction360PreviewSource(transactionId), Date.parse('2026-09-05T12:00:00Z')), [transactionId]);
  return <Transaction360Screen status="ready" snapshot={snapshot} errorMessage={null} retry={() => {}} />;
}