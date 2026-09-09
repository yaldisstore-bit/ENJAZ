import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const state = JSON.parse(read('docs/PHASE9_1_STATE.json'));
const predecessor = JSON.parse(read('docs/PHASE8_7_STATE.json'));
const kickoff = read('docs/PHASE9_1_KICKOFF.md');
const engine = read('src/features/risk/riskEngine.ts');
const tests = read('tests/smartRiskEngine.test.ts');
const historicalRisk = read('src/ui-r2/operational-intelligence/OperationalIntelligenceExperience.tsx');
const navigation = read('src/core/routing/navigationContract.ts');

const fail = (message) => { throw new Error(`Phase 9.1 Smart Risk audit: ${message}`); };
const must = (text, marker, label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };
const forbid = (text, marker, label) => { if (text.includes(marker)) fail(`${label} contains forbidden ${marker}`); };

if (predecessor.phase !== '8.7' || predecessor.status !== 'CLOSED' || predecessor.exitGatePassed !== true || predecessor.phase9_1Allowed !== true || predecessor.nextPhase !== '9.1' || predecessor.successorStatus !== 'AUTHORIZED') {
  fail('Phase 8.7 must remain formally CLOSED and preserve its Phase 9.1 authorization evidence');
}

if (state.phase !== '9.1' || state.name !== 'Smart Risk Engine') fail('identity drift');
if (!['IN_PROGRESS', 'CLOSED'].includes(state.status)) fail('unsupported lifecycle status');
if (state.baseCommit !== '3e877ec957bedb647ef86287affe84b97ede3356') fail('base commit drift');
if (state.implementationBranch !== 'phase9-1-smart-risk-engine') fail('implementation branch drift');
if (state.predecessor?.phase !== '8.7' || state.predecessor?.requiredStatus !== 'CLOSED' || state.predecessor?.requiredAuthorization !== 'phase9_1Allowed=true') fail('predecessor contract drift');
if (state.javascriptBudgetBytes !== 670000 || state.budgetIncreaseAllowed !== false) fail('JavaScript budget drift');

const authority = state.authority ?? {};
if (authority.mode !== 'READ_ONLY_DERIVED_INTELLIGENCE') fail('risk authority mode drift');
for (const [key, expected] of Object.entries({
  riskOwnedTables: 'NONE',
  riskOwnedWriteRpc: 'NONE',
  transactionWriteAuthority: 'none',
  workflowWriteAuthority: 'none',
  financeWriteAuthority: 'none',
  companyWriteAuthority: 'none',
  automationWriteAuthority: 'none',
})) {
  if (authority[key] !== expected) fail(`authority.${key} drift`);
}
if (authority.shadowRiskTruthStoreAllowed !== false || authority.opaqueUnexplainedScoreAllowed !== false) fail('shadow/opaque risk authority must remain forbidden');

const expectedFamilies = [
  'transaction_stalled',
  'transaction_inactive',
  'open_critical_blocker',
  'deadline_overdue',
  'deadline_near',
  'workflow_sla_pressure',
  'finance_anomaly',
  'workload_concentration',
  'company_compliance_due',
];
if (JSON.stringify(state.initialSignalFamilies) !== JSON.stringify(expectedFamilies)) fail('initial signal family drift');
if (state.missingEvidenceBehavior !== 'NO_SIGNAL_FAIL_CLOSED') fail('missing-evidence behavior drift');
if (state.historicalRiskDemo?.status !== 'FROZEN_HISTORICAL_EVIDENCE_ONLY' || state.historicalRiskDemo?.canonicalProductionAuthority !== false) fail('historical R2 risk demo authority drift');

if (state.status === 'IN_PROGRESS') {
  if (state.phase9_2Allowed !== false || state.nextPhase !== '9.2' || state.successorStatus !== 'LOCKED' || state.exitGatePassed !== false) fail('Phase 9.2 must remain locked while 9.1 is in progress');
} else {
  if (state.exitGatePassed !== true || state.phase9_2Allowed !== true || state.nextPhase !== '9.2' || state.successorStatus !== 'AUTHORIZED') fail('closed Phase 9.1 must authorize only Phase 9.2');
  if (state.pullRequestGate !== 'PASS_39_OF_39_FINAL_REPAIR_HEAD') fail('final repair PR gate evidence drift');
  if (state.realBrowserVerification !== 'PASS_FINAL_CANONICAL_MAIN_AND_LIVE_EXTERNAL') fail('Real Browser closure evidence drift');
  const post = state.postMergeRecertification ?? {};
  if (post.status !== 'COMPLETE' || post.mainCommit !== '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde') fail('post-merge canonical SHA drift');
  if (post.pushWorkflowCount !== 19 || post.pushWorkflowSuccess !== 19 || post.failureCount !== 0 || post.queuedCount !== 0 || post.inProgressCount !== 0 || post.cancelledCount !== 0) fail('19/19 exact-main push evidence drift');
  if (post.exactShaWorkflowRunCount !== 22 || post.exactShaWorkflowRunSuccess !== 22) fail('22/22 exact-SHA cumulative workflow evidence drift');
  if (post.phase9GateRunId !== 34411497055 || post.realBrowserRunId !== 34411497023 || post.pagesBuildRunId !== 34411495854 || post.pagesPreviewRunId !== 34411566669 || post.liveExternalRunId !== 34411616353) fail('deployed closure run IDs drift');
  if (post.pagesBuild !== 'SUCCESS' || post.pagesPreview !== 'SUCCESS' || post.realBrowser !== 'SUCCESS' || post.liveExternal !== 'SUCCESS' || post.publishedApplicationAttack !== 'SUCCESS') fail('deployed closure result drift');
  if (!exists('docs/PHASE9_1_CLOSURE.md') || !exists('docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md')) fail('formal closure evidence files missing');
  const closure = read('docs/PHASE9_1_CLOSURE.md');
  const recert = read('docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md');
  for (const marker of ['Status: **CLOSED**', 'Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence AUTHORIZED', '9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde', '34411616353']) must(closure, marker, 'closure');
  for (const marker of ['19/19', '22/22', '34411497023', '34411566669', '34411616353']) must(recert, marker, 'post-merge recertification');
}

for (const marker of [
  'read-only intelligence',
  'risk-owned database tables: **NONE**',
  'risk-owned write RPCs: **NONE**',
  'Missing evidence must produce **no fabricated signal**',
  'stable signal code',
  'deterministic component list',
]) must(kickoff, marker, 'kickoff');
if (state.status === 'CLOSED') {
  must(kickoff, '**Status: CLOSED — POST-MERGE RECERTIFIED**', 'kickoff');
  must(kickoff, 'Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence is AUTHORIZED', 'kickoff');
} else {
  must(kickoff, '**Status: IN PROGRESS**', 'kickoff');
  must(kickoff, 'Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence remains LOCKED', 'kickoff');
}

for (const marker of [
  'export function evaluateRiskSnapshot',
  "'transaction_stalled'",
  "'transaction_inactive'",
  "'open_critical_blocker'",
  "'deadline_overdue'",
  "'deadline_near'",
  "'workflow_sla_pressure'",
  "'finance_anomaly'",
  "'workload_concentration'",
  "'company_compliance_due'",
  'components:',
  'evidence:',
  'mutates: false',
  'return Object.freeze(out)',
]) must(engine, marker, 'risk engine');
for (const forbidden of ['supabase', 'dataClient.', '.insert(', '.update(', '.delete(', '.upsert(', '.rpc(', 'fetch(']) forbid(engine, forbidden, 'risk engine');

for (const marker of [
  'empty or missing authoritative facts produce no fabricated risk signal',
  'resolved or low blocker cannot escape into critical-risk output',
  'completed/archived/cancelled work does not emit inactivity or deadline risk',
  'finance anomaly is accepted only as an already-authoritative evidence fact',
  'company compliance signal never appears without authoritative status/date evidence',
  'signals are sorted by visible severity/urgency rules, not an opaque score',
  'invalid evaluation timestamp and unsafe threshold configuration fail closed',
]) must(tests, marker, 'risk tests');

must(historicalRisk, "const DEMO_NOTE = 'عينة تفاعلية R2.0-7 · لا تدّعي بيانات إنتاج أو تنفيذًا حقيقيًا.'", 'historical risk demo');
must(historicalRisk, 'function Risk()', 'historical risk demo');
must(navigation, "{ id: 'risk', label: 'المخاطر', path: ROUTES.appRisk, deliveryPhase: '9', permission: 'authenticated', contentState: 'reserved' }", 'risk navigation reservation');

let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', state.baseCommit, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch (error) {
  fail(`cannot inspect phase diff: ${error.message}`);
}
const databaseChanges = changed.filter((path) => path.startsWith('database/'));
if (databaseChanges.length) fail(`read-only risk phase may not change database authority: ${databaseChanges.join(', ')}`);

console.log(`ENJAZ PHASE 9.1 SMART RISK AUDIT PASS — status=${state.status}; read-only explainable authority preserved; hard JS budget preserved; successor=${state.successorStatus === 'AUTHORIZED' ? '9.2 AUTHORIZED' : '9.2 LOCKED'}.`);
