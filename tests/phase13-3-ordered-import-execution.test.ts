import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_SNAPSHOT_SCHEMA} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA} from '../src/features/import/legacyMappingContract.ts';
import {LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,buildLegacyOrderedImportExecutionManifest} from '../src/features/import/legacyOrderedImportBinding.ts';
import {LEGACY_ORDERED_IMPORT_RPC_ENVELOPE_SCHEMA,parseLegacyOrderedImportExecutionManifest,prepareLegacyOrderedImportRpcEnvelope} from '../src/features/import/legacyOrderedImportExecution.ts';

const snapshot=():any=>({schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'legacy-13-3-a3',source:{system:'legacy'},capturedAt:'2026-09-19T02:00:00Z',records:[
 {type:'company',id:'c1',fields:{name:'شركة أ'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
 {type:'person',id:'p1',fields:{name:'أحمد'},links:[]},
 {type:'transaction',id:'t1',fields:{type:'تعديل عقد'},links:[{kind:'company',targetType:'company',targetId:'c1'},{kind:'contact',targetType:'person',targetId:'p1'}]},
]});
const mapping=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'map-a3',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'}]},
],relationshipMappings:[
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
 {sourceLegacyType:'transaction',linkKind:'contact',targetLegacyType:'person',targetField:'primary_contact_id'},
]});
const binding=():any=>({schema:LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,workspaceId:'11111111-1111-4111-8111-111111111111',batchId:'22222222-2222-4222-8222-222222222222',idempotencyKey:'legacy:batch:a3:001',bindings:[
 {sourceKey:'person:p1',targetId:'33333333-3333-4333-8333-333333333333'},
 {sourceKey:'company:c1',targetId:'44444444-4444-4444-8444-444444444444'},
 {sourceKey:'transaction:t1',targetId:'55555555-5555-4555-8555-555555555555'},
]});
const manifest=()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),binding());
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;

test('A3 source boundary emits a non-executed RPC envelope only',()=>{
 const input=manifest(),before=JSON.stringify(input),e=prepareLegacyOrderedImportRpcEnvelope(input);
 assert.equal(e.schema,LEGACY_ORDERED_IMPORT_RPC_ENVELOPE_SCHEMA);assert.equal(e.functionName,'execute_legacy_ordered_import_v1');
 assert.equal(e.callerJwtRequired,true);assert.equal(e.workspacePermissionVerified,false);assert.equal(e.serverIdempotencyEnforced,false);assert.equal(e.writeExecuted,false);assert.equal(e.eligibleForA3DatabaseBoundary,true);
 assert.equal(JSON.stringify(input),before);
});

test('A3 source boundary rejects hidden execution controls',()=>{
 const m:any=clone(manifest());m.execute=true;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/FIELD_FORBIDDEN/);
});

test('A3 source boundary rejects permission, idempotency or mutation preclaims',()=>{
 for(const [field,value] of [['workspacePermissionVerified',true],['idempotencyEnforcementPerformed',true],['importExecutionAllowed',true],['targetMutationPerformed',true]] as const){
  const m:any=clone(manifest());m[field]=value;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/FORBIDDEN|PRECLAIM/);
 }
});

test('A3 source boundary rejects duplicate target IDs',()=>{
 const m:any=clone(manifest());m.items[2].targetId=m.items[1].targetId;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/TARGET_ID_DUPLICATE/);
});

test('A3 source boundary rejects ordinal or stage-order tamper',()=>{
 const a:any=clone(manifest());a.items[0].ordinal=2;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(a),/ORDINAL_INVALID/);
 const b:any=clone(manifest());b.items[2].stage=2;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(b),/STAGE_INVALID/);
});

test('A3 source boundary rejects forbidden normalized authority fields',()=>{
 const m:any=clone(manifest());m.items[1].normalizedFields.workspace_id='11111111-1111-4111-8111-111111111111';assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/TARGET_FIELD_FORBIDDEN/);
});

test('A3 source boundary rejects unsafe numeric precision',()=>{
 const m:any=clone(manifest());m.items[2].normalizedFields.current_fee=90071992547409.92;assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/FIELD_VALUE_INVALID/);
});

test('A3 source boundary rejects relationship target-ID drift',()=>{
 const m:any=clone(manifest());m.relationshipBindings[0].targetTargetId='66666666-6666-4666-8666-666666666666';assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/RELATION_ID_DRIFT/);
});

test('A3 source boundary rejects relationship authority or dependency-order drift',()=>{
 const m:any=clone(manifest());m.relationshipBindings[0].targetField='company_id';assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/RELATION_AUTHORITY_INVALID/);
});

test('A3 source boundary replay is byte-for-byte deterministic and input remains unchanged',()=>{
 const m=manifest(),before=JSON.stringify(m);
 const a=JSON.stringify(prepareLegacyOrderedImportRpcEnvelope(m)),b=JSON.stringify(prepareLegacyOrderedImportRpcEnvelope(m));
 assert.equal(a,b);assert.equal(JSON.stringify(m),before);
});
