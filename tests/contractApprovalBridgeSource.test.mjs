import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_11_6_contract_client_approval_bridge.sql',root),'utf8');
const gateway=fs.readFileSync(new URL('src/features/intake-contract-communication/contractApprovalCommands.ts',root),'utf8');

function segment(source,start,end){
  const a=source.indexOf(start);
  if(a<0)return '';
  const b=end?source.indexOf(end,a+start.length):-1;
  return source.slice(a,b<0?source.length:b);
}
function violations(s=sql,g=gateway){
  const out=[]; const req=(ok,name)=>{if(!ok)out.push(name)};
  const bind=segment(s,'create or replace function private.bind_client_contract_approval_v1_impl','create or replace function public.bind_client_contract_approval_v1');
  const reconcile=segment(s,'create or replace function private.reconcile_client_contract_approval_v1_impl','create or replace function public.reconcile_client_contract_approval_v1');
  const publicBind=segment(s,'create or replace function public.bind_client_contract_approval_v1','create or replace function private.reconcile_client_contract_approval_v1_impl');
  const publicReconcile=segment(s,'create or replace function public.reconcile_client_contract_approval_v1','revoke all on function private.bind_client_contract_approval_v1_impl');

  req(s.includes('create table private.contract_approval_bridge_bindings'),'private-bridge-only');
  req(!s.includes('create table public.contract_approval_bridge'),'no-public-shadow-bridge');
  req(s.includes('revision_version_at_issue integer not null'),'issue-version-evidence');
  req(s.includes('primary key(workspace_id,request_id)'),'one-binding-per-request');
  req(s.includes('contract_approval_bridge_operation_unique'),'operation-unique');
  req(bind.includes("v_request.request_type<>'approval'")&&bind.includes("v_request.required_permission<>'approve_document'"),'m3-approval-contract');
  req(bind.includes('v_revision.status<>\'under_review\''),'bind-under-review-only');
  req(bind.includes('v_revision.version<>p_expected_revision_version'),'bind-stale-guard');
  req(bind.includes('v_revision.draft_id<>v_target.draft_id'),'bind-draft-provenance');
  req(bind.includes('public.commercial_engagement_transactions'),'bind-engagement-transaction');
  req(reconcile.includes("v_request.status<>'fulfilled'"),'fulfilled-request-required');
  req(reconcile.includes("v_response.decision not in ('approved','rejected')"),'canonical-m3-decision');
  req(reconcile.includes("v_response.decision='approved' and v_draft.status<>'approved'")&&reconcile.includes("v_response.decision='rejected' and v_draft.status<>'draft'"),'factory-decision-proof');
  req(reconcile.includes("v_to_status:=case when v_response.decision='approved' then 'approved' else 'draft' end"),'decision-to-m16-mapping');
  req(reconcile.includes('public.transition_engagement_contract_revision_v2('),'m16-owner-command');
  req(!/update\s+public\.engagement_contract_revisions/i.test(reconcile),'no-direct-contract-mutation');
  req(reconcile.includes('ENJAZ_CONTRACT_APPROVAL_REVISION_STALE'),'reconcile-stale-guard');
  req(reconcile.includes('ENJAZ_CONTRACT_APPROVAL_RECONCILE_CONFLICT')&&reconcile.includes('ENJAZ_CONTRACT_APPROVAL_OPERATION_CONFLICT'),'reconcile-idempotency-conflict');
  req(reconcile.includes("v_request.revoked_at is not null")&&reconcile.includes("v_request.valid_until is not null and v_request.valid_until<=now()"),'request-revoked-expired-guard');
  req(reconcile.includes("s.revoked_at is null")&&reconcile.includes("s.valid_until is null or s.valid_until>now()"),'share-revoked-expired-guard');
  req(publicBind.includes('security invoker'),'public-bind-invoker');
  req(publicReconcile.includes('security invoker'),'public-reconcile-invoker');
  req(s.includes('revoke all on table private.contract_approval_bridge_bindings\n  from public,anon,authenticated,service_role'),'private-table-denied');
  req(g.includes("'bind_client_contract_approval_v1'")&&g.includes("'reconcile_client_contract_approval_v1'"),'gateway-governed-rpcs');
  req(g.includes('p_expected_revision_version:ver(input.expectedRevisionVersion)'),'gateway-expected-version');
  req(g.includes('p_operation_id:id(input.operationId)'),'gateway-operation-id');
  return out;
}

test('11.6-C2 bridge preserves M3 decision evidence and M16 owner truth',()=>assert.deepEqual(violations(),[]));
test('destruction: direct contract mutation is detected',()=>{
  const marker="v_transition:=public.transition_engagement_contract_revision_v2(\n    p_workspace_id,v_revision.id,p_operation_id,p_expected_revision_version,v_to_status\n  );";
  const mutated=sql.replace(marker,"update public.engagement_contract_revisions set status=v_to_status where id=v_revision.id;\n  v_transition:=jsonb_build_object('version',p_expected_revision_version+1);");
  assert.ok(violations(mutated).includes('no-direct-contract-mutation'));
});
test('destruction: removing fulfilled request gate is detected',()=>assert.ok(violations(sql.replace("v_request.status<>'fulfilled'","v_request.status='fulfilled'")).includes('fulfilled-request-required')));
test('destruction: removing draft provenance is detected',()=>assert.ok(violations(sql.replace("v_revision.draft_id<>v_target.draft_id","false")).includes('bind-draft-provenance')));
test('destruction: removing engagement transaction binding is detected',()=>assert.ok(violations(sql.replaceAll('public.commercial_engagement_transactions','public.transactions')).includes('bind-engagement-transaction')));
test('destruction: public reconcile SECURITY DEFINER is detected',()=>{
  const mutated=sql.replace("create or replace function public.reconcile_client_contract_approval_v1(\n  p_workspace_id uuid,","create or replace function public.reconcile_client_contract_approval_v1(\n  p_workspace_id uuid,").replace(
    "returns jsonb\nlanguage sql\nvolatile\nsecurity invoker\nset search_path=''\nas $$\n  select private.reconcile_client_contract_approval_v1_impl",
    "returns jsonb\nlanguage sql\nvolatile\nsecurity definer\nset search_path=''\nas $$\n  select private.reconcile_client_contract_approval_v1_impl"
  );
  assert.ok(violations(mutated).includes('public-reconcile-invoker'));
});
test('destruction: gateway dropping operation id is detected',()=>assert.ok(violations(sql,gateway.replace('p_operation_id:id(input.operationId),','')).includes('gateway-operation-id')));
