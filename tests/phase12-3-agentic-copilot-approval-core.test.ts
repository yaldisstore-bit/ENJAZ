import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAgentPlan,parseAgentReferences,parseAgentRequest} from '../supabase/functions/enjaz-copilot-agent/core.ts';
import {
  AGENT_APPROVAL_SCHEMA,AGENT_APPROVAL_DECISIONS,agentProposalHash,approvalDbDecision,approvalPayloadHash,
  approvalResult,approvalTraceOperation,parseAgentApprovalRequest,
} from '../supabase/functions/enjaz-copilot-agent/approval.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const P='33333333-3333-4333-8333-333333333333';
const D='44444444-4444-4444-8444-444444444444';
const refs=[{schema:'enjaz.global-search-result.v1',domain:'companies',entityId:'c1',title:'شركة ألف',subtitle:'بغداد',destination:'/app/companies?entity=c1'}];

test('12.3 A2 proposal digest binds exact grounded proposal',async()=>{
  const a=parseAgentRequest({workspaceId:W,requestId:R,operation:'propose',goal:'راجع شركة ألف واقترح التالي',contextQuery:'شركة ألف'});
  const b=parseAgentRequest({workspaceId:W,requestId:R,operation:'propose',goal:'راجع شركة باء واقترح التالي',contextQuery:'شركة ألف'});
  const pa=buildAgentPlan(a,parseAgentReferences(refs));
  const pb=buildAgentPlan(b,parseAgentReferences(refs));
  const ha=await agentProposalHash(a,pa);
  assert.match(ha,/^[0-9a-f]{64}$/);
  assert.notEqual(ha,await agentProposalHash(b,pb));
});

test('12.3 A2 approval request is actor-controlled and bounded',async()=>{
  assert.equal(AGENT_APPROVAL_SCHEMA,'enjaz.copilot.agent.approval.v1');
  assert.deepEqual(AGENT_APPROVAL_DECISIONS,['approve','reject']);
  const req=parseAgentApprovalRequest({workspaceId:W,requestId:R,proposalId:P,proposalHash:'a'.repeat(64),decision:'approve',decisionKey:D});
  assert.equal(approvalTraceOperation(req.decision),'approve_proposal');
  assert.equal(approvalDbDecision(req.decision),'approved');
  assert.match(await approvalPayloadHash(req),/^[0-9a-f]{64}$/);
  assert.throws(()=>parseAgentApprovalRequest({...req,decision:'execute'}),/APPROVAL_DECISION_INVALID/);
  assert.throws(()=>parseAgentApprovalRequest({...req,proposalHash:'bad'}),/PROPOSAL_HASH_INVALID/);
  assert.throws(()=>parseAgentApprovalRequest({...req,actorUserId:W}),/APPROVAL_FIELD_FORBIDDEN/);
});

test('12.3 A2 approval result never grants execution authority',()=>{
  const result=approvalResult({proposalId:P,proposalHash:'b'.repeat(64),status:'approved',expiresAt:'2026-09-18T15:30:00Z',replayed:false});
  assert.equal(result.actorBound,true);
  assert.equal(result.workspaceBound,true);
  assert.equal(result.digestBound,true);
  assert.equal(result.expiryRequired,true);
  assert.equal(result.singleUseRequired,true);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.businessMutationAllowed,false);
});
