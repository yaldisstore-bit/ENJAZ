import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/enjaz-copilot-agent/index.ts','utf8');

function violations(source=edge){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(source.includes("userClient.rpc('global_search_v1'"),'user-scoped-authoritative-read');
  req(source.includes("userClient.from('transaction_followups')"),'user-scoped-followup-read');
  req(source.includes("userClient.from('transactions')"),'user-scoped-transaction-read');
  req(source.includes("admin.rpc('copilot_begin_request_v5'"),'service-trace-boundary-v5');
  req(source.includes("admin.rpc('copilot_register_followup_snooze_proposal_v1'"),'snooze-proposal-evidence');
  req(source.includes("admin.rpc('copilot_register_followup_create_proposal_v1'"),'create-proposal-evidence');
  req(source.includes("userClient.rpc('copilot_execute_followup_snooze_v1'"),'authenticated-snooze-execution');
  req(source.includes("userClient.rpc('copilot_execute_followup_create_v1'"),'authenticated-create-execution');
  req(!/admin\.from\(/.test(source),'no-service-business-table-read');
  req(!/admin\.rpc\(['"](?:copilot_execute_followup_(?:snooze|create)_v1|post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'no-service-business-mutation-rpc');
  req(!/userClient\.rpc\(['"](?!global_search_v1|copilot_execute_followup_snooze_v1|copilot_execute_followup_create_v1)[^'"]*(?:post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'only-two-allowlisted-user-mutation-rpcs');
  req(!/['"]execute['"]/.test(source),'no-generic-execute-operation');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(source),'no-provider-path');
  return out;
}
test('12.3 A3-B Edge has exactly two action-specific mutation paths',()=>assert.deepEqual(violations(),[]));
test('destruction: service business read detected',()=>assert.ok(violations(edge+"\nadmin.from('transactions').select('*');").includes('no-service-business-table-read')));
test('destruction: service create execution detected',()=>assert.ok(violations(edge+"\nadmin.rpc('copilot_execute_followup_create_v1',{});").includes('no-service-business-mutation-rpc')));
test('destruction: third user mutation RPC detected',()=>assert.ok(violations(edge+"\nuserClient.rpc('post_payment_v1',{});").includes('only-two-allowlisted-user-mutation-rpcs')));


test('12.3 A3-B validation errors remain first-class 400 codes',()=>{
  for(const marker of ["'TRANSACTION_ID_INVALID'","'ACTION_TITLE_INVALID'","'ACTION_DUE_AT_INVALID'"]){
    const count=edge.split(marker).length-1;
    assert.ok(count>=2,`${marker} must exist in validation and known-error sets`);
  }
});
