import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA,buildLegacyMappingPreview,parseLegacyMappingPlan} from '../src/features/import/legacyMappingContract.ts';

const snapshot=():any=>({schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'destroy-132',source:{system:'legacy',exportId:'a3'},capturedAt:'2026-09-19T01:00:00Z',records:[
 {type:'company',id:'c1',fields:{name:'شركة أ',capital:'100000000.50'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
 {type:'person',id:'p1',fields:{name:' أحمد '},links:[]},
 {type:'transaction',id:'t1',fields:{type:'معاملة',fee:'1250.25'},links:[{kind:'company',targetType:'company',targetId:'c1'}]},
]});
const plan=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'destroy-plan',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'},{sourceField:'capital',targetField:'capital',normalize:'strict_number'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'},{sourceField:'fee',targetField:'current_fee',normalize:'strict_number'}]},
],relationshipMappings:[
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
]});

test('A3 rejects integers beyond safe exact two-decimal boundary instead of rounding silently',()=>{
 const v=snapshot();v.records[0]!.fields.capital='9007199254740993';
 assert.throws(()=>buildLegacyMappingPreview(v,plan()),/LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE/);
});

test('A3 rejects more than two decimal places and exponent/comma ambiguity',()=>{
 for(const value of ['1.001','1e3','1,000',' 1000 ','+1000']){
  const v=snapshot();v.records[2]!.fields.fee=value;
  assert.throws(()=>buildLegacyMappingPreview(v,plan()),/LEGACY_MAPPING_NUMBER_INVALID/);
 }
});

test('A3 rejects unsafe numeric input values even when finite',()=>{
 const v=snapshot();v.records[0]!.fields.capital=Number.MAX_SAFE_INTEGER;
 assert.throws(()=>buildLegacyMappingPreview(v,plan()),/LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE/);
});

test('A3 preserves exact cent-safe decimals at boundary used by preview',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.equal(p.records.find(x=>x.sourceKey==='company:c1')?.normalizedFields?.capital,100000000.5);
 assert.equal(p.records.find(x=>x.sourceKey==='transaction:t1')?.normalizedFields?.current_fee,1250.25);
});

test('A3 hidden plan/type/field/relation control fields fail closed',()=>{
 for(const [level,mutate] of [
  ['plan',(p:any)=>p.shadow=true],
  ['type',(p:any)=>p.typeMappings[0].shadow=true],
  ['field',(p:any)=>p.typeMappings[0].fieldMappings[0].shadow=true],
  ['relation',(p:any)=>p.relationshipMappings[0].shadow=true],
 ] as const){
  const p=plan();mutate(p);assert.throws(()=>parseLegacyMappingPlan(p,snapshot()),/FORBIDDEN/,level);
 }
});

test('A3 mapping order cannot change deterministic preview semantics',()=>{
 const p1=plan(),p2=plan();p2.typeMappings.reverse();p2.relationshipMappings.reverse();
 assert.deepEqual(buildLegacyMappingPreview(snapshot(),p1),buildLegacyMappingPreview(snapshot(),p2));
});

test('A3 replay is deterministic and emits no write plan or generated authority',()=>{
 const v=snapshot(),m=plan(),a=buildLegacyMappingPreview(v,m),b=buildLegacyMappingPreview(v,m);
 assert.deepEqual(a,b);assert.equal(Object.hasOwn(a,'writePlan'),false);assert.equal(Object.hasOwn(a,'generatedIds'),false);
 assert.equal(a.targetAuthorityAssigned,false);assert.equal(a.foreignKeyAssignmentPerformed,false);assert.equal(a.idGenerationPerformed,false);
});

test('A3 duplicate source and target evidence cannot become resolved relationship authority',()=>{
 const v=snapshot();
 v.records.push({type:'company',id:'c1',fields:{name:'نسخة',capital:'1'},links:[]});
 v.records.push({type:'transaction',id:'t1',fields:{type:'نسخة',fee:'1'},links:[{kind:'company',targetType:'company',targetId:'c1'}]});
 const p=buildLegacyMappingPreview(v,plan());
 assert.ok(p.relationshipIntents.every(x=>x.disposition!=='RESOLVED_RELATIONSHIP_PREVIEW'));
 assert.ok(p.records.filter(x=>x.sourceKey==='transaction:t1').every(x=>x.reviewRequired));
});

test('A3 dangling relationship never synthesizes a target key',()=>{
 const v=snapshot();v.records[2]!.links[0]!.targetId='ghost';
 const p=buildLegacyMappingPreview(v,plan()),rel=p.relationshipIntents.find(x=>x.sourceKey==='transaction:t1');
 assert.equal(rel?.disposition,'QUARANTINED_DANGLING_TARGET');assert.equal(rel?.targetKey,'company:ghost');
 assert.equal(rel?.generatedTargetId,null);assert.equal(rel?.foreignKeyAssigned,false);
});

test('A3 unknown link kinds remain explicit review evidence instead of disappearing',()=>{
 const v=snapshot();v.records[2]!.links.push({kind:'mystery_relation',targetType:'company',targetId:'c1'});
 const p=buildLegacyMappingPreview(v,plan());
 assert.deepEqual(p.unmappedRelationshipLinks,[{sourceKey:'transaction:t1',kind:'mystery_relation',targetKey:'company:c1'}]);
 assert.equal(p.records.find(x=>x.sourceKey==='transaction:t1')?.reviewRequired,true);
});

test('A3 relationship cycles remain previews and cannot trigger recursion or mutation',()=>{
 const v=snapshot();
 v.records[0]!.links=[];v.records[2]!.links=[];
 v.records.push({type:'transaction',id:'t2',fields:{type:'حلقة',fee:'1'},links:[]});
 const p=buildLegacyMappingPreview(v,plan());
 assert.equal(p.persistencePerformed,false);assert.equal(p.importExecutionAllowed,false);assert.equal(p.eligibleForOrderedImport,false);
});

test('A3 missing source fields fail closed and never synthesize defaults',()=>{
 const v=snapshot();delete v.records[0]!.fields.name;
 assert.throws(()=>buildLegacyMappingPreview(v,plan()),/LEGACY_MAPPING_SOURCE_FIELD_MISSING/);
});

test('A3 source snapshot and plan remain byte-for-byte unchanged after destructive replay',()=>{
 const v=snapshot(),m=plan(),sv=JSON.stringify(v),sm=JSON.stringify(m);
 for(let i=0;i<5;i++)buildLegacyMappingPreview(v,m);
 assert.equal(JSON.stringify(v),sv);assert.equal(JSON.stringify(m),sm);
});

test('A3 never authorizes ordered import even for clean fully mapped preview',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.equal(p.eligibleForOrderedImport,false);assert.equal(p.writeAllowed,undefined);
 assert.ok(p.records.every(x=>x.writeAllowed===false));assert.ok(p.relationshipIntents.every(x=>x.writeAllowed===false));
});
