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

test('A3 preparatory smoke remains non-certifying beside the evidence-bound published certificate', () => {
  // The inert pre-auth smoke must never certify A3; it may run after a separately
  // anchored hosted A2 certificate without regressing the phase state.
  const a2Prior = state.a2RealCloudStatus === 'NOT_STARTED' ||
    state.a2RealCloudStatus.endsWith('_NOT_CERTIFIED');
  const a2Anchored = state.a2RealCloudStatus ===
      'PASS_HOSTED_J01_J11_N02_AND_CLIENT_CLOCK_REVOKED_REFRESH_N13_ZERO_RESIDUE' &&
    state.a2LatestLinkedRun === '35632402943' &&
    state.a2LatestLinkedHead === '63c3ff4728f597c2560f0c14080c8846fe880fe7' &&
    state.a2LatestLinkedCheckCount === 149 &&
    state.a2N13RealElapsedJwtExpiryCertified === false;
  assert.ok(a2Prior || a2Anchored,
    `A2 must be uncertified or match the separately anchored hosted evidence; got ${state.a2RealCloudStatus}`);
  assert.notEqual(state.a2RealCloudStatus, 'PASS');
  assert.ok([
    'PASS_REAL_AUTH_FIVE_WIDTH_CHROMIUM_OFFLINE_NOT_FULL_A3',
    'PASS_REAL_AUTH_FIVE_WIDTH_CHROMIUM_OFFLINE_PUBLISHED_HTTPS_NOT_FULL_A3',
  ].includes(state.a3RealBrowserStatus));
  assert.equal(state.a3PreparatoryBrowserSafetyGuard, 'ACTIVE_FAIL_CLOSED_NO_SECRETS_NO_PRODUCTION');
  assert.equal(state.a3PreparatoryBrowserStatus, 'PASS_14_OF_14_ISOLATED_CHROMIUM_NO_LIVE_AUTH');
  assert.deepEqual(state.a3PreparatoryBrowserWidths, [1280, 430, 390, 360, 320]);
  assert.equal(state.a3PreparatoryBrowserRealAndroidCertified, false);
  assert.equal(state.a3PreparatoryBrowserPublishedPortalCertified, false);
  assert.equal(state.a3RealBrowserPhysicalAndroidCertified, false);
  if (state.a3RealBrowserPublishedPortalCertified) {
    assert.equal(state.a3RealBrowserStatus,
      'PASS_REAL_AUTH_FIVE_WIDTH_CHROMIUM_OFFLINE_PUBLISHED_HTTPS_NOT_FULL_A3');
    assert.equal(state.a3RealBrowserEvidenceRun, '35682270629');
    assert.equal(state.a3RealBrowserEvidenceHead, '6ff525f103579d5f5f0392aecd4bd58d0e96a68e');
    assert.equal(state.a3RealBrowserCaseCount, 17);
    assert.equal(state.a3PublishedPortalIntegratedCheckCount, 151);
    assert.equal(state.a3PublishedPortalExactShaBound, true);
    assert.equal(state.a3PublishedPortalTemporaryTunnelClosed, true);
    assert.equal(state.a3PublishedPortalUrlRetained, false);
    assert.equal(state.a3PublishedPortalProductionMutationPerformed, false);
    assert.equal(state.a3PhysicalAndroidRemaining, true);
  } else {
    assert.equal(state.a3RealBrowserStatus,
      'PASS_REAL_AUTH_FIVE_WIDTH_CHROMIUM_OFFLINE_NOT_FULL_A3');
  }
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
