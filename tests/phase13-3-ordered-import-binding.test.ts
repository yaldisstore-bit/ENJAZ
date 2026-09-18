import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA} from '../src/features/import/legacyMappingContract.ts';
import {LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA,buildLegacyOrderedImportExecutionManifest} from '../src/features/import/legacyOrderedImportBinding.ts';

const snapshot=():any=>({schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'legacy-13-3-a2',source:{system:'legacy'},capturedAt:'2026-09-19T01:30:00Z',records:[
 {type:'company',id:'c1',fields:{name:'شركة أ'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
 {type:'person',id:'p1',fields:{name:'أحمد'},links:[]},
 {type:'transaction',id:'t1',fields:{type:'تعديل عقد'},links:[{kind:'company',targetType:'company',targetId:'c1'},{kind:'contact',targetType:'person',targetId:'p1'}]},
]});
const mapping=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'map-a2',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'}]},
],relationshipMappings:[
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
 {sourceLegacyType:'transaction',linkKind:'contact',targetLegacyType:'person',targetField:'primary_contact_id'},
]});
const binding=():any=>({schema:LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,workspaceId:'11111111-1111-4111-8111-111111111111',batchId:'22222222-2222-4222-8222-222222222222',idempotencyKey:'legacy:batch:a2:001',bindings:[
 {sourceKey:'person:p1',targetId:'33333333-3333-4333-8333-333333333333'},
 {sourceKey:'company:c1',targetId:'44444444-4444-4444-8444-444444444444'},
 {sourceKey:'transaction:t1',targetId:'55555555-5555-4555-8555-555555555555'},
]});

test('A2 creates deterministic execution manifest with caller-supplied target IDs only',()=>{
 const m=buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),binding());
 assert.equal(m.schema,LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA);assert.equal(m.workspaceId,binding().workspaceId);assert.equal(m.batchId,binding().batchId);
 assert.deepEqual(m.items.map(x=>[x.ordinal,x.sourceKey,x.targetId]),[[1,'person:p1','33333333-3333-4333-8333-333333333333'],[2,'company:c1','44444444-4444-4444-8444-444444444444'],[3,'transaction:t1','55555555-5555-4555-8555-555555555555']]);
 assert.equal(m.targetIdsGenerated,false);assert.equal(m.idempotencyBound,true);
});

test('A2 resolves symbolic relationships to explicit target IDs without assigning FKs',()=>{
 const m=buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),binding());
 assert.equal(m.relationshipBindings.length,3);assert.ok(m.relationshipBindings.every(x=>x.assignmentPerformed===false&&x.writeAllowed===false));
 const companyPrimary=m.relationshipBindings.find(x=>x.sourceKey==='company:c1'&&x.targetField==='primary_contact_id');
 assert.equal(companyPrimary?.sourceTargetId,'44444444-4444-4444-8444-444444444444');assert.equal(companyPrimary?.targetTargetId,'33333333-3333-4333-8333-333333333333');
 assert.equal(m.foreignKeyBindingPerformed,true);assert.equal(m.foreignKeyAssignmentPerformed,false);
});

test('A2 manifest remains non-executable and does not claim workspace permission',()=>{
 const m=buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),binding());
 assert.equal(m.workspacePermissionVerified,false);assert.equal(m.idempotencyEnforcementPerformed,false);assert.equal(m.persistencePerformed,false);assert.equal(m.importExecutionAllowed,false);assert.equal(m.targetMutationPerformed,false);assert.equal(m.readyForA3ExecutionBoundary,true);
});

test('A2 rejects a missing source binding',()=>{
 const b=binding();b.bindings.pop();assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_BINDING_COUNT_INVALID/);
});

test('A2 rejects an extra or unknown source key',()=>{
 const b=binding();b.bindings[2].sourceKey='transaction:unknown';assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_SOURCE_KEY_UNKNOWN/);
});

test('A2 rejects duplicate source bindings',()=>{
 const b=binding();b.bindings[2].sourceKey='company:c1';assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_SOURCE_KEY_DUPLICATE/);
});

test('A2 rejects duplicate target IDs',()=>{
 const b=binding();b.bindings[2].targetId=b.bindings[1].targetId;assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_TARGET_ID_DUPLICATE/);
});

test('A2 rejects invalid UUIDs and never normalizes them',()=>{
 for(const field of ['workspaceId','batchId']){const b=binding();b[field]='NOT-A-UUID';assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/INVALID/)}
 const b=binding();b.bindings[0].targetId='33333333-3333-4333-8333-33333333333A';assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_TARGET_ID_INVALID/);
});

test('A2 idempotency key is explicit and hidden execution controls fail closed',()=>{
 const b=binding();b.idempotencyKey='bad key';assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_IDEMPOTENCY_KEY_INVALID/);
 const hidden=binding();hidden.execute=true;assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),hidden),/LEGACY_IMPORT_BINDING_FIELD_FORBIDDEN/);
});

test('A2 inherits A1 review blockers and cannot bind an unsafe plan',()=>{
 const s=snapshot();s.records.push({type:'mystery',id:'x1',fields:{x:1},links:[]});assert.throws(()=>buildLegacyOrderedImportExecutionManifest(s,mapping(),binding()),/LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES/);
});

test('A2 replay is byte-for-byte deterministic and does not mutate any input',()=>{
 const s=snapshot(),m=mapping(),b=binding(),before=[JSON.stringify(s),JSON.stringify(m),JSON.stringify(b)];
 const a=JSON.stringify(buildLegacyOrderedImportExecutionManifest(s,m,b)),z=JSON.stringify(buildLegacyOrderedImportExecutionManifest(s,m,b));assert.equal(a,z);
 assert.deepEqual([JSON.stringify(s),JSON.stringify(m),JSON.stringify(b)],before);
});
