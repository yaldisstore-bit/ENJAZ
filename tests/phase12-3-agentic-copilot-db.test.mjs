import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_12_3_agentic_approval_binding.sql','utf8');

test('12.3 A2 private approval evidence is digest/actor/workspace/expiry bound',()=>{
  for(const marker of [
    'create table private.copilot_agent_proposals',
    'create table private.copilot_agent_approval_events',
    "proposal_hash text not null check(proposal_hash ~ '^[0-9a-f]{64}$')",
    "status in ('pending','approved','rejected','consumed')",
    'constraint copilot_agent_proposals_request_unique unique(workspace_id,request_id)',
    'constraint copilot_agent_proposals_decision_key_unique unique(workspace_id,decision_key)',
    'constraint copilot_agent_proposals_execution_key_unique unique(workspace_id,execution_key)',
    "p_expires_at>v_now+interval '30 minutes'",
    'v_row.actor_user_id<>p_actor_user_id',
    'v_row.proposal_hash<>p_proposal_hash',
    'ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT',
  ]) assert.ok(sql.includes(marker),marker);
});

test('12.3 A2 evidence tables and RPCs are service-only',()=>{
  assert.match(sql,/revoke all on table private\.copilot_agent_proposals from public,anon,authenticated,service_role/);
  assert.match(sql,/revoke all on table private\.copilot_agent_approval_events from public,anon,authenticated,service_role/);
  for(const fn of ['copilot_begin_request_v3','copilot_register_agent_proposal_v1','copilot_decide_agent_proposal_v1']){
    assert.ok(sql.includes(`grant execute on function public.${fn}`),fn);
  }
  assert.doesNotMatch(sql,/grant execute on function public\.copilot_(?:begin_request_v3|register_agent_proposal_v1|decide_agent_proposal_v1)[\s\S]{0,180}\bto (?:anon|authenticated|public)\b/i);
});

test('12.3 A2 has no business mutation or raw plan persistence',()=>{
  assert.doesNotMatch(sql,/\b(insert into|update|delete from)\s+public\./i);
  assert.doesNotMatch(sql,/\b(raw_goal|raw_plan|plan_snapshot|model_output|prompt_text)\b/i);
  assert.ok(!sql.includes('copilot_consume_agent_proposal'));
  assert.ok(!sql.includes('execute_agent_action'));
});


test('12.3 A2 FK hardening covers actor/decision/consumption evidence',()=>{
  const hardening=fs.readFileSync('database/migrations/phase_12_3_agentic_approval_fk_index_hardening.sql','utf8');
  for(const marker of [
    'copilot_agent_proposals_actor_idx',
    'copilot_agent_proposals_decided_by_idx',
    'copilot_agent_proposals_consumed_by_idx',
    'copilot_agent_approval_events_actor_idx',
    'actor_user_id,workspace_id,requested_at desc',
    'decided_by,workspace_id',
    'consumed_by,workspace_id',
    'actor_user_id,workspace_id,occurred_at desc',
  ]) assert.ok(hardening.includes(marker),marker);
  assert.doesNotMatch(hardening,/\b(insert into|update|delete from)\b/i);
});
