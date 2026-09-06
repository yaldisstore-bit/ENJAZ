import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { ContactDraft, ContactListSource, ValidatedContactDraft } from './contactModel.ts';
import { validateContactDraft } from './contactModel.ts';

const CONTACT_BATCH_SIZE = 100;
export const CONTACT_SOURCE_LIMIT = 5_000;
const PROFILE_LIMIT = 100;
const FINANCE_LIMIT = 100;

export interface ContactCompanyContext {
  readonly relation: RowOf<'company_contacts'>;
  readonly company: RowOf<'companies'> | null;
  readonly current: boolean;
}

export interface ContactProfileSource {
  readonly contact: RowOf<'contacts'>;
  readonly companyRelations: readonly ContactCompanyContext[];
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly payments: readonly RowOf<'payments'>[];
  readonly ledger: readonly RowOf<'financial_ledger_entries'>[];
  readonly activity: readonly RowOf<'entity_lifecycle_events'>[];
  readonly truncated: Readonly<{
    companyRelations: boolean;
    transactions: boolean;
    payments: boolean;
    ledger: boolean;
    activity: boolean;
  }>;
}

export class ContactWorkspaceUnavailableError extends Error {
  constructor() { super('No ENJAZ workspace is available for the authenticated user'); this.name = 'ContactWorkspaceUnavailableError'; }
}
export class ContactListCapacityError extends Error {
  constructor() { super(`Contact list exceeds the Phase 6.2 safe source limit of ${CONTACT_SOURCE_LIMIT} rows`); this.name = 'ContactListCapacityError'; }
}
export class ContactNotFoundError extends Error {
  constructor() { super('Contact was not found in the current workspace'); this.name = 'ContactNotFoundError'; }
}
export class ContactEditConflictError extends Error {
  constructor() { super('Contact changed after the editor was loaded'); this.name = 'ContactEditConflictError'; }
}
export class ContactMergedRecordError extends Error {
  constructor() { super('Merged contact records cannot be edited in Phase 6.2'); this.name = 'ContactMergedRecordError'; }
}
export class ContactCreateReplayConflictError extends Error {
  constructor() { super('The stable contact create operation id already belongs to different data'); this.name = 'ContactCreateReplayConflictError'; }
}
export class ContactRelationshipConflictError extends Error {
  constructor(message = 'The requested contact relationship conflicts with current workspace data') { super(message); this.name = 'ContactRelationshipConflictError'; }
}
export class ContactRelationshipNotFoundError extends Error {
  constructor() { super('Contact relationship was not found in the current workspace'); this.name = 'ContactRelationshipNotFoundError'; }
}
export class TransactionContactConflictError extends Error {
  constructor(message = 'Transaction changed before the contact relationship could be saved') { super(message); this.name = 'TransactionContactConflictError'; }
}

async function resolveLayer(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; layer: EnjazWorkspaceDataLayer }>> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new ContactWorkspaceUnavailableError();
  return Object.freeze({ workspaceId, layer: factory.forWorkspace(workspaceId) });
}

async function collectContacts(layer: EnjazWorkspaceDataLayer): Promise<readonly RowOf<'contacts'>[]> {
  const rows: RowOf<'contacts'>[] = [];
  let offset = 0;
  for (;;) {
    const page = await layer.contacts.list({ filters: [{ column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'updated_at', ascending: false }], offset, limit: CONTACT_BATCH_SIZE });
    rows.push(...page.items);
    if (rows.length > CONTACT_SOURCE_LIMIT) throw new ContactListCapacityError();
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error('Non-progressing contact source page');
    offset += page.items.length;
  }
}

export async function loadContactListSource(factory: EnjazDataLayerFactory, userId: string): Promise<Readonly<{ workspaceId: string; source: ContactListSource }>> {
  const { workspaceId, layer } = await resolveLayer(factory, userId);
  return Object.freeze({ workspaceId, source: Object.freeze({ contacts: await collectContacts(layer) }) });
}

export function isCurrentCompanyRelation(row: RowOf<'company_contacts'>, now = Date.now()): boolean {
  const from = row.valid_from ? Date.parse(row.valid_from) : Number.NEGATIVE_INFINITY;
  const to = row.valid_to ? Date.parse(row.valid_to) : Number.POSITIVE_INFINITY;
  return (Number.isFinite(from) ? from : Number.NEGATIVE_INFINITY) <= now && (Number.isFinite(to) ? to : Number.POSITIVE_INFINITY) > now;
}

async function loadCompaniesForRelations(layer: EnjazWorkspaceDataLayer, relations: readonly RowOf<'company_contacts'>[]): Promise<readonly ContactCompanyContext[]> {
  const ids = [...new Set(relations.map((row) => row.company_id))];
  const companies = new Map<string, RowOf<'companies'>>();
  for (let index = 0; index < ids.length; index += CONTACT_BATCH_SIZE) {
    const page = await layer.companies.list({ filters: [{ column: 'id', operator: 'in', value: ids.slice(index, index + CONTACT_BATCH_SIZE) }, { column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'legal_name', ascending: true }], offset: 0, limit: CONTACT_BATCH_SIZE });
    for (const company of page.items) companies.set(company.id, company);
  }
  return Object.freeze(relations.map((relation) => Object.freeze({ relation, company: companies.get(relation.company_id) ?? null, current: isCurrentCompanyRelation(relation) })));
}

async function loadFinanceByTransactions(layer: EnjazWorkspaceDataLayer, transactionIds: readonly string[]): Promise<Readonly<{ payments: readonly RowOf<'payments'>[]; ledger: readonly RowOf<'financial_ledger_entries'>[]; paymentsTruncated: boolean; ledgerTruncated: boolean }>> {
  if (!transactionIds.length) return Object.freeze({ payments: Object.freeze([]), ledger: Object.freeze([]), paymentsTruncated: false, ledgerTruncated: false });
  const ids = transactionIds.slice(0, PROFILE_LIMIT);
  const [paymentsPage, ledgerPage] = await Promise.all([
    layer.payments.list({ filters: [{ column: 'transaction_id', operator: 'in', value: ids }], orderBy: [{ column: 'paid_at', ascending: false }], offset: 0, limit: FINANCE_LIMIT }),
    layer.ledger.list({ filters: [{ column: 'transaction_id', operator: 'in', value: ids }], orderBy: [{ column: 'occurred_at', ascending: false }], offset: 0, limit: FINANCE_LIMIT }),
  ]);
  return Object.freeze({ payments: Object.freeze([...paymentsPage.items]), ledger: Object.freeze([...ledgerPage.items]), paymentsTruncated: paymentsPage.hasMore, ledgerTruncated: ledgerPage.hasMore });
}

export async function loadContactProfileSource(factory: EnjazDataLayerFactory, userId: string, contactId: string): Promise<Readonly<{ workspaceId: string; source: ContactProfileSource }>> {
  const { workspaceId, layer } = await resolveLayer(factory, userId);
  const contact = await layer.contacts.getById(contactId);
  if (!contact || contact.deleted_at !== null) throw new ContactNotFoundError();

  const [relationsPage, transactionsPage, activityPage] = await Promise.all([
    layer.companyContacts.list({ filters: [{ column: 'contact_id', operator: 'eq', value: contactId }], orderBy: [{ column: 'created_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
    layer.transactions.list({ filters: [{ column: 'primary_contact_id', operator: 'eq', value: contactId }, { column: 'deleted_at', operator: 'is', value: null }], orderBy: [{ column: 'last_activity_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
    layer.lifecycleEvents.list({ filters: [{ column: 'entity_type', operator: 'eq', value: 'contact' }, { column: 'entity_id', operator: 'eq', value: contactId }], orderBy: [{ column: 'effective_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT }),
  ]);
  const [companyRelations, finance] = await Promise.all([
    loadCompaniesForRelations(layer, relationsPage.items),
    loadFinanceByTransactions(layer, transactionsPage.items.map((row) => row.id)),
  ]);

  return Object.freeze({ workspaceId, source: Object.freeze({
    contact,
    companyRelations,
    transactions: Object.freeze([...transactionsPage.items]),
    payments: finance.payments,
    ledger: finance.ledger,
    activity: Object.freeze([...activityPage.items]),
    truncated: Object.freeze({ companyRelations: relationsPage.hasMore, transactions: transactionsPage.hasMore, payments: finance.paymentsTruncated, ledger: finance.ledgerTruncated, activity: activityPage.hasMore }),
  }) });
}

function sameCreatePayload(existing: RowOf<'contacts'>, value: ValidatedContactDraft): boolean {
  return existing.deleted_at === null && existing.merged_into_id === null
    && existing.display_name === value.displayName
    && existing.contact_type === value.contactType
    && existing.phone === value.phone
    && existing.email === value.email
    && existing.notes === value.notes
    && existing.status === value.status;
}

export async function saveContact(factory: EnjazDataLayerFactory, userId: string, mode: 'create' | 'edit', draft: ContactDraft, options: Readonly<{ contactId?: string | null; expectedUpdatedAt?: string | null; createOperationId?: string | null }> = {}): Promise<RowOf<'contacts'>> {
  const validation = validateContactDraft(draft);
  if (!validation.value) throw new Error('Contact draft failed model validation');
  const value = validation.value;
  const { layer } = await resolveLayer(factory, userId);

  if (mode === 'create') {
    const operationId = options.createOperationId?.trim();
    if (!operationId) throw new Error('Stable contact create operation id is required');
    const existing = await layer.contacts.getById(operationId);
    if (existing) {
      if (sameCreatePayload(existing, value)) return existing;
      throw new ContactCreateReplayConflictError();
    }
    return layer.contacts.create({ id: operationId, display_name: value.displayName, contact_type: value.contactType, phone: value.phone, email: value.email, notes: value.notes, status: value.status, merged_into_id: null, legacy_id: null, legacy_source: null, deleted_at: null });
  }

  const contactId = options.contactId?.trim();
  if (!contactId) throw new ContactNotFoundError();
  const current = await layer.contacts.getById(contactId);
  if (!current || current.deleted_at !== null) throw new ContactNotFoundError();
  if (current.merged_into_id !== null) throw new ContactMergedRecordError();
  if (options.expectedUpdatedAt && current.updated_at !== options.expectedUpdatedAt) throw new ContactEditConflictError();
  return layer.contacts.update(contactId, { display_name: value.displayName, contact_type: value.contactType, phone: value.phone, email: value.email, notes: value.notes, status: value.status });
}

export async function addCompanyContactRelationship(factory: EnjazDataLayerFactory, userId: string, input: Readonly<{ relationOperationId: string; companyId: string; contactId: string; relationType: string; validFrom?: string | null }>): Promise<RowOf<'company_contacts'>> {
  const { layer } = await resolveLayer(factory, userId);
  const relationId = input.relationOperationId.trim();
  const relationType = input.relationType.trim();
  if (!relationId || !relationType) throw new ContactRelationshipConflictError('Stable relation id and relation type are required');
  const [company, contact, existing] = await Promise.all([layer.companies.getById(input.companyId), layer.contacts.getById(input.contactId), layer.companyContacts.getById(relationId)]);
  if (!company || company.deleted_at !== null || company.merged_into_id !== null) throw new ContactRelationshipConflictError('Company is not available for a new relationship');
  if (!contact || contact.deleted_at !== null || contact.merged_into_id !== null || contact.status.trim().toLowerCase() !== 'active') throw new ContactRelationshipConflictError('Contact is not active and available for a new relationship');
  const validFrom = input.validFrom ?? null;
  if (existing) {
    if (existing.company_id === input.companyId && existing.contact_id === input.contactId && existing.relation_type === relationType && existing.valid_from === validFrom && existing.valid_to === null) return existing;
    throw new ContactRelationshipConflictError('Stable relation id already belongs to different relationship data');
  }
  return layer.companyContacts.create({ id: relationId, company_id: input.companyId, contact_id: input.contactId, relation_type: relationType, valid_from: validFrom, valid_to: null });
}

export async function endCompanyContactRelationship(factory: EnjazDataLayerFactory, userId: string, relationId: string, endedAt: string): Promise<RowOf<'company_contacts'>> {
  const { layer } = await resolveLayer(factory, userId);
  const current = await layer.companyContacts.getById(relationId);
  if (!current) throw new ContactRelationshipNotFoundError();
  if (current.valid_to !== null) return current;
  const timestamp = Date.parse(endedAt);
  if (!Number.isFinite(timestamp)) throw new ContactRelationshipConflictError('Relationship end timestamp is invalid');
  if (current.valid_from && Number.isFinite(Date.parse(current.valid_from)) && timestamp < Date.parse(current.valid_from)) throw new ContactRelationshipConflictError('Relationship cannot end before it starts');
  return layer.companyContacts.update(relationId, { valid_to: new Date(timestamp).toISOString() });
}

export async function assignTransactionPrimaryContact(factory: EnjazDataLayerFactory, userId: string, input: Readonly<{ transactionId: string; contactId: string; expectedUpdatedAt?: string | null }>): Promise<RowOf<'transactions'>> {
  const { layer } = await resolveLayer(factory, userId);
  const [transaction, contact] = await Promise.all([layer.transactions.getById(input.transactionId), layer.contacts.getById(input.contactId)]);
  if (!transaction || transaction.deleted_at !== null) throw new TransactionContactConflictError('Transaction is not available');
  if (!contact || contact.deleted_at !== null || contact.merged_into_id !== null || contact.status.trim().toLowerCase() !== 'active') throw new TransactionContactConflictError('Contact is not active');
  if (input.expectedUpdatedAt && transaction.updated_at !== input.expectedUpdatedAt) throw new TransactionContactConflictError();
  const relations = await layer.companyContacts.list({ filters: [{ column: 'company_id', operator: 'eq', value: transaction.company_id }, { column: 'contact_id', operator: 'eq', value: input.contactId }], orderBy: [{ column: 'created_at', ascending: false }], offset: 0, limit: PROFILE_LIMIT });
  if (!relations.items.some((row) => isCurrentCompanyRelation(row))) throw new TransactionContactConflictError('Contact must have a current relationship with the transaction company');
  return layer.transactions.update(transaction.id, { primary_contact_id: input.contactId });
}
