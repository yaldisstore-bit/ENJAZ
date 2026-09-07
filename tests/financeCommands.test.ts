import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createSupabaseFinanceCommandGateway, financeCentsToDecimal, parseFinanceDecimalToCents } from '../src/features/finance/financeCommands.ts';

const W = '11111111-1111-4111-8111-111111111111';
const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const C = '22222222-2222-4222-8222-222222222221';
const P = '33333333-3333-4333-8333-333333333331';
const CASH = '66666666-6666-4666-8666-666666666661';
const ENG = '77777777-7777-4777-8777-777777777771';
const KEY = '99999999-9999-4999-8999-999999999991';

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
    engagementId: ENG,
    note: 'دفعة اختبار',
    snapshot: { version: 1, companyName: 'شركة اختبار' },
    reversal: null,
    wasDuplicate: false,
    ...overrides,
  };
}

function client(handler: (name: string, args: Readonly<Record<string, unknown>>) => PromiseLike<{ data: unknown; error: null | { code?: string; message?: string } }>): EnjazSupabaseClient {
  return { rpc: handler } as unknown as EnjazSupabaseClient;
}

test('finance command decimal conversion is exact and rejects unsafe shapes', () => {
  assert.equal(parseFinanceDecimalToCents('0'), 0n);
  assert.equal(parseFinanceDecimalToCents('1250000.5'), 125_000_050n);
  assert.equal(parseFinanceDecimalToCents('1250000.05'), 125_000_005n);
  assert.equal(financeCentsToDecimal(125_000_005n), '1250000.05');
  assert.throws(() => parseFinanceDecimalToCents('1.234'), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
  assert.throws(() => parseFinanceDecimalToCents('-1'), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
  assert.throws(() => financeCentsToDecimal(-1n), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
});

test('postPayment sends one guarded RPC payload and parses immutable receipt facts', async () => {
  const calls: { name: string; args: Readonly<Record<string, unknown>> }[] = [];
  const gateway = createSupabaseFinanceCommandGateway(client(async (name, args) => {
    calls.push({ name, args });
    return { data: receipt(), error: null };
  }));
  const result = await gateway.postPayment({ workspaceId: W, transactionId: T, amountCents: 125_000_000n, method: 'cash', paidAt: '2026-09-07T00:30:00.000Z', note: 'دفعة اختبار', idempotencyKey: KEY, cashboxId: CASH, engagementId: ENG });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'post_payment_v1');
  assert.deepEqual(calls[0].args, {
    p_workspace_id: W,
    p_transaction_id: T,
    p_amount: '1250000.00',
    p_method: 'cash',
    p_paid_at: '2026-09-07T00:30:00.000Z',
    p_note: 'دفعة اختبار',
    p_idempotency_key: KEY,
    p_cashbox_id: CASH,
    p_engagement_id: ENG,
  });
  assert.equal(result.receiptRef, 'ENJ-R-2026-00000001');
  assert.equal(result.amountCents, 125_000_000n);
  assert.equal(result.receiptSerial, 1n);
  assert.equal(result.snapshot.companyName, 'شركة اختبار');
});

test('postPayment preserves duplicate response instead of fabricating a second payment', async () => {
  const gateway = createSupabaseFinanceCommandGateway(client(async () => ({ data: receipt({ wasDuplicate: true }), error: null })));
  const result = await gateway.postPayment({ workspaceId: W, transactionId: T, amountCents: 125_000_000n, method: 'cash', paidAt: '2026-09-07T00:30:00.000Z', note: null, idempotencyKey: KEY, cashboxId: CASH, engagementId: null });
  assert.equal(result.wasDuplicate, true);
  assert.equal(result.paymentId, P);
});

test('malformed receipt serial fails closed as typed data failure', async () => {
  const gateway = createSupabaseFinanceCommandGateway(client(async () => ({ data: receipt({ receiptSerial: 'not-a-number' }), error: null })));
  await assert.rejects(
    () => gateway.postPayment({ workspaceId: W, transactionId: T, amountCents: 125_000_000n, method: 'cash', paidAt: '2026-09-07T00:30:00.000Z', note: null, idempotencyKey: KEY, cashboxId: CASH, engagementId: null }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OPERATION_FAILED',
  );
});

test('loadContext rejects shadow-ledger authority drift and parses reconciliation counters', async () => {
  const goodGateway = createSupabaseFinanceCommandGateway(client(async () => ({ data: {
    cashboxes: [{ id: CASH, name: 'الخزنة', openingBalance: '100.00', active: true }],
    engagements: [{ id: ENG, companyId: C, title: 'Retainer', reference: 'RET-1', type: 'retainer', billingMode: 'retainer', status: 'active', transactionIds: [T] }],
    recentReceipts: [receipt()],
    reconciliation: { postedTotal: '1250000.00', reversedTotal: '0.00', statusWithoutReversal: 0, reversalWithoutStatus: 0, shadowLedgerEntries: 0, integrityWarnings: 0, moneyAuthority: 'payments_plus_non_payment_ledger' },
  }, error: null })));
  const context = await goodGateway.loadContext(W);
  assert.equal(context.cashboxes[0].openingBalanceCents, 10_000n);
  assert.equal(context.engagements[0].transactionIds[0], T);
  assert.equal(context.reconciliation.integrityWarnings, 0);

  const badGateway = createSupabaseFinanceCommandGateway(client(async () => ({ data: { cashboxes: [], engagements: [], recentReceipts: [], reconciliation: { postedTotal: '0.00', reversedTotal: '0.00', statusWithoutReversal: 0, reversalWithoutStatus: 0, shadowLedgerEntries: 1, integrityWarnings: 1, moneyAuthority: 'ledger_is_money_authority' } }, error: null })));
  await assert.rejects(() => badGateway.loadContext(W), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OPERATION_FAILED');
});

test('finance write timeout is outcome-unknown, so callers can retry with the same idempotency key', async () => {
  const gateway = createSupabaseFinanceCommandGateway(client(() => new Promise(() => undefined)), 5);
  await assert.rejects(
    () => gateway.postPayment({ workspaceId: W, transactionId: T, amountCents: 100n, method: 'transfer', paidAt: '2026-09-07T00:30:00.000Z', note: null, idempotencyKey: KEY, cashboxId: null, engagementId: null }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN',
  );
});

test('reversePayment validates reason before calling the database', async () => {
  let calls = 0;
  const gateway = createSupabaseFinanceCommandGateway(client(async () => { calls += 1; return { data: null, error: null }; }));
  await assert.rejects(() => gateway.reversePayment({ workspaceId: W, paymentId: P, reason: 'x', idempotencyKey: KEY }), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED');
  assert.equal(calls, 0);
});

test('database conflict remains a typed conflict instead of becoming a generic success', async () => {
  const gateway = createSupabaseFinanceCommandGateway(client(async () => ({ data: null, error: { code: '23505', message: 'duplicate' } })));
  await assert.rejects(() => gateway.createCashbox({ workspaceId: W, name: 'الخزنة', openingBalanceCents: 0n, idempotencyKey: KEY }), (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_CONFLICT');
});
