import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ACTION_SCHEMA,AGENT_ACTION_OPERATIONS,actionProposalHash,actionTracePayloadHash,
  followupSnoozeCanonical,parseAgentActionRequest,preparedActionResult,
} from '../supabase/functions/enjaz-copilot-agent/action.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const F='33333333-3333-4333-8333-333333333333';
const P='44444444-4444-4444-8444-444444444444';
const E='55555555-5555-4555-8555-555555555555';
const FUTURE='2099-09-18T16:30:00.000Z';

test('12.3 A3-A exposes only followup snooze prepare/execute operations',()=>{
  assert.equal(AGENT_ACTION_SCHEMA,'enjaz.copilot.agent.action.v1');
  assert.deepEqual(AGENT_ACTION_OPERATIONS,['prepare_followup_snooze','execute_followup_snooze']);
});

test('12.3 A3-A canonical action hash binds exact target and timestamp',async()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'prepare_followup_snooze',followupId:F,snoozedUntil:FUTURE});
  assert.equal(followupSnoozeCanonical(req),`enjaz.copilot.agent.action.v1|${W}|${R}|prepare_followup_snooze|${F}|${FUTURE}`);
  const a=await actionProposalHash(req);
  const b=await actionProposalHash({...req,followupId:P});
  assert.match(a,/^[0-9a-f]{64}$/);
  assert.notEqual(a,b);
  assert.equal(a,await actionTracePayloadHash(req));
});

test('12.3 A3-A execute request cannot carry action fields',async()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'execute_followup_snooze',proposalId:P,proposalHash:'a'.repeat(64),executionKey:E});
  assert.match(await actionTracePayloadHash(req),/^[0-9a-f]{64}$/);
  assert.throws(()=>parseAgentActionRequest({...req,followupId:F}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,snoozedUntil:FUTURE}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,operation:'execute'}),/ACTION_OPERATION_FORBIDDEN/);
});

test('12.3 A3-A prepared action remains approval-gated',()=>{
  const result=preparedActionResult({proposalId:P,proposalHash:'b'.repeat(64),expiresAt:FUTURE,replayed:false,followupId:F,snoozedUntil:FUTURE});
  assert.equal(result.status,'pending_approval');
  assert.equal(result.action.kind,'followup.snooze');
  assert.equal(result.executionAllowed,false);
  assert.equal(result.explicitApprovalRequired,true);
  assert.equal(result.genericWriteToolAllowed,false);
});
