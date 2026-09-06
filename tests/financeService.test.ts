import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { DataPage, ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import { FINANCE_SOURCE_LIMIT, FinanceSourceCapacityError, FinanceSourcePageStalledError, FinanceWorkspaceUnavailableError, loadFinanceSource } from '../src/features/finance/financeService.ts';

const W = '11111111-1111-4111-8111-111111111111';
const U = '44444444-4444-4444-8444-444444444444';

function transaction(id: string): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: '22222222-2222-4222-8222-222222222222', primary_contact_id: null, type: 'اختبار', department: null, status: 'active', priority: 'normal', current_fee: 1_000, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', last_activity_at: '2026-01-01T00:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null };
}

function page<T>(rows: readonly T[], request: Readonly<{ offset?: number; limit?: number }> = {}): DataPage<T> {
  const offset = request.offset ?? 0;
  const limit = request.limit ?? 100;
  const items = rows.slice(offset, offset + limit);
  return { items, offset, limit, total: rows.length, hasMore: offset + items.length < rows.length };
}

function emptyRepository<T>() {
  return { async list(request: Readonly<{ offset?: number; limit?: number }> = {}) { return page<T>([], request); }, async getById() { return null; } };
}

function factory(layer: EnjazWorkspaceDataLayer): EnjazDataLayerFactory {
  return { async resolveWorkspaceId() { return W; }, forWorkspace(workspaceId: string) { assert.equal(workspaceId, W); return layer; } };
}

function layerWithTransactions(rows: readonly RowOf<'transactions'>[]): EnjazWorkspaceDataLayer {
  return {
    transactions: { async list(request: ListRequest<'transactions'> = {}) { return page(rows, request); } },
    companies: emptyRepository<RowOf<'companies'>>(),
    payments: emptyRepository<RowOf<'payments'>>(),
    paymentReversals: emptyRepository<RowOf<'payment_reversals'>>(),
    ledger: emptyRepository<RowOf<'financial_ledger_entries'>>(),
    cashboxes: emptyRepository<RowOf<'cashbox_accounts'>>(),
  } as unknown as EnjazWorkspaceDataLayer;
}

test('finance source refuses to fabricate a workspace', async () => {
  const missing = { async resolveWorkspaceId() { return null; }, forWorkspace() { throw new Error('must not run'); } } as EnjazDataLayerFactory;
  await assert.rejects(() => loadFinanceSource(missing, U), FinanceWorkspaceUnavailableError);
});

test('finance source paginates every authoritative table instead of sampling the first page', async () => {
  const rows = Array.from({ length: 235 }, (_, index) => transaction(`tx-${String(index).padStart(4, '0')}`));
  const result = await loadFinanceSource(factory(layerWithTransactions(rows)), U);
  assert.equal(result.workspaceId, W);
  assert.equal(result.source.transactions.length, 235);
  assert.equal(result.source.payments.length, 0);
  assert.equal(result.source.cashboxes.length, 0);
});

test('finance source fails closed above the per-source safety ceiling', async () => {
  const rows = Array.from({ length: FINANCE_SOURCE_LIMIT + 1 }, (_, index) => transaction(`tx-${index}`));
  await assert.rejects(() => loadFinanceSource(factory(layerWithTransactions(rows)), U), FinanceSourceCapacityError);
});

test('finance source detects a stalled paginated repository', async () => {
  const stalledTransactions = {
    async list(request: ListRequest<'transactions'> = {}) {
      const offset = request.offset ?? 0;
      if (offset === 0) return { items: [transaction('tx-first')], offset: 0, limit: 100, total: 2, hasMore: true };
      return { items: [], offset, limit: 100, total: 2, hasMore: true };
    },
  };
  const layer = {
    transactions: stalledTransactions,
    companies: emptyRepository<RowOf<'companies'>>(),
    payments: emptyRepository<RowOf<'payments'>>(),
    paymentReversals: emptyRepository<RowOf<'payment_reversals'>>(),
    ledger: emptyRepository<RowOf<'financial_ledger_entries'>>(),
    cashboxes: emptyRepository<RowOf<'cashbox_accounts'>>(),
  } as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(() => loadFinanceSource(factory(layer), U), FinanceSourcePageStalledError);
});
