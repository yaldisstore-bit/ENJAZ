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
  'Phase 13.4 requires certified closed predecessor and real formal closure evidence');
req(s.phase === '13.4' && s.status === 'IN_PROGRESS' && s.mode === 'EXPLICIT_RECONCILIATION_NO_AUTOMATED_REPAIR' &&
  s.currentSlice === 'A1_READ_ONLY_EXPECTATION_PLAN' && s.a1Status === 'IN_PROGRESS',
  'A1 phase identity or status invalid');
req(s.baseCommit === 'ee14330d5aa5d4da51b7e5d5c7fe7b4d64dae584' &&
  s.predecessorClosureMergeCommit === s.baseCommit && s.predecessorStatus === 'CLOSED' &&
  s.predecessorExactMainWorkflowCount === 43 && s.predecessorExactMainSuccessCount === 43,
  'A1 exact predecessor and post-merge evidence not pinned');
req(s.successorPhase === '13.5' && s.successorStatus === 'LOCKED' && s.phase13_5Allowed === false &&
  s.exitGatePassed === false && s.closureDecision === 'PENDING' && s.closureEvidence === null,
  'A1 must never pre-authorize 13.5');
req(s.expectedPlanSchema === 'enjaz.legacy.reconciliation.plan.v1' &&
  s.a1Source === 'VALIDATED_PHASE13_3_EXECUTION_MANIFEST' &&
  s.a1Scope?.join(',') === 'contacts,companies,transactions' &&
  s.a1ReadOnly === true && s.a1ImportedDataVerified === false &&
  s.a1ActualDatabaseReadPerformed === false && s.a2ActualReadbackAllowed === false &&
  s.a3RemediationAllowed === false, 'A1 read-only expectation boundary drifted');
for (const k of [
  'persistenceAllowed','databaseWritesAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed',
  'edgeFunctionAdded','clientUiAdded','generatedTargetIdsAllowed','automaticRepairAllowed',
  'unknownLegacyConceptAutoMappingAllowed','unreviewedBulkImportAllowed'
]) req(s[k] === false, k + ' must remain false');
req(s.javascriptBudgetBytes === 670000 && s.totalJavascriptBudgetBytes === 760000 &&
  s.cssBudgetBytes === 180000 && s.budgetIncreaseAllowed === false,
  'A1 cannot raise frozen client performance ceilings');
req(s.projectQualityConstitution?.decision === 'IN_PROGRESS' &&
  s.projectQualityConstitution.tracks.product === 'IN_PROGRESS' &&
  s.projectQualityConstitution.tracks.certification === 'IN_PROGRESS',
  'A1 must not claim whole-phase certification');
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
  'A3 exact comparison', 'Phase 13.5 — Import Destruction Gate — LOCKED'
]) has(contract, marker, 'A1 contract');
has(roadmap, '## 13.4 — Reconciliation — IN_PROGRESS / A1 READ-ONLY EXPECTATION PLAN', 'roadmap');
has(readme, 'Phase 13.4 — Reconciliation 🟡 IN PROGRESS / A1 READ-ONLY EXPECTATION PLAN', 'README');
req(!exists('database/migrations/phase_13_4_reconciliation.sql') &&
  !exists('supabase/functions/enjaz-legacy-reconcile/index.ts'),
  'A1 must not introduce DB write authority or an Edge reconciliation function');

if (errors.length) {
  console.error('ENJAZ PHASE 13.4 A1 AUDIT FAIL (' + errors.length + ')');
  for (const error of errors) console.error('- ' + error);
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 13.4 A1 AUDIT PASS — source expectations only, no database read/write or certified-result preclaim; Phase 13.5 locked.');
}
