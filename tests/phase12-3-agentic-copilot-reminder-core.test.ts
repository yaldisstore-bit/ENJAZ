import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ACTION_OPERATIONS,actionProposalHash,actionTracePayloadHash,parseAgentActionRequest,
  preparedReminderActionResult,scheduleReminderCanonical,
} from '../supabase/functions/enjaz-copilot-agent/action.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333';
const O='44444444-4444-4444-8444-444444444444';
const P='55555555-5555-4555-8555-555555555555';
const E='66666666-6666-4666-8666-666666666666';
const WHEN='2099-09-19T09:30:00.000Z';

test('12.3 A3-C reminder operations remain preserved inside the expanded A3 allowlist',()=>{
  for(const op of ['prepare_schedule_reminder','execute_schedule_reminder'] as const){
    assert.ok(AGENT_ACTION_OPERATIONS.includes(op));
  }
  assert.equal(AGENT_ACTION_OPERATIONS.filter(x=>x.includes('schedule_reminder')).length,2);
});

test('12.3 A3-C reminder digest binds source, operation id and exact time',async()=>{
  const req=parseAgentActionRequest({
    workspaceId:W,requestId:R,operation:'prepare_schedule_reminder',
    sourceKind:'workflow_deadline',sourceId:S,operationId:O,scheduledFor:WHEN,
  });
  assert.equal(req.operation,'prepare_schedule_reminder');
  if(req.operation!=='prepare_schedule_reminder')throw new Error('unexpected operation');
  assert.equal(scheduleReminderCanonical(req),
    `enjaz.copilot.agent.action.v1|${W}|${R}|prepare_schedule_reminder|workflow_deadline|${S}|${O}|${WHEN}`);
  const hash=await actionProposalHash(req);
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert.notEqual(hash,await actionProposalHash({...req,sourceKind:'renewal_occurrence'}));
  assert.equal(hash,await actionTracePayloadHash(req));
});

test('12.3 A3-C request has no recipient/mode/followup escape fields',()=>{
  const base={workspaceId:W,requestId:R,operation:'prepare_schedule_reminder',sourceKind:'renewal_occurrence',sourceId:S,operationId:O,scheduledFor:WHEN};
  assert.throws(()=>parseAgentActionRequest({...base,recipientUserId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,mode:'escalation'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,followupId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,sourceKind:'other'}),/ACTION_SOURCE_KIND_INVALID/);
});

test('12.3 A3-C execute cannot carry reminder business fields',()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'execute_schedule_reminder',proposalId:P,proposalHash:'a'.repeat(64),executionKey:E});
  assert.equal(req.operation,'execute_schedule_reminder');
  assert.throws(()=>parseAgentActionRequest({...req,sourceId:S}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,scheduledFor:WHEN}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,recipientUserId:P}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-C prepared reminder remains approval-gated and self-only',()=>{
  const result=preparedReminderActionResult({
    proposalId:P,proposalHash:'b'.repeat(64),expiresAt:WHEN,replayed:false,
    sourceKind:'workflow_deadline',sourceId:S,operationId:O,scheduledFor:WHEN,
  });
  assert.equal(result.action.kind,'reminder.schedule');
  assert.equal(result.action.recipient,'self');
  assert.equal(result.action.mode,'reminder');
  assert.equal(result.executionAllowed,false);
  assert.equal(result.explicitApprovalRequired,true);
  assert.equal(result.genericWriteToolAllowed,false);
});
