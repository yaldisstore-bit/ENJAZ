import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const state=json('docs/PHASE13_1_STATE.json');
const source=read('src/features/import/legacySnapshotReview.ts');
const tests=read('tests/phase13-1-legacy-snapshot-review.test.ts');
const kickoff=read('docs/PHASE13_1_A2_KICKOFF.md');
const workflow=read('.github/workflows/phase13-1-readonly-legacy-snapshot-intake.yml');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(['A2_QUARANTINE_REVIEW_MANIFEST','A3_DESTRUCTION_AND_CLOSURE_READINESS'].includes(state.currentSlice),'13.1 A2 lifecycle chain invalid');
if(state.currentSlice==='A2_QUARANTINE_REVIEW_MANIFEST') req(state.a2Status==='IN_PROGRESS','13.1 A2 lifecycle invalid');
if(state.currentSlice==='A3_DESTRUCTION_AND_CLOSURE_READINESS'){
  req(state.a2Status==='CERTIFIED'&&state.a2GateRunId===35395538307&&state.a2GateRunNumber===5&&state.a2GateHead==='b63ce1c5591d7ff9f54bb69efcabbe685cdef95f','A2 certificate drifted after successor transition');
}
req(state.a1Status==='CERTIFIED'&&state.a1GateRunId===35393731218&&state.a1GateRunNumber===3&&state.a1GateHead==='c3d6a12fdb2ce227568f0fbcb8ff79844368cc77','A1 certificate drifted');
req(state.a1TestCount===10&&state.a1PassCount===10&&state.a1FailCount===0,'A1 test certificate drifted');
req(state.a1FunctionalTestCount===219&&state.a1FunctionalPassCount===219&&state.a1DbSelftestCount===25&&state.a1DbSelftestPassCount===25,'A1 regression certificate drifted');
req(state.a1InitialJavascriptBytes===431032&&state.a1TotalJavascriptBytes===759568&&state.a1CssBytes===179989,'A1 budget certificate drifted');
req(state.reviewManifestSchema==='enjaz.legacy.snapshot.review.v1','A2 review schema drifted');
req(state.recognizedLegacyTypeAuthority==='EXPLICIT_CALLER_ALLOWLIST_EXACT_MATCH','A2 recognition authority drifted');
req(state.typeAliasInferenceAllowed===false&&state.typeNameNormalizationAllowed===false&&state.targetAuthorityAssignmentAllowed===false,'A2 must not infer aliases/normalize/assign targets');
req(state.mappingAllowed===false&&state.normalizationAllowed===false&&state.persistenceAllowed===false&&state.orderedImportAllowed===false,'A2 cannot gain mapping/persistence/import authority');if(state.status==='CLOSED')req(state.phase13_2Allowed===true&&state.successorStatus==='AUTHORIZED_NEXT','closed 13.1 successor authorization invalid');else req(state.phase13_2Allowed===false,'open 13.1 cannot authorize 13.2');

for(const marker of ['QUARANTINED_UNKNOWN','RECOGNIZED_FOR_REVIEW','targetSystem: null','targetEntity: null','mappingAllowed: false','targetAuthorityAssigned: false'])has(source,marker,'A2 source');
for(const marker of ['does not case-fold','whitespace-normalized','never assigns an ENJAZ target','duplicate record keys'])has(tests,marker,'A2 tests');
for(const marker of ['case folding','alias inference','targetSystem=null','Phase 13.2 remains LOCKED'])has(kickoff,marker,'A2 kickoff');
has(workflow,'Phase 13.1 A2 quarantine review audit','workflow');
has(workflow,'Phase 13.1 A2 quarantine review tests','workflow');

for(const forbidden of ['@supabase/','createClient','.from(','.rpc(','fetch(','.toLowerCase(','.normalize(']) {
  req(!source.includes(forbidden),`A2 source contains forbidden authority/inference: ${forbidden}`);
}
req(!/M1|M2|M3|M4|M5|M6|M7|M8|M9|M10|M11|M12|M13|M14|M15|M16|M17|M18/.test(source),'A2 source may not assign major-system targets');

if(errors.length){console.error(`ENJAZ PHASE 13.1 A2 AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log('ENJAZ PHASE 13.1 A2 AUDIT PASS — exact caller vocabulary only; unknown types quarantined; duplicate/dangling issues preserved; no target assignment/mapping/normalization/persistence/import authority; 13.2 locked.');
