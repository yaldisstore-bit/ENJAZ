import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge=fs.readFileSync('supabase/functions/enjaz-copilot-agent/index.ts','utf8');

function violations(source=edge){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(source.includes("userClient.rpc('global_search_v1'"),'user-scoped-authoritative-read');
  req(source.includes("admin.rpc('copilot_begin_request_v3'"),'service-trace-boundary');
  req(source.includes("admin.rpc('copilot_register_agent_proposal_v1'"),'proposal-evidence-rpc');
  req(source.includes("admin.rpc('copilot_decide_agent_proposal_v1'"),'approval-evidence-rpc');
  req(source.includes("admin.rpc('copilot_finish_request_v1'"),'trace-finish-rpc');
  req(source.includes("userClient.auth.getUser(token)"),'jwt-user-validation');
  req(!/admin\.from\(/.test(source),'no-service-business-table-read');
  req(!/admin\.rpc\(['"](?:post_payment|reverse_payment|mutate_transaction|create_|update_|delete_|archive_|send_|schedule_)/.test(source),'no-business-mutation-rpc');
  req(!/['"]execute['"]/.test(source),'no-generic-execute-operation');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(source),'no-provider-path');
  req(!/console\.(?:log|error)\([^\n]*(?:goal|contextQuery|proposalHash)/i.test(source),'no-sensitive-console-content');
  return out;
}

test('12.3 A2 edge uses JWT/RLS reads and private evidence RPCs only',()=>assert.deepEqual(violations(),[]));

test('destruction: service-role business table access is detected',()=>{
  const mutated=edge+"\nadmin.from('companies').select('*');";
  assert.ok(violations(mutated).includes('no-service-business-table-read'));
});

test('destruction: business mutation RPC is detected',()=>{
  const mutated=edge+"\nadmin.rpc('post_payment_v1',{});";
  assert.ok(violations(mutated).includes('no-business-mutation-rpc'));
});
