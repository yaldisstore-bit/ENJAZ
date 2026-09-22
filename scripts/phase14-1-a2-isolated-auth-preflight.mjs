import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LAB_REF = 'nqhgaukutkyvfumbtbtg';
export const PRODUCTION_REF = 'juzxriirhkuzviwnhkbd';
export const PREFLIGHT_PATH = 'artifacts/phase14-1-a2-isolated-auth/preflight.json';
const credentialNames = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'];

// Decoding only detects an obviously wrong legacy key. It never authenticates a
// JWT or replaces the Supabase server's signature and project checks.
function legacyKeyMatches(value, role) {
  try {
    const parts = value.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.role === role && payload.ref === LAB_REF;
  } catch { return false; }
}

// Pure, network-free validation. Returned diagnostics contain variable names and
// fixed codes only: NEVER include an environment value, key, JWT or thrown error.
export function inspectIsolatedAuthConfig(env) {
  const missing = credentialNames.filter(name => typeof env[name] !== 'string' || !env[name].trim());
  const errors = [];
  if (missing.length) errors.push('MISSING_LAB_CREDENTIALS');
  if (env.PRODUCTION_PROJECT_REF !== PRODUCTION_REF) errors.push('PRODUCTION_REFERENCE_MISMATCH');
  if (env.ENJAZ_A2_BRANCH_REF !== LAB_REF) errors.push('UNAPPROVED_LAB_REFERENCE');
  if (env.SUPABASE_URL && env.SUPABASE_URL !== `https://${LAB_REF}.supabase.co`) errors.push('UNAPPROVED_LAB_ORIGIN');
  if (env.ENJAZ_REAL_CLOUD_CONFIRM !== 'YES' || env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM !== 'YES') errors.push('EXPLICIT_ISOLATED_CONFIRMATION_REQUIRED');
  const pub = env.SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  if (pub && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(pub) && !legacyKeyMatches(pub, 'anon')) errors.push('INVALID_LAB_PUBLIC_KEY_KIND');
  if (secret && (secret === pub || (!/^sb_secret_[A-Za-z0-9_-]+$/.test(secret) && !legacyKeyMatches(secret, 'service_role')))) errors.push('INVALID_LAB_ADMIN_KEY_KIND');
  return {
    schema: 'enjaz.phase14-1.a2.isolated-auth-preflight.v1',
    sourceSha: /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') ? env.GITHUB_SHA : null,
    projectRef: LAB_REF,
    productionProjectRef: PRODUCTION_REF,
    status: missing.length ? 'BLOCKED_MISSING_CREDENTIALS' : errors.length ? 'BLOCKED_UNSAFE_CONFIGURATION' : 'READY_FOR_ISOLATED_SMOKE',
    ready: errors.length === 0,
    missingVariables: missing,
    errors,
    networkAttempted: false,
    fixtureMutationAttempted: false,
    realAuthenticatedCloudCertified: false,
    phase14_1Closed: false,
    phase14_2Allowed: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = inspectIsolatedAuthConfig(process.env);
  mkdirSync('artifacts/phase14-1-a2-isolated-auth', { recursive: true });
  writeFileSync(PREFLIGHT_PATH, JSON.stringify(report, null, 2) + '\n');
  if (!report.ready) {
    console.error('Isolated Auth smoke blocked before network or fixtures: ' + report.errors.join(', '));
    if (report.missingVariables.length) console.error('Missing environment variables: ' + report.missingVariables.join(', '));
    process.exitCode = 1;
  } else {
    console.log('Isolated Auth configuration accepted. No live Auth/JWT or Phase 14.1 certification yet.');
  }
}
