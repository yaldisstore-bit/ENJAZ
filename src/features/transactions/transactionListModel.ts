import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type TransactionListView = 'current' | 'stalled' | 'archived';
export type TransactionListSort = 'activity-desc' | 'created-desc' | 'fee-desc' | 'fee-asc';

export const TRANSACTION_LIST_PAGE_SIZE = 20;
export const TRANSACTION_LIST_MAX_PAGE_SIZE = 50;
export const TRANSACTION_SEARCH_MAX_LENGTH = 120;

export interface TransactionListRequest {
  readonly view: TransactionListView;
  readonly search: string;
  readonly sort: TransactionListSort;
  readonly page: number;
  readonly pageSize: number;
}

export interface TransactionListSource {
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly companies: readonly RowOf<'companies'>[];
}

export interface TransactionListItem {
  readonly id: string;
  readonly shortId: string;
  readonly type: string;
  readonly department: string | null;
  readonly status: string;
  readonly priority: string;
  readonly companyId: string;
  readonly companyLabel: string;
  readonly companyMissing: boolean;
  readonly currentFee: number;
  readonly feePrecisionSafe: boolean;
  readonly createdAt: string;
  readonly lastActivityAt: string;
  readonly view: TransactionListView;
}

export interface TransactionListSnapshot {
  readonly items: readonly TransactionListItem[];
  readonly counts: Readonly<Record<TransactionListView, number>>;
  readonly filteredTotal: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly hasPrevious: boolean;
  readonly hasMore: boolean;
  readonly search: string;
  readonly sort: TransactionListSort;
  readonly view: TransactionListView;
}

const STALLED_STATUSES = new Set(['stalled', 'delayed']);
const CLOSED_STATUSES = new Set(['completed', 'closed', 'archived']);
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function normalizeArabic(value: string): string {
  return value
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLocaleLowerCase('ar-IQ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTransactionSearch(value: string): string {
  return normalizeArabic(value).slice(0, TRANSACTION_SEARCH_MAX_LENGTH);
}

export function classifyTransactionView(row: RowOf<'transactions'>): TransactionListView | null {
  if (row.deleted_at !== null) return null;
  const status = row.status.trim().toLowerCase();
  if (row.archived_at !== null || row.completed_at !== null || CLOSED_STATUSES.has(status)) return 'archived';
  if (STALLED_STATUSES.has(status)) return 'stalled';
  return 'current';
}

function safeTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function safeMoney(value: number): boolean {
  return Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100));
}

function companyLabel(company: RowOf<'companies'> | undefined): string {
  if (!company || company.deleted_at !== null) return 'بيانات الشركة غير متاحة';
  return company.display_name?.trim() || company.legal_name.trim() || 'بيانات الشركة غير متاحة';
}

function matchesSearch(row: RowOf<'transactions'>, label: string, search: string): boolean {
  if (!search) return true;
  const haystack = normalizeArabic([
    row.id,
    row.id.slice(0, 8),
    row.legacy_id ?? '',
    row.type,
    row.department ?? '',
    row.status,
    row.priority,
    label,
  ].join(' '));
  return search.split(' ').every((token) => token.length > 0 && haystack.includes(token));
}

function compareRows(a: RowOf<'transactions'>, b: RowOf<'transactions'>, sort: TransactionListSort): number {
  if (sort === 'created-desc') {
    const delta = safeTimestamp(b.created_at) - safeTimestamp(a.created_at);
    return delta || a.id.localeCompare(b.id);
  }
  if (sort === 'fee-desc') {
    const delta = b.current_fee - a.current_fee;
    return delta || safeTimestamp(b.last_activity_at) - safeTimestamp(a.last_activity_at) || a.id.localeCompare(b.id);
  }
  if (sort === 'fee-asc') {
    const delta = a.current_fee - b.current_fee;
    return delta || safeTimestamp(b.last_activity_at) - safeTimestamp(a.last_activity_at) || a.id.localeCompare(b.id);
  }
  const delta = safeTimestamp(b.last_activity_at) - safeTimestamp(a.last_activity_at);
  return delta || a.id.localeCompare(b.id);
}

export function normalizeTransactionListRequest(input: Partial<TransactionListRequest> = {}): TransactionListRequest {
  const page = Number.isSafeInteger(input.page) && (input.page ?? 0) >= 0 ? input.page! : 0;
  const requestedPageSize = Number.isSafeInteger(input.pageSize) ? input.pageSize! : TRANSACTION_LIST_PAGE_SIZE;
  const pageSize = Math.min(TRANSACTION_LIST_MAX_PAGE_SIZE, Math.max(1, requestedPageSize));
  const view: TransactionListView = input.view === 'stalled' || input.view === 'archived' ? input.view : 'current';
  const sort: TransactionListSort = input.sort === 'created-desc' || input.sort === 'fee-desc' || input.sort === 'fee-asc' ? input.sort : 'activity-desc';
  return Object.freeze({ view, sort, search: normalizeTransactionSearch(input.search ?? ''), page, pageSize });
}

export function buildTransactionListSnapshot(
  source: TransactionListSource,
  input: Partial<TransactionListRequest> = {},
): TransactionListSnapshot {
  const request = normalizeTransactionListRequest(input);
  const companyById = new Map(source.companies.map((company) => [company.id, company] as const));
  const counts: Record<TransactionListView, number> = { current: 0, stalled: 0, archived: 0 };

  const eligible = source.transactions.filter((row) => {
    const view = classifyTransactionView(row);
    if (!view) return false;
    counts[view] += 1;
    if (view !== request.view) return false;
    return matchesSearch(row, companyLabel(companyById.get(row.company_id)), request.search);
  }).sort((a, b) => compareRows(a, b, request.sort));

  const pageCount = eligible.length === 0 ? 1 : Math.ceil(eligible.length / request.pageSize);
  const page = Math.min(request.page, pageCount - 1);
  const offset = page * request.pageSize;
  const rows = eligible.slice(offset, offset + request.pageSize);

  const items = rows.map((row): TransactionListItem => {
    const company = companyById.get(row.company_id);
    const view = classifyTransactionView(row) ?? 'current';
    return Object.freeze({
      id: row.id,
      shortId: row.legacy_id?.trim() || row.id.slice(0, 8).toUpperCase(),
      type: row.type,
      department: row.department,
      status: row.status,
      priority: row.priority,
      companyId: row.company_id,
      companyLabel: companyLabel(company),
      companyMissing: !company || company.deleted_at !== null,
      currentFee: row.current_fee,
      feePrecisionSafe: safeMoney(row.current_fee),
      createdAt: row.created_at,
      lastActivityAt: row.last_activity_at,
      view,
    });
  });

  return Object.freeze({
    items: Object.freeze(items),
    counts: Object.freeze({ ...counts }),
    filteredTotal: eligible.length,
    page,
    pageSize: request.pageSize,
    pageCount,
    hasPrevious: page > 0,
    hasMore: page + 1 < pageCount,
    search: request.search,
    sort: request.sort,
    view: request.view,
  });
}
