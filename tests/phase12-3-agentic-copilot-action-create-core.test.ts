import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ACTION_OPERATIONS,actionProposalHash,actionTracePayloadHash,followupCreateCanonical,
  parseAgentActionRequest,preparedCreateActionResult,
} from '../supabase/functions/enjaz-copilot-agent/action.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const T='33333333-3333-4333-8333-333333333333';
const F='44444444-4444-4444-8444-444444444444';
const P='55555555-5555-4555-8555-555555555555';
const E='66666666-6666-4666-8666-666666666666';
const DUE='2099-09-19T12:30:00.000Z';

test('12.3 A3-B extends allowlist by followup create only',()=>{
  assert.deepEqual(AGENT_ACTION_OPERATIONS,[
    'prepare_followup_snooze','execute_followup_snooze','prepare_followup_create','execute_followup_create',
  ]);
});

test('12.3 A3-B nested title hash binds exact unicode content without delimiter ambiguity',async()=>{
  const req=parseAgentActionRequest({
    workspaceId:W,requestId:R,operation:'prepare_followup_create',transactionId:T,followupId:F,
    title:'متابعة | كتاب رسمي',dueAt:DUE,
  });
  assert.equal(req.operation,'prepare_followup_create');
  if(req.operation!=='prepare_followup_create')throw new Error('unexpected operation');
  const canonical=await followupCreateCanonical(req);
  assert.match(canonical,new RegExp(`^enjaz\\.copilot\\.agent\\.action\\.v1\\|${W}\\|${R}\\|prepare_followup_create\\|${T}\\|${F}\\|[0-9a-f]{64}\\|`));
  assert.ok(!canonical.includes('متابعة | كتاب رسمي'));
  const hash=await actionProposalHash(req);
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert.notEqual(hash,await actionProposalHash({...req,title:'متابعة كتاب رسمي'}));
  assert.equal(hash,await actionTracePayloadHash(req));
});

test('12.3 A3-B create execution cannot carry business fields',()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'execute_followup_create',proposalId:P,proposalHash:'a'.repeat(64),executionKey:E});
  assert.equal(req.operation,'execute_followup_create');
  assert.throws(()=>parseAgentActionRequest({...req,transactionId:T}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,followupId:F}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,title:'x'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,dueAt:DUE}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-B prepared create remains explicit-approval only',()=>{
  const result=preparedCreateActionResult({
    proposalId:P,proposalHash:'b'.repeat(64),expiresAt:DUE,replayed:false,
    transactionId:T,followupId:F,title:'متابعة رسمية',dueAt:DUE,
  });
  assert.equal(result.action.kind,'followup.create');
  assert.equal(result.action.transactionId,T);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.explicitApprovalRequired,true);
  assert.equal(result.genericWriteToolAllowed,false);
});
