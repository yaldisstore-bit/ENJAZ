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
const predecessor=json('docs/PHASE11_4_STATE.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const lacks=(s,m,l)=>req(!s.includes(m),`${l} forbidden marker present: ${m}`);

req(predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase11_5Allowed===true,'Phase 11.4 must remain formally CLOSED and authorize 11.5');
req(state.phase==='11.5'&&state.systemId==='M10'&&state.systemStatus==='ACTIVE','11.5/M10 lifecycle identity invalid');
req(state.status==='IN_PROGRESS'&&state.currentSlice==='11.5-A','11.5-A must be current IN_PROGRESS slice');
req(state.baseCommit==='0850de9e274a18ddb49d319677890a4e59ea7226','11.5 must open from certified Phase 11.4 closure SHA');
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
req(state.phase11_5aExitGatePassed===false&&state.databaseWriteBoundaryHardeningApplied===false,'11.5-A cannot close before direct-write lockdown');
req(state.calendarDirectAuthenticatedInsertAllowed===true&&state.calendarDirectAuthenticatedUpdateAllowed===true&&state.renewalDirectAuthenticatedInsertAllowed===true&&state.renewalDirectAuthenticatedUpdateAllowed===true,'pre-lockdown grants must remain honestly tracked until final hardening');

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

if(errors.length){
  console.error(`ENJAZ PHASE 11.5-A AUTHORITY AUDIT FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.5-A AUTHORITY AUDIT PASS — canonical authorities and governed Real Cloud command foundation are verified; Daily Work uses M10 RPCs; 11.6 remains locked; direct table grant lockdown remains intentionally pending deployment-safe hardening.');
}
