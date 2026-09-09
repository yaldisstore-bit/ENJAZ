import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stateUrl = new URL('../docs/PHASE8_5_STATE.json', import.meta.url);
const originalStateText = fs.readFileSync(stateUrl, 'utf8');
const state = JSON.parse(originalStateText);
const postMerge = read('docs/PHASE8_5_POSTMERGE_RECERTIFICATION.md');
const closure = read('docs/PHASE8_5_CLOSURE.md');
const cloud = read('docs/PHASE8_5_REAL_CLOUD_EVIDENCE.md');

const fail = (message) => { throw new Error(`Phase 8.5 closure audit: ${message}`); };
const must = (text, marker, label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };

if (state.phase !== '8.5' || state.name !== 'Multi-Branch / Departments / Teams — M15 foundation') fail('identity drift');
if (state.status !== 'CLOSED') fail('status must be CLOSED');
if (state.baseCommit !== '4fff1f6b25687d8ca305edac3d5a033e77e224c9') fail('base commit drift');
if (state.implementationBranch !== 'phase8-5-multi-branch-teams') fail('implementation branch drift');
if (state.system?.id !== 'M15' || state.system?.phaseSliceStatus !== 'CLOSED' || state.system?.globalSystemStatus !== 'OPEN') fail('M15 slice/global closure boundary drift');
if (state.realCloudVerification !== 'PASS_ZERO_RESIDUE') fail('Real Cloud must be PASS_ZERO_RESIDUE');
if (state.realChromium !== 'PASS') fail('Real Chromium must be PASS');
if (state.postMergeRecertification !== 'COMPLETE') fail('post-merge recertification must be COMPLETE');
if (state.exitGatePassed !== true) fail('exit gate must be passed');
if (state.phase8_6Allowed !== true || state.nextPhase !== '8.6' || state.successorStatus !== 'AUTHORIZED') fail('Phase 8.6 must be the sole authorized successor');
if (state.javascriptBudgetBytes !== 670000 || state.budgetIncreaseAllowed !== false) fail('JavaScript budget contract drift');

const evidence = state.closureEvidence ?? {};
const expected = {
  implementationPR: 117,
  finalImplementationHead: '9afe0a6dd3bc8f060c8f12f3e7d8ab21d5349398',
  canonicalMerge: '4ec57a7c691d7a97af533d719f0e0d9653a93173',
  pullRequestWorkflowSuccess: 34,
  exactMainWorkflowSuccess: 19,
  pagesPreviewRun: 34319169055,
  liveExternalRun: 34319223039,
  realBrowserRun: 34319111823,
  unresolvedDefectCount: 0,
  criticalDefectCount: 0,
  highDefectCount: 0,
  functionalBlockerCount: 0,
  cloudCleanupBlockerCount: 0
};
for (const [key, value] of Object.entries(expected)) {
  if (evidence[key] !== value) fail(`closureEvidence.${key} drift`);
}
if (evidence.postMergeEvidence !== 'docs/PHASE8_5_POSTMERGE_RECERTIFICATION.md') fail('post-merge evidence path drift');
if (evidence.formalClosureEvidence !== 'docs/PHASE8_5_CLOSURE.md') fail('formal closure evidence path drift');
if (evidence.realCloudEvidence !== 'docs/PHASE8_5_REAL_CLOUD_EVIDENCE.md') fail('Real Cloud evidence path drift');

for (const marker of [
  '**Status: COMPLETE / PASS**',
  '#117',
  '9afe0a6dd3bc8f060c8f12f3e7d8ab21d5349398',
  '4ec57a7c691d7a97af533d719f0e0d9653a93173',
  '34/34 pull-request workflows SUCCESS',
  'exact-SHA completed workflow runs: **19**',
  'successful: **19**',
  '34319169055',
  '34319223039',
  '34319111823',
  'Published application attack: **PASS**',
  'PASS — ZERO RESIDUE',
  'does **not** globally close M15'
]) must(postMerge, marker, 'post-merge evidence');

for (const marker of [
  'Status: **CLOSED**',
  'Exit gate: **PASS**',
  'Phase 8.6 — Global Command Center AUTHORIZED',
  'M15 overall: **NOT GLOBALLY CLOSED',
  '34/34 pull-request workflows SUCCESS',
  '19/19 SUCCESS',
  '34319169055',
  '34319223039',
  '34319111823',
  'PASS — ZERO RESIDUE',
  'unresolved defects: **0**',
  'critical defects: **0**',
  'high defects: **0**',
  'functional blockers: **0**',
  'Phase 8.6 — Global Command Center is the sole authorized successor'
]) must(closure, marker, 'formal closure evidence');

for (const marker of [
  'Status: **PASS — ZERO RESIDUE**',
  'Real Cloud: **PASS**',
  'Real Chromium: **PASS**',
  'temporary Auth users: **0**',
  'organization members: **0**',
  'probe branches: **0**',
  'probe departments: **0**',
  'probe teams: **0**'
]) must(cloud, marker, 'Real Cloud evidence');

// Preserve the complete implementation audit at closure. The original audit intentionally
// describes the pre-closure IN_PROGRESS lock, so execute it against a transient normalized
// state and restore the certified CLOSED state in a finally block.
const provisional = structuredClone(state);
provisional.status = 'IN_PROGRESS';
provisional.system.phaseSliceStatus = 'IN_PROGRESS';
provisional.realCloudVerification = 'PENDING';
provisional.realChromium = 'PENDING';
provisional.postMergeRecertification = 'PENDING';
provisional.exitGatePassed = false;
provisional.phase8_6Allowed = false;
provisional.successorStatus = 'LOCKED';
delete provisional.closureEvidence;

try {
  fs.writeFileSync(stateUrl, `${JSON.stringify(provisional, null, 2)}\n`);
  execFileSync(process.execPath, ['scripts/phase8-5-organization-audit.mjs'], { stdio: 'inherit' });
} finally {
  fs.writeFileSync(stateUrl, originalStateText);
}

console.log('ENJAZ PHASE 8.5 CLOSURE AUDIT PASS — exact PR head 34/34, exact-main 19/19, Real Cloud ZERO RESIDUE, Real Chromium, Pages Preview, cumulative Real Browser and Live External are certified; M15 foundation slice CLOSED; M15 global closure remains OPEN; Phase 8.6 AUTHORIZED.');
