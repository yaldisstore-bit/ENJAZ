import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import { createCompanyDraft, updateCompanyDraft } from '../src/features/companies/companyModel.ts';
import { CompanyCreateReplayConflictError, CompanyEditConflictError, CompanyListCapacityError, CompanyWorkspaceUnavailableError, loadCompanyListSource, saveCompany } from '../src/features/companies/companyService.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';

function company(patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return { id: COMPANY_ID, workspace_id: WORKSPACE_ID, legal_name: 'شركة الاختبار', display_name: null, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null, ...patch };
}

function factory(layer: EnjazWorkspaceDataLayer): EnjazDataLayerFactory {
  return { async resolveWorkspaceId() { return WORKSPACE_ID; }, forWorkspace(id: string) { assert.equal(id, WORKSPACE_ID); return layer; } };
}

test('company source refuses to fabricate a workspace', async () => {
  const missing = { async resolveWorkspaceId() { return null; }, forWorkspace() { throw new Error('must not be called'); } } as EnjazDataLayerFactory;
  await assert.rejects(() => loadCompanyListSource(missing, USER_ID), CompanyWorkspaceUnavailableError);
});

test('company source fails closed above the 5000-row safety ceiling', async () => {
  const rows = Array.from({ length: 5_001 }, (_, index) => company({ id: `company-${index}` }));
  const layer = { companies: { async list(request: ListRequest<'companies'> = {}) { const offset = request.offset ?? 0; const limit = request.limit ?? 100; const items = rows.slice(offset, offset + limit); return { items, offset, limit, total: rows.length, hasMore: offset + items.length < rows.length }; } } } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => loadCompanyListSource(factory(layer), USER_ID), CompanyListCapacityError);
});

test('company create retry is idempotent with a stable operation id and rejects payload drift', async () => {
  const operationId = '14141414-1414-4141-8141-141414141414';
  let existing: RowOf<'companies'> | null = null;
  let createCount = 0;
  const layer = { companies: {
    async getById() { return existing; },
    async create(values: Omit<RowOf<'companies'>, 'workspace_id' | 'created_at' | 'updated_at'>) { createCount += 1; existing = company({ ...values, id: operationId }); return existing; },
  } } as unknown as EnjazWorkspaceDataLayer;
  let draft = createCompanyDraft();
  draft = updateCompanyDraft(draft, 'legalName', 'شركة جديدة');
  draft = updateCompanyDraft(draft, 'capitalInput', '١٠٠٠٠٠٠');
  const first = await saveCompany(factory(layer), USER_ID, 'create', draft, { createOperationId: operationId });
  const replay = await saveCompany(factory(layer), USER_ID, 'create', draft, { createOperationId: operationId });
  assert.equal(first.id, operationId);
  assert.equal(replay.id, operationId);
  assert.equal(createCount, 1);
  await assert.rejects(() => saveCompany(factory(layer), USER_ID, 'create', updateCompanyDraft(draft, 'legalName', 'شركة أخرى'), { createOperationId: operationId }), CompanyCreateReplayConflictError);
});

test('company edit re-reads current data and rejects stale updated_at', async () => {
  let updated = false;
  const layer = { companies: { async getById() { return company({ updated_at: '2026-09-06T09:00:00.000Z' }); }, async update() { updated = true; return company(); } } } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => saveCompany(factory(layer), USER_ID, 'edit', createCompanyDraft(company()), { companyId: COMPANY_ID, expectedUpdatedAt: '2026-09-06T08:00:00.000Z' }), CompanyEditConflictError);
  assert.equal(updated, false);
});
