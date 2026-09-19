import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGACY_SNAPSHOT_SCHEMA,parseLegacySnapshot} from '../src/features/import/legacySnapshotContract.ts';
import {LEGACY_MAPPING_PLAN_SCHEMA,buildLegacyMappingPreview} from '../src/features/import/legacyMappingContract.ts';
import {buildLegacyOrderedImportPlan} from '../src/features/import/legacyOrderedImportContract.ts';
import {LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,buildLegacyOrderedImportExecutionManifest} from '../src/features/import/legacyOrderedImportBinding.ts';
import {parseLegacyOrderedImportExecutionManifest,prepareLegacyOrderedImportRpcEnvelope} from '../src/features/import/legacyOrderedImportExecution.ts';

const state=JSON.parse(fs.readFileSync('docs/PHASE13_5_STATE.json','utf8'));
const snapshot=():any=>({schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'phase13-5-a1',source:{system:'legacy-destruction',exportId:'a1'},capturedAt:'2026-09-19T13:00:00Z',records:[
 {type:'company',id:'c1',fields:{name:'شركة أ',capital:'100000000.50'},links:[{kind:'primary_contact',targetType:'person',targetId:'p1'}]},
 {type:'person',id:'p1',fields:{name:' أحمد '},links:[]},
 {type:'transaction',id:'t1',fields:{type:'تعديل عقد',fee:'1250.25'},links:[{kind:'company',targetType:'company',targetId:'c1'},{kind:'contact',targetType:'person',targetId:'p1'}]},
]});
const mapping=():any=>({schema:LEGACY_MAPPING_PLAN_SCHEMA,planId:'phase13-5-a1-map',typeMappings:[
 {legacyType:'company',targetTable:'companies',fieldMappings:[{sourceField:'name',targetField:'legal_name',normalize:'trim_text'},{sourceField:'capital',targetField:'capital',normalize:'strict_number'}]},
 {legacyType:'person',targetTable:'contacts',fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]},
 {legacyType:'transaction',targetTable:'transactions',fieldMappings:[{sourceField:'type',targetField:'type',normalize:'trim_text'},{sourceField:'fee',targetField:'current_fee',normalize:'strict_number'}]},
],relationshipMappings:[
 {sourceLegacyType:'company',linkKind:'primary_contact',targetLegacyType:'person',targetField:'primary_contact_id'},
 {sourceLegacyType:'transaction',linkKind:'company',targetLegacyType:'company',targetField:'company_id'},
 {sourceLegacyType:'transaction',linkKind:'contact',targetLegacyType:'person',targetField:'primary_contact_id'},
]});
const binding=():any=>({schema:LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,workspaceId:'11111111-1111-4111-8111-111111111111',batchId:'22222222-2222-4222-8222-222222222222',idempotencyKey:'phase13_5:a1:001',bindings:[
 {sourceKey:'person:p1',targetId:'33333333-3333-4333-8333-333333333333'},
 {sourceKey:'company:c1',targetId:'44444444-4444-4444-8444-444444444444'},
 {sourceKey:'transaction:t1',targetId:'55555555-5555-4555-8555-555555555555'},
]});
const manifest=()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),binding());
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;

test('13.5 inherits corrected closed Phase 13.4 and keeps Phase 14.1 locked',()=>{
 assert.equal(state.baseCommit,'64b78767ebd3b0112e752f979d5448f78bdfd2cf');
 assert.equal(state.predecessor.phase,'13.4');
 assert.equal(state.predecessor.requiredStatus,'CLOSED');
 assert.equal(state.predecessor.productionRecordCorrectionMerge,'64b78767ebd3b0112e752f979d5448f78bdfd2cf');
 assert.equal(state.successorPhase,'14.1');
 assert.equal(state.successorStatus,'LOCKED');
 assert.equal(state.phase14_1Allowed,false);
 assert.equal(state.exitGatePassed,false);
});

test('13.5 clean path remains exactly contacts companies transactions and non-executed until authenticated RPC',()=>{
 const m=manifest();
 assert.deepEqual([...new Set(m.items.map((x:any)=>x.targetTable))].sort(),['companies','contacts','transactions']);
 const e=prepareLegacyOrderedImportRpcEnvelope(m);
 assert.equal(e.functionName,'execute_legacy_ordered_import_v1');
 assert.equal(e.callerJwtRequired,true);
 assert.equal(e.writeExecuted,false);
 assert.equal(e.workspacePermissionVerified,false);
 assert.equal(e.serverIdempotencyEnforced,false);
});

test('13.5 expanded-model target escape is forbidden for documents workflow ownership and arbitrary tables',()=>{
 for(const targetTable of ['documents','workflow_instances','company_ownership_entries','payments','client_portal_requests']){
  const s=snapshot();s.records.push({type:'escape',id:targetTable,fields:{name:'x'},links:[]});
  const p=mapping();p.typeMappings.push({legacyType:'escape',targetTable,fieldMappings:[{sourceField:'name',targetField:'display_name',normalize:'trim_text'}]});
  assert.throws(()=>buildLegacyMappingPreview(s,p),/LEGACY_MAPPING_TARGET_TABLE_FORBIDDEN/,targetTable);
 }
});

test('13.5 workflow ownership and document authority fields cannot be smuggled into certified target tables',()=>{
 for(const targetField of ['workflow_state','owner_user_id','document_id','workspace_id','status','deleted_at']){
  const s=snapshot();
  s.records[0].fields.legacy_escape='x';
  const p=mapping();
  p.typeMappings[0].fieldMappings.push({sourceField:'legacy_escape',targetField,normalize:'trim_text'});
  assert.throws(()=>buildLegacyOrderedImportPlan(s,p),/LEGACY_MAPPING_TARGET_FIELD_FORBIDDEN/,targetField);
 }
});

test('13.5 unknown legacy concepts remain quarantined and can never reach ordered import',()=>{
 const s=snapshot();s.records.push({type:'legacy_document_bundle',id:'d1',fields:{title:'قديم'},links:[]});
 const preview=buildLegacyMappingPreview(s,mapping());
 assert.ok(preview.unmappedLegacyTypes.includes('legacy_document_bundle'));
 assert.equal(preview.records.find((x:any)=>x.sourceKey==='legacy_document_bundle:d1')?.reviewRequired,true);
 assert.throws(()=>buildLegacyOrderedImportPlan(s,mapping()),/LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES/);
});

test('13.5 orphan relationships fail closed before binding or write authority',()=>{
 const s=snapshot();s.records[2].links[0].targetId='missing-company';
 assert.throws(()=>buildLegacyOrderedImportPlan(s,mapping()),/LEGACY_ORDERED_IMPORT_DANGLING_LINKS/);
});

test('13.5 duplicate source keys fail closed and are never silently merged',()=>{
 const s=snapshot();s.records.push(clone(s.records[1]));
 assert.throws(()=>buildLegacyOrderedImportPlan(s,mapping()),/LEGACY_ORDERED_IMPORT_DUPLICATE_KEYS/);
});

test('13.5 duplicate caller target IDs fail closed before execution manifest',()=>{
 const b=binding();b.bindings[2].targetId=b.bindings[1].targetId;
 assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_TARGET_ID_DUPLICATE/);
});

test('13.5 money precision and ambiguous numeric syntax fail closed with no rounding',()=>{
 for(const value of ['9007199254740993','1.001','1e3','1,000','+1000',' 1000 ']){
  const s=snapshot();s.records[2].fields.fee=value;
  assert.throws(()=>buildLegacyOrderedImportPlan(s,mapping()),/LEGACY_MAPPING_NUMBER_(?:PRECISION_UNSAFE|INVALID)/,value);
 }
});

test('13.5 5001 snapshot records and 5001 execution items both fail closed',()=>{
 const huge={schema:LEGACY_SNAPSHOT_SCHEMA,snapshotId:'huge',source:{system:'legacy'},capturedAt:'2026-09-19T13:00:00Z',
  records:Array.from({length:5001},(_,i)=>({type:'x',id:String(i),fields:{v:i},links:[]}))};
 assert.throws(()=>parseLegacySnapshot(huge),/LEGACY_SNAPSHOT_RECORDS_INVALID/);
 const m:any=clone(manifest());
 const seed=clone(m.items[0]);
 m.items=Array.from({length:5001},(_,i)=>({...seed,ordinal:i+1,sourceKey:'person:p'+i,targetId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}));
 assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/LEGACY_IMPORT_EXECUTION_ITEMS_INVALID/);
});

test('13.5 hidden control fields fail closed at mapping binding and execution layers',()=>{
 const p=mapping();p.execute=true;
 assert.throws(()=>buildLegacyOrderedImportPlan(snapshot(),p),/LEGACY_MAPPING_PLAN_FIELD_FORBIDDEN/);
 const b=binding();b.repair=true;
 assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_BINDING_FIELD_FORBIDDEN/);
 const m:any=clone(manifest());m.closureAuthorized=true;
 assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/LEGACY_IMPORT_EXECUTION_MANIFEST_FIELD_FORBIDDEN/);
});

test('13.5 write repair permission and reconciliation preclaims are rejected',()=>{
 for(const [field,value] of [
  ['workspacePermissionVerified',true],['idempotencyEnforcementPerformed',true],['persistencePerformed',true],
  ['importExecutionAllowed',true],['targetMutationPerformed',true],['foreignKeyAssignmentPerformed',true]
 ] as const){
  const m:any=clone(manifest());m[field]=value;
  assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/FORBIDDEN|PRECLAIM/);
 }
});

test('13.5 expanded target table cannot be injected after a clean manifest is built',()=>{
 const m:any=clone(manifest());m.items[2].targetTable='documents';
 assert.throws(()=>parseLegacyOrderedImportExecutionManifest(m),/LEGACY_IMPORT_EXECUTION_TARGET_TABLE_INVALID/);
});

test('13.5 relationship endpoint order and authority drift fail closed',()=>{
 const a:any=clone(manifest());a.relationshipBindings[0].targetTargetTable='companies';
 assert.throws(()=>parseLegacyOrderedImportExecutionManifest(a),/LEGACY_IMPORT_EXECUTION_RELATION_TABLE_DRIFT/);
 const b:any=clone(manifest());b.relationshipBindings[0].targetField='company_id';
 assert.throws(()=>parseLegacyOrderedImportExecutionManifest(b),/LEGACY_IMPORT_EXECUTION_RELATION_AUTHORITY_INVALID/);
});

test('13.5 idempotency binding is explicit and malformed keys never normalize',()=>{
 const b=binding();b.idempotencyKey='bad key with spaces';
 assert.throws(()=>buildLegacyOrderedImportExecutionManifest(snapshot(),mapping(),b),/LEGACY_IMPORT_IDEMPOTENCY_KEY_INVALID/);
 const m=manifest();assert.equal(m.idempotencyBound,true);assert.equal(m.idempotencyEnforcementPerformed,false);
});

test('13.5 replay is deterministic and source mapping binding inputs remain byte-for-byte unchanged',()=>{
 const s=snapshot(),p=mapping(),b=binding(),before=[JSON.stringify(s),JSON.stringify(p),JSON.stringify(b)];
 const a=JSON.stringify(buildLegacyOrderedImportExecutionManifest(s,p,b));
 const z=JSON.stringify(buildLegacyOrderedImportExecutionManifest(s,p,b));
 assert.equal(a,z);assert.deepEqual([JSON.stringify(s),JSON.stringify(p),JSON.stringify(b)],before);
});
