import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ACTION_OPERATIONS,actionProposalHash,actionTracePayloadHash,documentDraftCanonical,
  parseAgentActionRequest,preparedDocumentDraftResult,
} from '../supabase/functions/enjaz-copilot-agent/action.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';
const G='33333333-3333-4333-8333-333333333333';
const V='44444444-4444-4444-8444-444444444444';
const C='55555555-5555-4555-8555-555555555555';
const T='66666666-6666-4666-8666-666666666666';
const P='77777777-7777-4777-8777-777777777777';
const E='88888888-8888-4888-8888-888888888888';

test('12.3 A3-E extends allowlist by document draft only',()=>{
  assert.deepEqual(AGENT_ACTION_OPERATIONS,[
    'prepare_followup_snooze','execute_followup_snooze',
    'prepare_followup_create','execute_followup_create',
    'prepare_schedule_reminder','execute_schedule_reminder',
    'prepare_document_request','execute_document_request',
    'prepare_document_draft','execute_document_draft',
  ]);
});

test('12.3 A3-E draft digest binds generation template title company and transaction',async()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'prepare_document_draft',generationRequestId:G,templateVersionId:V,title:'مسودة كتاب رسمي',companyId:C,transactionId:T});
  assert.equal(req.operation,'prepare_document_draft');
  if(req.operation!=='prepare_document_draft')throw new Error('unexpected operation');
  const canonical=await documentDraftCanonical(req);
  assert.match(canonical,/enjaz\.copilot\.agent\.action\.v1\|/);
  assert.ok(canonical.includes(G)&&canonical.includes(V)&&canonical.includes(C)&&canonical.includes(T));
  assert.ok(!canonical.includes('مسودة كتاب رسمي'));
  const hash=await actionProposalHash(req);
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert.notEqual(hash,await actionProposalHash({...req,title:'مسودة أخرى'}));
  assert.notEqual(hash,await actionProposalHash({...req,companyId:null}));
  assert.equal(hash,await actionTracePayloadHash(req));
});

test('12.3 A3-E does not expose contact OCR review render or finalization inputs',()=>{
  const base={workspaceId:W,requestId:R,operation:'prepare_document_draft',generationRequestId:G,templateVersionId:V,title:'مسودة',companyId:C,transactionId:T};
  assert.throws(()=>parseAgentActionRequest({...base,contactId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,ocrAnalysisId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,decision:'approve'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,renderJobId:P}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...base,finalize:true}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-E execute carries no draft business fields',()=>{
  const req=parseAgentActionRequest({workspaceId:W,requestId:R,operation:'execute_document_draft',proposalId:P,proposalHash:'a'.repeat(64),executionKey:E});
  assert.equal(req.operation,'execute_document_draft');
  assert.throws(()=>parseAgentActionRequest({...req,templateVersionId:V}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,title:'mutated'}),/ACTION_FIELD_FORBIDDEN/);
  assert.throws(()=>parseAgentActionRequest({...req,companyId:C}),/ACTION_FIELD_FORBIDDEN/);
});

test('12.3 A3-E prepared draft is approval-gated and review-required only',()=>{
  const result=preparedDocumentDraftResult({proposalId:P,proposalHash:'b'.repeat(64),expiresAt:'2099-09-20T09:30:00.000Z',replayed:false,generationRequestId:G,templateVersionId:V,title:'مسودة',companyId:C,transactionId:T});
  assert.equal(result.action.kind,'document.draft');
  assert.equal(result.action.outputStatus,'review_required');
  assert.equal(result.action.contactId,null);
  assert.equal(result.action.ocrAnalysisId,null);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.explicitApprovalRequired,true);
  assert.equal(result.genericWriteToolAllowed,false);
});
