import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHELL_DESTRUCTION_FIXTURES,
  SHELL_DESTRUCTION_LIMITS,
  SHELL_DESTRUCTION_SCENARIOS,
  classifyShellViewport,
  isKeyboardOccluding,
  normalizeLongShellLabel,
  shouldRedirectExpiredSession,
} from '../src/core/shell/shellDestructionContract.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Phase 3.4 freezes exactly eight shell destruction scenarios', () => {
  assert.deepEqual([...SHELL_DESTRUCTION_SCENARIOS], [
    'keyboard', 'back', 'rotation', 'deepLink', 'sessionExpiry', 'offline', 'narrowScreen', 'longLabels',
  ]);
});

test('destruction limits freeze 320px narrow width, 120px keyboard delta and 200-char labels', () => {
  assert.equal(SHELL_DESTRUCTION_LIMITS.narrowWidthPx, 320);
  assert.equal(SHELL_DESTRUCTION_LIMITS.keyboardOcclusionPx, 120);
  assert.equal(SHELL_DESTRUCTION_LIMITS.longLabelCharacters, 200);
});

test('keyboard occlusion is deterministic and rejects invalid viewport data', () => {
  assert.equal(isKeyboardOccluding(800, 620), true);
  assert.equal(isKeyboardOccluding(800, 700), false);
  assert.equal(isKeyboardOccluding(0, 620), false);
  assert.equal(isKeyboardOccluding(Number.NaN, 620), false);
});

test('viewport classification covers narrow, portrait and landscape torture', () => {
  assert.equal(classifyShellViewport(320, 640), 'narrow');
  assert.equal(classifyShellViewport(390, 844), 'portrait');
  assert.equal(classifyShellViewport(844, 390), 'landscape');
});

test('session expiry redirects only the anonymous auth state', () => {
  assert.equal(shouldRedirectExpiredSession('checking'), false);
  assert.equal(shouldRedirectExpiredSession('authenticated'), false);
  assert.equal(shouldRedirectExpiredSession('anonymous'), true);
});

test('long label normalization remains Unicode-safe and bounded', () => {
  const value = `  ${'إنجاز '.repeat(80)}  `;
  const normalized = normalizeLongShellLabel(value);
  assert.ok([...normalized].length <= 200);
  assert.ok(!normalized.startsWith(' '));
  assert.ok(!normalized.endsWith(' '));
});

test('long Arabic fixture is exactly 200 UTF-16 characters and deep link is canonical', () => {
  assert.equal(SHELL_DESTRUCTION_FIXTURES.longArabicLabel.length, 200);
  assert.equal(SHELL_DESTRUCTION_FIXTURES.deepLink, '/app/transactions');
  assert.equal(SHELL_DESTRUCTION_FIXTURES.anonymousRedirect, '/auth/login');
});

test('protected route fails closed when the session becomes anonymous', () => {
  const source = read('src/features/auth/pages/AuthRouteGuards.tsx');
  assert.match(source, /status === 'anonymous'/);
  assert.match(source, /Navigate to=\{ROUTES\.login\} replace/);
});

test('shell runtime listens to browser online and offline recovery events', () => {
  const source = read('src/app/AppShell.tsx');
  assert.match(source, /addEventListener\('online'/);
  assert.match(source, /addEventListener\('offline'/);
  assert.match(source, /removeEventListener\('online'/);
  assert.match(source, /removeEventListener\('offline'/);
});

test('shell CSS preserves dvh, safe areas, bottom navigation and narrow-screen contracts', () => {
  const source = read('src/styles/app-shell.css');
  assert.match(source, /100dvh/);
  assert.match(source, /safe-area-inset-top/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /position: fixed/);
  assert.match(source, /@media \(max-width: 30rem\)/);
});

test('Phase 3.4 lab proves narrow, rotation, offline, long-label and deep-link fixtures', () => {
  const source = read('src/features/foundation/pages/ShellDestructionLabPage.tsx');
  for (const marker of ['320px', 'offline', 'longArabicLabel', 'appTransactions', 'landscapeClass', 'keyboardDetected']) {
    assert.ok(source.includes(marker), `missing lab marker: ${marker}`);
  }
});

test('Phase 3.4 proof route is wired in production and preview routers', () => {
  const routes = read('src/core/routing/routes.ts');
  const router = read('src/app/router.tsx');
  const previewRouter = read('src/app/previewRouter.tsx');
  assert.match(routes, /shellDestructionPreview: '\/foundation\/shell-destruction'/);
  assert.match(router, /ROUTES\.shellDestructionPreview/);
  assert.match(previewRouter, /ROUTES\.shellDestructionPreview/);
});
