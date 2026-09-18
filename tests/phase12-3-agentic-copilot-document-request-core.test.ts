import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ACTION_OPERATIONS,actionProposalHash,actionTracePayloadHash,documentRequestCanonical,
  parseAgentActionRequest,preparedDocumentRequestResult,
} from '../supabase/functions/enjaz-copilot-agent/action.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const P='33333333-3333-4333-8333-333333333333';
const T='44444444-4444-4444-8444-444444444444';
const Q='55555555-5555-4555-8555-555555555555';
const X='66666666-6666-4666-8666-666666666666';
const DUE='2099-09-19T09:30:00.000Z';
const VALID='2099-09-20T09:30:00.000Z';

test('12.3 A3-D document-request operations remain preserved before later A3-E additions',()=>{
  assert.deepEqual(AGENT_ACTION_OPERATIONS.slice(0,8),[
    'prepare_followup_snooze','execute_followup_snooze',
    'prepare_followup_create','execute_followup_create',
    'prepare_schedule_reminder','execute_schedule_reminder',
    'prepare_document_request','execute_document_request',
  ]);
  assert.deepEqual(AGENT_ACTION_OPERATIONS.slice(8),['prepare_document_draft','execute_document_draft']);
});

test('12.3 A3-D digest binds principal transaction target content and validity',async()=>{
  const req=parseAgentActionRequest({
    workspaceId:W,requestId:R,operation:'prepare_document_request',
    principalId:P,transactionId:T,portalRequestId:Q,title:'طلب مستند رسمي',
    instructions:'يرجى رفع النسخة الموقعة',dueAt:DUE,validUntil:VALID,
  });
  assert.equal(req.operation,'prepare_document_request');
  if(req.operation!=='prepare_document_request')throw new Error('unexpected operation');
  const canonical=await documentRequestCanonical(req);
  assert.match(canonical,/enjaz\.copilot\.agent\.action\.v1\|/);
  assert.ok(canonical.includes(P)&&canonical.includes(T)&&canonical.includes(Q));
  assert.ok(!canonical.includes('طلب مستند رسمي')&&!canonical.includes('يرجى رفع النسخة الموقعة'));
  const hash=await actionProposalHash(req);
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert.notEqual(hash,await actionProposalHash({...req,title:'طلب آخر'}));
  assert.notEqual(hash,await actionProposalHash({...req,instructions:null}));
  assert.equal(hash,await actionTracePayloadHash(req));
});

test('12.3 A3-D request type resource share update and validity escape fields are forbidden',()=>{
  const base={workspaceId:W,requestId:R,operation:'prepare_document_request',principalId:P,transactionId:T,portalRequestId:Q,title:'طلب مستند',instructions:null,dueAt:DUE,validUntil:VALID};
  assert.throws(()=>parseAgentActionRequest({...base,requestType:'payment'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,resourceShareId:X}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,expectedVersion:1}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,validFrom:DUE}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-D execute carries no document-request business fields',()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'execute_document_request',proposalId:Q,proposalHash:'a'.repeat(64),executionKey:X});
  assert.equal(req.operation,'execute_document_request');
  assert.throws(()=>parseAgentActionRequest({...req,principalId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,title:'mutated'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,requestType:'document'}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-D prepared result is document-only approval-gated create',()=>{
  const result=preparedDocumentRequestResult({
    proposalId:Q,proposalHash:'b'.repeat(64),expiresAt:VALID,replayed:false,
    principalId:P,transactionId:T,portalRequestId:Q,title:'طلب مستند',instructions:null,dueAt:DUE,validUntil:VALID,
  });
  assert.equal(result.action.kind,'document.request');
  assert.equal(result.action.requestType,'document');
  assert.equal(result.action.resourceShareId,null);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.explicitApprovalRequired,true);
  assert.equal(result.genericWriteToolAllowed,false);
});
