import {
  PRIMARY_NAVIGATION,
  type PrimaryNavigationId,
} from '../../core/routing/navigationContract.ts';
import type { AppRoute } from '../../core/routing/routes.ts';

export const SHELL_TOUCH_TARGET_PX = 44;
export const SHELL_MOBILE_NAV_SLOTS = 5;
export const SHELL_CONTENT_MAX_REM = 72;

export type ShellNetworkState = 'online' | 'offline';
export type ShellNavStatus = 'ready';
export type ShellNavGlyph = PrimaryNavigationId;

export interface ShellNavSlot {
  readonly id: ShellNavGlyph;
  readonly label: string;
  readonly status: ShellNavStatus;
  readonly destination: AppRoute;
}

/**
 * Phase 3.2 binds the five frozen shell slots to canonical routes.
 * Product content behind those routes remains reserved for its delivery phase.
 */
export const SHELL_NAV_SLOTS: readonly ShellNavSlot[] = Object.freeze(
  PRIMARY_NAVIGATION.map((item) => ({
    id: item.id,
    label: item.label,
    status: 'ready' as const,
    destination: item.path,
  })),
);

export function resolveShellNetworkState(isOnline: boolean): ShellNetworkState {
  return isOnline ? 'online' : 'offline';
}

export function getShellUserInitial(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'إ';
  return [...trimmed][0] ?? 'إ';
}
