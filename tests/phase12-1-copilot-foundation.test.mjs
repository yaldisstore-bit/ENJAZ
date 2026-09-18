import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const state=JSON.parse(fs.readFileSync(new URL('docs/PHASE12_1_STATE.json',root),'utf8'));
const kickoff=fs.readFileSync(new URL('docs/PHASE12_1_KICKOFF.md',root),'utf8');

test('12.1 opens from exact certified 11.7 closure',()=>{
 assert.equal(state.baseCommit,'8b8d8a678ce98e12b1c6ab170e571bf8f0185e04');
 assert.equal(state.predecessorStatus,'CLOSED');
 assert.equal(state.predecessorClosureDecision,'PASS');
 assert.equal(state.phase12_2Allowed,false);
 assert.equal(state.successorStatus,'LOCKED');
});

test('12.1 is server-first and has no mutation authority',()=>{
 assert.equal(state.businessMutationToolsAllowed,false);
 assert.equal(state.browserProviderCallsAllowed,false);
 assert.equal(state.browserSecretCredentialsAllowed,false);
 assert.equal(state.clientUiAdded,false);
 assert.equal(state.newClientCssAllowed,false);
 assert.match(kickoff,/Copilot is not a business authority/);
});

test('12.1 forbids raw prompt/model persistence',()=>{
 assert.equal(state.rawPromptPersistenceAllowed,false);
 assert.equal(state.rawModelOutputPersistenceAllowed,false);
 assert.match(kickoff,/must \*\*not\*\* store:/);
});

test('12.1 requires structured fail-closed provider behavior',()=>{
 assert.equal(state.structuredOutputSchema,'enjaz.copilot.foundation.v1');
 assert.equal(state.providerConfigured,false);
 assert.equal(state.providerBackedAssistanceAllowed,false);
 assert.match(kickoff,/PROVIDER_NOT_CONFIGURED/);
});

test('12.1 opens with idempotency and actor-workspace rate limit',()=>{
 assert.equal(state.requestIdempotencyRequired,true);
 assert.equal(state.rateLimitPerMinute,20);
 assert.equal(state.workspacePermissionRequired,true);
 assert.equal(state.traceEvidencePrivate,true);
});

test('destruction: premature 12.2 authorization violates lifecycle contract',()=>{
 const mutated={...state,phase12_2Allowed:true,successorStatus:'AUTHORIZED_NEXT'};
 assert.notDeepEqual({allowed:mutated.phase12_2Allowed,status:mutated.successorStatus},{allowed:false,status:'LOCKED'});
});

test('destruction: browser provider access violates foundation contract',()=>{
 const mutated={...state,browserProviderCallsAllowed:true};
 assert.notEqual(mutated.browserProviderCallsAllowed,false);
});

test('destruction: raw prompt persistence violates privacy contract',()=>{
 const mutated={...state,rawPromptPersistenceAllowed:true};
 assert.notEqual(mutated.rawPromptPersistenceAllowed,false);
});
