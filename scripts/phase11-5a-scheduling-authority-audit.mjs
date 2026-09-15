import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_5_STATE.json');
const kickoff=read('docs/PHASE11_5_KICKOFF.md');
const authority=read('src/features/scheduling/schedulingAuthority.ts');
const tests=read('tests/schedulingAuthority.test.ts');
const predecessor=json('docs/PHASE11_4_STATE.json');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

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

req(state.directCalendarEventBrowserMutationObservedAtOpen===true&&state.directRenewalBrowserMutationObservedAtOpen===true,'opening legacy direct-write finding must remain recorded until hardening');
req(state.openingCalendarEventRowCount===0&&state.openingRenewalRowCount===0,'opening canonical scheduling tables were expected empty');
req(state.openingWorkspaceCount===15&&state.openingWorkspaceTimezone==='Asia/Baghdad'&&state.openingWorkspaceTimezoneUniform===true,'opening timezone inspection evidence drifted');
req(state.openingRealCloudInspection==='PASS_READ_ONLY_AUTHORITY_DISCOVERY','opening Real Cloud discovery evidence missing');
req(state.authorityContractAdded===true&&state.authorityContractTestsAdded===true&&state.authorityAuditAdded===true,'11.5-A executable authority tracking incomplete');

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
]) has(tests,marker,'authority tests');

if(errors.length){
  console.error(`ENJAZ PHASE 11.5-A AUTHORITY AUDIT FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.5-A AUTHORITY AUDIT PASS — canonical scheduling/renewal/workflow/timezone authorities are frozen; 11.6 remains locked; legacy direct-write exposure is recorded for hardening.');
}
