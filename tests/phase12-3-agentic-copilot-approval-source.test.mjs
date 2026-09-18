import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core=fs.readFileSync('supabase/functions/enjaz-copilot-agent/approval.ts','utf8');
const state=JSON.parse(fs.readFileSync('docs/PHASE12_3_STATE.json','utf8'));

test('12.3 A2 approval core is hash-only and execution locked',()=>{
  for(const marker of [
    "AGENT_APPROVAL_SCHEMA='enjaz.copilot.agent.approval.v1'",
    "AGENT_APPROVAL_DECISIONS=['approve','reject']",
    'digestBound:true',
    'expiryRequired:true',
    'singleUseRequired:true',
    'executionAllowed:false',
    'businessMutationAllowed:false',
  ]) assert.ok(core.includes(marker),marker);
  assert.doesNotMatch(core,/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/);
  assert.doesNotMatch(core,/\.from\(|\.rpc\(/);
  assert.equal(state.executeOperationAllowed,false);
  assert.equal(state.a2Certification,'PASS_APPROVAL_BINDING_REAL_CLOUD');
  assert.equal(state.executionClaimAllowed,true);
  assert.equal(state.sensitiveMutationExecutionAllowed,false);
  assert.equal(state.a3Certification,'PASS_FOLLOWUP_SNOOZE_REAL_CLOUD');
  assert.equal(state.authorizedActionAdapters.length,3);
});
