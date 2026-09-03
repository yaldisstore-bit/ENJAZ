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

test('shell navigation exposes five bounded slots with only home activated in Phase 3.1', () => {
  assert.equal(SHELL_MOBILE_NAV_SLOTS, 5);
  assert.equal(SHELL_NAV_SLOTS.length, 5);
  assert.equal(new Set(SHELL_NAV_SLOTS.map((item) => item.id)).size, 5);
  const ready = SHELL_NAV_SLOTS.filter((item) => item.status === 'ready');
  assert.deepEqual(ready, [{ id: 'home', label: 'الرئيسية', status: 'ready', destination: '/app' }]);
  assert.equal(SHELL_NAV_SLOTS.filter((item) => item.destination === null).length, 4);
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
});

test('app composition owns online recovery and auth-safe sign-out', () => {
  const source = readFileSync('src/app/AppShell.tsx', 'utf8');
  assert.match(source, /window\.addEventListener\('online'/);
  assert.match(source, /window\.addEventListener\('offline'/);
  assert.match(source, /await service\.signOut\(\)/);
  assert.match(source, /<Outlet \/>/);
});

test('Phase 3.1 does not prematurely activate future product navigation', () => {
  const frame = readFileSync('src/shared/shell/AppShellFrame.tsx', 'utf8');
  assert.match(frame, /disabled/);
  assert.match(frame, /سيتم تفعيلها في Phase 3\.2/);
  assert.doesNotMatch(frame, /\/app\/transactions|\/app\/companies|\/app\/finance/);
});
