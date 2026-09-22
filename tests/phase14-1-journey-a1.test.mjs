import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditJourneyMatrix, auditPhase14State, J14_IDS, N14_IDS, REQUIRED_GUARDS } from '../scripts/phase14-1-journey-a1-audit.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const matrix=JSON.parse(read('docs/PHASE14_1_JOURNEY_MATRIX.json'));
const state=JSON.parse(read('docs/PHASE14_1_STATE.json'));
const predecessor=JSON.parse(read('docs/PHASE13_5_STATE.json'));
const proof=read('docs/PHASE13_5_POSTMERGE_RECERTIFICATION.md');
const copy=v=>structuredClone(v);
const audit=v=>auditJourneyMatrix(v,read);
const phase=(s,p=predecessor,certificate=proof)=>auditPhase14State(s,p,certificate);

test('A1 11 actual gateway/source symbols and 14 adversarial obligations are present',()=>{
 assert.equal(J14_IDS.length,11);
 assert.equal(N14_IDS.length,14);
 assert.deepEqual(audit(matrix),[]);
 assert.deepEqual(phase(state),[]);
});

test('A1 source drift or a missing domain is rejected',()=>{
 const altered=copy(matrix);altered.journey[0].marker='export async function hypotheticalCompanySave(';
 assert.ok(audit(altered).includes('real_source_marker:J01_COMPANY'));
 const missing=copy(matrix);missing.journey.splice(2,1);
 assert.ok(audit(missing).includes('journey_coverage'));
 const duplicate=copy(matrix);duplicate.journey[1].id=duplicate.journey[0].id;
 assert.ok(audit(duplicate).includes('journey_unique'));
});

test('A1 source path traversal, unrelated domain and missing evidence are rejected',()=>{
 const changed=copy(matrix);changed.journey[3].source='../outside.ts';
 assert.ok(audit(changed).includes('source_location:J04_FIELD'));
 const unrelated=copy(matrix);unrelated.journey[5].domain='other';
 assert.ok(audit(unrelated).includes('source_domain:J06_PAYMENT'));
 const gaps=copy(matrix);gaps.journey[6].evidence=[];
 assert.ok(audit(gaps).includes('evidence:J07_DOCUMENT'));
});

test('A1 14 negative cases are unique, not optional',()=>{
 const changed=copy(matrix);changed.adversarialCases.pop();
 assert.ok(audit(changed).includes('negative_coverage'));
 const duplicate=copy(matrix);duplicate.adversarialCases[0].id=duplicate.adversarialCases[1].id;
 assert.ok(audit(duplicate).includes('negative_unique'));
 const empty=copy(matrix);empty.adversarialCases[7].expect='safe';
 assert.ok(audit(empty).includes('negative_contract:N08_CLIENT_PERMISSION'));
});

test('A1 cannot expand client budget, erase isolation, or remove mandatory certification',()=>{
 assert.equal(REQUIRED_GUARDS.length,6);
 const budget=copy(matrix);budget.maxClientBudgetIncreaseBytes=1;
 assert.ok(audit(budget).includes('no_new_authority'));
 const noGuards=copy(matrix);noGuards.forbidden.splice(0,1);
 assert.ok(audit(noGuards).includes('guard_coverage'));
 const fakeClosure=copy(matrix);fakeClosure.requiredCertification=['source tests pass'];
 assert.ok(audit(fakeClosure).includes('certification_coverage'));
});

test('A1 cannot infer predecessor closure from an unverified commit or missing proof',()=>{
 const wrong=copy(predecessor);wrong.formalClosureMergeCommit='unverified';
 assert.ok(phase(state,wrong).includes('certified_predecessor'));
 assert.ok(phase(state,predecessor,'missing certificate').includes('exact_predecessor_lock'));
 const pending=copy(predecessor);pending.formalClosurePostMergeRecertification='PENDING';
 assert.ok(phase(state,pending).includes('certified_predecessor'));
});

test('A1 cannot unlock Phase 14.2 or certify Real Cloud/Browser prematurely',()=>{
 const unlocked=copy(state);unlocked.phase14_2Allowed=true;
 assert.ok(phase(unlocked).includes('successor_locked'));
 const falseCert=copy(state);falseCert.a2RealCloudStatus='PASS';
 assert.ok(phase(falseCert).includes('a1_certified_a2_open'));
 const fakeClean=copy(state);fakeClean.knownHighDefects=0;
 assert.ok(phase(fakeClean).includes('no_premature_clean_bill'));
});

test('A1 cannot gain production destruction, generic write or shadow persistence authority',()=>{
 const changed=copy(state);changed.productionDestructiveTestingAllowed=true;
 assert.ok(phase(changed).includes('safety_invariants'));
 const newWrite=copy(state);newWrite.newGenericWriteRpcAuthorityAllowed=true;
 assert.ok(phase(newWrite).includes('safety_invariants'));
 const shadow=copy(state);shadow.shadowPersistenceAllowed=true;
 assert.ok(phase(shadow).includes('safety_invariants'));
});

test('A2 certified transition is evidence-bound and cannot silently certify Android or published portal',()=>{
 assert.deepEqual(phase(state),[]);
 const missing=copy(state);missing.a2LatestLinkedRun='unverified';
 assert.ok(phase(missing).includes('a1_certified_a2_open'));
 const short=copy(state);short.a2LatestLinkedCheckCount=129;
 assert.ok(phase(short).includes('a1_certified_a2_open'));
 const premature=copy(state);premature.a2N13RealElapsedJwtExpiryCertified=true;
 assert.ok(phase(premature).includes('a1_certified_a2_open'));
 const physical=copy(state);physical.a3RealBrowserPhysicalAndroidCertified=true;
 assert.ok(phase(physical).includes('a1_certified_a2_open'));
 const published=copy(state);published.a3RealBrowserPublishedPortalCertified=true;
 assert.ok(phase(published).includes('a1_certified_a2_open'));
 const noNegative=copy(state);noNegative.a2RemainingNegativeGates=['N13_AUTH_EXPIRY'];
 assert.ok(phase(noNegative).includes('a1_certified_a2_open'));
});

test('A2 hosted evidence cannot be mistaken for Phase 14.1 or 14.2 formal closure',()=>{
 const closed=copy(state);closed.status='CLOSED';
 assert.ok(phase(closed).includes('phase_identity'));
 const unlocked=copy(state);unlocked.phase14_2Allowed=true;
 assert.ok(phase(unlocked).includes('successor_locked'));
 const falseCert=copy(state);falseCert.a2RealCloudStatus='PASS';
 assert.ok(phase(falseCert).includes('a1_certified_a2_open'));
});
