import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { ContactDraft, ContactListSource, ValidatedContactDraft } from './contactModel.ts';
import { validateContactDraft } from './contactModel.ts';

const BATCH = 100;
export const CONTACT_SOURCE_LIMIT = 5_000;
const PROFILE_LIMIT = 100;

export type ContactErrorCode = 'workspace' | 'capacity' | 'missing' | 'conflict' | 'merged' | 'relation';
export class ContactDomainError extends Error {
  readonly code: ContactErrorCode;
  constructor(code: ContactErrorCode, message: string) { super(message); this.code = code; this.name = 'ContactDomainError'; }
}
export class ContactCreateReplayConflictError extends ContactDomainError {
  constructor() { super('conflict', 'معرف الإنشاء مستخدم لبيانات مختلفة.'); }
}
export class ContactEditConflictError extends ContactDomainError {
  constructor() { super('conflict', 'تم تعديل السجل؛ أعد تحميله.'); }
}
export class TransactionContactConflictError extends ContactDomainError {
  constructor(message = 'تعارض ربط جهة الاتصال مع المعاملة.') { super('conflict', message); }
}

async function layerFor(factory: EnjazDataLayerFactory, userId: string) {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new ContactDomainError('workspace', 'مساحة العمل غير متاحة.');
  return { workspaceId, layer: factory.forWorkspace(workspaceId) };
}

async function collectContacts(layer: EnjazWorkspaceDataLayer) {
  const rows: RowOf<'contacts'>[] = [];
  for (let offset = 0;;) {
    const page = await layer.contacts.list({ filters: [{ column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'updated_at', ascending: false }], offset, limit: BATCH });
    rows.push(...page.items);
    if (rows.length > CONTACT_SOURCE_LIMIT) throw new ContactDomainError('capacity', `Contact source exceeds ${CONTACT_SOURCE_LIMIT}`);
    if (!page.hasMore) return rows;
    if (!page.items.length) throw new ContactDomainError('capacity', 'Contact source did not progress');
    offset += page.items.length;
  }
}

export async function loadContactListSource(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; source: ContactListSource }>> {
  const { workspaceId, layer } = await layerFor(factory, userId);
  return { workspaceId, source: { contacts: await collectContacts(layer) } };
}

export function isCurrentCompanyRelation(row: RowOf<'company_contacts'>, now = Date.now()) {
  const from = row.valid_from ? Date.parse(row.valid_from) : -Infinity;
  const to = row.valid_to ? Date.parse(row.valid_to) : Infinity;
  return (!Number.isFinite(from) || from <= now) && (!Number.isFinite(to) || to > now);
}

export interface ContactProfileSource {
  readonly contact: RowOf<'contacts'>;
  readonly companyRelations: readonly Readonly<{ relation: RowOf<'company_contacts'>; company: RowOf<'companies'> | null; current: boolean }>[];
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly payments: readonly RowOf<'payments'>[];
  readonly truncated: Readonly<{ companyRelations: boolean; transactions: boolean; payments: boolean }>;
}

export async function loadContactProfileSource(factory: EnjazDataLayerFactory, userId: string, contactId: string): Promise<Readonly<{ workspaceId: string; source: ContactProfileSource }>> {
  const { workspaceId, layer } = await layerFor(factory, userId);
  const contact = await layer.contacts.getById(contactId);
  if (!contact || contact.deleted_at !== null) throw new ContactDomainError('missing', 'جهة الاتصال غير موجودة.');
  const [relations, transactions] = await Promise.all([
    layer.companyContacts.list({ filters: [{ column: 'contact_id', operator: 'eq', value: contactId }], orderBy: [{ column: 'created_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
    layer.transactions.list({ filters: [{ column: 'primary_contact_id', operator: 'eq', value: contactId }, { column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'last_activity_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
  ]);
  const companyIds = [...new Set(relations.items.map((row) => row.company_id))];
  const companyPage = companyIds.length ? await layer.companies.list({ filters: [{ column: 'id', operator: 'in', value: companyIds }, { column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'legal_name', ascending: true }], offset: 0, limit: PROFILE_LIMIT }) : { items: [] as RowOf<'companies'>[], hasMore: false };
  const companies = new Map(companyPage.items.map((row) => [row.id, row]));
  const txIds = transactions.items.map((row) => row.id);
  const payments = txIds.length ? await layer.payments.list({ filters: [{ column: 'transaction_id', operator: 'in', value: txIds }], orderBy: [{ column: 'paid_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }) : { items: [] as RowOf<'payments'>[], hasMore: false };
  return { workspaceId, source: { contact, companyRelations: relations.items.map((relation) => ({ relation, company: companies.get(relation.company_id) ?? null, current: isCurrentCompanyRelation(relation) })), transactions: transactions.items, payments: payments.items, truncated: { companyRelations: relations.hasMore || companyPage.hasMore, transactions: transactions.hasMore, payments: payments.hasMore } } };
}

function sameContact(row: RowOf<'contacts'>, value: ValidatedContactDraft) {
  return row.deleted_at === null && row.merged_into_id === null && row.display_name === value.displayName && row.contact_type === value.contactType && row.phone === value.phone && row.email === value.email && row.notes === value.notes && row.status === value.status;
}

export async function saveContact(factory: EnjazDataLayerFactory, userId: string, mode: 'create' | 'edit', draft: ContactDraft, options: Readonly<{ contactId?: string | null; expectedUpdatedAt?: string | null; createOperationId?: string | null }> = {}) {
  const validation = validateContactDraft(draft);
  if (!validation.value) throw new ContactDomainError('conflict', 'بيانات جهة الاتصال غير صالحة.');
  const value = validation.value, { layer } = await layerFor(factory, userId);
  if (mode === 'create') {
    const id = options.createOperationId?.trim();
    if (!id) throw new ContactDomainError('conflict', 'معرف عملية الإنشاء مطلوب.');
    const existing = await layer.contacts.getById(id);
    if (existing) { if (sameContact(existing, value)) return existing; throw new ContactCreateReplayConflictError(); }
    return layer.contacts.create({ id, display_name: value.displayName, contact_type: value.contactType, phone: value.phone, email: value.email, notes: value.notes, status: value.status, merged_into_id: null, legacy_id: null, legacy_source: null, deleted_at: null });
  }
  const id = options.contactId?.trim();
  if (!id) throw new ContactDomainError('missing', 'جهة الاتصال غير موجودة.');
  const current = await layer.contacts.getById(id);
  if (!current || current.deleted_at !== null) throw new ContactDomainError('missing', 'جهة الاتصال غير موجودة.');
  if (current.merged_into_id !== null) throw new ContactDomainError('merged', 'السجل المدمج للقراءة فقط.');
  if (options.expectedUpdatedAt && current.updated_at !== options.expectedUpdatedAt) throw new ContactEditConflictError();
  return layer.contacts.update(id, { display_name: value.displayName, contact_type: value.contactType, phone: value.phone, email: value.email, notes: value.notes, status: value.status });
}

export async function addCompanyContactRelationship(factory: EnjazDataLayerFactory, userId: string, input: Readonly<{ relationOperationId: string; companyId: string; contactId: string; relationType: string; validFrom?: string | null }>) {
  const { layer } = await layerFor(factory, userId);
  const id = input.relationOperationId.trim(), relationType = input.relationType.trim();
  if (!id || !relationType) throw new ContactDomainError('relation', 'بيانات العلاقة ناقصة.');
  const [company, contact, replay, relations] = await Promise.all([
    layer.companies.getById(input.companyId), layer.contacts.getById(input.contactId), layer.companyContacts.getById(id),
    layer.companyContacts.list({ filters: [{ column: 'company_id', operator: 'eq', value: input.companyId }, { column: 'contact_id', operator: 'eq', value: input.contactId }], orderBy: [{ column: 'created_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
  ]);
  if (!company || company.deleted_at !== null || company.merged_into_id !== null) throw new ContactDomainError('relation', 'الشركة غير متاحة للعلاقة.');
  if (!contact || contact.deleted_at !== null || contact.merged_into_id !== null || contact.status.trim().toLowerCase() !== 'active') throw new ContactDomainError('relation', 'جهة الاتصال غير نشطة.');
  const validFrom = input.validFrom ?? null;
  if (replay) { if (replay.company_id === input.companyId && replay.contact_id === input.contactId && replay.relation_type === relationType && replay.valid_from === validFrom && replay.valid_to === null) return replay; throw new ContactDomainError('relation', 'معرف العلاقة مستخدم لبيانات مختلفة.'); }
  const duplicate = relations.items.find((row) => row.relation_type === relationType && isCurrentCompanyRelation(row));
  if (duplicate) return duplicate;
  return layer.companyContacts.create({ id, company_id: input.companyId, contact_id: input.contactId, relation_type: relationType, valid_from: validFrom, valid_to: null });
}

export async function endCompanyContactRelationship(factory: EnjazDataLayerFactory, userId: string, relationId: string, endedAt: string) {
  const { layer } = await layerFor(factory, userId);
  const current = await layer.companyContacts.getById(relationId);
  if (!current) throw new ContactDomainError('relation', 'العلاقة غير موجودة.');
  if (current.valid_to !== null) return current;
  const time = Date.parse(endedAt), start = current.valid_from ? Date.parse(current.valid_from) : -Infinity;
  if (!Number.isFinite(time) || Number.isFinite(start) && time < start) throw new ContactDomainError('relation', 'تاريخ إنهاء العلاقة غير صالح.');
  return layer.companyContacts.update(relationId, { valid_to: new Date(time).toISOString() });
}

export async function assignTransactionPrimaryContact(factory: EnjazDataLayerFactory, userId: string, input: Readonly<{ transactionId: string; contactId: string; expectedUpdatedAt?: string | null }>) {
  const { layer } = await layerFor(factory, userId);
  const [transaction, contact] = await Promise.all([layer.transactions.getById(input.transactionId), layer.contacts.getById(input.contactId)]);
  if (!transaction || transaction.deleted_at !== null) throw new TransactionContactConflictError('المعاملة غير متاحة.');
  if (!contact || contact.deleted_at !== null || contact.merged_into_id !== null || contact.status.trim().toLowerCase() !== 'active') throw new TransactionContactConflictError('جهة الاتصال غير نشطة.');
  if (input.expectedUpdatedAt && transaction.updated_at !== input.expectedUpdatedAt) throw new TransactionContactConflictError('تم تعديل المعاملة؛ أعد تحميلها.');
  const relations = await layer.companyContacts.list({ filters: [{ column: 'company_id', operator: 'eq', value: transaction.company_id }, { column: 'contact_id', operator: 'eq', value: input.contactId }], orderBy: [{ column: 'created_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT });
  if (!relations.items.some((row) => isCurrentCompanyRelation(row))) throw new TransactionContactConflictError('يجب أن تكون جهة الاتصال مرتبطة حاليًا بشركة المعاملة.');
  return layer.transactions.update(transaction.id, { primary_contact_id: input.contactId });
}
