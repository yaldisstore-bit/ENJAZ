import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core=fs.readFileSync('supabase/functions/enjaz-copilot-agent/core.ts','utf8');
const state=JSON.parse(fs.readFileSync('docs/PHASE12_3_STATE.json','utf8'));

function violations(c=core){
 const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
 req(c.includes("AGENT_PLAN_SCHEMA='enjaz.copilot.agent.plan.v1'"),'schema');
 req(c.includes("AGENT_OPERATIONS=['plan','propose']"),'operations');
 req(c.includes("ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','goal','contextQuery','limitPerDomain'])"),'bounded-fields');
 req(c.includes("destination.startsWith('/app/')"),'internal-provenance');
 req(c.includes("executionAllowed:false"),'execution-locked');
 req(c.includes("explicitApprovalRequired:true"),'approval-required');
 req(c.includes("domainValidationRequired:true"),'domain-validation');
 req(c.includes("genericWriteToolAllowed:false"),'generic-write-disabled');
 req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(c),'no-provider-path');
 req(!/\.from\(['"][^'"]+['"]\)/.test(c),'no-table-access');
 req(!/\b(insert into|update\s+public\.|delete from|rpc\(['"][^'"]*(create|update|delete|post|reverse|archive))/i.test(c),'no-mutation-path');
 req(!/['"]execute['"]/.test(c.match(/AGENT_OPERATIONS=[^;]+/)?.[0]??''),'no-execute-operation');
 return out;
}

test('12.3 A1 source contract passes',()=>assert.deepEqual(violations(),[]));

test('12.3 A1 execution lock survives A2 database activation',()=>{
 assert.equal(state.a1Certification,'PASS_PLAN_PROPOSAL_CONTRACT');
 assert.equal(state.slice,'A2_APPROVAL_BINDING_CONTRACT');
 assert.equal(state.executeOperationAllowed,false);
 assert.equal(state.sensitiveMutationExecutionAllowed,false);
 assert.equal(state.directBusinessTableWritesAllowed,false);
 assert.equal(state.genericWriteToolAllowed,false);
 assert.equal(state.executionClaimAllowed,false);
 assert.equal(state.edgeAgentDeployed,false);
 assert.equal(state.databaseAgentMigrationApplied,true);
});

test('destruction: execute operation is detected',()=>{
 const mutated=core.replace("AGENT_OPERATIONS=['plan','propose']","AGENT_OPERATIONS=['plan','propose','execute']");
 assert.ok(violations(mutated).includes('operations'));
 assert.ok(violations(mutated).includes('no-execute-operation'));
});

test('destruction: generic execution authority is detected',()=>{
 const mutated=core.replaceAll('genericWriteToolAllowed:false','genericWriteToolAllowed:true');
 assert.ok(violations(mutated).includes('generic-write-disabled'));
});
