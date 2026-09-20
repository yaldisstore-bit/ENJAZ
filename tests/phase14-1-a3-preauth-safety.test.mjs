import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/phase14-1-a3-preauth-browser.yml', 'utf8');
const browser = readFileSync('tests-external/phase14-1-a3-preauth-surface.spec.cjs', 'utf8');
const state = JSON.parse(readFileSync('docs/PHASE14_1_STATE.json', 'utf8'));

test('A3 preparatory browser workflow is inert and cannot target production or consume secrets', () => {
  const inertPublishableKey = ['sb', 'publishable', 'phase141', 'a3', 'pre', 'auth', 'only'].join('_');

  assert.match(workflow, /VITE_SUPABASE_URL:\s*https:\/\/phase141-a3-preauth\.invalid/);
  assert.ok(
    workflow.includes(`VITE_SUPABASE_PUBLISHABLE_KEY: ${inertPublishableKey}`),
    'workflow must use only the exact inert publishable-key fixture',
  );
  assert.doesNotMatch(workflow, /juzxriirhkuzviwnhkbd|\.supabase\.co|secrets\.|SUPABASE_SECRET_KEY|service[_-]?role/i);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
});

test('A3 preparatory smoke remains explicitly non-certifying', () => {
  assert.equal(state.a2RealCloudStatus, 'NOT_STARTED');
  assert.equal(state.a3RealBrowserStatus, 'NOT_STARTED');
  assert.equal(state.a3PreparatoryBrowserSafetyGuard, 'ACTIVE_FAIL_CLOSED_NO_SECRETS_NO_PRODUCTION');
  assert.equal(state.a3PreparatoryBrowserStatus, 'PASS_14_OF_14_ISOLATED_CHROMIUM_NO_LIVE_AUTH');
  assert.deepEqual(state.a3PreparatoryBrowserWidths, [1280, 430, 390, 360, 320]);
  assert.equal(state.a3PreparatoryBrowserRealAndroidCertified, false);
  assert.equal(state.a3PreparatoryBrowserPublishedPortalCertified, false);
  assert.equal(state.exitGatePassed, false);
  assert.equal(state.phase14_2Allowed, false);
  assert.match(browser, /cannot certify a real client JWT/);
  assert.match(browser, /Android IME/);
  assert.doesNotMatch(browser, /signInWithPassword|admin\.createUser|SUPABASE_SECRET_KEY|service[_-]?role/i);
});

test('all five required widths and both independent surfaces stay in the preparatory matrix', () => {
  assert.match(browser, /const widths = \[1280, 430, 390, 360, 320\];/);
  assert.match(browser, /data-r2-runtime-mode="live"/);
  assert.match(browser, /data-client-portal-auth="true"/);
  assert.match(browser, /page\.goBack\(\)/);
  assert.match(browser, /context\.setOffline\(true\)/);
  assert.match(browser, /context\.setOffline\(false\)/);
});

test('workflow reruns when either UI surface, its harness, or locked dependencies change', () => {
  for (const path of [
    "'src/ui-r2/**'",
    "'src/core/auth/**'",
    "'docs/PHASE14_1_STATE.json'",
    "'r2-production-test.html'",
    "'vite.r2-production-test.config.ts'",
    "'package.json'",
    "'package-lock.json'",
    "'tests/phase14-1-a3-preauth-safety.test.mjs'",
  ]) assert.ok(workflow.includes(path), `missing workflow trigger ${path}`);
});
