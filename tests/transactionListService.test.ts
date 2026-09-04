import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import { loadTransactionListSource, TransactionWorkspaceUnavailableError } from '../src/features/transactions/transactionListService.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';

function transaction(id: string): RowOf<'transactions'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    company_id: COMPANY_ID,
    primary_contact_id: null,
    type: 'معاملة اختبار',
    department: null,
    status: 'active',
    priority: 'normal',
    current_fee: 100_000,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-02T08:00:00.000Z',
    last_activity_at: '2026-09-02T08:00:00.000Z',
    completed_at: null,
    archived_at: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    legacy_id: null,
    legacy_source: null,
  };
}

function company(): RowOf<'companies'> {
  return {
    id: COMPANY_ID,
    workspace_id: WORKSPACE_ID,
    legal_name: 'شركة الاختبار',
    display_name: null,
    capital: null,
    address: null,
    activities: null,
    registration_number: null,
    legal_status: null,
    primary_contact_id: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-04T08:00:00.000Z',
    deleted_at: null,
  };
}

test('transaction list source refuses to fabricate a workspace', async () => {
  const factory = {
    async resolveWorkspaceId() { return null; },
    forWorkspace() { throw new Error('must not be called'); },
  } as EnjazDataLayerFactory;

  await assert.rejects(() => loadTransactionListSource(factory, '44444444-4444-4444-8444-444444444444'), TransactionWorkspaceUnavailableError);
});

test('transaction list source paginates authoritative transactions and loads referenced companies', async () => {
  const rows = Array.from({ length: 135 }, (_, index) => transaction(`tx-${String(index).padStart(3, '0')}`));
  const transactionRequests: ListRequest<'transactions'>[] = [];
  const companyRequests: ListRequest<'companies'>[] = [];

  const layer = {
    transactions: {
      async list(request: ListRequest<'transactions'> = {}) {
        transactionRequests.push(request);
        const offset = request.offset ?? 0;
        const limit = request.limit ?? 50;
        const items = rows.slice(offset, offset + limit);
        return { items, offset, limit, total: rows.length, hasMore: offset + items.length < rows.length };
      },
    },
    companies: {
      async list(request: ListRequest<'companies'> = {}) {
        companyRequests.push(request);
        return { items: [company()], offset: 0, limit: 100, total: 1, hasMore: false };
      },
    },
  } as unknown as EnjazWorkspaceDataLayer;

  const factory = {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace(id: string) {
      assert.equal(id, WORKSPACE_ID);
      return layer;
    },
  } as EnjazDataLayerFactory;

  const result = await loadTransactionListSource(factory, '44444444-4444-4444-8444-444444444444');
  assert.equal(result.workspaceId, WORKSPACE_ID);
  assert.equal(result.source.transactions.length, 135);
  assert.equal(result.source.companies.length, 1);
  assert.equal(transactionRequests.length, 2);
  assert.deepEqual(transactionRequests[0]?.filters, [{ column: 'deleted_at', operator: 'is', value: null }]);
  assert.equal(companyRequests.length, 1);
  assert.equal(companyRequests[0]?.filters?.[0]?.operator, 'in');
});
