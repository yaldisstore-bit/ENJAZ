import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_REPORT_PDF_LAYOUT,
  ReportPdfContractError,
  assertReportPdfPlanSafe,
  buildReportPdfIdentity,
  planReportPdfPages,
  reportPdfReservedZones,
  type ReportPdfBlock,
} from '../src/features/reports/reportPdfContract.ts';

const blocks = (...items: ReportPdfBlock[]) => items;

test('deterministic page planning never emits blank pages and replays exactly', () => {
  const source = blocks(
    { kind: 'atomic', id: 'title', height: 70 },
    { kind: 'flow', id: 'narrative', height: 920, minFragmentHeight: 80 },
    { kind: 'atomic', id: 'approval', height: 90 },
  );
  const a = planReportPdfPages(source);
  const b = planReportPdfPages(source);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 2);
  assert.ok(a.every((page) => page.fragments.length > 0));
  assert.deepEqual(a.map((page) => page.pageNumber), a.map((_, index) => index + 1));
  assert.doesNotThrow(() => assertReportPdfPlanSafe(a));
});

test('body fragments cannot enter signature, identity or footer reserved zones', () => {
  const zones = reportPdfReservedZones();
  assert.ok(zones.bodyBottom < zones.signatureTop);
  assert.ok(zones.signatureTop < zones.identityTop);
  assert.ok(zones.identityTop < zones.footerTop);

  const plan = planReportPdfPages(blocks({ kind: 'flow', id: 'long-arabic-body', height: 1800, minFragmentHeight: 64 }));
  for (const page of plan) {
    for (const fragment of page.fragments) {
      assert.ok(fragment.y >= zones.bodyTop);
      assert.ok(fragment.y + fragment.height <= zones.bodyBottom + 0.0001);
    }
  }
});

test('long tables split by rows, repeat their header and preserve row order', () => {
  const rows = Array.from({ length: 55 }, (_, index) => ({ id: `row-${String(index + 1).padStart(2, '0')}`, height: 28 + (index % 3) * 4 }));
  const plan = planReportPdfPages(blocks({ kind: 'table', id: 'ledger', headerHeight: 34, rows }));
  assert.ok(plan.length > 1);
  const fragments = plan.flatMap((page) => page.fragments);
  assert.ok(fragments.every((fragment) => fragment.kind === 'table' && fragment.repeatsTableHeader === true));
  const plannedRows = fragments.flatMap((fragment) => fragment.rowIds ?? []);
  assert.deepEqual(plannedRows, rows.map((row) => row.id));
  assert.equal(new Set(plannedRows).size, rows.length);
});

test('oversized atomic blocks and table rows fail closed instead of clipping', () => {
  const zones = reportPdfReservedZones();
  const capacity = zones.bodyBottom - zones.bodyTop;
  assert.throws(
    () => planReportPdfPages(blocks({ kind: 'atomic', id: 'giant-signature-card', height: capacity + 1 })),
    (error: unknown) => error instanceof ReportPdfContractError && error.code === 'REPORT_PDF_BLOCK_TOO_TALL',
  );
  assert.throws(
    () => planReportPdfPages(blocks({ kind: 'table', id: 'oversized-row-table', headerHeight: 40, rows: [{ id: 'bad-row', height: capacity }] })),
    (error: unknown) => error instanceof ReportPdfContractError && error.code === 'REPORT_PDF_ROW_TOO_TALL',
  );
});

test('invalid layouts fail closed before pagination', () => {
  assert.throws(
    () => reportPdfReservedZones({ ...DEFAULT_REPORT_PDF_LAYOUT, footerHeight: 800 }),
    (error: unknown) => error instanceof ReportPdfContractError && error.code === 'REPORT_PDF_LAYOUT_INVALID',
  );
  assert.throws(
    () => planReportPdfPages(blocks({ kind: 'atomic', id: 'duplicate', height: 40 }, { kind: 'atomic', id: 'duplicate', height: 40 })),
    (error: unknown) => error instanceof ReportPdfContractError && error.code === 'REPORT_PDF_ID_DUPLICATE',
  );
});

test('stable QR/barcode identity is deterministic and presentation text cannot enter it', () => {
  const input = {
    workspaceId: '11111111-1111-4111-8111-111111111111',
    reportKind: 'financial-period',
    reportId: 'report-2026-09',
    fingerprint: 'sha256_1234567890abcdef',
  } as const;
  const first = buildReportPdfIdentity(input);
  const second = buildReportPdfIdentity(input);
  assert.equal(first, second);
  assert.equal(first, 'ENJAZ:REPORT:v1:11111111-1111-4111-8111-111111111111:financial-period:report-2026-09:sha256_1234567890abcdef');
  assert.throws(() => buildReportPdfIdentity({ ...input, reportId: 'تقرير قابل للتغيير' }));
  assert.throws(() => buildReportPdfIdentity({ ...input, fingerprint: 'ok\nforged' }));
  assert.throws(() => buildReportPdfIdentity({ ...input, version: 0 }));
});
