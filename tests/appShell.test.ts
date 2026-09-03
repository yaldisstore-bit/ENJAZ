import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getShellUserInitial,
  resolveShellNetworkState,
  SHELL_MOBILE_NAV_SLOTS,
  SHELL_NAV_SLOTS,
  SHELL_TOUCH_TARGET_PX,
} from '../src/shared/shell/shellContract.ts';
import { PRIMARY_NAVIGATION } from '../src/core/routing/navigationContract.ts';

test('shell navigation exposes five bounded slots fully bound by Phase 3.2', () => {
  assert.equal(SHELL_MOBILE_NAV_SLOTS, 5);
  assert.equal(SHELL_NAV_SLOTS.length, 5);
  assert.equal(new Set(SHELL_NAV_SLOTS.map((item) => item.id)).size, 5);
  assert.ok(SHELL_NAV_SLOTS.every((item) => item.status === 'ready'));
  assert.ok(SHELL_NAV_SLOTS.every((item) => item.destination.startsWith('/app')));
  assert.deepEqual(SHELL_NAV_SLOTS.map((item) => item.destination), PRIMARY_NAVIGATION.map((item) => item.path));
});

test('shell keeps the established 44px touch floor', () => {
  assert.equal(SHELL_TOUCH_TARGET_PX, 44);
});

test('network state resolves deterministically', () => {
  assert.equal(resolveShellNetworkState(true), 'online');
  assert.equal(resolveShellNetworkState(false), 'offline');
});

test('account initial is safe for Arabic, Latin and empty labels', () => {
  assert.equal(getShellUserInitial('إنجاز'), 'إ');
  assert.equal(getShellUserInitial(' user@example.com '), 'u');
  assert.equal(getShellUserInitial(''), 'إ');
  assert.equal(getShellUserInitial(null), 'إ');
});

test('shared shell frame owns landmarks and accessible global surfaces', () => {
  const frame = readFileSync('src/shared/shell/AppShellFrame.tsx', 'utf8');
  assert.match(frame, /<header className="app-shell__topbar">/);
  assert.match(frame, /<nav className="app-shell__navigation" aria-label="التنقل الرئيسي">/);
  assert.match(frame, /<main className="app-shell__main" id="main-content"/);
  assert.match(frame, /role="alert"/);
  assert.match(frame, /role="status"/);
  assert.match(frame, /aria-current=\{isActive \? 'page' : undefined\}/);
});

test('app composition owns online recovery, route context and auth-safe sign-out', () => {
  const source = readFileSync('src/app/AppShell.tsx', 'utf8');
  assert.match(source, /window\.addEventListener\('online'/);
  assert.match(source, /window\.addEventListener\('offline'/);
  assert.match(source, /await service\.signOut\(\)/);
  assert.match(source, /useLocation\(\)/);
  assert.match(source, /currentPath=\{location\.pathname\}/);
  assert.match(source, /<Outlet \/>/);
});

test('shell delegates route policy to the central contract instead of embedding business paths', () => {
  const frame = readFileSync('src/shared/shell/AppShellFrame.tsx', 'utf8');
  assert.match(frame, /resolvePrimaryNavigation/);
  assert.match(frame, /resolveBackDestination/);
  assert.doesNotMatch(frame, /\/app\/transactions|\/app\/companies|\/app\/finance|\/app\/documents/);
  assert.doesNotMatch(frame, /سيتم تفعيلها في Phase 3\.2/);
});
