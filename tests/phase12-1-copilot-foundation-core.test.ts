import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOUNDATION_SCHEMA,capabilitiesResult,errorEnvelope,foundationPayloadHash,
  parseFoundationRequest,safeError,successEnvelope,
} from '../supabase/functions/enjaz-copilot-foundation/core.ts';

const W='11111111-1111-4111-8111-111111111111';
const R='22222222-2222-4222-8222-222222222222';

test('12.1 parses only the two foundation operations',()=>{
  assert.deepEqual(parseFoundationRequest({workspaceId:W,requestId:R,operation:'capabilities'}),{workspaceId:W,requestId:R,operation:'capabilities'});
  assert.throws(()=>parseFoundationRequest({workspaceId:W,requestId:R,operation:'search'}),/OPERATION_FORBIDDEN/);
});

test('12.1 rejects prompt/input fields before any provider boundary',()=>{
  assert.throws(()=>parseFoundationRequest({workspaceId:W,requestId:R,operation:'capabilities',prompt:'secret'}),/REQUEST_FIELD_FORBIDDEN/);
  assert.throws(()=>parseFoundationRequest({workspaceId:W,requestId:R,operation:'provider_probe',input:{text:'x'}}),/REQUEST_FIELD_FORBIDDEN/);
});

test('12.1 validates workspace/request ids',()=>{
  assert.throws(()=>parseFoundationRequest({workspaceId:'bad',requestId:R,operation:'capabilities'}),/WORKSPACE_ID_INVALID/);
  assert.throws(()=>parseFoundationRequest({workspaceId:W,requestId:'bad',operation:'capabilities'}),/REQUEST_ID_INVALID/);
});

test('12.1 payload hash is deterministic and content-minimized',async()=>{
  const a=parseFoundationRequest({workspaceId:W,requestId:R,operation:'capabilities'});
  const b=parseFoundationRequest({workspaceId:W,requestId:'33333333-3333-4333-8333-333333333333',operation:'capabilities'});
  const c=parseFoundationRequest({workspaceId:W,requestId:R,operation:'provider_probe'});
  assert.equal(await foundationPayloadHash(a),await foundationPayloadHash(b));
  assert.notEqual(await foundationPayloadHash(a),await foundationPayloadHash(c));
  assert.match(await foundationPayloadHash(a),/^[0-9a-f]{64}$/);
});

test('12.1 capabilities expose no provider/tool/write authority',()=>{
  const x=capabilitiesResult();
  assert.equal(x.providerConfigured,false);
  assert.equal(x.providerBackedAssistance,false);
  assert.equal(x.toolExecution,false);
  assert.equal(x.businessMutation,false);
  assert.equal(x.rateLimit.newRequestsPerMinute,20);
  assert.deepEqual(x.tracePolicy,{rawPromptStored:false,rawModelOutputStored:false,secretsStored:false});
});

test('12.1 envelopes are versioned and provider unavailable is structured',()=>{
  const ok=successEnvelope(R,'33333333-3333-4333-8333-333333333333','capabilities',{});
  assert.equal(ok.schema,FOUNDATION_SCHEMA);
  assert.equal(ok.ok,true);
  const err=errorEnvelope(R,'33333333-3333-4333-8333-333333333333','provider_probe',safeError('PROVIDER_NOT_CONFIGURED'));
  assert.equal(err.ok,false);
  assert.equal(err.error.code,'PROVIDER_NOT_CONFIGURED');
  assert.equal(err.error.retryable,true);
});
