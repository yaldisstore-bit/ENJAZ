import { buildFinanceLedgerSnapshot, financeMoneyToCents, type FinanceSource } from './financeModel.ts';

export type FinancialReportKind = 'period' | 'company' | 'transaction' | 'cashbox';
export type FinancialReportMovementSource = 'payment' | 'ledger';
export type FinancialReportMovementStatus = 'posted' | 'reversed';

export interface FinancialReportQuery {
  readonly kind: FinancialReportKind;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly companyId?: string | null;
  readonly transactionId?: string | null;
  readonly cashboxId?: string | null;
}

export interface FinancialReportScope {
  readonly kind: FinancialReportKind;
  readonly companyId: string | null;
  readonly companyLabel: string | null;
  readonly transactionId: string | null;
  readonly transactionLabel: string | null;
  readonly cashboxId: string | null;
  readonly cashboxLabel: string | null;
}

export interface FinancialReportMovement {
  readonly id: string;
  readonly source: FinancialReportMovementSource;
  readonly sourceId: string;
  readonly occurredAt: string;
  readonly direction: 'in' | 'out';
  readonly amountCents: bigint;
  readonly effectiveCents: bigint;
  readonly status: FinancialReportMovementStatus;
  readonly title: string;
  readonly companyId: string | null;
  readonly companyLabel: string | null;
  readonly transactionId: string | null;
  readonly transactionLabel: string | null;
  readonly evidenceRef: string;
}

export interface FinancialReportReceivable {
  readonly transactionId: string;
  readonly transactionLabel: string;
  readonly companyId: string;
  readonly companyLabel: string;
  readonly currentFeeCents: bigint;
  readonly collectedCents: bigint;
  readonly outstandingCents: bigint;
  readonly creditCents: bigint;
}

export interface FinancialReportTotals {
  readonly currentFeesCents: bigint;
  readonly collectedCents: bigint;
  readonly ledgerInCents: bigint;
  readonly ledgerOutCents: bigint;
  readonly netCashMovementCents: bigint;
  readonly outstandingAtSnapshotCents: bigint;
  readonly creditAtSnapshotCents: bigint;
  readonly openingBalanceCents: bigint;
}

export interface FinancialReportSnapshot {
  readonly version: '7.4';
  readonly kind: FinancialReportKind;
  readonly title: string;
  readonly generatedAt: string;
  readonly from: string | null;
  readonly to: string | null;
  readonly scope: FinancialReportScope;
  readonly totals: FinancialReportTotals;
  readonly movements: readonly FinancialReportMovement[];
  readonly receivables: readonly FinancialReportReceivable[];
  readonly disclosures: readonly string[];
  readonly provenance: Readonly<{
    financeAuthority: 'payments+payment_reversals+financial_ledger_entries+transactions+cashbox_accounts';
    movementLineCount: number;
    receivableLineCount: number;
    cashboxMovementAttribution: 'not-modeled' | 'not-applicable';
    m16ReportingHook: 'reserved-no-shadow-store';
  }>;
  readonly fingerprint: string;
}

export class FinancialReportFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialReportFilterError';
  }
}

function parseDate(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new FinancialReportFilterError(`invalid ${label} date`);
  return parsed;
}

function normalizeBound(value: string | null | undefined, endOfDay: boolean): { iso: string | null; ms: number | null } {
  if (!value?.trim()) return { iso: null, ms: null };
  const trimmed = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const normalized = dateOnly ? `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : trimmed;
  return { iso: new Date(parseDate(normalized, endOfDay ? 'to' : 'from')).toISOString(), ms: parseDate(normalized, endOfDay ? 'to' : 'from') };
}

function companyName(source: FinanceSource, id: string | null): string | null {
  if (!id) return null;
  const row = source.companies.find((item) => item.id === id);
  return row ? row.display_name?.trim() || row.legal_name.trim() || 'شركة بلا اسم صالح' : 'شركة غير متاحة';
}

function transactionName(source: FinanceSource, id: string | null): string | null {
  if (!id) return null;
  const row = source.transactions.find((item) => item.id === id);
  if (!row) return 'معاملة غير متاحة';
  return row.legacy_id?.trim() ? `معاملة ${row.legacy_id.trim()}` : row.type.trim() || `معاملة ${row.id.slice(0, 8)}`;
}

function cashboxName(source: FinanceSource, id: string | null): string | null {
  if (!id) return null;
  return source.cashboxes.find((item) => item.id === id)?.name.trim() || 'صندوق غير متاح';
}

function validateQuery(source: FinanceSource, query: FinancialReportQuery): FinancialReportScope {
  const companyId = query.kind === 'company' ? query.companyId?.trim() || null : null;
  const transactionId = query.kind === 'transaction' ? query.transactionId?.trim() || null : null;
  const cashboxId = query.kind === 'cashbox' ? query.cashboxId?.trim() || null : null;
  if (query.kind === 'company' && !companyId) throw new FinancialReportFilterError('company report requires companyId');
  if (query.kind === 'transaction' && !transactionId) throw new FinancialReportFilterError('transaction report requires transactionId');
  if (query.kind === 'cashbox' && !cashboxId) throw new FinancialReportFilterError('cashbox report requires cashboxId');
  if (companyId && !source.companies.some((item) => item.id === companyId)) throw new FinancialReportFilterError('unknown companyId');
  if (transactionId && !source.transactions.some((item) => item.id === transactionId)) throw new FinancialReportFilterError('unknown transactionId');
  if (cashboxId && !source.cashboxes.some((item) => item.id === cashboxId)) throw new FinancialReportFilterError('unknown cashboxId');
  const resolvedCompanyId = query.kind === 'transaction' && transactionId
    ? source.transactions.find((item) => item.id === transactionId)?.company_id ?? null
    : companyId;
  return Object.freeze({
    kind: query.kind,
    companyId: resolvedCompanyId,
    companyLabel: companyName(source, resolvedCompanyId),
    transactionId,
    transactionLabel: transactionName(source, transactionId),
    cashboxId,
    cashboxLabel: cashboxName(source, cashboxId),
  });
}

function inScope(scope: FinancialReportScope, companyId: string | null, transactionId: string | null): boolean {
  if (scope.kind === 'company') return companyId === scope.companyId;
  if (scope.kind === 'transaction') return transactionId === scope.transactionId;
  if (scope.kind === 'cashbox') return false;
  return true;
}

function inPeriod(ms: number, from: number | null, to: number | null): boolean {
  return (from === null || ms >= from) && (to === null || ms <= to);
}

function reportTitle(scope: FinancialReportScope): string {
  if (scope.kind === 'company') return `تقرير مالي — ${scope.companyLabel}`;
  if (scope.kind === 'transaction') return `تقرير مالي — ${scope.transactionLabel}`;
  if (scope.kind === 'cashbox') return `تقرير الصندوق — ${scope.cashboxLabel}`;
  return 'التقرير المالي للفترة';
}

function scopedSource(source: FinanceSource, scope: FinancialReportScope): FinanceSource {
  if (scope.kind === 'period') return source;
  if (scope.kind === 'cashbox') {
    return {
      companies: source.companies,
      transactions: [],
      payments: [],
      paymentReversals: [],
      ledger: [],
      cashboxes: source.cashboxes.filter((item) => item.id === scope.cashboxId),
    };
  }
  const transactions = source.transactions.filter((item) => scope.kind === 'company' ? item.company_id === scope.companyId : item.id === scope.transactionId);
  const transactionIds = new Set(transactions.map((item) => item.id));
  const payments = source.payments.filter((item) => transactionIds.has(item.transaction_id));
  const paymentIds = new Set(payments.map((item) => item.id));
  const ledger = source.ledger.filter((item) => transactionIds.has(item.transaction_id ?? '') || (scope.kind === 'company' && item.company_id === scope.companyId));
  return {
    companies: source.companies,
    transactions,
    payments,
    paymentReversals: source.paymentReversals.filter((item) => paymentIds.has(item.payment_id)),
    ledger,
    cashboxes: [],
  };
}

function fnvFingerprint(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const ch of text) {
    hash ^= BigInt(ch.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `ENJAZ-FR-${hash.toString(16).padStart(16, '0')}`;
}

export function buildFinancialReport(source: FinanceSource, query: FinancialReportQuery, generatedAtInput: Date | string = new Date()): FinancialReportSnapshot {
  const generated = generatedAtInput instanceof Date ? new Date(generatedAtInput) : new Date(generatedAtInput);
  if (!Number.isFinite(generated.getTime())) throw new FinancialReportFilterError('invalid generatedAt date');
  const from = normalizeBound(query.from, false);
  const to = normalizeBound(query.to, true);
  if (from.ms !== null && to.ms !== null && from.ms > to.ms) throw new FinancialReportFilterError('from must not be after to');
  const scope = validateQuery(source, query);
  const scoped = scopedSource(source, scope);
  const reversalIds = new Set(source.paymentReversals.map((item) => item.payment_id));
  const movements: FinancialReportMovement[] = [];
  let collectedCents = 0n;
  let ledgerInCents = 0n;
  let ledgerOutCents = 0n;

  for (const payment of source.payments) {
    if (!inScope(scope, payment.company_id, payment.transaction_id)) continue;
    const occurredMs = parseDate(payment.paid_at, `payment:${payment.id}`);
    if (!inPeriod(occurredMs, from.ms, to.ms)) continue;
    const amountCents = financeMoneyToCents(payment.amount, 'payment', payment.id);
    const reversed = payment.status.trim().toLowerCase() === 'reversed' || reversalIds.has(payment.id);
    if (!reversed) collectedCents += amountCents;
    movements.push(Object.freeze({
      id: `payment:${payment.id}`,
      source: 'payment',
      sourceId: payment.id,
      occurredAt: new Date(occurredMs).toISOString(),
      direction: 'in',
      amountCents,
      effectiveCents: reversed ? 0n : amountCents,
      status: reversed ? 'reversed' : 'posted',
      title: `إيصال ${payment.receipt_ref.trim()}`,
      companyId: payment.company_id,
      companyLabel: companyName(source, payment.company_id),
      transactionId: payment.transaction_id,
      transactionLabel: transactionName(source, payment.transaction_id),
      evidenceRef: `payments:${payment.id}:${payment.receipt_ref.trim()}`,
    }));
  }

  for (const entry of source.ledger) {
    if (!inScope(scope, entry.company_id, entry.transaction_id)) continue;
    const occurredMs = parseDate(entry.occurred_at, `ledger:${entry.id}`);
    if (!inPeriod(occurredMs, from.ms, to.ms)) continue;
    const amountCents = financeMoneyToCents(entry.amount, 'ledger', entry.id);
    const reversed = entry.status.trim().toLowerCase() === 'reversed';
    const direction = entry.direction.trim().toLowerCase() === 'out' ? 'out' as const : 'in' as const;
    if (!reversed) direction === 'out' ? ledgerOutCents += amountCents : ledgerInCents += amountCents;
    movements.push(Object.freeze({
      id: `ledger:${entry.id}`,
      source: 'ledger',
      sourceId: entry.id,
      occurredAt: new Date(occurredMs).toISOString(),
      direction,
      amountCents,
      effectiveCents: reversed ? 0n : direction === 'out' ? -amountCents : amountCents,
      status: reversed ? 'reversed' : 'posted',
      title: entry.category?.trim() || entry.entry_type.trim() || 'قيد مالي',
      companyId: entry.company_id,
      companyLabel: companyName(source, entry.company_id),
      transactionId: entry.transaction_id,
      transactionLabel: transactionName(source, entry.transaction_id),
      evidenceRef: `financial_ledger_entries:${entry.id}`,
    }));
  }

  movements.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id));
  const ledgerSnapshot = buildFinanceLedgerSnapshot(scoped);
  const receivables = ledgerSnapshot.receivables.map((item) => Object.freeze({
    transactionId: item.transactionId,
    transactionLabel: item.transactionLabel,
    companyId: item.companyId,
    companyLabel: item.companyLabel,
    currentFeeCents: item.feeCents,
    collectedCents: item.collectedCents,
    outstandingCents: item.outstandingCents,
    creditCents: item.creditCents,
  }));
  const openingBalanceCents = scope.kind === 'cashbox'
    ? scoped.cashboxes.reduce((sum, item) => sum + financeMoneyToCents(item.opening_balance, 'cashbox_opening_balance', item.id), 0n)
    : ledgerSnapshot.summary.openingBalanceCents;
  const disclosures = [
    'إجمالي الأتعاب والرصيد المفتوح يعكسان الحالة الحالية للسجلات المختارة؛ أما التحصيل وحركة القيود فمقيدان بالفترة المحددة.',
    'الدفعات والقيود المعكوسة تظهر في تفاصيل المصدر بقيمة فعالة صفر ولا تدخل في الإجماليات.',
    scope.kind === 'cashbox'
      ? 'المخطط الحالي لا يربط الدفعات أو القيود المالية بصندوق محدد؛ لذلك يعرض تقرير الصندوق الرصيد الافتتاحي وحالة الصندوق فقط ولا ينسب حركة مالية إليه تخميناً.'
      : 'كل سطر حركة يحتفظ بمرجع مباشر إلى سجل الدفعة أو القيد المالي المستخدم في الإجمالي.',
    'تكامل M16 محجوز كخطاف تقارير فقط؛ لا يتم إنشاء مخزن مالي موازٍ للعقود أو الأتعاب المحتجزة.',
  ] as const;
  const totals = Object.freeze({
    currentFeesCents: ledgerSnapshot.summary.totalFeesCents,
    collectedCents,
    ledgerInCents,
    ledgerOutCents,
    netCashMovementCents: collectedCents + ledgerInCents - ledgerOutCents,
    outstandingAtSnapshotCents: ledgerSnapshot.summary.outstandingCents,
    creditAtSnapshotCents: ledgerSnapshot.summary.creditCents,
    openingBalanceCents,
  });
  const canonical = JSON.stringify({
    version: '7.4', kind: scope.kind, from: from.iso, to: to.iso, scope,
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.toString()])),
    movements: movements.map((item) => [item.id, item.occurredAt, item.status, item.direction, item.amountCents.toString(), item.effectiveCents.toString(), item.evidenceRef]),
    receivables: receivables.map((item) => [item.transactionId, item.currentFeeCents.toString(), item.collectedCents.toString(), item.outstandingCents.toString(), item.creditCents.toString()]),
  });
  return Object.freeze({
    version: '7.4',
    kind: scope.kind,
    title: reportTitle(scope),
    generatedAt: generated.toISOString(),
    from: from.iso,
    to: to.iso,
    scope,
    totals,
    movements: Object.freeze(movements),
    receivables: Object.freeze(receivables),
    disclosures: Object.freeze([...disclosures]),
    provenance: Object.freeze({
      financeAuthority: 'payments+payment_reversals+financial_ledger_entries+transactions+cashbox_accounts',
      movementLineCount: movements.length,
      receivableLineCount: receivables.length,
      cashboxMovementAttribution: scope.kind === 'cashbox' ? 'not-modeled' : 'not-applicable',
      m16ReportingHook: 'reserved-no-shadow-store',
    }),
    fingerprint: fnvFingerprint(canonical),
  });
}

function stringifyBigints(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(stringifyBigints);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stringifyBigints(item)]));
  return value;
}

export function serializeFinancialReport(report: FinancialReportSnapshot): string {
  return JSON.stringify(stringifyBigints(report), null, 2);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function financialReportToCsv(report: FinancialReportSnapshot): string {
  const header = ['source', 'source_id', 'occurred_at', 'status', 'direction', 'amount_cents', 'effective_cents', 'company', 'transaction', 'evidence_ref'];
  const rows = report.movements.map((item) => [item.source, item.sourceId, item.occurredAt, item.status, item.direction, item.amountCents.toString(), item.effectiveCents.toString(), item.companyLabel ?? '', item.transactionLabel ?? '', item.evidenceRef]);
  return [header, ...rows].map((row) => row.map((cell) => csvCell(String(cell))).join(',')).join('\n');
}
