import assert from 'node:assert/strict';
import test from 'node:test';
import type { FinancialReportSnapshot } from '../src/features/finance/financeReports.ts';
import { buildFinancialReportPdfPlan, financialReportPdfBlocks } from '../src/features/reports/financialReportPdf.ts';
import { assertReportPdfPlanSafe } from '../src/features/reports/reportPdfContract.ts';

function report(movements = 4, receivables = 3): FinancialReportSnapshot {
  return Object.freeze({
    version: '7.4',
    kind: 'period',
    title: 'التقرير المالي للفترة',
    generatedAt: '2026-09-14T10:00:00.000Z',
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T23:59:59.999Z',
    scope: Object.freeze({ kind: 'period', companyId: null, companyLabel: null, transactionId: null, transactionLabel: null, cashboxId: null, cashboxLabel: null }),
    totals: Object.freeze({ currentFeesCents: 100000n, collectedCents: 50000n, ledgerInCents: 10000n, ledgerOutCents: 5000n, netCashMovementCents: 55000n, outstandingAtSnapshotCents: 50000n, creditAtSnapshotCents: 0n, openingBalanceCents: 0n }),
    movements: Object.freeze(Array.from({ length: movements }, (_, index) => Object.freeze({
      id: `payment:p${index}`,
      source: 'payment' as const,
      sourceId: `p${index}`,
      occurredAt: `2026-09-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
      direction: 'in' as const,
      amountCents: 1000n,
      effectiveCents: 1000n,
      status: 'posted' as const,
      title: index % 7 === 0 ? `إيصال طويل ${'مرجع '.repeat(18)}` : `إيصال ${index}`,
      companyId: null,
      companyLabel: index % 5 === 0 ? 'شركة ذات اسم عربي طويل لاختبار التفاف النص داخل خلايا التقرير' : null,
      transactionId: null,
      transactionLabel: null,
      evidenceRef: `payments:p${index}:receipt-${index}`,
    }))),
    receivables: Object.freeze(Array.from({ length: receivables }, (_, index) => Object.freeze({
      transactionId: `t-${index}`,
      transactionLabel: index % 4 === 0 ? `معاملة ${'طويلة '.repeat(12)}` : `معاملة ${index}`,
      companyId: `c-${index}`,
      companyLabel: index % 3 === 0 ? `شركة ${'تفصيل '.repeat(10)}` : `شركة ${index}`,
      currentFeeCents: 10000n,
      collectedCents: 5000n,
      outstandingCents: 5000n,
      creditCents: 0n,
    }))),
    disclosures: Object.freeze(['التقرير مبني على المصدر المالي الموثوق.', 'لا يتم إنشاء أرصدة أو حركات غير موجودة في المصدر.']),
    provenance: Object.freeze({
      financeAuthority: 'payments+payment_reversals+financial_ledger_entries+transactions+cashbox_accounts',
      movementLineCount: movements,
      receivableLineCount: receivables,
      cashboxMovementAttribution: 'not-applicable',
      m16ReportingHook: 'reserved-no-shadow-store',
    }),
    fingerprint: 'ENJAZ-FR-0123456789abcdef',
  });
}

test('financial report adapter produces safe deterministic pages and stable identity', () => {
  const source = report(40, 24);
  const workspace = '11111111-1111-4111-8111-111111111111';
  const first = buildFinancialReportPdfPlan(workspace, source);
  const second = buildFinancialReportPdfPlan(workspace, source);
  assert.deepEqual(first, second);
  assert.ok(first.pageCount > 1);
  assert.equal(first.pageCount, first.pages.length);
  assert.equal(first.movementRows, 40);
  assert.equal(first.receivableRows, 24);
  assert.match(first.identity, /^ENJAZ:REPORT:v1:/);
  assert.doesNotThrow(() => assertReportPdfPlanSafe(first.pages));
});

test('financial report rows are represented exactly once in the deterministic plan', () => {
  const source = report(31, 17);
  const blocks = financialReportPdfBlocks(source);
  const movement = blocks.find((block) => block.id === 'report-movements');
  const receivable = blocks.find((block) => block.id === 'report-receivables');
  assert.equal(movement?.kind, 'table');
  assert.equal(receivable?.kind, 'table');
  if (movement?.kind !== 'table' || receivable?.kind !== 'table') assert.fail('expected report tables');
  assert.equal(movement.rows.length, 31);
  assert.equal(receivable.rows.length, 17);
  assert.equal(new Set(movement.rows.map((row) => row.id)).size, 31);
  assert.equal(new Set(receivable.rows.map((row) => row.id)).size, 17);
});

test('different report fingerprints produce different QR/barcode identities', () => {
  const workspace = '11111111-1111-4111-8111-111111111111';
  const first = buildFinancialReportPdfPlan(workspace, report());
  const changed = Object.freeze({ ...report(), fingerprint: 'ENJAZ-FR-fedcba9876543210' }) as FinancialReportSnapshot;
  const second = buildFinancialReportPdfPlan(workspace, changed);
  assert.notEqual(first.identity, second.identity);
});
