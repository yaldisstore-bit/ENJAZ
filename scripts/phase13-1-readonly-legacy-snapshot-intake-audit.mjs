import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(new URL(p,root));
const state=json('docs/PHASE13_1_STATE.json');
const kickoff=read('docs/PHASE13_1_KICKOFF.md');
const predecessor=json('docs/PHASE12_5_STATE.json');
const predecessorClosure=read('docs/PHASE12_5_CLOSURE.md');
const contract=read('src/features/import/legacySnapshotContract.ts');
const tests=read('tests/phase13-1-legacy-snapshot-intake.test.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');
const readme=read('README.md');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);

req(predecessor.status==='CLOSED'&&predecessor.closureDecision==='PASS'&&predecessor.exitGatePassed===true,'12.5 predecessor not formally closed');
req(predecessorClosure.includes('Phase 13.1 — Read-only Legacy Snapshot Intake is now AUTHORIZED_NEXT'),'12.5 closure does not authorize 13.1');
req(state.phase==='13.1'&&state.name==='Read-only Legacy Snapshot Intake'&&state.status==='IN_PROGRESS','13.1 lifecycle identity invalid');
req(state.baseCommit==='a7a17d6309e43cff68968be33deecbdac57ed4ed','13.1 must start from exact final 12.5 closure merge');
req(state.predecessorPhase==='12.5'&&state.predecessorClosureMergeCommit===state.baseCommit,'13.1 predecessor lineage drifted');
req(state.mode==='READ_ONLY_LEGACY_SNAPSHOT_INTAKE','13.1 mode drifted');
req(state.successorPhase==='13.2'&&state.successorStatus==='LOCKED'&&state.phase13_2Allowed===false,'13.2 must remain locked while 13.1 is open');
for(const key of ['persistenceAllowed','databaseWritesAllowed','newDatabaseTablesAllowed','newWriteRpcAuthorityAllowed','edgeFunctionAdded','clientUiAdded','mappingAllowed','normalizationAllowed','orderedImportAllowed','targetEnjazMutationAllowed','unknownConceptAutoMappingAllowed']) req(state[key]===false,`${key} must remain false`);
req(state.readOnly===true&&state.quarantineUnknownConceptsRequired===true&&state.sourceSnapshotAuthoritative===false,'13.1 read-only/quarantine authority drifted');
req(state.snapshotSchema==='enjaz.legacy.snapshot.intake.v1'&&state.inventorySchema==='enjaz.legacy.snapshot.inventory.v1','13.1 schema drifted');
req(state.maxSnapshotBytes===8388608&&state.maxRecords===5000&&state.maxRecordBytes===131072,'13.1 safety bounds drifted');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'frozen budgets drifted');
req(state.exitGatePassed===false&&state.closureDecision==='PENDING','13.1 cannot close from A1 source contract');
for(const key of ['knownCriticalDefects','knownHighDefects','knownFunctionalBlockers'])req(state[key]===0,`${key} must remain zero known defects`);

for(const marker of ['read-only evidence','does **not** own normalization','No unknown concept may be guessed','Duplicate records and dangling links','Phase 13.2 — Normalize & Map remains LOCKED'])has(kickoff,marker,'kickoff');
for(const marker of ["LEGACY_SNAPSHOT_SCHEMA='enjaz.legacy.snapshot.intake.v1'","mappingPerformed: false","normalizationPerformed: false","persistencePerformed: false","writePlanGenerated: false","LEGACY_SNAPSHOT_FIELD_FORBIDDEN","LEGACY_SNAPSHOT_RECORD_FIELD_FORBIDDEN","duplicateRecordKeys","danglingLinks"])has(contract,marker,'contract');
for(const marker of ['duplicate ids are quarantined','dangling links are reviewable','rejects unknown envelope control fields','rejects unknown record control fields'])has(tests,marker,'tests');

req(!/@supabase\/supabase-js|createClient|\.from\(|\.rpc\(|insert\s+into|update\s+public\.|delete\s+from/i.test(contract),'13.1 A1 contract gained persistence/database authority');
req(!/targetTable|targetSystem|enjazTable|mappedEntityId/.test(contract),'13.1 A1 contract embeds target mapping authority');
req(!fs.existsSync(new URL('database/migrations/phase_13_1_legacy_snapshot_intake.sql',root)),'13.1 A1 may not add a DB migration');
req(!fs.existsSync(new URL('supabase/functions/enjaz-legacy-intake',root)),'13.1 A1 may not add an Edge function');

has(roadmap,'## 13.1 — Read-only Legacy Snapshot Intake — IN_PROGRESS','roadmap');
has(roadmap,'Phase 13.2 — Normalize & Map remains **LOCKED**','roadmap');
has(readme,'Phase 13.1 — Read-only Legacy Snapshot Intake 🟡 IN PROGRESS / A1 READ-ONLY CONTRACT','README');

if(errors.length){console.error(`ENJAZ PHASE 13.1 A1 AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error('- '+e));process.exit(1)}
console.log('ENJAZ PHASE 13.1 A1 AUDIT PASS — snapshot intake is bounded/read-only; structural inventory only; no mapping/normalization/persistence/import authority; 13.2 locked.');
