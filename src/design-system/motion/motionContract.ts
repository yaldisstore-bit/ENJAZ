export const MOTION_DURATION_MS = Object.freeze({
  instant: 90,
  fast: 140,
  standard: 220,
  deliberate: 320,
  slow: 420,
} as const);

export const MOTION_PRESETS = Object.freeze(['fade', 'rise', 'scale'] as const);
export const MOTION_DELAYS = Object.freeze(['none', '1', '2', '3'] as const);

export type MotionPreset = (typeof MOTION_PRESETS)[number];
export type MotionDelay = (typeof MOTION_DELAYS)[number];
export type MotionPresenceState = 'entering' | 'entered' | 'exiting' | 'exited';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
