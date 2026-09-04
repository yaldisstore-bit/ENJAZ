import { useMemo, useState } from 'react';
import type { DailyWorkItem, DailyWorkSnapshot, DailyWorkTone } from '../../features/daily-work/dailyWorkModel.ts';
import { buildDailyWorkPreviewSnapshot } from '../../features/daily-work/dailyWorkPreview.ts';
import { useDailyWork } from '../../features/daily-work/useDailyWork.ts';
import { EzBadge, EzButton, EzChip, EzNotice, EzSegmented, EzStatPill } from '../components/primitives.tsx';

export type DailyWorkOpenAction = (item: DailyWorkItem) => void;

type DailyFilter = 'all' | 'overdue' | 'today' | 'action' | 'upcoming';

const FILTERS: readonly { value: DailyFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'overdue', label: 'المتأخرة' },
  { value: 'today', label: 'اليوم' },
  { value: 'action', label: 'بحاجة إجراء' },
  { value: 'upcoming', label: 'القادمة' },
];

const SOURCE_LABELS: Readonly<Record<DailyWorkItem['source'], string>> = {
  followup: 'متابعة',
  blocker: 'عائق',
  calendar: 'موعد',
  renewal: 'تجديد',
  workflow: 'سير عمل',
};

function chipTone(tone: DailyWorkTone): 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info' {
  return tone === 'neutral' ? 'neutral' : tone;
}

function formatDue(value: string | null): string {
  if (!value) return 'بدون وقت محدد';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function DailyWorkSkeleton() {
  return (
    <section className="ez-core-screen ez-core-daily ez-daily-work" data-core-screen="today" data-daily-work-status="loading">
      <header className="ez-core-intro"><div><span>مسار اليوم</span><h1>اليوم</h1><p>نجمع عناصر العمل ونرتبها حسب الأثر والوقت.</p></div></header>
      <div className="ez-daily-skeleton" aria-label="جارٍ تحميل العمل اليومي"><i /><i /><i /><i /></div>
    </section>
  );
}

function DailyWorkError(props: Readonly<{ message: string; onRetry(): void }>) {
  return (
    <section className="ez-core-screen ez-core-daily ez-daily-work" data-core-screen="today" data-daily-work-status="error">
      <header className="ez-core-intro"><div><span>مسار اليوم</span><h1>اليوم</h1><p>تعذر تجهيز قائمة العمل من المصدر الموثوق.</p></div></header>
      <EzNotice title="تعذر تحميل العمل اليومي" body={props.message} tone="danger" action={<EzButton tone="dark" onClick={props.onRetry}>إعادة المحاولة</EzButton>} />
    </section>
  );
}

function DailyWorkEmpty(props: Readonly<{ onNewFollowup(): void }>) {
  return (
    <section className="ez-daily-empty" data-daily-work-empty="true">
      <span>اليوم هادئ</span>
      <strong>لا توجد عناصر مفتوحة ضمن نطاق العمل الحالي</strong>
      <small>يمكنك إضافة متابعة جديدة، أو الانتقال إلى مجال آخر من مساحة العمل.</small>
      <EzButton tone="dark" onClick={props.onNewFollowup}>متابعة جديدة</EzButton>
    </section>
  );
}

function recomputePreview(items: readonly DailyWorkItem[], generatedAt: string): DailyWorkSnapshot {
  const summary = Object.freeze({
    total: items.length,
    overdue: items.filter((item) => item.bucket === 'overdue').length,
    dueToday: items.filter((item) => item.bucket === 'today').length,
    approvals: items.filter((item) => item.source === 'workflow').length,
    blocked: items.filter((item) => item.source === 'blocker').length,
    upcoming: items.filter((item) => item.bucket === 'upcoming').length,
  });
  return Object.freeze({ generatedAt, summary, focus: items[0] ?? null, items: Object.freeze([...items]) });
}

export function DailyWorkScreen(props: Readonly<{
  snapshot: DailyWorkSnapshot | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  actionItemId: string | null;
  actionError: string | null;
  onRetry(): void;
  onOpen(item: DailyWorkItem): void;
  onComplete(item: DailyWorkItem): void;
  onSnooze(item: DailyWorkItem): void;
  onNewFollowup(): void;
}>) {
  const [filter, setFilter] = useState<DailyFilter>('all');
  const snapshot = props.snapshot;
  const visible = useMemo(() => snapshot?.items.filter((item) => filter === 'all' || item.bucket === filter) ?? [], [filter, snapshot]);

  if (props.status === 'loading') return <DailyWorkSkeleton />;
  if (props.status === 'error' || !snapshot) return <DailyWorkError message={props.errorMessage ?? 'تعذر تجهيز العمل اليومي.'} onRetry={props.onRetry} />;

  const focus = snapshot.focus;
  return (
    <section className="ez-core-screen ez-core-daily ez-daily-work" data-core-screen="today" data-daily-work-status="ready">
      <header className="ez-core-intro">
        <div><span>مسار اليوم</span><h1>اليوم</h1><p>صندوق عمل موحد للمتابعات والعوائق والمواعيد والتجديدات وإجراءات سير العمل.</p></div>
        <EzButton tone="dark" onClick={props.onNewFollowup}>متابعة جديدة</EzButton>
      </header>

      {props.actionError ? <EzNotice title="لم يتم تنفيذ الإجراء" body={props.actionError} tone="warning" /> : null}

      <section className="ez-daily-summary" aria-label="ملخص العمل اليومي">
        <EzStatPill value={String(snapshot.summary.total)} label="مفتوحة" tone="dark" />
        <EzStatPill value={String(snapshot.summary.overdue)} label="متأخرة" tone={snapshot.summary.overdue ? 'gold' : 'soft'} />
        <EzStatPill value={String(snapshot.summary.dueToday)} label="اليوم" />
        <EzStatPill value={String(snapshot.summary.approvals)} label="اعتمادات" />
        <EzStatPill value={String(snapshot.summary.blocked)} label="عوائق" />
      </section>

      {focus ? (
        <section className="ez-daily-focus" data-daily-work-focus={focus.id}>
          <div className="ez-daily-focus__copy">
            <span>الأولوية الآن</span>
            <h2>{focus.title}</h2>
            <p>{focus.subject}</p>
            <div><EzChip tone={chipTone(focus.tone)}>{focus.stateLabel}</EzChip><EzChip tone="neutral">المسؤول: {focus.ownerLabel}</EzChip></div>
          </div>
          <div className="ez-daily-focus__meta">
            <small>{SOURCE_LABELS[focus.source]}</small>
            <strong>{formatDue(focus.dueAt)}</strong>
            <EzButton tone="dark" onClick={() => props.onOpen(focus)}>فتح السياق</EzButton>
          </div>
        </section>
      ) : <DailyWorkEmpty onNewFollowup={props.onNewFollowup} />}

      <div className="ez-daily-filterbar">
        <div><strong>قائمة العمل</strong><small>مرتبة حسب الأثر والوقت</small></div>
        <EzSegmented value={filter} options={FILTERS} onChange={(value) => setFilter(value as DailyFilter)} />
      </div>

      {visible.length ? (
        <section className="ez-daily-list" data-daily-work-list="true">
          {visible.map((item, index) => (
            <article className="ez-daily-item" data-daily-work-item={item.id} key={item.id}>
              <button type="button" className="ez-daily-item__main" onClick={() => props.onOpen(item)}>
                <span className={`ez-daily-item__index is-${item.tone}`}>{String(index + 1).padStart(2, '0')}</span>
                <span className="ez-daily-item__copy"><small>{SOURCE_LABELS[item.source]} · {item.stateLabel}</small><strong>{item.title}</strong><span>{item.subject}</span></span>
                <span className="ez-daily-item__meta"><b>{formatDue(item.dueAt)}</b><small>المسؤول: {item.ownerLabel}</small></span>
              </button>
              <div className="ez-daily-item__actions">
                <EzChip tone={chipTone(item.tone)}>{item.stateLabel}</EzChip>
                {item.completable ? <button type="button" disabled={props.actionItemId === item.id} onClick={() => props.onComplete(item)}>{props.actionItemId === item.id ? '…' : 'إنهاء'}</button> : null}
                {item.snoozable ? <button type="button" disabled={props.actionItemId === item.id} onClick={() => props.onSnooze(item)}>تأجيل</button> : null}
              </div>
            </article>
          ))}
        </section>
      ) : <section className="ez-daily-filter-empty"><strong>لا توجد عناصر ضمن هذا التصنيف</strong><small>اختر تصنيفًا آخر أو أضف متابعة جديدة.</small></section>}
    </section>
  );
}

export function ConnectedDailyWorkScreen(props: Readonly<{ onNewFollowup(): void; onOpen(item: DailyWorkItem): void }>) {
  const controller = useDailyWork();
  return <DailyWorkScreen {...controller} onRetry={controller.retry} onNewFollowup={props.onNewFollowup} onOpen={props.onOpen} onComplete={(item) => { void controller.complete(item); }} onSnooze={(item) => { void controller.snooze(item); }} />;
}

export function PreviewDailyWorkScreen(props: Readonly<{ onNewFollowup(): void; onOpen(item: DailyWorkItem): void }>) {
  const [snapshot, setSnapshot] = useState(() => buildDailyWorkPreviewSnapshot());
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const remove = (item: DailyWorkItem) => {
    setActionItemId(item.id);
    window.setTimeout(() => {
      setSnapshot((current) => recomputePreview(current.items.filter((entry) => entry.id !== item.id), new Date().toISOString()));
      setActionItemId(null);
    }, 120);
  };
  return <DailyWorkScreen snapshot={snapshot} status="ready" errorMessage={null} actionItemId={actionItemId} actionError={null} onRetry={() => undefined} onComplete={remove} onSnooze={remove} onNewFollowup={props.onNewFollowup} onOpen={props.onOpen} />;
}
