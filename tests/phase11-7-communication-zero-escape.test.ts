import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientPortalAccessIndex,
  canViewTransaction,
  canPerformChildAction,
  clientPortalDomainIsAlwaysForbidden,
} from '../src/features/client-portal/clientPortalAuthority.ts';
import {
  providerMessageDedupeKey,
  outboundCommandDedupeKey,
  manualRelinkIsAuthorized,
  outboundDispatchAllowed,
  canTreatTransportEvidenceAsCanonicalMessage,
  endpointAloneGrantsWorkspaceAuthority,
} from '../src/features/communications/omnichannelAuthority.ts';
import {
  SCHEDULING_LAWS,
  assertGovernedSchedulingMutation,
  workflowDeadlineMayBeGenerated,
} from '../src/features/scheduling/schedulingAuthority.ts';
import {
  INTAKE_CONTRACT_COMMUNICATION_LAWS,
  assertGovernedIntakeContractBridge,
  contractRenewalAttentionAllowed,
} from '../src/features/intake-contract-communication/intakeContractCommunicationAuthority.ts';

test('11.7 large counts remain deterministic',()=>{
  const principal={id:'p1',workspaceId:'w1',userId:'u1',contactId:null,status:'active' as const,activatedAt:'2026-01-01T00:00:00Z',revokedAt:null};
  const grants=Array.from({length:2000},(_,i)=>({id:`g${i}`,workspaceId:'w1',principalId:'p1',targetType:'transaction' as const,targetId:`t${i}`,permissions:['view'] as const,validFrom:null,validUntil:null,revokedAt:null}));
  const index=buildClientPortalAccessIndex(principal,grants,new Date('2026-09-18T00:00:00Z'));
  assert.equal(index.transactionIds.size,2000);
  assert.equal(canViewTransaction(index,'w1','t1999'),true);
  assert.equal(canViewTransaction(index,'w2','t1999'),false);
});

test('11.7 stale targets fail closed',()=>{
  assert.equal(manualRelinkIsAuthorized({actorWorkspaceId:'w1',communicationWorkspaceId:'w1',actorHasWorkspaceTrust:true,currentVersion:9,expectedVersion:8}),false);
  assert.throws(()=>assertGovernedSchedulingMutation({boundary:'m10-domain-command',actorAuthenticated:true,workspaceAuthorized:true,optimisticVersionMatched:false,terminalFact:false,action:'reschedule'}),/ENJAZ_SCHEDULING_STALE_VERSION/);
  assert.throws(()=>assertGovernedIntakeContractBridge({boundary:'phase11.6-domain-command',actorAuthenticated:true,workspaceAuthorized:true,sourceWorkspaceMatches:true,targetWorkspaceMatches:true,optimisticVersionMatched:false,retryable:false,idempotencyKeyPresent:false,action:'record_client_contract_decision'}),/ENJAZ_116_STALE_VERSION/);
});

test('11.7 duplicate events remain idempotent',()=>{
  const identity={workspaceId:'w1',channel:'email' as const,providerAccountId:'a1',providerMessageId:'m1'};
  assert.equal(providerMessageDedupeKey(identity),providerMessageDedupeKey({...identity}));
  assert.notEqual(providerMessageDedupeKey(identity),providerMessageDedupeKey({...identity,providerMessageId:'m2'}));
  const cmd={workspaceId:'w1',channel:'sms' as const,providerAccountId:'a1',idempotencyKey:'same-operation'};
  assert.equal(outboundCommandDedupeKey(cmd),outboundCommandDedupeKey({...cmd}));
  assert.throws(()=>assertGovernedIntakeContractBridge({boundary:'phase11.6-domain-command',actorAuthenticated:true,workspaceAuthorized:true,sourceWorkspaceMatches:true,targetWorkspaceMatches:true,optimisticVersionMatched:true,retryable:true,idempotencyKeyPresent:false,action:'request_missing_intake_information'}),/ENJAZ_116_IDEMPOTENCY_REQUIRED/);
});

test('11.7 revoked links cannot resurrect access',()=>{
  const principal={id:'p1',workspaceId:'w1',userId:'u1',contactId:null,status:'revoked' as const,activatedAt:'2026-01-01T00:00:00Z',revokedAt:'2026-09-01T00:00:00Z'};
  const grants=[{id:'g1',workspaceId:'w1',principalId:'p1',targetType:'transaction' as const,targetId:'t1',permissions:['view'] as const,validFrom:null,validUntil:null,revokedAt:null}];
  const index=buildClientPortalAccessIndex(principal,grants,new Date('2026-09-18T00:00:00Z'));
  assert.equal(index.active,false);
  assert.equal(canViewTransaction(index,'w1','t1'),false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.expiredOrRevokedIntakeLinkMayBeResurrected,false);
});

test('11.7 unauthorized portal access is denied',()=>{
  const principal={id:'p1',workspaceId:'w1',userId:'u1',contactId:null,status:'active' as const,activatedAt:'2026-01-01T00:00:00Z',revokedAt:null};
  const grants=[{id:'g1',workspaceId:'w1',principalId:'p1',targetType:'transaction' as const,targetId:'t1',permissions:['view','message'] as const,validFrom:null,validUntil:null,revokedAt:null}];
  const index=buildClientPortalAccessIndex(principal,grants,new Date('2026-09-18T00:00:00Z'));
  assert.equal(canViewTransaction(index,'w2','t1'),false);
  assert.equal(clientPortalDomainIsAlwaysForbidden('risk_signals'),true);
  assert.equal(canPerformChildAction(index,{kind:'message',workspaceId:'w1',transactionId:'t1',clientVisible:true,staffOnly:true},'message'),false);
});

test('11.7 delivery failure cannot become canonical success',()=>{
  assert.equal(outboundDispatchAllowed({channel:'email',consentStatus:'unknown',approvalRequirement:'none',approvalStatus:'not_required'}),false);
  assert.equal(outboundDispatchAllowed({channel:'whatsapp',consentStatus:'withdrawn',approvalRequirement:'required',approvalStatus:'approved'}),false);
  assert.equal(canTreatTransportEvidenceAsCanonicalMessage(),false);
  assert.equal(endpointAloneGrantsWorkspaceAuthority(),false);
});

test('11.7 workspace timezone remains authoritative',()=>{
  assert.equal(SCHEDULING_LAWS.deviceTimezoneMayBecomeBusinessScheduleAuthority,false);
  assert.equal(workflowDeadlineMayBeGenerated({dueOffsetDays:0,stageAnchorObserved:true,workspaceTimezone:null}),false);
  assert.equal(workflowDeadlineMayBeGenerated({dueOffsetDays:0,stageAnchorObserved:true,workspaceTimezone:'Asia/Baghdad'}),true);
});

test('11.7 archived and terminal relations cannot resurrect truth',()=>{
  assert.equal(SCHEDULING_LAWS.terminalFactSilentResurrectionAllowed,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.terminalContractRevisionMayBeSilentlyReopened,false);
  assert.equal(contractRenewalAttentionAllowed({contractStatus:'expired',effectiveOn:'2026-01-01',expiresOn:'2026-09-01',existingRenewalId:'r1'}),false);
});
