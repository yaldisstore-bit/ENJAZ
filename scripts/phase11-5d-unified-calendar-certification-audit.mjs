import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

const state = json('docs/PHASE11_5_STATE.json');
const kickoff = read('docs/PHASE11_5_KICKOFF.md');
const cEvidence = read('docs/PHASE11_5_C_EVIDENCE.md');

const errors = [];
const req = (value, message) => { if (!value) errors.push(message); };
const has = (source, marker, label) => req(source.includes(marker), `${label} missing marker: ${marker}`);

req(state.phase === '11.5' && state.systemId === 'M10' && state.systemStatus === 'ACTIVE', '11.5/M10 identity invalid');
req(state.status === 'IN_PROGRESS' && state.mode === 'ACTIVE_DEVELOPMENT', 'Phase 11.5 must remain IN_PROGRESS while D is open');
req(state.currentSlice === '11.5-D' && state.currentSliceName === 'Unified calendar experience & certification', '11.5-D must be the active final slice');
req(state.currentSliceBaseCommit === '928142cf11fd41075c6d4ad8c6ec5cc517913861', '11.5-D must open from the final certified C exact-main SHA');
req(state.nextSlice === null && state.nextSliceName === null, '11.5-D is the final slice and must not invent another 11.5 slice');

req(state.phase11_5cStatus === 'CLOSED', '11.5-C must be CLOSED before D');
req(state.phase11_5cExitGatePassed === true && state.phase11_5cExitBlocker === null, '11.5-C exit evidence incomplete');
req(state.phase11_5cPostMergeRecertification === 'PASS_EXACT_MAIN_SHA', '11.5-C exact-main recertification missing');
req(state.phase11_5cImplementationPullRequest === 185, '11.5-C implementation PR lineage missing');
req(state.phase11_5cImplementationMergeCommit === 'e3913b44df6aae2b59dba903ea2f58056951ac0d', '11.5-C implementation merge lineage drifted');
req(state.phase11_5cPostMergeQaRepairPullRequest === 186, '11.5-C post-merge QA repair lineage missing');
req(state.phase11_5cFinalMergeCommit === '928142cf11fd41075c6d4ad8c6ec5cc517913861', '11.5-C final certified main SHA drifted');
req(state.phase11_5cPostMergeM10Verification === 'PASS_RUN_35138845544', '11.5-C final M10 recertification missing');
req(state.phase11_5cPostMergeQualityVerification === 'PASS_RUN_35138845535', '11.5-C final Quality recertification missing');
req(state.phase11_5cPostMergeFailureCount === 0 && state.phase11_5cPostMergeRunningCount === 0 && state.phase11_5cPostMergeQueuedCount === 0, '11.5-C final exact-main check set not clean');

req(state.phase11_5dStatus === 'IN_PROGRESS', '11.5-D status must be IN_PROGRESS at opening');
req(state.phase11_5dOpenedFromMainSha === state.currentSliceBaseCommit, '11.5-D opening lineage must equal current-slice base');
req(state.phase11_5dUnifiedCalendarExperienceImplemented === false, 'D opening must not claim implementation before it exists');
req(state.phase11_5dCalendarExportBoundaryVerification === 'PENDING', 'D calendar export certification must start pending');
req(state.phase11_5dRealBrowserVerification === 'PENDING_1280_430_390_360_320', 'D browser matrix must start pending');
req(state.phase11_5dRealCloudVerification === 'PENDING_FRESH_WORKSPACE_DURABLE_WRITE_PERMISSION_CONFLICT_RECOVERY_ZERO_RESIDUE', 'D Real Cloud final certificate must start pending');
req(state.phase11_5dPostMergeRecertification === 'PENDING', 'D post-merge certificate must start pending');
req(state.phase11_5dExitGatePassed === false, 'D cannot be pre-closed at opening');
req(state.phase11_5dExitBlocker === 'UNIFIED_CALENDAR_IMPLEMENTATION_AND_FINAL_CERTIFICATION_PENDING', 'D opening blocker must remain truthful');

req(state.exitGatePassed === false, 'Phase 11.5 overall cannot close at D opening');
req(state.phase11_6Allowed === false && state.successorStatus === 'LOCKED', 'Phase 11.6 must remain locked until D final certification');
req(state.freshWorkspaceBootstrapVerification === 'PENDING_11_5D', 'fresh-workspace certification must remain assigned to D');
req(state.durableWriteRoundTripVerification === 'PENDING_11_5D', 'durable-write certification must remain assigned to D');
req(state.realBrowserVerification === 'PENDING_11_5D', 'final browser certification must remain assigned to D');

for (const field of [
  'shadowAppointmentStoreAllowed', 'shadowCalendarStoreAllowed', 'shadowRenewalStoreAllowed',
  'shadowWorkflowDeadlineRuleStoreAllowed', 'shadowReminderDeliveryStoreAllowed',
  'portalResponseMayMutateSchedulingTruthDirectly', 'fieldAssignmentMayReplaceCalendarTruth',
  'organizationScopeOwnershipMayInferSpecificStaffAssignment', 'deviceTimezoneMayBecomeBusinessScheduleAuthority',
  'unknownAssignmentMayBeTreatedConflictFree', 'elapsedTimeMayInferAttendanceOutcome',
  'systemMayInventMissedDeadlineRootCause', 'externalCalendarMayBecomeCanonicalTruthWithoutGovernedReconciliation',
  'crossWorkspaceReferencesAllowed', 'terminalFactSilentResurrectionAllowed',
]) req(state[field] === false, `D inherited fail-closed law drifted: ${field}`);

for (const marker of [
  '### 11.5-D — Unified calendar experience & certification',
  'day/week/month/agenda views scoped by staff/company/transaction/authority',
  'conflict, overdue, upcoming, attendance and reschedule UX',
  'real offline/failure/stale/concurrent states',
  'calendar export boundary',
  'Real Chromium 1280/430/390/360/320',
  'Real Cloud fresh-workspace, durable-write, permission, conflict/recovery and zero-residue probes',
  'exact merged/deployed SHA + post-merge recertification',
]) has(kickoff, marker, '11.5 kickoff D contract');

for (const marker of [
  '**Status:** CLOSED',
  '**Implementation PR:** #185',
  '**Post-merge QA repair PR:** #186',
  '**Final certified main SHA:** `928142cf11fd41075c6d4ad8c6ec5cc517913861`',
  'Stage-specific test expansion gate',
  'The only authorized progression is **11.5-D',
]) has(cEvidence, marker, '11.5-C evidence');

if (errors.length) {
  console.error(`ENJAZ PHASE 11.5-D OPENING/CERTIFICATION CONTRACT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('ENJAZ PHASE 11.5-D OPENING CONTRACT PASS — C exact-main closure is preserved, D is the only active final slice, all final certification claims remain pending, and Phase 11.6 remains locked.');
}
