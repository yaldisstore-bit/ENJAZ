export type ReportKind = 'period' | 'company' | 'transaction' | 'cashbox';
export type Company = { id: string; workspace_id: string; legal_name: string; display_name: string | null };
export type Transaction = { id: string; workspace_id: string; company_id: string; type: string; current_fee: number; deleted_at: string | null; legacy_id: string | null };
export type Payment = { id: string; workspace_id: string; transaction_id: string; company_id: string; amount: number; paid_at: string; status: string; receipt_ref: string; cashbox_id: string | null };
export type Reversal = { id: string; workspace_id: string; payment_id: string };
export type Ledger = { id: string; workspace_id: string; transaction_id: string | null; company_id: string | null; entry_type: string; direction: string; amount: number; category: string | null; occurred_at: string; status: string };
export type Cashbox = { id: string; workspace_id: string; name: string; opening_balance: number; active: boolean };
export type Source = { companies: Company[]; transactions: Transaction[]; payments: Payment[]; paymentReversals: Reversal[]; ledger: Ledger[]; cashboxes: Cashbox[] };
export type Query = { kind: ReportKind; from?: string | null; to?: string | null; companyId?: string | null; transactionId?: string | null; cashboxId?: string | null };
export type Movement = { id: string; source: 'payment' | 'ledger'; sourceId: string; occurredAt: string; direction: 'in' | 'out'; amountCents: bigint; effectiveCents: bigint; status: 'posted' | 'reversed'; title: string; companyId: string | null; companyLabel: string | null; transactionId: string | null; transactionLabel: string | null; evidenceRef: string };
export type Receivable = { transactionId: string; transactionLabel: string; companyId: string; companyLabel: string; currentFeeCents: bigint; collectedCents: bigint; outstandingCents: bigint; creditCents: bigint };
export type Scope = { kind: ReportKind; companyId: string | null; companyLabel: string | null; transactionId: string | null; transactionLabel: string | null; cashboxId: string | null; cashboxLabel: string | null };
export type Snapshot = {
  version: '7.4'; kind: ReportKind; title: string; generatedAt: string; from: string | null; to: string | null; scope: Scope;
  totals: { currentFeesCents: bigint; collectedCents: bigint; ledgerInCents: bigint; ledgerOutCents: bigint; netCashMovementCents: bigint; outstandingAtSnapshotCents: bigint; creditAtSnapshotCents: bigint; openingBalanceCents: bigint };
  movements: Movement[]; receivables: Receivable[]; disclosures: string[]; fingerprint: string;
};

export class ReportInputError extends Error {
  constructor(message: string) { super(message); this.name = 'ReportInputError'; }
}

function moneyToCents(value: number, label: string): bigint {
  if (!Number.isFinite(value)) throw new ReportInputError(`unsafe ${label}`);
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-6) throw new ReportInputError(`unsafe ${label}`);
  return BigInt(rounded);
}
function parseDate(value: string, label: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new ReportInputError(`invalid ${label}`);
  return ms;
}
function normalizeBound(value: string | null | undefined, endOfDay: boolean): { iso: string | null; ms: number | null } {
  if (!value?.trim()) return { iso: null, ms: null };
  const input = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const normalized = dateOnly ? `${input}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : input;
  const ms = parseDate(normalized, endOfDay ? 'to' : 'from');
  return { iso: new Date(ms).toISOString(), ms };
}
function companyName(source: Source, id: string | null): string | null {
  if (!id) return null;
  const row = source.companies.find((item) => item.id === id);
  return row ? row.display_name?.trim() || row.legal_name.trim() || 'شركة بلا اسم صالح' : 'شركة غير متاحة';
}
function transactionName(source: Source, id: string | null): string | null {
  if (!id) return null;
  const row = source.transactions.find((item) => item.id === id);
  if (!row) return 'معاملة غير متاحة';
  return row.legacy_id?.trim() ? `معاملة ${row.legacy_id.trim()}` : row.type.trim() || `معاملة ${row.id.slice(0, 8)}`;
}
function cashboxName(source: Source, id: string | null): string | null {
  if (!id) return null;
  return source.cashboxes.find((item) => item.id === id)?.name.trim() || 'صندوق غير متاح';
}
function inPeriod(ms: number, from: number | null, to: number | null): boolean { return (from === null || ms >= from) && (to === null || ms <= to); }
function fnvFingerprint(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const ch of text) { hash ^= BigInt(ch.codePointAt(0) ?? 0); hash = BigInt.asUintN(64, hash * 0x100000001b3n); }
  return `ENJAZ-FR-${hash.toString(16).padStart(16, '0')}`;
}

export function buildServerFinancialReport(source: Source, query: Query, generatedAtInput: Date | string = new Date()): Snapshot {
  const generated = generatedAtInput instanceof Date ? new Date(generatedAtInput) : new Date(generatedAtInput);
  if (!Number.isFinite(generated.getTime())) throw new ReportInputError('invalid generatedAt');
  const from = normalizeBound(query.from, false);
  const to = normalizeBound(query.to, true);
  if (from.ms !== null && to.ms !== null && from.ms > to.ms) throw new ReportInputError('from after to');

  const companyId = query.kind === 'company' ? query.companyId?.trim() || null : null;
  const transactionId = query.kind === 'transaction' ? query.transactionId?.trim() || null : null;
  const cashboxId = query.kind === 'cashbox' ? query.cashboxId?.trim() || null : null;
  if (query.kind === 'company' && !companyId) throw new ReportInputError('companyId required');
  if (query.kind === 'transaction' && !transactionId) throw new ReportInputError('transactionId required');
  if (query.kind === 'cashbox' && !cashboxId) throw new ReportInputError('cashboxId required');
  if (companyId && !source.companies.some((item) => item.id === companyId)) throw new ReportInputError('unknown companyId');
  if (transactionId && !source.transactions.some((item) => item.id === transactionId)) throw new ReportInputError('unknown transactionId');
  if (cashboxId && !source.cashboxes.some((item) => item.id === cashboxId)) throw new ReportInputError('unknown cashboxId');

  const resolvedCompanyId = query.kind === 'transaction' && transactionId ? source.transactions.find((item) => item.id === transactionId)?.company_id ?? null : companyId;
  const scope: Scope = {
    kind: query.kind,
    companyId: resolvedCompanyId,
    companyLabel: companyName(source, resolvedCompanyId),
    transactionId,
    transactionLabel: transactionName(source, transactionId),
    cashboxId,
    cashboxLabel: cashboxName(source, cashboxId),
  };
  const inScope = (cid: string | null, tid: string | null) => scope.kind === 'company' ? cid === scope.companyId : scope.kind === 'transaction' ? tid === scope.transactionId : scope.kind === 'cashbox' ? false : true;
  const reversalIds = new Set(source.paymentReversals.map((item) => item.payment_id));
  const movements: Movement[] = [];
  let collectedCents = 0n, ledgerInCents = 0n, ledgerOutCents = 0n;

  for (const payment of source.payments) {
    if (!inScope(payment.company_id, payment.transaction_id)) continue;
    const occurredMs = parseDate(payment.paid_at, `payment:${payment.id}`);
    if (!inPeriod(occurredMs, from.ms, to.ms)) continue;
    const amountCents = moneyToCents(payment.amount, `payment:${payment.id}`);
    const reversed = payment.status.trim().toLowerCase() === 'reversed' || reversalIds.has(payment.id);
    if (!reversed) collectedCents += amountCents;
    movements.push({
      id: `payment:${payment.id}`, source: 'payment', sourceId: payment.id, occurredAt: new Date(occurredMs).toISOString(), direction: 'in', amountCents,
      effectiveCents: reversed ? 0n : amountCents, status: reversed ? 'reversed' : 'posted', title: `إيصال ${payment.receipt_ref.trim()}`,
      companyId: payment.company_id, companyLabel: companyName(source, payment.company_id), transactionId: payment.transaction_id,
      transactionLabel: transactionName(source, payment.transaction_id), evidenceRef: `payments:${payment.id}:${payment.receipt_ref.trim()}`,
    });
  }
  for (const entry of source.ledger) {
    if (!inScope(entry.company_id, entry.transaction_id)) continue;
    const occurredMs = parseDate(entry.occurred_at, `ledger:${entry.id}`);
    if (!inPeriod(occurredMs, from.ms, to.ms)) continue;
    const amountCents = moneyToCents(entry.amount, `ledger:${entry.id}`);
    const reversed = entry.status.trim().toLowerCase() === 'reversed';
    const direction = entry.direction.trim().toLowerCase() === 'out' ? 'out' as const : 'in' as const;
    if (!reversed) direction === 'out' ? ledgerOutCents += amountCents : ledgerInCents += amountCents;
    movements.push({
      id: `ledger:${entry.id}`, source: 'ledger', sourceId: entry.id, occurredAt: new Date(occurredMs).toISOString(), direction, amountCents,
      effectiveCents: reversed ? 0n : direction === 'out' ? -amountCents : amountCents, status: reversed ? 'reversed' : 'posted',
      title: entry.category?.trim() || entry.entry_type.trim() || 'قيد مالي', companyId: entry.company_id, companyLabel: companyName(source, entry.company_id),
      transactionId: entry.transaction_id, transactionLabel: transactionName(source, entry.transaction_id), evidenceRef: `financial_ledger_entries:${entry.id}`,
    });
  }
  movements.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id));

  const scopedTransactions = scope.kind === 'period' ? source.transactions : scope.kind === 'cashbox' ? [] : source.transactions.filter((item) => scope.kind === 'company' ? item.company_id === scope.companyId : item.id === scope.transactionId);
  const scopedTransactionIds = new Set(scopedTransactions.map((item) => item.id));
  const scopedPayments = source.payments.filter((item) => scopedTransactionIds.has(item.transaction_id));
  const paidByTransaction = new Map<string, bigint>();
  for (const payment of scopedPayments) {
    const reversed = payment.status.trim().toLowerCase() === 'reversed' || reversalIds.has(payment.id);
    if (!reversed) paidByTransaction.set(payment.transaction_id, (paidByTransaction.get(payment.transaction_id) ?? 0n) + moneyToCents(payment.amount, `payment:${payment.id}`));
  }
  let currentFeesCents = 0n, outstandingCents = 0n, creditCents = 0n;
  const receivables: Receivable[] = [];
  for (const transaction of scopedTransactions) {
    if (transaction.deleted_at !== null) continue;
    const feeCents = moneyToCents(transaction.current_fee, `fee:${transaction.id}`);
    const transactionCollected = paidByTransaction.get(transaction.id) ?? 0n;
    const outstanding = feeCents > transactionCollected ? feeCents - transactionCollected : 0n;
    const credit = transactionCollected > feeCents ? transactionCollected - feeCents : 0n;
    currentFeesCents += feeCents;
    outstandingCents += outstanding;
    creditCents += credit;
    if (outstanding > 0n || credit > 0n) receivables.push({
      transactionId: transaction.id, transactionLabel: transactionName(source, transaction.id)!, companyId: transaction.company_id,
      companyLabel: companyName(source, transaction.company_id)!, currentFeeCents: feeCents, collectedCents: transactionCollected,
      outstandingCents: outstanding, creditCents: credit,
    });
  }
  receivables.sort((a, b) => a.outstandingCents === b.outstandingCents ? a.transactionId.localeCompare(b.transactionId) : a.outstandingCents > b.outstandingCents ? -1 : 1);

  const openingBalanceCents = scope.kind === 'period'
    ? source.cashboxes.reduce((sum, item) => sum + moneyToCents(item.opening_balance, `cashbox:${item.id}`), 0n)
    : scope.kind === 'cashbox'
      ? source.cashboxes.filter((item) => item.id === scope.cashboxId).reduce((sum, item) => sum + moneyToCents(item.opening_balance, `cashbox:${item.id}`), 0n)
      : 0n;
  const totals = {
    currentFeesCents,
    collectedCents,
    ledgerInCents,
    ledgerOutCents,
    netCashMovementCents: collectedCents + ledgerInCents - ledgerOutCents,
    outstandingAtSnapshotCents: outstandingCents,
    creditAtSnapshotCents: creditCents,
    openingBalanceCents,
  };
  const canonical = JSON.stringify({
    version: '7.4', kind: scope.kind, from: from.iso, to: to.iso, scope,
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.toString()])),
    movements: movements.map((item) => [item.id, item.occurredAt, item.status, item.direction, item.amountCents.toString(), item.effectiveCents.toString(), item.evidenceRef]),
    receivables: receivables.map((item) => [item.transactionId, item.currentFeeCents.toString(), item.collectedCents.toString(), item.outstandingCents.toString(), item.creditCents.toString()]),
  });
  const title = scope.kind === 'company' ? `تقرير مالي — ${scope.companyLabel}` : scope.kind === 'transaction' ? `تقرير مالي — ${scope.transactionLabel}` : scope.kind === 'cashbox' ? `تقرير الصندوق — ${scope.cashboxLabel}` : 'التقرير المالي للفترة';
  return {
    version: '7.4', kind: scope.kind, title, generatedAt: generated.toISOString(), from: from.iso, to: to.iso, scope, totals, movements, receivables,
    disclosures: [
      'إجمالي الأتعاب والرصيد المفتوح يعكسان الحالة الحالية للسجلات المختارة؛ أما التحصيل وحركة القيود فمقيدان بالفترة المحددة.',
      'الدفعات والقيود المعكوسة تظهر في تفاصيل المصدر بقيمة فعالة صفر ولا تدخل في الإجماليات.',
      scope.kind === 'cashbox'
        ? 'المخطط الحالي لا يربط الدفعات أو القيود المالية بصندوق محدد؛ لذلك يعرض تقرير الصندوق الرصيد الافتتاحي وحالة الصندوق فقط ولا ينسب حركة مالية إليه تخميناً.'
        : 'كل سطر حركة يحتفظ بمرجع مباشر إلى سجل الدفعة أو القيد المالي المستخدم في الإجمالي.',
      'تكامل M16 محجوز كخطاف تقارير فقط؛ لا يتم إنشاء مخزن مالي موازٍ للعقود أو الأتعاب المحتجزة.',
    ],
    fingerprint: fnvFingerprint(canonical),
  };
}

export function reportIdentity(workspaceId: string, report: Snapshot): string {
  const scope = report.scope;
  const scopedId = scope.transactionId ?? scope.companyId ?? scope.cashboxId ?? 'workspace';
  const from = report.from?.slice(0, 10) ?? 'start';
  const to = report.to?.slice(0, 10) ?? 'end';
  const reportId = `${report.kind}-${scopedId}-${from}-${to}`.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 160);
  const fingerprint = report.fingerprint.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `ENJAZ:REPORT:v1:${workspaceId}:finance-${report.kind}:${reportId}:${fingerprint}`;
}
