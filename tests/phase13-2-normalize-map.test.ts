import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA,buildLegacyMappingPreview,parseLegacyMappingPlan} from '../src/features/import/legacyMappingContract.ts';

const state=JSON.parse(fs.readFileSync('docs/PHASE13_2_STATE.json','utf8'));
const snapshot=():any=>({
 schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'legacy-13-2-a1',source:{system:'legacy-office-app',exportId:'batch-132'},capturedAt:'2026-09-19T00:00:00Z',
 records:[
  {type:'company',id:'c1',fields:{name:'  شركة قديمة  ',capital:'100000000',ignored:'يبقى خارج الخريطة'},links:[]},
  {type:'person',id:'p1',fields:{name:' أحمد ',phone:'07700000000'},links:[{kind:'owns',targetType:'company',targetId:'c1'}]},
  {type:'mystery',id:'x1',fields:{value:'مجهول'},links:[]},
 ]
});
const plan=()=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'plan-a1',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[
  {sourceField:'name',targetField:'legal_name',normalize:'trim_text'},
  {sourceField:'capital',targetField:'capital',normalize:'strict_number'},
 ]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[
  {sourceField:'name',targetField:'display_name',normalize:'trim_text'},
  {sourceField:'phone',targetField:'phone',normalize:'identity_scalar'},
 ]},
]});

test('13.2 opens only from exact 13.1 formal closure and keeps 13.3 locked',()=>{
 assert.equal(state.status,'IN_PROGRESS');assert.equal(state.baseCommit,'aa8e402eeb6ed03bee9fb446bc2c741da37df7dc');
 assert.equal(state.predecessorPhase,'13.1');assert.equal(state.predecessorStatus,'CLOSED');assert.equal(state.predecessorClosureDecision,'PASS');
 assert.equal(state.successorPhase,'13.3');assert.equal(state.successorStatus,'LOCKED');assert.equal(state.phase13_3Allowed,false);
 assert.equal(state.mappingAllowed,true);assert.equal(state.normalizationAllowed,true);assert.equal(state.mappingMustBeExplicit,true);assert.equal(state.mappingInferenceAllowed,false);
 assert.equal(state.persistenceAllowed,false);assert.equal(state.databaseWritesAllowed,false);assert.equal(state.orderedImportAllowed,false);assert.equal(state.importExecutionAllowed,false);assert.equal(state.targetEnjazMutationAllowed,false);
});

test('explicit company/contact mapping produces deterministic in-memory preview',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.equal(p.records[0]!.targetTable,'companies');assert.deepEqual(p.records[0]!.normalizedFields,{legal_name:'شركة قديمة',capital:100000000});
 assert.equal(p.records[1]!.targetTable,'contacts');assert.deepEqual(p.records[1]!.normalizedFields,{display_name:'أحمد',phone:'07700000000'});
 assert.deepEqual(p.unmappedLegacyTypes,['mystery']);
 assert.equal(p.records[2]!.disposition,'QUARANTINED_UNMAPPED_TYPE');
 assert.equal(p.persistencePerformed,false);assert.equal(p.importExecutionAllowed,false);assert.equal(p.targetMutationAllowed,false);assert.equal(p.eligibleForOrderedImport,false);
});

test('unmapped fields are never copied silently',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.ok(!('ignored' in (p.records[0]!.normalizedFields??{})));
});

test('legacy type matching is exact and case-sensitive',()=>{
 const v=snapshot();v.records[0]!.type='Company';
 const adjusted=plan();adjusted.typeMappings=adjusted.typeMappings.filter(x=>x.legacyType!=='company');
 const p=buildLegacyMappingPreview(v,adjusted);
 assert.equal(p.records[0]!.disposition,'QUARANTINED_UNMAPPED_TYPE');
});

test('authority-bearing target fields are forbidden',()=>{
 const bad=plan();bad.typeMappings[0]!.fieldMappings[0]!.targetField='workspace_id';
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot() as any),/LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN/);
 for(const reserved of ['id','company_id','primary_contact_id','status','priority','created_at','updated_at','deleted_at']){
  const b=plan();b.typeMappings[0]!.fieldMappings[0]!.targetField=reserved;
  assert.throws(()=>parseLegacyMappingPlan(b,snapshot() as any),/LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN/);
 }
});

test('unknown target tables are forbidden',()=>{
 const bad=plan();bad.typeMappings[0]!.targetTable='payments';
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot() as any),/LEGACY_MAPPING_TARGET_TABLE_FORBIDDEN/);
});

test('duplicate source or target mappings fail closed',()=>{
 const a=plan();a.typeMappings[0]!.fieldMappings.push({sourceField:'name',targetField:'display_name',normalize:'trim_text'});
 assert.throws(()=>parseLegacyMappingPlan(a,snapshot() as any),/LEGACY_MAPPING_SOURCE_FIELD_DUPLICATE/);
 const b=plan();b.typeMappings[0]!.fieldMappings.push({sourceField:'ignored',targetField:'legal_name',normalize:'trim_text'});
 assert.throws(()=>parseLegacyMappingPlan(b,snapshot() as any),/LEGACY_MAPPING_TARGET_FIELD_DUPLICATE/);
});

test('strict number rejects ambiguous formats and accepts plain decimal only',()=>{
 for(const value of ['100,000',' 100000 ','1e8','']){
  const v=snapshot();v.records[0]!.fields.capital=value;
  assert.throws(()=>buildLegacyMappingPreview(v,plan()),/LEGACY_MAPPING_NUMBER_INVALID/);
 }
 const v=snapshot();v.records[0]!.fields.capital='100000000.50';
 assert.equal(buildLegacyMappingPreview(v,plan()).records[0]!.normalizedFields!.capital,100000000.5);
});

test('mapping plan cannot speculate about unobserved legacy types',()=>{
 const bad=plan();bad.typeMappings.push({legacyType:'invoice',targetTable:'transactions',fieldMappings:[{sourceField:'name',targetField:'type',normalize:'trim_text'}]});
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot() as any),/LEGACY_MAPPING_LEGACY_TYPE_NOT_OBSERVED/);
});

test('duplicate and dangling evidence survives mapping without repair',()=>{
 const v=snapshot();v.records.push({type:'company',id:'c1',fields:{name:'نسخة',capital:1},links:[{kind:'parent',targetType:'company',targetId:'missing'}]});
 const p=buildLegacyMappingPreview(v,plan());
 assert.deepEqual(p.duplicateRecordKeys,['company:c1']);assert.equal(p.danglingLinks.length,1);assert.equal(p.eligibleForOrderedImport,false);
 assert.ok(p.records.filter(r=>r.sourceKey==='company:c1').every(r=>r.reviewRequired));
});

test('preview does not mutate snapshot or mapping plan',()=>{
 const v=snapshot(),m=plan(),beforeV=JSON.stringify(v),beforeM=JSON.stringify(m);buildLegacyMappingPreview(v,m);
 assert.equal(JSON.stringify(v),beforeV);assert.equal(JSON.stringify(m),beforeM);
});

test('relationships are not mapped in A1 even when source links exist',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.equal(p.relationshipMappingPerformed,false);assert.equal(p.targetAuthorityAssigned,false);
 assert.ok(p.records.every(r=>r.writeAllowed===false));
});
