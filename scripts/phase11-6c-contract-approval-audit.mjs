import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const scope=read('docs/PHASE11_6C_CONTRACT_APPROVAL_SCOPE.md');
const closure=read('docs/PHASE11_6C_CLOSURE.md');
const migration=read('database/migrations/phase_11_6_contract_transition_concurrency_hardening.sql');
const advisorHardening=read('database/migrations/phase_11_6_contract_transition_advisor_hardening.sql');
const liveProbe=read('database/migrations/phase_11_6_live_contract_transition_probe.sql');
const c2Migration=read('database/migrations/phase_11_6_contract_client_approval_bridge.sql');
const c2LiveProbe=read('database/migrations/phase_11_6_live_contract_client_approval_probe.sql');
const c2Gateway=read('src/features/intake-contract-communication/contractApprovalCommands.ts');
const c2GatewayTests=read('tests/contractApprovalCommands.test.ts');
const c2SourceTests=read('tests/contractApprovalBridgeSource.test.mjs');
const c3Migration=read('database/migrations/phase_11_6_contract_renewal_communication_evidence.sql');
const c3Gateway=read('src/features/intake-contract-communication/contractRenewalCommunicationCommands.ts');
const c3GatewayTests=read('tests/contractRenewalCommunicationCommands.test.ts');
const c3SourceTests=read('tests/contractRenewalCommunicationSource.test.mjs');
const c3LiveProbe=read('database/migrations/phase_11_6_live_contract_renewal_communication_probe.sql');
const gateway=read('src/features/engagements/engagementContractCommands.ts');
const panel=read('src/ui-r2/documents/EngagementContractPanel.tsx');
const tests=read('tests/contractTransitionConcurrencySource.test.mjs');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const lacks=(s,m,l)=>req(!s.includes(m),`${l} forbidden marker present: ${m}`);

req(state.phase==='11.6'&&state.status==='IN_PROGRESS'&&['11.6-C','11.6-D'].includes(state.currentSlice),'11.6-C closure must remain valid through governed successor D');
if(state.currentSlice==='11.6-C'){
  req(state.mode==='CONTRACT_APPROVAL_RETAINER_COMMUNICATION','11.6-C mode drifted');
  req(state.currentSliceBaseCommit==='314ff5a297420b4842a0bba78c3575d84e85c707','11.6-C must start from merged 11.6-B closure');
}else{
  req(state.mode==='UNIFIED_EXPERIENCE_CERTIFICATION','11.6-D successor mode drifted');
  req(state.currentSliceBaseCommit==='ea6d7bdedaa2a714c7ec34ebf444d06e0875b06b'&&state.phase11_6cMergeCommit==='ea6d7bdedaa2a714c7ec34ebf444d06e0875b06b','11.6-D must start from exact merged C closure');
}
req(state.phase11_6bStatus==='CLOSED'&&state.phase11_6bExitGatePassed===true&&state.phase11_6bClosureDecision==='PASS','11.6-C requires certified B predecessor');
req(state.phase11_6bMergeCommit==='314ff5a297420b4842a0bba78c3575d84e85c707','11.6-B merge lineage drifted');
req(['IN_PROGRESS','CLOSED'].includes(state.phase11_6cStatus),'11.6-C lifecycle status invalid');
if(state.phase11_6cStatus==='CLOSED'){
  req(state.phase11_6cExitGatePassed===true&&state.phase11_6cClosureDecision==='PASS','11.6-C CLOSED requires PASS exit decision');
  req(state.phase11_6dAllowed===true&&state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','11.6-D must be authorized while 11.7 remains locked');
  req(state.phase11_6cClosureEvidencePath==='docs/PHASE11_6C_CLOSURE.md','11.6-C closure evidence path drifted');
  req(state.phase11_6cPreClosureGate==='PASS'&&state.phase11_6cPreClosureGateRunId===35289132165&&state.phase11_6cPreClosureGateRunNumber===66&&state.phase11_6cPreClosureGateHead==='8645c2d14e319659ff7312f969258481a66993ba','11.6-C pre-closure gate certificate invalid');
  req(state.phase11_6cRealBrowserVerification==='PASS'&&state.phase11_6cRealBrowserRunId===35289132333&&state.phase11_6cRealBrowserRunNumber===1569,'11.6-C Real Browser certificate invalid');
}else{
  req(state.phase11_6cExitGatePassed===false,'11.6-C IN_PROGRESS cannot have passed exit gate');
  req(state.phase11_6dAllowed===false&&state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','11.6-D/11.7 must remain locked while C is open');
}
req(state.phase11_6cScopePath==='docs/PHASE11_6C_CONTRACT_APPROVAL_SCOPE.md','11.6-C scope path drifted');
req(state.phase11_6cM16VersionedTransitionAdded===true,'C1 M16 versioned transition source not recorded');
req(state.phase11_6cM16LegacyTransitionBrowserAllowed===false,'Legacy unversioned M16 browser transition must remain forbidden');
req(state.phase11_6cClientDecisionBridgeAdded===true,'C2 client decision bridge source must be recorded');
req(state.phase11_6cC2Status==='CLOSED'&&state.phase11_6cC2ExitGatePassed===true,'C2 must be Real Cloud certified before C3');
req(state.phase11_6cClientDecisionMigrationApplied===true&&state.phase11_6cClientDecisionMigrationVersion==='20260917231342','C2 migration lineage invalid');
req(state.phase11_6cClientDecisionRealCloudProbeApplied===true&&state.phase11_6cClientDecisionRealCloudProbeMigrationVersion==='20260917231857'&&state.phase11_6cClientDecisionRealCloudVerification==='PASS_C2','C2 Real Cloud probe lineage invalid');
for(const f of ['phase11_6cClientDecisionPermissionMatrix','phase11_6cClientDecisionApprovedPath','phase11_6cClientDecisionRejectedPath','phase11_6cClientDecisionStaleConflict','phase11_6cClientDecisionOperationConflict','phase11_6cClientDecisionRevokedExpired','phase11_6cClientDecisionCrossEngagement','phase11_6cClientDecisionOwnerBoundary','phase11_6cClientDecisionAuditReconciliation'])req(state[f]==='PASS',`C2 Real Cloud proof missing: ${f}`);
req(state.phase11_6cClientDecisionZeroResidue===true,'C2 zero residue must be verified');
req(state.phase11_6cSecurityAdvisorPostC2Total===65&&state.phase11_6cPerformanceAdvisorPostC2Total===81&&state.phase11_6cUnindexedForeignKeysPostC2===28&&state.phase11_6cC2NewSecurityAdvisorFindings===0&&state.phase11_6cC2NewPerformanceAdvisorFindings===0,'C2 advisor certificate invalid');
req(state.phase11_6cRenewalProvenanceAdded===true&&state.phase11_6cCommunicationEvidenceBridgeAdded===true,'C3 renewal/M4 evidence source must be recorded');
req(['IN_PROGRESS','CLOSED'].includes(state.phase11_6cC3Status),'C3 lifecycle status invalid');
if(state.phase11_6cC3Status==='CLOSED'){
  req(state.phase11_6cC3ExitGatePassed===true,'C3 CLOSED requires its exit gate');
  req(state.phase11_6cRenewalCommunicationMigrationApplied===true&&state.phase11_6cRenewalCommunicationMigrationVersion==='20260917235138','C3 migration lineage invalid');
  req(state.phase11_6cRenewalCommunicationRealCloudProbeApplied===true&&state.phase11_6cRenewalCommunicationRealCloudProbeMigrationVersion==='20260917235645'&&state.phase11_6cRenewalCommunicationRealCloudVerification==='PASS_C3','C3 Real Cloud probe lineage invalid');
  for(const f of ['phase11_6cC3PermissionMatrix','phase11_6cC3CanonicalRenewalProvenance','phase11_6cC3StaleConflict','phase11_6cC3IdempotencyConflict','phase11_6cC3CompanyScopeMismatch','phase11_6cC3M4GovernedEvidence','phase11_6cC3M4MissingCommandFailClosed','phase11_6cC3UngovernedSourceFailClosed','phase11_6cC3WorkspaceIsolation','phase11_6cC3AuditReconciliation'])req(state[f]==='PASS',`C3 Real Cloud proof missing: ${f}`);
  req(state.phase11_6cC3ZeroResidue===true,'C3 zero residue must be verified');
  req(state.phase11_6cSecurityAdvisorPostC3Total===65&&state.phase11_6cPerformanceAdvisorPostC3Total===80&&state.phase11_6cUnindexedForeignKeysPostC3===28&&state.phase11_6cC3NewSecurityAdvisorFindings===0&&state.phase11_6cC3NewPerformanceAdvisorFindings===0,'C3 advisor certificate invalid');
}else{
  req(state.phase11_6cC3ExitGatePassed===false,'C3 IN_PROGRESS cannot have passed exit gate');
  req(state.phase11_6cRenewalCommunicationMigrationApplied===false&&state.phase11_6cRenewalCommunicationMigrationVersion===null&&state.phase11_6cRenewalCommunicationRealCloudVerification==='PENDING','C3 Real Cloud cannot be pre-claimed before source gate/application');
}
req(state.phase11_6cC1Status==='CLOSED'&&state.phase11_6cC1ExitGatePassed===true,'C1 must be Real Cloud certified before C2');
req(state.phase11_6cMigrationApplied===true&&state.phase11_6cMigrationVersion==='20260917225607','C1 migration lineage invalid');
req(state.phase11_6cAdvisorHardeningApplied===true&&state.phase11_6cAdvisorHardeningMigrationVersion==='20260917230127','C1 advisor hardening lineage invalid');
req(state.phase11_6cRealCloudProbeApplied===true&&state.phase11_6cRealCloudProbeMigrationVersion==='20260917230406','C1 Real Cloud probe lineage invalid');
req(state.phase11_6cRealCloudVerification==='PASS_C1'&&state.phase11_6cPermissionMatrix==='PASS_C1'&&state.phase11_6cConflictRecovery==='PASS_C1'&&state.phase11_6cAuditReconciliation==='PASS_C1','C1 Real Cloud proof state invalid');
req(state.phase11_6cZeroResidueVerified===true,'C1 zero residue must be verified');
req(state.phase11_6cSecurityAdvisorBaselineTotal===66&&state.phase11_6cSecurityAdvisorPostC1Total===65&&state.phase11_6cNewSecurityAdvisorFindings===0,'C1 security advisor certificate invalid');
req(state.phase11_6cPerformanceAdvisorBaselineTotal===81&&state.phase11_6cPerformanceAdvisorPostC1Total===81&&state.phase11_6cUnindexedForeignKeysBaseline===28&&state.phase11_6cUnindexedForeignKeysPostC1===28&&state.phase11_6cNewPerformanceAdvisorFindings===0,'C1 performance advisor certificate invalid');

if(state.phase11_6cStatus==='CLOSED'){
  for(const marker of [
    'Status:** CLOSED / CERTIFIED','20260917225607','20260917231342','20260917235138','20260917235645',
    '35289132165','35289132333','security findings: **65**','performance findings: **80**',
    'C3 new security advisor findings: **0**','11.6-D becomes `AUTHORIZED_NEXT`'
  ])has(closure,marker,'C closure');
}

for(const marker of [
  'C1 — M16 transition concurrency & retry hardening',
  'add a monotonically increasing revision `version`',
  'operationId + expectedVersion',
  'one M3 approval request cannot bind to multiple contract revisions',
  'renewal provenance uses canonical `renewals`',
  'M4 communication evidence is canonical'
])has(scope,marker,'C scope');

for(const marker of [
  'add column version integer not null default 1 check (version > 0)',
  'create table private.engagement_contract_transition_receipts',
  'new.version:=old.version+1',
  'private.transition_engagement_contract_revision_v2_impl',
  'p_operation_id uuid','p_expected_version integer',
  'ENJAZ_CONTRACT_TRANSITION_STALE','ENJAZ_CONTRACT_TRANSITION_IDEMPOTENCY_CONFLICT',
  'public.transition_engagement_contract_revision_v1(',
  'create or replace function public.transition_engagement_contract_revision_v2(',
  'security invoker',
  'engagement.contract.transition.receipted',
  'revoke all on function public.transition_engagement_contract_revision_v1(',
  'from public,anon,authenticated,service_role'
])has(migration,marker,'C1 migration');
lacks(migration,'create table public.engagement_contract_transition_receipts','C1 migration');
lacks(migration,'grant execute on function public.transition_engagement_contract_revision_v1','C1 migration');
for(const marker of [
  'engagement_contract_transition_receipts_actor_fk_idx',
  'private.engagement_contract_transition_receipts(actor_user_id)'
])has(advisorHardening,marker,'C1 advisor hardening');
for(const marker of [
  'P116C1_FAILED','legacy v1 transition still executable','governed v2 transition not executable',
  'exact replay was not idempotent','P116C1_IDEMPOTENCY_CONFLICT_NOT_REJECTED','P116C1_STALE_NOT_REJECTED',
  'private transition receipts direct read grant leak','P116C1_CROSS_WORKSPACE_NOT_REJECTED',
  'transition receipt count invalid after privileged verification','receipt residue','revision residue','engagement residue','audit residue'
])has(liveProbe,marker,'C1 Real Cloud probe');

for(const marker of [
  'version: number;','operationId: string;','expectedVersion: number;',
  "transition_engagement_contract_revision_v2",
  'p_operation_id: operationId','p_expected_version: expectedVersion',
  "version: positiveInteger(row.version, 'contract revision version')"
])has(gateway,marker,'M16 gateway');
lacks(gateway,"transition_engagement_contract_revision_v1', {",'M16 gateway');
has(panel,'operationId:crypto.randomUUID()','contract panel');
has(panel,'expectedVersion:r.version','contract panel');

for(const marker of [
  'create table private.contract_approval_bridge_bindings',
  'revision_version_at_issue integer not null',
  'private.bind_client_contract_approval_v1_impl',
  'private.reconcile_client_contract_approval_v1_impl',
  "v_request.request_type<>'approval'",
  "v_request.required_permission<>'approve_document'",
  "v_request.status<>'fulfilled'",
  "v_response.decision not in ('approved','rejected')",
  "v_to_status:=case when v_response.decision='approved' then 'approved' else 'draft' end",
  'public.transition_engagement_contract_revision_v2(',
  'ENJAZ_CONTRACT_APPROVAL_REVISION_STALE',
  'ENJAZ_CONTRACT_APPROVAL_RECONCILE_CONFLICT',
  'ENJAZ_CONTRACT_APPROVAL_OPERATION_CONFLICT',
  'engagement.contract.client_decision.reconciled'
])has(c2Migration,marker,'C2 bridge migration');
lacks(c2Migration,'update public.engagement_contract_revisions','C2 bridge migration');
lacks(c2Migration,'create table public.contract_approval_bridge','C2 bridge migration');
for(const marker of [
  'P116C2_FAILED','p116c2_fixture','P116C2_REVOKED_BIND_ACCEPTED','P116C2_EXPIRED_BIND_ACCEPTED',
  'P116C2_UNBOUND_ENGAGEMENT_ACCEPTED','P116C2_CLIENT_BIND_ACCEPTED','P116C2_CLIENT_RECONCILE_ACCEPTED',
  'P116C2_STALE_RECONCILE_ACCEPTED','P116C2_OPERATION_CONFLICT_ACCEPTED',
  'approved decision did not feed exact M16 transition',
  'rejected decision did not return M16 revision to draft',
  'C2 SAVEPOINT rollback left residue','C2 audit residue remains after SAVEPOINT rollback'
])has(c2LiveProbe,marker,'C2 Real Cloud probe');
for(const marker of [
  "'bind_client_contract_approval_v1'","'reconcile_client_contract_approval_v1'",
  'p_expected_revision_version:ver(input.expectedRevisionVersion)',
  'p_operation_id:id(input.operationId)'
])has(c2Gateway,marker,'C2 gateway');
for(const marker of [
  'bind uses only governed C2 RPC with expected revision version',
  'reconcile carries response, operation and expected version to governed RPC',
  'rejected client decision can only parse as M16 draft return',
  'invalid ids and versions fail before network'
])has(c2GatewayTests,marker,'C2 gateway tests');
for(const marker of [
  'add column contract_revision_id uuid',
  'renewals_contract_revision_fk',
  'private.bind_contract_renewal_provenance_v1_impl',
  'public.bind_contract_renewal_provenance_v1',
  "v_revision.status<>'effective'",
  'v_revision.version<>p_expected_revision_version',
  'v_renewal.version<>p_expected_renewal_version',
  'due_date=v_revision.expires_on',
  "v_receipt.command_type<>'contract_renewal_binding'",
  'create table private.contract_renewal_communication_evidence',
  'private.record_contract_renewal_communication_evidence_v1_impl',
  "v_communication.direction<>'outgoing'",
  "v_communication.metadata->>'source'<>'governed_outbound'",
  'public.communication_outbound_commands',
  'ENJAZ_CONTRACT_RENEWAL_M4_COMMAND_REQUIRED'
])has(c3Migration,marker,'C3 migration');
lacks(c3Migration,'create table public.contract_renewals','C3 migration');
lacks(c3Migration,'insert into public.communications','C3 migration');
for(const marker of [
  "'bind_contract_renewal_provenance_v1'",
  "'record_contract_renewal_communication_evidence_v1'",
  'p_expected_renewal_version:ver(input.expectedRenewalVersion)',
  'p_expected_revision_version:ver(input.expectedRevisionVersion)',
  'p_communication_id:id(input.communicationId)'
])has(c3Gateway,marker,'C3 gateway');
for(const marker of [
  'bind renewal uses canonical governed provenance RPC with both versions',
  'communication evidence uses canonical M4 communication id only',
  'invalid ids and versions fail before network',
  'duplicate renewal bind and communication evidence are preserved'
])has(c3GatewayTests,marker,'C3 gateway tests');
for(const marker of [
  'P116C3_STALE_RENEWAL_ACCEPTED','P116C3_BIND_REPLAY_CONFLICT_ACCEPTED','P116C3_COMPANY_MISMATCH_ACCEPTED',
  'prepare_communication_outbound_v1','__ENJAZ_P116C3_GOVERNED_OUTBOUND__',
  'P116C3_MISSING_M4_COMMAND_ACCEPTED','P116C3_UNGOVERNED_SOURCE_ACCEPTED',
  'P116C3_EVIDENCE_REPLAY_CONFLICT_ACCEPTED','P116C3_OUTSIDER_BIND_ACCEPTED','P116C3_OUTSIDER_EVIDENCE_ACCEPTED',
  'C3 attributable audit reconciliation incomplete','rollback to savepoint p116c3_fixture','C3 SAVEPOINT rollback left residue'
])has(c3LiveProbe,marker,'C3 Real Cloud probe');
req(state.phase11_6cRenewalCommunicationRealCloudProbePath==='database/migrations/phase_11_6_live_contract_renewal_communication_probe.sql','C3 Real Cloud probe path drifted');

for(const marker of [
  '11.6-C3 renewal provenance and M4 evidence preserve canonical owners',
  'destruction: shadow renewal table is detected',
  'destruction: removing effective contract gate is detected',
  'destruction: removing renewal expected version is detected',
  'destruction: arbitrary communication source is detected',
  'destruction: bypassing M4 command evidence is detected',
  'destruction: direct communication insert is detected'
])has(c3SourceTests,marker,'C3 source tests');

for(const marker of [
  '11.6-C2 bridge preserves M3 decision evidence and M16 owner truth',
  'destruction: direct contract mutation is detected',
  'destruction: removing fulfilled request gate is detected',
  'destruction: removing draft provenance is detected',
  'destruction: public reconcile SECURITY DEFINER is detected'
])has(c2SourceTests,marker,'C2 source tests');

for(const marker of [
  '11.6-C1 versioned M16 transition source contract is clean',
  'destruction: removing operation id is detected',
  'destruction: removing expected version is detected',
  'destruction: legacy v1 browser grant is detected',
  'destruction: public v2 SECURITY DEFINER is detected',
  'destruction: gateway fallback to v1 is detected'
])has(tests,marker,'C1 destructive tests');

if(errors.length){
  console.error(`ENJAZ PHASE 11.6-C CONTRACT APPROVAL AUDIT FAIL (${errors.length})`);
  errors.forEach(e=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log(state.phase11_6cStatus==='CLOSED'
    ? 'ENJAZ PHASE 11.6-C AUDIT PASS — C1/C2/C3 are Real Cloud certified, formal C closure is valid, and 11.6-D is AUTHORIZED_NEXT while 11.7 remains locked.'
    : 'ENJAZ PHASE 11.6-C AUDIT PASS — C1/C2 are Real Cloud certified; C3 source binds provenance on canonical renewals and accepts only canonical M4 governed outbound communication evidence; 11.6-D remains locked.');
}
