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
  'p_client_operation_id is also the canonical visit UUID',
  'insert into public.field_visits(id,workspace_id,assignment_id,transaction_id,assigned_user_id,check_in_location,started_by)',
  'values(p_client_operation_id,p_workspace_id',
  'ENJAZ_FIELD_OPERATION_ID_CONFLICT',
  "'offlineStableIdentity',true",
]) requireMarker(offlineHardening, marker, 'offline visit identity hardening');

for (const forbidden of ['service_role', 'public.payments', 'public.financial_ledger_entries', 'public.payment_reversals']) {
  forbidMarker(migration.toLowerCase(), forbidden, 'Phase 8.3 migration');
  forbidMarker(offlineHardening.toLowerCase(), forbidden, 'offline visit identity hardening');
}
forbidMarker(migration.toLowerCase(), 'security invoker\nset search_path', 'private mutation implementation');

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
  'officialFeeEvidenceOnly',
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
]) requireMarker(tests, marker, 'field tests');

if (state.phase !== '8.3' || state.name !== 'Operations Center + Field Operations — M5' || state.status !== 'IN_PROGRESS') errors.push('Phase 8.3 state identity/status drifted');
if (state.baseCommit !== '698ba49fe80d8bc297a041afd253b01787dc460b' || state.implementationBranch !== 'phase8-3-operations-field') errors.push('Phase 8.3 base/branch drifted');
if (state.authoritativeTables?.join(',') !== 'field_assignments,field_visits,field_visit_evidence,field_sync_receipts') errors.push('Phase 8.3 authoritative tables drifted');
if (state.realCloudVerification?.status !== 'PENDING' || state.realChromium?.status !== 'PENDING' || state.offlineConflictRecovery?.status !== 'PENDING' || state.postMergeRecertification?.status !== 'PENDING') errors.push('Phase 8.3 evidence must remain PENDING before certified closure');
if (state.exitGatePassed !== false || state.phase8_4Allowed !== false || state.nextPhase !== '8.4' || state.successorStatus !== 'LOCKED') errors.push('Phase 8.4 must remain locked while Phase 8.3 is open');
if (state.m5?.status !== 'IN_PROGRESS' || state.m5?.overallClosureAllowed !== false) errors.push('M5 must remain IN_PROGRESS and not globally closed during Phase 8.3 implementation');
if (phase82.status !== 'CLOSED' || phase82.exitGatePassed !== true || phase82.phase8_3Allowed !== true || phase82.nextPhase !== '8.3') errors.push('Phase 8.2 certified closure must authorize Phase 8.3');
const m5 = major.systems?.find((system) => system.id === 'M5');
if (!m5 || m5.name !== 'ENJAZ Field Operations / Runner Mode' || !m5.anchors?.includes('8')) errors.push('M5 registry identity/anchor drifted');

for (const marker of [
  'Status: **IN PROGRESS**',
  '698ba49fe80d8bc297a041afd253b01787dc460b',
  'official fee captured during a visit is field evidence',
  'stable client operation IDs',
  'sync is idempotent using server-side receipts',
  'no background tracking contract is introduced',
  'Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17 remains LOCKED',
]) requireMarker(kickoff, marker, 'Phase 8.3 kickoff');
for (const marker of ['## 8.3 — Operations Center + Field Operations — M5', 'Queues, workloads, blocked items, workflow/automation actions and operational health.', 'field assignments, visits, check-in/out evidence, captured receipts/documents, offline-safe work and handoff to office staff.']) requireMarker(roadmap, marker, 'roadmap');
for (const marker of ['## M5 — ENJAZ Field Operations / Runner Mode', 'Daily visit route/queue.', 'Check-in/check-out at a visit with optional location evidence under explicit workspace policy.', 'Offline draft queue for notes/evidence with guarded synchronization.', 'Emergency re-assignment of visits.', 'intermittent mobile connectivity']) requireMarker(expansion, marker, 'M5 expansion');

if (errors.length) {
  console.error(`ENJAZ PHASE 8.3 OPERATIONS/FIELD AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 8.3 OPERATIONS/FIELD AUDIT PASS — canonical field authority + live operations route + visit-scoped location + replay-safe offline UUID + no finance/workflow shadow writes; Phase 8.4 LOCKED.');
}
