import type { RowOf } from '../../data/contracts/dataTypes.ts';

export const HOME_PRIORITY_LIMIT = 6;

export type HomeSignalTone = 'success' | 'warning' | 'danger' | 'info';
export type HomePriorityLevel = 'medium' | 'high' | 'critical';

export interface HomePriorityItem {
  readonly id: string;
  readonly transactionId: string;
  readonly companyId: string;
  readonly companyLabel?: string;
  readonly title: string;
  readonly reason: string;
  readonly level: HomePriorityLevel;
  readonly score: number;
  readonly destination: '/app/transactions';
}

export interface HomeOperationalSignal {
  readonly id: 'overdue-followups' | 'open-blockers' | 'stalled-transactions';
  readonly label: string;
  readonly value: number;
  readonly detail: string;
  readonly tone: HomeSignalTone;
}

export interface HomeFinanceSnapshot {
  readonly activeFees: number;
  readonly collectedAgainstActive: number;
  readonly outstandingActive: number;
  readonly precisionSafe: boolean;
}

export interface HomeDashboardSnapshot {
  readonly activeTransactions: number;
  readonly urgentTransactions: number;
  readonly stalledTransactions: number;
  readonly openFollowups: number;
  readonly overdueFollowups: number;
  readonly openBlockers: number;
  readonly criticalBlockers: number;
  readonly finance: HomeFinanceSnapshot;
  readonly priorities: readonly HomePriorityItem[];
  readonly signals: readonly HomeOperationalSignal[];
}

export interface HomeDashboardSource {
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly followups: readonly RowOf<'transaction_followups'>[];
  readonly blockers: readonly RowOf<'transaction_blockers'>[];
  readonly payments: readonly RowOf<'payments'>[];
}

function parseInstant(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function isActiveTransaction(transaction: RowOf<'transactions'>): boolean {
  return transaction.deleted_at === null && transaction.archived_at === null && transaction.status !== 'completed';
}

function isOpenAndUnsnoozed(followup: RowOf<'transaction_followups'>, nowMs: number): boolean {
  if (followup.status !== 'open') return false;
  if (followup.snoozed_until === null) return true;
  return parseInstant(followup.snoozed_until) <= nowMs;
}

function safeMoneySum(values: readonly number[]): Readonly<{ value: number; precisionSafe: boolean }> {
  let total = 0;
  let precisionSafe = true;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (!Number.isSafeInteger(Math.round(value * 100))) precisionSafe = false;
    total += value;
    if (!Number.isSafeInteger(Math.round(total * 100))) precisionSafe = false;
  }
  return Object.freeze({ value: Math.round(total * 100) / 100, precisionSafe });
}

function rankDistinctPriorities(candidates: readonly HomePriorityItem[]): readonly HomePriorityItem[] {
  const ranked = [...candidates].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const seenTransactions = new Set<string>();
  const result: HomePriorityItem[] = [];

  for (const candidate of ranked) {
    if (seenTransactions.has(candidate.transactionId)) continue;
    seenTransactions.add(candidate.transactionId);
    result.push(candidate);
    if (result.length === HOME_PRIORITY_LIMIT) break;
  }

  return Object.freeze(result);
}

function createPriorities(
  source: HomeDashboardSource,
  activeById: ReadonlyMap<string, RowOf<'transactions'>>,
  nowMs: number,
): readonly HomePriorityItem[] {
  const candidates: HomePriorityItem[] = [];

  for (const blocker of source.blockers) {
    if (blocker.status !== 'open' || (blocker.severity !== 'critical' && blocker.severity !== 'high')) continue;
    const transaction = activeById.get(blocker.transaction_id);
    if (!transaction) continue;
    const level: HomePriorityLevel = blocker.severity === 'critical' ? 'critical' : 'high';
    candidates.push(Object.freeze({
      id: `blocker:${blocker.id}`,
      transactionId: transaction.id,
      companyId: transaction.company_id,
      title: blocker.title,
      reason: blocker.note?.trim() || `عائق ${blocker.severity === 'critical' ? 'حرج' : 'مرتفع'} يمنع تقدم المعاملة.`,
      level,
      score: blocker.severity === 'critical' ? 120 : 105,
      destination: '/app/transactions',
    }));
  }

  for (const followup of source.followups) {
    if (!isOpenAndUnsnoozed(followup, nowMs) || parseInstant(followup.due_at) >= nowMs) continue;
    const transaction = activeById.get(followup.transaction_id);
    if (!transaction) continue;
    const overdueDays = Math.max(1, Math.floor((nowMs - parseInstant(followup.due_at)) / 86_400_000));
    candidates.push(Object.freeze({
      id: `followup:${followup.id}`,
      transactionId: transaction.id,
      companyId: transaction.company_id,
      title: followup.title,
      reason: `متابعة متأخرة منذ ${overdueDays} ${overdueDays === 1 ? 'يوم' : 'أيام'}.`,
      level: overdueDays >= 7 ? 'critical' : 'high',
      score: 100 + Math.min(overdueDays, 20),
      destination: '/app/transactions',
    }));
  }

  for (const transaction of activeById.values()) {
    if (transaction.priority === 'urgent') {
      candidates.push(Object.freeze({
        id: `urgent:${transaction.id}`,
        transactionId: transaction.id,
        companyId: transaction.company_id,
        title: `معاملة عاجلة: ${transaction.type}`,
        reason: transaction.department ? `الأولوية عاجلة · ${transaction.department}` : 'الأولوية مصنفة عاجلة وتحتاج انتباهًا مباشرًا.',
        level: 'high',
        score: 90,
        destination: '/app/transactions',
      }));
    }
    if (transaction.status === 'stalled') {
      candidates.push(Object.freeze({
        id: `stalled:${transaction.id}`,
        transactionId: transaction.id,
        companyId: transaction.company_id,
        title: `معاملة متلكئة: ${transaction.type}`,
        reason: 'حالة المعاملة متلكئة وتحتاج مراجعة سبب التوقف أو الخطوة التالية.',
        level: 'medium',
        score: 80,
        destination: '/app/transactions',
      }));
    }
  }

  return rankDistinctPriorities(candidates);
}

export function enrichHomePriorityCompanies(
  snapshot: HomeDashboardSnapshot,
  companyNames: ReadonlyMap<string, string>,
): HomeDashboardSnapshot {
  const priorities = snapshot.priorities.map((item) => {
    const companyLabel = companyNames.get(item.companyId);
    return companyLabel ? Object.freeze({ ...item, companyLabel }) : item;
  });
  return Object.freeze({ ...snapshot, priorities: Object.freeze(priorities) });
}

export function buildHomeDashboardSnapshot(source: HomeDashboardSource, now: Date = new Date()): HomeDashboardSnapshot {
  const nowMs = now.getTime();
  const activeTransactions = source.transactions.filter(isActiveTransaction);
  const activeById = new Map(activeTransactions.map((transaction) => [transaction.id, transaction] as const));
  const activeIds = new Set(activeById.keys());
  const openFollowups = source.followups.filter((followup) => followup.status === 'open' && activeIds.has(followup.transaction_id));
  const overdueFollowups = openFollowups.filter((followup) => isOpenAndUnsnoozed(followup, nowMs) && parseInstant(followup.due_at) < nowMs);
  const openBlockers = source.blockers.filter((blocker) => blocker.status === 'open' && activeIds.has(blocker.transaction_id));

  const activeFees = safeMoneySum(activeTransactions.map((transaction) => transaction.current_fee));
  const collected = safeMoneySum(source.payments
    .filter((payment) => payment.status === 'posted' && activeIds.has(payment.transaction_id))
    .map((payment) => payment.amount));
  const outstanding = Math.max(0, Math.round((activeFees.value - collected.value) * 100) / 100);

  const stalledTransactions = activeTransactions.filter((transaction) => transaction.status === 'stalled').length;
  const urgentTransactions = activeTransactions.filter((transaction) => transaction.priority === 'urgent').length;
  const criticalBlockers = openBlockers.filter((blocker) => blocker.severity === 'critical').length;

  const signals: readonly HomeOperationalSignal[] = Object.freeze([
    Object.freeze({
      id: 'overdue-followups',
      label: 'متابعات متأخرة',
      value: overdueFollowups.length,
      detail: overdueFollowups.length ? 'تحتاج معالجة قبل تراكم التأخير.' : 'لا توجد متابعة متأخرة الآن.',
      tone: overdueFollowups.length ? 'danger' : 'success',
    }),
    Object.freeze({
      id: 'open-blockers',
      label: 'عوائق مفتوحة',
      value: openBlockers.length,
      detail: criticalBlockers ? `${criticalBlockers} منها حرجة.` : openBlockers.length ? 'توجد عوائق غير حرجة تحتاج متابعة.' : 'لا توجد عوائق مفتوحة.',
      tone: criticalBlockers ? 'danger' : openBlockers.length ? 'warning' : 'success',
    }),
    Object.freeze({
      id: 'stalled-transactions',
      label: 'معاملات متلكئة',
      value: stalledTransactions,
      detail: stalledTransactions ? 'تحتاج تحديد سبب التوقف والخطوة التالية.' : 'لا توجد معاملات متلكئة ضمن العمل النشط.',
      tone: stalledTransactions ? 'warning' : 'success',
    }),
  ]);

  return Object.freeze({
    activeTransactions: activeTransactions.length,
    urgentTransactions,
    stalledTransactions,
    openFollowups: openFollowups.length,
    overdueFollowups: overdueFollowups.length,
    openBlockers: openBlockers.length,
    criticalBlockers,
    finance: Object.freeze({
      activeFees: activeFees.value,
      collectedAgainstActive: collected.value,
      outstandingActive: outstanding,
      precisionSafe: activeFees.precisionSafe && collected.precisionSafe && Number.isSafeInteger(Math.round(outstanding * 100)),
    }),
    priorities: createPriorities(source, activeById, nowMs),
    signals,
  });
}