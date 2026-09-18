import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_action_document_request.sql','utf8');

test('12.3 A3-D stores exact document request semantics and recomputes digest',()=>{
  for(const marker of [
    'action_principal_id uuid null','action_instructions text null','action_valid_until timestamptz null',
    "action_kind='document.request'",'private.copilot_document_request_hash_v1','extensions.digest(',
    '|prepare_document_request','ENJAZ_COPILOT_ACTION_HASH_CONFLICT',
  ]) assert.ok(sql.includes(marker),marker);
});

test('12.3 A3-D execution is create-only document request through M3',()=>{
  for(const marker of [
    'private.copilot_execute_document_request_v1_impl','public.save_client_portal_request_v1(',
    "v_row.action_transaction_id,'document',v_row.action_title,v_row.action_instructions",
    'v_row.action_due_at,null,v_row.action_valid_until,null',
    "set status='consumed'","'consumed',p_execution_key",
  ]) assert.ok(sql.includes(marker),marker);
  assert.doesNotMatch(sql,/public\.copilot_execute_document_request_v1\([^)]*(principal|transaction|title|instructions|due|valid|request_type|resource)/i);
});

test('12.3 A3-D execution is authenticated-only and registration is service-only',()=>{
  assert.match(sql,/revoke all on function public\.copilot_execute_document_request_v1\(uuid,uuid,text,uuid\) from public,anon,service_role/);
  assert.match(sql,/grant execute on function public\.copilot_execute_document_request_v1\(uuid,uuid,text,uuid\) to authenticated/);
  assert.match(sql,/revoke all on function public\.copilot_register_document_request_proposal_v1[\s\S]*from public,anon,authenticated/);
});

test('12.3 A3-D cannot smuggle other portal request types or unrelated authorities',()=>{
  const domain=sql.match(/v_domain:=public\.save_client_portal_request_v1\([\s\S]*?\);/)?.[0]??'';
  assert.match(domain,/'document'/);
  assert.match(domain,/v_row\.action_due_at,null,v_row\.action_valid_until,null/);
  assert.doesNotMatch(domain,/'payment'|'approval'|'appointment'|'information'/);
  assert.doesNotMatch(sql,/\b(post_payment_v1|reverse_payment_v1|mutate_transaction_workflow|send_client_portal_message_v1)\b/);
});
