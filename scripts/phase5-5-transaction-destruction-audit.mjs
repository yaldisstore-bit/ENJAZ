import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];

const phaseState = JSON.parse(read('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json'));
const r2State = JSON.parse(read('docs/UI_UX_REBIRTH_2_0_STATE.json'));
const packageJson = JSON.parse(read('package.json'));
const kickoff = read('docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md');
const unlock = read('docs/PHASE5_5_UNLOCK_DECISION.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const workflow = read('.github/workflows/phase5-5-transaction-destruction.yml');
const destructionTest = read('tests/transactionDestructionGate.test.ts');
const browserSpecPath = 'tests-external/phase5-5-transaction-destruction.spec.cjs';
const browserSpec = exists(browserSpecPath) ? read(browserSpecPath) : '';

if (phaseState.phase !== '5.5') errors.push('Phase 5.5 state must declare phase=5.5');
if (!['ACTIVE', 'CLOSED'].includes(phaseState.status)) errors.push('Phase 5.5 state must be ACTIVE or CLOSED');
if (phaseState.status === 'ACTIVE' && phaseState.exitGatePassed !== false) errors.push('ACTIVE Phase 5.5 must fail closed with exitGatePassed=false');
if (phaseState.status === 'ACTIVE' && phaseState.phase6Allowed !== false) errors.push('Phase 6 must remain blocked while Phase 5.5 is ACTIVE');
if (phaseState.baseCommit !== 'defc0bf964b4446f92f6e96931f5643f586d9cfd') errors.push('Phase 5.5 must remain anchored to the recertified R2.0-11 closure base');

if (r2State.stage !== 'R2.0-11') errors.push('R2.0-11 must remain the closed Rebirth stage');
if (r2State.runtime !== 'ui-r2') errors.push('Canonical runtime must remain ui-r2');
if (r2State.promotion?.status !== 'CLOSED' || r2State.promotion?.allowed !== true || r2State.promotion?.exitGatePassed !== true) errors.push('R2.0-11 canonical promotion must be fully closed before Phase 5.5');
if (r2State.promotion?.canonicalMainRecertified !== true || r2State.promotion?.pagesRecertified !== true || r2State.promotion?.liveExternalRecertified !== true) errors.push('R2.0-11 main/pages/live recertification must remain true');
if (r2State.legacyEradication?.legacyZero !== true || r2State.legacyEradication?.status !== 'CLOSED') errors.push('Legacy-Zero must remain closed and true');
if (r2State.featureParity?.migratedCapabilities !== 35 || r2State.featureParity?.testedCapabilities !== 35 || r2State.featureParity?.unresolvedCapabilities !== 0) errors.push('Feature parity must remain 35/35 with zero unresolved');
if (exists('src/ui-v2') || exists('src/ui-rebirth')) errors.push('Legacy presentation directories must remain physically absent');

for (const marker of [
  'Status: **ACTIVE / NOT CLOSED**',
  'Large lists and capacity boundaries',
  'Malformed and missing relations',
  'Conflicting edits',
  'Offline and unknown-outcome failures',
  'Repeated actions',
  'Phase 6 must not start',
]) if (!kickoff.includes(marker)) errors.push(`Phase 5.5 kickoff missing marker: ${marker}`);

for (const marker of [
  'Status: **AUTHORIZED / ACTIVE**',
  'separate governance decision',
  'defc0bf964b4446f92f6e96931f5643f586d9cfd',
  'Live External recertification passed',
  'real published-app Chromium attack',
]) if (!unlock.includes(marker)) errors.push(`Phase 5.5 unlock decision missing semantic evidence marker: ${marker}`);

if (!roadmap.includes('## 5.5 — Transaction Destruction Gate')) errors.push('Master roadmap no longer contains the frozen Phase 5.5 stage');

for (const script of ['test:phase5-5', 'audit:phase5-5:transaction-destruction']) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json missing ${script}`);
}
if (!String(packageJson.scripts?.['test:functional'] ?? '').includes('transactionDestructionGate.test.ts')) errors.push('full functional regression must include the Phase 5.5 destruction gate test');
if (!String(packageJson.scripts?.['verify:extreme'] ?? '').includes('audit:phase5-5:transaction-destruction')) errors.push('verify:extreme must preserve the Phase 5.5 audit');

for (const marker of [
  'offline list failure',
  'repeated archive intent',
  'stale editor context',
  'malformed relation',
]) if (!destructionTest.includes(marker)) errors.push(`Phase 5.5 destruction test missing attack marker: ${marker}`);

if (!browserSpec) errors.push('Phase 5.5 requires a dedicated real-browser transaction destruction spec');
for (const marker of [
  'long mixed search',
  'repeated lifecycle activation',
  'malformed transaction identity',
  'list-detail-back-lifecycle pressure',
  'assertNoHorizontalOverflow',
]) if (!browserSpec.includes(marker)) errors.push(`Phase 5.5 browser destruction spec missing attack marker: ${marker}`);

for (const marker of [
  'npm run audit:phase5-5:transaction-destruction',
  'npm run test:phase5-5',
  'npm run test:functional',
  'npm run db:audit',
  'npm run typecheck',
  'npm run build -- --base=/',
  'npm run audit:dist:budget',
  'vite.r2-preview.config.ts',
  '@playwright/test@1.55.0',
  'tests-external/phase5-5-transaction-destruction.spec.cjs',
  'Real Chromium transaction destruction',
]) if (!workflow.includes(marker)) errors.push(`Phase 5.5 workflow missing gate command: ${marker}`);

if (phaseState.status === 'ACTIVE' && exists('docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md')) errors.push('Phase 5.5 closure record cannot exist while stage state is ACTIVE');

if (errors.length) {
  console.error('ENJAZ PHASE 5.5 TRANSACTION DESTRUCTION AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ PHASE 5.5 TRANSACTION DESTRUCTION AUDIT PASS — ${phaseState.status}; Phase 6 remains ${phaseState.phase6Allowed ? 'allowed' : 'blocked'}.`);
}
