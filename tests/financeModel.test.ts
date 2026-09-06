import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildFinanceLedgerSnapshot, FinanceUnsafeMoneyError, formatFinanceMoney } from '../src/features/finance/financeModel.ts';

const W = '11111111-1111-4111-8111-111111111111';
const C = '22222222-2222-4222-8222-222222222222';
const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function company(): RowOf<'companies'> {
  return { id: C, workspace_id: W, legal_name: 'شركة الاختبار', display_name: 'الاختبار', capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z', deleted_at: null };
}

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return { id: T, workspace_id: W, company_id: C, primary_contact_id: null, type: 'تأسيس', department: null, status: 'active', priority: 'normal', current_fee: 1_000, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z', last_activity_at: '2026-09-01T00:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: '1001', legacy_source: null, ...patch };
}

function payment(id: string, amount: number, patch: Partial<RowOf<'payments'>> = {}): RowOf<'payments'> {
  return { id, workspace_id: W, transaction_id: T, company_id: C, amount, method: 'cash', paid_at: '2026-09-05T10:00:00.000Z', status: 'posted', receipt_ref: `R-${id}`, note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-05T10:00:00.000Z', ...patch };
}

function ledger(id: string, direction: 'in' | 'out', amount: number, patch: Partial<RowOf<'financial_ledger_entries'>> = {}): RowOf<'financial_ledger_entries'> {
  return { id, workspace_id: W, transaction_id: T, company_id: C, entry_type: 'adjustment', direction, amount, method: null, category: 'اختبار', source: 'test', occurred_at: '2026-09-04T10:00:00.000Z', status: 'posted', note: null, reversal_reason: null, reversed_at: null, metadata: {}, created_at: '2026-09-04T10:00:00.000Z', ...patch };
}

function cashbox(openingBalance: number): RowOf<'cashbox_accounts'> {
  return { id: '66666666-6666-4666-8666-666666666666', workspace_id: W, name: 'الرئيسية', opening_balance: openingBalance, opened_at: '2026-01-01T00:00:00.000Z', active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' };
}

function source(patch: Partial<Parameters<typeof buildFinanceLedgerSnapshot>[0]> = {}): Parameters<typeof buildFinanceLedgerSnapshot>[0] {
  return { transactions: [transaction()], companies: [company()], payments: [], paymentReversals: [], ledger: [], cashboxes: [], ...patch };
}

test('7.1 summary composes opening balance, posted payments and ledger movement exactly', () => {
  const snapshot = buildFinanceLedgerSnapshot(source({
    payments: [payment('p1', 600.25)],
    ledger: [ledger('l1', 'in', 100), ledger('l2', 'out', 50.25)],
    cashboxes: [cashbox(2_000)],
  }));
  assert.equal(snapshot.summary.totalFeesCents, 100_000n);
  assert.equal(snapshot.summary.collectedCents, 60_025n);
  assert.equal(snapshot.summary.outstandingCents, 39_975n);
  assert.equal(snapshot.summary.ledgerInCents, 10_000n);
  assert.equal(snapshot.summary.ledgerOutCents, 5_025n);
  assert.equal(snapshot.summary.openingBalanceCents, 200_000n);
  assert.equal(snapshot.summary.estimatedBalanceCents, 265_000n);
  assert.equal(snapshot.receivables[0]?.companyLabel, 'الاختبار');
});

test('reversed payment is excluded even when only the reversal record exposes the reversal', () => {
  const p = payment('p-rev', 700);
  const snapshot = buildFinanceLedgerSnapshot(source({
    payments: [p],
    paymentReversals: [{ id: 'r1', workspace_id: W, payment_id: p.id, reversed_at: '2026-09-06T10:00:00.000Z', reason: 'تصحيح', actor_user_id: null }],
  }));
  assert.equal(snapshot.summary.collectedCents, 0n);
  assert.equal(snapshot.summary.reversedPayments, 1);
  assert.equal(snapshot.summary.paymentIntegrityWarnings, 1);
  assert.equal(snapshot.entries[0]?.status, 'reversed');
});

test('matching reversed status and reversal record creates no integrity warning', () => {
  const p = payment('p-rev2', 700, { status: 'reversed' });
  const snapshot = buildFinanceLedgerSnapshot(source({
    payments: [p],
    paymentReversals: [{ id: 'r2', workspace_id: W, payment_id: p.id, reversed_at: '2026-09-06T10:00:00.000Z', reason: 'تصحيح', actor_user_id: null }],
  }));
  assert.equal(snapshot.summary.collectedCents, 0n);
  assert.equal(snapshot.summary.paymentIntegrityWarnings, 0);
});

test('overpayment is shown as credit rather than negative receivable', () => {
  const snapshot = buildFinanceLedgerSnapshot(source({ payments: [payment('p-credit', 1_250)] }));
  assert.equal(snapshot.summary.outstandingCents, 0n);
  assert.equal(snapshot.summary.creditCents, 25_000n);
  assert.equal(snapshot.receivables[0]?.outstandingCents, 0n);
  assert.equal(snapshot.receivables[0]?.creditCents, 25_000n);
});

test('unsafe sub-cent money fails closed instead of being rounded silently', () => {
  assert.throws(() => buildFinanceLedgerSnapshot(source({ payments: [payment('p-unsafe', 1.001)] })), FinanceUnsafeMoneyError);
});

test('deleted transactions do not contribute current receivables', () => {
  const snapshot = buildFinanceLedgerSnapshot(source({ transactions: [transaction({ deleted_at: '2026-09-01T00:00:00.000Z', deletion_reason: 'اختبار' })] }));
  assert.equal(snapshot.summary.totalFeesCents, 0n);
  assert.equal(snapshot.summary.outstandingCents, 0n);
});

test('money formatter keeps exact cents and Iraqi grouping', () => {
  assert.equal(formatFinanceMoney(123_456_789n), '1,234,567.89 د.ع');
  assert.equal(formatFinanceMoney(100_000n), '1,000 د.ع');
});
