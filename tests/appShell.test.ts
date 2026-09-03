import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getShellUserInitial,
  resolveShellNetworkState,
  SHELL_MOBILE_NAV_SLOTS,
  SHELL_NAV_SLOTS,
  SHELL_TOUCH_TARGET_PX,
} from '../src/features/shell/shellContract.ts';

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

test('App Shell source owns landmarks, offline recovery and auth-safe sign-out', () => {
  const source = readFileSync('src/features/shell/AppShell.tsx', 'utf8');
  assert.match(source, /<header className="app-shell__topbar">/);
  assert.match(source, /<nav className="app-shell__navigation" aria-label="التنقل الرئيسي">/);
  assert.match(source, /<main className="app-shell__main" id="main-content"/);
  assert.match(source, /window\.addEventListener\('online'/);
  assert.match(source, /window\.addEventListener\('offline'/);
  assert.match(source, /role="alert"/);
  assert.match(source, /role="status"/);
  assert.match(source, /await service\.signOut\(\)/);
});

test('Phase 3.1 does not prematurely activate future product navigation', () => {
  const source = readFileSync('src/features/shell/AppShell.tsx', 'utf8');
  assert.match(source, /disabled/);
  assert.match(source, /سيتم تفعيلها في Phase 3\.2/);
  assert.doesNotMatch(source, /\/app\/transactions|\/app\/companies|\/app\/finance/);
});
