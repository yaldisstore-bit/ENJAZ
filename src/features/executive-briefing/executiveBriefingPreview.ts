import type { ExecutiveBriefingSnapshot } from './executiveBriefingModel.ts';

export function buildExecutiveBriefingPreviewSnapshot(now: Date = new Date()): ExecutiveBriefingSnapshot {
  return Object.freeze({
    generatedAt: now.toISOString(),
    state: 'watch',
    headline: 'العمل مستقر نسبيًا مع نقاط محددة تحتاج انتباهًا',
    summary: '24 معاملة نشطة · 11 عنصر عمل مفتوح · 2 عائق مفتوح',
    risks: Object.freeze({
      criticalBlockers: 1,
      openBlockers: 2,
      stalledTransactions: 3,
      urgentTransactions: 2,
      overdueFollowups: 2,
    }),
    workload: Object.freeze({
      total: 11,
      overdue: 2,
      dueToday: 4,
      approvals: 2,
      blocked: 2,
      upcoming: 3,
    }),
    finance: Object.freeze({
      posted7d: 5_800_000,
      postedPrevious7d: 6_250_000,
      deltaAmount: -450_000,
      trend: 'down',
      postedCount7d: 7,
      outstandingActive: 4_200_000,
      precisionSafe: true,
    }),
    decisions: Object.freeze([
      Object.freeze({ id: 'preview-priority-1', title: 'إزالة عائق حرج من معاملة قريبة الإغلاق', detail: 'شركة الرافدين · العائق يمنع تقدم المعاملة ويحتاج قرارًا مباشرًا.', tone: 'danger', destination: 'transactions' }),
      Object.freeze({ id: 'preview-approval', title: 'إجراءان ينتظران قرارًا', detail: 'توجد عناصر معلقة داخل سير العمل وتحتاج حسمًا من صندوق العمل اليومي.', tone: 'warning', destination: 'today' }),
      Object.freeze({ id: 'preview-finance', title: 'التحصيل أبطأ من الأسبوع السابق', detail: 'النبضة المالية تعرض دفعات posted فقط؛ راجع التفاصيل المالية قبل اتخاذ قرار محاسبي.', tone: 'info', destination: 'finance' }),
    ]),
  });
}
