import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const probe = read('database/migrations/phase_8_3_live_authenticated_field_probe.sql');
const fk = read('database/migrations/phase_8_3_fk_index_hardening.sql');
const evidence = read('docs/PHASE8_3_REAL_CLOUD_EVIDENCE.md');
const closure = read('docs/PHASE8_3_CLOSURE.md');
const postMerge = read('docs/PHASE8_3_POSTMERGE_RECERTIFICATION.md');
const state = JSON.parse(read('docs/PHASE8_3_STATE.json'));
const errors = [];

const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`);
};
const forbidMarker = (source, marker, label) => {
  if (source.includes(marker)) errors.push(`${label} forbidden marker: ${marker}`);
};

for (const marker of [
  'SET LOCAL ROLE authenticated'.toLowerCase(),
  "not has_table_privilege('public.field_assignments','INSERT')".toLowerCase(),
  "body->>'financeWriteAuthority'='none'".toLowerCase(),
  'ENJAZ_FIELD_ASSIGNMENT_STALE'.toLowerCase(),
  'ENJAZ_FIELD_IDEMPOTENCY_CONFLICT'.toLowerCase(),
  "body->>'visitId'=current_setting('enjaz.probe_checkin_operation_id')".toLowerCase(),
  "(select count(*)=0 from public.payments".toLowerCase(),
  "(body->>'officialFeeEvidenceOnly')::boolean".toLowerCase(),
  "body->>'status'='handoff_complete'".toLowerCase(),
  "occurred_at>=current_setting('enjaz.probe_started_at')".toLowerCase(),
  "field_operations_policy=current_setting('enjaz.probe_prior_policy')::jsonb".toLowerCase(),
  'probe cleanup left canonical data residue'.toLowerCase(),
]) requireMarker(probe.toLowerCase(), marker, 'Real Cloud probe');
forbidMarker(probe.toLowerCase(), "created_at>=current_setting('enjaz.probe_started_at')", 'Real Cloud probe');

for (const marker of [
  'field_assignments_created_by_idx',
  'field_assignments_handoff_by_idx',
  'field_assignments_transaction_fk_idx',
  'field_visits_started_by_idx',
  'field_visits_completed_by_idx',
  'field_visits_transaction_fk_idx',
  'field_visit_evidence_captured_by_idx',
  'field_visit_evidence_document_fk_idx',
  'field_visit_evidence_transaction_fk_idx',
  'field_sync_receipts_created_by_fk_idx',
]) requireMarker(fk, marker, 'Phase 8.3 FK hardening');

for (const marker of [
  'Status: **PASS**',
  'juzxriirhkuzviwnhkbd',
  '`phase_8_3_operations_field_m5`',
  '`phase_8_3_offline_visit_identity_hardening`',
  '`phase_8_3_live_authenticated_field_probe`',
  '`phase_8_3_fk_index_hardening`',
  'direct `INSERT` / `UPDATE` / `DELETE` privileges',
  'the check-in client operation UUID became the canonical visit UUID',
  'created **zero** rows in `payments`',
  'all remaining findings belong to pre-existing Phase 8.1/government-workflow tables',
  'does **not** by itself close Phase 8.3',
]) requireMarker(evidence, marker, 'Phase 8.3 Real Cloud evidence');

if (state.status !== 'CLOSED') errors.push('Phase 8.3 must be CLOSED after certified post-merge recertification');
if (state.realCloudVerification?.status !== 'PASS' || state.realCloudVerification?.projectRef !== 'juzxriirhkuzviwnhkbd' || state.realCloudVerification?.projectStatus !== 'ACTIVE_HEALTHY') errors.push('Phase 8.3 formal closure must bind the authenticated Real Cloud PASS evidence');
if (state.postMergeRecertification?.status !== 'COMPLETE' || state.postMergeRecertification?.mainCommit !== 'efd1d92caf2d3e4575b5cd65a4198702db71eacb') errors.push('Phase 8.3 cloud evidence may close only with exact-main post-merge recertification complete');
if (state.postMergeRecertification?.workflowCount !== 17 || state.postMergeRecertification?.successCount !== 17 || state.postMergeRecertification?.failureCount !== 0 || state.postMergeRecertification?.queuedCount !== 0 || state.postMergeRecertification?.inProgressCount !== 0 || state.postMergeRecertification?.skippedCount !== 0) errors.push('Phase 8.3 exact-main closure census drifted');
if (state.postMergeRecertification?.pagesPreviewRunId !== 34252189997 || state.postMergeRecertification?.liveExternalRunId !== 34252257878 || state.postMergeRecertification?.publishedApplicationAttack !== 'PASS') errors.push('Phase 8.3 deployed Pages/Live evidence drifted');
if (state.phase8_4Allowed !== true || state.successorStatus !== 'AUTHORIZED' || state.nextPhase !== '8.4') errors.push('Phase 8.4 must be authorized after certified Phase 8.3 closure');
if (state.m5?.overallClosureAllowed !== false || state.m5?.finalClosureGate !== 'Phase 8.7 individual Zero-Escape evidence') errors.push('Real Cloud evidence must not be used to globally close M5 before Phase 8.7');
if (state.realCloudEvidence !== 'docs/PHASE8_3_REAL_CLOUD_EVIDENCE.md' || state.closureEvidence !== 'docs/PHASE8_3_CLOSURE.md' || state.postMergeEvidence !== 'docs/PHASE8_3_POSTMERGE_RECERTIFICATION.md') errors.push('Phase 8.3 evidence pointers drifted');

for (const marker of [
  'Status: **CLOSED**',
  'Successor: **Phase 8.4 AUTHORIZED**',
  'Authenticated Real Cloud verification remains **PASS**',
  'juzxriirhkuzviwnhkbd',
  'created **zero** rows in `payments`',
  'Phase 8.7 remains the individual Zero-Escape closure gate',
]) requireMarker(closure, marker, 'Phase 8.3 closure evidence');
for (const marker of [
  'Status: **COMPLETE**',
  'efd1d92caf2d3e4575b5cd65a4198702db71eacb',
  '34252189997',
  '34252257878',
  'Published application attack: **PASS**',
]) requireMarker(postMerge, marker, 'Phase 8.3 post-merge evidence');

if (errors.length) {
  console.error(`ENJAZ PHASE 8.3 CLOUD EVIDENCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 8.3 CLOUD EVIDENCE AUDIT PASS — authenticated production probe + cleanup + finance isolation + FK hardening remain bound to exact-main 17/17 Pages/Live recertification; Phase 8.3 CLOSED, Phase 8.4 AUTHORIZED, M5 global closure still gated by Phase 8.7.');
}
