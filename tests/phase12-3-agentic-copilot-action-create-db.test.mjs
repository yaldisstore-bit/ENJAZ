import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_action_followup_create.sql','utf8');

test('12.3 A3-B stores exact create semantics and independently hashes title',()=>{
  for(const marker of [
    'action_transaction_id uuid null','action_title text null','action_due_at timestamptz null',
    "action_kind='followup.create'","private.copilot_followup_create_hash_v1",
    "encode(extensions.digest(convert_to(p_title,'UTF8'),'sha256'),'hex')",
    "'|prepare_followup_create'","ENJAZ_COPILOT_ACTION_HASH_CONFLICT",
  ]) assert.ok(sql.includes(marker),marker);
});

test('12.3 A3-B execution delegates only to existing create followup domain authority',()=>{
  for(const marker of [
    'private.copilot_execute_followup_create_v1_impl',"v_actor uuid:=auth.uid()",
    "v_row.action_kind<>'followup.create'","v_row.status<>'approved'","v_row.action_due_at<=v_now",
    'public.create_transaction_followup_v1(',"set status='consumed'","'consumed',p_execution_key",
  ]) assert.ok(sql.includes(marker),marker);
  assert.doesNotMatch(sql,/public\.copilot_execute_followup_create_v1\([^)]*(transaction_id|followup_id|title|due_at)/i);
});

test('12.3 A3-B create execution is authenticated-only; registration remains service-only',()=>{
  assert.match(sql,/revoke all on function public\.copilot_execute_followup_create_v1\(uuid,uuid,text,uuid\)\s+from public,anon,service_role/);
  assert.match(sql,/grant execute on function public\.copilot_execute_followup_create_v1\(uuid,uuid,text,uuid\)\s+to authenticated/);
  assert.match(sql,/revoke all on function public\.copilot_register_followup_create_proposal_v1[\s\S]*from public,anon,authenticated/);
});

test('12.3 A3-B adds no unrelated business authority',()=>{
  assert.doesNotMatch(sql,/\b(post_payment_v1|reverse_payment_v1|archive_document_v1|send_client_portal_message_v1|mutate_transaction_workflow)\b/);
});
