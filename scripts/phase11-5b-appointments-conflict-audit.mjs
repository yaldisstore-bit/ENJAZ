import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));
const state = json('docs/PHASE11_5_STATE.json');
const kickoff = read('docs/PHASE11_5_KICKOFF.md');
const authority = read('database/migrations/phase_11_5_appointments_conflict_authority.sql');
const commands = read('database/migrations/phase_11_5_appointment_governed_commands.sql');
const probe = read('database/migrations/phase_11_5_live_appointments_conflict_probe.sql');
const gateway = read('src/features/scheduling/schedulingCommands.ts');
const tests = read('tests/schedulingCommands.test.ts');

const errors = [];
const req = (value, message) => { if (!value) errors.push(message); };
const has = (source, marker, label) => req(source.includes(marker), `${label} missing marker: ${marker}`);
const lacks = (source, marker, label) => req(!source.includes(marker), `${label} forbidden marker present: ${marker}`);
const allowedSlices = new Set(['11.5-B', '11.5-C', '11.5-D']);
const bIsCurrent = state.currentSlice === '11.5-B';
const phaseClosed = state.status === 'CLOSED';

req(state.phase === '11.5' && state.systemId === 'M10' && state.systemStatus === 'ACTIVE', '11.5/M10 identity invalid');
req(['IN_PROGRESS','CLOSED'].includes(state.status) && allowedSlices.has(state.currentSlice), '11.5 must remain on a valid B/C/D lifecycle state');
req(state.phase11_5aExitGatePassed === true && state.phase11_5aPostMergeRecertification === 'PASS_EXACT_MAIN_SHA', '11.5-A exact-main certification must remain preserved');
if (phaseClosed) req(state.phase11_6Allowed === true && state.successorStatus === 'AUTHORIZED_NEXT', 'closed 11.5 must authorize only 11.6');
else req(state.phase11_6Allowed === false && state.successorStatus === 'LOCKED', '11.6 must remain locked while 11.5 is open');
if (bIsCurrent) {
  req(state.currentSliceBaseCommit === '2e85c9f8fa9066ab75bae3dbf6ecdcef02917530', '11.5-B must retain certified 11.5-A base SHA while B is current');
  req(state.phase11_5bExitGatePassed === false && state.exitGatePassed === false, '11.5-B cannot be pre-closed while B is current');
} else {
  req(state.phase11_5bStatus === 'CLOSED', '11.5-B must be CLOSED before successor slice');
  req(state.phase11_5bExitGatePassed === true, '11.5-B exit gate must remain passed on successor slice');
  req(state.phase11_5bPostMergeRecertification === 'PASS_EXACT_MAIN_SHA', '11.5-B exact-main recertification must remain preserved');
  req(state.phase11_5bMergeCommit === 'c74803ed0ebdf5218052f446540c0f8a422430b1', '11.5-B merge lineage drifted');
}
if (phaseClosed) req(state.exitGatePassed === true, 'closed Phase 11.5 must retain a passed overall exit gate');

for (const [field, expected] of [
  ['calendarEventAuthority', 'calendar_events'],
  ['workforceIdentityAuthority', 'organization_members'],
  ['appointmentStaffAssignmentAuthority', 'calendar_event_staff_assignments'],
  ['rescheduleHistoryAuthority', 'calendar_event_reschedule_history'],
  ['calendarGovernmentVisitContextAuthority', 'workflow_instances'],
  ['fieldAssignmentAuthority', 'field_assignments'],
  ['portalAppointmentResponseAuthority', 'client_portal_appointment_responses'],
  ['auditAuthority', 'audit_events'],
]) req(state[field] === expected, `B authority drifted: ${field}`);

for (const field of [
  'shadowAppointmentStoreAllowed', 'fieldAssignmentMayReplaceCalendarTruth',
  'organizationScopeOwnershipMayInferSpecificStaffAssignment', 'portalResponseMayMutateSchedulingTruthDirectly',
  'unknownAssignmentMayBeTreatedConflictFree', 'elapsedTimeMayInferAttendanceOutcome',
  'crossWorkspaceReferencesAllowed', 'terminalFactSilentResurrectionAllowed',
  'phase11_5bDirectStaffAssignmentWriteAllowed', 'phase11_5bDirectRescheduleHistoryWriteAllowed',
]) req(state[field] === false, `B fail-closed law drifted: ${field}`);

req(state.phase11_5bConflictAuthorityApplied === true && state.phase11_5bConflictAuthorityVersion === '20260915203436', 'B1 Real Cloud migration evidence missing');
req(state.phase11_5bGovernedCommandsApplied === true && state.phase11_5bGovernedCommandsVersion === '20260915203954', 'B2 Real Cloud migration evidence missing');
req(state.phase11_5bLiveProbeApplied === true && state.phase11_5bLiveProbeVersion === '20260915204630', 'B live probe evidence missing');
req(state.phase11_5bRealCloudVerification === 'PASS_AUTHENTICATED_CONFLICT_STAFF_HISTORY_PORTAL_ATTENDANCE_AUDIT_ZERO_RESIDUE', 'B Real Cloud verification drifted');
req(state.phase11_5bZeroResidueVerified === true, 'B zero-residue evidence missing');
req(state.phase11_5bNewSecurityAdvisorFindings === 0 && state.phase11_5bNewUnindexedForeignKeys === 0, 'B introduced advisor findings');
req(JSON.stringify(state.phase11_5bConflictStates) === JSON.stringify(['clear','conflict','unknown_assignment','unknown_range']), 'B conflict-state contract drifted');
for (const field of [
  'phase11_5bUnknownAssignmentFailsClosed', 'phase11_5bUnknownRangeFailsClosed',
  'phase11_5bSameStaffOverlapRejected', 'phase11_5bAdjacentSameStaffAccepted',
  'phase11_5bDifferentStaffOverlapAccepted', 'phase11_5bInactiveStaffRejected',
  'phase11_5bCrossWorkspaceStaffRejected', 'phase11_5bWorkflowTransactionMismatchRejected',
  'phase11_5bRescheduleHistoryVerified', 'phase11_5bPortalDecisionMismatchRejected',
  'phase11_5bAttendanceExplicitVerified', 'phase11_5bGatewayWired', 'phase11_5bGatewayTestsAdded',
]) req(state[field] === true, `B verified capability missing: ${field}`);

for (const marker of [
  'explicit staff assignment relation using workforce authority',
  'deterministic overlap/conflict detection',
  'confirmation/attendance outcome and reschedule history',
]) has(kickoff.toLowerCase(), marker.toLowerCase(), 'kickoff');
for (const marker of [
  'calendar_event_staff_assignments', 'references public.organization_members(workspace_id,id)',
  'calendar_event_reschedule_history', "'unknown_assignment'", "'unknown_range'",
  'ENJAZ_SCHEDULING_STAFF_CONFLICT', 'public.check_calendar_event_staff_conflicts_v1', 'security invoker',
]) has(authority, marker, 'B1 authority migration');
lacks(authority, 'grant insert on table public.calendar_event_staff_assignments to authenticated', 'B1 authority migration');
lacks(authority, 'grant insert on table public.calendar_event_reschedule_history to authenticated', 'B1 authority migration');
for (const marker of [
  'enjaz.scheduling-calendar-event.v2', 'private.scheduling_command_receipts',
  'public.create_calendar_event_v1', 'public.reschedule_calendar_event_v1',
  'public.set_calendar_event_staff_v1', 'public.set_calendar_event_confirmation_v1',
  'public.record_calendar_event_attendance_v1', 'ENJAZ_SCHEDULING_STALE_VERSION',
  'insert into public.calendar_event_reschedule_history', 'security invoker',
]) has(commands, marker, 'B2 command migration');
for (const marker of [
  'set local role authenticated', 'P115B_UNKNOWN_ASSIGNMENT_NOT_FAIL_CLOSED',
  'P115B_OVERLAP_NOT_REJECTED', 'P115B_STALE_RESCHEDULE_NOT_REJECTED',
  'P115B_OLD_ASSIGNMENT_HISTORY_MISSING', 'P115B_ATTENDANCE_FAILED',
  'P115B_WORKSPACE_RESIDUE', 'reset role', 'delete from public.workspaces',
]) has(probe, marker, 'B Real Cloud probe');
for (const marker of [
  "'check_calendar_event_staff_conflicts_v1'", "'create_calendar_event_v1'",
  "'reschedule_calendar_event_v1'", "'set_calendar_event_staff_v1'",
  "'set_calendar_event_confirmation_v1'", "'record_calendar_event_attendance_v1'",
]) has(gateway, marker, 'scheduling gateway');
for (const marker of ['conflict preview preserves fail-closed state','attendance is explicit','wrong B response schema fails closed']) has(tests, marker, 'scheduling gateway tests');

if (errors.length) {
  console.error(`ENJAZ PHASE 11.5-B APPOINTMENT/CONFLICT AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else if (phaseClosed) {
  console.log('ENJAZ PHASE 11.5-B APPOINTMENT/CONFLICT AUDIT PASS — B authority and conflict/history evidence remain certified under formal Phase 11.5 closure; 11.6 is the only authorized successor.');
} else {
  console.log(`ENJAZ PHASE 11.5-B APPOINTMENT/CONFLICT AUDIT PASS — B authority remains certified while ${state.currentSlice} is active; 11.6 remains locked.`);
}
