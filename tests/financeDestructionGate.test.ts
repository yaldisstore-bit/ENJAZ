import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import type { DataPage, ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import { createSupabaseFinanceCommandGateway, financeCentsToDecimal, parseFinanceDecimalToCents } from '../src/features/finance/financeCommands.ts';
import { buildFinanceLedgerSnapshot } from '../src/features/finance/financeModel.ts';
import { FINANCE_SOURCE_LIMIT, FinanceSourceCapacityError, FinanceSourcePageStalledError, loadFinanceSource } from '../src/features/finance/financeService.ts';

const W = '11111111-1111-4111-8111-111111111111';
const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const C = '22222222-2222-4222-8222-222222222221';
const P = '33333333-3333-4333-8333-333333333331';
const R = '44444444-4444-4444-8444-444444444441';
const CASH = '66666666-6666-4666-8666-666666666661';
const KEY = '99999999-9999-4999-8999-999999999991';
const U = '55555555-5555-4555-8555-555555555551';

function rpcClient(handler: (name: string, args: Readonly<Record<string, unknown>>) => PromiseLike<{ data: unknown; error: null | { code?: string; message?: string } }>): EnjazSupabaseClient {
  return { rpc: handler } as unknown as EnjazSupabaseClient;
}

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    paymentId: P,
    receiptRef: 'ENJ-R-2026-00000001',
    receiptSerial: 1,
    receiptToken: '88888888-8888-4888-8888-888888888881',
    amount: '1250000.00',
    method: 'cash',
    paidAt: '2026-09-07T00:30:00.000Z',
    status: 'posted',
    transactionId: T,
    companyId: C,
    cashboxId: CASH,
    engagementId: null,
    note: 'Phase 7.5 destruction probe',
    snapshot: { version: 1, companyName: 'شركة اختبار' },
    reversal: null,
    wasDuplicate: false,
    ...overrides,
  };
}

function transaction(id: string): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: C, primary_contact_id: null, type: 'Phase 7.5', department: null, status: 'active', priority: 'normal', current_fee: 1_000, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', last_activity_at: '2026-01-01T00:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null };
}

function company(): RowOf<'companies'> {
  return { id: C, workspace_id: W, legal_name: 'شركة 7.5', display_name: null, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null };
}

function payment(status: 'posted' | 'reversed' = 'posted'): RowOf<'payments'> {
  return { id: P, workspace_id: W, transaction_id: T, company_id: C, amount: 1_250_000, method: 'cash', paid_at: '2026-09-07T00:30:00.000Z', status, receipt_ref: 'ENJ-R-2026-00000001', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-07T00:30:00.000Z' };
}

function reversal(): RowOf<'payment_reversals'> {
  return { id: R, workspace_id: W, payment_id: P, reversed_at: '2026-09-07T01:00:00.000Z', reason: 'Phase 7.5 compensating reversal', actor_user_id: U };
}

function page<T>(rows: readonly T[], request: Readonly<{ offset?: number; limit?: number }> = {}): DataPage<T> {
  const offset = request.offset ?? 0;
  const limit = request.limit ?? 100;
  const items = rows.slice(offset, offset + limit);
  return { items, offset, limit, total: rows.length, hasMore: offset + items.length < rows.length };
}

function emptyRepository<T>() {
  return { async list(request: Readonly<{ offset?: number; limit?: number }> = {}) { return page<T>([], request); } };
}

function factoryWithTransactions(rows: readonly RowOf<'transactions'>[]): EnjazDataLayerFactory {
  const layer = {
    transactions: { async list(request: ListRequest<'transactions'> = {}) { return page(rows, request); } },
    companies: emptyRepository<RowOf<'companies'>>(),
    payments: emptyRepository<RowOf<'payments'>>(),
    paymentReversals: emptyRepository<RowOf<'payment_reversals'>>(),
    ledger: emptyRepository<RowOf<'financial_ledger_entries'>>(),
    cashboxes: emptyRepository<RowOf<'cashbox_accounts'>>(),
  } as unknown as EnjazWorkspaceDataLayer;
  return { async resolveWorkspaceId() { return W; }, forWorkspace() { return layer; } } as EnjazDataLayerFactory;
}

test('huge values remain exact at numeric(18,2) boundary and one cent above fails closed', () => {
  const max = 999_999_999_999_999_999n;
  assert.equal(financeCentsToDecimal(max), '9999999999999999.99');
  assert.equal(parseFinanceDecimalToCents('9999999999999999.99'), max);
  assert.throws(() => financeCentsToDecimal(max + 1n), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
});

test('sub-cent and unsafe money shapes never reach a finance command', () => {
  for (const value of ['0.001', '1.234', '-0.01', 'NaN', 'Infinity', '01.00', '10000000000000000.00']) {
    assert.throws(() => parseFinanceDecimalToCents(value), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED', value);
  }
});

test('network uncertainty recovers the same authoritative payment with the same idempotency key', async () => {
  let calls = 0;
  let stored = false;
  const client = rpcClient((name, args) => {
    assert.equal(name, 'post_payment_v1');
    assert.equal(args.p_idempotency_key, KEY);
    calls += 1;
    if (!stored) {
      stored = true;
      return new Promise((resolve) => setTimeout(() => resolve({ data: receipt(), error: null }), 25));
    }
    return Promise.resolve({ data: receipt({ wasDuplicate: true }), error: null });
  });
  const firstGateway = createSupabaseFinanceCommandGateway(client, 5);
  const input = { workspaceId: W, transactionId: T, amountCents: 125_000_000n, method: 'cash' as const, paidAt: '2026-09-07T00:30:00.000Z', note: null, idempotencyKey: KEY, cashboxId: CASH, engagementId: null };
  await assert.rejects(() => firstGateway.postPayment(input), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN');
  const recovered = await createSupabaseFinanceCommandGateway(client, 100).postPayment(input);
  assert.equal(recovered.paymentId, P);
  assert.equal(recovered.wasDuplicate, true);
  assert.equal(calls, 2);
});

test('reconciliation anomaly counters survive parsing and remain visible instead of being normalized away', async () => {
  const gateway = createSupabaseFinanceCommandGateway(rpcClient(async () => ({ data: {
    cashboxes: [], engagements: [], recentReceipts: [],
    reconciliation: { postedTotal: '0.00', reversedTotal: '1250000.00', statusWithoutReversal: 1, reversalWithoutStatus: 1, shadowLedgerEntries: 1, integrityWarnings: 3, moneyAuthority: 'payments_plus_non_payment_ledger' },
  }, error: null })));
  const context = await gateway.loadContext(W);
  assert.equal(context.reconciliation.integrityWarnings, 3);
  assert.equal(context.reconciliation.statusWithoutReversal, 1);
  assert.equal(context.reconciliation.reversalWithoutStatus, 1);
  assert.equal(context.reconciliation.shadowLedgerEntries, 1);
});

test('partial reversal history is detected by the authoritative finance snapshot', () => {
  const source = { transactions: [transaction(T)], companies: [company()], payments: [payment('reversed')], paymentReversals: [], ledger: [], cashboxes: [] };
  const snapshot = buildFinanceLedgerSnapshot(source);
  assert.equal(snapshot.summary.paymentIntegrityWarnings, 1);
  assert.equal(snapshot.summary.reversedPayments, 1);
  assert.equal(snapshot.summary.collectedCents, 0n);
});

test('reversal evidence attached to a posted payment is also detected as partial-history drift', () => {
  const source = { transactions: [transaction(T)], companies: [company()], payments: [payment('posted')], paymentReversals: [reversal()], ledger: [], cashboxes: [] };
  const snapshot = buildFinanceLedgerSnapshot(source);
  assert.equal(snapshot.summary.paymentIntegrityWarnings, 1);
  assert.equal(snapshot.summary.reversedPayments, 1);
  assert.equal(snapshot.summary.collectedCents, 0n);
});

test('source-capacity pressure fails closed instead of silently reconciling a sampled history', async () => {
  const rows = Array.from({ length: FINANCE_SOURCE_LIMIT + 1 }, (_, index) => transaction(`tx-${index}`));
  await assert.rejects(() => loadFinanceSource(factoryWithTransactions(rows), U), FinanceSourceCapacityError);
});

test('stalled source pagination fails closed instead of producing partial finance history', async () => {
  const layer = {
    transactions: {
      async list(request: ListRequest<'transactions'> = {}) {
        const offset = request.offset ?? 0;
        if (offset === 0) return { items: [transaction('tx-first')], offset: 0, limit: 100, total: 2, hasMore: true };
        return { items: [], offset, limit: 100, total: 2, hasMore: true };
      },
    },
    companies: emptyRepository<RowOf<'companies'>>(), payments: emptyRepository<RowOf<'payments'>>(), paymentReversals: emptyRepository<RowOf<'payment_reversals'>>(), ledger: emptyRepository<RowOf<'financial_ledger_entries'>>(), cashboxes: emptyRepository<RowOf<'cashbox_accounts'>>(),
  } as unknown as EnjazWorkspaceDataLayer;
  const factory = { async resolveWorkspaceId() { return W; }, forWorkspace() { return layer; } } as EnjazDataLayerFactory;
  await assert.rejects(() => loadFinanceSource(factory, U), FinanceSourcePageStalledError);
});
