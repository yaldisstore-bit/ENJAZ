import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { DailyWorkSnapshot } from '../daily-work/dailyWorkModel.ts';
import type { HomeDashboardSnapshot, HomePriorityLevel } from '../home/homeDashboardModel.ts';

export type ExecutiveBriefingState = 'stable' | 'watch' | 'critical';
export type ExecutiveBriefingTone = 'success' | 'warning' | 'danger' | 'info' | 'gold';
export type ExecutiveBriefingDestination = 'transactions' | 'today' | 'finance';
export type ExecutiveFinanceTrend = 'up' | 'down' | 'flat';

export interface ExecutiveBriefingDecision {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly tone: ExecutiveBriefingTone;
  readonly destination: ExecutiveBriefingDestination;
}

export interface ExecutiveBriefingRiskSummary {
  readonly criticalBlockers: number;
  readonly openBlockers: number;
  readonly stalledTransactions: number;
  readonly urgentTransactions: number;
  readonly overdueFollowups: number;
}

export interface ExecutiveBriefingWorkloadSummary {
  readonly total: number;
  readonly overdue: number;
  readonly dueToday: number;
  readonly approvals: number;
  readonly blocked: number;
  readonly upcoming: number;
}

export interface ExecutiveBriefingFinancePulse {
  readonly posted7d: number;
  readonly postedPrevious7d: number;
  readonly deltaAmount: number;
  readonly trend: ExecutiveFinanceTrend;
  readonly postedCount7d: number;
  readonly outstandingActive: number;
  readonly precisionSafe: boolean;
}

export interface ExecutiveBriefingSnapshot {
  readonly generatedAt: string;
  readonly state: ExecutiveBriefingState;
  readonly headline: string;
  readonly summary: string;
  readonly risks: ExecutiveBriefingRiskSummary;
  readonly workload: ExecutiveBriefingWorkloadSummary;
  readonly finance: ExecutiveBriefingFinancePulse;
  readonly decisions: readonly ExecutiveBriefingDecision[];
}

function parseInstant(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function safeMoneySum(values: readonly number[]): Readonly<{ value: number; precisionSafe: boolean }> {
  let value = 0;
  let precisionSafe = true;
  for (const amount of values) {
    if (!Number.isFinite(amount)) continue;
    if (!Number.isSafeInteger(Math.round(amount * 100))) precisionSafe = false;
    value += amount;
    if (!Number.isSafeInteger(Math.round(value * 100))) precisionSafe = false;
  }
  return Object.freeze({ value: Math.round(value * 100) / 100, precisionSafe });
}

function toneForPriority(level: HomePriorityLevel): ExecutiveBriefingTone {
  return level === 'critical' ? 'danger' : level === 'high' ? 'warning' : 'gold';
}

function buildFinancePulse(
  home: HomeDashboardSnapshot,
  payments: readonly RowOf<'payments'>[],
  now: Date,
): ExecutiveBriefingFinancePulse {
  const nowMs = now.getTime();
  const sevenDaysMs = 7 * 86_400_000;
  const currentStart = nowMs - sevenDaysMs;
  const previousStart = nowMs - (2 * sevenDaysMs);

  const posted = payments.filter((payment) => payment.status === 'posted');
  const currentRows = posted.filter((payment) => {
    const paidAt = parseInstant(payment.paid_at);
    return paidAt !== null && paidAt >= currentStart && paidAt <= nowMs;
  });
  const previousRows = posted.filter((payment) => {
    const paidAt = parseInstant(payment.paid_at);
    return paidAt !== null && paidAt >= previousStart && paidAt < currentStart;
  });

  const current = safeMoneySum(currentRows.map((row) => row.amount));
  const previous = safeMoneySum(previousRows.map((row) => row.amount));
  const delta = Math.round((current.value - previous.value) * 100) / 100;
  const trend: ExecutiveFinanceTrend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const precisionSafe = current.precisionSafe
    && previous.precisionSafe
    && home.finance.precisionSafe
    && Number.isSafeInteger(Math.round(delta * 100));

  return Object.freeze({
    posted7d: current.value,
    postedPrevious7d: previous.value,
    deltaAmount: delta,
    trend,
    postedCount7d: currentRows.length,
    outstandingActive: home.finance.outstandingActive,
    precisionSafe,
  });
}

function buildDecisions(
  home: HomeDashboardSnapshot,
  daily: DailyWorkSnapshot,
  finance: ExecutiveBriefingFinancePulse,
): readonly ExecutiveBriefingDecision[] {
  const decisions: ExecutiveBriefingDecision[] = home.priorities.slice(0, 2).map((item) => Object.freeze({
    id: `priority:${item.id}`,
    title: item.title,
    detail: item.companyLabel ? `${item.companyLabel} · ${item.reason}` : item.reason,
    tone: toneForPriority(item.level),
    destination: 'transactions' as const,
  }));

  if (daily.summary.approvals > 0) {
    decisions.push(Object.freeze({
      id: 'workflow-approvals',
      title: `${daily.summary.approvals} ${daily.summary.approvals === 1 ? 'إجراء ينتظر قرارًا' : 'إجراءات تنتظر قرارًا'}`,
      detail: 'توجد عناصر معلقة داخل سير العمل وتحتاج حسمًا من صندوق العمل اليومي.',
      tone: 'warning',
      destination: 'today',
    }));
  }

  if (daily.summary.overdue > 0 && !decisions.some((item) => item.id.includes('followup'))) {
    decisions.push(Object.freeze({
      id: 'overdue-work',
      title: `${daily.summary.overdue} ${daily.summary.overdue === 1 ? 'عنصر متأخر' : 'عناصر متأخرة'}`,
      detail: 'تراكم العمل المتأخر يحتاج إعادة ترتيب الأولويات قبل إضافة التزامات جديدة.',
      tone: 'danger',
      destination: 'today',
    }));
  }

  if (finance.trend === 'down' && finance.postedPrevious7d > 0) {
    decisions.push(Object.freeze({
      id: 'finance-downtrend',
      title: 'التحصيل أبطأ من الأسبوع السابق',
      detail: 'النبضة المالية تعرض دفعات posted فقط؛ راجع التفاصيل المالية قبل اتخاذ قرار محاسبي.',
      tone: 'info',
      destination: 'finance',
    }));
  }

  return Object.freeze(decisions.slice(0, 4));
}

export function buildExecutiveBriefingSnapshot(
  home: HomeDashboardSnapshot,
  daily: DailyWorkSnapshot,
  payments: readonly RowOf<'payments'>[],
  now: Date = new Date(),
): ExecutiveBriefingSnapshot {
  const risks: ExecutiveBriefingRiskSummary = Object.freeze({
    criticalBlockers: home.criticalBlockers,
    openBlockers: home.openBlockers,
    stalledTransactions: home.stalledTransactions,
    urgentTransactions: home.urgentTransactions,
    overdueFollowups: home.overdueFollowups,
  });
  const workload: ExecutiveBriefingWorkloadSummary = Object.freeze({ ...daily.summary });
  const finance = buildFinancePulse(home, payments, now);

  const state: ExecutiveBriefingState = home.criticalBlockers > 0 || daily.summary.overdue >= 5
    ? 'critical'
    : home.openBlockers > 0 || home.stalledTransactions > 0 || daily.summary.overdue > 0 || daily.summary.approvals > 0
      ? 'watch'
      : 'stable';

  const headline = state === 'critical'
    ? 'اليوم يحتاج قرارًا مباشرًا قبل توسيع العمل الجاري'
    : state === 'watch'
      ? 'العمل مستقر نسبيًا مع نقاط محددة تحتاج انتباهًا'
      : 'الوضع التشغيلي مستقر ولا توجد استثناءات حرجة الآن';

  const summary = `${home.activeTransactions} معاملة نشطة · ${daily.summary.total} عنصر عمل مفتوح · ${home.openBlockers} عائق مفتوح`;

  return Object.freeze({
    generatedAt: now.toISOString(),
    state,
    headline,
    summary,
    risks,
    workload,
    finance,
    decisions: buildDecisions(home, daily, finance),
  });
}
