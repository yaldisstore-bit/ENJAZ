import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA} from '../src/features/import/legacyMappingContract.ts';
import {LEGACY_ORDERED_IMPORT_PLAN_SCHEMA,buildLegacyOrderedImportPlan} from '../src/features/import/legacyOrderedImportContract.ts';

const state=JSON.parse(fs.readFileSync('docs/PHASE13_3_STATE.json','utf8'));
const snapshot=():any=>({
 schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'legacy-13-3-a1',source:{system:'legacy-office-app',exportId:'ordered-a1'},capturedAt:'2026-09-19T01:00:00Z',
 records:[
  {type:'company',id:'c1',fields:{name:'شركة أ'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
  {type:'person',id:'p1',fields:{name:'أحمد'},links:[]},
  {type:'transaction',id:'t1',fields:{type:'تعديل عقد'},links:[{kind:'company',targetType:'company',targetId:'c1'},{kind:'contact',targetType:'person',targetId:'p1'}]},
 ]
});
const mappingPlan=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'map-13-3-a1',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'}]},
],relationshipMappings:[
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
 {sourceLegacyType:'transaction',linkKind:'contact',targetLegacyType:'person',targetField:'primary_contact_id'},
]});

test('13.3 starts from exact final 13.2 closure and keeps 13.4 locked',()=>{
 assert.equal(state.baseCommit,'501f5eaad31ba13b3e81d8acd28add4a631ac6bd');assert.equal(state.predecessorPhase,'13.2');assert.equal(state.predecessorStatus,'CLOSED');assert.equal(state.predecessorClosureDecision,'PASS');
 assert.equal(state.successorPhase,'13.4');assert.equal(state.successorStatus,'LOCKED');assert.equal(state.phase13_4Allowed,false);
 assert.equal(state.orderedImportPlanningAllowed,true);const certified=state.a3Status==='CERTIFIED';assert.equal(state.orderedImportExecutionAllowed,certified);assert.equal(state.databaseWritesAllowed,certified);assert.equal(state.targetEnjazMutationAllowed,certified);assert.equal(state.newDatabaseTablesAllowed,false);assert.equal(state.generatedTargetIdsAllowed,false);
});

test('A1 produces deterministic contacts then companies then transactions order',()=>{
 const p=buildLegacyOrderedImportPlan(snapshot(),mappingPlan());
 assert.equal(p.schema,LEGACY_ORDERED_IMPORT_PLAN_SCHEMA);
 assert.deepEqual(p.stageOrder,['contacts','companies','transactions']);
 assert.deepEqual(p.items.map(x=>[x.ordinal,x.stage,x.sourceKey,x.targetTable]),[
  [1,1,'person:p1','contacts'],[2,2,'company:c1','companies'],[3,3,'transaction:t1','transactions'],
 ]);
});

test('A1 relationship bindings remain symbolic and point only to earlier stages',()=>{
 const p=buildLegacyOrderedImportPlan(snapshot(),mappingPlan());
 assert.equal(p.relationshipBindings.length,3);
 assert.ok(p.relationshipBindings.every(x=>x.assignmentPerformed===false&&x.generatedTargetId===null&&x.writeAllowed===false));
 const stage=new Map(p.items.map(x=>[x.sourceKey,x.stage] as const));
 for(const rel of p.relationshipBindings)assert.ok((stage.get(rel.targetKey)??99)<(stage.get(rel.sourceKey)??0));
});

test('A1 never executes import, assigns IDs/FKs or persists',()=>{
 const p=buildLegacyOrderedImportPlan(snapshot(),mappingPlan());
 assert.equal(p.readOnlyPlan,true);assert.equal(p.persistencePerformed,false);assert.equal(p.importExecutionAllowed,false);
 assert.equal(p.targetMutationPerformed,false);assert.equal(p.idGenerationPerformed,false);assert.equal(p.foreignKeyAssignmentPerformed,false);assert.equal(p.idempotencyBindingPerformed,false);
 assert.equal(p.eligibleForA2Binding,true);
});

test('A1 fails closed on an unmapped legacy type',()=>{
 const v=snapshot();v.records.push({type:'mystery',id:'x1',fields:{name:'?'},links:[]});
 assert.throws(()=>buildLegacyOrderedImportPlan(v,mappingPlan()),/LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES/);
});

test('A1 fails closed on duplicate legacy keys',()=>{
 const v=snapshot();v.records.push({type:'person',id:'p1',fields:{name:'نسخة'},links:[]});
 assert.throws(()=>buildLegacyOrderedImportPlan(v,mappingPlan()),/LEGACY_ORDERED_IMPORT_DUPLICATE_KEYS/);
});

test('A1 fails closed on dangling links',()=>{
 const v=snapshot();v.records[0]!.links[0]!.targetId='missing';
 assert.throws(()=>buildLegacyOrderedImportPlan(v,mappingPlan()),/LEGACY_ORDERED_IMPORT_DANGLING_LINKS/);
});

test('A1 fails closed on undeclared relationship vocabulary',()=>{
 const v=snapshot();v.records[2]!.links[0]!.kind='Company';
 assert.throws(()=>buildLegacyOrderedImportPlan(v,mappingPlan()),/LEGACY_ORDERED_IMPORT_UNMAPPED_RELATIONSHIPS/);
});

test('A1 inherits 13.2 hidden-control and authority-field rejection',()=>{
 const bad=mappingPlan();bad.typeMappings[0].fieldMappings[0].targetField='workspace_id';
 assert.throws(()=>buildLegacyOrderedImportPlan(snapshot(),bad),/LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN/);
 const hidden=mappingPlan();hidden.execute=true;
 assert.throws(()=>buildLegacyOrderedImportPlan(snapshot(),hidden),/LEGACY_MAPPING_PLAN_FIELD_FORBIDDEN/);
});

test('A1 replay is byte-for-byte deterministic for equivalent input',()=>{
 const a=JSON.stringify(buildLegacyOrderedImportPlan(snapshot(),mappingPlan()));
 const b=JSON.stringify(buildLegacyOrderedImportPlan(snapshot(),mappingPlan()));
 assert.equal(a,b);
});

test('A1 does not mutate snapshot or Phase 13.2 mapping plan',()=>{
 const s=snapshot(),m=mappingPlan(),beforeS=JSON.stringify(s),beforeM=JSON.stringify(m);
 buildLegacyOrderedImportPlan(s,m);
 assert.equal(JSON.stringify(s),beforeS);assert.equal(JSON.stringify(m),beforeM);
});
