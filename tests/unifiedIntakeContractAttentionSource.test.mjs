import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_11_6_unified_intake_contract_attention.sql',root),'utf8');

function violations(s=sql){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  const impl=s.slice(s.indexOf('create or replace function private.list_unified_intake_contract_attention_v1_impl'),s.indexOf('create or replace function public.list_unified_intake_contract_attention_v1'));
  const pub=s.slice(s.indexOf('create or replace function public.list_unified_intake_contract_attention_v1'));
  req(impl.includes('private.require_crm_member_v1(p_workspace_id)'),'workspace-auth');
  req(impl.includes("'intake_followup'")&&impl.includes("'client_approval'")&&impl.includes("'contract_renewal'"),'three-authorities');
  req(impl.includes('private.intake_followup_requests')&&impl.includes('private.contract_approval_bridge_bindings')&&impl.includes('public.renewals'),'canonical-composition');
  req(impl.includes('public.client_portal_document_approval_responses'),'m3-response-evidence');
  req(impl.includes('private.contract_renewal_communication_evidence'),'m4-evidence');
  req(impl.includes("cr.status<>'effective'")&&impl.includes('r.due_date<>cr.expires_on'),'renewal-drift-visible');
  req(impl.includes("s.version<>f.expected_submission_version"),'intake-stale-visible');
  req(impl.includes("cr.version<>b.revision_version_at_issue"),'approval-stale-visible');
  req(impl.includes("'ownerSurface','intake_review'")&&impl.includes("'ownerSurface','documents'")&&impl.includes("'ownerSurface','calendar'"),'owner-surfaces');
  req(impl.includes("'kindLabel'")&&impl.includes("'attentionLabel'")&&impl.includes("'ownerPath'"),'display-projection');
  req(!/create\s+table/i.test(s),'no-shadow-table');
  req(!/\b(insert\s+into|update\s+public\.|update\s+private\.|delete\s+from)\b/i.test(impl),'read-only');
  req(!impl.includes('token_hash'),'no-capability-secret');
  req(pub.includes('security invoker'),'public-invoker');
  req(s.includes('revoke all on function public.list_unified_intake_contract_attention_v1(uuid,text,boolean,integer)')&&s.includes('to authenticated'),'rpc-grants');
  return out;
}

test('11.6-D unified attention is a projection over canonical owners',()=>assert.deepEqual(violations(),[]));
test('destruction: shadow table is detected',()=>assert.ok(violations(sql.replace('begin;','begin;\ncreate table public.unified_attention_shadow(id uuid);')).includes('no-shadow-table')));
test('destruction: direct renewal mutation is detected',()=>assert.ok(violations(sql.replace('v_actor:=private.require_crm_member_v1(p_workspace_id);',"v_actor:=private.require_crm_member_v1(p_workspace_id); update public.renewals set title=title where workspace_id=p_workspace_id;")).includes('read-only')));
test('destruction: removing workspace auth is detected',()=>assert.ok(violations(sql.replace('private.require_crm_member_v1(p_workspace_id)','auth.uid()')).includes('workspace-auth')));
test('destruction: public SECURITY DEFINER is detected',()=>assert.ok(violations(sql.replace('language sql\nstable\nsecurity invoker','language sql\nstable\nsecurity definer')).includes('public-invoker')));
test('destruction: secret leakage is detected',()=>assert.ok(violations(sql.replace("'mode',f.mode","'mode',f.mode,'secret',f.token_hash")).includes('no-capability-secret')));
