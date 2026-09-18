import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_SNAPSHOT_SCHEMA,
  intakeLegacySnapshot,
  parseLegacySnapshot,
} from '../src/features/import/legacySnapshotContract.ts';
import { buildLegacySnapshotReviewManifest } from '../src/features/import/legacySnapshotReview.ts';

const record=(type:string,id:string,fields:Record<string,unknown>={},links:any[]=[])=>({type,id,fields,links});
const envelope=(records:any[])=>({
  schema:LEGACY_SNAPSHOT_SCHEMA,
  snapshotId:'destruction-001',
  source:{system:'legacy-destruction',exportId:null},
  capturedAt:'2026-09-18T20:00:00Z',
  records,
});

test('13.1 A3 rejects 5001 records fail-closed',()=>{
  const records=Array.from({length:5001},(_,i)=>record('x',String(i)));
  assert.throws(()=>parseLegacySnapshot(envelope(records)),/LEGACY_SNAPSHOT_RECORDS_INVALID/);
});

test('13.1 A3 enforces record ceiling using UTF-8 bytes for Arabic payloads',()=>{
  const chunk='ع'.repeat(30000);
  const value=envelope([record('arabic','1',{a:chunk,b:chunk,c:chunk})]);
  assert.throws(()=>parseLegacySnapshot(value),/LEGACY_SNAPSHOT_RECORD_TOO_LARGE/);
});

test('13.1 A3 rejects JSON deeper than the governed depth',()=>{
  let deep:any='x';
  for(let i=0;i<10;i++) deep={next:deep};
  assert.throws(()=>parseLegacySnapshot(envelope([record('deep','1',{deep})])),/LEGACY_SNAPSHOT_VALUE_TOO_DEEP/);
});

test('13.1 A3 rejects oversized legacy arrays',()=>{
  assert.throws(()=>parseLegacySnapshot(envelope([record('arr','1',{items:Array.from({length:501},(_,i)=>i)})])),/LEGACY_SNAPSHOT_ARRAY_TOO_LARGE/);
});

test('13.1 A3 rejects overly wide legacy objects',()=>{
  const wide=Object.fromEntries(Array.from({length:129},(_,i)=>['k'+i,i]));
  assert.throws(()=>parseLegacySnapshot(envelope([record('wide','1',wide)])),/LEGACY_SNAPSHOT_OBJECT_TOO_WIDE/);
});

test('13.1 A3 hostile target control fields remain forbidden',()=>{
  const value:any=envelope([record('company','1')]);
  value.targetTable='companies';
  assert.throws(()=>parseLegacySnapshot(value),/LEGACY_SNAPSHOT_FIELD_FORBIDDEN/);
  delete value.targetTable;
  value.records[0].mappedEntityId='x';
  assert.throws(()=>parseLegacySnapshot(value),/LEGACY_SNAPSHOT_RECORD_FIELD_FORBIDDEN/);
});

test('13.1 A3 duplicate storms stay review evidence and are never repaired',()=>{
  const records=Array.from({length:100},(_,i)=>record('company','same',{seq:i}));
  const snapshot=parseLegacySnapshot(envelope(records));
  const manifest=buildLegacySnapshotReviewManifest(snapshot,['company']);
  assert.deepEqual(manifest.issues,[{code:'DUPLICATE_RECORD_KEY',key:'company:same',reviewRequired:true}]);
  assert.equal(snapshot.records.length,100);
});

test('13.1 A3 dangling-link storms remain deterministic review evidence',()=>{
  const links=Array.from({length:100},(_,i)=>({kind:'ref',targetType:'missing',targetId:String(i)}));
  const snapshot=parseLegacySnapshot(envelope([record('source','1',{},links)]));
  const first=buildLegacySnapshotReviewManifest(snapshot,['source']);
  const second=buildLegacySnapshotReviewManifest(snapshot,['source']);
  assert.equal(first.issues.filter(x=>x.code==='DANGLING_LINK').length,100);
  assert.deepEqual(first,second);
});

test('13.1 A3 exact labels do not gain alias or case inference',()=>{
  const snapshot=parseLegacySnapshot(envelope([record('Company','1')]));
  assert.throws(()=>buildLegacySnapshotReviewManifest(snapshot,['company']),/LEGACY_REVIEW_RECOGNIZED_TYPE_NOT_OBSERVED/);
});

test('13.1 A3 preserves opaque Arabic fields byte-for-byte at the value layer',()=>{
  const arabic='شركة الرافدين – ملاحظات قديمة ١٢٣';
  const {snapshot}=intakeLegacySnapshot(envelope([record('opaque','1',{arabic})]));
  assert.equal(snapshot.records[0]!.fields.arabic,arabic);
});

test('13.1 A3 replay is deterministic for inventory and quarantine manifest',()=>{
  const snapshot=parseLegacySnapshot(envelope([
    record('company','1'),
    record('mystery','2',{},[{kind:'ref',targetType:'company',targetId:'404'}]),
  ]));
  const a=intakeLegacySnapshot(snapshot).inventory;
  const b=intakeLegacySnapshot(snapshot).inventory;
  assert.deepEqual(a,b);
  assert.deepEqual(
    buildLegacySnapshotReviewManifest(snapshot,['company']),
    buildLegacySnapshotReviewManifest(snapshot,['company']),
  );
});

test('13.1 A3 intake and review never mutate the caller snapshot',()=>{
  const raw=envelope([record('company','1',{name:'A'})]);
  const before=JSON.stringify(raw);
  const snapshot=parseLegacySnapshot(raw);
  buildLegacySnapshotReviewManifest(snapshot,['company']);
  assert.equal(JSON.stringify(raw),before);
});

test('13.1 A3 manifest still has zero mapping/persistence/import authority',()=>{
  const snapshot=parseLegacySnapshot(envelope([record('company','1')]));
  const manifest=buildLegacySnapshotReviewManifest(snapshot,['company']);
  assert.equal(manifest.mappingAllowed,false);
  assert.equal(manifest.normalizationAllowed,false);
  assert.equal(manifest.persistenceAllowed,false);
  assert.equal(manifest.importExecutionAllowed,false);
  assert.equal(manifest.targetAuthorityAssigned,false);
});
