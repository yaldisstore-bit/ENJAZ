import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));
const fail = (message) => {
  console.error(`Phase 9.3 governance/ownership audit failed: ${message}`);
  process.exit(1);
};
const requireTrue = (condition, message) => {
  if (!condition) fail(message);
};

const predecessor = readJson('docs/PHASE9_2_STATE.json');
const state = readJson('docs/PHASE9_3_STATE.json');
const kickoff = read('docs/PHASE9_3_KICKOFF.md');
const contract = read('src/features/governance/governanceOwnershipContract.ts');
const tests = read('tests/phase9-3-governance-ownership-foundation.test.ts');
const persistence = read('database/migrations/phase_9_3_corporate_ownership_persistence.sql');
const persistenceTests = read('tests/phase9-3-corporate-ownership-persistence.test.ts');
const cloudProbe = read('database/migrations/phase_9_3_live_authenticated_ownership_probe.sql');
const fkHardening = read('database/migrations/phase_9_3_corporate_ownership_fk_index_hardening.sql');
const cloudEvidence = read('docs/PHASE9_3_REAL_CLOUD_EVIDENCE.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const expansion = read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS_EXPANSION.md');

requireTrue(predecessor.phase === '9.2', 'predecessor phase must be 9.2');
requireTrue(predecessor.status === 'CLOSED', 'Phase 9.2 must remain CLOSED');
requireTrue(predecessor.exitGatePassed === true, 'Phase 9.2 exit gate must remain passed');
requireTrue(predecessor.phase9_3Allowed === true, 'Phase 9.2 must explicitly authorize Phase 9.3');
requireTrue(predecessor.successorStatus === 'AUTHORIZED', 'Phase 9.2 successor must remain AUTHORIZED');

requireTrue(state.schemaVersion === 2, 'state schemaVersion must be 2');
requireTrue(state.phase === '9.3', 'state phase must be 9.3');
requireTrue(state.name === 'Corporate Governance & Ownership Engine — M2', 'unexpected Phase 9.3 name');
requireTrue(state.baseCommit === '1d98a57566a5bc55ceda773f02de17dacddaecb0', 'Phase 9.3 must remain based on certified Phase 9.2 merge');
requireTrue(state.implementationBranch === 'phase9-3-corporate-governance-ownership-engine', 'unexpected implementation branch');

const authority = state.authority ?? {};
requireTrue(authority.persistence === 'DATABASE_RLS_REQUIRED', 'governance persistence must require database + RLS');
requireTrue(authority.governanceWriteAuthority === 'AUTHORIZED_GOVERNANCE_COMMANDS_ONLY', 'sensitive governance writes must use authorized commands');
requireTrue(authority.companyCoreAuthority === 'REFERENCE_EXISTING_COMPANY_CORE_ONLY', 'M2 must reuse existing company core');
requireTrue(authority.partyReferenceAuthority === 'EXISTING_COMPANY_OR_PERSON_RECORDS_ONLY', 'M2 must reference existing party records');
requireTrue(authority.historicalTruth === 'VERSIONED_EFFECTIVE_DATED_GOVERNANCE_FACTS', 'historical truth must be effective-dated');
requireTrue(authority.snapshotAuthority === 'DERIVED_FROM_AUTHORITATIVE_HISTORY', 'snapshots must derive from authoritative history');
for (const [key, expected] of [
  ['directBrowserSensitiveDmlAllowed', false],
  ['shadowCompanyStoreAllowed', false],
  ['shadowPartyStoreAllowed', false],
  ['destructiveHistoryOverwriteAllowed', false],
  ['crossWorkspaceAccessAllowed', false],
]) requireTrue(authority[key] === expected, `${key} must remain ${expected}`);

const invariants = state.invariants ?? {};
requireTrue(invariants.ownershipReconcilesTo100WhereApplicable === true, '100% reconciliation invariant missing');
requireTrue(invariants.negativeOwnershipAllowed === false, 'negative ownership must remain forbidden');
requireTrue(invariants.ownershipAbove100Allowed === false, 'ownership above 100% must remain forbidden');
requireTrue(invariants.conflictingEffectivePeriodsAllowed === false, 'conflicting effective periods must remain forbidden');
requireTrue(invariants.unauthorizedGovernanceChangesAllowed === false, 'unauthorized governance changes must remain forbidden');
requireTrue(invariants.historicalSnapshotsMayUseOverwrittenCurrentFields === false, 'historical snapshots may not use overwritten current fields');
requireTrue(invariants.missingAuthorityBehavior === 'FAIL_CLOSED', 'missing authority must fail closed');
requireTrue(invariants.crossWorkspaceReferenceBehavior === 'REJECT', 'cross-workspace references must be rejected');

requireTrue(state.javascriptBudgetBytes === 670000, 'JavaScript hard ceiling changed');
requireTrue(state.budgetIncreaseAllowed === false, 'budgetIncreaseAllowed must remain false');
requireTrue(state.baselineProductionJavaScriptBytes === 669987, 'unexpected certified root baseline');
requireTrue(state.baselinePagesLiveJavaScriptBytes === 669998, 'unexpected certified Pages baseline');
requireTrue(state.baselinePagesLiveJavaScriptBytes <= state.javascriptBudgetBytes, 'certified Pages baseline exceeds budget');
requireTrue(state.budgetHeadroomGate?.baselinePagesHeadroomBytes === 2, 'baseline Pages headroom must be recorded as 2 bytes');
if (state.budgetHeadroomGate?.runtimeExpansionAllowed === true) {
  requireTrue(state.budgetHeadroomGate.status === 'PASS', 'runtime expansion requires a PASS headroom gate');
} else {
  requireTrue(state.runtime?.status === 'LOCKED_BY_BUDGET_HEADROOM_GATE', 'runtime must remain locked while headroom gate is not passed');
}

const lifecycleOpen = state.status === 'IN_PROGRESS'
  && state.exitGatePassed === false
  && state.phase9_4Allowed === false
  && state.successorStatus === 'LOCKED';
const lifecycleClosed = state.status === 'CLOSED'
  && state.exitGatePassed === true
  && state.phase9_4Allowed === true
  && state.nextPhase === '9.4'
  && state.successorStatus === 'AUTHORIZED';
requireTrue(lifecycleOpen || lifecycleClosed, 'invalid Phase 9.3 lifecycle/successor state');

for (const required of [
  'Shareholders/partners',
  'Beneficial-owner register',
  '100%',
  'effective-dated',
  'cross-workspace',
  'Phase 9.4',
  '670000',
  '2 bytes',
]) requireTrue(kickoff.includes(required), `kickoff missing required contract text: ${required}`);

for (const required of [
  "ENJAZ_GOVERNANCE_OWNERSHIP_SCHEMA = 'enjaz.governance-ownership.v1'",
  'OWNERSHIP_SCALE = 1_000_000n',
  'OWNERSHIP_TOTAL_UNITS',
  'parseOwnershipPercentage',
  'assertNoConflictingOwnershipPeriods',
  'buildOwnershipSnapshot',
  'parseBeneficialOwnerDeclaration',
  'parseGovernanceAuthorityGrant',
  'BigInt',
]) requireTrue(contract.includes(required), `contract missing ${required}`);
requireTrue(!/parseFloat\s*\(/.test(contract), 'ownership contract may not parse percentages as floats');
requireTrue(!/createCompany|updateCompany|deleteCompany|postPayment|writeLedger/.test(contract), 'contract gained forbidden source-business mutation authority');

for (const required of [
  'exact ownership reconciliation reaches 100',
  'effective periods are half-open',
  'as-of ownership snapshots preserve transfer history',
  'beneficial-owner declarations require an existing person reference shape',
  'foundation exposes no source-company or finance mutation authority',
]) requireTrue(tests.includes(required), `foundation destruction coverage missing: ${required}`);

const p = state.persistence ?? {};
requireTrue(p.status === 'REAL_CLOUD_CERTIFIED', 'persistence must remain REAL_CLOUD_CERTIFIED');
requireTrue(p.realCloudVerification === 'PASS_ZERO_RESIDUE', 'Real Cloud persistence verification must remain PASS_ZERO_RESIDUE');
requireTrue(p.directBrowserDml === 'SELECT_ONLY_RLS', 'browser governance DML authority drifted');
requireTrue(p.ownerWriteAuthority === 'require_organization_owner_v1', 'owner write authority drifted');
requireTrue(p.workspaceReadAuthority === 'require_organization_actor_v1', 'workspace read authority drifted');
requireTrue(p.operationIdempotency === true && p.optimisticVersioning === true, 'idempotency/versioning guarantees drifted');
requireTrue(p.effectiveDatedHistory === true && p.halfOpenIntervals === true && p.perCompanyTransactionSerialization === true, 'history/concurrency guarantees drifted');
requireTrue(p.phaseOwnedSecurityAdvisorWarnings === 0, 'Phase 9.3 security advisor warnings must remain zero');
requireTrue(p.phaseOwnedUnindexedForeignKeys === 0, 'Phase 9.3 unindexed foreign keys must remain zero');

const realCloud = state.realCloud ?? {};
requireTrue(realCloud.projectRef === 'juzxriirhkuzviwnhkbd', 'unexpected Real Cloud project ref');
requireTrue(realCloud.postgresVersion === '17.6', 'unexpected certified PostgreSQL version');
requireTrue(realCloud.persistenceVersion === '20260910182755', 'persistence migration version drifted');
requireTrue(realCloud.authenticatedProbeVersion === '20260910183131', 'authenticated probe migration version drifted');
requireTrue(realCloud.fkIndexHardeningVersion === '20260910183216', 'FK hardening migration version drifted');
requireTrue(realCloud.zeroResidue === true, 'Real Cloud zero residue must remain true');

for (const required of [
  'create table public.corporate_ownership_states',
  'create table public.corporate_ownership_stakes',
  'create table public.corporate_governance_events',
  'alter table public.corporate_ownership_states enable row level security',
  'grant select on table public.corporate_ownership_stakes to authenticated',
  'private.require_organization_owner_v1',
  'pg_advisory_xact_lock',
  "daterange(s.effective_from,s.effective_to,'[)')",
  'ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100',
  'ENJAZ_OWNERSHIP_STALE',
  'ENJAZ_OWNERSHIP_OPERATION_REUSED',
]) requireTrue(persistence.includes(required), `persistence migration missing ${required}`);
requireTrue(!/create\s+extension[\s\S]*btree_gist/i.test(persistence), 'persistence must not introduce btree_gist');
requireTrue(!/(?:insert\s+into|update|delete\s+from)\s+public\.(?:companies|contacts)\b/i.test(persistence), 'persistence migration may not mutate company/contact truth');

for (const required of [
  'browser roles can read authorized governance rows but cannot directly mutate them',
  'ownership writes are owner-only, serialized per company, optimistic and replay-safe',
  'half-open effective periods have a database overlap guard',
  'as-of reader derives current or historical ownership',
]) requireTrue(persistenceTests.includes(required), `persistence destruction coverage missing: ${required}`);

for (const required of [
  'ENJAZ_PHASE93_PROBE_FAILED',
  'ENJAZ_OWNERSHIP_OPERATION_REUSED',
  'ENJAZ_OWNERSHIP_STALE',
  'ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100',
  'ENJAZ_ORG_WORKSPACE_FORBIDDEN',
  'ENJAZ_ORG_OWNER_REQUIRED',
  'probe residue remains after cleanup',
]) requireTrue(cloudProbe.includes(required), `Real Cloud probe missing ${required}`);

for (const required of [
  'corporate_ownership_stakes_created_by_fk_idx',
  'corporate_governance_events_actor_user_id_fk_idx',
]) requireTrue(fkHardening.includes(required), `FK hardening missing ${required}`);

for (const required of [
  '**Result: PASS_ZERO_RESIDUE**',
  '20260910182755',
  '20260910183131',
  '20260910183216',
  'zero remaining Phase-9.3-owned unindexed foreign keys',
  'zero Phase-9.3-owned RLS/function warnings',
  '**Final Real Cloud verdict: PASS_ZERO_RESIDUE.**',
]) requireTrue(cloudEvidence.includes(required), `Real Cloud evidence missing ${required}`);

requireTrue(roadmap.includes('9.3 — Corporate Governance & Ownership Engine — M2'), 'master roadmap lost Phase 9.3 anchor');
for (const required of [
  'M2 — Corporate Governance & Ownership Engine',
  'Shareholders/partners and ownership percentages',
  'Beneficial-owner register',
  'Generate current and historical ownership snapshots from authoritative events',
]) requireTrue(expansion.includes(required), `major-system expansion lost M2 requirement: ${required}`);

console.log('Phase 9.3 governance/ownership audit: PASS — foundation + Real Cloud ownership persistence certified; runtime remains budget-gated.');
