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
req(['IN_PROGRESS', 'CLOSED'].includes(state.status), 'Phase 11.5 lifecycle status invalid');
req(state.currentSlice === '11.5-D' && state.currentSliceName === 'Unified calendar experience & certification', '11.5-D must remain the final slice');
req(state.currentSliceBaseCommit === '928142cf11fd41075c6d4ad8c6ec5cc517913861', '11.5-D must retain the final certified C exact-main lineage');
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
req(state.phase11_5dOpenedFromMainSha === state.currentSliceBaseCommit, '11.5-D opening lineage must equal current-slice base');

if (state.status === 'IN_PROGRESS') {
  req(state.mode === 'ACTIVE_DEVELOPMENT', 'Open Phase 11.5 must remain ACTIVE_DEVELOPMENT');
  req(state.phase11_5dStatus === 'IN_PROGRESS', '11.5-D status must be IN_PROGRESS while open');
  req(state.phase11_5dUnifiedCalendarExperienceImplemented === false, 'D opening must not claim implementation before certification');
  req(state.phase11_5dCalendarExportBoundaryVerification === 'PENDING', 'D calendar export certification must start pending');
  req(state.phase11_5dRealBrowserVerification === 'PENDING_1280_430_390_360_320', 'D browser matrix must start pending');
  req(state.phase11_5dRealCloudVerification === 'PENDING_FRESH_WORKSPACE_DURABLE_WRITE_PERMISSION_CONFLICT_RECOVERY_ZERO_RESIDUE', 'D Real Cloud final certificate must start pending');
  req(state.phase11_5dPostMergeRecertification === 'PENDING', 'D post-merge certificate must start pending');
  req(state.phase11_5dExitGatePassed === false, 'D cannot be pre-closed at opening');
  req(state.phase11_5dExitBlocker === 'UNIFIED_CALENDAR_IMPLEMENTATION_AND_FINAL_CERTIFICATION_PENDING', 'D opening blocker must remain truthful');
  req(state.exitGatePassed === false, 'Open Phase 11.5 cannot pass its overall exit gate');
  req(state.phase11_6Allowed === false && state.successorStatus === 'LOCKED', 'Phase 11.6 must remain locked while 11.5 is open');
  req(state.freshWorkspaceBootstrapVerification === 'PENDING_11_5D', 'fresh-workspace certification must remain assigned to D while open');
  req(state.durableWriteRoundTripVerification === 'PENDING_11_5D', 'durable-write certification must remain assigned to D while open');
  req(state.realBrowserVerification === 'PENDING_11_5D', 'final browser certification must remain assigned to D while open');
} else {
  req(state.mode === 'CLOSED_CERTIFIED', 'Closed Phase 11.5 must use CLOSED_CERTIFIED mode');
  req(state.closedOn === '2026-09-17', 'Phase 11.5 closure date missing or drifted');
  req(state.phase11_5dStatus === 'CLOSED', '11.5-D must be CLOSED at final certification');
  req(state.phase11_5dUnifiedCalendarExperienceImplemented === true, '11.5-D implementation must be certified true');
  req(state.phase11_5dCalendarExportBoundaryVerification === 'PASS_OUTBOUND_PROJECTION_ONLY_ICS_METHOD_PUBLISH', 'calendar export boundary certificate missing');
  req(state.phase11_5dRealBrowserVerification === 'PASS_CHROMIUM_1280_430_390_360_320_PR188_ARTIFACT_10518323894_PLUS_EXACT_MAIN_RUN_35271956676', '11.5-D browser certificate missing');
  req(state.phase11_5dRealCloudVerification === 'PASS_AUTHENTICATED_FRESH_WORKSPACE_DURABLE_WRITE_PERMISSION_CONFLICT_RECOVERY_ZERO_RESIDUE_MIGRATIONS_20260917202954_20260917203153', '11.5-D Real Cloud certificate missing');
  req(state.phase11_5dPostMergeRecertification === 'PASS_EXACT_MAIN_SHA_160a1d9ddba5244ab7f7a4fd74350273a081217e', '11.5-D exact-main recertification missing');
  req(state.phase11_5dExitGatePassed === true && state.phase11_5dExitBlocker === null, '11.5-D exit gate incomplete');
  req(state.exitGatePassed === true, 'Closed Phase 11.5 must pass overall exit gate');
  req(state.phase11_6Allowed === true && state.successorStatus === 'AUTHORIZED_NEXT', 'Closed Phase 11.5 may authorize only Phase 11.6');
  req(state.freshWorkspaceBootstrapVerification === 'PASS_AUTHENTICATED_FRESH_WORKSPACE_EMPTY_THEN_GOVERNED_CREATE', 'fresh-workspace final certificate missing');
  req(state.durableWriteRoundTripVerification === 'PASS_SEPARATE_TRANSACTION_DURABLE_EVENT_RECEIPT_AUDIT', 'durable-write final certificate missing');
  req(state.realBrowserVerification === 'PASS_EXACT_MAIN_REAL_BROWSER_RUN_35271956676_PLUS_DEDICATED_5_WIDTH_CERTIFICATE', 'final browser verification missing');
  req(state.postMergeRecertification === 'PASS_EXACT_MAIN_M10_QUALITY_UI_CONSTITUTION_BROWSER_ZERO_ESCAPE', 'post-merge exact-main certificate missing');
  req(state.implementationPullRequestNumber === 188, 'Phase 11.5 implementation PR lineage missing');
  req(state.implementationHeadCommit === 'be77cce36f81a6a219b9047596e7e0fdf8117bd4', 'Phase 11.5 implementation head lineage missing');
  req(state.certifiedMainCommit === '160a1d9ddba5244ab7f7a4fd74350273a081217e', 'Phase 11.5 certified main SHA missing');
  req(state.exactMainM10RunId === 35271956713, 'exact-main M10 run missing');
  req(state.exactMainQualityRunId === 35271956704, 'exact-main Quality run missing');
  req(state.exactMainUiGovernanceRunId === 35271956678, 'exact-main UI governance run missing');
  req(state.exactMainProjectConstitutionRunId === 35271956620, 'exact-main Project Constitution run missing');
  req(state.exactMainBrowserRunId === 35271956676, 'exact-main Real Browser run missing');
  req(state.exactMainZeroEscapeRunId === 35271956707, 'exact-main Zero-Escape run missing');
  req(state.phase11_5dBrowserArtifactId === 10518323894, 'dedicated browser artifact missing');
  req(state.totalJavascriptBytes === 759198 && state.totalJavascriptBudgetBytes === 760000 && state.totalJavascriptMarginBytes === 802, 'frozen JS budget certificate drifted');
  req(state.budgetIncreaseAllowed === false, 'budget increase must remain forbidden');
  req(state.knownCriticalDefects === 0 && state.knownHighDefects === 0 && state.knownFunctionalBlockers === 0, 'known blocker count must be zero at closure');
  req(state.closureEvidence === 'docs/PHASE11_5_CLOSURE.md' && fs.existsSync(new URL(state.closureEvidence, root)), 'formal Phase 11.5 closure evidence missing');
}

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
  console.error(`ENJAZ PHASE 11.5-D CERTIFICATION CONTRACT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else if (state.status === 'CLOSED') {
  console.log('ENJAZ PHASE 11.5-D FINAL CLOSURE CONTRACT PASS — unified calendar implementation, Real Cloud, five-width Real Browser, exact-main recertification, frozen budgets and Phase 11.6 authorization are all certified.');
} else {
  console.log('ENJAZ PHASE 11.5-D OPENING CONTRACT PASS — C exact-main closure is preserved, D is the only active final slice, all final certification claims remain pending, and Phase 11.6 remains locked.');
}
