import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const BASELINE = 'cb217b460d433d221fcecbe2b2ff994a0c16916d';

const PROTECTED_PREFIXES = [
  'database/',
  'src/core/',
  'src/data/',
  'src/features/',
  'src/shared/',
  'tests/',
  'tests-external/',
];

const PROTECTED_EXACT = new Set([
  'docs/ENJAZ_MASTER_ROADMAP.md',
  'docs/UI_REBIRTH_REFERENCE_MAP.md',
]);

const REQUIRED_UI0_FILES = [
  'docs/ENJAZ_UIUX_REBIRTH_V2_ROADMAP.md',
  'docs/UI0_FREEZE_PRESERVATION_CONTRACT.md',
  'docs/UI0_SCREEN_ROUTE_ACTION_INVENTORY.md',
  'docs/UI0_FEATURE_PRESERVATION_MATRIX.md',
  'scripts/ui0-preservation-audit.mjs',
];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(`UI-0 preservation audit: FAIL\n${message}`);
  process.exit(1);
}

for (const file of REQUIRED_UI0_FILES) {
  if (!existsSync(file)) fail(`Required UI-0 artifact is missing: ${file}`);
}

let changedFiles;
try {
  changedFiles = git('diff', '--name-only', `${BASELINE}...HEAD`)
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
} catch (error) {
  fail(`Unable to compare HEAD with frozen baseline ${BASELINE}: ${error instanceof Error ? error.message : String(error)}`);
}

const protectedChanges = changedFiles.filter((file) =>
  PROTECTED_EXACT.has(file) || PROTECTED_PREFIXES.some((prefix) => file.startsWith(prefix)),
);

if (protectedChanges.length) {
  fail([
    'UI-0 is documentation/preservation only. Protected product boundaries changed:',
    ...protectedChanges.map((file) => `- ${file}`),
  ].join('\n'));
}

const contract = readFileSync('docs/UI0_FREEZE_PRESERVATION_CONTRACT.md', 'utf8');
if (!contract.includes(BASELINE)) fail('Freeze contract does not contain the frozen baseline commit.');
if (!contract.includes('Phase 4.2 remains on HOLD')) fail('Freeze contract does not explicitly keep original Phase 4.2 on HOLD.');

const matrix = readFileSync('docs/UI0_FEATURE_PRESERVATION_MATRIX.md', 'utf8');
const requiredDestinations = [
  '/app',
  '/app/today',
  '/app/transactions',
  '/app/companies',
  '/app/people',
  '/app/finance',
  '/app/workflows',
  '/app/automation',
  '/app/operations',
  '/app/command',
  '/app/risk',
  '/app/saved-views',
  '/app/intelligence',
  '/app/documents',
  '/app/reports',
  '/app/notifications',
  '/app/follow-ups',
  '/app/copilot',
];

const inventory = readFileSync('docs/UI0_SCREEN_ROUTE_ACTION_INVENTORY.md', 'utf8');
for (const route of requiredDestinations) {
  if (!inventory.includes(`\`${route}\``)) fail(`Inventory does not preserve product route: ${route}`);
}

if (!matrix.includes('Current preview Home state')) fail('Matrix must explicitly classify preview Home state as non-authoritative.');
if (!matrix.includes('Home connected loading')) fail('Matrix must preserve the connected Home data path.');

console.log('UI-0 preservation audit: PASS');
console.log(`Frozen baseline: ${BASELINE}`);
console.log(`Changed files since baseline: ${changedFiles.length}`);
console.log('Protected product boundaries changed: 0');
