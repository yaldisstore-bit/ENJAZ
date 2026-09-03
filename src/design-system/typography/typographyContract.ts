export const TEXT_ROLE_CLASSES = Object.freeze({
  caption: 'type-caption',
  label: 'type-label',
  body: 'type-body',
  bodyLarge: 'type-body-lg',
  subtitle: 'type-subtitle',
  titleSmall: 'type-title-sm',
  titleMedium: 'type-title-md',
  titleLarge: 'type-title-lg',
  display: 'type-display',
} as const);

export type TextRole = keyof typeof TEXT_ROLE_CLASSES;

export const BIDI_TEXT_KINDS = Object.freeze({
  natural: Object.freeze({ dir: 'auto', className: 'text-auto' }),
  number: Object.freeze({ dir: 'ltr', className: 'text-numeric' }),
  money: Object.freeze({ dir: 'ltr', className: 'text-numeric' }),
  date: Object.freeze({ dir: 'ltr', className: 'text-numeric' }),
  phone: Object.freeze({ dir: 'ltr', className: 'text-ltr text-numeric' }),
  email: Object.freeze({ dir: 'ltr', className: 'text-ltr' }),
  reference: Object.freeze({ dir: 'ltr', className: 'text-code' }),
} as const);

export type BidiTextKind = keyof typeof BIDI_TEXT_KINDS;
export type BidiDirection = (typeof BIDI_TEXT_KINDS)[BidiTextKind]['dir'];

export function bidiAttributes(kind: BidiTextKind) {
  return BIDI_TEXT_KINDS[kind];
}

export const TYPOGRAPHY_GUARDS = Object.freeze({
  minimumCaptionPx: 13,
  minimumBodyPx: 16,
  rootLanguage: 'ar',
  rootDirection: 'rtl',
  maximumClampLines: 3,
} as const);
