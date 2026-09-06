import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import { createContactDraft, updateContactDraft } from '../src/features/contacts/contactModel.ts';
import { ContactCreateReplayConflictError, ContactEditConflictError, ContactListCapacityError, ContactRelationshipConflictError, assignTransactionPrimaryContact, addCompanyContactRelationship, loadContactListSource, saveContact } from '../src/features/contacts/contactService.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const CONTACT_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const TRANSACTION_ID = '55555555-5555-4555-8555-555555555555';

function contact(patch: Partial<RowOf<'contacts'>> = {}): RowOf<'contacts'> {
  return { id: CONTACT_ID, workspace_id: WORKSPACE_ID, display_name: 'نور حسين', contact_type: 'محامية', phone: null, email: null, notes: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}
function company(patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return { id: COMPANY_ID, workspace_id: WORKSPACE_ID, legal_name: 'شركة الاختبار', display_name: null, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}
function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return { id: TRANSACTION_ID, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null, type: 'تأسيس', department: null, status: 'active', priority: 'normal', current_fee: 1000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', last_activity_at: '2026-09-06T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null, ...patch };
}
function relation(patch: Partial<RowOf<'company_contacts'>> = {}): RowOf<'company_contacts'> {
  return { id: '66666666-6666-4666-8666-666666666666', workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, contact_id: CONTACT_ID, relation_type: 'محامية', valid_from: null, valid_to: null, created_at: '2026-09-06T08:00:00.000Z', ...patch };
}
function factory(layer: EnjazWorkspaceDataLayer): EnjazDataLayerFactory {
  return { async resolveWorkspaceId() { return WORKSPACE_ID; }, forWorkspace(id: string) { assert.equal(id, WORKSPACE_ID); return layer; } };
}

test('contact source fails closed above the 5000-row safety ceiling', async () => {
  const rows = Array.from({ length: 5_001 }, (_, index) => contact({ id: `contact-${index}` }));
  const layer = { contacts: { async list(request: ListRequest<'contacts'> = {}) { const offset = request.offset ?? 0; const limit = request.limit ?? 100; const items = rows.slice(offset, offset + limit); return { items, offset, limit, total: rows.length, hasMore: offset + items.length < rows.length }; } } } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => loadContactListSource(factory(layer), USER_ID), ContactListCapacityError);
});

test('contact create retry is idempotent and payload drift is rejected', async () => {
  const operationId = '77777777-7777-4777-8777-777777777777';
  let existing: RowOf<'contacts'> | null = null;
  let createCount = 0;
  const layer = { contacts: { async getById() { return existing; }, async create(values: Omit<RowOf<'contacts'>, 'workspace_id' | 'created_at' | 'updated_at'>) { createCount += 1; existing = contact({ ...values, id: operationId }); return existing; } } } as unknown as EnjazWorkspaceDataLayer;
  let draft = createContactDraft();
  draft = updateContactDraft(draft, 'displayName', 'نور حسين');
  draft = updateContactDraft(draft, 'contactType', 'محامية');
  const first = await saveContact(factory(layer), USER_ID, 'create', draft, { createOperationId: operationId });
  const replay = await saveContact(factory(layer), USER_ID, 'create', draft, { createOperationId: operationId });
  assert.equal(first.id, operationId);
  assert.equal(replay.id, operationId);
  assert.equal(createCount, 1);
  await assert.rejects(() => saveContact(factory(layer), USER_ID, 'create', updateContactDraft(draft, 'displayName', 'اسم مختلف'), { createOperationId: operationId }), ContactCreateReplayConflictError);
});

test('contact edit rejects stale updated_at', async () => {
  const layer = { contacts: { async getById() { return contact({ updated_at: '2026-09-06T09:00:00.000Z' }); }, async update() { throw new Error('must not update'); } } } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => saveContact(factory(layer), USER_ID, 'edit', createContactDraft(contact()), { contactId: CONTACT_ID, expectedUpdatedAt: '2026-09-06T08:00:00.000Z' }), ContactEditConflictError);
});

test('company-contact relationship create is idempotent and refuses invalid company/contact states', async () => {
  let saved: RowOf<'company_contacts'> | null = null;
  const layer = {
    companies: { async getById() { return company(); } },
    contacts: { async getById() { return contact(); } },
    companyContacts: {
      async getById() { return saved; },
      async create(values: Omit<RowOf<'company_contacts'>, 'workspace_id' | 'created_at'>) { saved = relation({ ...values }); return saved; },
    },
  } as unknown as EnjazWorkspaceDataLayer;
  const input = { relationOperationId: relation().id, companyId: COMPANY_ID, contactId: CONTACT_ID, relationType: 'محامية' };
  const first = await addCompanyContactRelationship(factory(layer), USER_ID, input);
  const replay = await addCompanyContactRelationship(factory(layer), USER_ID, input);
  assert.equal(first.id, replay.id);

  const badLayer = { ...layer, contacts: { async getById() { return contact({ status: 'inactive' }); } } } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => addCompanyContactRelationship(factory(badLayer), USER_ID, { ...input, relationOperationId: '88888888-8888-4888-8888-888888888888' }), ContactRelationshipConflictError);
});

test('transaction primary contact must have a current company relationship and stale transaction writes fail closed', async () => {
  let updatedTo: string | null = null;
  const layer = {
    transactions: { async getById() { return transaction(); }, async update(_id: string, values: Partial<RowOf<'transactions'>>) { updatedTo = values.primary_contact_id ?? null; return transaction({ primary_contact_id: updatedTo }); } },
    contacts: { async getById() { return contact(); } },
    companyContacts: { async list() { return { items: [relation()], offset: 0, limit: 100, total: 1, hasMore: false }; } },
  } as unknown as EnjazWorkspaceDataLayer;
  const saved = await assignTransactionPrimaryContact(factory(layer), USER_ID, { transactionId: TRANSACTION_ID, contactId: CONTACT_ID, expectedUpdatedAt: transaction().updated_at });
  assert.equal(saved.primary_contact_id, CONTACT_ID);
  assert.equal(updatedTo, CONTACT_ID);

  await assert.rejects(() => assignTransactionPrimaryContact(factory(layer), USER_ID, { transactionId: TRANSACTION_ID, contactId: CONTACT_ID, expectedUpdatedAt: 'stale' }));
});
