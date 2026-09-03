export const SHELL_TOUCH_TARGET_PX = 44;
export const SHELL_MOBILE_NAV_SLOTS = 5;
export const SHELL_CONTENT_MAX_REM = 72;

export type ShellNetworkState = 'online' | 'offline';
export type ShellNavStatus = 'ready' | 'planned';
export type ShellNavGlyph = 'home' | 'work' | 'transactions' | 'companies' | 'more';

export interface ShellNavSlot {
  id: ShellNavGlyph;
  label: string;
  status: ShellNavStatus;
  destination: '/app' | null;
}

/**
 * Phase 3.1 owns shell structure, not the final product route map.
 * Only /app is navigable here. Phase 3.2 will activate the remaining slots.
 */
export const SHELL_NAV_SLOTS: readonly ShellNavSlot[] = Object.freeze([
  { id: 'home', label: 'الرئيسية', status: 'ready', destination: '/app' },
  { id: 'work', label: 'اليوم', status: 'planned', destination: null },
  { id: 'transactions', label: 'المعاملات', status: 'planned', destination: null },
  { id: 'companies', label: 'الشركات', status: 'planned', destination: null },
  { id: 'more', label: 'المزيد', status: 'planned', destination: null },
]);

export function resolveShellNetworkState(isOnline: boolean): ShellNetworkState {
  return isOnline ? 'online' : 'offline';
}

export function getShellUserInitial(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'إ';
  return [...trimmed][0] ?? 'إ';
}
