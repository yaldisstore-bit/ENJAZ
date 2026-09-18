import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const state=json('docs/PHASE13_1_STATE.json');
const contract=read('src/features/import/legacySnapshotContract.ts');
const review=read('src/features/import/legacySnapshotReview.ts');
const tests=read('tests/phase13-1-legacy-snapshot-destruction.test.ts');
const workflow=read('.github/workflows/phase13-1-readonly-legacy-snapshot-intake.yml');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(state.currentSlice==='A3_DESTRUCTION_AND_CLOSURE_READINESS'&&['IN_PROGRESS','CERTIFIED'].includes(state.a3Status),'13.1 A3 lifecycle invalid');
req(state.a3Mode==='DESTRUCTION_AND_CLOSURE_READINESS_ONLY'&&state.a3NewFeatureAuthorityAllowed===false,'A3 may not add feature authority');
if(state.a3Status==='CERTIFIED'){
  req(state.a3GateRunId===35395953023&&state.a3GateRunNumber===10&&state.a3GateHead==='95de7aa74272c7bb9278e7385ae8ed695527dd13','A3 source-gate lineage drifted');
  req(state.a3TestCount===13&&state.a3PassCount===13&&state.a3FailCount===0,'A3 destruction test certificate drifted');
  req(state.a3FunctionalTestCount===219&&state.a3FunctionalPassCount===219&&state.a3DbSelftestCount===25&&state.a3DbSelftestPassCount===25,'A3 regression certificate drifted');
  req(state.a3InitialJavascriptBytes===431032&&state.a3TotalJavascriptBytes===759568&&state.a3CssBytes===179989,'A3 budget certificate drifted');
  req(state.sourceGateVerification==='PASS_A1_A2_A3'&&state.implementationPrReady===true&&state.pullRequestGate==='PENDING','A3 certified state must be PR-ready only');
}
req(state.a2Status==='CERTIFIED'&&state.a2GateRunId===35395538307&&state.a2GateRunNumber===5&&state.a2GateHead==='b63ce1c5591d7ff9f54bb69efcabbe685cdef95f','A2 certificate drifted');
req(state.a2TestCount===10&&state.a2PassCount===10&&state.a2FailCount===0,'A2 tests drifted');
req(state.a2FunctionalTestCount===219&&state.a2FunctionalPassCount===219&&state.a2DbSelftestCount===25&&state.a2DbSelftestPassCount===25,'A2 regression certificate drifted');
req(state.a2InitialJavascriptBytes===431032&&state.a2TotalJavascriptBytes===759568&&state.a2CssBytes===179989,'A2 budget certificate drifted');
req(state.utf8ByteAccountingRequired===true&&state.deterministicReplayRequired===true&&state.mutationTrapVerificationRequired===true,'A3 hardening requirements drifted');
req(state.phase13_2Allowed===false&&state.successorStatus==='LOCKED'&&state.exitGatePassed===false&&state.closureDecision==='PENDING','A3 cannot close 13.1 or unlock 13.2');

for(const marker of ['TextEncoder','utf8ByteLength','LEGACY_SNAPSHOT_RECORD_TOO_LARGE','LEGACY_SNAPSHOT_TOO_LARGE'])has(contract,marker,'contract');
for(const marker of ['QUARANTINED_UNKNOWN','targetSystem:null','mappingAllowed:false'])has(review,marker,'review');
for(const marker of ['5001 records','UTF-8 bytes','duplicate storms','dangling-link storms','replay is deterministic','never mutate'])has(tests,marker,'A3 tests');
has(workflow,'Phase 13.1 A3 destruction audit','workflow');
has(workflow,'Phase 13.1 A3 destruction tests','workflow');

for(const source of [contract,review]){
  req(!/@supabase\/supabase-js|createClient|\.from\(|\.rpc\(|fetch\(/.test(source),'A3 source boundary gained external/write authority');
}
req(state.mappingAllowed===false&&state.normalizationAllowed===false&&state.persistenceAllowed===false&&state.targetEnjazMutationAllowed===false,'A3 authority escaped');
req(state.newDatabaseTablesAllowed===false&&state.newWriteRpcAuthorityAllowed===false&&state.edgeFunctionAdded===false&&state.clientUiAdded===false,'A3 infrastructure/UI delta forbidden');

if(errors.length){console.error(`ENJAZ PHASE 13.1 A3 AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log('ENJAZ PHASE 13.1 A3 AUDIT PASS — UTF-8 byte ceilings + adversarial size/depth/duplicate/dangling/replay/mutation attacks governed; no new feature/write/mapping/import/UI authority; 13.2 locked.');
