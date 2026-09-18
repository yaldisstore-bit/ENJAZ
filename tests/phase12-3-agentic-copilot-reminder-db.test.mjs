import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_action_schedule_reminder.sql','utf8');
const snapshotRpc=fs.readFileSync('database/migrations/phase_12_3_agentic_schedule_snapshot_rpc_name_hardening.sql','utf8');

test('12.3 A3-C stores exact reminder semantics and recomputes digest',()=>{
  for(const marker of [
    'action_source_kind text null','action_operation_id uuid null','action_scheduled_for timestamptz null',
    "action_kind='reminder.schedule'","action_source_kind in ('workflow_deadline','renewal_occurrence')",
    'private.copilot_schedule_reminder_hash_v1','extensions.digest(','|prepare_schedule_reminder',
    'ENJAZ_COPILOT_ACTION_HASH_CONFLICT',
  ]) assert.ok(sql.includes(marker),marker);
});

test('12.3 A3-C execution is self-recipient reminder only',()=>{
  for(const marker of [
    'private.copilot_execute_schedule_reminder_v1_impl',"v_actor uuid:=auth.uid()",
    "v_row.action_kind<>'reminder.schedule'","v_row.status<>'approved'",
    'public.dispatch_scheduling_attention_v1(',
    "v_actor,'reminder',v_row.action_scheduled_for,null,null",
    "set status='consumed'","'consumed',p_execution_key",
  ]) assert.ok(sql.includes(marker),marker);
  assert.doesNotMatch(sql,/public\.copilot_execute_schedule_reminder_v1\([^)]*(recipient|source_kind|source_id|operation_id|scheduled_for|followup)/i);
});

test('12.3 A3-C execution is authenticated-only; evidence registration is service-only',()=>{
  assert.match(sql,/revoke all on function public\.copilot_execute_schedule_reminder_v1\(uuid,uuid,text,uuid\)\s+from public,anon,service_role/);
  assert.match(sql,/grant execute on function public\.copilot_execute_schedule_reminder_v1\(uuid,uuid,text,uuid\)\s+to authenticated/);
  assert.match(sql,/revoke all on function public\.copilot_register_schedule_reminder_proposal_v1[\s\S]*from public,anon,authenticated/);
});

test('12.3 A3-C has no escalation, follow-up side effect or unrelated authority',()=>{
  const domainCall=sql.match(/v_domain:=public\.dispatch_scheduling_attention_v1\([\s\S]*?\);/)?.[0]??'';
  assert.match(domainCall,/v_actor,'reminder',v_row\.action_scheduled_for,null,null/);
  assert.doesNotMatch(domainCall,/escalation/);
  assert.doesNotMatch(sql,/\b(post_payment_v1|reverse_payment_v1|send_client_portal_message_v1|mutate_transaction_workflow)\b/);
});


test('12.3 A3-C M10 snapshot wrapper exposes stable named RPC arguments',()=>{
  for(const marker of [
    'create or replace function public.get_scheduling_deadline_snapshot_v1(',
    'p_workspace_id uuid',
    'p_as_of timestamptz',
    'private.get_scheduling_deadline_snapshot_v1_impl(p_workspace_id,p_as_of)',
    'from public,anon,service_role',
    'to authenticated',
  ]) assert.ok(snapshotRpc.includes(marker),marker);
  assert.doesNotMatch(snapshotRpc,/\b(insert into|update\s+public\.|delete from)\b/i);
});
