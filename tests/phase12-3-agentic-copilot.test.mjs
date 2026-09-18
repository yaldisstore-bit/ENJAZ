import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const state=JSON.parse(fs.readFileSync('docs/PHASE12_3_STATE.json','utf8'));
const predecessor=JSON.parse(fs.readFileSync('docs/PHASE12_2_STATE.json','utf8'));
const kickoff=fs.readFileSync('docs/PHASE12_3_KICKOFF.md','utf8');

test('12.3 starts only from final certified 12.2 closure',()=>{
  assert.equal(predecessor.status,'CLOSED');
  assert.equal(predecessor.closureDecision,'PASS');
  assert.equal(predecessor.phase12_3Allowed,true);
  assert.equal(state.baseCommit,'00470d129693fdf1362becbc7d95f54560f79481');
  assert.equal(state.predecessorClosureMergeCommit,state.baseCommit);
});

test('12.3 A1/A2/A3-A/A3-B/A3-C/A3-D certification is preserved while A3-E adds document draft only',()=>{
  assert.equal(state.status,'IN_PROGRESS');
  assert.equal(state.slice,'A3E_DOCUMENT_DRAFT_ACTION');
  assert.equal(state.a2Certification,'PASS_APPROVAL_BINDING_REAL_CLOUD');
  assert.equal(state.a2FinalSourceGateVerification,'PASS');
  assert.equal(state.a2FinalRealCloudVerification,'PASS');
  assert.equal(state.a1Certification,'PASS_PLAN_PROPOSAL_CONTRACT');
  assert.equal(state.a1SourceGateVerification,'PASS');
  assert.equal(state.a1SourceGateHead,'a03379be95d702f1f8613f054d2e77d1c67a26b1');
  assert.equal(state.successorPhase,'12.4');
  assert.equal(state.successorStatus,'LOCKED');
  assert.equal(state.phase12_4Allowed,false);
  assert.deepEqual(state.openingOperations,['plan','propose']);
  assert.equal(state.executeOperationAllowed,false);
  assert.equal(state.genericExecuteOperationAllowed,false);
  assert.equal(state.sensitiveMutationExecutionAllowed,false);
  assert.equal(state.lowRiskMutationExecutionAllowed,true);
  assert.equal(state.actionSpecificExecutionAllowed,true);
  assert.equal(state.a3Certification,'PASS_FOLLOWUP_SNOOZE_REAL_CLOUD');
  assert.equal(state.a3CertificationCommitSourceGateVerification,'PASS');
  assert.equal(state.a3CertificationCommitRealCloudVerification,'PASS');
  assert.equal(state.a3BCertification,'PASS_FOLLOWUP_CREATE_REAL_CLOUD');
  assert.equal(state.a3BCertificationStatus,'CERTIFIED');
  assert.equal(state.a3CCertification,'PASS_SELF_REMINDER_REAL_CLOUD');
  assert.equal(state.a3CCertificationStatus,'CERTIFIED');
  assert.deepEqual(state.authorizedActionAdapters,['followup.snooze','followup.create','reminder.schedule','document.request','document.draft']);
  assert.deepEqual(state.actionExecutionDomainAuthorities,['mutate_transaction_followup_state_v1','create_transaction_followup_v1','dispatch_scheduling_attention_v1','save_client_portal_request_v1','generate_document_draft_v1']);
  assert.equal(state.a3CRecipientScope,'SELF_ONLY');
  assert.equal(state.a3CMode,'REMINDER_ONLY');
  assert.equal(state.a3CFollowupSideEffectAllowed,false);
  assert.equal(state.a3DRequestType,'DOCUMENT_ONLY');
  assert.equal(state.a3DResourceShareAllowed,false);
  assert.equal(state.a3DExistingRequestUpdateAllowed,false);
  assert.equal(state.a3DReadAuthority,'get_client_portal_admin_authority_v1');
  assert.equal(state.a3DExecutionAuthority,'save_client_portal_request_v1');
  assert.equal(state.a3DCertification,'PASS_DOCUMENT_REQUEST_REAL_CLOUD');
  assert.equal(state.a3DCertificationStatus,'CERTIFIED');
  assert.equal(state.a3DSourceGateVerification,'PASS');
  assert.equal(state.a3DRealCloudVerification,'PASS');
  assert.equal(state.a3DRealCloudChecks,44);
  assert.equal(state.a3DRealCloudZeroResidue,true);
  assert.equal(state.a3EOutputStatus,'REVIEW_REQUIRED_ONLY');
  assert.equal(state.a3EContactInputAllowed,false);
  assert.equal(state.a3EOcrInputAllowed,false);
  assert.equal(state.a3EReviewAllowed,false);
  assert.equal(state.a3ERenderAllowed,false);
  assert.equal(state.a3EFinalizeAllowed,false);
  assert.equal(state.a3EReadAuthority,'get_document_factory_v1');
  assert.equal(state.a3EExecutionAuthority,'generate_document_draft_v1');
  assert.equal(state.directBusinessTableWritesAllowed,false);
  assert.equal(state.genericWriteToolAllowed,false);
  assert.equal(state.clientUiAdded,false);
  assert.match(kickoff,/Phase 12\.4 — Regulatory Knowledge Assistance — M8 remains LOCKED/);
});

test('12.3 future execution controls are mandatory before any write slice',()=>{
  for(const key of ['explicitApprovalRequired','approvalBindingRequired','approvalExpiryRequired','approvalReplayProtectionRequired','domainValidationRequired','rlsRequired']){
    assert.equal(state[key],true,key);
  }
  assert.equal(state.serviceRoleBusinessReadsAllowed,false);
  assert.equal(state.browserToolExecutionAllowed,false);
  assert.equal(state.browserProviderCallsAllowed,false);
  assert.equal(state.rawGoalPersistenceAllowed,false);
  assert.equal(state.rawPlanPersistenceAllowed,false);
});
