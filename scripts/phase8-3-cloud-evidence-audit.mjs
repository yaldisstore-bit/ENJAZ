import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const probe = read('database/migrations/phase_8_3_live_authenticated_field_probe.sql');
const fk = read('database/migrations/phase_8_3_fk_index_hardening.sql');
const evidence = read('docs/PHASE8_3_REAL_CLOUD_EVIDENCE.md');
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

if (state.status !== 'IN_PROGRESS' || state.realCloudVerification?.status !== 'PENDING' || state.postMergeRecertification?.status !== 'PENDING') {
  errors.push('Phase 8.3 formal state must remain open/pending until merge and post-merge recertification');
}
if (state.phase8_4Allowed !== false || state.successorStatus !== 'LOCKED') {
  errors.push('Phase 8.4 must remain locked before formal Phase 8.3 closure');
}

if (errors.length) {
  console.error(`ENJAZ PHASE 8.3 CLOUD EVIDENCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 8.3 CLOUD EVIDENCE AUDIT PASS — production probe contract, cleanup timestamp, finance isolation and FK hardening are locked; formal state remains open until post-merge recertification.');
}
