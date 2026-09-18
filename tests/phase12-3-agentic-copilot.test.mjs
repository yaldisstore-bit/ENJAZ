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

test('12.3 A1 locks 12.4 and all execution authority',()=>{
  assert.equal(state.status,'IN_PROGRESS');
  assert.equal(state.slice,'A1_PLAN_PROPOSAL_CONTRACT');
  assert.equal(state.successorPhase,'12.4');
  assert.equal(state.successorStatus,'LOCKED');
  assert.equal(state.phase12_4Allowed,false);
  assert.deepEqual(state.openingOperations,['plan','propose']);
  assert.equal(state.executeOperationAllowed,false);
  assert.equal(state.sensitiveMutationExecutionAllowed,false);
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
