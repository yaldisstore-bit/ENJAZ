import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA,buildLegacyMappingPreview,parseLegacyMappingPlan} from '../src/features/import/legacyMappingContract.ts';

const snapshot=():any=>({
 schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'legacy-13-2-a2',source:{system:'legacy-office-app',exportId:'batch-a2'},capturedAt:'2026-09-19T00:30:00Z',
 records:[
  {type:'company',id:'c1',fields:{name:'شركة أ'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
  {type:'person',id:'p1',fields:{name:'أحمد'},links:[]},
  {type:'transaction',id:'t1',fields:{type:'تعديل عقد'},links:[{kind:'company',targetType:'company',targetId:'c1'},{kind:'contact',targetType:'person',targetId:'p1'}]},
 ]});
const plan=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'plan-a2',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'}]},
],relationshipMappings:[
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
 {sourceLegacyType:'transaction',linkKind:'contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
]});

test('A2 resolves only explicitly declared safe relationship previews',()=>{
 const p=buildLegacyMappingPreview(snapshot(),plan());
 assert.equal(p.relationshipMappingPerformed,true);
 assert.equal(p.relationshipIntents.length,3);
 assert.ok(p.relationshipIntents.every(x=>x.disposition==='RESOLVED_RELATIONSHIP_PREVIEW'));
 assert.ok(p.relationshipIntents.every(x=>x.foreignKeyAssigned===false&&x.generatedTargetId===null&&x.writeAllowed===false));
 assert.equal(p.foreignKeyAssignmentPerformed,false);assert.equal(p.idGenerationPerformed,false);assert.equal(p.eligibleForOrderedImport,false);
});

test('A2 exact link vocabulary does not case-fold or infer synonyms',()=>{
 const v=snapshot();v.records[2]!.links[0]!.kind='Company';
 const p=buildLegacyMappingPreview(v,plan());
 assert.equal(p.relationshipIntents.length,2);
 assert.deepEqual(p.unmappedRelationshipLinks,[{sourceKey:'transaction:t1',kind:'Company',targetKey:'company:c1'}]);
 assert.equal(p.records.find(x=>x.sourceKey==='transaction:t1')?.reviewRequired,true);
});

test('A2 forbids relationship target fields outside the three certified authorities',()=>{
 const bad=plan();bad.relationshipMappings[0]!.targetField='primary_contact_id';
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot()),/LEGACY_RELATION_TARGET_FIELD_FORBIDDEN/);
 for(const field of ['workspace_id','id','status','created_at','company_id']){
  const b=plan();b.relationshipMappings[2]!.targetField=field;
  assert.throws(()=>parseLegacyMappingPlan(b,snapshot()),/LEGACY_RELATION_TARGET_FIELD_FORBIDDEN/);
 }
});

test('A2 requires both legacy endpoint types to have explicit type mappings',()=>{
 const bad=plan();bad.typeMappings=bad.typeMappings.filter((x:any)=>x.legacyType!=='person');
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot()),/LEGACY_RELATION_TYPE_MAPPING_REQUIRED/);
});

test('A2 rejects relationship mappings for unobserved legacy endpoint types',()=>{
 const bad=plan();bad.relationshipMappings.push({sourceLegacyType:'invoice',linkKind:'company',targetLegacyType:'company',targetField:'company_id'});
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot()),/LEGACY_RELATION_TYPE_NOT_OBSERVED/);
});

test('A2 duplicate relationship declarations fail closed',()=>{
 const bad=plan();bad.relationshipMappings.push({...bad.relationshipMappings[0]});
 assert.throws(()=>parseLegacyMappingPlan(bad,snapshot()),/LEGACY_RELATION_MAPPING_DUPLICATE/);
});

test('A2 dangling target remains quarantined and no FK is synthesized',()=>{
 const v=snapshot();v.records[2]!.links[0]!.targetId='missing';
 const p=buildLegacyMappingPreview(v,plan());
 const rel=p.relationshipIntents.find(x=>x.linkKind==='company');
 assert.equal(rel?.disposition,'QUARANTINED_DANGLING_TARGET');
 assert.equal(rel?.foreignKeyAssigned,false);assert.equal(rel?.generatedTargetId,null);
 assert.equal(p.records.find(x=>x.sourceKey==='transaction:t1')?.reviewRequired,true);
});

test('A2 duplicate target makes the relationship ambiguous and quarantined',()=>{
 const v=snapshot();v.records.push({type:'company',id:'c1',fields:{name:'نسخة'},links:[]});
 const p=buildLegacyMappingPreview(v,plan());
 const rel=p.relationshipIntents.find(x=>x.sourceKey==='transaction:t1'&&x.linkKind==='company');
 assert.equal(rel?.disposition,'QUARANTINED_DUPLICATE_TARGET');
 assert.equal(rel?.reviewRequired,true);
});

test('A2 duplicate source record cannot yield authoritative relation assignment',()=>{
 const v=snapshot();v.records.push({type:'transaction',id:'t1',fields:{type:'نسخة'},links:[{kind:'company',targetType:'company',targetId:'c1'}]});
 const p=buildLegacyMappingPreview(v,plan());
 assert.ok(p.relationshipIntents.filter(x=>x.sourceKey==='transaction:t1'&&x.linkKind==='company').every(x=>x.disposition==='QUARANTINED_DUPLICATE_SOURCE'));
});

test('A2 does not mutate source snapshot or mapping plan',()=>{
 const v=snapshot(),m=plan(),sv=JSON.stringify(v),sm=JSON.stringify(m);buildLegacyMappingPreview(v,m);
 assert.equal(JSON.stringify(v),sv);assert.equal(JSON.stringify(m),sm);
});
