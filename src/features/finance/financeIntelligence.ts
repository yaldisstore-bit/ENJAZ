import type { FinanceSource } from './financeModel.ts';
import { buildFinanceLedgerSnapshot, financeMoneyToCents } from './financeModel.ts';

const DAY_MS = 86_400_000;
const AGING_WINDOWS = Object.freeze([
  Object.freeze({ key: '0_30' as const, label: '0–30 يوم', min: 0, max: 30 }),
  Object.freeze({ key: '31_60' as const, label: '31–60 يوم', min: 31, max: 60 }),
  Object.freeze({ key: '61_90' as const, label: '61–90 يوم', min: 61, max: 90 }),
  Object.freeze({ key: '91_plus' as const, label: 'أكثر من 90 يوم', min: 91, max: null }),
]);

export type FinanceAgingBucketKey = typeof AGING_WINDOWS[number]['key'];
export type FinanceAttentionLevel = 'watch' | 'high' | 'critical';
export type FinanceHealthBand = 'healthy' | 'watch' | 'high_risk';
export type FinanceSignalSeverity = 'info' | 'watch' | 'high';

export interface FinanceAgingBucket {
  readonly key: FinanceAgingBucketKey;
  readonly label: string;
  readonly minDays: number;
  readonly maxDays: number | null;
  readonly receivableCount: number;
  readonly outstandingCents: bigint;
}

export interface FinanceAttentionItem {
  readonly transactionId: string;
  readonly transactionLabel: string;
  readonly companyId: string;
  readonly companyLabel: string;
  readonly outstandingCents: bigint;
  readonly ageDays: number;
  readonly agingBucket: FinanceAgingBucketKey;
  readonly level: FinanceAttentionLevel;
  readonly reason: string;
}

export interface CompanyFinancialHealth {
  readonly companyId: string;
  readonly companyLabel: string;
  readonly totalFeesCents: bigint;
  readonly collectedCents: bigint;
  readonly outstandingCents: bigint;
  readonly creditCents: bigint;
  readonly staleOutstandingCents: bigint;
  readonly collectionRateBps: number;
  readonly healthScore: number;
  readonly band: FinanceHealthBand;
  readonly reasons: readonly string[];
}

export interface FinanceTrendPeriod {
  readonly monthKey: string;
  readonly monthLabel: string;
  readonly collectedCents: bigint;
  readonly ledgerInCents: bigint;
  readonly ledgerOutCents: bigint;
  readonly netCashCents: bigint;
}

export interface FinanceRunRate {
  readonly recent30CollectedCents: bigint;
  readonly previous30CollectedCents: bigint;
  readonly changeBps: number | null;
  readonly averageDailyCollectionCents: bigint;
  readonly projectedNext30AtSameRunRateCents: bigint;
  readonly samplePaymentCount: number;
  readonly confidence: 'insufficient' | 'directional';
}

export interface FinanceIntelligenceSignal {
  readonly id: string;
  readonly severity: FinanceSignalSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly amountCents: bigint | null;
}

export interface FinanceIntelligenceSnapshot {
  readonly asOf: string;
  readonly agingBasis: 'transaction_created_at';
  readonly agingDisclosure: string;
  readonly totalOutstandingCents: bigint;
  readonly totalCreditCents: bigint;
  readonly aging: readonly FinanceAgingBucket[];
  readonly attentionQueue: readonly FinanceAttentionItem[];
  readonly companyHealth: readonly CompanyFinancialHealth[];
  readonly trends: readonly FinanceTrendPeriod[];
  readonly runRate: FinanceRunRate;
  readonly signals: readonly FinanceIntelligenceSignal[];
  readonly counts: Readonly<{ receivables: number; attention: number; companies: number; signals: number }>;
}

export class FinanceIntelligenceDateError extends Error {
  readonly recordType: string;
  readonly recordId: string;
  readonly value: string;
  constructor(recordType: string, recordId: string, value: string) {
    super(`invalid finance intelligence date: ${recordType}:${recordId}`);
    this.name = 'FinanceIntelligenceDateError';
    this.recordType = recordType;
    this.recordId = recordId;
    this.value = value;
  }
}

function timestamp(value: string, recordType: string, recordId: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new FinanceIntelligenceDateError(recordType, recordId, value);
  return parsed;
}

function daysOld(value: string, asOfMs: number, recordType: string, recordId: string): number {
  const sourceMs = timestamp(value, recordType, recordId);
  if (sourceMs > asOfMs) return 0;
  return Math.floor((asOfMs - sourceMs) / DAY_MS);
}

function agingBucket(days: number): FinanceAgingBucketKey {
  if (days <= 30) return '0_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '91_plus';
}

function attentionLevel(days: number, concentrationBps: number): FinanceAttentionLevel {
  if (days > 90 || concentrationBps >= 5000) return 'critical';
  if (days > 60 || concentrationBps >= 3000) return 'high';
  return 'watch';
}

function ratioBps(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  const scaled = (numerator * 10_000n) / denominator;
  const clamped = scaled > 100_000n ? 100_000n : scaled < -100_000n ? -100_000n : scaled;
  return Number(clamped);
}

function companyName(source: FinanceSource, companyId: string): string {
  const company = source.companies.find((item) => item.id === companyId);
  return company?.display_name?.trim() || company?.legal_name?.trim() || 'شركة غير متاحة';
}

function transactionName(source: FinanceSource, transactionId: string): string {
  const transaction = source.transactions.find((item) => item.id === transactionId);
  if (!transaction) return 'معاملة غير متاحة';
  return transaction.legacy_id?.trim() ? `معاملة ${transaction.legacy_id.trim()}` : transaction.type.trim() || `معاملة ${transaction.id.slice(0, 8)}`;
}

function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('ar-IQ', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function lastSixMonths(asOf: Date): readonly Date[] {
  const current = monthStartUtc(asOf);
  const months: Date[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) months.push(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - offset, 1)));
  return Object.freeze(months);
}

function isReversedPayment(source: FinanceSource, paymentId: string, status: string): boolean {
  return status.trim().toLowerCase() === 'reversed' || source.paymentReversals.some((row) => row.payment_id === paymentId);
}

function healthBand(score: number): FinanceHealthBand {
  if (score >= 75) return 'healthy';
  if (score >= 50) return 'watch';
  return 'high_risk';
}

function buildCompanyHealth(source: FinanceSource, asOfMs: number): readonly CompanyFinancialHealth[] {
  const ledger = buildFinanceLedgerSnapshot(source);
  const transactionsById = new Map(source.transactions.map((row) => [row.id, row] as const));
  const companies = new Map<string, { total: bigint; collected: bigint; outstanding: bigint; credit: bigint; stale: bigint }>();
  for (const receivable of ledger.receivables) {
    const current = companies.get(receivable.companyId) ?? { total: 0n, collected: 0n, outstanding: 0n, credit: 0n, stale: 0n };
    current.total += receivable.feeCents;
    current.collected += receivable.collectedCents;
    current.outstanding += receivable.outstandingCents;
    current.credit += receivable.creditCents;
    const tx = transactionsById.get(receivable.transactionId);
    if (tx && receivable.outstandingCents > 0n && daysOld(tx.created_at, asOfMs, 'transaction', tx.id) > 90) current.stale += receivable.outstandingCents;
    companies.set(receivable.companyId, current);
  }

  return Object.freeze([...companies.entries()].map(([companyId, value]) => {
    const collectionRateBps = value.total > 0n ? Math.min(10_000, ratioBps(value.collected, value.total)) : 10_000;
    const outstandingPenalty = Math.min(45, Math.round((Math.min(10_000, ratioBps(value.outstanding, value.total || 1n)) / 10_000) * 45));
    const stalePenalty = value.outstanding > 0n ? Math.min(35, Math.round((Math.min(10_000, ratioBps(value.stale, value.outstanding)) / 10_000) * 35)) : 0;
    const creditPenalty = value.credit > 0n ? Math.min(10, Math.round((Math.min(10_000, ratioBps(value.credit, value.total || 1n)) / 10_000) * 10)) : 0;
    const score = Math.max(0, Math.min(100, 100 - outstandingPenalty - stalePenalty - creditPenalty));
    const reasons: string[] = [];
    if (value.stale > 0n) reasons.push('يوجد رصيد مفتوح تجاوز 90 يوماً من تاريخ إنشاء المعاملة.');
    if (value.outstanding > 0n && collectionRateBps < 5000) reasons.push('نسبة التحصيل أقل من 50% من الأتعاب المسجلة.');
    if (value.credit > 0n) reasons.push('يوجد رصيد دائن يحتاج تفسيراً أو تخصيصاً في مرحلة مالية لاحقة.');
    if (!reasons.length) reasons.push('لا توجد إشارة مالية مرتفعة ضمن قواعد 7.3 الحالية.');
    return Object.freeze({
      companyId,
      companyLabel: companyName(source, companyId),
      totalFeesCents: value.total,
      collectedCents: value.collected,
      outstandingCents: value.outstanding,
      creditCents: value.credit,
      staleOutstandingCents: value.stale,
      collectionRateBps,
      healthScore: score,
      band: healthBand(score),
      reasons: Object.freeze(reasons),
    });
  }).sort((a, b) => a.healthScore - b.healthScore || (a.outstandingCents === b.outstandingCents ? a.companyId.localeCompare(b.companyId) : a.outstandingCents > b.outstandingCents ? -1 : 1)));
}

type TrendAccumulator = { date: Date; collected: bigint; ledgerIn: bigint; ledgerOut: bigint };

function buildTrends(source: FinanceSource, asOf: Date): readonly FinanceTrendPeriod[] {
  const months = lastSixMonths(asOf);
  const monthMap = new Map<string, TrendAccumulator>(months.map((date): [string, TrendAccumulator] => [monthKey(date), { date, collected: 0n, ledgerIn: 0n, ledgerOut: 0n }]));
  for (const payment of source.payments) {
    if (isReversedPayment(source, payment.id, payment.status)) continue;
    const date = new Date(timestamp(payment.paid_at, 'payment', payment.id));
    const bucket = monthMap.get(monthKey(date));
    if (bucket) bucket.collected += financeMoneyToCents(payment.amount, 'payment', payment.id);
  }
  for (const entry of source.ledger) {
    if (entry.status.trim().toLowerCase() === 'reversed') continue;
    const date = new Date(timestamp(entry.occurred_at, 'ledger', entry.id));
    const bucket = monthMap.get(monthKey(date));
    if (!bucket) continue;
    const amount = financeMoneyToCents(entry.amount, 'ledger', entry.id);
    if (entry.direction.trim().toLowerCase() === 'out') bucket.ledgerOut += amount;
    else bucket.ledgerIn += amount;
  }
  return Object.freeze(months.map((date) => {
    const bucket = monthMap.get(monthKey(date));
    const collectedCents = bucket?.collected ?? 0n;
    const ledgerInCents = bucket?.ledgerIn ?? 0n;
    const ledgerOutCents = bucket?.ledgerOut ?? 0n;
    return Object.freeze({ monthKey: monthKey(date), monthLabel: monthLabel(date), collectedCents, ledgerInCents, ledgerOutCents, netCashCents: collectedCents + ledgerInCents - ledgerOutCents });
  }));
}

function buildRunRate(source: FinanceSource, asOfMs: number): FinanceRunRate {
  const recentStart = asOfMs - 30 * DAY_MS;
  const previousStart = asOfMs - 60 * DAY_MS;
  let recent = 0n;
  let previous = 0n;
  let samplePaymentCount = 0;
  for (const payment of source.payments) {
    if (isReversedPayment(source, payment.id, payment.status)) continue;
    const paidAt = timestamp(payment.paid_at, 'payment', payment.id);
    const amount = financeMoneyToCents(payment.amount, 'payment', payment.id);
    if (paidAt > asOfMs) continue;
    if (paidAt >= recentStart) { recent += amount; samplePaymentCount += 1; }
    else if (paidAt >= previousStart) previous += amount;
  }
  const changeBps = previous > 0n ? ratioBps(recent - previous, previous) : null;
  const averageDailyCollectionCents = recent / 30n;
  return Object.freeze({
    recent30CollectedCents: recent,
    previous30CollectedCents: previous,
    changeBps,
    averageDailyCollectionCents,
    projectedNext30AtSameRunRateCents: averageDailyCollectionCents * 30n,
    samplePaymentCount,
    confidence: samplePaymentCount >= 4 ? 'directional' : 'insufficient',
  });
}

export function buildFinancialIntelligenceSnapshot(source: FinanceSource, asOfInput: Date | string = new Date()): FinanceIntelligenceSnapshot {
  const asOf = asOfInput instanceof Date ? new Date(asOfInput.getTime()) : new Date(asOfInput);
  if (!Number.isFinite(asOf.getTime())) throw new FinanceIntelligenceDateError('as_of', 'snapshot', String(asOfInput));
  const asOfMs = asOf.getTime();
  const ledger = buildFinanceLedgerSnapshot(source);
  const transactionsById = new Map(source.transactions.map((row) => [row.id, row] as const));
  const totalOutstandingCents = ledger.summary.outstandingCents;
  const agingTotals = new Map<FinanceAgingBucketKey, { count: number; amount: bigint }>(AGING_WINDOWS.map((item) => [item.key, { count: 0, amount: 0n }]));
  const attentionQueue: FinanceAttentionItem[] = [];

  for (const receivable of ledger.receivables) {
    if (receivable.outstandingCents <= 0n) continue;
    const transaction = transactionsById.get(receivable.transactionId);
    if (!transaction) continue;
    const ageDays = daysOld(transaction.created_at, asOfMs, 'transaction', transaction.id);
    const bucket = agingBucket(ageDays);
    const totals = agingTotals.get(bucket)!;
    totals.count += 1;
    totals.amount += receivable.outstandingCents;
    if (ageDays > 30) {
      const concentrationBps = totalOutstandingCents > 0n ? ratioBps(receivable.outstandingCents, totalOutstandingCents) : 0;
      attentionQueue.push(Object.freeze({
        transactionId: receivable.transactionId,
        transactionLabel: transactionName(source, receivable.transactionId),
        companyId: receivable.companyId,
        companyLabel: receivable.companyLabel,
        outstandingCents: receivable.outstandingCents,
        ageDays,
        agingBucket: bucket,
        level: attentionLevel(ageDays, concentrationBps),
        reason: ageDays > 90 ? 'رصيد مفتوح لأكثر من 90 يوماً من تاريخ إنشاء المعاملة.' : ageDays > 60 ? 'رصيد مفتوح لأكثر من 60 يوماً.' : 'رصيد مفتوح لأكثر من 30 يوماً.',
      }));
    }
  }
  attentionQueue.sort((a, b) => b.ageDays - a.ageDays || (a.outstandingCents === b.outstandingCents ? a.transactionId.localeCompare(b.transactionId) : a.outstandingCents > b.outstandingCents ? -1 : 1));

  const aging = Object.freeze(AGING_WINDOWS.map((window) => {
    const total = agingTotals.get(window.key)!;
    return Object.freeze({ key: window.key, label: window.label, minDays: window.min, maxDays: window.max, receivableCount: total.count, outstandingCents: total.amount });
  }));
  const companyHealth = buildCompanyHealth(source, asOfMs);
  const trends = buildTrends(source, asOf);
  const runRate = buildRunRate(source, asOfMs);
  const signals: FinanceIntelligenceSignal[] = [];

  const stale = agingTotals.get('91_plus')!.amount;
  if (ledger.summary.paymentIntegrityWarnings > 0) signals.push(Object.freeze({ id: 'payment-integrity', severity: 'high', title: 'مطابقة حالة الدفعات تحتاج مراجعة', explanation: `${ledger.summary.paymentIntegrityWarnings} دفعة لديها اختلاف بين حالة الدفعة وسجل العكس.`, amountCents: null }));
  if (stale > 0n) signals.push(Object.freeze({ id: 'stale-receivables', severity: 'high', title: 'أرصدة قديمة مرتفعة', explanation: 'يوجد رصيد مفتوح تجاوز 90 يوماً من تاريخ إنشاء المعاملة. هذا عمر رصيد تشغيلي وليس تاريخ استحقاق قانونياً.', amountCents: stale }));
  if (ledger.summary.creditCents > 0n) signals.push(Object.freeze({ id: 'credit-balance', severity: 'watch', title: 'رصيد دائن ظاهر', explanation: 'التحصيل تجاوز الأتعاب الحالية في معاملة واحدة أو أكثر؛ يلزم تفسير أو تخصيص لاحق.', amountCents: ledger.summary.creditCents }));
  const reversalCount = ledger.summary.reversedPayments;
  const paymentCount = ledger.summary.postedPayments + reversalCount;
  if (paymentCount > 0) {
    const reversalBps = Math.round((reversalCount / paymentCount) * 10_000);
    if (reversalBps >= 2_000) signals.push(Object.freeze({ id: 'reversal-rate', severity: 'watch', title: 'معدل عكس دفعات مرتفع', explanation: `نسبة الدفعات المعكوسة تقارب ${(reversalBps / 100).toFixed(1)}% من سجل الدفعات الحالي.`, amountCents: null }));
  }
  if (totalOutstandingCents > 0n && ledger.receivables.length) {
    const top = ledger.receivables.filter((item) => item.outstandingCents > 0n).sort((a, b) => a.outstandingCents > b.outstandingCents ? -1 : 1)[0];
    if (top && ratioBps(top.outstandingCents, totalOutstandingCents) >= 5_000) signals.push(Object.freeze({ id: 'receivable-concentration', severity: 'watch', title: 'تركيز مرتفع في رصيد واحد', explanation: `${top.companyLabel} تمثل 50% أو أكثر من إجمالي الرصيد المفتوح.`, amountCents: top.outstandingCents }));
  }
  const latestTrend = trends.at(-1);
  if (latestTrend && latestTrend.netCashCents < 0n) signals.push(Object.freeze({ id: 'negative-current-month', severity: 'watch', title: 'حركة نقدية شهرية سالبة', explanation: 'المصروفات/الخروج المسجل في الشهر الحالي تجاوز التحصيل والدخول المسجل.', amountCents: -latestTrend.netCashCents }));
  if (!signals.length) signals.push(Object.freeze({ id: 'no-high-signal', severity: 'info', title: 'لا توجد إشارة مالية مرتفعة حالياً', explanation: 'قواعد 7.3 الحالية لم تكتشف نمطاً يحتاج تصعيداً. هذا لا يعني ضمان السلامة المالية.', amountCents: null }));

  return Object.freeze({
    asOf: asOf.toISOString(),
    agingBasis: 'transaction_created_at',
    agingDisclosure: 'لا يحتوي نموذج المعاملة الحالي على تاريخ استحقاق مالي مستقل؛ لذلك يقيس 7.3 عمر الرصيد من تاريخ إنشاء المعاملة ولا يصفه كاستحقاق قانوني.',
    totalOutstandingCents,
    totalCreditCents: ledger.summary.creditCents,
    aging,
    attentionQueue: Object.freeze(attentionQueue),
    companyHealth,
    trends,
    runRate,
    signals: Object.freeze(signals),
    counts: Object.freeze({ receivables: ledger.receivables.filter((item) => item.outstandingCents > 0n).length, attention: attentionQueue.length, companies: companyHealth.length, signals: signals.length }),
  });
}
