import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type ContactListFilter = 'all' | 'active' | 'inactive' | 'lawyers';
export type ContactListSort = 'activity-desc' | 'name-asc' | 'created-desc' | 'type-asc';

export const CONTACT_LIST_PAGE_SIZE = 20;
export const CONTACT_LIST_MAX_PAGE_SIZE = 50;
export const CONTACT_SEARCH_MAX_LENGTH = 160;

export interface ContactListRequest {
  readonly filter: ContactListFilter;
  readonly search: string;
  readonly sort: ContactListSort;
  readonly page: number;
  readonly pageSize: number;
}

export interface ContactListSource {
  readonly contacts: readonly RowOf<'contacts'>[];
}

export interface ContactListItem {
  readonly id: string;
  readonly displayName: string;
  readonly contactType: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly status: string;
  readonly active: boolean;
  readonly merged: boolean;
  readonly lawyerLike: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ContactListSnapshot {
  readonly items: readonly ContactListItem[];
  readonly counts: Readonly<{ all: number; active: number; inactive: number; lawyers: number }>;
  readonly filteredTotal: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly hasPrevious: boolean;
  readonly hasMore: boolean;
  readonly filter: ContactListFilter;
  readonly search: string;
  readonly sort: ContactListSort;
}

export interface ContactDraft {
  readonly displayName: string;
  readonly contactType: string;
  readonly phone: string;
  readonly email: string;
  readonly notes: string;
  readonly status: 'active' | 'inactive';
}

export type ContactDraftField = keyof ContactDraft;
export type ContactDraftErrors = Readonly<Partial<Record<ContactDraftField | 'form', string>>>;

export interface ValidatedContactDraft {
  readonly displayName: string;
  readonly contactType: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly status: 'active' | 'inactive';
}

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const LAWYER_TOKENS = ['lawyer', 'attorney', 'محامي', 'محام', 'محامية'];

function normalizeArabic(value: string): string {
  return value.normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLocaleLowerCase('ar-IQ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeContactSearch(value: string): string {
  return normalizeArabic(value).slice(0, CONTACT_SEARCH_MAX_LENGTH);
}

export function isLawyerContactType(value: string): boolean {
  const normalized = normalizeArabic(value);
  return LAWYER_TOKENS.some((token) => normalized.includes(normalizeArabic(token)));
}

function isActiveContact(row: RowOf<'contacts'>): boolean {
  return row.deleted_at === null && row.merged_into_id === null && row.status.trim().toLowerCase() === 'active';
}

function isEligibleContact(row: RowOf<'contacts'>): boolean {
  return row.deleted_at === null;
}

function safeTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFilter(value: unknown): ContactListFilter {
  return value === 'active' || value === 'inactive' || value === 'lawyers' ? value : 'all';
}

function normalizeSort(value: unknown): ContactListSort {
  return value === 'name-asc' || value === 'created-desc' || value === 'type-asc' ? value : 'activity-desc';
}

export function normalizeContactListRequest(input: Partial<ContactListRequest> = {}): ContactListRequest {
  const page = Number.isSafeInteger(input.page) && (input.page ?? 0) >= 0 ? input.page! : 0;
  const rawPageSize = Number.isSafeInteger(input.pageSize) ? Number(input.pageSize) : CONTACT_LIST_PAGE_SIZE;
  return Object.freeze({
    filter: normalizeFilter(input.filter),
    search: normalizeContactSearch(input.search ?? ''),
    sort: normalizeSort(input.sort),
    page,
    pageSize: Math.min(CONTACT_LIST_MAX_PAGE_SIZE, Math.max(1, rawPageSize)),
  });
}

function matchesSearch(row: RowOf<'contacts'>, search: string): boolean {
  if (!search) return true;
  const haystack = normalizeArabic([
    row.id,
    row.legacy_id ?? '',
    row.display_name,
    row.contact_type,
    row.phone ?? '',
    row.email ?? '',
    row.notes ?? '',
    row.status,
  ].join(' '));
  return search.split(' ').every((token) => token.length > 0 && haystack.includes(token));
}

function compareContacts(a: RowOf<'contacts'>, b: RowOf<'contacts'>, sort: ContactListSort): number {
  if (sort === 'name-asc') return a.display_name.localeCompare(b.display_name, 'ar') || a.id.localeCompare(b.id);
  if (sort === 'created-desc') return safeTimestamp(b.created_at) - safeTimestamp(a.created_at) || a.id.localeCompare(b.id);
  if (sort === 'type-asc') return a.contact_type.localeCompare(b.contact_type, 'ar') || a.display_name.localeCompare(b.display_name, 'ar');
  return safeTimestamp(b.updated_at) - safeTimestamp(a.updated_at) || a.id.localeCompare(b.id);
}

export function buildContactListSnapshot(source: ContactListSource, input: Partial<ContactListRequest> = {}): ContactListSnapshot {
  const request = normalizeContactListRequest(input);
  const eligible = source.contacts.filter(isEligibleContact);
  const active = eligible.filter(isActiveContact).length;
  const lawyers = eligible.filter((row) => isLawyerContactType(row.contact_type)).length;
  const counts = Object.freeze({ all: eligible.length, active, inactive: eligible.length - active, lawyers });
  const filtered = eligible
    .filter((row) => request.filter === 'all'
      || (request.filter === 'active' && isActiveContact(row))
      || (request.filter === 'inactive' && !isActiveContact(row))
      || (request.filter === 'lawyers' && isLawyerContactType(row.contact_type)))
    .filter((row) => matchesSearch(row, request.search))
    .sort((a, b) => compareContacts(a, b, request.sort));
  const pageCount = filtered.length === 0 ? 1 : Math.ceil(filtered.length / request.pageSize);
  const page = Math.min(request.page, pageCount - 1);
  const offset = page * request.pageSize;
  const items = filtered.slice(offset, offset + request.pageSize).map((row): ContactListItem => Object.freeze({
    id: row.id,
    displayName: row.display_name.trim() || 'جهة اتصال بلا اسم صالح',
    contactType: row.contact_type,
    phone: row.phone,
    email: row.email,
    status: row.status,
    active: isActiveContact(row),
    merged: row.merged_into_id !== null,
    lawyerLike: isLawyerContactType(row.contact_type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return Object.freeze({ items: Object.freeze(items), counts, filteredTotal: filtered.length, page, pageSize: request.pageSize, pageCount, hasPrevious: page > 0, hasMore: page + 1 < pageCount, filter: request.filter, search: request.search, sort: request.sort });
}

function nullableText(value: string): string | null {
  const text = value.trim();
  return text.length ? text : null;
}

export function createContactDraft(row?: RowOf<'contacts'> | null): ContactDraft {
  return Object.freeze({
    displayName: row?.display_name ?? '',
    contactType: row?.contact_type ?? 'contact',
    phone: row?.phone ?? '',
    email: row?.email ?? '',
    notes: row?.notes ?? '',
    status: row?.status.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
  });
}

export function updateContactDraft(draft: ContactDraft, field: ContactDraftField, value: string): ContactDraft {
  if (field === 'status') return Object.freeze({ ...draft, status: value === 'inactive' ? 'inactive' : 'active' });
  return Object.freeze({ ...draft, [field]: value });
}

export function validateContactDraft(draft: ContactDraft): Readonly<{ value: ValidatedContactDraft | null; errors: ContactDraftErrors }> {
  const errors: Partial<Record<ContactDraftField | 'form', string>> = {};
  const displayName = draft.displayName.trim();
  const contactType = draft.contactType.trim();
  if (!displayName) errors.displayName = 'اسم جهة الاتصال مطلوب.';
  else if (displayName.length > 200) errors.displayName = 'الاسم أطول من الحد الآمن (200 حرف).';
  if (!contactType) errors.contactType = 'نوع جهة الاتصال مطلوب.';
  else if (contactType.length > 100) errors.contactType = 'نوع جهة الاتصال أطول من الحد الآمن.';
  if (draft.phone.trim().length > 80) errors.phone = 'رقم الهاتف أطول من الحد الآمن.';
  const email = draft.email.trim();
  if (email.length > 254) errors.email = 'البريد الإلكتروني أطول من الحد الآمن.';
  else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'صيغة البريد الإلكتروني غير صالحة.';
  if (draft.notes.trim().length > 2000) errors.notes = 'الملاحظات أطول من الحد الآمن (2000 حرف).';
  if (Object.keys(errors).length) return Object.freeze({ value: null, errors: Object.freeze(errors) });
  return Object.freeze({ value: Object.freeze({ displayName, contactType, phone: nullableText(draft.phone), email: nullableText(draft.email), notes: nullableText(draft.notes), status: draft.status }), errors: Object.freeze({}) });
}
