export const ENJAZ_VISUAL_DNA = Object.freeze({
  identity: Object.freeze({
    anchors: ['gold', 'charcoal'] as const,
    canvas: 'warm-light' as const,
    contrast: 'high-without-neon' as const,
  }),
  geometry: Object.freeze({
    compact: 'var(--ez-radius-sm)',
    standard: 'var(--ez-radius-md)',
    focal: 'var(--ez-radius-xl)',
    pill: 'var(--ez-radius-pill)',
  }),
  density: Object.freeze({
    operational: 'compact-rows' as const,
    focal: 'asymmetric-zones' as const,
    defaultCardGrid: false,
  }),
  motion: Object.freeze({
    purpose: 'hierarchy-and-action' as const,
    easing: 'var(--ez-ease-spring)',
    reducedMotionRequired: true,
  }),
  iconography: Object.freeze({
    style: 'rounded-linear' as const,
    stroke: 1.8,
    decorativeGlyphs: false,
  }),
  domains: Object.freeze({
    finance: Object.freeze({ label: 'المالية', css: 'var(--ez-domain-finance)', hint: 'Cobalt' }),
    analytics: Object.freeze({ label: 'التحليلات', css: 'var(--ez-domain-analytics)', hint: 'Violet' }),
    operations: Object.freeze({ label: 'العمليات', css: 'var(--ez-domain-operations)', hint: 'Teal' }),
    documents: Object.freeze({ label: 'الوثائق', css: 'var(--ez-domain-documents)', hint: 'Copper' }),
    risk: Object.freeze({ label: 'المخاطر', css: 'var(--ez-domain-risk)', hint: 'Red Earth' }),
  }),
});

export type EnjazDomainAccent = keyof typeof ENJAZ_VISUAL_DNA.domains;
