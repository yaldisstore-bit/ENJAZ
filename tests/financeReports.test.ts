import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { buildFinancialReport, financialReportToCsv, FinancialReportFilterError, serializeFinancialReport } from '../src/features/finance/financeReports.ts';
import { FinanceUnsafeMoneyError, type FinanceSource } from '../src/features/finance/financeModel.ts';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const T2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const B1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const GENERATED = '2026-09-07T09:30:00.000Z';

function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: W, legal_name: name, display_name: name, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: GENERATED, deleted_at: null };
}

function transaction(id: string, companyId: string, fee: number, legacy: string): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: companyId, primary_contact_id: null, type: 'تأسيس', department: null, status: 'active', priority: 'normal', current_fee: fee, created_at: '2026-01-01T00:00:00.000Z', updated_at: GENERATED, last_activity_at: GENERATED, completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: legacy, legacy_source: null };
}

function payment(id: string, transactionId: string, companyId: string, amount: number, paidAt: string, status = 'posted'): RowOf<'payments'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, amount, method: 'cash', paid_at: paidAt, status, receipt_ref: `R-${id}`, note: null, legacy_id: null, legacy_source: null, created_at: paidAt };
}

function ledger(id: string, direction: 'in' | 'out', amount: number, occurredAt: string, companyId: string | null = null, transactionId: string | null = null, status = 'posted'): RowOf<'financial_ledger_entries'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, entry_type: direction === 'out' ? 'expense' : 'adjustment', direction, amount, method: null, category: 'اختبار', source: 'phase74-test', occurred_at: occurredAt, status, note: null, reversal_reason: null, reversed_at: status === 'reversed' ? occurredAt : null, metadata: {}, created_at: occurredAt };
}

function cashbox(id: string, opening = 500): RowOf<'cashbox_accounts'> {
  return { id, workspace_id: W, name: 'الصندوق الرئيسي', opening_balance: opening, opened_at: '2026-01-01T00:00:00.000Z', active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: GENERATED };
}

function source(patch: Partial<FinanceSource> = {}): FinanceSource {
  return {
    companies: [company(C1, 'شركة ألف'), company(C2, 'شركة باء')],
    transactions: [transaction(T1, C1, 1_000, '1001'), transaction(T2, C2, 2_000, '1002')],
    payments: [],
    paymentReversals: [],
    ledger: [],
    cashboxes: [cashbox(B1)],
    ...patch,
  };
}

test('7.4 period report uses exact posted movement totals and keeps reversed lines at zero effect', () => {
  const posted = payment('p1', T1, C1, 400, '2026-09-02T10:00:00.000Z');
  const reversed = payment('p2', T1, C1, 300, '2026-09-03T10:00:00.000Z', 'reversed');
  const report = buildFinancialReport(source({
    payments: [posted, reversed],
    paymentReversals: [{ id: 'r1', workspace_id: W, payment_id: reversed.id, reversed_at: '2026-09-04T10:00:00.000Z', reason: 'تصحيح', actor_user_id: null }],
    ledger: [ledger('l1', 'in', 50, '2026-09-04T10:00:00.000Z'), ledger('l2', 'out', 100, '2026-09-05T10:00:00.000Z')],
  }), { kind: 'period', from: '2026-09-01', to: '2026-09-30' }, GENERATED);
  assert.equal(report.totals.collectedCents, 40_000n);
  assert.equal(report.totals.ledgerInCents, 5_000n);
  assert.equal(report.totals.ledgerOutCents, 10_000n);
  assert.equal(report.totals.netCashMovementCents, 35_000n);
  assert.equal(report.movements.find((item) => item.sourceId === reversed.id)?.effectiveCents, 0n);
  assert.equal(report.movements.length, 4);
});

test('company report cannot absorb unrelated company or unscoped ledger movement', () => {
  const report = buildFinancialReport(source({
    payments: [payment('p3', T1, C1, 300, '2026-09-02T10:00:00.000Z'), payment('p4', T2, C2, 700, '2026-09-02T10:00:00.000Z')],
    ledger: [ledger('l3', 'in', 25, '2026-09-03T10:00:00.000Z', C1, T1), ledger('l4', 'in', 900, '2026-09-03T10:00:00.000Z')],
  }), { kind: 'company', companyId: C1, from: '2026-09-01', to: '2026-09-30' }, GENERATED);
  assert.equal(report.scope.companyId, C1);
  assert.equal(report.totals.currentFeesCents, 100_000n);
  assert.equal(report.totals.collectedCents, 30_000n);
  assert.equal(report.totals.ledgerInCents, 2_500n);
  assert.ok(report.movements.every((item) => item.companyId === C1 || item.transactionId === T1));
});

test('transaction report has direct drill-down provenance and deterministic ordering', () => {
  const report = buildFinancialReport(source({
    payments: [payment('p6', T1, C1, 100, '2026-09-03T10:00:00.000Z'), payment('p5', T1, C1, 200, '2026-09-01T10:00:00.000Z')],
  }), { kind: 'transaction', transactionId: T1, from: '2026-09-01', to: '2026-09-30' }, GENERATED);
  assert.equal(report.scope.transactionId, T1);
  assert.equal(report.scope.companyId, C1);
  assert.deepEqual(report.movements.map((item) => item.sourceId), ['p5', 'p6']);
  assert.ok(report.movements.every((item) => item.evidenceRef.startsWith('payments:')));
  assert.match(report.fingerprint, /^ENJAZ-FR-[0-9a-f]{16}$/);
});

test('cashbox report refuses fabricated per-cashbox movement attribution', () => {
  const report = buildFinancialReport(source({
    payments: [payment('p7', T1, C1, 500, '2026-09-02T10:00:00.000Z')],
    ledger: [ledger('l7', 'out', 100, '2026-09-03T10:00:00.000Z')],
  }), { kind: 'cashbox', cashboxId: B1, from: '2026-09-01', to: '2026-09-30' }, GENERATED);
  assert.equal(report.totals.openingBalanceCents, 50_000n);
  assert.equal(report.movements.length, 0);
  assert.equal(report.totals.netCashMovementCents, 0n);
  assert.equal(report.provenance.cashboxMovementAttribution, 'not-modeled');
  assert.ok(report.disclosures.some((item) => item.includes('لا يربط الدفعات أو القيود المالية بصندوق محدد')));
});

test('date filters are inclusive and reject reversed ranges or malformed source dates', () => {
  const exact = payment('p8', T1, C1, 100, '2026-09-30T23:59:59.999Z');
  const report = buildFinancialReport(source({ payments: [exact] }), { kind: 'period', from: '2026-09-30', to: '2026-09-30' }, GENERATED);
  assert.equal(report.movements.length, 1);
  assert.throws(() => buildFinancialReport(source(), { kind: 'period', from: '2026-10-01', to: '2026-09-01' }, GENERATED), FinancialReportFilterError);
  assert.throws(() => buildFinancialReport(source({ payments: [payment('bad-date', T1, C1, 100, 'not-a-date')] }), { kind: 'period' }, GENERATED), FinancialReportFilterError);
});

test('report fingerprints are independent of generation time and export BigInt safely', () => {
  const base = source({ payments: [payment('p9', T1, C1, 125, '2026-09-01T10:00:00.000Z')] });
  const a = buildFinancialReport(base, { kind: 'period', from: '2026-09-01', to: '2026-09-30' }, '2026-09-07T09:00:00.000Z');
  const b = buildFinancialReport(base, { kind: 'period', from: '2026-09-01', to: '2026-09-30' }, '2026-09-07T10:00:00.000Z');
  assert.equal(a.fingerprint, b.fingerprint);
  assert.doesNotThrow(() => JSON.parse(serializeFinancialReport(a)));
  assert.match(financialReportToCsv(a), /evidence_ref/);
  assert.match(financialReportToCsv(a), /payments:p9:R-p9/);
});

test('unknown report targets fail closed', () => {
  assert.throws(() => buildFinancialReport(source(), { kind: 'company', companyId: 'missing' }, GENERATED), FinancialReportFilterError);
  assert.throws(() => buildFinancialReport(source(), { kind: 'transaction', transactionId: 'missing' }, GENERATED), FinancialReportFilterError);
  assert.throws(() => buildFinancialReport(source(), { kind: 'cashbox', cashboxId: 'missing' }, GENERATED), FinancialReportFilterError);
});

test('unsafe sub-cent money remains rejected through the shared finance boundary', () => {
  assert.throws(() => buildFinancialReport(source({ payments: [payment('p10', T1, C1, 1.001, '2026-09-01T10:00:00.000Z')] }), { kind: 'period' }, GENERATED), FinanceUnsafeMoneyError);
});
