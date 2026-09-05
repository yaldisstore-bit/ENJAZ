import { useMemo, useState, type ReactNode } from 'react';
import { buildDailyWorkPreviewSnapshot } from '../../features/daily-work/dailyWorkPreview.ts';
import type { DailyWorkBucket, DailyWorkItem } from '../../features/daily-work/dailyWorkModel.ts';
import { buildTransactionListPreviewSource } from '../../features/transactions/transactionListPreview.ts';
import {
  buildTransactionListSnapshot,
  type TransactionListSort,
  type TransactionListView,
} from '../../features/transactions/transactionListModel.ts';
import { buildTransaction360PreviewSource } from '../../features/transactions/transaction360Preview.ts';
import { buildTransaction360Snapshot } from '../../features/transactions/transaction360Model.ts';
import { buildTransactionEditorPreviewSource } from '../../features/transactions/transactionEditorPreview.ts';
import {
  createEmptyTransactionDraft,
  createTransactionEditDraft,
  getRelatedContacts,
  normalizeTransactionEditorDraft,
  validateTransactionEditorDraft,
  type TransactionEditorDraft,
  type TransactionEditorErrors,
  type TransactionEditorMode,
} from '../../features/transactions/transactionEditorModel.ts';
import {
  buildTransactionLifecyclePatch,
  normalizeTransactionLifecycleNote,
  transactionLifecycleCapabilities,
  type TransactionLifecycleAction,
} from '../../features/transactions/transactionLifecycleModel.ts';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type Navigate = (id: R2DestinationId) => void;
type OpenTransaction = (transactionId: string) => void;
type TabId = 'overview' | 'activity' | 'followups' | 'documents' | 'finance';

const PREVIEW_NOW = new Date('2026-09-05T09:00:00.000Z');
const DEFAULT_TRANSACTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const VIEW_LABELS: Readonly<Record<TransactionListView, string>> = { current: 'جارية', stalled: 'متلكئة', archived: 'مغلقة' };
const SORT_LABELS: Readonly<Record<TransactionListSort, string>> = {
  'activity-desc': 'آخر نشاط',
  'created-desc': 'الأحدث إنشاءً',
  'fee-desc': 'الأتعاب: الأعلى',
  'fee-asc': 'الأتعاب: الأقل',
};
const BUCKET_LABELS: Readonly<Record<DailyWorkBucket | 'all', string>> = {
  all: 'الكل', overdue: 'متأخرة', today: 'اليوم', action: 'بحاجة إجراء', upcoming: 'قادمة',
};

function PreviewBadge({ children = 'R2.0-5 · معاينة مرتبطة بعقود البيانات' }: { children?: ReactNode }) {
  return <span className="r2-core-badge">{children}</span>;
}

function money(value: number, safe = true): string {
  if (!safe) return 'قيمة غير آمنة للعرض الدقيق';
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع`;
}

function dateTime(value: string | null): string {
  if (!value) return 'دون موعد';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'تاريخ غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function priorityLabel(value: string): string {
  if (value === 'urgent') return 'عاجلة';
  if (value === 'high') return 'مرتفعة';
  if (value === 'low') return 'منخفضة';
  return 'اعتيادية';
}

export function CoreTransactions({ navigate, openTransaction }: { navigate: Navigate; openTransaction: OpenTransaction }) {
  const source = useMemo(() => buildTransactionListPreviewSource(), []);
  const [view, setView] = useState<TransactionListView>('current');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TransactionListSort>('activity-desc');
  const [page, setPage] = useState(0);
  const snapshot = useMemo(
    () => buildTransactionListSnapshot(source, { view, search, sort, page, pageSize: 10 }),
    [source, view, search, sort, page],
  );

  const selectView = (next: TransactionListView) => { setView(next); setPage(0); };
  const changeSearch = (value: string) => { setSearch(value); setPage(0); };
  const changeSort = (value: TransactionListSort) => { setSort(value); setPage(0); };

  return (
    <div className="r2-screen r2-core-transactions" data-screen="transactions" data-core-work="transactions">
      <header className="r2-section-heading r2-section-heading--hero">
        <div><PreviewBadge /><p className="r2-eyebrow">المجال التشغيلي الأساسي</p><h1>المعاملات</h1><p className="r2-supporting">القائمة الآن تستخدم نموذج Phase 5.1 نفسه: بحث عربي مطبّع، مناظر حقيقية، ترتيب، تقسيم صفحات، وصدق عند غياب علاقة الشركة.</p></div>
        <button type="button" className="r2-action r2-action--primary" onClick={() => navigate('create')}>＋ معاملة جديدة</button>
      </header>

      <section className="r2-core-toolbar" aria-label="أدوات المعاملات">
        <label className="r2-transaction-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="ابحث بالرقم أو النوع أو الشركة أو الجهة" aria-label="بحث المعاملات" /></label>
        <label className="r2-core-sort"><span>ترتيب</span><select aria-label="ترتيب المعاملات" value={sort} onChange={(event) => changeSort(event.target.value as TransactionListSort)}>{Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </section>

      <div className="r2-segment r2-core-segment" aria-label="تقسيم المعاملات">
        {(Object.keys(VIEW_LABELS) as TransactionListView[]).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => selectView(item)}>{VIEW_LABELS[item]} <span>{snapshot.counts[item]}</span></button>)}
      </div>

      <section className="r2-record-list r2-core-record-list" aria-label="قائمة المعاملات">
        {snapshot.items.length ? snapshot.items.map((item) => (
          <button type="button" className="r2-record-row r2-core-record-row" key={item.id} onClick={() => openTransaction(item.id)} aria-label={`فتح المعاملة ${item.shortId} ${item.type}`}>
            <span className="r2-record-row__number">#{item.shortId}</span>
            <span className="r2-record-row__identity"><strong>{item.type}</strong><small>{item.companyLabel}</small></span>
            <span className="r2-core-record-row__facts"><small>{item.department || 'جهة غير محددة'}</small><small>{priorityLabel(item.priority)} · {money(item.currentFee, item.feePrecisionSafe)}</small></span>
            <span className="r2-core-record-row__status">{VIEW_LABELS[item.view]}</span>
            <span aria-hidden="true" className="r2-core-arrow">←</span>
          </button>
        )) : <div className="r2-core-empty"><strong>لا توجد معاملات مطابقة</strong><p>غيّر البحث أو المنظر؛ لا يتم اختراع صفوف لملء الشاشة.</p></div>}
      </section>

      <footer className="r2-core-pagination" aria-label="تقسيم الصفحات"><div><strong>{snapshot.filteredTotal}</strong><span> نتيجة · صفحة {snapshot.page + 1} من {snapshot.pageCount}</span></div><div><button type="button" disabled={!snapshot.hasPrevious} onClick={() => setPage((value) => Math.max(0, value - 1))}>السابق</button><button type="button" disabled={!snapshot.hasMore} onClick={() => setPage((value) => value + 1)}>التالي</button></div></footer>
    </div>
  );
}

function WorkItemRow({ item, done, snoozed, onDone, onSnooze, navigate }: { item: DailyWorkItem; done: boolean; snoozed: boolean; onDone: () => void; onSnooze: () => void; navigate: Navigate }) {
  return (
    <article className={`r2-core-work-row${item === undefined ? '' : ` is-${item.bucket}`}${done ? ' is-done' : ''}${snoozed ? ' is-snoozed' : ''}`} data-work-source={item.source}>
      <div className="r2-core-work-row__signal"><span>{item.stateLabel}</span><strong>{item.score}</strong></div>
      <div className="r2-core-work-row__copy"><strong>{item.title}</strong><p>{item.subject}</p><small>{item.ownerLabel} · {dateTime(item.dueAt)}</small></div>
      <div className="r2-core-work-row__actions">
        {item.transactionId && <button type="button" onClick={() => navigate('transactions')}>المعاملة</button>}
        {item.completable && !done && <button type="button" onClick={onDone}>إكمال</button>}
        {item.snoozable && !done && !snoozed && <button type="button" onClick={onSnooze}>تأجيل</button>}
        {done && <span>مكتملة في المعاينة</span>}{snoozed && <span>مؤجلة في المعاينة</span>}
      </div>
    </article>
  );
}

export function CoreToday({ navigate }: { navigate: Navigate }) {
  const snapshot = useMemo(() => buildDailyWorkPreviewSnapshot(PREVIEW_NOW), []);
  const [bucket, setBucket] = useState<DailyWorkBucket | 'all'>('all');
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [snoozed, setSnoozed] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState('');
  const visible = snapshot.items.filter((item) => bucket === 'all' || item.bucket === bucket);
  const mark = (id: string, kind: 'done' | 'snoozed') => {
    if (kind === 'done') setDone((current) => new Set(current).add(id));
    else setSnoozed((current) => new Set(current).add(id));
    setMessage(kind === 'done' ? 'تمت محاكاة الإكمال محليًا. خدمة Daily Work الحقيقية تبقى صاحبة الكتابة عند الربط الإنتاجي.' : 'تمت محاكاة التأجيل محليًا دون ادعاء حفظ إنتاجي.');
  };

  return (
    <div className="r2-screen r2-core-today" data-screen="today" data-core-work="today">
      <header className="r2-section-heading r2-section-heading--hero"><div><PreviewBadge /><p className="r2-eyebrow">Universal Inbox</p><h1>اليوم</h1><p className="r2-supporting">نفس عقد Daily Work: العوائق أولًا، ثم المتأخر، ثم عمل اليوم والإجراءات القادمة؛ العناصر التابعة لمعاملة غير نشطة لا تظهر أصلًا.</p></div></header>
      <section className="r2-core-focus"><div><span>الأولوية الآن</span><h2>{snapshot.focus?.title || 'لا توجد أولوية'}</h2><p>{snapshot.focus?.subject || 'مساحة العمل هادئة.'}</p></div><div className="r2-core-focus__stats"><span><strong>{snapshot.summary.blocked}</strong> عائق</span><span><strong>{snapshot.summary.overdue}</strong> متأخر</span><span><strong>{snapshot.summary.dueToday}</strong> اليوم</span></div></section>
      <div className="r2-core-filter-strip" aria-label="تصفية عمل اليوم">{(['all', 'overdue', 'today', 'action', 'upcoming'] as const).map((item) => <button key={item} type="button" aria-pressed={bucket === item} onClick={() => setBucket(item)}>{BUCKET_LABELS[item]}</button>)}</div>
      {message && <p className="r2-core-preview-status" role="status">{message}</p>}
      <section className="r2-core-work-list" aria-label="عناصر العمل اليومي">{visible.map((item) => <WorkItemRow key={item.id} item={item} done={done.has(item.id)} snoozed={snoozed.has(item.id)} onDone={() => mark(item.id, 'done')} onSnooze={() => mark(item.id, 'snoozed')} navigate={navigate} />)}</section>
    </div>
  );
}

export function CoreFollowups({ navigate }: { navigate: Navigate }) {
  const snapshot = useMemo(() => buildDailyWorkPreviewSnapshot(PREVIEW_NOW), []);
  const followups = snapshot.items.filter((item) => item.source === 'followup');
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [snoozed, setSnoozed] = useState<ReadonlySet<string>>(new Set());
  return (
    <div className="r2-screen r2-core-followups" data-screen="core-followups" data-core-work="followups">
      <header className="r2-section-heading r2-section-heading--hero"><div><PreviewBadge /><p className="r2-eyebrow">المتابعات الحقيقية أولًا</p><h1>المتابعات والإشعارات</h1><p className="r2-supporting">R2.0-5 يرحّل المتابعات الموثوقة وإجراءات الإكمال/التأجيل. حالة الإشعارات العامة تبقى مؤجلة لمرحلتها ولا تُختلق هنا.</p></div></header>
      <div className="r2-core-scope-note"><strong>المتابعات: مفعّلة في عينة R2.0-5</strong><span>الإشعارات العامة: عرض توافري فقط حتى مرحلة الإشعارات.</span></div>
      <section className="r2-core-work-list">{followups.map((item) => <WorkItemRow key={item.id} item={item} done={done.has(item.id)} snoozed={snoozed.has(item.id)} onDone={() => setDone((current) => new Set(current).add(item.id))} onSnooze={() => setSnoozed((current) => new Set(current).add(item.id))} navigate={navigate} />)}</section>
    </div>
  );
}

export function CoreCreate({ navigate }: { navigate: Navigate }) {
  return (
    <div className="r2-screen r2-core-create" data-screen="create" data-core-work="create">
      <header className="r2-section-heading r2-section-heading--hero"><div><PreviewBadge /><p className="r2-eyebrow">إجراء عالمي مضبوط</p><h1>ماذا تريد أن تنشئ؟</h1><p className="r2-supporting">المعاملة هي الإنشاء الوحيد الذي يملك عقد كتابة معتمد الآن. بقية الخيارات لا تُعرض كحفظ حقيقي قبل امتلاك خدمة وصلاحيات موثوقة.</p></div></header>
      <button type="button" className="r2-create-primary r2-core-create-primary" onClick={() => navigate('transactions.editor')}><span className="r2-create-primary__icon">＋</span><span><strong>معاملة جديدة</strong><small>يفتح محرر R2.0-5 المرتبط بقواعد Phase 5.2 للتحقق والعلاقات والأتعاب.</small></span><span aria-hidden="true">←</span></button>
      <section className="r2-core-review-only"><span>محمي من الحفظ الوهمي</span><p>إنشاء متابعة/شركة/شخص/دفعة يبقى Review-only إلى أن تصل مرحلته authoritative. لا رسالة «تم الحفظ» دون كتابة حقيقية.</p></section>
    </div>
  );
}

function Panel({ id, children }: { id: TabId; children: ReactNode }) {
  return <div className="r2-golden-panel r2-core-panel" data-golden-panel={id}>{children}</div>;
}

function Core360({ transactionId, navigate }: { transactionId: string | null; navigate: Navigate }) {
  const source = useMemo(() => buildTransaction360PreviewSource(transactionId || DEFAULT_TRANSACTION_ID), [transactionId]);
  const snapshot = useMemo(() => buildTransaction360Snapshot(source, PREVIEW_NOW.getTime()), [source]);
  const [tab, setTab] = useState<TabId>('overview');
  const shortId = source.transaction.legacy_id?.trim() || snapshot.shortId;
  const remaining = snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe ? Math.max(0, snapshot.currentFee - snapshot.financialSummary.postedTotal) : 0;

  let panel: ReactNode;
  if (tab === 'activity') panel = <Panel id="activity"><div className="r2-golden-panel__heading"><div><span>سجل موحّد</span><h2>التاريخ والنشاط</h2></div></div><div className="r2-golden-activity">{snapshot.timeline.map((item) => <article key={item.id}><time>{dateTime(item.occurredAt)}</time><div><strong>{item.title}</strong><p>{item.detail || 'لا توجد تفاصيل إضافية.'}</p></div></article>)}</div></Panel>;
  else if (tab === 'followups') panel = <Panel id="followups"><div className="r2-golden-panel__heading"><div><span>العمل المرتبط</span><h2>المتابعات</h2></div><strong>{snapshot.followupSummary.active} مفتوحة</strong></div><div className="r2-golden-line-items">{snapshot.followups.items.length ? snapshot.followups.items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{dateTime(item.due_at)}</small></div><span>{item.completed_at ? 'مكتملة' : item.status}</span></article>) : <p>لا توجد متابعة مرتبطة.</p>}</div></Panel>;
  else if (tab === 'documents') panel = <Panel id="documents"><div className="r2-golden-panel__heading"><div><span>الوثائق المرتبطة</span><h2>مستندات في سياق المعاملة</h2></div><strong>{snapshot.documents.items.length}</strong></div><div className="r2-golden-line-items">{snapshot.documents.items.length ? snapshot.documents.items.map((item, index) => <article key={item.id}><div><strong>{index === 0 ? `عقد التأسيس · ${item.title}` : item.title}</strong><small>{item.document_type}</small></div><span>{item.status}</span></article>) : <p>لا توجد وثائق مرتبطة.</p>}</div></Panel>;
  else if (tab === 'finance') panel = <Panel id="finance"><div className="r2-golden-panel__heading"><div><span>سياق مالي مقيد بالمعاملة</span><h2>الأتعاب والدفعات</h2></div></div><div className="r2-golden-finance"><div><span>الأتعاب الحالية</span><strong>{money(snapshot.currentFee, snapshot.feePrecisionSafe)}</strong></div><div><span>الدفعات المثبتة</span><strong>{money(snapshot.financialSummary.postedTotal, snapshot.financialSummary.precisionSafe)}</strong></div><div><span>المتبقي</span><strong>{money(remaining, snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe)}</strong></div></div></Panel>;
  else panel = <Panel id="overview"><div className="r2-golden-panel__heading"><div><span>المشهد الحالي</span><h2>قرار واضح قبل التفاصيل</h2></div><strong>{priorityLabel(snapshot.priority)}</strong></div><div className="r2-golden-decision"><div><span className="r2-golden-kicker">هوية المعاملة</span><h3>{snapshot.type}</h3><p>{snapshot.department || 'لا توجد جهة محددة'} · {snapshot.companyLabel}</p></div><time>{dateTime(snapshot.lastActivityAt)}</time></div><div className="r2-golden-facts"><div><span>الحالة</span><strong>{snapshot.status}</strong></div><div><span>المتابعات المفتوحة</span><strong>{snapshot.followupSummary.active}</strong></div><div><span>العوائق المرتفعة</span><strong>{snapshot.risk.highOrCritical}</strong></div><div><span>الوثائق</span><strong>{snapshot.documents.items.length}</strong></div></div></Panel>;

  return (
    <div className="r2-screen r2-golden-transaction r2-core-transaction" data-screen="golden-transaction-360" data-core-work="transaction-360">
      <header className="r2-golden-transaction__hero"><div className="r2-golden-transaction__identity"><PreviewBadge /><p className="r2-eyebrow">المعاملة #{shortId} · 360°</p><h1>{snapshot.type}</h1><p>{snapshot.companyLabel}</p><div className="r2-golden-status-line"><span>{snapshot.status}</span><span>{priorityLabel(snapshot.priority)}</span><span>{snapshot.companyMissing ? 'علاقة الشركة غير متاحة' : 'علاقة الشركة مؤكدة'}</span></div></div><div className="r2-golden-transaction__actions"><button type="button" className="r2-action r2-action--primary" onClick={() => navigate('transactions.editor')}>تعديل المعاملة</button><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.lifecycle')}>دورة الحياة</button></div></header>
      <nav className="r2-golden-context-tabs" aria-label="مناطق 360">{([['overview', 'نظرة عامة'], ['activity', 'النشاط'], ['followups', 'المتابعات'], ['documents', 'الوثائق'], ['finance', 'المالية']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div className="r2-golden-context-layout"><main>{panel}</main><aside className="r2-golden-sidecar"><span className="r2-golden-kicker">سياق موثوق</span><h2>لا بطاقات متساوية بلا معنى</h2><p>كل منطقة تقرأ من Snapshot Phase 5.3: النشاط، المتابعات، الوثائق، المالية، وسلامة الدقة.</p><div className="r2-golden-sidecar__meta"><span>آخر نشاط</span><strong>{dateTime(snapshot.lastActivityAt)}</strong></div><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions')}>العودة للمعاملات</button></aside></div>
    </div>
  );
}

function FieldError({ errors, field }: { errors: TransactionEditorErrors; field: keyof TransactionEditorDraft | 'form' }) {
  return errors[field] ? <small className="r2-core-field-error" role="alert">{errors[field]}</small> : null;
}

function CoreEditor({ transactionId, navigate }: { transactionId: string | null; navigate: Navigate }) {
  const mode: TransactionEditorMode = transactionId ? 'edit' : 'create';
  const source = useMemo(() => buildTransactionEditorPreviewSource(mode), [mode]);
  const initial = useMemo(() => mode === 'edit' ? createTransactionEditDraft(source, PREVIEW_NOW) : createEmptyTransactionDraft(PREVIEW_NOW), [mode, source]);
  const [draft, setDraft] = useState<TransactionEditorDraft>(initial);
  const [errors, setErrors] = useState<TransactionEditorErrors>({});
  const [status, setStatus] = useState('');
  const contacts = useMemo(() => getRelatedContacts(source, draft.companyId), [source, draft.companyId]);
  const patch = <K extends keyof TransactionEditorDraft>(key: K, value: TransactionEditorDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = () => {
    const nextErrors = validateTransactionEditorDraft(draft, source, mode, PREVIEW_NOW);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setStatus(''); return; }
    normalizeTransactionEditorDraft(draft, source, mode, PREVIEW_NOW);
    setStatus('تم اجتياز قواعد Phase 5.2 داخل معاينة R2.0-5. لم تتغير أي بيانات إنتاجية؛ خدمة transactionEditorService تبقى صاحبة الكتابة الحقيقية.');
  };

  return (
    <div className="r2-screen r2-golden-editor r2-core-editor" data-screen="golden-transaction-editor" data-core-work="transaction-editor">
      <header className="r2-section-heading r2-section-heading--hero"><div><PreviewBadge /><p className="r2-eyebrow">{mode === 'edit' ? 'تعديل معاملة' : 'إنشاء معاملة'}</p><h1>{mode === 'edit' ? 'محرر المعاملة' : 'معاملة جديدة'}</h1><p className="r2-supporting">الحقول والعلاقات والتحقق مأخوذة من نموذج Phase 5.2 نفسه، بما فيها علاقة جهة الاتصال وسبب تغيير الأتعاب.</p></div></header>
      <form className="r2-golden-form r2-core-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <FieldError errors={errors} field="form" />
        <div className="r2-golden-form__grid">
          <label><span>الشركة</span><select aria-label="الشركة" value={draft.companyId} onChange={(event) => { patch('companyId', event.target.value); patch('primaryContactId', ''); }}><option value="">اختر الشركة</option>{source.companies.map((company) => <option key={company.id} value={company.id}>{company.display_name || company.legal_name}</option>)}</select><FieldError errors={errors} field="companyId" /></label>
          <label><span>جهة الاتصال الأساسية</span><select aria-label="جهة الاتصال الأساسية" value={draft.primaryContactId} onChange={(event) => patch('primaryContactId', event.target.value)}><option value="">بدون جهة اتصال</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}</select><FieldError errors={errors} field="primaryContactId" /></label>
          <label><span>عنوان المعاملة</span><input aria-label="عنوان المعاملة" value={draft.type} onChange={(event) => patch('type', event.target.value)} /><FieldError errors={errors} field="type" /></label>
          <label><span>الجهة / القسم</span><input aria-label="الجهة أو القسم" value={draft.department} onChange={(event) => patch('department', event.target.value)} /><FieldError errors={errors} field="department" /></label>
          <label><span>الحالة</span><select aria-label="حالة المعاملة" value={draft.status} onChange={(event) => patch('status', event.target.value as TransactionEditorDraft['status'])}><option value="active">نشطة</option><option value="stalled">متلكئة</option><option value="completed">مكتملة</option></select><FieldError errors={errors} field="status" /></label>
          <label><span>الأولوية</span><select aria-label="أولوية المعاملة" value={draft.priority} onChange={(event) => patch('priority', event.target.value as TransactionEditorDraft['priority'])}><option value="low">منخفضة</option><option value="normal">اعتيادية</option><option value="high">مرتفعة</option><option value="urgent">عاجلة</option></select><FieldError errors={errors} field="priority" /></label>
          <label><span>الأتعاب</span><input aria-label="أتعاب المعاملة" inputMode="decimal" value={draft.currentFee} onChange={(event) => patch('currentFee', event.target.value)} /><FieldError errors={errors} field="currentFee" /></label>
          {draft.status === 'completed' && <label><span>تاريخ الإكمال</span><input aria-label="تاريخ الإكمال" type="datetime-local" value={draft.completedAt} onChange={(event) => patch('completedAt', event.target.value)} /><FieldError errors={errors} field="completedAt" /></label>}
          <label><span>المحطة الحالية</span><input aria-label="المحطة الحالية" value={draft.stationName} onChange={(event) => patch('stationName', event.target.value)} /><FieldError errors={errors} field="stationName" /></label>
          <label><span>المسؤول</span><input aria-label="المسؤول عن المحطة" value={draft.assignedToText} onChange={(event) => patch('assignedToText', event.target.value)} /><FieldError errors={errors} field="assignedToText" /></label>
          <label><span>وقت المحطة</span><input aria-label="وقت المحطة" type="datetime-local" value={draft.stationOccurredAt} onChange={(event) => patch('stationOccurredAt', event.target.value)} /><FieldError errors={errors} field="stationOccurredAt" /></label>
          <label className="r2-golden-form__wide"><span>ملاحظة العمل</span><textarea aria-label="ملاحظة العمل" rows={4} value={draft.noteBody} onChange={(event) => patch('noteBody', event.target.value)} /><FieldError errors={errors} field="noteBody" /></label>
          <label className="r2-golden-form__wide"><span>سبب تغيير الأتعاب</span><input aria-label="سبب تغيير الأتعاب" value={draft.feeChangeReason} onChange={(event) => patch('feeChangeReason', event.target.value)} /><FieldError errors={errors} field="feeChangeReason" /></label>
        </div>
        {status && <p className="r2-golden-form__success r2-core-preview-status" role="status">{status}</p>}
        <div className="r2-golden-form__actions"><button type="submit" className="r2-action r2-action--primary">حفظ المعاينة</button><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate(mode === 'edit' ? 'transactions.detail' : 'transactions')}>{mode === 'edit' ? 'العودة إلى 360°' : 'إلغاء'}</button></div>
      </form>
    </div>
  );
}

function CoreLifecycle({ transactionId, navigate }: { transactionId: string | null; navigate: Navigate }) {
  const source = useMemo(() => buildTransactionListPreviewSource(), []);
  const initial = useMemo(() => source.transactions.find((item) => item.id === transactionId) || source.transactions[0], [source, transactionId]);
  if (!initial) throw new Error('R2.0-5 lifecycle preview requires a transaction');
  const [row, setRow] = useState(initial);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const capabilities = transactionLifecycleCapabilities(row);
  const apply = (action: TransactionLifecycleAction) => {
    try {
      normalizeTransactionLifecycleNote(note);
      const patch = buildTransactionLifecyclePatch(row, action, PREVIEW_NOW);
      setRow((current) => ({ ...current, ...patch }));
      setMessage(`تم تطبيق قواعد ${action} محليًا في المعاينة فقط. لم تُستدعَ خدمة transactionLifecycleService ولم تتغير بيانات الإنتاج.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تطبيق الإجراء.');
    }
  };
  const currentLabel = capabilities.archived ? 'مؤرشفة · معاينة فقط' : capabilities.completed ? 'مكتملة · معاينة فقط' : 'نشطة · قيد المتابعة';
  return (
    <div className="r2-screen r2-golden-lifecycle r2-core-lifecycle" data-screen="golden-transaction-lifecycle" data-core-work="transaction-lifecycle">
      <header className="r2-section-heading r2-section-heading--hero"><div><PreviewBadge /><p className="r2-eyebrow">المعاملة #{row.legacy_id || row.id.slice(0, 8)}</p><h1>دورة حياة المعاملة</h1><p className="r2-supporting">الأرشفة والاستعادة وإعادة التنشيط تبقى إجراءات مختلفة. لا يتم خلط الاستعادة بإعادة فتح معاملة مكتملة.</p></div></header>
      <section className="r2-golden-lifecycle__body"><div className="r2-golden-lifecycle__state"><span>الحالة الحالية في العينة</span><strong>{currentLabel}</strong><p>القابلية الحالية مشتقة من transactionLifecycleCapabilities؛ المحاكاة لا تكتب في الإنتاج.</p></div><div className="r2-core-lifecycle-facts"><span><strong>{capabilities.canArchive ? 'نعم' : 'لا'}</strong> قابلة للأرشفة</span><span><strong>{capabilities.canRestore ? 'نعم' : 'لا'}</strong> قابلة للاستعادة</span><span><strong>{capabilities.canReactivate ? 'نعم' : 'لا'}</strong> قابلة لإعادة التنشيط</span></div><label className="r2-core-lifecycle-note"><span>ملاحظة دورة الحياة (اختيارية)</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>{message && <p className="r2-core-preview-status" role="status">{message}</p>}<div className="r2-golden-lifecycle__actions">{capabilities.canArchive && <button type="button" className="r2-action r2-action--primary" onClick={() => apply('archive')}>محاكاة الأرشفة</button>}{capabilities.canRestore && <button type="button" className="r2-action r2-action--primary" onClick={() => apply('restore')}>استعادة المعاينة</button>}{capabilities.canReactivate && <button type="button" className="r2-action r2-action--secondary" onClick={() => apply('reactivate')}>محاكاة إعادة التنشيط</button>}<button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.detail')}>العودة إلى 360°</button></div></section>
    </div>
  );
}

export function CoreTransactionExperience({ id, transactionId, navigate }: { id: Extract<R2DestinationId, `transactions.${string}`>; transactionId: string | null; navigate: Navigate }) {
  if (id === 'transactions.editor') return <CoreEditor transactionId={transactionId} navigate={navigate} />;
  if (id === 'transactions.lifecycle') return <CoreLifecycle transactionId={transactionId} navigate={navigate} />;
  return <Core360 transactionId={transactionId} navigate={navigate} />;
}
