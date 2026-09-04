import type { HomeDashboardSnapshot, HomeOperationalSignal, HomePriorityItem } from './homeDashboardModel.ts';

export type HomePreviewScenario = 'normal' | 'empty' | 'dense' | 'conflict' | 'slow' | 'offline';

const NORMAL_PRIORITIES: readonly HomePriorityItem[] = Object.freeze([
  Object.freeze({
    id: 'blocker:preview-critical',
    transactionId: 'preview-transaction-1',
    companyId: 'preview-company-1',
    companyLabel: 'شركة الرافدين للخدمات القانونية والإدارية',
    title: 'إغلاق عائق مراجعة عقد التأسيس',
    reason: 'عائق حرج يمنع انتقال المعاملة إلى الخطوة التالية ويحتاج قرارًا مباشرًا.',
    level: 'critical',
    score: 120,
    destination: '/app/transactions',
  }),
  Object.freeze({
    id: 'followup:preview-late',
    transactionId: 'preview-transaction-2',
    companyId: 'preview-company-2',
    companyLabel: 'قمر السلطان للتجارة العامة',
    title: 'متابعة كتاب رسمي متأخر',
    reason: 'متابعة متأخرة منذ 3 أيام.',
    level: 'high',
    score: 103,
    destination: '/app/transactions',
  }),
  Object.freeze({
    id: 'urgent:preview-urgent',
    transactionId: 'preview-transaction-3',
    companyId: 'preview-company-3',
    companyLabel: 'روز بغداد للخدمات العامة',
    title: 'معاملة عاجلة: قرار تأسيس',
    reason: 'الأولوية مصنفة عاجلة وتحتاج انتباهًا مباشرًا.',
    level: 'high',
    score: 90,
    destination: '/app/transactions',
  }),
]);

function signals(overdue: number, blockers: number, stalled: number, critical = 0): readonly HomeOperationalSignal[] {
  return Object.freeze([
    Object.freeze({
      id: 'overdue-followups',
      label: 'متابعات متأخرة',
      value: overdue,
      detail: overdue ? 'تحتاج معالجة قبل تراكم التأخير.' : 'لا توجد متابعة متأخرة الآن.',
      tone: overdue ? 'danger' : 'success',
    }),
    Object.freeze({
      id: 'open-blockers',
      label: 'عوائق مفتوحة',
      value: blockers,
      detail: critical ? `${critical} منها حرجة.` : blockers ? 'توجد عوائق غير حرجة تحتاج متابعة.' : 'لا توجد عوائق مفتوحة.',
      tone: critical ? 'danger' : blockers ? 'warning' : 'success',
    }),
    Object.freeze({
      id: 'stalled-transactions',
      label: 'معاملات متلكئة',
      value: stalled,
      detail: stalled ? 'تحتاج تحديد سبب التوقف والخطوة التالية.' : 'لا توجد معاملات متلكئة ضمن العمل النشط.',
      tone: stalled ? 'warning' : 'success',
    }),
  ]);
}

const NORMAL: HomeDashboardSnapshot = Object.freeze({
  activeTransactions: 24,
  urgentTransactions: 3,
  stalledTransactions: 4,
  openFollowups: 14,
  overdueFollowups: 2,
  openBlockers: 5,
  criticalBlockers: 1,
  finance: Object.freeze({ activeFees: 24_850_000, collectedAgainstActive: 18_450_000, outstandingActive: 6_400_000, precisionSafe: true }),
  priorities: NORMAL_PRIORITIES,
  signals: signals(2, 5, 4, 1),
});

const EMPTY: HomeDashboardSnapshot = Object.freeze({
  activeTransactions: 0,
  urgentTransactions: 0,
  stalledTransactions: 0,
  openFollowups: 0,
  overdueFollowups: 0,
  openBlockers: 0,
  criticalBlockers: 0,
  finance: Object.freeze({ activeFees: 0, collectedAgainstActive: 0, outstandingActive: 0, precisionSafe: true }),
  priorities: Object.freeze([]),
  signals: signals(0, 0, 0),
});

const LONG_COMPANY = 'شركة الاختبار الطويل جدًا للتجارة العامة والمقاولات والاستثمار والتطوير العقاري والخدمات الإدارية والقانونية والتقنية محدودة المسؤولية — ENJAZ-2026-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789';

const DENSE_PRIORITIES: readonly HomePriorityItem[] = Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
  id: `dense:${index + 1}`,
  transactionId: `dense-transaction-${index + 1}`,
  companyId: `dense-company-${index + 1}`,
  companyLabel: `${LONG_COMPANY} ${index + 1}`,
  title: `أولوية تشغيلية كثيفة رقم ${index + 1}: مراجعة مستندات ومعالجة عائق ومتابعة قرار طويل جدًا دون كسر العرض`,
  reason: `تفاصيل تشغيلية ممتدة لاختبار التفاف النص العربي والمختلط على الشاشات الضيقة مع مرجع ENJAZ-DENSE-${index + 1}-999999999999999999.99`,
  level: index < 2 ? 'critical' : index < 4 ? 'high' : 'medium',
  score: 120 - index,
  destination: '/app/transactions' as const,
})));

const DENSE: HomeDashboardSnapshot = Object.freeze({
  activeTransactions: 9_999,
  urgentTransactions: 1_204,
  stalledTransactions: 888,
  openFollowups: 12_345,
  overdueFollowups: 4_321,
  openBlockers: 2_222,
  criticalBlockers: 777,
  finance: Object.freeze({ activeFees: 999_999_999_999_999.99, collectedAgainstActive: 444_444_444_444_444.44, outstandingActive: 555_555_555_555_555.55, precisionSafe: false }),
  priorities: DENSE_PRIORITIES,
  signals: signals(4_321, 2_222, 888, 777),
});

const CONFLICT: HomeDashboardSnapshot = Object.freeze({
  ...NORMAL,
  urgentTransactions: 8,
  stalledTransactions: 8,
  overdueFollowups: 8,
  openBlockers: 8,
  criticalBlockers: 8,
  priorities: Object.freeze([
    Object.freeze({ ...NORMAL_PRIORITIES[0]!, id: 'conflict:critical', title: 'حالة متعارضة محسومة: العائق الحرج هو الأعلى', reason: 'المعاملة نفسها قد تحمل أكثر من إشارة؛ واجهة Home تعرض أعلى سبب فقط ولا تكرر المعاملة.' }),
    ...NORMAL_PRIORITIES.slice(1),
  ]),
  signals: signals(8, 8, 8, 8),
});

export function normalizeHomePreviewScenario(value: string | null): HomePreviewScenario {
  return value === 'empty' || value === 'dense' || value === 'conflict' || value === 'slow' || value === 'offline' ? value : 'normal';
}

export function buildHomePreviewSnapshot(scenario: HomePreviewScenario = 'normal'): HomeDashboardSnapshot {
  if (scenario === 'empty') return EMPTY;
  if (scenario === 'dense') return DENSE;
  if (scenario === 'conflict') return CONFLICT;
  return NORMAL;
}
