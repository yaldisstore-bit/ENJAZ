import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LEGACY_SNAPSHOT_SCHEMA,
  intakeLegacySnapshot,
  parseLegacySnapshot,
} from '../src/features/import/legacySnapshotContract.ts';

const state=JSON.parse(fs.readFileSync('docs/PHASE13_1_STATE.json','utf8'));

const base=():any=>({
  schema:LEGACY_SNAPSHOT_SCHEMA,
  snapshotId:'legacy-export-001',
  source:{system:'legacy-office-app',exportId:'batch-77'},
  capturedAt:'2026-09-18T20:00:00Z',
  records:[
    {type:'company',id:'c1',fields:{name:'شركة قديمة',capital:100000000},links:[]},
    {type:'person',id:'p1',fields:{name:'احمد'},links:[{kind:'owns',targetType:'company',targetId:'c1'}]},
  ],
});

test('13.1 lifecycle starts from exact 12.5 closure and keeps 13.2 locked',()=>{
  assert.equal(state.status,'IN_PROGRESS');
  assert.equal(state.baseCommit,'a7a17d6309e43cff68968be33deecbdac57ed4ed');
  assert.equal(state.predecessorPhase,'12.5');
  assert.equal(state.predecessorStatus,'CLOSED');
  assert.equal(state.predecessorClosureDecision,'PASS');
  assert.equal(state.successorPhase,'13.2');
  assert.equal(state.successorStatus,'LOCKED');
  assert.equal(state.phase13_2Allowed,false);
  assert.equal(state.readOnly,true);
  assert.equal(state.persistenceAllowed,false);
  assert.equal(state.mappingAllowed,false);
  assert.equal(state.normalizationAllowed,false);
  assert.equal(state.orderedImportAllowed,false);
  assert.equal(state.targetEnjazMutationAllowed,false);
});

test('13.1 accepts opaque Arabic legacy fields without mapping',()=>{
  const {snapshot,inventory}=intakeLegacySnapshot(base());
  assert.equal(snapshot.records[0].fields.name,'شركة قديمة');
  assert.equal(inventory.authoritative,false);
  assert.equal(inventory.readOnly,true);
  assert.equal(inventory.mappingPerformed,false);
  assert.equal(inventory.normalizationPerformed,false);
  assert.equal(inventory.persistencePerformed,false);
  assert.equal(inventory.writePlanGenerated,false);
});

test('13.1 rejects unknown envelope control fields',()=>{
  assert.throws(()=>parseLegacySnapshot({...base(),targetTable:'companies'}),/LEGACY_SNAPSHOT_FIELD_FORBIDDEN/);
});

test('13.1 rejects unknown record control fields',()=>{
  const value=base();
  value.records[0]={...value.records[0],enjazSystem:'M2'} as any;
  assert.throws(()=>parseLegacySnapshot(value),/LEGACY_SNAPSHOT_RECORD_FIELD_FORBIDDEN/);
});

test('13.1 inventory counts legacy types deterministically',()=>{
  const {inventory}=intakeLegacySnapshot(base());
  assert.deepEqual(inventory.typeCounts,[{type:'company',count:1},{type:'person',count:1}]);
  assert.equal(inventory.recordCount,2);
  assert.equal(inventory.requiresReview,false);
});

test('13.1 duplicate ids are quarantined instead of merged',()=>{
  const value=base();
  value.records.push({type:'company',id:'c1',fields:{name:'نسخة ثانية'},links:[]});
  const {inventory}=intakeLegacySnapshot(value);
  assert.deepEqual(inventory.duplicateRecordKeys,['company:c1']);
  assert.equal(inventory.requiresReview,true);
  assert.equal(inventory.mappingPerformed,false);
});

test('13.1 dangling links are reviewable and never fabricated',()=>{
  const value=base();
  value.records[1].links=[{kind:'owns',targetType:'company',targetId:'missing'}];
  const {inventory}=intakeLegacySnapshot(value);
  assert.deepEqual(inventory.danglingLinks,[{sourceKey:'person:p1',kind:'owns',targetKey:'company:missing'}]);
  assert.equal(inventory.requiresReview,true);
});

test('13.1 resolved links do not create false quarantine',()=>{
  const {inventory}=intakeLegacySnapshot(base());
  assert.deepEqual(inventory.danglingLinks,[]);
  assert.equal(inventory.requiresReview,false);
});

test('13.1 rejects non-finite legacy numbers',()=>{
  const value=base();
  value.records[0].fields={bad:Number.NaN};
  assert.throws(()=>parseLegacySnapshot(value),/LEGACY_SNAPSHOT_NUMBER_INVALID/);
});

test('13.1 rejects invalid UTC capture timestamps',()=>{
  assert.throws(()=>parseLegacySnapshot({...base(),capturedAt:'2026-09-18 20:00:00'}),/LEGACY_SNAPSHOT_CAPTURED_AT_INVALID/);
});
