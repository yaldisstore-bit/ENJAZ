export const BUTTON_VARIANTS = Object.freeze(['primary', 'secondary', 'danger', 'ghost'] as const);
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const CONTROL_SIZES = Object.freeze(['default', 'large'] as const);
export type ControlSize = (typeof CONTROL_SIZES)[number];

export const ICON_BUTTON_TONES = Object.freeze(['neutral', 'brand', 'danger'] as const);
export type IconButtonTone = (typeof ICON_BUTTON_TONES)[number];

export const CARD_TONES = Object.freeze(['surface', 'muted', 'raised', 'prominent'] as const);
export type CardTone = (typeof CARD_TONES)[number];

export const BADGE_TONES = Object.freeze(['neutral', 'brand', 'success', 'warning', 'danger', 'info'] as const);
export type BadgeTone = (typeof BADGE_TONES)[number];

export const SKELETON_VARIANTS = Object.freeze(['line', 'block', 'circle'] as const);
export type SkeletonVariant = (typeof SKELETON_VARIANTS)[number];

export const COMPONENT_GUARDS = Object.freeze({
  minimumTouchTargetPx: 44,
  iconButtonRequiresAccessibleLabel: true,
  buttonDefaultType: 'button',
  fieldLabelRequired: true,
  dialogEscapeDismissal: true,
  logicalRtlOnly: true,
  noInlineStyleEscape: true,
} as const);

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
