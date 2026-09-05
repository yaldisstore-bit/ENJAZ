import { useMemo, useState } from 'react';
import { buildTransactionListPreviewSource } from '../../features/transactions/transactionListPreview.ts';
import {
  buildTransactionListSnapshot,
  normalizeTransactionListRequest,
  TRANSACTION_SAVED_VIEW_SCHEMA,
  TRANSACTION_SEARCH_MAX_LENGTH,
  type TransactionListItem,
  type TransactionListRequest,
  type TransactionListSnapshot,
  type TransactionListSort,
  type TransactionListView,
} from '../../features/transactions/transactionListModel.ts';
import { useTransactionList, type TransactionListController } from '../../features/transactions/useTransactionList.ts';
import { EzSheet } from '../components/overlays.tsx';
import { EzButton, EzChip, EzField, EzNotice, EzSegmented, EzStatPill } from '../components/primitives.tsx';
import { ConnectedTransaction360, FixtureTransaction360 } from './Transaction360.tsx';
import { ConnectedTransactionEditor, FixtureTransactionEditor } from './TransactionEditor.tsx';

type EditorTarget = Readonly<{ mode: 'create' | 'edit'; transactionId: string | null }> | null;

function formatMoney(item: TransactionListItem): string {
  if (!item.feePrecisionSafe) return 'تحقق من المالية';
  return `${new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format(item.currentFee)} د.ع`;
}

function formatActivity(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'وقت غير متاح';
  return new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}

function viewLabel(view: TransactionListView): string {
  if (view === 'stalled') return 'متلكئة';
  if (view === 'archived') return 'مؤرشفة / مغلقة';
  return 'جارية';
}

function stateTone(item: TransactionListItem): 'success' | 'warning' | 'neutral' {
  if (item.view === 'stalled') return 'warning';
  if (item.view === 'archived') return 'neutral';
  return 'success';
}

function priorityTone(priority: string): 'danger' | 'warning' | 'neutral' {
  const value = priority.trim().toLowerCase();
  if (value === 'urgent' || value === 'critical') return 'danger';
  if (value === 'high') return 'warning';
  return 'neutral';
}

function priorityLabel(priority: string): string {
  const value = priority.trim().toLowerCase();
  if (value === 'urgent' || value === 'critical') return 'عاجلة';
  if (value === 'high') return 'مرتفعة';
  return 'عادية';
}

function TransactionListSkeleton() {
  return <section className="ez-transaction-list__skeleton" aria-label="جارٍ تحميل المعاملات"><i /><i /><i /><i /></section>;
}

function TransactionCard(props: Readonly<{
  item: TransactionListItem;
  onOpen?: ((transactionId: string) => void) | undefined;
  onEdit?: ((transactionId: string) => void) | undefined;
}>) {
  const item = props.item;
  const editable = item.view !== 'archived' && Boolean(props.onEdit);
  return (
    <article className="ez-transaction-card" data-transaction-id={item.id} data-transaction-view={item.view}>
      <header>
        <div className="ez-transaction-card__identity"><span>{item.shortId}</span><strong>{item.type}</strong></div>
        <div className="ez-transaction-card__chips"><EzChip tone={stateTone(item)}>{viewLabel(item.view)}</EzChip><EzChip tone={priorityTone(item.priority)}>{priorityLabel(item.priority)}</EzChip></div>
      </header>
      <div className="ez-transaction-card__body">
        <div><small>الشركة</small><strong>{item.companyLabel}</strong>{item.companyMissing ? <EzChip tone="warning">تحقق من الربط</EzChip> : null}</div>
        <div><small>الجهة</small><strong>{item.department?.trim() || 'غير محددة'}</strong></div>
        <div><small>الأتعاب</small><strong>{formatMoney(item)}</strong></div>
        <div><small>آخر حركة</small><strong>{formatActivity(item.lastActivityAt)}</strong></div>
      </div>
      <footer className="ez-transaction-card__actions">
        <div className="ez-transaction-card__action-buttons">
          {props.onOpen ? <EzButton tone="dark" onClick={() => props.onOpen?.(item.id)} data-transaction-open-360={item.id}>فتح 360°</EzButton> : null}
          {editable ? <EzButton tone="ghost" onClick={() => props.onEdit?.(item.id)} data-transaction-edit={item.id}>تعديل المعاملة</EzButton> : null}
        </div>
        {item.view === 'archived' ? <small>العرض 360° متاح؛ الاستعادة وإجراءات دورة الحياة تأتي في Phase 5.4.</small> : null}
      </footer>
    </article>
  );
}

function TransactionListReady(props: Readonly<{
  snapshot: TransactionListSnapshot;
  request: TransactionListRequest;
  setView(view: TransactionListView): void;
  setSearch(search: string): void;
  setSort(sort: TransactionListSort): void;
  setPage(page: number): void;
  onOpen?: ((transactionId: string) => void) | undefined;
  onEdit?: ((transactionId: string) => void) | undefined;
}>) {
  const snapshot = props.snapshot;
  const views = [
    { value: 'current', label: `الجارية ${snapshot.counts.current}` },
    { value: 'stalled', label: `المتلكئة ${snapshot.counts.stalled}` },
    { value: 'archived', label: `المؤرشفة ${snapshot.counts.archived}` },
  ] as const;

  return (
    <>
      <section className="ez-transaction-list__summary" aria-label="ملخص المعاملات">
        <EzStatPill value={String(snapshot.counts.current)} label="جارية" tone="dark" />
        <EzStatPill value={String(snapshot.counts.stalled)} label="متلكئة" tone={snapshot.counts.stalled ? 'gold' : 'soft'} />
        <EzStatPill value={String(snapshot.counts.archived)} label="مؤرشفة / مغلقة" />
      </section>

      <section className="ez-transaction-list__controls" data-saved-view-anchor="transactions" data-saved-view-schema={TRANSACTION_SAVED_VIEW_SCHEMA}>
        <EzField
          label="بحث المعاملات"
          aria-label="بحث المعاملات"
          placeholder="رقم، نوع، شركة، جهة أو حالة"
          maxLength={TRANSACTION_SEARCH_MAX_LENGTH}
          value={props.request.search}
          onChange={(event) => props.setSearch(event.currentTarget.value)}
        />
        <label className="ez-transaction-list__sort">
          <span>الترتيب</span>
          <select aria-label="ترتيب المعاملات" value={props.request.sort} onChange={(event) => props.setSort(event.currentTarget.value as TransactionListSort)}>
            <option value="activity-desc">آخر حركة</option>
            <option value="created-desc">الأحدث إنشاءً</option>
            <option value="fee-desc">الأتعاب: الأعلى</option>
            <option value="fee-asc">الأتعاب: الأقل</option>
          </select>
        </label>
      </section>

      <EzSegmented value={props.request.view} options={views} onChange={(value) => props.setView(value as TransactionListView)} />

      <section className="ez-transaction-list__result-head">
        <div><span>{viewLabel(snapshot.view)}</span><strong>{snapshot.filteredTotal} نتيجة</strong></div>
        <small>صفحة {snapshot.page + 1} من {snapshot.pageCount}</small>
      </section>

      {snapshot.items.length ? (
        <section className="ez-transaction-list__results" data-transaction-results="true">
          {snapshot.items.map((item) => <TransactionCard key={item.id} item={item} onOpen={props.onOpen} onEdit={props.onEdit} />)}
        </section>
      ) : (
        <section className="ez-transaction-list__empty" data-transaction-empty="true">
          <strong>لا توجد معاملات تطابق هذا العرض</strong>
          <small>{snapshot.search ? 'غيّر عبارة البحث أو العرض الحالي.' : 'لا توجد سجلات في هذه الحالة حاليًا.'}</small>
        </section>
      )}

      <nav className="ez-transaction-list__pagination" aria-label="صفحات المعاملات">
        <EzButton tone="ghost" disabled={!snapshot.hasPrevious} onClick={() => props.setPage(snapshot.page - 1)}>السابق</EzButton>
        <span>{snapshot.page + 1} / {snapshot.pageCount}</span>
        <EzButton tone="ghost" disabled={!snapshot.hasMore} onClick={() => props.setPage(snapshot.page + 1)}>التالي</EzButton>
      </nav>
    </>
  );
}

export function TransactionListScreen(props: Readonly<TransactionListController & {
  onCreate?: (() => void) | undefined;
  onOpen?: ((transactionId: string) => void) | undefined;
  onEdit?: ((transactionId: string) => void) | undefined;
}>) {
  return (
    <section className="ez-domain-screen ez-domain-transactions ez-transaction-list" data-domain-screen="transactions" data-pattern="transaction-list-search" data-transaction-status={props.status}>
      <header className="ez-domain-intro">
        <div><span>دورة العمل</span><h1>المعاملات</h1><p>قائمة موحدة للمعاملات الجارية والمتلكئة والمؤرشفة، مع بحث وفرز من نفس مصدر البيانات الموثوق.</p></div>
        {props.onCreate ? <EzButton tone="dark" onClick={props.onCreate} data-transaction-create="true">معاملة جديدة</EzButton> : null}
      </header>

      {props.status === 'loading' ? <TransactionListSkeleton /> : null}
      {props.status === 'error' ? <EzNotice title="تعذر تحميل المعاملات" body={props.errorMessage ?? 'تعذر تجهيز القائمة.'} tone="danger" action={<EzButton tone="dark" onClick={props.retry}>إعادة المحاولة</EzButton>} /> : null}
      {props.status === 'ready' && props.snapshot ? <TransactionListReady snapshot={props.snapshot} request={props.request} setView={props.setView} setSearch={props.setSearch} setSort={props.setSort} setPage={props.setPage} onOpen={props.onOpen} onEdit={props.onEdit} /> : null}
    </section>
  );
}

export function ConnectedTransactionListScreen() {
  const controller = useTransactionList();
  const [editor, setEditor] = useState<EditorTarget>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const closeEditor = () => setEditor(null);
  const saved = () => {
    setEditor(null);
    controller.retry();
  };
  const openDetail = (transactionId: string) => {
    setEditor(null);
    setDetailId(transactionId);
  };
  return (
    <>
      <TransactionListScreen {...controller} onCreate={() => { setDetailId(null); setEditor({ mode: 'create', transactionId: null }); }} onOpen={openDetail} onEdit={(transactionId) => { setDetailId(null); setEditor({ mode: 'edit', transactionId }); }} />
      <EzSheet open={detailId !== null} title="ملف المعاملة 360°" eyebrow="Phase 5.3" onClose={() => setDetailId(null)}>
        {detailId ? <ConnectedTransaction360 transactionId={detailId} /> : null}
      </EzSheet>
      <EzSheet open={editor !== null} title={editor?.mode === 'edit' ? 'تعديل المعاملة' : 'معاملة جديدة'} eyebrow="Phase 5.2" onClose={closeEditor}>
        {editor ? <ConnectedTransactionEditor mode={editor.mode} transactionId={editor.transactionId} onSaved={saved} onCancel={closeEditor} /> : null}
      </EzSheet>
    </>
  );
}

export function FixtureTransactionListScreen() {
  const source = useMemo(() => buildTransactionListPreviewSource(), []);
  const [request, setRequest] = useState<TransactionListRequest>(() => normalizeTransactionListRequest());
  const [editor, setEditor] = useState<EditorTarget>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const snapshot = useMemo(() => buildTransactionListSnapshot(source, request), [request, source]);
  const controller: TransactionListController = Object.freeze({
    status: 'ready',
    snapshot,
    request,
    errorMessage: null,
    retry() {},
    setView(view: TransactionListView) { setRequest((current) => normalizeTransactionListRequest({ ...current, view, page: 0 })); },
    setSearch(search: string) { setRequest((current) => normalizeTransactionListRequest({ ...current, search, page: 0 })); },
    setSort(sort: TransactionListSort) { setRequest((current) => normalizeTransactionListRequest({ ...current, sort, page: 0 })); },
    setPage(page: number) { setRequest((current) => normalizeTransactionListRequest({ ...current, page })); },
  });
  const closeEditor = () => setEditor(null);
  const openDetail = (transactionId: string) => {
    setEditor(null);
    setDetailId(transactionId);
  };
  return (
    <>
      <TransactionListScreen {...controller} onCreate={() => { setDetailId(null); setEditor({ mode: 'create', transactionId: null }); }} onOpen={openDetail} onEdit={(transactionId) => { setDetailId(null); setEditor({ mode: 'edit', transactionId }); }} />
      <EzSheet open={detailId !== null} title="ملف المعاملة 360°" eyebrow="Phase 5.3" onClose={() => setDetailId(null)}>
        {detailId ? <FixtureTransaction360 transactionId={detailId} /> : null}
      </EzSheet>
      <EzSheet open={editor !== null} title={editor?.mode === 'edit' ? 'تعديل المعاملة' : 'معاملة جديدة'} eyebrow="Phase 5.2" onClose={closeEditor}>
        {editor ? <FixtureTransactionEditor mode={editor.mode} onSaved={closeEditor} onCancel={closeEditor} /> : null}
      </EzSheet>
    </>
  );
}
