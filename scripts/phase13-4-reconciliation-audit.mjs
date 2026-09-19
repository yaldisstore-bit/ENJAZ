import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const json = path => JSON.parse(read(path));
const exists = path => fs.existsSync(new URL(path, root));
const s = json('docs/PHASE13_4_STATE.json');
const predecessor = json('docs/PHASE13_3_STATE.json');
const contract = read('docs/PHASE13_4_A1_KICKOFF.md');
const source = read('src/features/import/legacyReconciliationPlan.ts');
const tests = read('tests/phase13-4-reconciliation-plan.test.ts');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme = read('README.md');
const errors = [];
const req = (ok, message) => { if (!ok) errors.push(message); };
const has = (value, marker, label) => req(value.includes(marker), label + ' missing marker: ' + marker);

req(predecessor.status === 'CLOSED' && predecessor.closureDecision === 'PASS' &&
  predecessor.phase13_4Allowed === true && predecessor.successorStatus === 'AUTHORIZED_NEXT' &&
  predecessor.closureEvidence === 'docs/PHASE13_3_CLOSURE.md' && exists(predecessor.closureEvidence),
  'Phase 13.4 requires certified closed predecessor');

req(s.phase === '13.4' && s.status === 'CLOSED' &&
  s.mode === 'EXPLICIT_RECONCILIATION_NO_AUTOMATED_REPAIR' &&
  s.currentSlice === 'FORMAL_CLOSURE' && s.a1Status === 'CERTIFIED_MERGED_MAIN',
  'Phase 13.4 formal lifecycle invalid');

req(s.baseCommit === 'ee14330d5aa5d4da51b7e5d5c7fe7b4d64dae584' &&
  s.predecessorClosureMergeCommit === s.baseCommit &&
  s.a1MergeCommit === '03934f9a07746096eee9784b8832f5f302ffd58a',
  'Phase 13.4 lineage not pinned');

req(s.successorPhase === '13.5' && s.successorStatus === 'AUTHORIZED_NEXT' &&
  s.phase13_5Allowed === true && s.exitGatePassed === true &&
  s.closureDecision === 'PASS' && s.closureEvidence === 'docs/PHASE13_4_CLOSURE.md' &&
  exists(s.closureEvidence),
  'Phase 13.4 closure/successor transition invalid');

req(s.a2Status === 'CERTIFIED_PRODUCTION_READ_ONLY' &&
  s.a2PostgresPassCount === 16 && s.a2ActualReadbackAllowed === true &&
  s.a2ProductionFunctionInstalled === true,
  'A2 production certificate invalid');

req(s.a3Status === 'CERTIFIED_PRODUCTION_READ_ONLY' &&
  s.a3PostgresPassCount === 17 && s.a3ProductionFunctionInstalled === true &&
  s.a3RemediationAllowed === false,
  'A3 production certificate invalid');

req(s.realCloudVerification === 'PASS_ISOLATED_PROJECT_DB_RLS_AUTH_API_ZERO_RESIDUE' &&
  s.authApiCertificationStatus === 'PASS_REAL_USER_TOKEN_TRANSPORT' &&
  s.authApiFunctionalPassed === true && s.authApiCleanupPassed === true &&
  s.authApiCheckCount === 10 && s.authApiPassCount === 10 && s.authApiFailCount === 0 &&
  s.hostedDbRlsMaxItemsPassed === 5000 && s.hostedDbRlsOverLimitDenied === 5001 &&
  s.hostedRlsExactPolicyParity === true &&
  s.hostedRlsProductionPolicyCount === 15 && s.hostedRlsLabPolicyCount === 15,
  'Real Cloud/Auth/RLS certificate invalid');

req(s.implementationPullRequest === 214 &&
  s.implementationHead === '97ce9a65a9b9a062b43868241ebd0520f970543c' &&
  s.implementationMergeCommit === 'cbf654ccc3728bb639d057883ad0847f7721d38e' &&
  s.pullRequestWorkflowCount === 87 && s.pullRequestSuccessCount === 86 &&
  s.pullRequestSkippedCount === 1 && s.pullRequestFailureCount === 0,
  'implementation PR exact-head evidence drifted');

req(s.postMergeRecertification === 'PASS' && s.postMergeMainSha === 'cbf654ccc3728bb639d057883ad0847f7721d38e' &&
  s.postMergeMainWorkflowCount === 48 && s.postMergeMainSuccessCount === 42 &&
  s.postMergeMainSkippedCount === 6 && s.postMergeMainFailureCount === 0 &&
  s.postMergeMainQueuedCount === 0 && s.postMergeMainInProgressCount === 0,
  'exact-main evidence drifted');

req(s.postMergePhaseGateRunId === 35441049046 &&
  s.postMergeQualityRunId === 35441049230 &&
  s.postMergeRealBrowserRunId === 35441049242 &&
  s.postMergePagesBuildRunId === 35441048370 &&
  s.postMergePagesPreviewRunId === 35441105457 &&
  s.postMergeLiveExternalRunId === 35441132445 &&
  s.postMergePublishedPortalRunId === 35441132432,
  'exact-main primary run IDs drifted');

req(s.productionSupabaseModifiedByPhase13_4 === true &&
  s.productionSupabaseModificationScope === 'READ_ONLY_FUNCTION_INSTALL_ONLY_NO_BUSINESS_ROW_MUTATION' &&
  s.productionMigrationVersions?.join(',') === '20260919125100,20260919125103,20260919125253' &&
  s.productionPhase134SecurityAdvisorFindings === 0 &&
  s.productionFunctionAuthority === 'SECURITY_INVOKER_STABLE_AUTHENTICATED_ONLY' &&
  s.productionRealImportedDataReconciled === false,
  'production read-only deployment evidence invalid');

for (const k of [
  'persistenceAllowed','databaseWritesAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed',
  'edgeFunctionAdded','clientUiAdded','generatedTargetIdsAllowed','automaticRepairAllowed',
  'unknownLegacyConceptAutoMappingAllowed','unreviewedBulkImportAllowed'
]) req(s[k] === false, k + ' must remain false');

req(s.finalInitialJavascriptBytes === 431224 &&
  s.finalTotalJavascriptBytes === 759952 && s.finalCssBytes === 179989 &&
  s.javascriptBudgetBytes === 670000 && s.totalJavascriptBudgetBytes === 760000 &&
  s.cssBudgetBytes === 180000 && s.budgetIncreaseAllowed === false,
  'frozen performance certificate invalid');

req(s.projectQualityConstitution?.decision === 'PASS' &&
  s.projectQualityConstitution.tracks.product === 'PASS' &&
  s.projectQualityConstitution.tracks.uiUx === 'PASS_NO_CLIENT_DELTA_CUMULATIVE_BROWSER' &&
  s.projectQualityConstitution.tracks.engineering === 'PASS' &&
  s.projectQualityConstitution.tracks.certification === 'PASS',
  'four-track closure quality invalid');

for (const marker of [
  'parseLegacyOrderedImportExecutionManifest(manifestValue)', 'LEGACY_RECONCILIATION_PLAN_SCHEMA',
  'expectedCounts', 'expectedRelationshipIds', 'legacySource:', 'actualDatabaseReadPerformed: false',
  'importedDataVerified: false', 'databaseWriteAllowed: false',
  'LEGACY_RECONCILIATION_AMBIGUOUS_RELATIONSHIP'
]) has(source, marker, 'A1 source');

for (const marker of [
  'exact lineage rows', 'relationship targets', 'never claims readback',
  'byte-for-byte deterministic', 'TARGET_ID_DUPLICATE', 'AMBIGUOUS_RELATIONSHIP'
]) has(tests, marker, 'A1 tests');

for (const marker of [
  'A1 **does not read Supabase**', 'A2 authenticated evidence acquisition',
  'A3 exact comparison'
]) has(contract, marker, 'A1 contract');

has(roadmap,
  '## 13.4 — Reconciliation ✅ CLOSED / REAL CLOUD + EXACT-MAIN + PRODUCTION READ-ONLY CERTIFIED',
  'roadmap');
req(
  roadmap.includes('## 13.5 — Import Destruction Gate — AUTHORIZED_NEXT') ||
  roadmap.includes('## 13.5 — Import Destruction Gate — IN_PROGRESS /') ||
  roadmap.includes('## 13.5 — Import Destruction Gate — CLOSURE_CANDIDATE /'),
  'roadmap must preserve Phase 13.5 authorized-next history, active successor state or governed closure candidate'
);
has(readme, 'Phase 13.4 — Reconciliation ✅ CLOSED', 'README');

req(exists('database/migrations/phase_13_4_reconciliation_readback.sql') &&
  exists('database/migrations/phase_13_4_a3_trusted_comparison.sql') &&
  exists('database/migrations/phase_13_4_production_comment_normalization.sql'),
  'Phase 13.4 production migration source missing');

req(!exists('database/migrations/phase_13_4_reconciliation.sql') &&
  !exists('supabase/functions/enjaz-legacy-reconcile/index.ts'),
  'Phase 13.4 must not introduce generic write authority or production Edge reconciliation');

if (errors.length) {
  console.error('ENJAZ PHASE 13.4 AUDIT FAIL (' + errors.length + ')');
  for (const error of errors) console.error('- ' + error);
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 13.4 AUDIT PASS — formal closure certified; production A2/A3 remain read-only; Phase 13.5 authorized or actively progressing.');
}
