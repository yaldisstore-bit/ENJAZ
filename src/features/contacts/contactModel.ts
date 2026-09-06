import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type ContactListFilter = 'all' | 'active' | 'inactive' | 'lawyers';
export type ContactListSort = 'activity-desc' | 'name-asc' | 'created-desc' | 'type-asc';
export const CONTACT_LIST_PAGE_SIZE = 20;
export const CONTACT_LIST_MAX_PAGE_SIZE = 50;
export const CONTACT_SEARCH_MAX_LENGTH = 160;

export interface ContactListRequest { readonly filter: ContactListFilter; readonly search: string; readonly sort: ContactListSort; readonly page: number; readonly pageSize: number; }
export interface ContactListSource { readonly contacts: readonly RowOf<'contacts'>[]; }
export interface ContactListItem { readonly id: string; readonly displayName: string; readonly contactType: string; readonly phone: string | null; readonly email: string | null; readonly status: string; readonly active: boolean; readonly merged: boolean; readonly lawyerLike: boolean; }
export interface ContactListSnapshot { readonly items: readonly ContactListItem[]; readonly counts: Readonly<{ all: number; active: number; inactive: number; lawyers: number }>; readonly filteredTotal: number; readonly page: number; readonly pageSize: number; readonly pageCount: number; readonly hasPrevious: boolean; readonly hasMore: boolean; readonly filter: ContactListFilter; readonly search: string; readonly sort: ContactListSort; }
export interface ContactDraft { readonly displayName: string; readonly contactType: string; readonly phone: string; readonly email: string; readonly notes: string; readonly status: 'active' | 'inactive'; }
export type ContactDraftField = keyof ContactDraft;
export type ContactDraftErrors = Readonly<Partial<Record<ContactDraftField | 'form', string>>>;
export interface ValidatedContactDraft { readonly displayName: string; readonly contactType: string; readonly phone: string | null; readonly email: string | null; readonly notes: string | null; readonly status: 'active' | 'inactive'; }

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const LAWYER = ['lawyer', 'attorney', 'محامي', 'محام', 'محامية'];
function norm(value: string) { return value.normalize('NFKC').replace(DIACRITICS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLocaleLowerCase('ar-IQ').replace(/\s+/g, ' ').trim(); }
export function normalizeContactSearch(value: string) { return norm(value).slice(0, CONTACT_SEARCH_MAX_LENGTH); }
export function isLawyerContactType(value: string) { const v = norm(value); return LAWYER.some((token) => v.includes(norm(token))); }
const active = (row: RowOf<'contacts'>) => row.deleted_at === null && row.merged_into_id === null && row.status.trim().toLowerCase() === 'active';
const stamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

export function normalizeContactListRequest(input: Partial<ContactListRequest> = {}): ContactListRequest {
  const page = Number.isSafeInteger(input.page) && (input.page ?? 0) >= 0 ? input.page! : 0;
  const size = Number.isSafeInteger(input.pageSize) ? Number(input.pageSize) : CONTACT_LIST_PAGE_SIZE;
  return { filter: input.filter === 'active' || input.filter === 'inactive' || input.filter === 'lawyers' ? input.filter : 'all', search: normalizeContactSearch(input.search ?? ''), sort: input.sort === 'name-asc' || input.sort === 'created-desc' || input.sort === 'type-asc' ? input.sort : 'activity-desc', page, pageSize: Math.min(CONTACT_LIST_MAX_PAGE_SIZE, Math.max(1, size)) };
}

export function buildContactListSnapshot(source: ContactListSource, input: Partial<ContactListRequest> = {}): ContactListSnapshot {
  const request = normalizeContactListRequest(input);
  const eligible = source.contacts.filter((row) => row.deleted_at === null);
  const activeCount = eligible.filter(active).length, lawyerCount = eligible.filter((row) => isLawyerContactType(row.contact_type)).length;
  const filtered = eligible.filter((row) => request.filter === 'all' || request.filter === 'active' && active(row) || request.filter === 'inactive' && !active(row) || request.filter === 'lawyers' && isLawyerContactType(row.contact_type)).filter((row) => {
    if (!request.search) return true;
    const text = norm([row.id, row.legacy_id ?? '', row.display_name, row.contact_type, row.phone ?? '', row.email ?? '', row.notes ?? '', row.status].join(' '));
    return request.search.split(' ').every((token) => text.includes(token));
  }).sort((a, b) => request.sort === 'name-asc' ? a.display_name.localeCompare(b.display_name, 'ar') || a.id.localeCompare(b.id) : request.sort === 'created-desc' ? stamp(b.created_at) - stamp(a.created_at) || a.id.localeCompare(b.id) : request.sort === 'type-asc' ? a.contact_type.localeCompare(b.contact_type, 'ar') || a.display_name.localeCompare(b.display_name, 'ar') : stamp(b.updated_at) - stamp(a.updated_at) || a.id.localeCompare(b.id));
  const pageCount = Math.max(1, Math.ceil(filtered.length / request.pageSize)), page = Math.min(request.page, pageCount - 1);
  const items = filtered.slice(page * request.pageSize, (page + 1) * request.pageSize).map((row): ContactListItem => ({ id: row.id, displayName: row.display_name.trim() || 'جهة بلا اسم', contactType: row.contact_type, phone: row.phone, email: row.email, status: row.status, active: active(row), merged: row.merged_into_id !== null, lawyerLike: isLawyerContactType(row.contact_type) }));
  return { items, counts: { all: eligible.length, active: activeCount, inactive: eligible.length - activeCount, lawyers: lawyerCount }, filteredTotal: filtered.length, page, pageSize: request.pageSize, pageCount, hasPrevious: page > 0, hasMore: page + 1 < pageCount, filter: request.filter, search: request.search, sort: request.sort };
}

const text = (value: string) => value.trim() || null;
export function createContactDraft(row?: RowOf<'contacts'> | null): ContactDraft { return { displayName: row?.display_name ?? '', contactType: row?.contact_type ?? 'contact', phone: row?.phone ?? '', email: row?.email ?? '', notes: row?.notes ?? '', status: row?.status.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active' }; }
export function updateContactDraft(draft: ContactDraft, field: ContactDraftField, value: string): ContactDraft { return { ...draft, [field]: field === 'status' ? value === 'inactive' ? 'inactive' : 'active' : value } as ContactDraft; }
export function validateContactDraft(draft: ContactDraft): Readonly<{ value: ValidatedContactDraft | null; errors: ContactDraftErrors }> {
  const errors: Partial<Record<ContactDraftField | 'form', string>> = {};
  const displayName = draft.displayName.trim(), contactType = draft.contactType.trim(), email = draft.email.trim();
  if (!displayName) errors.displayName = 'الاسم مطلوب.'; else if (displayName.length > 200) errors.displayName = 'الاسم طويل جدًا.';
  if (!contactType) errors.contactType = 'الصفة مطلوبة.'; else if (contactType.length > 100) errors.contactType = 'الصفة طويلة جدًا.';
  if (draft.phone.trim().length > 80) errors.phone = 'الهاتف طويل جدًا.';
  if (email.length > 254 || email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'البريد غير صالح.';
  if (draft.notes.trim().length > 2000) errors.notes = 'الملاحظات طويلة جدًا.';
  return Object.keys(errors).length ? { value: null, errors } : { value: { displayName, contactType, phone: text(draft.phone), email: text(draft.email), notes: text(draft.notes), status: draft.status }, errors };
}
