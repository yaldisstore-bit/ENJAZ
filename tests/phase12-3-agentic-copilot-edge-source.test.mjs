import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge=fs.readFileSync('supabase/functions/enjaz-copilot-agent/index.ts','utf8');

function violations(source=edge){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(source.includes("userClient.rpc('global_search_v1'"),'user-scoped-authoritative-read');
  req(source.includes("userClient.from('transaction_followups')"),'user-scoped-followup-read');
  req(source.includes("admin.rpc('copilot_begin_request_v4'"),'service-trace-boundary-v4');
  req(source.includes("admin.rpc('copilot_register_agent_proposal_v1'"),'proposal-evidence-rpc');
  req(source.includes("admin.rpc('copilot_register_followup_snooze_proposal_v1'"),'action-proposal-evidence-rpc');
  req(source.includes("admin.rpc('copilot_decide_agent_proposal_v1'"),'approval-evidence-rpc');
  req(source.includes("userClient.rpc('copilot_execute_followup_snooze_v1'"),'authenticated-domain-execution');
  req(source.includes("admin.rpc('copilot_finish_request_v1'"),'trace-finish-rpc');
  req(source.includes("userClient.auth.getUser(token)"),'jwt-user-validation');
  req(!/admin\.from\(/.test(source),'no-service-business-table-read');
  req(!/admin\.rpc\(['"](?:copilot_execute_followup_snooze_v1|post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'no-service-business-mutation-rpc');
  req(!/userClient\.rpc\(['"](?!global_search_v1|copilot_execute_followup_snooze_v1)[^'"]*(?:post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'only-allowlisted-user-mutation-rpc');
  req(!/['"]execute['"]/.test(source),'no-generic-execute-operation');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(source),'no-provider-path');
  req(!/console\.(?:log|error)\([^\n]*(?:goal|contextQuery|proposalHash|followupId|snoozedUntil)/i.test(source),'no-sensitive-console-content');
  return out;
}

test('12.3 A3-A Edge has exactly one action-specific business mutation path',()=>assert.deepEqual(violations(),[]));

test('destruction: service-role business table access is detected',()=>{
  assert.ok(violations(edge+"\nadmin.from('transaction_followups').select('*');").includes('no-service-business-table-read'));
});

test('destruction: service-role action execution is detected',()=>{
  assert.ok(violations(edge+"\nadmin.rpc('copilot_execute_followup_snooze_v1',{});").includes('no-service-business-mutation-rpc'));
});

test('destruction: second user mutation RPC is detected',()=>{
  assert.ok(violations(edge+"\nuserClient.rpc('post_payment_v1',{});").includes('only-allowlisted-user-mutation-rpc'));
});
