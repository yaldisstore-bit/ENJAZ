import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCommunicationClientSafeProjection,
  canTreatTransportEvidenceAsCanonicalMessage,
  chooseAutomaticCommunicationLink,
  endpointAloneGrantsWorkspaceAuthority,
  manualRelinkIsAuthorized,
  outboundCommandDedupeKey,
  outboundDispatchAllowed,
  providerMessageDedupeKey,
  type CommunicationLinkCandidate,
} from '../src/features/communications/omnichannelAuthority.ts';

const W='11111111-1111-4111-8111-111111111111';
const W2='22222222-2222-4222-8222-222222222222';
const A='33333333-3333-4333-8333-333333333333';
const A2='44444444-4444-4444-8444-444444444444';
const C='55555555-5555-4555-8555-555555555555';
const P='66666666-6666-4666-8666-666666666666';
const T='77777777-7777-4777-8777-777777777777';

function candidate(overrides:Partial<CommunicationLinkCandidate>={}):CommunicationLinkCandidate{
  return {
    workspaceId:W,
    companyId:C,
    contactId:P,
    transactionId:T,
    source:'endpoint_map',
    deterministic:true,
    ...overrides,
  };
}

test('provider webhook retries resolve to one canonical dedupe identity',()=>{
  const identity={workspaceId:W,channel:'whatsapp' as const,providerAccountId:A,providerMessageId:'wamid.abc'};
  const first=providerMessageDedupeKey(identity);
  const retry=providerMessageDedupeKey(identity);
  assert.equal(first,retry);
  assert.ok(first?.includes('wamid.abc'));
});

test('provider dedupe identity is isolated by workspace channel and provider account',()=>{
  const base={workspaceId:W,channel:'email' as const,providerAccountId:A,providerMessageId:'provider-42'};
  const key=providerMessageDedupeKey(base);
  assert.notEqual(providerMessageDedupeKey({...base,workspaceId:W2}),key);
  assert.notEqual(providerMessageDedupeKey({...base,channel:'sms'}),key);
  assert.notEqual(providerMessageDedupeKey({...base,providerAccountId:A2}),key);
  assert.equal(providerMessageDedupeKey({...base,providerMessageId:'   '}),null);
});

test('outbound commands require explicit idempotency and provider account scope',()=>{
  const base={workspaceId:W,channel:'sms' as const,providerAccountId:A,idempotencyKey:'send-case-19-v1'};
  const key=outboundCommandDedupeKey(base);
  assert.equal(outboundCommandDedupeKey(base),key);
  assert.notEqual(outboundCommandDedupeKey({...base,providerAccountId:A2}),key);
  assert.equal(outboundCommandDedupeKey({...base,idempotencyKey:''}),null);
});

test('automatic matching accepts only deterministic non-conflicting same-workspace links',()=>{
  const link=chooseAutomaticCommunicationLink(W,[
    candidate({source:'endpoint_map'}),
    candidate({source:'provider_thread'}),
  ]);
  assert.deepEqual(link,{workspaceId:W,companyId:C,contactId:P,transactionId:T});
});

test('ambiguous deterministic matches fail closed into review instead of guessing',()=>{
  const link=chooseAutomaticCommunicationLink(W,[
    candidate(),
    candidate({contactId:'88888888-8888-4888-8888-888888888888'}),
  ]);
  assert.equal(link,null);
});

test('cross-workspace and non-deterministic candidates cannot auto-link',()=>{
  assert.equal(chooseAutomaticCommunicationLink(W,[candidate({workspaceId:W2})]),null);
  assert.equal(chooseAutomaticCommunicationLink(W,[candidate({deterministic:false})]),null);
  assert.deepEqual(
    chooseAutomaticCommunicationLink(W,[candidate({workspaceId:W2}),candidate()]),
    {workspaceId:W,companyId:C,contactId:P,transactionId:T},
  );
});

test('manual relink requires workspace trust exact workspace and optimistic version match',()=>{
  const base={actorWorkspaceId:W,communicationWorkspaceId:W,actorHasWorkspaceTrust:true,currentVersion:4,expectedVersion:4};
  assert.equal(manualRelinkIsAuthorized(base),true);
  assert.equal(manualRelinkIsAuthorized({...base,actorHasWorkspaceTrust:false}),false);
  assert.equal(manualRelinkIsAuthorized({...base,actorWorkspaceId:W2}),false);
  assert.equal(manualRelinkIsAuthorized({...base,expectedVersion:3}),false);
  assert.equal(manualRelinkIsAuthorized({...base,currentVersion:0,expectedVersion:0}),false);
});

test('outbound dispatch fails closed on missing or withdrawn consent',()=>{
  for(const consentStatus of ['unknown','withdrawn'] as const){
    assert.equal(outboundDispatchAllowed({channel:'whatsapp',consentStatus,approvalRequirement:'none',approvalStatus:'not_required'}),false);
  }
  assert.equal(outboundDispatchAllowed({channel:'email',consentStatus:'granted',approvalRequirement:'none',approvalStatus:'not_required'}),true);
});

test('sensitive outbound approval cannot be bypassed',()=>{
  assert.equal(outboundDispatchAllowed({channel:'email',consentStatus:'granted',approvalRequirement:'required',approvalStatus:'pending'}),false);
  assert.equal(outboundDispatchAllowed({channel:'email',consentStatus:'granted',approvalRequirement:'required',approvalStatus:'rejected'}),false);
  assert.equal(outboundDispatchAllowed({channel:'email',consentStatus:'granted',approvalRequirement:'required',approvalStatus:'approved'}),true);
});

test('transport evidence and endpoint identity never become business authority by themselves',()=>{
  assert.equal(canTreatTransportEvidenceAsCanonicalMessage(),false);
  assert.equal(endpointAloneGrantsWorkspaceAuthority(),false);
});

test('client projection rejects provider secrets raw payloads and internal matching evidence',()=>{
  assert.doesNotThrow(()=>assertCommunicationClientSafeProjection(['id','companyId','contactId','transactionId','channel','summary','occurredAt']));
  for(const field of ['providerAccessToken','providerRefreshToken','webhookSecret','signingSecret','rawWebhookPayload','rawProviderHeaders','serviceRoleKey','internalMatchEvidence','unknownField']){
    assert.throws(()=>assertCommunicationClientSafeProjection(['id',field]),/forbidden field/);
  }
});
