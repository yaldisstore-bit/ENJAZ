export const SHELL_DESTRUCTION_SCENARIOS = Object.freeze([
  'keyboard',
  'back',
  'rotation',
  'deepLink',
  'sessionExpiry',
  'offline',
  'narrowScreen',
  'longLabels',
] as const);

export type ShellDestructionScenario = (typeof SHELL_DESTRUCTION_SCENARIOS)[number];

export const SHELL_DESTRUCTION_LIMITS = Object.freeze({
  narrowWidthPx: 320,
  portraitHeightPx: 640,
  landscapeWidthPx: 640,
  landscapeHeightPx: 320,
  keyboardOcclusionPx: 120,
  longLabelCharacters: 200,
} as const);

export const SHELL_DESTRUCTION_FIXTURES = Object.freeze({
  deepLink: '/app/transactions',
  anonymousRedirect: '/auth/login',
  offlineMessage: 'أنت غير متصل حاليًا',
  longArabicLabel: 'شركة إنجاز الدولية للتجارة العامة والمقاولات والاستشارات القانونية وإدارة المعاملات ومتابعة الأعمال والوثائق والأرشفة والخدمات الإدارية والتشغيلية والتحول الرقمي وإدارة المخاطر والتقارير والمتابعة اليومية '.repeat(2).slice(0, 200),
} as const);

export function isKeyboardOccluding(
  layoutViewportHeight: number,
  visualViewportHeight: number,
  thresholdPx = SHELL_DESTRUCTION_LIMITS.keyboardOcclusionPx,
): boolean {
  if (!Number.isFinite(layoutViewportHeight) || !Number.isFinite(visualViewportHeight)) return false;
  if (layoutViewportHeight <= 0 || visualViewportHeight <= 0) return false;
  return layoutViewportHeight - visualViewportHeight >= thresholdPx;
}

export function classifyShellViewport(width: number, height: number): 'narrow' | 'portrait' | 'landscape' {
  if (width <= SHELL_DESTRUCTION_LIMITS.narrowWidthPx) return 'narrow';
  return width > height ? 'landscape' : 'portrait';
}

export function shouldRedirectExpiredSession(status: 'checking' | 'authenticated' | 'anonymous'): boolean {
  return status === 'anonymous';
}

export function normalizeLongShellLabel(value: string, maxCharacters = SHELL_DESTRUCTION_LIMITS.longLabelCharacters): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return [...normalized].slice(0, Math.max(1, maxCharacters)).join('');
}
