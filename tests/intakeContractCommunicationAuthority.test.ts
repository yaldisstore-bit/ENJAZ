import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTAKE_CONTRACT_COMMUNICATION_AUTHORITY,
  INTAKE_CONTRACT_COMMUNICATION_LAWS,
  assertGovernedIntakeContractBridge,
  clientDecisionMayFeedContractCommand,
  contractRenewalAttentionAllowed,
  intakeContractAuthorityDecision,
} from '../src/features/intake-contract-communication/intakeContractCommunicationAuthority.ts';

test('Phase 11.6 reuses M17, M16, M3, M4 and M10 authorities without shadow stores',()=>{
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_AUTHORITY.intakeSubmission,'intake_submissions');
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_AUTHORITY.contractRevision,'engagement_contract_revisions');
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_AUTHORITY.renewal,'renewals');
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_AUTHORITY.communication,'communications');
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_AUTHORITY.portalApprovalResponse,'client_portal_document_approval_responses');
});

test('public intake remains non-authoritative until governed review',()=>{
  const d=intakeContractAuthorityDecision('public_intake_submission');
  assert.equal(d.role,'non_authoritative_external_input');
  assert.equal(d.mayDirectlyMutateIntakeReviewTruth,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.publicIntakeMayBecomeAuthoritativeWithoutReview,false);
});

test('reviewed intake evidence cannot directly become contract truth',()=>{
  const d=intakeContractAuthorityDecision('reviewed_intake_submission');
  assert.equal(d.role,'reviewed_intake_evidence');
  assert.equal(d.mayDirectlyMutateIntakeReviewTruth,true);
  assert.equal(d.mayDirectlyMutateContractTruth,false);
});

test('client approval is evidence only and cannot mutate canonical contract state directly',()=>{
  const d=intakeContractAuthorityDecision('client_portal_approval_response');
  assert.equal(d.role,'client_decision_evidence');
  assert.equal(d.mayDirectlyMutateContractTruth,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.clientApprovalMayMutateContractTruthDirectly,false);
});

test('communications and notifications cannot become contract or renewal truth',()=>{
  assert.equal(intakeContractAuthorityDecision('communication').mayDirectlyMutateContractTruth,false);
  assert.equal(intakeContractAuthorityDecision('notification').role,'attention_projection_only');
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.communicationMayBecomeContractTruth,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.notificationMayBecomeCommunicationTruth,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.renewalReminderMayBecomeRenewalTruth,false);
});

test('browser writes are rejected outside the Phase 11.6 domain boundary',()=>{
  assert.throws(()=>assertGovernedIntakeContractBridge({
    boundary:'direct-browser-table-write',actorAuthenticated:true,workspaceAuthorized:true,
    sourceWorkspaceMatches:true,targetWorkspaceMatches:true,optimisticVersionMatched:true,
    retryable:false,idempotencyKeyPresent:false,action:'request_client_contract_approval',
  }),/GOVERNED_COMMAND_REQUIRED/);
});

test('governed bridge requires auth, workspace isolation, fresh version and retry idempotency',()=>{
  const ok={
    boundary:'phase11.6-domain-command' as const,actorAuthenticated:true,workspaceAuthorized:true,
    sourceWorkspaceMatches:true,targetWorkspaceMatches:true,optimisticVersionMatched:true,
    retryable:true,idempotencyKeyPresent:true,action:'record_client_contract_decision' as const,
  };
  assert.doesNotThrow(()=>assertGovernedIntakeContractBridge(ok));
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,actorAuthenticated:false}),/AUTH_REQUIRED/);
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,workspaceAuthorized:false}),/WORKSPACE_FORBIDDEN/);
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,sourceWorkspaceMatches:false}),/CROSS_WORKSPACE_REFERENCE/);
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,targetWorkspaceMatches:false}),/CROSS_WORKSPACE_REFERENCE/);
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,optimisticVersionMatched:false}),/STALE_VERSION/);
  assert.throws(()=>assertGovernedIntakeContractBridge({...ok,idempotencyKeyPresent:false}),/IDEMPOTENCY_REQUIRED/);
});

test('contract renewal attention is derived only from an effective canonical contract with an existing renewal authority',()=>{
  assert.equal(contractRenewalAttentionAllowed({contractStatus:'effective',effectiveOn:'2026-09-01',expiresOn:'2027-09-01',existingRenewalId:'r1'}),true);
  assert.equal(contractRenewalAttentionAllowed({contractStatus:'signed',effectiveOn:'2026-09-01',expiresOn:'2027-09-01',existingRenewalId:'r1'}),false);
  assert.equal(contractRenewalAttentionAllowed({contractStatus:'effective',effectiveOn:'2026-09-01',expiresOn:'2027-09-01',existingRenewalId:null}),false);
  assert.throws(()=>contractRenewalAttentionAllowed({contractStatus:'effective',effectiveOn:'2027-09-01',expiresOn:'2026-09-01',existingRenewalId:'r1'}),/DATE_RANGE_INVALID/);
});

test('client decision can feed a contract command only through the existing approval permission and canonical artifact binding',()=>{
  assert.equal(clientDecisionMayFeedContractCommand({requestType:'approval',requiredPermission:'approve_document',responseDecision:'approved',targetWorkspaceMatches:true,targetIsCanonicalContractArtifact:true}),true);
  assert.equal(clientDecisionMayFeedContractCommand({requestType:'information',requiredPermission:'message',responseDecision:'approved',targetWorkspaceMatches:true,targetIsCanonicalContractArtifact:true}),false);
  assert.equal(clientDecisionMayFeedContractCommand({requestType:'approval',requiredPermission:'approve_document',responseDecision:'approved',targetWorkspaceMatches:false,targetIsCanonicalContractArtifact:true}),false);
  assert.equal(clientDecisionMayFeedContractCommand({requestType:'approval',requiredPermission:'approve_document',responseDecision:'approved',targetWorkspaceMatches:true,targetIsCanonicalContractArtifact:false}),false);
});

test('forbidden inference and shadow-authority laws stay fail closed',()=>{
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.intakeFollowupMayCreateShadowSubmission,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.contractReminderMayCreateShadowRenewal,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.contractCommunicationMayBypassPortalOrCommunicationAuthority,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.crossWorkspaceReferencesAllowed,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.expiredOrRevokedIntakeLinkMayBeResurrected,false);
  assert.equal(INTAKE_CONTRACT_COMMUNICATION_LAWS.terminalContractRevisionMayBeSilentlyReopened,false);
});
