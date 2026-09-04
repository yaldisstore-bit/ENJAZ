import type { DailyWorkItem, DailyWorkSnapshot } from './dailyWorkModel.ts';

function isoFrom(now: Date, minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

function item(value: DailyWorkItem): DailyWorkItem {
  return Object.freeze(value);
}

export function buildDailyWorkPreviewSnapshot(now: Date = new Date()): DailyWorkSnapshot {
  const items: readonly DailyWorkItem[] = Object.freeze([
    item({
      id: 'blocker:preview-critical', sourceId: 'preview-critical', source: 'blocker',
      title: 'مستند تأسيس ناقص يوقف الإكمال', subject: 'شركة الرافدين · تسجيل شركة', ownerLabel: 'أحمد',
      stateLabel: 'عائق حرج', tone: 'danger', bucket: 'action', dueAt: isoFrom(now, -240),
      transactionId: 'preview-tx-1', companyId: 'preview-company-1', score: 135, completable: false, snoozable: false,
    }),
    item({
      id: 'followup:preview-overdue', sourceId: 'preview-overdue', source: 'followup',
      title: 'اتصال متابعة مع المحامي', subject: 'قمر السلطان · قرار تأسيس', ownerLabel: 'سارة',
      stateLabel: 'متأخرة', tone: 'danger', bucket: 'overdue', dueAt: isoFrom(now, -1_500),
      transactionId: 'preview-tx-2', companyId: 'preview-company-2', score: 121, completable: true, snoozable: true,
    }),
    item({
      id: 'calendar:preview-meeting', sourceId: 'preview-meeting', source: 'calendar',
      title: 'مراجعة قرار تأسيس', subject: 'شركة الفجر · معاملة تأسيس', ownerLabel: 'سارة',
      stateLabel: 'موعد اليوم', tone: 'gold', bucket: 'today', dueAt: isoFrom(now, 48),
      transactionId: 'preview-tx-3', companyId: 'preview-company-3', score: 94, completable: true, snoozable: false,
    }),
    item({
      id: 'workflow:preview-approval', sourceId: 'preview-approval', source: 'workflow',
      title: 'اعتماد النسخة النهائية للكتاب', subject: 'شركة الروان · تعديل عقد', ownerLabel: 'أنت',
      stateLabel: 'بحاجة إجراء', tone: 'warning', bucket: 'action', dueAt: null,
      transactionId: 'preview-tx-4', companyId: 'preview-company-4', score: 84, completable: true, snoozable: false,
    }),
    item({
      id: 'renewal:preview-renewal', sourceId: 'preview-renewal', source: 'renewal',
      title: 'تجديد إجازة الشركة', subject: 'شركة النخيل', ownerLabel: 'أنت',
      stateLabel: 'تجديد قريب', tone: 'info', bucket: 'upcoming', dueAt: isoFrom(now, 2_880),
      transactionId: null, companyId: 'preview-company-5', score: 61, completable: true, snoozable: false,
    }),
    item({
      id: 'followup:preview-later', sourceId: 'preview-later', source: 'followup',
      title: 'تأكيد استلام المستندات', subject: 'شركة السراج · تسجيل فرع', ownerLabel: 'علي',
      stateLabel: 'قادمة', tone: 'info', bucket: 'upcoming', dueAt: isoFrom(now, 780),
      transactionId: 'preview-tx-6', companyId: 'preview-company-6', score: 55, completable: true, snoozable: true,
    }),
  ]);

  return Object.freeze({
    generatedAt: now.toISOString(),
    summary: Object.freeze({ total: items.length, overdue: 1, dueToday: 1, approvals: 1, blocked: 1, upcoming: 2 }),
    focus: items[0] ?? null,
    items,
  });
}
