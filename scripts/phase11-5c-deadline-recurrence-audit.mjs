import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

const state = json('docs/PHASE11_5_STATE.json');
const kickoff = read('docs/PHASE11_5_KICKOFF.md');
const deadline = read('database/migrations/phase_11_5_workflow_deadline_evidence.sql');
const recurrence = read('database/migrations/phase_11_5_renewal_recurrence_engine.sql');
const attention = read('database/migrations/phase_11_5_deadline_attention_review.sql');
const hardening = read('database/migrations/phase_11_5_deadline_engine_hardening.sql');
const probe = read('database/migrations/phase_11_5_live_deadline_recurrence_probe_v2.sql');

const errors = [];
const req = (value, message) => { if (!value) errors.push(message); };
const has = (source, marker, label) => req(source.includes(marker), `${label} missing marker: ${marker}`);
const lacks = (source, marker, label) => req(!source.includes(marker), `${label} forbidden marker present: ${marker}`);

req(state.phase === '11.5' && state.systemId === 'M10' && state.systemStatus === 'ACTIVE', '11.5/M10 identity invalid');
req(state.status === 'IN_PROGRESS' && state.currentSlice === '11.5-C', '11.5-C must be the active slice');
req(state.currentSliceBaseCommit === 'c74803ed0ebdf5218052f446540c0f8a422430b1', '11.5-C must retain certified 11.5-B merge SHA');
req(state.phase11_5bStatus === 'CLOSED' && state.phase11_5bExitGatePassed === true && state.phase11_5bPostMergeRecertification === 'PASS_EXACT_MAIN_SHA', '11.5-B certification must remain preserved');
req(state.phase11_6Allowed === false && state.successorStatus === 'LOCKED', '11.6 must remain locked');
req(state.exitGatePassed === false, 'Phase 11.5 cannot close during C');

for (const [field, expected] of [
  ['renewalAuthority', 'renewals'],
  ['workflowDeadlineRuleAuthority', 'workflow_template_stages.due_offset_days'],
  ['workflowDeadlineInstanceAuthority', 'workflow_instances.template_snapshot_and_workflow_stage_states'],
  ['workspaceTimezoneAuthority', 'workspaces.timezone'],
  ['notificationAttentionAuthority', 'in_app_notifications'],
  ['notificationDeliveryAuthority', 'notification_deliveries'],
  ['followupAuthority', 'transaction_followups'],
  ['auditAuthority', 'audit_events'],
]) req(state[field] === expected, `C authority drifted: ${field}`);
for (const field of [
  'shadowRenewalStoreAllowed', 'shadowWorkflowDeadlineRuleStoreAllowed', 'shadowReminderDeliveryStoreAllowed',
  'deviceTimezoneMayBecomeBusinessScheduleAuthority', 'systemMayInventMissedDeadlineRootCause',
  'crossWorkspaceReferencesAllowed', 'terminalFactSilentResurrectionAllowed',
]) req(state[field] === false, `C fail-closed law drifted: ${field}`);
req(state.deadlineSourceProvenanceRequired === true, 'deadline provenance law drifted');
req(state.renewalRecurrenceProvenanceRequired === true, 'recurrence provenance law drifted');
req(state.idempotencyRequiredForRetryableCommands === true, 'idempotency law drifted');

for (const [field, version] of [
  ['phase11_5cWorkflowDeadlineEvidenceVersion', '20260916183000'],
  ['phase11_5cRenewalRecurrenceVersion', '20260916183111'],
  ['phase11_5cAttentionReviewVersion', '20260916183227'],
  ['phase11_5cHardeningVersion', '20260916183441'],
  ['phase11_5cLiveProbeVersion', '20260916183851'],
]) req(state[field] === version, `C Real Cloud migration evidence missing/drifted: ${field}`);
for (const field of [
  'phase11_5cWorkflowDeadlineEvidenceApplied', 'phase11_5cRenewalRecurrenceApplied',
  'phase11_5cAttentionReviewApplied', 'phase11_5cHardeningApplied', 'phase11_5cLiveProbeApplied',
  'phase11_5cZeroResidueVerified', 'phase11_5cWorkflowDeadlineProvenanceVerified',
  'phase11_5cMissingRuleFailsClosed', 'phase11_5cMissingAnchorFailsClosed',
  'phase11_5cWorkspaceTimezoneVerified', 'phase11_5cRecurrenceMonthEndAnchorVerified',
  'phase11_5cUnsupportedRecurrenceFailsClosed', 'phase11_5cReminderReusesNotificationAuthority',
  'phase11_5cEscalationReusesFollowupAuthority', 'phase11_5cTerminalAttentionFailsClosed',
  'phase11_5cPrematureEscalationFailsClosed', 'phase11_5cMissRootCauseHumanExplicit',
  'phase11_5cReviewIdempotencyVerified', 'phase11_5cCommandIdempotencyVerified',
]) req(state[field] === true, `C verified capability missing: ${field}`);
req(state.phase11_5cDirectEvidenceWriteAllowed === false && state.phase11_5cDirectOccurrenceWriteAllowed === false, 'C direct authenticated evidence writes must stay closed');
req(state.phase11_5cNewSecurityAdvisorFindings === 0, 'C introduced security advisor findings');
req(state.phase11_5cNewUnindexedForeignKeys === 0, 'C introduced unindexed foreign keys');
req(state.phase11_5cRealCloudVerification === 'PASS_AUTHENTICATED_DEADLINE_RECURRENCE_REMINDER_ESCALATION_ROOT_CAUSE_RLS_ZERO_RESIDUE', 'C Real Cloud verification drifted');

for (const marker of [
  'workflow-derived deadline materialization/evidence with source provenance',
  'recurring renewal occurrence handling from canonical `renewals` facts',
  'SLA countdown, overdue state and escalation',
  'reuse Phase 11.1 notifications/follow-ups for attention/reminders',
  'explicit missed-deadline root-cause review record',
]) has(kickoff, marker, 'kickoff');

for (const marker of [
  'create table public.workflow_deadline_evidence', 'references public.workflow_instances(workspace_id,id)',
  'references public.workflow_stage_states(workspace_id,id)', 'source_fingerprint', "v_instance.template_snapshot->'stages'",
  "v_stage->>'dueOffsetDays'", 'workspaces w where w.id=p_workspace_id', 'private.m10_deadline_cutoff_v1',
  'ENJAZ_SCHEDULING_DEADLINE_RULE_MISSING', 'ENJAZ_SCHEDULING_DEADLINE_STAGE_ANCHOR_MISSING',
  'private.scheduling_command_receipts', 'scheduling.deadline.materialized', 'security invoker',
]) has(deadline, marker, 'workflow deadline migration');
lacks(deadline, 'grant insert on table public.workflow_deadline_evidence to authenticated', 'workflow deadline migration');
lacks(deadline, 'grant update on table public.workflow_deadline_evidence to authenticated', 'workflow deadline migration');

for (const marker of [
  'create table public.renewal_occurrences', 'references public.renewals(workspace_id,id)',
  'anchor_due_date', 'recurrence_rule_snapshot', 'source_renewal_version',
  "FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)", 'm10_renewal_occurrence_date_v1',
  'ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_DRIFT', 'ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_CHANGED',
  'update public.renewals set due_date=v_next_date', 'private.scheduling_command_receipts',
  'scheduling.renewal_occurrence.completed', 'security invoker',
]) has(recurrence, marker, 'recurrence migration');
lacks(recurrence, 'grant insert on table public.renewal_occurrences to authenticated', 'recurrence migration');
lacks(recurrence, 'grant update on table public.renewal_occurrences to authenticated', 'recurrence migration');

for (const marker of [
  'create table public.deadline_miss_reviews',
  'public.upsert_in_app_notification_v1', 'public.create_transaction_followup_v1',
  "p_mode not in ('reminder','escalation')", 'ENJAZ_SCHEDULING_ESCALATION_NOT_DUE',
  'ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL', 'ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED',
  'get_scheduling_deadline_snapshot_v1', "'completed_on_time'", "'completed_late'", "'overdue'", "'due_today'", "'upcoming'",
]) has(attention, marker, 'attention/review migration');
lacks(attention, 'create table public.reminders', 'attention/review migration');
lacks(attention, 'create table public.notification_deliveries', 'attention/review migration');

for (const marker of [
  'workflow_deadline_evidence_stage_state_fk_idx', 'workflow_deadline_evidence_transaction_fk_idx',
  'renewal_occurrences_materialized_by_fk_idx', 'deadline_miss_reviews_transaction_fk_idx',
  "'deadline_miss_review'", 'p_operation_id uuid', 'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT',
]) has(hardening, marker, 'C hardening migration');

for (const marker of [
  'set local role authenticated', 'P115C_DIRECT_DEADLINE_INSERT_NOT_BLOCKED', 'P115C_DIRECT_OCCURRENCE_INSERT_NOT_BLOCKED',
  'P115C_DEADLINE_REPLAY_FAIL', 'P115C_MISSING_RULE_ACCEPTED', 'P115C_MISSING_ANCHOR_ACCEPTED',
  "'2027-01-31'", "'2027-02-28'", "'2027-03-31'", 'P115C_MONTH_END_DRIFT',
  'P115C_UNSUPPORTED_RULE_ACCEPTED', 'P115C_EARLY_ESCALATION_ACCEPTED', 'P115C_TERMINAL_ATTENTION_ACCEPTED',
  'P115C_NOTIFICATION_AUTHORITY_NOT_REUSED', 'P115C_FOLLOWUP_AUTHORITY_NOT_REUSED',
  'P115C_FUTURE_REVIEW_ACCEPTED', 'P115C_REVIEW_REPLAY_FAIL', 'P115C_ZERO_RESIDUE_FAIL',
  'reset role', 'delete from public.workspaces',
]) has(probe, marker, 'C Real Cloud probe');

if (errors.length) {
  console.error(`ENJAZ PHASE 11.5-C DEADLINE/RECURRENCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 11.5-C DEADLINE/RECURRENCE AUDIT PASS — workflow-derived provenance, anchored recurrence, SLA/overdue state, existing notification/follow-up reuse, explicit human miss review, retry safety and authenticated zero-residue proof are preserved; 11.6 remains locked.');
}
