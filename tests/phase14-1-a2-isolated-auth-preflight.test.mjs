import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectIsolatedAuthConfig, LAB_REF, PRODUCTION_REF, PREFLIGHT_PATH } from '../scripts/phase14-1-a2-isolated-auth-preflight.mjs';

const publicFixture = ['sb', 'publishable', 'inert_preflight_only'].join('_');
const adminFixture = ['sb', 'secret', 'inert_preflight_only'].join('_');
const base = () => ({
  PRODUCTION_PROJECT_REF: PRODUCTION_REF,
  ENJAZ_A2_BRANCH_REF: LAB_REF,
  ENJAZ_REAL_CLOUD_CONFIRM: 'YES',
  ENJAZ_A2_ISOLATED_BRANCH_CONFIRM: 'YES',
  SUPABASE_URL: `https://${LAB_REF}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY: publicFixture,
  SUPABASE_SECRET_KEY: adminFixture,
});
const inspect = patch => inspectIsolatedAuthConfig({ ...base(), ...patch });
const denied = patch => assert.equal(inspect(patch).ready, false);
const jwt = (ref, role) => [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ ref, role })).toString('base64url'), 'inert'].join('.');

test('missing GitHub lab credentials yield actionable names without values or cloud success', () => {
  const report = inspect({ SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SECRET_KEY: '' });
  assert.equal(report.status, 'BLOCKED_MISSING_CREDENTIALS');
  assert.deepEqual(report.missingVariables, ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']);
  assert.equal(report.networkAttempted, false);
  assert.equal(report.fixtureMutationAttempted, false);
  for (const name of report.missingVariables) denied({ [name]: '  ' });
});

test('even confirmed production or another project is denied', () => {
  for (const ref of [PRODUCTION_REF, 'aaaaaaaaaaaaaaaaaaaa', '', '../malformed']) {
    denied({ ENJAZ_A2_BRANCH_REF: ref, SUPABASE_URL: `https://${ref}.supabase.co` });
  }
  denied({ PRODUCTION_PROJECT_REF: LAB_REF });
});

test('lab origin cannot be redirected, spoofed or broadened', () => {
  for (const url of [
    `http://${LAB_REF}.supabase.co`, `https://${LAB_REF}.supabase.co/`,
    `https://${LAB_REF}.supabase.co.evil.example`, `https://${LAB_REF}.supabase.co@evil.example`,
    `https://${LAB_REF}.supabase.co/path`, `https://${LAB_REF}.supabase.co?other=1`,
    `https://${PRODUCTION_REF}.supabase.co`,
  ]) denied({ SUPABASE_URL: url });
});

test('each explicit isolated confirmation is required', () => {
  for (const name of ['ENJAZ_REAL_CLOUD_CONFIRM', 'ENJAZ_A2_ISOLATED_BRANCH_CONFIRM']) {
    for (const value of ['', 'NO', 'yes']) denied({ [name]: value });
  }
});

test('public/admin key substitution and malformed legacy claims are rejected', () => {
  denied({ SUPABASE_SECRET_KEY: publicFixture });
  denied({ SUPABASE_PUBLISHABLE_KEY: adminFixture });
  for (const value of ['inert', 'e30.invalid.inert', jwt(PRODUCTION_REF, 'service_role'), jwt(LAB_REF, 'anon')]) denied({ SUPABASE_SECRET_KEY: value });
  denied({ SUPABASE_PUBLISHABLE_KEY: jwt(PRODUCTION_REF, 'anon') });
  denied({ SUPABASE_PUBLISHABLE_KEY: jwt(LAB_REF, 'service_role') });
});

test('accepted configuration is only readiness, never JWT authentication or phase closure', () => {
  for (const patch of [{}, { SUPABASE_PUBLISHABLE_KEY: jwt(LAB_REF, 'anon'), SUPABASE_SECRET_KEY: jwt(LAB_REF, 'service_role') }]) {
    const report = inspect(patch);
    assert.equal(report.ready, true);
    assert.equal(report.status, 'READY_FOR_ISOLATED_SMOKE');
    assert.equal(report.realAuthenticatedCloudCertified, false);
    assert.equal(report.phase14_1Closed, false);
    assert.equal(report.phase14_2Allowed, false);
  }
});

test('CLI persists sanitized failure evidence before dependencies, network or fixtures', () => {
  const dir = mkdtempSync(join(tmpdir(), 'enjaz-auth-preflight-'));
  const sentinel = 'DO_NOT_PRINT_CREDENTIAL_VALUE';
  try {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/phase14-1-a2-isolated-auth-preflight.mjs', import.meta.url))], {
      cwd: dir, encoding: 'utf8', timeout: 5000,
      env: { PATH: process.env.PATH, ...base(), SUPABASE_URL: '', SUPABASE_SECRET_KEY: sentinel, GITHUB_SHA: sentinel },
    });
    assert.equal(result.status, 1);
    assert.equal(result.signal, null);
    const raw = readFileSync(join(dir, PREFLIGHT_PATH), 'utf8');
    assert.equal((result.stdout + result.stderr + raw).includes(sentinel), false);
    assert.equal((result.stdout + result.stderr + raw).includes(publicFixture), false);
    const evidence = JSON.parse(raw);
    assert.equal(evidence.sourceSha, null);
    assert.deepEqual(evidence.missingVariables, ['SUPABASE_URL']);
    assert.equal(evidence.networkAttempted, false);
    assert.equal(evidence.fixtureMutationAttempted, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('workflow runs preflight first, preserves the lab secret boundary and uploads blocked evidence', () => {
  const yaml = readFileSync('.github/workflows/phase14-1-a2-isolated-auth-smoke.yml', 'utf8');
  assert.match(yaml, /environment: phase13-4-isolated-real-cloud/);
  for (const suffix of ['URL', 'PUBLISHABLE_KEY', 'SECRET_KEY']) assert.ok(yaml.includes('secrets.PHASE13_4_SUPABASE_' + suffix));
  assert.ok(!yaml.includes('secrets.ENJAZ_SUPABASE_SECRET_KEY'));
  assert.ok(yaml.indexOf('run: node scripts/phase14-1-a2-isolated-auth-preflight.mjs') < yaml.indexOf('run: npm ci'));
  assert.match(yaml, /scripts\/phase14-1-a2-isolated-auth-preflight\.mjs/);
  assert.ok(yaml.includes(PREFLIGHT_PATH));
  assert.match(yaml, /contents: read/);
  assert.match(yaml, /if: always\(\)/);
  assert.match(yaml, /NOT full A2/);
});
