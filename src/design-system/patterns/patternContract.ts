export const PATTERN_FAMILIES = Object.freeze([
  'transaction',
  'company',
  'contact',
  'finance',
  'risk',
  'timeline',
  'followUp',
  'workflow',
  'automation',
  'command',
  'search',
  'actionMenu',
  'systemState',
  'skeleton',
] as const);

export type PatternFamily = (typeof PATTERN_FAMILIES)[number];

export const TRANSACTION_STATES = Object.freeze(['active', 'stalled', 'completed', 'archived'] as const);
export type TransactionState = (typeof TRANSACTION_STATES)[number];

export const RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical'] as const);
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const FOLLOW_UP_STATES = Object.freeze(['upcoming', 'overdue', 'completed'] as const);
export type FollowUpState = (typeof FOLLOW_UP_STATES)[number];

export const WORKFLOW_STATES = Object.freeze(['completed', 'current', 'upcoming', 'blocked'] as const);
export type WorkflowState = (typeof WORKFLOW_STATES)[number];

export const AUTOMATION_STATES = Object.freeze(['active', 'paused', 'error'] as const);
export type AutomationState = (typeof AUTOMATION_STATES)[number];

export const SYSTEM_STATE_TONES = Object.freeze(['empty', 'loading', 'success', 'warning', 'error', 'conflict', 'offline', 'recovery'] as const);
export type SystemStateTone = (typeof SYSTEM_STATE_TONES)[number];

export const PATTERN_DENSITIES = Object.freeze(['comfortable', 'compact'] as const);
export type PatternDensity = (typeof PATTERN_DENSITIES)[number];

export const PATTERN_GUARDS = Object.freeze({
  mobileFirst: true,
  rtlFirst: true,
  minimumTouchTargetPx: 44,
  tokenOnlyVisuals: true,
  completeScreensForbidden: true,
  rawColorLiteralsForbidden: true,
  inlineStyleEscapeForbidden: true,
  logicalPropertiesOnly: true,
} as const);

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatIqd(value: number): string {
  if (!Number.isFinite(value)) return '0 IQD';
  return `${Math.round(value).toLocaleString('en-US')} IQD`;
}
