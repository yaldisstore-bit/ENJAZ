import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildFinancialIntelligenceSnapshot, FinanceIntelligenceDateError } from '../src/features/finance/financeIntelligence.ts';
import { FinanceUnsafeMoneyError, type FinanceSource } from '../src/features/finance/financeModel.ts';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222222';
const C2 = '33333333-3333-4333-8333-333333333333';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const T2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AS_OF = '2026-09-07T12:00:00.000Z';

function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: W, legal_name: name, display_name: name, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: AS_OF, deleted_at: null };
}

function transaction(id: string, companyId: string, createdAt: string, fee = 1_000, legacy = '1001'): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: companyId, primary_contact_id: null, type: 'تأسيس', department: null, status: 'active', priority: 'normal', current_fee: fee, created_at: createdAt, updated_at: AS_OF, last_activity_at: AS_OF, completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: legacy, legacy_source: null };
}

function payment(id: string, transactionId: string, companyId: string, amount: number, paidAt: string, status = 'posted'): RowOf<'payments'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, amount, method: 'cash', paid_at: paidAt, status, receipt_ref: `R-${id}`, note: null, legacy_id: null, legacy_source: null, created_at: paidAt };
}

function ledger(id: string, direction: 'in' | 'out', amount: number, occurredAt: string): RowOf<'financial_ledger_entries'> {
  return { id, workspace_id: W, transaction_id: null, company_id: null, entry_type: 'expense', direction, amount, method: null, category: 'اختبار', source: 'test', occurred_at: occurredAt, status: 'posted', note: null, reversal_reason: null, reversed_at: null, metadata: {}, created_at: occurredAt };
}

function source(patch: Partial<FinanceSource> = {}): FinanceSource {
  return {
    companies: [company(C1, 'شركة ألف'), company(C2, 'شركة باء')],
    transactions: [
      transaction(T1, C1, '2026-05-01T00:00:00.000Z', 1_000, '1001'),
      transaction(T2, C2, '2026-08-20T00:00:00.000Z', 2_000, '1002'),
    ],
    payments: [],
    paymentReversals: [],
    ledger: [],
    cashboxes: [],
    ...patch,
  };
}

test('7.3 aging classifies receivables by transaction age without inventing due dates', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source(), AS_OF);
  assert.equal(snapshot.agingBasis, 'transaction_created_at');
  assert.match(snapshot.agingDisclosure, /لا يحتوي نموذج المعاملة الحالي على تاريخ استحقاق مالي مستقل/);
  assert.equal(snapshot.aging.find((item) => item.key === '91_plus')?.outstandingCents, 100_000n);
  assert.equal(snapshot.aging.find((item) => item.key === '0_30')?.outstandingCents, 200_000n);
  assert.equal(snapshot.attentionQueue.length, 1);
  assert.equal(snapshot.attentionQueue[0]?.transactionId, T1);
  assert.equal(snapshot.attentionQueue[0]?.level, 'critical');
});

test('posted collections reduce receivable and feed run-rate while reversed payments are excluded', () => {
  const posted = payment('p1', T1, C1, 400, '2026-09-01T10:00:00.000Z');
  const reversed = payment('p2', T1, C1, 300, '2026-09-02T10:00:00.000Z', 'reversed');
  const snapshot = buildFinancialIntelligenceSnapshot(source({
    payments: [posted, reversed],
    paymentReversals: [{ id: 'r1', workspace_id: W, payment_id: reversed.id, reversed_at: '2026-09-03T10:00:00.000Z', reason: 'تصحيح', actor_user_id: null }],
  }), AS_OF);
  assert.equal(snapshot.totalOutstandingCents, 260_000n);
  assert.equal(snapshot.runRate.recent30CollectedCents, 40_000n);
  assert.equal(snapshot.runRate.samplePaymentCount, 1);
  assert.equal(snapshot.runRate.confidence, 'insufficient');
});

test('company health is deterministic and explains stale outstanding exposure', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source({ payments: [payment('p3', T2, C2, 1_900, '2026-09-05T10:00:00.000Z')] }), AS_OF);
  const alpha = snapshot.companyHealth.find((item) => item.companyId === C1);
  const beta = snapshot.companyHealth.find((item) => item.companyId === C2);
  assert(alpha);
  assert(beta);
  assert.equal(alpha.staleOutstandingCents, 100_000n);
  assert.equal(alpha.band, 'high_risk');
  assert.ok(alpha.reasons.some((reason) => reason.includes('90 يوماً')));
  assert.ok(beta.healthScore > alpha.healthScore);
});

test('six-month trends reconcile posted payments and ledger movement by calendar month', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source({
    payments: [payment('p4', T1, C1, 250, '2026-08-15T10:00:00.000Z'), payment('p5', T2, C2, 500, '2026-09-02T10:00:00.000Z')],
    ledger: [ledger('l1', 'in', 50, '2026-09-03T10:00:00.000Z'), ledger('l2', 'out', 100, '2026-09-04T10:00:00.000Z')],
  }), AS_OF);
  const august = snapshot.trends.find((item) => item.monthKey === '2026-08');
  const september = snapshot.trends.find((item) => item.monthKey === '2026-09');
  assert.equal(august?.collectedCents, 25_000n);
  assert.equal(august?.paymentCount, 1);
  assert.equal(september?.collectedCents, 50_000n);
  assert.equal(september?.paymentCount, 1);
  assert.equal(september?.ledgerInCents, 5_000n);
  assert.equal(september?.ledgerOutCents, 10_000n);
  assert.equal(september?.netCashCents, 45_000n);
});

test('future-dated payments and ledger events cannot leak into an observed finance trend', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source({
    payments: [payment('p-future', T1, C1, 900, '2026-09-20T10:00:00.000Z')],
    ledger: [ledger('l-future', 'in', 700, '2026-09-21T10:00:00.000Z')],
  }), AS_OF);
  const september = snapshot.trends.find((item) => item.monthKey === '2026-09');
  assert.equal(september?.collectedCents, 0n);
  assert.equal(september?.paymentCount, 0);
  assert.equal(september?.ledgerInCents, 0n);
  assert.equal(september?.netCashCents, 0n);
  assert.equal(snapshot.runRate.recent30CollectedCents, 0n);
  assert.equal(snapshot.runRate.samplePaymentCount, 0);
});

test('run-rate compares rolling 30-day windows but labels confidence as directional only with enough samples', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source({ payments: [
    payment('p6', T1, C1, 100, '2026-09-01T10:00:00.000Z'),
    payment('p7', T1, C1, 100, '2026-08-28T10:00:00.000Z'),
    payment('p8', T2, C2, 100, '2026-08-20T10:00:00.000Z'),
    payment('p9', T2, C2, 100, '2026-08-12T10:00:00.000Z'),
    payment('p10', T2, C2, 200, '2026-07-20T10:00:00.000Z'),
  ] }), AS_OF);
  assert.equal(snapshot.runRate.recent30CollectedCents, 40_000n);
  assert.equal(snapshot.runRate.previous30CollectedCents, 20_000n);
  assert.equal(snapshot.runRate.changeBps, 10_000);
  assert.equal(snapshot.runRate.confidence, 'directional');
  assert.equal(snapshot.runRate.projectedNext30AtSameRunRateCents, 39_990n);
});

test('signals are explainable and detect stale exposure, credit and concentration without black-box scores', () => {
  const snapshot = buildFinancialIntelligenceSnapshot(source({ payments: [payment('p11', T2, C2, 2_250, '2026-09-01T10:00:00.000Z')] }), AS_OF);
  assert.ok(snapshot.signals.some((signal) => signal.id === 'stale-receivables'));
  assert.ok(snapshot.signals.some((signal) => signal.id === 'credit-balance'));
  assert.ok(snapshot.signals.some((signal) => signal.id === 'receivable-concentration'));
  assert.ok(snapshot.signals.every((signal) => signal.explanation.length > 10));
});

test('future transaction dates clamp age to zero instead of fabricating negative aging', () => {
  const future = transaction(T1, C1, '2026-12-01T00:00:00.000Z', 1_000, '1001');
  const snapshot = buildFinancialIntelligenceSnapshot(source({ transactions: [future] }), AS_OF);
  assert.equal(snapshot.aging.find((item) => item.key === '0_30')?.receivableCount, 1);
});

test('invalid finance dates fail closed', () => {
  assert.throws(() => buildFinancialIntelligenceSnapshot(source({ transactions: [transaction(T1, C1, 'not-a-date')] }), AS_OF), FinanceIntelligenceDateError);
});

test('unsafe money continues to fail closed through the shared exact finance boundary', () => {
  assert.throws(() => buildFinancialIntelligenceSnapshot(source({ payments: [payment('p12', T1, C1, 1.001, '2026-09-01T10:00:00.000Z')] }), AS_OF), FinanceUnsafeMoneyError);
});
