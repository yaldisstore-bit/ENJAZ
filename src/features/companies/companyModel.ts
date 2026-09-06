import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type CompanyListFilter = 'all' | 'active' | 'inactive';
export type CompanyListSort = 'activity-desc' | 'name-asc' | 'created-desc' | 'capital-desc';

export const COMPANY_LIST_PAGE_SIZE = 20;
export const COMPANY_LIST_MAX_PAGE_SIZE = 50;
export const COMPANY_SEARCH_MAX_LENGTH = 160;

export interface CompanyListRequest {
  readonly filter: CompanyListFilter;
  readonly search: string;
  readonly sort: CompanyListSort;
  readonly page: number;
  readonly pageSize: number;
}

export interface CompanyListSource {
  readonly companies: readonly RowOf<'companies'>[];
}

export interface CompanyListItem {
  readonly id: string;
  readonly label: string;
  readonly legalName: string;
  readonly registrationNumber: string | null;
  readonly address: string | null;
  readonly activities: string | null;
  readonly legalStatus: string | null;
  readonly status: string;
  readonly active: boolean;
  readonly merged: boolean;
  readonly capital: number | null;
  readonly capitalPrecisionSafe: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CompanyListSnapshot {
  readonly items: readonly CompanyListItem[];
  readonly counts: Readonly<{ all: number; active: number; inactive: number }>;
  readonly filteredTotal: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly hasPrevious: boolean;
  readonly hasMore: boolean;
  readonly filter: CompanyListFilter;
  readonly search: string;
  readonly sort: CompanyListSort;
}

export interface CompanyDraft {
  readonly legalName: string;
  readonly displayName: string;
  readonly capitalInput: string;
  readonly address: string;
  readonly activities: string;
  readonly registrationNumber: string;
  readonly legalStatus: string;
  readonly status: 'active' | 'inactive';
}

export type CompanyDraftField = keyof CompanyDraft;
export type CompanyDraftErrors = Readonly<Partial<Record<CompanyDraftField | 'form', string>>>;

export interface ValidatedCompanyDraft {
  readonly legalName: string;
  readonly displayName: string | null;
  readonly capital: number | null;
  readonly address: string | null;
  readonly activities: string | null;
  readonly registrationNumber: string | null;
  readonly legalStatus: string | null;
  readonly status: 'active' | 'inactive';
}

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

export function normalizeCompanySearch(value: string): string {
  return normalizeArabic(value).slice(0, COMPANY_SEARCH_MAX_LENGTH);
}

function normalizeFilter(value: unknown): CompanyListFilter {
  return value === 'active' || value === 'inactive' ? value : 'all';
}

function normalizeSort(value: unknown): CompanyListSort {
  return value === 'name-asc' || value === 'created-desc' || value === 'capital-desc' ? value : 'activity-desc';
}

function normalizePageSize(value: unknown): number {
  const requested = Number.isSafeInteger(value) ? Number(value) : COMPANY_LIST_PAGE_SIZE;
  return Math.min(COMPANY_LIST_MAX_PAGE_SIZE, Math.max(1, requested));
}

export function normalizeCompanyListRequest(input: Partial<CompanyListRequest> = {}): CompanyListRequest {
  const page = Number.isSafeInteger(input.page) && (input.page ?? 0) >= 0 ? input.page! : 0;
  return Object.freeze({
    filter: normalizeFilter(input.filter),
    search: normalizeCompanySearch(input.search ?? ''),
    sort: normalizeSort(input.sort),
    page,
    pageSize: normalizePageSize(input.pageSize),
  });
}

function isActiveCompany(row: RowOf<'companies'>): boolean {
  return row.deleted_at === null && row.merged_into_id === null && row.status.trim().toLowerCase() === 'active';
}

function isEligibleCompany(row: RowOf<'companies'>): boolean {
  return row.deleted_at === null;
}

function safeTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isSafeCompanyCapital(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100)));
}

export function companyLabel(row: RowOf<'companies'>): string {
  return row.display_name?.trim() || row.legal_name.trim() || 'شركة بلا اسم صالح';
}

function matchesSearch(row: RowOf<'companies'>, search: string): boolean {
  if (!search) return true;
  const haystack = normalizeArabic([
    row.id,
    row.legacy_id ?? '',
    row.legal_name,
    row.display_name ?? '',
    row.registration_number ?? '',
    row.address ?? '',
    row.activities ?? '',
    row.legal_status ?? '',
    row.status,
  ].join(' '));
  return search.split(' ').every((token) => token.length > 0 && haystack.includes(token));
}

function compareCompanies(a: RowOf<'companies'>, b: RowOf<'companies'>, sort: CompanyListSort): number {
  if (sort === 'name-asc') return companyLabel(a).localeCompare(companyLabel(b), 'ar') || a.id.localeCompare(b.id);
  if (sort === 'created-desc') return safeTimestamp(b.created_at) - safeTimestamp(a.created_at) || a.id.localeCompare(b.id);
  if (sort === 'capital-desc') {
    const left = isSafeCompanyCapital(a.capital) ? (a.capital ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
    const right = isSafeCompanyCapital(b.capital) ? (b.capital ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
    return right - left || safeTimestamp(b.updated_at) - safeTimestamp(a.updated_at) || a.id.localeCompare(b.id);
  }
  return safeTimestamp(b.updated_at) - safeTimestamp(a.updated_at) || a.id.localeCompare(b.id);
}

export function buildCompanyListSnapshot(source: CompanyListSource, input: Partial<CompanyListRequest> = {}): CompanyListSnapshot {
  const request = normalizeCompanyListRequest(input);
  const eligible = source.companies.filter(isEligibleCompany);
  const activeCount = eligible.filter(isActiveCompany).length;
  const counts = Object.freeze({ all: eligible.length, active: activeCount, inactive: eligible.length - activeCount });
  const filtered = eligible
    .filter((row) => request.filter === 'all' || (request.filter === 'active') === isActiveCompany(row))
    .filter((row) => matchesSearch(row, request.search))
    .sort((a, b) => compareCompanies(a, b, request.sort));
  const pageCount = filtered.length === 0 ? 1 : Math.ceil(filtered.length / request.pageSize);
  const page = Math.min(request.page, pageCount - 1);
  const offset = page * request.pageSize;
  const items = filtered.slice(offset, offset + request.pageSize).map((row): CompanyListItem => Object.freeze({
    id: row.id,
    label: companyLabel(row),
    legalName: row.legal_name,
    registrationNumber: row.registration_number,
    address: row.address,
    activities: row.activities,
    legalStatus: row.legal_status,
    status: row.status,
    active: isActiveCompany(row),
    merged: row.merged_into_id !== null,
    capital: row.capital,
    capitalPrecisionSafe: isSafeCompanyCapital(row.capital),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return Object.freeze({
    items: Object.freeze(items),
    counts,
    filteredTotal: filtered.length,
    page,
    pageSize: request.pageSize,
    pageCount,
    hasPrevious: page > 0,
    hasMore: page + 1 < pageCount,
    filter: request.filter,
    search: request.search,
    sort: request.sort,
  });
}

function normalizeDigits(value: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)))
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.');
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export function createCompanyDraft(row?: RowOf<'companies'> | null): CompanyDraft {
  return Object.freeze({
    legalName: row?.legal_name ?? '',
    displayName: row?.display_name ?? '',
    capitalInput: row?.capital === null || row?.capital === undefined ? '' : String(row.capital),
    address: row?.address ?? '',
    activities: row?.activities ?? '',
    registrationNumber: row?.registration_number ?? '',
    legalStatus: row?.legal_status ?? '',
    status: row?.status.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
  });
}

export function updateCompanyDraft(draft: CompanyDraft, field: CompanyDraftField, value: string): CompanyDraft {
  if (field === 'status') return Object.freeze({ ...draft, status: value === 'inactive' ? 'inactive' : 'active' });
  return Object.freeze({ ...draft, [field]: value });
}

export function validateCompanyDraft(draft: CompanyDraft): Readonly<{ value: ValidatedCompanyDraft | null; errors: CompanyDraftErrors }> {
  const errors: Partial<Record<CompanyDraftField | 'form', string>> = {};
  const legalName = draft.legalName.trim();
  if (!legalName) errors.legalName = 'الاسم القانوني مطلوب.';
  else if (legalName.length > 240) errors.legalName = 'الاسم القانوني أطول من الحد الآمن (240 حرفًا).';

  const limits: readonly [CompanyDraftField, number, string][] = [
    ['displayName', 160, 'الاسم المختصر'],
    ['address', 500, 'العنوان'],
    ['activities', 1200, 'الأنشطة'],
    ['registrationNumber', 120, 'رقم التسجيل'],
    ['legalStatus', 160, 'الوضع القانوني'],
  ];
  for (const [field, limit, label] of limits) if (String(draft[field]).trim().length > limit) errors[field] = `${label} أطول من الحد الآمن (${limit}).`;

  let capital: number | null = null;
  const capitalText = normalizeDigits(draft.capitalInput.trim());
  if (capitalText) {
    capital = Number(capitalText);
    if (!Number.isFinite(capital) || capital < 0 || !Number.isSafeInteger(Math.round(capital * 100))) errors.capitalInput = 'رأس المال غير صالح أو خارج مجال الدقة الآمن.';
  }

  if (Object.keys(errors).length) return Object.freeze({ value: null, errors: Object.freeze(errors) });
  return Object.freeze({
    value: Object.freeze({
      legalName,
      displayName: nullableText(draft.displayName),
      capital,
      address: nullableText(draft.address),
      activities: nullableText(draft.activities),
      registrationNumber: nullableText(draft.registrationNumber),
      legalStatus: nullableText(draft.legalStatus),
      status: draft.status,
    }),
    errors: Object.freeze({}),
  });
}
