export const VISUAL_DESTRUCTION_CONTRACT = Object.freeze({
  longCompanyMinimumCharacters: 200,
  notificationStormCount: 20,
  denseTimelineCount: 24,
  narrowViewportPx: 320,
  keyboardViewportPx: 360,
  minimumTouchTargetPx: 44,
  hugeMoneyValue: 8_888_888_888_888_888,
  zoomMustRemainEnabled: true,
  reducedMotionMustRemainSupported: true,
  tokenOnlyVisuals: true,
  arbitraryZIndexForbidden: true,
  importantOverridesForbidden: true,
  rawColorsForbidden: true,
  tinyProductTextForbidden: true,
  phase3ForbiddenUntilGreen: true,
} as const);

const LONG_COMPANY_SEED =
  'شركة إنجاز للتجارة العامة والمقاولات والاستثمار والتطوير العقاري وإدارة المشاريع والخدمات القانونية والإدارية والاستشارات وتجهيز المعدات والمواد والخدمات اللوجستية والوكالات التجارية محدودة المسؤولية';

export function createLongCompanyName(minimum = VISUAL_DESTRUCTION_CONTRACT.longCompanyMinimumCharacters): string {
  let value = LONG_COMPANY_SEED;
  while (value.length < minimum) value = `${value} — ${LONG_COMPANY_SEED}`;
  return value.slice(0, Math.max(minimum, VISUAL_DESTRUCTION_CONTRACT.longCompanyMinimumCharacters));
}

export interface DestructionNotification {
  id: string;
  title: string;
  meta: string;
  urgent: boolean;
}

export function createNotificationStorm(count = VISUAL_DESTRUCTION_CONTRACT.notificationStormCount): readonly DestructionNotification[] {
  const notifications: DestructionNotification[] = [];
  for (let index = 0; index < count; index += 1) {
    const number = index + 1;
    notifications.push({
      id: `stress-notification-${number}`,
      title: `تنبيه تشغيلي رقم ${number} — يحتاج مراجعة دون كسر التخطيط أو إخفاء النص`,
      meta: number % 3 === 0 ? 'حرج · الآن' : `قبل ${number} دقيقة`,
      urgent: number % 3 === 0,
    });
  }
  return notifications;
}

export interface DestructionTimelineItem {
  id: string;
  title: string;
  meta: string;
  description: string;
  tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
}

const TIMELINE_TONES = ['neutral', 'brand', 'success', 'warning', 'danger'] as const;

export function createDenseTimeline(count = VISUAL_DESTRUCTION_CONTRACT.denseTimelineCount): readonly DestructionTimelineItem[] {
  const items: DestructionTimelineItem[] = [];
  for (let index = 0; index < count; index += 1) {
    const number = index + 1;
    items.push({
      id: `stress-timeline-${number}`,
      title: `حدث طويل ${number} — تحديث حالة المعاملة والتحقق من جميع العلاقات والمستندات المرتبطة`,
      meta: `03/09/2026 · ${String(8 + (index % 12)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
      description: 'وصف اختباري طويل يخلط العربية مع REF-2026-998877 وIQD 8,888,888,888 للتحقق من الالتفاف والعزل ثنائي الاتجاه من دون قص أو تسرب أفقي.',
      tone: TIMELINE_TONES[index % TIMELINE_TONES.length] ?? 'neutral',
    });
  }
  return items;
}

export const MIXED_DIRECTION_STRESS_TEXT =
  'شركة ENJAZ Holding LLC — معاملة REF-2026-998877 — هاتف +964 770 123 4567 — مبلغ IQD 8,888,888,888 — بغداد / الكرادة';
