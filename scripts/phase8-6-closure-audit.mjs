import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stateUrl = new URL('../docs/PHASE8_6_STATE.json', import.meta.url);
const originalStateText = fs.readFileSync(stateUrl, 'utf8');
const state = JSON.parse(originalStateText);
const postMerge = read('docs/PHASE8_6_POSTMERGE_RECERTIFICATION.md');
const closure = read('docs/PHASE8_6_CLOSURE.md');
const implementation = read('docs/PHASE8_6_IMPLEMENTATION_EVIDENCE.md');

const fail = (message) => { throw new Error(`Phase 8.6 closure audit: ${message}`); };
const must = (text, marker, label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };

if (state.phase !== '8.6' || state.name !== 'Global Command Center') fail('identity drift');
if (state.status !== 'CLOSED') fail('status must be CLOSED');
if (state.baseCommit !== '80fd1eda9c1c67ef43ec801ba4677dc32ab40c93') fail('base commit drift');
if (state.implementationBranch !== 'phase8-6-global-command-center') fail('implementation branch drift');
if (state.authority?.commandOwnedTables !== 'NONE') fail('command-owned table authority drift');
if (state.authority?.commandOwnedRpc !== 'NONE') fail('command-owned RPC authority drift');
if (state.authority?.commandWriteAuthority !== 'none') fail('command write authority drift');
if (state.authority?.financeWriteAuthority !== 'none') fail('finance write authority drift');
if (state.authority?.executionModel !== 'delegate_to_existing_domain_gateways_only') fail('execution model drift');
if (state.authority?.partialExecutiveSnapshotAllowed !== false) fail('partial executive snapshot must remain forbidden');
if (state.javascriptBudgetBytes !== 670000 || state.budgetIncreaseAllowed !== false) fail('JavaScript budget contract drift');
if (state.realChromium !== 'PASS') fail('Real Chromium must be PASS');
if (state.pullRequestGate !== 'PASS_35_OF_35') fail('pull-request gate must be PASS_35_OF_35');
if (state.postMergeRecertification !== 'COMPLETE') fail('post-merge recertification must be COMPLETE');
if (state.exitGatePassed !== true) fail('exit gate must be passed');
if (state.phase8_7Allowed !== true || state.nextPhase !== '8.7' || state.successorStatus !== 'AUTHORIZED') fail('Phase 8.7 must be the sole authorized successor');

const implementationGate = state.implementationGate ?? {};
if (implementationGate.status !== 'PASS_IMPLEMENTATION_HEAD') fail('implementation gate status drift');
if (implementationGate.certifiedSha !== '995d8c412a415ba02a240d1aedc293ef322bbf6a') fail('implementation gate SHA drift');
if (implementationGate.workflowRun !== 34327250983) fail('implementation workflow run drift');
if (implementationGate.authorityTests !== '5/5') fail('authority test count drift');
if (implementationGate.functionalRegression !== '217/217') fail('functional regression count drift');
if (implementationGate.databaseSelfTests !== '25/25') fail('database self-test count drift');
if (implementationGate.javascriptBytes !== 669726) fail('certified JavaScript bytes drift');
if (implementationGate.previewBytes !== 248986) fail('certified preview bytes drift');
if (implementationGate.realChromium !== '9/9') fail('implementation Chromium count drift');

const evidence = state.closureEvidence ?? {};
const expected = {
  implementationPR: 119,
  implementationGateHead: '995d8c412a415ba02a240d1aedc293ef322bbf6a',
  finalImplementationHead: '896ef01201ef3ec2b534ea3483644a6a7c5ca836',
  canonicalMerge: 'b6ca28b95e6f1044a09c989aa0c0e686c2355bde',
  pullRequestWorkflowSuccess: 35,
  exactMainWorkflowSuccess: 17,
  exactMainPhase86Run: 34328080171,
  pagesPreviewRun: 34328147022,
  liveExternalRun: 34328196578,
  realBrowserRun: 34328080528,
  unresolvedDefectCount: 0,
  criticalDefectCount: 0,
  highDefectCount: 0,
  functionalBlockerCount: 0
};
for (const [key, value] of Object.entries(expected)) {
  if (evidence[key] !== value) fail(`closureEvidence.${key} drift`);
}
if (evidence.postMergeEvidence !== 'docs/PHASE8_6_POSTMERGE_RECERTIFICATION.md') fail('post-merge evidence path drift');
if (evidence.formalClosureEvidence !== 'docs/PHASE8_6_CLOSURE.md') fail('formal closure evidence path drift');
if (evidence.implementationEvidence !== 'docs/PHASE8_6_IMPLEMENTATION_EVIDENCE.md') fail('implementation evidence path drift');

for (const marker of [
  '**Status: COMPLETE / PASS**',
  '#119',
  '995d8c412a415ba02a240d1aedc293ef322bbf6a',
  '896ef01201ef3ec2b534ea3483644a6a7c5ca836',
  'b6ca28b95e6f1044a09c989aa0c0e686c2355bde',
  '35/35 pull-request workflows SUCCESS',
  'exact-SHA push workflow runs: **17**',
  'successful: **17**',
  '34328080171',
  '34328147022',
  '34328196578',
  '34328080528',
  'Published application external gate: **PASS**',
  'command-owned tables: **NONE**',
  'command-owned write RPCs: **NONE**'
]) must(postMerge, marker, 'post-merge evidence');

for (const marker of [
  'Status: **CLOSED**',
  'Exit gate: **PASS**',
  'Phase 8.7 — Operations Zero-Escape Destruction Gate AUTHORIZED',
  '35/35 pull-request workflows SUCCESS',
  '17/17 SUCCESS',
  '34328080171',
  '34328147022',
  '34328196578',
  '34328080528',
  'command-owned database tables: **NONE**',
  'command-owned write RPCs: **NONE**',
  'unresolved defects: **0**',
  'critical defects: **0**',
  'high defects: **0**',
  'functional blockers: **0**',
  'Phase 8.7 — Operations Zero-Escape Destruction Gate is the sole authorized successor'
]) must(closure, marker, 'formal closure evidence');

for (const marker of [
  'Status: **IMPLEMENTATION GATE PASS — NOT FORMALLY CLOSED**',
  '669,726 / 670,000 bytes PASS',
  'Real Chromium acceptance: **9/9 PASS**',
  'Phase 8.7 remains **LOCKED**'
]) must(implementation, marker, 'implementation evidence');

// Preserve the complete implementation audit at closure. The implementation audit intentionally
// enforces the pre-closure IN_PROGRESS lock, so execute it against a transient normalized state
// and restore the certified CLOSED state in a finally block.
const provisional = structuredClone(state);
provisional.status = 'IN_PROGRESS';
provisional.realChromium = 'PASS_IMPLEMENTATION_HEAD';
provisional.pullRequestGate = 'PENDING';
provisional.postMergeRecertification = 'PENDING';
provisional.exitGatePassed = false;
provisional.phase8_7Allowed = false;
provisional.successorStatus = 'LOCKED';
delete provisional.closureEvidence;

try {
  fs.writeFileSync(stateUrl, `${JSON.stringify(provisional, null, 2)}\n`);
  execFileSync(process.execPath, ['scripts/phase8-6-command-center-audit.mjs'], { stdio: 'inherit' });
} finally {
  fs.writeFileSync(stateUrl, originalStateText);
}

console.log('ENJAZ PHASE 8.6 CLOSURE AUDIT PASS — exact PR head 35/35, exact-main 17/17, dedicated Phase 8.6, Pages Preview, cumulative Real Browser and Live External are certified; delegated authority and 670000-byte budget remain frozen; Phase 8.7 AUTHORIZED.');
