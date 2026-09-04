import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let baseSha = '';
try {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  baseSha = event?.pull_request?.base?.sha || event?.before || '';
} catch {
  // Local invocation falls back to the first parent.
}

if (!baseSha || /^0+$/.test(baseSha)) {
  try { baseSha = git(['rev-parse', 'HEAD^']); } catch { baseSha = ''; }
}

if (!baseSha) {
  console.log('ENJAZ stage delta audit: no comparable base commit; skipping only because no base exists.');
  process.exit(0);
}

const changed = git(['diff', '--name-only', `${baseSha}...HEAD`])
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

const any = (pattern) => changed.some((file) => pattern.test(file));
const list = (pattern) => changed.filter((file) => pattern.test(file));

const productChanged = any(/^src\//);
const uiChanged = any(/^src\/ui-rebirth\//);
const dataOrServiceChanged = any(/^src\/(data|services|features|auth|routing)\//);
const databaseChanged = any(/^database\/(?!scripts\/audit_)/);
const functionalTestsChanged = any(/^tests\/.*\.(test|spec)\./);
const browserTestsChanged = any(/^tests-external\//);
const destructiveGuardChanged = any(/^scripts\/.*(selftest|extreme|audit).*\.mjs$/);
const databaseSelftestChanged = any(/^database\/scripts\/audit_selftest\.py$/);

const failures = [];
if (productChanged && !(functionalTestsChanged || browserTestsChanged || destructiveGuardChanged)) {
  failures.push(`product code changed without expanding tests/guards: ${list(/^src\//).join(', ')}`);
}
if (uiChanged && !(browserTestsChanged || destructiveGuardChanged)) {
  failures.push('UI stage changed without a real-browser test or destructive/selftest guard change');
}
if (dataOrServiceChanged && !functionalTestsChanged) {
  failures.push('data/service/routing/auth stage changed without functional test changes');
}
if (databaseChanged && !(databaseSelftestChanged || functionalTestsChanged)) {
  failures.push('database stage changed without database destructive selftest or functional test changes');
}

if (failures.length) {
  console.error('ENJAZ stage delta QA FAILED: every stage must expand tests for its new behavior.');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Changed files:\n${changed.map((file) => `  ${file}`).join('\n')}`);
  process.exit(1);
}

console.log(`ENJAZ stage delta QA passed (${changed.length} changed files): stage-specific test expansion requirements satisfied.`);
