import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const state=JSON.parse(fs.readFileSync('docs/PHASE12_2_STATE.json','utf8'));
const kickoff=fs.readFileSync('docs/PHASE12_2_KICKOFF.md','utf8');
const predecessor=JSON.parse(fs.readFileSync('docs/PHASE12_1_STATE.json','utf8'));

test('12.2 starts only from the certified 12.1 closure',()=>{
  assert.equal(predecessor.status,'CLOSED');
  assert.equal(predecessor.closureDecision,'PASS');
  assert.equal(predecessor.phase12_2Allowed,true);
  assert.equal(state.baseCommit,'47ac47ce131dec324f3a34f450a2e6bafd025b29');
  assert.equal(state.predecessorClosureMergeCommit,'47ac47ce131dec324f3a34f450a2e6bafd025b29');
});

test('12.2 lifecycle authorizes 12.3 only after formal closure',()=>{
  assert.equal(state.phase,'12.2');
  assert.equal(state.successorPhase,'12.3');
  assert.match(kickoff,/Phase 12\.3 — Agentic ENJAZ Copilot remains LOCKED/);
  if(state.status==='IN_PROGRESS'){
    assert.equal(state.successorStatus,'LOCKED');
    assert.equal(state.phase12_3Allowed,false);
    assert.equal(state.exitGatePassed,false);
    assert.equal(state.closureDecision,'PENDING');
  }else{
    assert.equal(state.status,'CLOSED');
    assert.equal(state.successorStatus,'AUTHORIZED_NEXT');
    assert.equal(state.phase12_3Allowed,true);
    assert.equal(state.exitGatePassed,true);
    assert.equal(state.closureDecision,'PASS');
    assert.equal(state.postMergeTotalWorkflowCount,40);
    assert.equal(state.postMergeTotalSuccessCount,40);
    assert.equal(state.finalTotalJavascriptBytes,759985);
  }
});

test('12.2 authority is read-only, cited and non-persistent',()=>{
  assert.deepEqual(state.contextualOperations,['search','summarize','compare','draft','explain']);
  assert.equal(state.authoritativeContextSource,'global_search_v1');
  assert.equal(state.businessMutationToolsAllowed,false);
  assert.equal(state.directBusinessTableWritesAllowed,false);
  assert.equal(state.serviceRoleBusinessReadsAllowed,false);
  assert.equal(state.rawPromptPersistenceAllowed,false);
  assert.equal(state.rawQueryPersistenceAllowed,false);
  assert.equal(state.rawModelOutputPersistenceAllowed,false);
  assert.equal(state.responsePersistenceAllowed,false);
  assert.equal(state.citationsRequired,true);
  assert.equal(state.provenanceRequired,true);
});

test('12.2 preserves frozen client ceilings while activating the lazy live UI without new CSS',()=>{
  assert.equal(state.javascriptBudgetBytes,670000);
  assert.equal(state.totalJavascriptBudgetBytes,760000);
  assert.equal(state.cssBudgetBytes,180000);
  assert.equal(state.budgetIncreaseAllowed,false);
  assert.equal(state.clientUiAdded,true);
  assert.ok(['LIVE_LAZY_PENDING_CERTIFICATION','LIVE_LAZY_CERTIFIED'].includes(state.clientUiStatus));
  assert.equal(state.clientUiRoute,'/app/copilot');
  assert.equal(state.newClientCssAdded,false);
});
