import { useState, type ReactNode } from 'react';
import { useDailyWork } from '../../features/daily-work/useDailyWork.ts';
import type { DailyWorkItem } from '../../features/daily-work/dailyWorkModel.ts';
import { useTransactionList } from '../../features/transactions/useTransactionList.ts';
import { useTransactionEditor } from '../../features/transactions/useTransactionEditor.ts';
import { useTransaction360 } from '../../features/transactions/useTransaction360.ts';
import { useTransactionLifecycle } from '../../features/transactions/useTransactionLifecycle.ts';
import { getRelatedContacts, type TransactionEditorField } from '../../features/transactions/transactionEditorModel.ts';
import type { TransactionLifecycleAction } from '../../features/transactions/transactionLifecycleModel.ts';
import type { R2DestinationId } from '../architecture/navigation-contract.ts';

type Navigate = (id: R2DestinationId) => void;
type OpenTransaction = (transactionId: string) => void;
type ConnectedContext = Readonly<{
  destinationId: R2DestinationId;
  transactionId: string | null;
  navigate: Navigate;
  openTransaction: OpenTransaction;
}>;
type TabId = 'overview' | 'activity' | 'followups' | 'documents' | 'finance';

function LiveBadge() {
  return <span className="r2-core-badge" data-core-live="true">R2.0-5 · بيانات مساحة العمل الموثوقة</span>;
}

function StatePanel(props: Readonly<{ title: string; body: string; action?: (() => void) | undefined; actionLabel?: string | undefined }>) {
  return <section className="r2-core-state" role="status"><strong>{props.title}</strong><p>{props.body}</p>{props.action ? <button type="button" className="r2-action r2-action--secondary" onClick={props.action}>{props.actionLabel ?? 'إعادة المحاولة'}</button> : null}</section>;
}

function money(value: number, safe = true): string {
  return safe ? `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(value)} د.ع` : 'قيمة غير آمنة للعرض الدقيق';
}

function dateTime(value: string | null): string {
  if (!value) return 'دون موعد';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'تاريخ غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function priorityLabel(value: string): string {
  if (value === 'urgent' || value === 'critical') return 'عاجلة';
  if (value === 'high') return 'مرتفعة';
  if (value === 'low') return 'منخفضة';
  return 'اعتيادية';
}

function ConnectedTransactions({ navigate, openTransaction }: Readonly<{ navigate: Navigate; openTransaction: OpenTransaction }>) {
  const controller = useTransactionList();
  if (controller.status === 'loading') return <div className="r2-screen" data-core-connected="transactions"><StatePanel title="جارٍ تحميل المعاملات" body="تُقرأ القائمة من مساحة العمل الحالية دون نتائج تخمينية." /></div>;
  if (controller.status === 'error' || !controller.snapshot) return <div className="r2-screen" data-core-connected="transactions"><StatePanel title="تعذر تحميل المعاملات" body={controller.errorMessage ?? 'تعذر تجهيز القائمة.'} action={controller.retry} /></div>;
  const snapshot = controller.snapshot;
  return (
    <div className="r2-screen r2-core-transactions" data-screen="transactions" data-core-connected="transactions">
      <header className="r2-section-heading r2-section-heading--hero"><div><LiveBadge /><p className="r2-eyebrow">Phase 5.1 · متصل</p><h1>المعاملات</h1><p className="r2-supporting">بحث ومناظر وفرز وتقسيم صفحات من نفس مصدر البيانات الموثوق داخل مساحة العمل.</p></div><button type="button" className="r2-action r2-action--primary" onClick={() => navigate('transactions.editor')}>＋ معاملة جديدة</button></header>
      <section className="r2-core-toolbar"><label className="r2-transaction-search"><span aria-hidden="true">⌕</span><input aria-label="بحث المعاملات" value={controller.request.search} onChange={(event) => controller.setSearch(event.target.value)} placeholder="رقم، نوع، شركة أو جهة" /></label><label className="r2-core-sort"><span>ترتيب</span><select aria-label="ترتيب المعاملات" value={controller.request.sort} onChange={(event) => controller.setSort(event.target.value as typeof controller.request.sort)}><option value="activity-desc">آخر نشاط</option><option value="created-desc">الأحدث إنشاءً</option><option value="fee-desc">الأتعاب: الأعلى</option><option value="fee-asc">الأتعاب: الأقل</option></select></label></section>
      <div className="r2-segment r2-core-segment" aria-label="تقسيم المعاملات">{([['current','جارية'],['stalled','متلكئة'],['archived','مغلقة']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={controller.request.view === value} onClick={() => controller.setView(value)}>{label} <span>{snapshot.counts[value]}</span></button>)}</div>
      <section className="r2-record-list r2-core-record-list">{snapshot.items.length ? snapshot.items.map((item) => <button type="button" className="r2-record-row r2-core-record-row" key={item.id} onClick={() => openTransaction(item.id)}><span className="r2-record-row__number">#{item.shortId}</span><span className="r2-record-row__identity"><strong>{item.type}</strong><small>{item.companyLabel}</small></span><span className="r2-core-record-row__facts"><small>{item.department || 'جهة غير محددة'}</small><small>{priorityLabel(item.priority)} · {money(item.currentFee, item.feePrecisionSafe)}</small></span><span className="r2-core-record-row__status">{item.view === 'stalled' ? 'متلكئة' : item.view === 'archived' ? 'مغلقة' : 'جارية'}</span><span className="r2-core-arrow" aria-hidden="true">←</span></button>) : <StatePanel title="لا توجد معاملات مطابقة" body="غيّر البحث أو المنظر الحالي." />}</section>
      <footer className="r2-core-pagination"><div><strong>{snapshot.filteredTotal}</strong><span> نتيجة · صفحة {snapshot.page + 1} من {snapshot.pageCount}</span></div><div><button type="button" disabled={!snapshot.hasPrevious} onClick={() => controller.setPage(snapshot.page - 1)}>السابق</button><button type="button" disabled={!snapshot.hasMore} onClick={() => controller.setPage(snapshot.page + 1)}>التالي</button></div></footer>
    </div>
  );
}

function ConnectedWorkRow({ item, controller }: Readonly<{ item: DailyWorkItem; controller: ReturnType<typeof useDailyWork> }>) {
  const busy = controller.actionItemId === item.id;
  return <article className={`r2-core-work-row is-${item.bucket}`} data-work-source={item.source}><div className="r2-core-work-row__signal"><span>{item.stateLabel}</span><strong>{item.score}</strong></div><div className="r2-core-work-row__copy"><strong>{item.title}</strong><p>{item.subject}</p><small>{item.ownerLabel} · {dateTime(item.dueAt)}</small></div><div className="r2-core-work-row__actions">{item.completable ? <button type="button" disabled={busy} onClick={() => { void controller.complete(item); }}>{busy ? 'جارٍ التنفيذ…' : 'إكمال'}</button> : null}{item.snoozable ? <button type="button" disabled={busy} onClick={() => { void controller.snooze(item); }}>{busy ? 'جارٍ التنفيذ…' : 'تأجيل ساعتين'}</button> : null}</div></article>;
}

function ConnectedToday({ followupsOnly = false }: Readonly<{ followupsOnly?: boolean }>) {
  const controller = useDailyWork();
  const [bucket, setBucket] = useState<'all' | 'overdue' | 'today' | 'action' | 'upcoming'>('all');
  if (controller.status === 'loading') return <div className="r2-screen" data-core-connected={followupsOnly ? 'followups' : 'today'}><StatePanel title="جارٍ تجهيز العمل" body="يتم تجميع المصادر التشغيلية الموثوقة داخل مساحة العمل." /></div>;
  if (controller.status === 'error' || !controller.snapshot) return <div className="r2-screen" data-core-connected={followupsOnly ? 'followups' : 'today'}><StatePanel title="تعذر تجهيز العمل" body={controller.errorMessage ?? 'تعذر الوصول إلى العمل اليومي.'} action={controller.retry} /></div>;
  const snapshot = controller.snapshot;
  const filtered = snapshot.items.filter((item) => (!followupsOnly || item.source === 'followup') && (bucket === 'all' || item.bucket === bucket));
  return <div className="r2-screen r2-core-today" data-screen={followupsOnly ? 'core-followups' : 'today'} data-core-connected={followupsOnly ? 'followups' : 'today'}><header className="r2-section-heading r2-section-heading--hero"><div><LiveBadge /><p className="r2-eyebrow">Daily Work · متصل</p><h1>{followupsOnly ? 'المتابعات' : 'اليوم'}</h1><p className="r2-supporting">{followupsOnly ? 'المتابعات الموثوقة فقط؛ مركز الإشعارات العام لا يُدّعى قبل مرحلته.' : 'العوائق أولًا ثم المتأخر ثم العمل الحالي، مع قمع العناصر التابعة لمعاملات غير نشطة.'}</p></div></header>{!followupsOnly ? <section className="r2-core-focus"><div><span>الأولوية الآن</span><h2>{snapshot.focus?.title ?? 'لا توجد أولوية'}</h2><p>{snapshot.focus?.subject ?? 'مساحة العمل هادئة.'}</p></div><div className="r2-core-focus__stats"><span><strong>{snapshot.summary.blocked}</strong> عائق</span><span><strong>{snapshot.summary.overdue}</strong> متأخر</span><span><strong>{snapshot.summary.dueToday}</strong> اليوم</span></div></section> : <section className="r2-core-scope-note"><strong>مركز المتابعات المتصل</strong><span>إكمال وتأجيل المتابعات يمر عبر Daily Work service داخل مساحة العمل والصلاحيات الحالية.</span></section>}<div className="r2-core-filter-strip">{(['all','overdue','today','action','upcoming'] as const).map((value) => <button key={value} type="button" aria-pressed={bucket === value} onClick={() => setBucket(value)}>{value === 'all' ? 'الكل' : value === 'overdue' ? 'متأخرة' : value === 'today' ? 'اليوم' : value === 'action' ? 'بحاجة إجراء' : 'قادمة'}</button>)}</div>{controller.actionError ? <p className="r2-core-preview-status" role="alert">{controller.actionError}</p> : null}<section className="r2-core-work-list">{filtered.length ? filtered.map((item) => <ConnectedWorkRow key={item.id} item={item} controller={controller} />) : <StatePanel title="لا توجد عناصر في هذا العرض" body="لم يتم تصنيع عناصر بديلة." />}</section></div>;
}

function ConnectedCreate({ navigate }: Readonly<{ navigate: Navigate }>) {
  return <div className="r2-screen r2-core-create" data-screen="create" data-core-connected="create"><header className="r2-section-heading r2-section-heading--hero"><div><LiveBadge /><p className="r2-eyebrow">Global Create · متصل</p><h1>جديد</h1><p className="r2-supporting">المعاملة هي مسار الإنشاء الموثوق في R2.0-5. بقية الإنشاءات تبقى مؤجلة إلى مرحلتها بدل حفظ وهمي.</p></div></header><button type="button" className="r2-create-primary r2-core-create-primary" onClick={() => navigate('transactions.editor')}><span className="r2-create-primary__icon">＋</span><span><strong>معاملة جديدة</strong><small>يفتح المحرر المتصل بخدمة transactionEditorService.</small></span><span aria-hidden="true">←</span></button></div>;
}

function ConnectedEditor({ transactionId, openTransaction, navigate }: Readonly<{ transactionId: string | null; openTransaction: OpenTransaction; navigate: Navigate }>) {
  const mode = transactionId ? 'edit' : 'create';
  const controller = useTransactionEditor(mode, transactionId);
  if (controller.status === 'loading') return <div className="r2-screen" data-core-connected="transaction-editor"><StatePanel title="جارٍ تجهيز المحرر" body="تُحمّل الشركات والعلاقات والسجل من مساحة العمل الحالية." /></div>;
  if (controller.status === 'error' || !controller.source) return <div className="r2-screen" data-core-connected="transaction-editor"><StatePanel title="تعذر تجهيز أو حفظ المعاملة" body={controller.errorMessage ?? 'تعذر متابعة العملية.'} action={controller.retry} /></div>;
  if (controller.status === 'saved' && controller.savedTransactionId) return <div className="r2-screen" data-core-connected="transaction-editor"><StatePanel title={controller.warnings.length ? 'تم حفظ السجل الأساسي مع تنبيه' : 'تم حفظ المعاملة'} body={controller.warnings.map((warning) => warning.message).join(' · ') || 'تم تأكيد الحفظ عبر الخدمة الموثوقة.'} action={() => openTransaction(controller.savedTransactionId ?? '')} actionLabel="فتح 360°" /></div>;
  const source = controller.source;
  const contacts = getRelatedContacts(source, controller.draft.companyId);
  const update = (field: TransactionEditorField) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => controller.update(field, event.currentTarget.value);
  const fieldError = (field: keyof typeof controller.errors) => controller.errors[field] ? <small className="r2-core-field-error" role="alert">{controller.errors[field]}</small> : null;
  return <div className="r2-screen r2-golden-editor r2-core-editor" data-screen="golden-transaction-editor" data-core-connected="transaction-editor"><header className="r2-section-heading r2-section-heading--hero"><div><LiveBadge /><p className="r2-eyebrow">Phase 5.2 · {mode === 'edit' ? 'تعديل' : 'إنشاء'}</p><h1>{mode === 'edit' ? 'محرر المعاملة' : 'معاملة جديدة'}</h1><p className="r2-supporting">الحفظ هنا يمر فعليًا عبر transactionEditorService، بما في ذلك تعارض التعديل والسجل التاريخي وسبب تغيير الأتعاب.</p></div></header><form className="r2-golden-form r2-core-form" noValidate onSubmit={(event) => { event.preventDefault(); void controller.submit(); }}>{controller.errors.form ? <p className="r2-core-preview-status" role="alert">{controller.errors.form}</p> : null}<div className="r2-golden-form__grid"><label><span>الشركة</span><select value={controller.draft.companyId} onChange={update('companyId')}><option value="">اختر الشركة</option>{source.companies.map((company) => <option key={company.id} value={company.id}>{company.display_name?.trim() || company.legal_name}</option>)}</select>{fieldError('companyId')}</label><label><span>جهة الاتصال</span><select value={controller.draft.primaryContactId} onChange={update('primaryContactId')} disabled={!controller.draft.companyId}><option value="">بدون جهة اتصال</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}</select>{fieldError('primaryContactId')}</label><label><span>نوع المعاملة</span><input value={controller.draft.type} onChange={update('type')} />{fieldError('type')}</label><label><span>الجهة</span><input value={controller.draft.department} onChange={update('department')} />{fieldError('department')}</label><label><span>الحالة</span><select value={controller.draft.status} onChange={update('status')}><option value="active">جارية</option><option value="stalled">متلكئة</option><option value="completed">مكتملة</option></select>{fieldError('status')}</label><label><span>الأولوية</span><select value={controller.draft.priority} onChange={update('priority')}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">مرتفعة</option><option value="urgent">عاجلة</option></select>{fieldError('priority')}</label><label><span>الأتعاب</span><input inputMode="decimal" value={controller.draft.currentFee} onChange={update('currentFee')} />{fieldError('currentFee')}</label>{controller.draft.status === 'completed' ? <label><span>تاريخ الإكمال</span><input type="datetime-local" value={controller.draft.completedAt} onChange={update('completedAt')} />{fieldError('completedAt')}</label> : null}<label><span>المحطة</span><input value={controller.draft.stationName} onChange={update('stationName')} />{fieldError('stationName')}</label><label><span>المسؤول</span><input value={controller.draft.assignedToText} onChange={update('assignedToText')} />{fieldError('assignedToText')}</label><label><span>وقت المحطة</span><input type="datetime-local" value={controller.draft.stationOccurredAt} onChange={update('stationOccurredAt')} />{fieldError('stationOccurredAt')}</label><label className="r2-golden-form__wide"><span>ملاحظة جديدة</span><textarea rows={4} value={controller.draft.noteBody} onChange={update('noteBody')} />{fieldError('noteBody')}</label><label className="r2-golden-form__wide"><span>سبب تغيير الأتعاب</span><textarea rows={3} value={controller.draft.feeChangeReason} onChange={update('feeChangeReason')} />{fieldError('feeChangeReason')}</label></div><div className="r2-golden-form__actions"><button type="submit" className="r2-action r2-action--primary" disabled={controller.status === 'saving'}>{controller.status === 'saving' ? 'جارٍ الحفظ…' : mode === 'edit' ? 'حفظ التعديلات' : 'حفظ المعاملة'}</button><button type="button" className="r2-action r2-action--secondary" disabled={controller.status === 'saving'} onClick={() => navigate(mode === 'edit' ? 'transactions.detail' : 'transactions')}>إلغاء</button></div></form></div>;
}

function Panel({ id, children }: Readonly<{ id: TabId; children: ReactNode }>) { return <div className="r2-golden-panel r2-core-panel" data-golden-panel={id}>{children}</div>; }

function Connected360({ transactionId, navigate }: Readonly<{ transactionId: string | null; navigate: Navigate }>) {
  if (!transactionId) return <div className="r2-screen" data-core-connected="transaction-360"><StatePanel title="لم تُحدد معاملة" body="افتح المعاملة من القائمة حتى يبقى السياق واضحًا." action={() => navigate('transactions')} actionLabel="المعاملات" /></div>;
  return <Connected360Loaded transactionId={transactionId} navigate={navigate} />;
}

function Connected360Loaded({ transactionId, navigate }: Readonly<{ transactionId: string; navigate: Navigate }>) {
  const controller = useTransaction360(transactionId);
  const [tab, setTab] = useState<TabId>('overview');
  if (controller.status === 'loading') return <div className="r2-screen" data-core-connected="transaction-360"><StatePanel title="جارٍ فتح 360°" body="يتم تحميل السياق الموثوق للمعاملة." /></div>;
  if (controller.status === 'error' || !controller.snapshot) return <div className="r2-screen" data-core-connected="transaction-360"><StatePanel title="تعذر فتح 360°" body={controller.errorMessage ?? 'تعذر تجهيز المعاملة.'} action={controller.retry} /></div>;
  const snapshot = controller.snapshot;
  const remaining = snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe ? Math.max(0, snapshot.currentFee - snapshot.financialSummary.postedTotal) : 0;
  let panel: ReactNode;
  if (tab === 'activity') panel = <Panel id="activity"><div className="r2-golden-panel__heading"><div><span>سجل موحّد</span><h2>التاريخ والنشاط</h2></div></div><div className="r2-golden-activity">{snapshot.timeline.map((item) => <article key={item.id}><time>{dateTime(item.occurredAt)}</time><div><strong>{item.title}</strong><p>{item.detail || 'لا توجد تفاصيل إضافية.'}</p></div></article>)}</div></Panel>;
  else if (tab === 'followups') panel = <Panel id="followups"><div className="r2-golden-panel__heading"><div><span>العمل المرتبط</span><h2>المتابعات</h2></div><strong>{snapshot.followupSummary.active} مفتوحة</strong></div><div className="r2-golden-line-items">{snapshot.followups.items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{dateTime(item.due_at)}</small></div><span>{item.completed_at ? 'مكتملة' : item.status}</span></article>)}</div></Panel>;
  else if (tab === 'documents') panel = <Panel id="documents"><div className="r2-golden-panel__heading"><div><span>الوثائق المرتبطة</span><h2>مستندات المعاملة</h2></div><strong>{snapshot.documents.items.length}</strong></div><div className="r2-golden-line-items">{snapshot.documents.items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.document_type}</small></div><span>{item.status}</span></article>)}</div></Panel>;
  else if (tab === 'finance') panel = <Panel id="finance"><div className="r2-golden-panel__heading"><div><span>السياق المالي</span><h2>الأتعاب والدفعات</h2></div></div><div className="r2-golden-finance"><div><span>الأتعاب الحالية</span><strong>{money(snapshot.currentFee, snapshot.feePrecisionSafe)}</strong></div><div><span>الدفعات المثبتة</span><strong>{money(snapshot.financialSummary.postedTotal, snapshot.financialSummary.precisionSafe)}</strong></div><div><span>المتبقي</span><strong>{money(remaining, snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe)}</strong></div></div></Panel>;
  else panel = <Panel id="overview"><div className="r2-golden-panel__heading"><div><span>المشهد الحالي</span><h2>قرار واضح قبل التفاصيل</h2></div><strong>{priorityLabel(snapshot.priority)}</strong></div><div className="r2-golden-decision"><div><span className="r2-golden-kicker">هوية المعاملة</span><h3>{snapshot.type}</h3><p>{snapshot.department || 'جهة غير محددة'} · {snapshot.companyLabel}</p></div><time>{dateTime(snapshot.lastActivityAt)}</time></div><div className="r2-golden-facts"><div><span>الحالة</span><strong>{snapshot.status}</strong></div><div><span>المتابعات المفتوحة</span><strong>{snapshot.followupSummary.active}</strong></div><div><span>العوائق المرتفعة</span><strong>{snapshot.risk.highOrCritical}</strong></div><div><span>الوثائق</span><strong>{snapshot.documents.items.length}</strong></div></div></Panel>;
  return <div className="r2-screen r2-golden-transaction r2-core-transaction" data-screen="golden-transaction-360" data-core-connected="transaction-360"><header className="r2-golden-transaction__hero"><div className="r2-golden-transaction__identity"><LiveBadge /><p className="r2-eyebrow">المعاملة #{snapshot.shortId} · 360°</p><h1>{snapshot.type}</h1><p>{snapshot.companyLabel}</p><div className="r2-golden-status-line"><span>{snapshot.status}</span><span>{priorityLabel(snapshot.priority)}</span><span>{snapshot.companyMissing ? 'علاقة الشركة غير متاحة' : 'علاقة الشركة مؤكدة'}</span></div></div><div className="r2-golden-transaction__actions"><button type="button" className="r2-action r2-action--primary" onClick={() => navigate('transactions.editor')}>تعديل المعاملة</button><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions.lifecycle')}>دورة الحياة</button></div></header><nav className="r2-golden-context-tabs">{([['overview','نظرة عامة'],['activity','النشاط'],['followups','المتابعات'],['documents','الوثائق'],['finance','المالية']] as const).map(([id,label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav><div className="r2-golden-context-layout"><main>{panel}</main><aside className="r2-golden-sidecar"><span className="r2-golden-kicker">سياق موثوق</span><h2>Snapshot من خدمة 360°</h2><p>كل منطقة هنا مبنية على المصدر المحمّل عبر transaction360Service داخل مساحة العمل.</p><button type="button" className="r2-action r2-action--secondary" onClick={() => navigate('transactions')}>العودة للمعاملات</button></aside></div></div>;
}

function ConnectedLifecycle({ transactionId, navigate }: Readonly<{ transactionId: string | null; navigate: Navigate }>) {
  if (!transactionId) return <div className="r2-screen" data-core-connected="transaction-lifecycle"><StatePanel title="لم تُحدد معاملة" body="افتح المعاملة ثم إدارة دورة حياتها." action={() => navigate('transactions')} actionLabel="المعاملات" /></div>;
  return <ConnectedLifecycleLoaded transactionId={transactionId} navigate={navigate} />;
}

function ConnectedLifecycleLoaded({ transactionId, navigate }: Readonly<{ transactionId: string; navigate: Navigate }>) {
  const controller = useTransactionLifecycle(transactionId);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  if (controller.status === 'loading') return <div className="r2-screen" data-core-connected="transaction-lifecycle"><StatePanel title="جارٍ تحميل دورة الحياة" body="يتم التحقق من المعاملة والمتابعات المفتوحة." /></div>;
  if (controller.status === 'error' || !controller.context || !controller.capabilities) return <div className="r2-screen" data-core-connected="transaction-lifecycle"><StatePanel title="تعذر إدارة الحالة" body={controller.errorMessage ?? 'تعذر تجهيز السياق.'} action={controller.retry} /></div>;
  const execute = async (action: TransactionLifecycleAction) => { const ok = await controller.execute(action, note); if (ok) setMessage('تم تأكيد الإجراء عبر transactionLifecycleService.'); };
  const capabilities = controller.capabilities;
  const currentLabel = capabilities.archived ? 'مؤرشفة' : capabilities.completed ? 'مكتملة' : 'نشطة';
  return <div className="r2-screen r2-golden-lifecycle r2-core-lifecycle" data-screen="golden-transaction-lifecycle" data-core-connected="transaction-lifecycle"><header className="r2-section-heading r2-section-heading--hero"><div><LiveBadge /><p className="r2-eyebrow">دورة حياة موثوقة</p><h1>إدارة حالة المعاملة</h1><p className="r2-supporting">الأرشفة والاستعادة وإعادة التنشيط إجراءات منفصلة وتُنفذ عبر خدمة Phase 5.4 مع فحص التعارض.</p></div></header><section className="r2-golden-lifecycle__body"><div className="r2-golden-lifecycle__state"><span>الحالة الحالية</span><strong>{currentLabel}</strong><p>{controller.context.openFollowupCount} متابعة مفتوحة محفوظة وفق عقد دورة الحياة.</p></div><div className="r2-core-lifecycle-facts"><span><strong>{capabilities.canArchive ? 'نعم' : 'لا'}</strong> أرشفة</span><span><strong>{capabilities.canRestore ? 'نعم' : 'لا'}</strong> استعادة</span><span><strong>{capabilities.canReactivate ? 'نعم' : 'لا'}</strong> إعادة تنشيط</span></div><label className="r2-core-lifecycle-note"><span>ملاحظة الإجراء</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>{controller.errorMessage ? <p className="r2-core-preview-status" role="alert">{controller.errorMessage}</p> : null}{message ? <p className="r2-core-preview-status" role="status">{message}</p> : null}{controller.warnings.map((warning) => <p key={warning.code} className="r2-core-preview-status" role="status">{warning.message}</p>)}<div className="r2-golden-lifecycle__actions">{capabilities.canArchive ? <button type="button" className="r2-action r2-action--primary" disabled={controller.status === 'mutating'} onClick={() => { void execute('archive'); }}>أرشفة المعاملة</button> : null}{capabilities.canRestore ? <button type="button" className="r2-action r2-action--primary" disabled={controller.status === 'mutating'} onClick={() => { void execute('restore'); }}>استعادة المعاملة</button> : null}{capabilities.canReactivate ? <button type="button" className="r2-action r2-action--secondary" disabled={controller.status === 'mutating'} onClick={() => { void execute('reactivate'); }}>إعادة تنشيط المعاملة</button> : null}<button type="button" className="r2-action r2-action--secondary" disabled={controller.status === 'mutating'} onClick={() => navigate('transactions.detail')}>العودة إلى 360°</button></div></section></div>;
}

export function ConnectedCoreWorkRouter(context: ConnectedContext): ReactNode | null {
  const { destinationId, transactionId, navigate, openTransaction } = context;
  if (destinationId === 'transactions') return <ConnectedTransactions navigate={navigate} openTransaction={openTransaction} />;
  if (destinationId === 'today') return <ConnectedToday />;
  if (destinationId === 'followups') return <ConnectedToday followupsOnly />;
  if (destinationId === 'create') return <ConnectedCreate navigate={navigate} />;
  if (destinationId === 'transactions.detail') return <Connected360 transactionId={transactionId} navigate={navigate} />;
  if (destinationId === 'transactions.editor') return <ConnectedEditor transactionId={transactionId} openTransaction={openTransaction} navigate={navigate} />;
  if (destinationId === 'transactions.lifecycle') return <ConnectedLifecycle transactionId={transactionId} navigate={navigate} />;
  return null;
}
