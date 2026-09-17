import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const scope=read('docs/PHASE11_6C_CONTRACT_APPROVAL_SCOPE.md');
const migration=read('database/migrations/phase_11_6_contract_transition_concurrency_hardening.sql');
const advisorHardening=read('database/migrations/phase_11_6_contract_transition_advisor_hardening.sql');
const liveProbe=read('database/migrations/phase_11_6_live_contract_transition_probe.sql');
const c2Migration=read('database/migrations/phase_11_6_contract_client_approval_bridge.sql');
const c2Gateway=read('src/features/intake-contract-communication/contractApprovalCommands.ts');
const c2GatewayTests=read('tests/contractApprovalCommands.test.ts');
const c2SourceTests=read('tests/contractApprovalBridgeSource.test.mjs');
const gateway=read('src/features/engagements/engagementContractCommands.ts');
const panel=read('src/ui-r2/documents/EngagementContractPanel.tsx');
const tests=read('tests/contractTransitionConcurrencySource.test.mjs');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const lacks=(s,m,l)=>req(!s.includes(m),`${l} forbidden marker present: ${m}`);

req(state.phase==='11.6'&&state.status==='IN_PROGRESS'&&state.currentSlice==='11.6-C','11.6-C lifecycle identity invalid');
req(state.mode==='CONTRACT_APPROVAL_RETAINER_COMMUNICATION','11.6-C mode drifted');
req(state.currentSliceBaseCommit==='314ff5a297420b4842a0bba78c3575d84e85c707','11.6-C must start from merged 11.6-B closure');
req(state.phase11_6bStatus==='CLOSED'&&state.phase11_6bExitGatePassed===true&&state.phase11_6bClosureDecision==='PASS','11.6-C requires certified B predecessor');
req(state.phase11_6bMergeCommit==='314ff5a297420b4842a0bba78c3575d84e85c707','11.6-B merge lineage drifted');
req(state.phase11_6cStatus==='IN_PROGRESS'&&state.phase11_6cExitGatePassed===false,'11.6-C cannot be pre-closed');
req(state.phase11_6dAllowed===false&&state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','11.6-D/11.7 must remain locked while C is open');
req(state.phase11_6cScopePath==='docs/PHASE11_6C_CONTRACT_APPROVAL_SCOPE.md','11.6-C scope path drifted');
req(state.phase11_6cM16VersionedTransitionAdded===true,'C1 M16 versioned transition source not recorded');
req(state.phase11_6cM16LegacyTransitionBrowserAllowed===false,'Legacy unversioned M16 browser transition must remain forbidden');
req(state.phase11_6cClientDecisionBridgeAdded===true,'C2 client decision bridge source must be recorded');
req(state.phase11_6cClientDecisionMigrationApplied===false&&state.phase11_6cClientDecisionMigrationVersion===null&&state.phase11_6cClientDecisionRealCloudVerification==='PENDING','C2 Real Cloud cannot be pre-claimed before source gate/application');
req(state.phase11_6cRenewalProvenanceAdded===false&&state.phase11_6cCommunicationEvidenceBridgeAdded===false,'C3 cannot be pre-claimed during C2');
req(state.phase11_6cC1Status==='CLOSED'&&state.phase11_6cC1ExitGatePassed===true,'C1 must be Real Cloud certified before C2');
req(state.phase11_6cMigrationApplied===true&&state.phase11_6cMigrationVersion==='20260917225607','C1 migration lineage invalid');
req(state.phase11_6cAdvisorHardeningApplied===true&&state.phase11_6cAdvisorHardeningMigrationVersion==='20260917230127','C1 advisor hardening lineage invalid');
req(state.phase11_6cRealCloudProbeApplied===true&&state.phase11_6cRealCloudProbeMigrationVersion==='20260917230406','C1 Real Cloud probe lineage invalid');
req(state.phase11_6cRealCloudVerification==='PASS_C1'&&state.phase11_6cPermissionMatrix==='PASS_C1'&&state.phase11_6cConflictRecovery==='PASS_C1'&&state.phase11_6cAuditReconciliation==='PASS_C1','C1 Real Cloud proof state invalid');
req(state.phase11_6cZeroResidueVerified===true,'C1 zero residue must be verified');
req(state.phase11_6cSecurityAdvisorBaselineTotal===66&&state.phase11_6cSecurityAdvisorPostC1Total===65&&state.phase11_6cNewSecurityAdvisorFindings===0,'C1 security advisor certificate invalid');
req(state.phase11_6cPerformanceAdvisorBaselineTotal===81&&state.phase11_6cPerformanceAdvisorPostC1Total===81&&state.phase11_6cUnindexedForeignKeysBaseline===28&&state.phase11_6cUnindexedForeignKeysPostC1===28&&state.phase11_6cNewPerformanceAdvisorFindings===0,'C1 performance advisor certificate invalid');

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
  console.log('ENJAZ PHASE 11.6-C AUDIT PASS — C1 is Real Cloud certified; C2 source preserves M3 decision evidence and routes contract truth only through M16 v2; C3/D remain locked.');
}
