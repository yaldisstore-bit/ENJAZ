import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_action_followup_snooze.sql','utf8');

test('12.3 A3-A action proposal persists exact approved semantics',()=>{
  for(const marker of [
    "proposal_kind text not null default 'plan'",
    "action_kind text null",
    "action_target_id uuid null",
    "action_snoozed_until timestamptz null",
    "action_kind='followup.snooze'",
    "private.copilot_followup_snooze_hash_v1",
    "'enjaz.copilot.agent.action.v1'",
    "'|prepare_followup_snooze'",
    "extensions.digest(",
    "ENJAZ_COPILOT_ACTION_HASH_CONFLICT",
  ]) assert.ok(sql.includes(marker),marker);
});

test('12.3 A3-A execution is proposal-only input and atomic domain delegation',()=>{
  for(const marker of [
    'private.copilot_execute_followup_snooze_v1_impl',
    "v_actor uuid:=auth.uid()",
    "v_row.status<>'approved'",
    'v_row.expires_at<=v_now',
    'v_row.action_snoozed_until<=v_now',
    "public.mutate_transaction_followup_state_v1(",
    "set status='consumed'",
    "event_type,event_key,proposal_hash",
    "'consumed',p_execution_key",
    "ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT",
  ]) assert.ok(sql.includes(marker),marker);
  const signature=/public\.copilot_execute_followup_snooze_v1\(\s*p_workspace_id uuid,p_proposal_id uuid,p_proposal_hash text,p_execution_key uuid\s*\)/;
  assert.match(sql,signature);
  assert.doesNotMatch(sql,/public\.copilot_execute_followup_snooze_v1\([^)]*followup_id/i);
  assert.doesNotMatch(sql,/public\.copilot_execute_followup_snooze_v1\([^)]*snoozed_until/i);
});

test('12.3 A3-A execution authority is authenticated-only and service role denied',()=>{
  assert.match(sql,/revoke all on function public\.copilot_execute_followup_snooze_v1\(uuid,uuid,text,uuid\)\s+from public,anon,service_role/);
  assert.match(sql,/grant execute on function public\.copilot_execute_followup_snooze_v1\(uuid,uuid,text,uuid\)\s+to authenticated/);
  assert.match(sql,/revoke all on function public\.copilot_register_followup_snooze_proposal_v1[\s\S]*from public,anon,authenticated/);
  assert.match(sql,/grant execute on function public\.copilot_register_followup_snooze_proposal_v1[\s\S]*to service_role/);
});

test('12.3 A3-A contains no generic execution or direct finance/document authority',()=>{
  assert.ok(!sql.includes('execute_agent_action'));
  assert.doesNotMatch(sql,/\b(post_payment_v1|reverse_payment_v1|archive_document_v1|generate_document_draft_v1|send_client_portal_message_v1)\b/);
});
