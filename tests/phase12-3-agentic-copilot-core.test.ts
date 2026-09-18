import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_PLAN_SCHEMA,AGENT_OPERATIONS,agentPayloadHash,buildAgentPlan,parseAgentReferences,parseAgentRequest,
} from '../supabase/functions/enjaz-copilot-agent/core.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const refs=[
  {schema:'enjaz.global-search-result.v1',domain:'companies',entityId:'c1',title:'شركة ألف',subtitle:'بغداد',destination:'/app/companies?entity=c1'},
  {schema:'enjaz.global-search-result.v1',domain:'transactions',entityId:'t1',title:'#100 · تأسيس',subtitle:'شركة ألف',destination:'/app/transactions/t1'},
];

test('12.3 A1 accepts only plan/propose bounded requests',()=>{
  assert.deepEqual(AGENT_OPERATIONS,['plan','propose']);
  for(const operation of AGENT_OPERATIONS){
    const req=parseAgentRequest({workspaceId:W,requestId:R,operation,goal:'راجع المعاملة واقترح الخطوات التالية',contextQuery:'شركة ألف'});
    assert.equal(req.operation,operation);
    assert.equal(req.limitPerDomain,4);
  }
});

test('12.3 A1 rejects execute, unknown fields and malformed goals',()=>{
  assert.throws(()=>parseAgentRequest({workspaceId:W,requestId:R,operation:'execute',goal:'نفذ',contextQuery:'شركة'}),/OPERATION_FORBIDDEN/);
  assert.throws(()=>parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع المعاملة',contextQuery:'شركة',approvalToken:'x'}),/REQUEST_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'x',contextQuery:'شركة'}),/GOAL_INVALID/);
  assert.throws(()=>parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع المعاملة',contextQuery:'x'}),/CONTEXT_QUERY_INVALID/);
  assert.throws(()=>parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع المعاملة',contextQuery:'شركة',limitPerDomain:9}),/LIMIT_INVALID/);
});

test('12.3 A1 accepts only canonical internal authoritative references',()=>{
  const parsed=parseAgentReferences(refs);
  assert.equal(parsed.length,2);
  assert.throws(()=>parseAgentReferences([{...refs[0],schema:'shadow.v1'}]),/CONTEXT_SOURCE_INVALID/);
  assert.throws(()=>parseAgentReferences([{...refs[0],destination:'https://example.com'}]),/CONTEXT_SOURCE_INVALID/);
  assert.throws(()=>parseAgentReferences([{...refs[0],domain:'finance'}]),/CONTEXT_SOURCE_INVALID/);
});

test('12.3 A1 grounded plan is proposal-only and cannot execute',()=>{
  const req=parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع المعاملة واقترح ما يجب عمله',contextQuery:'شركة ألف'});
  const result=buildAgentPlan(req,parseAgentReferences(refs));
  assert.equal(AGENT_PLAN_SCHEMA,'enjaz.copilot.agent.plan.v1');
  assert.equal(result.steps.length,2);
  assert.deepEqual(result.steps.map(x=>x.execution),['read_only','proposal_only']);
  assert.equal(result.proposal.executionAllowed,false);
  assert.equal(result.proposal.explicitApprovalRequired,true);
  assert.equal(result.proposal.approvalBindingRequired,true);
  assert.equal(result.proposal.approvalExpiryRequired,true);
  assert.equal(result.proposal.approvalReplayProtectionRequired,true);
  assert.equal(result.proposal.domainValidationRequired,true);
  assert.equal(result.proposal.rlsRequired,true);
  assert.equal(result.proposal.genericWriteToolAllowed,false);
  assert.equal(result.grounding.executionStatus,'locked_proposal_only');
  assert.equal(result.grounding.providerUsed,false);
});

test('12.3 A1 missing authoritative context fails closed',()=>{
  const req=parseAgentRequest({workspaceId:W,requestId:R,operation:'propose',goal:'اقترح الخطوة التالية',contextQuery:'لا نتيجة'});
  const result=buildAgentPlan(req,[]);
  assert.equal(result.grounding.authoritativeContextFound,false);
  assert.equal(result.steps.length,0);
  assert.equal(result.citations.length,0);
  assert.equal(result.proposal.executionAllowed,false);
});

test('12.3 A1 payload hash binds goal and context query',async()=>{
  const a=parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع ألف',contextQuery:'شركة ألف'});
  const b=parseAgentRequest({workspaceId:W,requestId:R,operation:'plan',goal:'راجع باء',contextQuery:'شركة باء'});
  assert.match(await agentPayloadHash(a),/^[0-9a-f]{64}$/);
  assert.notEqual(await agentPayloadHash(a),await agentPayloadHash(b));
});
