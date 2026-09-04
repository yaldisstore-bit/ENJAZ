import { useMemo, useState } from 'react';
import type { DailyWorkBucket, DailyWorkItem, DailyWorkSnapshot, DailyWorkTone } from '../../features/daily-work/dailyWorkModel.ts';
import { buildDailyWorkPreviewSnapshot } from '../../features/daily-work/dailyWorkPreview.ts';
import { useDailyWork } from '../../features/daily-work/useDailyWork.ts';
import { EzBadge, EzButton, EzChip, EzMetric, EzNotice, EzSegmented } from '../components/primitives.tsx';

type DailyFilter = 'all' | 'overdue' | 'today' | 'action' | 'upcoming';

type DailyWorkScreenProps = Readonly<{
  snapshot: DailyWorkSnapshot | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  actionItemId: string | null;
  actionError: string | null;
  onRetry(): void;
  onComplete(item: DailyWorkItem): void;
  onSnooze(item: DailyWorkItem): void;
  onOpen(item: DailyWorkItem): void;
  onNewFollowup(): void;
}>;

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'overdue', label: 'متأخر' },
  { value: 'today', label: 'اليوم' },
  { value: 'action', label: 'يحتاج إجراء' },
  { value: 'upcoming', label: 'قادم' },
] as const;

const SOURCE_LABELS: Record<DailyWorkItem['source'], string> = {
  followup: 'متابعة',
  blocker: 'عائق',
  calendar: 'موعد',
  renewal: 'تجديد',
  workflow: 'إجراء',
};

function formatDue(value: string | null): string {
  if (!value) return 'بدون موعد محدد';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'موعد غير صالح';
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat('ar-IQ', { hour: '2-digit', minute: '2-digit' }).format(date);
  if (sameDay) return `اليوم · ${time}`;
  return new Intl.DateTimeFormat('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function chipTone(tone: DailyWorkTone): 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info' {
  return tone;
}

function filterItems(items: readonly DailyWorkItem[], filter: DailyFilter): readonly DailyWorkItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.bucket === filter);
}

function recomputePreview(items: readonly DailyWorkItem[], generatedAt: string): DailyWorkSnapshot {
  const sorted = Object.freeze([...items]);
  return Object.freeze({
    generatedAt,
    summary: Object.freeze({
      total: sorted.length,
      overdue: sorted.filter((item) => item.bucket === 'overdue').length,
      dueToday: sorted.filter((item) => item.bucket === 'today').length,
      approvals: sorted.filter((item) => item.source === 'workflow').length,
      blocked: sorted.filter((item) => item.source === 'blocker').length,
      upcoming: sorted.filter((item) => item.bucket === 'upcoming').length,
    }),
    focus: sorted[0] ?? null,
    items: sorted,
  });
}

function DailyWorkEmpty(props: Readonly<{ onNewFollowup(): void }>) {
  return (
    <section className="ez-daily-empty" data-daily-work-empty="true">
      <span aria-hidden="true">✓</span>
      <div><strong>لا يوجد عمل يحتاج تدخلك الآن</strong><p>المتابعات والمواعيد والعوائق والإجراءات الحالية كلها تحت السيطرة.</p></div>
      <EzButton tone="gold" onClick={props.onNewFollowup}>إضافة متابعة</EzButton>
    </section>
  );
}

export function DailyWorkScreen(props: DailyWorkScreenProps) {
  const [filter, setFilter] = useState<DailyFilter>('all');
  const visible = useMemo(() => filterItems(props.snapshot?.items ?? [], filter), [filter, props.snapshot]);

  if (props.status === 'loading') {
    return (
      <section className="ez-core-screen ez-core-daily" data-core-screen="today" data-daily-work-status="loading">
        <header className="ez-core-intro"><div><span>مسار اليوم</span><h1>اليوم</h1><p>نجمع العمل الذي يحتاج حركة الآن من جميع المجالات.</p></div></header>
        <div className="ez-daily-loading" aria-label="جاري تحميل العمل اليومي">
          <i /><i /><i /><i />
        </div>
      </section>
    );
  }

  if (props.status === 'error' || !props.snapshot) {
    return (
      <section className="ez-core-screen ez-core-daily" data-core-screen="today" data-daily-work-status="error">
        <header className="ez-core-intro"><div><span>مسار اليوم</span><h1>اليوم</h1><p>لم نعرض بيانات جزئية عند تعذر الوصول إلى المصدر.</p></div></header>
        <EzNotice title="تعذر تجهيز العمل اليومي" body={props.errorMessage ?? 'تعذر الوصول إلى البيانات.'} tone="danger" action={<EzButton tone="ghost" onClick={props.onRetry}>إعادة المحاولة</EzButton>} />
      </section>
    );
  }

  const { snapshot } = props;
  const focus = snapshot.focus;

  return (
    <section className="ez-core-screen ez-core-daily" data-core-screen="today" data-daily-work-status="ready" data-daily-work-total={snapshot.summary.total}>
      <header className="ez-core-intro">
        <div><span>مسار اليوم</span><h1>اليوم</h1><p>صندوق عمل موحد: المتأخر، ما يحتاج قرارًا، المواعيد، التجديدات والمتابعات في ترتيب واحد.</p></div>
        <EzButton tone="dark" onClick={props.onNewFollowup}>متابعة جديدة</EzButton>
      </header>

      {props.actionError ? <EzNotice title="لم يكتمل الإجراء" body={props.actionError} tone="warning" /> : null}

      <div className="ez-daily-summary" data-daily-work-summary="true">
        <EzMetric label="إجمالي العمل" value={String(snapshot.summary.total)} detail="عنصر يحتاج متابعة" tone="gold" />
        <EzMetric label="متأخر" value={String(snapshot.summary.overdue)} detail="يحتاج أولوية" />
        <EzMetric label="اليوم" value={String(snapshot.summary.dueToday)} detail="مرتبط بوقت" />
        <EzMetric label="إجراءات" value={String(snapshot.summary.approvals)} detail="ضمن سير العمل" />
        <EzMetric label="عوائق" value={String(snapshot.summary.blocked)} detail="تمنع التقدم" />
      </div>

      {focus ? (
        <section className={`ez-daily-focus is-${focus.tone}`} data-daily-work-focus={focus.id}>
          <div className="ez-daily-focus__copy">
            <div className="ez-daily-focus__eyebrow"><EzBadge tone={chipTone(focus.tone)}>{SOURCE_LABELS[focus.source]}</EzBadge><span>{focus.stateLabel}</span></div>
            <h2>{focus.title}</h2>
            <p>{focus.subject}</p>
            <div className="ez-core-chip-row"><EzChip tone={chipTone(focus.tone)} dot>{focus.stateLabel}</EzChip><EzChip tone="neutral">المسؤول: {focus.ownerLabel}</EzChip><EzChip tone="neutral">{formatDue(focus.dueAt)}</EzChip></div>
          </div>
          <div className="ez-daily-focus__actions">
            {focus.completable ? <EzButton tone="dark" disabled={props.actionItemId === focus.id} onClick={() => props.onComplete(focus)}>{props.actionItemId === focus.id ? 'جارٍ الحفظ…' : 'إنهاء العنصر'}</EzButton> : <EzButton tone="dark" onClick={() => props.onOpen(focus)}>فتح السياق</EzButton>}
            {focus.snoozable ? <EzButton tone="ghost" disabled={props.actionItemId === focus.id} onClick={() => props.onSnooze(focus)}>تأجيل ساعتين</EzButton> : null}
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
  return <DailyWorkScreen {...controller} onNewFollowup={props.onNewFollowup} onOpen={props.onOpen} onComplete={(item) => { void controller.complete(item); }} onSnooze={(item) => { void controller.snooze(item); }} />;
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
