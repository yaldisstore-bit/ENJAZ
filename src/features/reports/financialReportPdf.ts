import type { FinancialReportSnapshot } from '../finance/financeReports.ts';
import {
  buildReportPdfIdentity,
  planReportPdfPages,
  type ReportPdfBlock,
  type ReportPdfPagePlan,
} from './reportPdfContract.ts';

export type FinancialReportPdfPlan = Readonly<{
  schema: 'enjaz.financial-report-pdf-plan.v1';
  reportFingerprint: string;
  identity: string;
  pages: readonly ReportPdfPagePlan[];
  pageCount: number;
  movementRows: number;
  receivableRows: number;
  disclosureRows: number;
}>;

function stableReportId(report: FinancialReportSnapshot): string {
  const scope = report.scope;
  const scopedId = scope.transactionId ?? scope.companyId ?? scope.cashboxId ?? 'workspace';
  const from = report.from?.slice(0, 10) ?? 'start';
  const to = report.to?.slice(0, 10) ?? 'end';
  return `${report.kind}-${scopedId}-${from}-${to}`.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 160);
}

function movementRowHeight(report: FinancialReportSnapshot, index: number): number {
  const row = report.movements[index]!;
  const textLoad = row.title.length + row.evidenceRef.length + (row.companyLabel?.length ?? 0) + (row.transactionLabel?.length ?? 0);
  return textLoad > 130 ? 42 : textLoad > 80 ? 36 : 30;
}

function receivableRowHeight(report: FinancialReportSnapshot, index: number): number {
  const row = report.receivables[index]!;
  const textLoad = row.transactionLabel.length + row.companyLabel.length;
  return textLoad > 90 ? 38 : textLoad > 55 ? 34 : 30;
}

export function financialReportPdfBlocks(report: FinancialReportSnapshot): readonly ReportPdfBlock[] {
  const disclosureHeight = Math.max(42, report.disclosures.reduce((sum, text) => sum + Math.max(20, Math.ceil(text.length / 70) * 17), 0));
  return Object.freeze([
    Object.freeze({ kind: 'atomic' as const, id: 'report-header', height: 74 }),
    Object.freeze({ kind: 'atomic' as const, id: 'report-totals', height: 88 }),
    Object.freeze({
      kind: 'table' as const,
      id: 'report-movements',
      headerHeight: 30,
      rows: Object.freeze(report.movements.map((row, index) => Object.freeze({ id: `movement-${row.source}-${row.sourceId}`, height: movementRowHeight(report, index) }))),
    }),
    Object.freeze({
      kind: 'table' as const,
      id: 'report-receivables',
      headerHeight: 30,
      rows: Object.freeze(report.receivables.map((row, index) => Object.freeze({ id: `receivable-${row.transactionId}`, height: receivableRowHeight(report, index) }))),
    }),
    Object.freeze({ kind: 'flow' as const, id: 'report-disclosures', height: disclosureHeight, minFragmentHeight: 34 }),
    Object.freeze({ kind: 'atomic' as const, id: 'report-provenance', height: 74 }),
  ]);
}

export function buildFinancialReportPdfPlan(workspaceId: string, report: FinancialReportSnapshot): FinancialReportPdfPlan {
  const pages = planReportPdfPages(financialReportPdfBlocks(report));
  const fingerprint = report.fingerprint.replace(/[^A-Za-z0-9._-]+/g, '_');
  const identity = buildReportPdfIdentity({
    workspaceId,
    reportKind: `finance-${report.kind}`,
    reportId: stableReportId(report),
    fingerprint,
  });
  return Object.freeze({
    schema: 'enjaz.financial-report-pdf-plan.v1',
    reportFingerprint: report.fingerprint,
    identity,
    pages,
    pageCount: pages.length,
    movementRows: report.movements.length,
    receivableRows: report.receivables.length,
    disclosureRows: report.disclosures.length,
  });
}
