import type { RowOf } from '../../data/contracts/dataTypes.ts';

export const FINANCE_RECENT_LEDGER_LIMIT = 80;

export interface FinanceSource {
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly companies: readonly RowOf<'companies'>[];
  readonly payments: readonly RowOf<'payments'>[];
  readonly paymentReversals: readonly RowOf<'payment_reversals'>[];
  readonly ledger: readonly RowOf<'financial_ledger_entries'>[];
  readonly cashboxes: readonly RowOf<'cashbox_accounts'>[];
}

export type FinanceEntrySource = 'payment' | 'ledger';
export type FinanceDirection = 'in' | 'out';

export interface FinanceLedgerItem {
  readonly id: string;
  readonly source: FinanceEntrySource;
  readonly direction: FinanceDirection;
  readonly amountCents: bigint;
  readonly occurredAt: string;
  readonly status: 'posted' | 'reversed';
  readonly title: string;
  readonly transactionId: string | null;
  readonly transactionLabel: string | null;
  readonly companyId: string | null;
  readonly companyLabel: string | null;
  readonly method: string | null;
  readonly category: string | null;
  readonly note: string | null;
}

export interface FinanceReceivableItem {
  readonly transactionId: string;
  readonly transactionLabel: string;
  readonly companyId: string;
  readonly companyLabel: string;
  readonly feeCents: bigint;
  readonly collectedCents: bigint;
  readonly outstandingCents: bigint;
  readonly creditCents: bigint;
}

export interface FinanceSummary {
  readonly totalFeesCents: bigint;
  readonly collectedCents: bigint;
  readonly outstandingCents: bigint;
  readonly creditCents: bigint;
  readonly ledgerInCents: bigint;
  readonly ledgerOutCents: bigint;
  readonly openingBalanceCents: bigint;
  readonly netMovementCents: bigint;
  readonly estimatedBalanceCents: bigint;
  readonly postedPayments: number;
  readonly reversedPayments: number;
  readonly paymentIntegrityWarnings: number;
  readonly activeCashboxes: number;
}

export interface FinanceLedgerSnapshot {
  readonly summary: FinanceSummary;
  readonly entries: readonly FinanceLedgerItem[];
  readonly receivables: readonly FinanceReceivableItem[];
  readonly counts: Readonly<{ transactions: number; companies: number; payments: number; ledger: number; cashboxes: number }>;
}

export class FinanceUnsafeMoneyError extends Error {
  readonly recordType: string;
  readonly recordId: string;
  readonly value: number;
  constructor(recordType: string, recordId: string, value: number) {
    super(`unsafe finance amount: ${recordType}:${recordId}`);
    this.name = 'FinanceUnsafeMoneyError';
    this.recordType = recordType;
    this.recordId = recordId;
    this.value = value;
  }
}

export function financeMoneyToCents(value: number, recordType: string, recordId: string): bigint {
  if (!Number.isFinite(value)) throw new FinanceUnsafeMoneyError(recordType, recordId, value);
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-6) throw new FinanceUnsafeMoneyError(recordType, recordId, value);
  return BigInt(rounded);
}

function safeTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function companyLabel(row: RowOf<'companies'> | undefined): string {
  if (!row) return 'شركة غير متاحة';
  return row.display_name?.trim() || row.legal_name.trim() || 'شركة بلا اسم صالح';
}

function transactionLabel(row: RowOf<'transactions'> | undefined): string {
  if (!row) return 'معاملة غير متاحة';
  return row.legacy_id?.trim() ? `معاملة ${row.legacy_id.trim()}` : row.type.trim() || `معاملة ${row.id.slice(0, 8)}`;
}

function ledgerTypeLabel(value: string): string {
  switch (value) {
    case 'expense': return 'مصروف';
    case 'advance': return 'سلفة';
    case 'refund': return 'استرداد';
    case 'adjustment': return 'تسوية';
    case 'opening_balance': return 'رصيد افتتاحي';
    default: return 'قيد مالي';
  }
}

function normalizedDirection(value: string): FinanceDirection { return value.trim().toLowerCase() === 'out' ? 'out' : 'in'; }

function grouped(value: bigint): string { return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

export function formatFinanceMoney(cents: bigint, currency = 'د.ع'): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = grouped(absolute / 100n);
  const fraction = absolute % 100n;
  const prefix = negative ? '-' : '';
  if (fraction === 0n) return `${prefix}${whole} ${currency}`;
  return `${prefix}${whole}.${fraction.toString().padStart(2, '0').replace(/0$/, '')} ${currency}`;
}

export function buildFinanceLedgerSnapshot(source: FinanceSource): FinanceLedgerSnapshot {
  const companiesById = new Map(source.companies.map((row) => [row.id, row] as const));
  const transactionsById = new Map(source.transactions.map((row) => [row.id, row] as const));
  const reversalPaymentIds = new Set(source.paymentReversals.map((row) => row.payment_id));
  const paidByTransaction = new Map<string, bigint>();
  let collectedCents = 0n, postedPayments = 0, reversedPayments = 0, paymentIntegrityWarnings = 0;

  const paymentEntries: FinanceLedgerItem[] = source.payments.map((payment) => {
    const statusReversed = payment.status.trim().toLowerCase() === 'reversed';
    const hasReversal = reversalPaymentIds.has(payment.id);
    const reversed = statusReversed || hasReversal;
    if (statusReversed !== hasReversal) paymentIntegrityWarnings += 1;
    const amountCents = financeMoneyToCents(payment.amount, 'payment', payment.id);
    if (reversed) reversedPayments += 1;
    else {
      postedPayments += 1;
      collectedCents += amountCents;
      paidByTransaction.set(payment.transaction_id, (paidByTransaction.get(payment.transaction_id) ?? 0n) + amountCents);
    }
    return Object.freeze({
      id: `payment:${payment.id}`, source: 'payment' as const, direction: 'in' as const, amountCents, occurredAt: payment.paid_at,
      status: reversed ? 'reversed' as const : 'posted' as const, title: `دفعة ${payment.receipt_ref.trim()}`, transactionId: payment.transaction_id,
      transactionLabel: transactionLabel(transactionsById.get(payment.transaction_id)), companyId: payment.company_id, companyLabel: companyLabel(companiesById.get(payment.company_id)), method: payment.method, category: 'payment', note: payment.note,
    });
  });

  let ledgerInCents = 0n, ledgerOutCents = 0n;
  const ledgerEntries: FinanceLedgerItem[] = source.ledger.map((entry) => {
    const amountCents = financeMoneyToCents(entry.amount, 'ledger', entry.id);
    const status = entry.status.trim().toLowerCase() === 'reversed' ? 'reversed' as const : 'posted' as const;
    const direction = normalizedDirection(entry.direction);
    if (status === 'posted') direction === 'in' ? ledgerInCents += amountCents : ledgerOutCents += amountCents;
    return Object.freeze({
      id: `ledger:${entry.id}`, source: 'ledger' as const, direction, amountCents, occurredAt: entry.occurred_at, status, title: ledgerTypeLabel(entry.entry_type),
      transactionId: entry.transaction_id, transactionLabel: entry.transaction_id ? transactionLabel(transactionsById.get(entry.transaction_id)) : null,
      companyId: entry.company_id, companyLabel: entry.company_id ? companyLabel(companiesById.get(entry.company_id)) : null, method: entry.method, category: entry.category, note: entry.note,
    });
  });

  let totalFeesCents = 0n, outstandingCents = 0n, creditCents = 0n;
  const receivables: FinanceReceivableItem[] = [];
  for (const transaction of source.transactions) {
    if (transaction.deleted_at !== null) continue;
    const feeCents = financeMoneyToCents(transaction.current_fee, 'transaction_fee', transaction.id);
    const transactionCollected = paidByTransaction.get(transaction.id) ?? 0n;
    totalFeesCents += feeCents;
    const outstanding = feeCents > transactionCollected ? feeCents - transactionCollected : 0n;
    const credit = transactionCollected > feeCents ? transactionCollected - feeCents : 0n;
    outstandingCents += outstanding;
    creditCents += credit;
    if (outstanding > 0n || credit > 0n) receivables.push(Object.freeze({ transactionId: transaction.id, transactionLabel: transactionLabel(transaction), companyId: transaction.company_id, companyLabel: companyLabel(companiesById.get(transaction.company_id)), feeCents, collectedCents: transactionCollected, outstandingCents: outstanding, creditCents: credit }));
  }
  receivables.sort((a, b) => a.outstandingCents === b.outstandingCents ? a.transactionId.localeCompare(b.transactionId) : a.outstandingCents > b.outstandingCents ? -1 : 1);

  let openingBalanceCents = 0n;
  for (const cashbox of source.cashboxes) openingBalanceCents += financeMoneyToCents(cashbox.opening_balance, 'cashbox_opening_balance', cashbox.id);
  const netMovementCents = collectedCents + ledgerInCents - ledgerOutCents;
  const entries = [...paymentEntries, ...ledgerEntries].sort((a, b) => safeTimestamp(b.occurredAt) - safeTimestamp(a.occurredAt) || a.id.localeCompare(b.id)).slice(0, FINANCE_RECENT_LEDGER_LIMIT);

  return Object.freeze({
    summary: Object.freeze({ totalFeesCents, collectedCents, outstandingCents, creditCents, ledgerInCents, ledgerOutCents, openingBalanceCents, netMovementCents, estimatedBalanceCents: openingBalanceCents + netMovementCents, postedPayments, reversedPayments, paymentIntegrityWarnings, activeCashboxes: source.cashboxes.filter((row) => row.active).length }),
    entries: Object.freeze(entries),
    receivables: Object.freeze(receivables),
    counts: Object.freeze({ transactions: source.transactions.length, companies: source.companies.length, payments: source.payments.length, ledger: source.ledger.length, cashboxes: source.cashboxes.length }),
  });
}
