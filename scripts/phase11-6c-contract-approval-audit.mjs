import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const scope=read('docs/PHASE11_6C_CONTRACT_APPROVAL_SCOPE.md');
const migration=read('database/migrations/phase_11_6_contract_transition_concurrency_hardening.sql');
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
req(state.phase11_6cClientDecisionBridgeAdded===false&&state.phase11_6cRenewalProvenanceAdded===false&&state.phase11_6cCommunicationEvidenceBridgeAdded===false,'C2/C3 cannot be pre-claimed during C1');
req(state.phase11_6cMigrationApplied===false&&state.phase11_6cMigrationVersion===null,'C1 migration cannot be pre-claimed before Real Cloud application');

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
  'version: number;','operationId: string;','expectedVersion: number;',
  "transition_engagement_contract_revision_v2",
  'p_operation_id: operationId','p_expected_version: expectedVersion',
  "version: positiveInteger(row.version, 'contract revision version')"
])has(gateway,marker,'M16 gateway');
lacks(gateway,"transition_engagement_contract_revision_v1', {",'M16 gateway');
has(panel,'operationId:crypto.randomUUID()','contract panel');
has(panel,'expectedVersion:r.version','contract panel');

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
  console.log('ENJAZ PHASE 11.6-C C1 AUDIT PASS — M16 transition is versioned/idempotent in source, legacy browser transition is revoked, B closure is preserved, and C2/C3/D remain locked.');
}
