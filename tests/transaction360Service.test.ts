import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import {
  loadTransaction360Source,
  Transaction360CoreLoadError,
  Transaction360DeletedError,
  Transaction360NotFoundError,
  Transaction360WorkspaceUnavailableError,
} from '../src/features/transactions/transaction360Service.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const TRANSACTION_ID = '33333333-3333-4333-8333-333333333333';
const COMPANY_ID = '44444444-4444-4444-8444-444444444444';

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id: TRANSACTION_ID, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null, type: 'معاملة اختبار', department: null,
    status: 'active', priority: 'normal', current_fee: 100_000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-02T08:00:00.000Z',
    last_activity_at: '2026-09-02T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null,
    deletion_reason: null, legacy_id: null, legacy_source: null, ...patch,
  };
}

function company(): RowOf<'companies'> {
  return {
    id: COMPANY_ID, workspace_id: WORKSPACE_ID, legal_name: 'شركة الاختبار', display_name: null, capital: null, address: null, activities: null,
    registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z', deleted_at: null,
  };
}

function emptyPage<T>(request: { offset?: number; limit?: number } = {}) {
  return { items: [] as T[], offset: request.offset ?? 0, limit: request.limit ?? 100, total: 0, hasMore: false };
}

function layer(overrides: Partial<EnjazWorkspaceDataLayer> = {}): EnjazWorkspaceDataLayer {
  const emptyRepo = { async list(request: { offset?: number; limit?: number } = {}) { return emptyPage(request); } };
  return {
    scope: { workspaceId: WORKSPACE_ID },
    transactions: { async getById() { return transaction(); } },
    companies: { async getById() { return company(); } },
    contacts: { async getById() { return null; } },
    transactionRoutes: emptyRepo,
    transactionActivity: emptyRepo,
    transactionNotes: emptyRepo,
    followups: emptyRepo,
    payments: emptyRepo,
    feeChanges: emptyRepo,
    documents: emptyRepo,
    workflowInstances: emptyRepo,
    blockers: emptyRepo,
    ...overrides,
  } as unknown as EnjazWorkspaceDataLayer;
}

function factory(currentLayer: EnjazWorkspaceDataLayer, workspaceId: string | null = WORKSPACE_ID): EnjazDataLayerFactory {
  return {
    async resolveWorkspaceId(userId: string) { assert.equal(userId, USER_ID); return workspaceId; },
    forWorkspace(id: string) { assert.equal(id, WORKSPACE_ID); return currentLayer; },
  } as EnjazDataLayerFactory;
}

test('transaction 360 refuses to fabricate a workspace', async () => {
  await assert.rejects(() => loadTransaction360Source(factory(layer(), null), USER_ID, TRANSACTION_ID), Transaction360WorkspaceUnavailableError);
});

test('transaction 360 fails closed when the authoritative transaction is absent or deleted', async () => {
  await assert.rejects(() => loadTransaction360Source(factory(layer({ transactions: { async getById() { return null; } } as never })), USER_ID, TRANSACTION_ID), Transaction360NotFoundError);
  await assert.rejects(() => loadTransaction360Source(factory(layer({ transactions: { async getById() { return transaction({ deleted_at: '2026-09-05T08:00:00.000Z' }); } } as never })), USER_ID, TRANSACTION_ID), Transaction360DeletedError);
});

test('transaction 360 treats company relation read failure as a core failure', async () => {
  const current = layer({ companies: { async getById() { throw new Error('offline'); } } as never });
  await assert.rejects(() => loadTransaction360Source(factory(current), USER_ID, TRANSACTION_ID), Transaction360CoreLoadError);
});

test('transaction 360 scopes every contextual list by transaction id and bounds each section', async () => {
  const requests: Array<{ name: string; request: ListRequest<any> }> = [];
  const repo = (name: string) => ({
    async list(request: ListRequest<any> = {}) { requests.push({ name, request }); return emptyPage(request); },
  });
  const current = layer({
    transactionRoutes: repo('routes') as never,
    transactionActivity: repo('activity') as never,
    transactionNotes: repo('notes') as never,
    followups: repo('followups') as never,
    payments: repo('payments') as never,
    feeChanges: repo('fees') as never,
    documents: repo('documents') as never,
    workflowInstances: repo('workflows') as never,
    blockers: repo('blockers') as never,
  });
  const result = await loadTransaction360Source(factory(current), USER_ID, TRANSACTION_ID);
  assert.equal(result.workspaceId, WORKSPACE_ID);
  assert.equal(requests.length, 9);
  for (const { request } of requests) {
    assert.equal(request.limit, 100);
    assert.deepEqual(request.filters, [{ column: 'transaction_id', operator: 'eq', value: TRANSACTION_ID }]);
  }
});

test('transaction 360 isolates optional section failures and marks truncation explicitly', async () => {
  const current = layer({
    documents: { async list() { throw new Error('storage context unavailable'); } } as never,
    transactionActivity: { async list(request: ListRequest<'transaction_activity'> = {}) { return { ...emptyPage<RowOf<'transaction_activity'>>(request), hasMore: true }; } } as never,
  });
  const result = await loadTransaction360Source(factory(current), USER_ID, TRANSACTION_ID);
  assert.equal(result.source.documents.state, 'unavailable');
  assert.equal(result.source.activity.state, 'truncated');
  assert.equal(result.source.routes.state, 'ready');
});

test('transaction 360 keeps missing primary contact explicit instead of inventing a person', async () => {
  const current = layer({ transactions: { async getById() { return transaction({ primary_contact_id: '55555555-5555-4555-8555-555555555555' }); } } as never });
  const result = await loadTransaction360Source(factory(current), USER_ID, TRANSACTION_ID);
  assert.equal(result.source.contact, null);
  assert.equal(result.source.contactState, 'missing');
});
