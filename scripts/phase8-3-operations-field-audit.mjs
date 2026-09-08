import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('database/migrations/phase_8_3_operations_field_m5.sql');
const offlineHardening = read('database/migrations/phase_8_3_offline_visit_identity_hardening.sql');
const commands = read('src/features/field-operations/fieldOperationsCommands.ts');
const commandContext = read('src/features/field-operations/FieldOperationsCommandContext.tsx');
const offlineQueue = read('src/features/field-operations/fieldOperationsOfflineQueue.ts');
const liveUi = read('src/ui-r2/field-operations/LiveFieldOperationsExperience.tsx');
const css = read('src/ui-r2/field-operations/field-operations.css');
const liveRoot = read('src/ui-r2/runtime/UiR2LiveRoot.tsx');
const productionRoot = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const frozenOperational = read('src/ui-r2/operational-intelligence/OperationalIntelligenceExperience.tsx');
const tests = read('tests/fieldOperationsEngine.test.ts');
const state = JSON.parse(read('docs/PHASE8_3_STATE.json'));
const kickoff = read('docs/PHASE8_3_KICKOFF.md');
const closure = read('docs/PHASE8_3_CLOSURE.md');
const postMerge = read('docs/PHASE8_3_POSTMERGE_RECERTIFICATION.md');
const realCloudEvidence = read('docs/PHASE8_3_REAL_CLOUD_EVIDENCE.md');
const phase82 = JSON.parse(read('docs/PHASE8_2_STATE.json'));
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const expansion = read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS_EXPANSION.md');
const major = JSON.parse(read('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'));
const errors = [];

const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };
const forbidMarker = (source, marker, label) => { if (source.includes(marker)) errors.push(`${label} forbidden marker: ${marker}`); };

for (const marker of [
  'add column field_operations_policy jsonb',
  "locationEvidence','disabled'",
  'create table public.field_assignments',
  'create table public.field_visits',
  'create table public.field_visit_evidence',
  'create table public.field_sync_receipts',
  'field_sync_receipts_operation_unique',
  "status in ('queued','in_progress','visit_complete','handoff_complete','cancelled')",
  "status in ('checked_in','completed','could_not_complete')",
  "failure_reason in ('office_closed','missing_requirement','payment_issue','authority_delay','rejected','technical_issue','other')",
  'field_visit_evidence_document_required',
  'private.validate_field_location_v1',
  'ENJAZ_FIELD_LOCATION_REQUIRED',
  'ENJAZ_FIELD_LOCATION_DISABLED_BY_POLICY',
  'private.upsert_field_assignment_v1_impl',
  'private.reassign_field_assignment_v1_impl',
  'ENJAZ_FIELD_ASSIGNMENT_STALE',
  'ENJAZ_FIELD_IDEMPOTENCY_CONFLICT',
  'ENJAZ_FIELD_NOT_ASSIGNED_ACTOR',
  'private.finish_field_visit_v1_impl',
  "'officialFeeEvidenceOnly'",
  'private.add_field_visit_evidence_v1_impl',
  'ENJAZ_FIELD_EVIDENCE_DOCUMENT_MISMATCH',
  'private.handoff_field_assignment_v1_impl',
  'public.get_field_operations_context_v1',
  "'authority','field_assignments_visits_evidence_receipts'",
  "'transactionWriteAuthority','none'",
  "'workflowWriteAuthority','existing_workflow_rpc_only'",
  "'automationWriteAuthority','existing_automation_rpc_only'",
  "'financeWriteAuthority','none'",
  'public.audit_events',
  'alter table public.field_assignments enable row level security',
  'field_assignments_select_workspace',
  'field_sync_receipts_select_own',
  'revoke all on table public.field_assignments,public.field_visits,public.field_visit_evidence,public.field_sync_receipts from anon,authenticated',
]) requireMarker(migration, marker, 'Phase 8.3 migration');

for (const marker of [
  'client operation UUID is also the canonical visit UUID',
  'insert into public.field_visits(id,workspace_id,assignment_id,transaction_id,assigned_user_id,check_in_location,started_by)',
  'values(p_client_operation_id,p_workspace_id',
  'ENJAZ_FIELD_OPERATION_ID_CONFLICT',
  "'offlineStableIdentity',true",
]) requireMarker(offlineHardening, marker, 'offline visit identity hardening');

for (const forbidden of ['service_role', 'public.payments', 'public.financial_ledger_entries', 'public.payment_reversals']) {
  forbidMarker(migration.toLowerCase(), forbidden, 'Phase 8.3 migration');
  forbidMarker(offlineHardening.toLowerCase(), forbidden, 'offline visit identity hardening');
}

for (const name of ['set_field_location_policy_v1','upsert_field_assignment_v1','reassign_field_assignment_v1','start_field_visit_v1','finish_field_visit_v1','add_field_visit_evidence_v1','handoff_field_assignment_v1']) {
  const marker = `create or replace function public.${name}`;
  const start = migration.indexOf(marker);
  const end = start >= 0 ? migration.indexOf('$$;', start) : -1;
  const wrapper = start >= 0 && end >= 0 ? migration.slice(start, end + 3).toLowerCase() : '';
  if (!wrapper) errors.push(`public field wrapper missing: ${name}`);
  else {
    requireMarker(wrapper, 'security invoker', `${name} public wrapper`);
    requireMarker(wrapper, "set search_path=''", `${name} public wrapper`);
    forbidMarker(wrapper, 'security definer', `${name} public wrapper`);
  }
}
for (const name of ['set_field_location_policy_v1_impl','upsert_field_assignment_v1_impl','reassign_field_assignment_v1_impl','finish_field_visit_v1_impl','add_field_visit_evidence_v1_impl','handoff_field_assignment_v1_impl']) {
  const marker = `create or replace function private.${name}`;
  const start = migration.indexOf(marker);
  const end = start >= 0 ? migration.indexOf('$$;', start) : -1;
  const body = start >= 0 && end >= 0 ? migration.slice(start, end + 3).toLowerCase() : '';
  if (!body) errors.push(`private field implementation missing: ${name}`);
  else requireMarker(body, 'security definer', `${name} private implementation`);
}
requireMarker(offlineHardening.toLowerCase(), 'security definer', 'offline check-in private implementation');

for (const marker of [
  "export type FieldLocationPolicy = 'disabled' | 'optional' | 'required'",
  "authority: 'field_assignments_visits_evidence_receipts'",
  "transactionWriteAuthority: 'none'",
  "workflowWriteAuthority: 'existing_workflow_rpc_only'",
  "automationWriteAuthority: 'existing_automation_rpc_only'",
  "financeWriteAuthority: 'none'",
  'get_field_operations_context_v1',
  'set_field_location_policy_v1',
  'upsert_field_assignment_v1',
  'reassign_field_assignment_v1',
  'start_field_visit_v1',
  'finish_field_visit_v1',
  'add_field_visit_evidence_v1',
  'handoff_field_assignment_v1',
  "'DATA_OUTCOME_UNKNOWN'",
  'validateLocation',
]) requireMarker(commands, marker, 'field command gateway');
requireMarker(commandContext, 'FieldOperationsCommandProvider', 'field command context');
requireMarker(commandContext, 'useFieldOperationsCommandGateway', 'field command context');

for (const marker of [
  "kind: 'check_in'",
  "kind: 'check_out'",
  "kind: 'evidence'",
  "kind: 'handoff'",
  "kind: 'reassign'",
  "'pending' | 'blocked'",
  'Field offline operation id conflict',
  'Offline queue never stores file bytes',
  "error.dataCode === 'DATA_OUTCOME_UNKNOWN'",
  'syncFieldOfflineQueue',
]) requireMarker(offlineQueue, marker, 'offline queue');

for (const marker of [
  'data-field-stage="8.3"',
  'data-field-authority="field_assignments_visits_evidence_receipts"',
  'data-finance-write-authority="none"',
  'data-shadow-workflow="false"',
  'data-location-tracking="visit_scoped_only"',
  'getCurrentPosition',
  'createFieldOfflineQueue',
  'syncFieldOfflineQueue',
  'رسم رسمي مدفوع — دليل فقط، ليس Payment',
  'لا يوجد background tracking',
  'إعادة تكليف طارئة',
  'تسليم للمكتب',
  'Document UUID',
]) requireMarker(liveUi, marker, 'live field UI');
for (const forbidden of ['watchPosition', 'navigator.geolocation.watch', 'service_role']) forbidMarker(liveUi, forbidden, 'live field UI');

for (const marker of ['@media(max-width:640px)', '@media(max-width:360px)', 'env(safe-area-inset-bottom', 'prefers-reduced-motion']) requireMarker(css, marker, 'field CSS');

for (const marker of [
  "import { LiveFieldOperationsExperience } from '../field-operations/LiveFieldOperationsExperience.tsx'",
  "destinationId === 'operations') content = <LiveFieldOperationsExperience />",
  "destinationId === 'automation') content = <LiveAutomationExperience />",
]) requireMarker(liveRoot, marker, 'live root');
forbidMarker(frozenOperational, 'LiveFieldOperationsExperience', 'frozen R2.0-7 operational experience');
requireMarker(frozenOperational, 'function Operations()', 'frozen R2.0-7 operational experience');
requireMarker(frozenOperational, 'عينة تفاعلية R2.0-7', 'frozen R2.0-7 operational experience');

for (const marker of [
  'FieldOperationsCommandProvider',
  'createFieldOperationsCommandGateway(client)',
  'fieldOperationsCommands: FieldOperationsCommandGateway',
  "import '../field-operations/field-operations.css'",
]) requireMarker(productionRoot, marker, 'production root');

for (const marker of [
  'rejects any finance authority drift',
  'stable client operation UUID',
  'official fee is evidence-only',
  'offline queue is idempotent by operation UUID',
  'future canonical visit ID before first sync',
  'never stores new file bytes',
  'outcome-unknown replay remains pending',
  'blocks later offline operations',
  'lean offline validation still rejects array-shaped malformed queue rows',
  'removing the final offline operation leaves the queue empty without a separate clear path',
]) requireMarker(tests, marker, 'field tests');

if (state.phase !== '8.3' || state.name !== 'Operations Center + Field Operations — M5' || state.status !== 'CLOSED') errors.push('Phase 8.3 closed state identity/status drifted');
if (state.baseCommit !== '698ba49fe80d8bc297a041afd253b01787dc460b' || state.implementationBranch !== 'phase8-3-operations-field') errors.push('Phase 8.3 base/branch drifted');
if (state.implementationHead !== 'a80ecf5aeb3b282f36c57bdb6a6ec670f7a699fd' || state.pullRequest !== 111 || state.implementationMergeCommit !== '0d7fa6a28eaec496f9cf92e98d45f334c5505e75') errors.push('Phase 8.3 implementation certification chain drifted');
if (state.authoritativeTables?.join(',') !== 'field_assignments,field_visits,field_visit_evidence,field_sync_receipts') errors.push('Phase 8.3 authoritative tables drifted');
if (state.preClosure?.finalCertifiedHead !== '1e974bbeeec1ee1fece3fe263ec1bee2f6438a32' || state.preClosure?.finalPullRequest !== 113 || state.preClosure?.workflowCount !== 32 || state.preClosure?.successCount !== 32 || state.preClosure?.failureCount !== 0) errors.push('Phase 8.3 final PR evidence must remain 32/32 on PR #113 head');
if (state.preClosure?.fieldOfflineTestCount !== 10 || state.preClosure?.functionalTestCount !== 217 || state.preClosure?.realChromium !== 'PASS' || state.preClosure?.realChromiumAssertionCount !== 9) errors.push('Phase 8.3 final regression evidence drifted');
if (state.preClosure?.productionJsBytes !== 669685 || state.preClosure?.javascriptBudgetBytes !== 670000 || state.preClosure?.previewBytes !== 269847) errors.push('Phase 8.3 final PR size evidence drifted');
if (!Array.isArray(state.budgetRepairHistory) || state.budgetRepairHistory.length !== 2 || state.budgetRepairHistory[0]?.pullRequest !== 112 || state.budgetRepairHistory[0]?.mergeCommit !== '98194c47a0170951d4c458745c559c3eca3b3104' || state.budgetRepairHistory[1]?.pullRequest !== 113 || state.budgetRepairHistory[1]?.mergeCommit !== 'efd1d92caf2d3e4575b5cd65a4198702db71eacb') errors.push('Phase 8.3 post-merge budget repair history drifted');
if (state.realCloudVerification?.status !== 'PASS' || state.realCloudVerification?.projectRef !== 'juzxriirhkuzviwnhkbd' || state.realCloudVerification?.projectStatus !== 'ACTIVE_HEALTHY') errors.push('Phase 8.3 authenticated Real Cloud evidence drifted');
if (state.realChromium?.status !== 'PASS' || state.realChromium?.assertionCount !== 9) errors.push('Phase 8.3 Real Chromium closure evidence drifted');
if (state.offlineConflictRecovery?.status !== 'PASS' || state.offlineConflictRecovery?.unitTestCount !== 10) errors.push('Phase 8.3 offline conflict recovery evidence drifted');
const pm = state.postMergeRecertification;
if (pm?.status !== 'COMPLETE' || pm?.mainCommit !== 'efd1d92caf2d3e4575b5cd65a4198702db71eacb') errors.push('Phase 8.3 post-merge target drifted');
if (pm?.workflowCount !== 17 || pm?.successCount !== 17 || pm?.failureCount !== 0 || pm?.queuedCount !== 0 || pm?.inProgressCount !== 0 || pm?.skippedCount !== 0) errors.push('Phase 8.3 exact-main workflow census must remain 17/17 success with zero non-success outcomes');
if (pm?.pagesPreviewRunId !== 34252189997 || pm?.liveExternalRunId !== 34252257878 || pm?.canonicalPagesJsBytes !== 669877 || pm?.realPagesLiveJsBytes !== 669888 || pm?.javascriptBudgetBytes !== 670000 || pm?.publishedApplicationAttack !== 'PASS') errors.push('Phase 8.3 Pages/Live exact-SHA evidence drifted');
if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0 || state.criticalDefectCount !== 0 || state.highDefectCount !== 0 || state.functionalBlockerCount !== 0) errors.push('Phase 8.3 closure requires a passed exit gate and zero unresolved/high/critical/blocker defects');
if (state.phase8_4Allowed !== true || state.nextPhase !== '8.4' || state.successorStatus !== 'AUTHORIZED') errors.push('Phase 8.4 must be the sole authorized successor after Phase 8.3 closure');
if (state.m5?.status !== 'IN_PROGRESS' || state.m5?.phase8_3Delivery !== 'CLOSED' || state.m5?.overallClosureAllowed !== false || state.m5?.finalClosureGate !== 'Phase 8.7 individual Zero-Escape evidence') errors.push('M5 must remain globally IN_PROGRESS and gated by Phase 8.7 despite Phase 8.3 closure');
if (state.closureEvidence !== 'docs/PHASE8_3_CLOSURE.md' || state.postMergeEvidence !== 'docs/PHASE8_3_POSTMERGE_RECERTIFICATION.md' || state.realCloudEvidence !== 'docs/PHASE8_3_REAL_CLOUD_EVIDENCE.md') errors.push('Phase 8.3 evidence pointers drifted');
if (phase82.status !== 'CLOSED' || phase82.exitGatePassed !== true || phase82.phase8_3Allowed !== true || phase82.nextPhase !== '8.3') errors.push('Phase 8.2 certified closure must preserve historical authorization of Phase 8.3');
const m5 = major.systems?.find((system) => system.id === 'M5');
if (!m5 || m5.name !== 'ENJAZ Field Operations / Runner Mode' || !m5.anchors?.includes('8')) errors.push('M5 registry identity/anchor drifted');

for (const marker of [
  'Status: **IN PROGRESS**',
  '698ba49fe80d8bc297a041afd253b01787dc460b',
  'Official fee captured during a visit is field evidence',
  'stable client operation IDs',
  'sync is idempotent using server-side receipts',
  'no background tracking contract is introduced',
  'Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17 remains LOCKED',
]) requireMarker(kickoff, marker, 'historical Phase 8.3 kickoff');
for (const marker of [
  'Status: **CLOSED**',
  'Exit gate: **PASS**',
  'Successor: **Phase 8.4 AUTHORIZED**',
  '32/32 pull-request workflows successful',
  '670139 > 670000',
  '670001 > 670000',
  'efd1d92caf2d3e4575b5cd65a4198702db71eacb',
  '17/17 SUCCESS',
  '669877 / 670000 bytes',
  '669888 / 670000 bytes',
  'does **not** declare M5 globally closed',
]) requireMarker(closure, marker, 'Phase 8.3 closure evidence');
for (const marker of [
  'Status: **COMPLETE**',
  'efd1d92caf2d3e4575b5cd65a4198702db71eacb',
  'workflow runs: **17**',
  'successful: **17**',
  '34252189997',
  '34252257878',
  '669877 / 670000 bytes',
  '669888 / 670000 bytes',
  'Published application attack: **PASS**',
]) requireMarker(postMerge, marker, 'Phase 8.3 post-merge evidence');
for (const marker of ['Status: **PASS**', 'juzxriirhkuzviwnhkbd', 'created **zero** rows in `payments`', 'all remaining findings belong to pre-existing Phase 8.1/government-workflow tables']) requireMarker(realCloudEvidence, marker, 'Phase 8.3 Real Cloud evidence');
for (const marker of ['## 8.3 — Operations Center + Field Operations — M5', 'Queues, workloads, blocked items, workflow/automation actions and operational health.', 'field assignments, visits, check-in/out evidence, captured receipts/documents, offline-safe work and handoff to office staff.']) requireMarker(roadmap, marker, 'roadmap');
for (const marker of ['## M5 — ENJAZ Field Operations / Runner Mode', 'Daily visit route/queue.', 'Check-in/check-out at a visit with optional location evidence under explicit workspace policy.', 'Offline draft queue for notes/evidence with guarded synchronization.', 'Emergency re-assignment of visits.', 'intermittent mobile connectivity']) requireMarker(expansion, marker, 'M5 expansion');

if (errors.length) {
  console.error(`ENJAZ PHASE 8.3 OPERATIONS/FIELD AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 8.3 OPERATIONS/FIELD AUDIT PASS — Phase 8.3 CLOSED after Real Cloud, Real Chromium, 32/32 final PR, exact-main 17/17, Pages 669877/670000, /live 669888/670000 and published-app attack PASS; Phase 8.4 AUTHORIZED; M5 overall remains gated by Phase 8.7.');
}
