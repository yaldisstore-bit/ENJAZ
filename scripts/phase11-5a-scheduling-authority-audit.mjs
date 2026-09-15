import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_5_STATE.json');
const kickoff=read('docs/PHASE11_5_KICKOFF.md');
const authority=read('src/features/scheduling/schedulingAuthority.ts');
const authorityTests=read('tests/schedulingAuthority.test.ts');
const commands=read('src/features/scheduling/schedulingCommands.ts');
const commandTests=read('tests/schedulingCommands.test.ts');
const commandContext=read('src/features/scheduling/SchedulingCommandContext.tsx');
const dailyService=read('src/features/daily-work/dailyWorkService.ts');
const dailyModel=read('src/features/daily-work/dailyWorkModel.ts');
const production=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const foundation=read('database/migrations/phase_11_5_scheduling_command_boundary_foundation.sql');
const receiptIntegrity=read('database/migrations/phase_11_5_scheduling_receipt_integrity.sql');
const liveProbe=read('database/migrations/phase_11_5_live_scheduling_command_probe.sql');
const lockdown=read('database/migrations/phase_11_5_scheduling_direct_write_lockdown.sql');
const lockdownProbe=read('database/migrations/phase_11_5_live_scheduling_lockdown_probe.sql');
const predecessor=json('docs/PHASE11_4_STATE.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const lacks=(s,m,l)=>req(!s.includes(m),`${l} forbidden marker present: ${m}`);
const allowedSlices=new Set(['11.5-A','11.5-B','11.5-C','11.5-D']);
const aIsCurrent=state.currentSlice==='11.5-A';

req(predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase11_5Allowed===true,'Phase 11.4 must remain formally CLOSED and authorize 11.5');
req(state.phase==='11.5'&&state.systemId==='M10'&&state.systemStatus==='ACTIVE','11.5/M10 lifecycle identity invalid');
req(state.status==='IN_PROGRESS'&&allowedSlices.has(state.currentSlice),'11.5 must remain IN_PROGRESS on an authorized delivery slice');
req(state.baseCommit==='0850de9e274a18ddb49d319677890a4e59ea7226','11.5 must retain its certified Phase 11.4 opening lineage');
req(state.phase11_6Allowed===false&&state.nextPhase==='11.6'&&state.successorStatus==='LOCKED','11.6 must remain locked');

for(const [field,value] of [
  ['calendarEventAuthority','calendar_events'],
  ['renewalAuthority','renewals'],
  ['workflowDeadlineRuleAuthority','workflow_template_stages.due_offset_days'],
  ['workspaceTimezoneAuthority','workspaces.timezone'],
  ['workforceIdentityAuthority','organization_members'],
  ['fieldAssignmentAuthority','field_assignments'],
  ['portalAppointmentResponseAuthority','client_portal_appointment_responses'],
  ['auditAuthority','audit_events'],
]) req(state[field]===value,`authority drifted: ${field}`);

for(const field of [
  'shadowAppointmentStoreAllowed','shadowCalendarStoreAllowed','shadowRenewalStoreAllowed',
  'portalResponseMayMutateSchedulingTruthDirectly','fieldAssignmentMayReplaceCalendarTruth',
  'organizationScopeOwnershipMayInferSpecificStaffAssignment','deviceTimezoneMayBecomeBusinessScheduleAuthority',
  'unknownAssignmentMayBeTreatedConflictFree','elapsedTimeMayInferAttendanceOutcome',
  'systemMayInventMissedDeadlineRootCause','externalCalendarMayBecomeCanonicalTruthWithoutGovernedReconciliation',
  'crossWorkspaceReferencesAllowed','terminalFactSilentResurrectionAllowed',
]) req(state[field]===false,`fail-closed law drifted: ${field}`);

req(state.directCalendarEventBrowserMutationObservedAtOpen===true&&state.directRenewalBrowserMutationObservedAtOpen===true,'opening legacy direct-write finding must remain recorded');
req(state.openingCalendarEventRowCount===0&&state.openingRenewalRowCount===0,'opening canonical scheduling tables were expected empty');
req(state.openingWorkspaceCount===15&&state.openingWorkspaceTimezone==='Asia/Baghdad'&&state.openingWorkspaceTimezoneUniform===true,'opening timezone inspection evidence drifted');
req(state.openingRealCloudInspection==='PASS_READ_ONLY_AUTHORITY_DISCOVERY','opening Real Cloud discovery evidence missing');
req(state.authorityContractAdded===true&&state.authorityContractTestsAdded===true&&state.authorityAuditAdded===true,'11.5-A executable authority tracking incomplete');
req(state.databaseCommandFoundationApplied===true&&state.databaseCommandFoundationVersion==='20260915193302','governed command foundation evidence missing');
req(state.databaseReceiptIntegrityApplied===true&&state.databaseReceiptIntegrityVersion==='20260915193324','receipt integrity evidence missing');
req(state.databaseLiveCommandProbeApplied===true&&state.databaseLiveCommandProbeVersion==='20260915193534','live command probe evidence missing');
req(state.databaseLiveCommandProbeVerification==='PASS_AUTHENTICATED_IDEMPOTENCY_STALE_CROSS_WORKSPACE_AUDIT_ZERO_RESIDUE','live command probe verification drifted');
req(state.runtimeSchedulingGatewayAdded===true&&state.runtimeSchedulingContextAdded===true&&state.runtimeSchedulingGatewayTestsAdded===true,'runtime scheduling bridge tracking incomplete');
req(state.dailyWorkSchedulingLifecycleUsesRpc===true&&state.dailyWorkDirectCalendarLifecycleMutationPresent===false&&state.dailyWorkDirectRenewalLifecycleMutationPresent===false,'Daily Work scheduling authority bridge drifted');
req(state.productionSchedulingProviderWired===true,'production scheduling provider must be wired');

req(state.bridgePullRequest===182&&state.bridgeMergeCommit==='ac57fc454d21c328704f83eb9eab562969d298d6','governed runtime bridge merge lineage missing');
req(state.bridgePublishedDeploymentVerification==='PASS_GITHUB_PAGES_RUN_35016980643','bridge published deployment evidence missing');
req(state.bridgePostMergeQualityVerification==='PASS_RUN_35016983558','bridge exact-main Quality evidence missing');
req(state.bridgePostMergeRealBrowserVerification==='PASS_RUN_35016983334','bridge exact-main Real Browser evidence missing');

req(state.databaseWriteBoundaryHardeningApplied===true&&state.databaseWriteBoundaryHardeningVersion==='20260915200729','direct-write lockdown migration evidence missing');
req(state.databaseWriteBoundaryFinalProbeApplied===true&&state.databaseWriteBoundaryFinalProbeVersion==='20260915200812','lockdown Real Cloud probe evidence missing');
req(state.databaseWriteBoundaryFinalProbeVerification==='PASS_AUTHENTICATED_DIRECT_INSERT_UPDATE_DENIED_GOVERNED_RPC_PASS_AUDIT_ZERO_RESIDUE','lockdown verification drifted');
req(state.calendarDirectAuthenticatedInsertAllowed===false&&state.calendarDirectAuthenticatedUpdateAllowed===false&&state.renewalDirectAuthenticatedInsertAllowed===false&&state.renewalDirectAuthenticatedUpdateAllowed===false,'authenticated direct scheduling writes must stay locked');
req(state.calendarAuthenticatedSelectAllowed===true&&state.renewalAuthenticatedSelectAllowed===true,'authorized scheduling reads must remain available');
req(state.permissionMatrixVerification==='PASS_DIRECT_TABLE_WRITE_BLOCKED_GOVERNED_RPC_ALLOWED','permission matrix evidence missing');
req(state.phase11_5aLockdownCandidateReady===true,'lockdown candidate must retain Real Cloud proof');
req(state.exitGatePassed===false,'overall Phase 11.5 cannot close before slices B-D');

if(aIsCurrent){
  req(state.phase11_5aExitGatePassed===false,'11.5-A cannot be marked closed while it is still the current slice');
  req(state.phase11_5aExitBlocker==='LOCKDOWN_SOURCE_NOT_YET_MERGED_AND_POST_MERGE_RECERTIFIED','11.5-A current-slice blocker must remain truthful');
}else{
  req(state.phase11_5aExitGatePassed===true,'later 11.5 slices require certified 11.5-A closure');
  req(state.phase11_5aExitBlocker===null,'certified 11.5-A must not retain an exit blocker');
  req(state.phase11_5aLockdownPullRequest===183,'11.5-A lockdown PR lineage missing');
  req(state.phase11_5aLockdownMergeCommit==='2e85c9f8fa9066ab75bae3dbf6ecdcef02917530','11.5-A merge SHA evidence missing');
  req(state.phase11_5aPostMergeM10Verification==='PASS_RUN_35019386414','11.5-A exact-main M10 verification missing');
  req(state.phase11_5aPostMergeQualityVerification==='PASS_RUN_35019386459','11.5-A exact-main Quality verification missing');
  req(state.phase11_5aPostMergeRealBrowserVerification==='PASS_RUN_35019386489','11.5-A exact-main Real Browser verification missing');
  req(state.phase11_5aPostMergePagesVerification==='PASS_RUN_35019385257','11.5-A exact-main Pages verification missing');
  req(state.phase11_5aPostMergeFailureCount===0&&state.phase11_5aPostMergeRecertification==='PASS_EXACT_MAIN_SHA','11.5-A exact-main post-merge certificate incomplete');
}

for(const marker of [
  '`calendar_events` remains the canonical appointment / calendar-event fact',
  '`renewals` remains the canonical recurring renewal/compliance due-date source',
  '`workspaces.timezone` is the workspace scheduling timezone authority',
  '`client_portal_appointment_responses` remains an M3 confirmation/decline response',
  '`field_assignments` remains M5 field-operation assignment authority',
  'Phase 11.6 — Smart Intake & Contract Communication — M17 + M16 remains LOCKED',
]) has(kickoff,marker,'kickoff');

for(const marker of [
  "calendarEvent: 'calendar_events'",
  "renewal: 'renewals'",
  "workflowDeadlineRule: 'workflow_template_stages.due_offset_days'",
  "workspaceTimezone: 'workspaces.timezone'",
  "workforceIdentity: 'organization_members'",
  "portalAppointmentResponse: 'client_portal_appointment_responses'",
  "fieldAssignment: 'field_assignments'",
  'ENJAZ_SCHEDULING_GOVERNED_COMMAND_REQUIRED',
  'ENJAZ_SCHEDULING_STALE_VERSION',
  'ENJAZ_SCHEDULING_TERMINAL_FACT_IMMUTABLE',
  'staffConflictComparisonAllowed',
  'workflowDeadlineMayBeGenerated',
]) has(authority,marker,'authority contract');

for(const marker of [
  'portal appointment response is confirmation input only',
  'direct browser scheduling writes fail closed',
  'terminal scheduling facts cannot be silently resurrected',
  'staff conflict comparison requires same workspace and explicit same member',
  'workflow deadline generation requires rule, stage anchor and workspace timezone',
]) has(authorityTests,marker,'authority tests');

for(const marker of [
  'mutate_calendar_event_state_v1',
  'mutate_renewal_state_v1',
  'p_operation_id',
  'p_expected_version',
  'parseCalendarResult',
  'parseRenewalResult',
]) has(commands,marker,'runtime scheduling commands');
for(const marker of ['calendar command sends exact governed RPC identity','renewal command preserves idempotency identity','cancel fails closed without an explicit reason','malformed scheduling response fails closed']) has(commandTests,marker,'runtime scheduling command tests');
has(commandContext,'SchedulingCommandProvider','scheduling context');
has(production,'createSchedulingCommandGateway(client)','production scheduling gateway');
has(production,'<SchedulingCommandProvider gateway={schedulingCommands}>','production scheduling provider');
has(dailyService,'schedulingCommands.mutateCalendarState','Daily Work calendar command');
has(dailyService,'schedulingCommands.mutateRenewalState','Daily Work renewal command');
has(dailyModel,'sourceVersion','Daily Work observed source version');
lacks(dailyService,'layer.calendar.update','Daily Work direct calendar write');
lacks(dailyService,'layer.renewals.update','Daily Work direct renewal write');

for(const marker of [
  'alter table public.calendar_events',
  'add column if not exists version integer not null default 1',
  'alter table public.renewals',
  'create table if not exists private.scheduling_command_receipts',
  'private.require_scheduling_workspace_member_v1',
  'private.mutate_calendar_event_state_v1_impl',
  'public.mutate_calendar_event_state_v1',
  'private.mutate_renewal_state_v1_impl',
  'public.mutate_renewal_state_v1',
  'security invoker',
  'security definer',
  'set search_path = \'\'',
  'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT',
  'ENJAZ_SCHEDULING_STALE_VERSION',
  'scheduling.calendar.completed',
  'scheduling.renewal.completed',
]) has(foundation,marker,'command foundation migration');
has(receiptIntegrity,'references public.workspaces(id) on delete cascade','receipt integrity migration');
for(const marker of [
  'set local role authenticated',
  'P115_AUTH_UID_MISMATCH',
  'P115_IDEMPOTENCY_CONFLICT_NOT_REJECTED',
  'P115_STALE_VERSION_NOT_REJECTED',
  'P115_CROSS_WORKSPACE_NOT_REJECTED',
  'P115_AUDIT_COUNT_INVALID',
  'P115_RECEIPT_COUNT_INVALID',
  "delete from public.workspaces",
  'P115_RECEIPT_RESIDUE',
  'P115_AUDIT_RESIDUE',
]) has(liveProbe,marker,'live command probe');

for(const marker of [
  'revoke insert, update on table public.calendar_events from authenticated',
  'revoke insert, update on table public.renewals from authenticated',
  'drop policy if exists calendar_events_insert_workspace',
  'drop policy if exists calendar_events_update_workspace',
  'drop policy if exists renewals_insert_workspace',
  'drop policy if exists renewals_update_workspace',
]) has(lockdown,marker,'direct-write lockdown migration');

for(const marker of [
  'set local role authenticated',
  'P115_DIRECT_CALENDAR_UPDATE_NOT_BLOCKED',
  'P115_DIRECT_CALENDAR_INSERT_NOT_BLOCKED',
  'P115_DIRECT_RENEWAL_UPDATE_NOT_BLOCKED',
  'P115_DIRECT_RENEWAL_INSERT_NOT_BLOCKED',
  'public.mutate_calendar_event_state_v1',
  'public.mutate_renewal_state_v1',
  'P115_GOVERNED_CALENDAR_FAILED',
  'P115_GOVERNED_RENEWAL_FAILED',
  'P115_LOCKDOWN_AUDIT_INVALID',
  'P115_LOCKDOWN_WORKSPACE_RESIDUE',
  'P115_LOCKDOWN_RECEIPT_RESIDUE',
  'P115_LOCKDOWN_AUDIT_RESIDUE',
]) has(lockdownProbe,marker,'live lockdown probe');

if(errors.length){
  console.error(`ENJAZ PHASE 11.5-A AUTHORITY AUDIT FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log(aIsCurrent
    ? 'ENJAZ PHASE 11.5-A AUTHORITY AUDIT PASS — lockdown candidate remains correctly open pending exact-main recertification.'
    : `ENJAZ PHASE 11.5-A PRESERVATION AUDIT PASS — certified closure preserved while ${state.currentSlice} is active; direct writes remain locked and 11.6 remains locked.`);
}
