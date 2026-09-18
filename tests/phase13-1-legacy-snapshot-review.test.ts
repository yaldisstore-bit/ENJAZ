import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_SNAPSHOT_SCHEMA,
  parseLegacySnapshot,
} from '../src/features/import/legacySnapshotContract.ts';
import { buildLegacySnapshotReviewManifest } from '../src/features/import/legacySnapshotReview.ts';

const sample=()=>parseLegacySnapshot({
  schema:LEGACY_SNAPSHOT_SCHEMA,
  snapshotId:'review-001',
  source:{system:'legacy-office',exportId:null},
  capturedAt:'2026-09-18T20:00:00Z',
  records:[
    {type:'company',id:'c1',fields:{name:'شركة'},links:[]},
    {type:'person',id:'p1',fields:{name:'احمد'},links:[{kind:'owns',targetType:'company',targetId:'missing'}]},
    {type:'mystery_box',id:'x1',fields:{raw:true},links:[]},
  ],
});

test('13.1 A2 defaults every observed legacy type to quarantine',()=>{
  const manifest=buildLegacySnapshotReviewManifest(sample());
  assert.equal(manifest.quarantinedTypeCount,3);
  assert.equal(manifest.quarantinedRecordCount,3);
  assert.equal(manifest.requiresReview,true);
  assert.ok(manifest.typeReviews.every(x=>x.disposition==='QUARANTINED_UNKNOWN'));
});

test('13.1 A2 recognizes only exact caller-declared legacy labels',()=>{
  const manifest=buildLegacySnapshotReviewManifest(sample(),['company','person']);
  assert.deepEqual(manifest.recognizedLegacyTypes,['company','person']);
  assert.equal(manifest.typeReviews.find(x=>x.legacyType==='company')?.disposition,'RECOGNIZED_FOR_REVIEW');
  assert.equal(manifest.typeReviews.find(x=>x.legacyType==='mystery_box')?.disposition,'QUARANTINED_UNKNOWN');
});

test('13.1 A2 never assigns an ENJAZ target even to recognized legacy labels',()=>{
  const manifest=buildLegacySnapshotReviewManifest(sample(),['company']);
  const company=manifest.typeReviews.find(x=>x.legacyType==='company')!;
  assert.equal(company.targetSystem,null);
  assert.equal(company.targetEntity,null);
  assert.equal(company.mappingPerformed,false);
  assert.equal(manifest.mappingAllowed,false);
  assert.equal(manifest.targetAuthorityAssigned,false);
});

test('13.1 A2 emits deterministic unknown and dangling-link review issues',()=>{
  const manifest=buildLegacySnapshotReviewManifest(sample(),['company','person']);
  assert.deepEqual(manifest.issues,[
    {code:'DANGLING_LINK',key:'person:p1|owns|company:missing',reviewRequired:true},
    {code:'UNKNOWN_LEGACY_TYPE',key:'mystery_box',reviewRequired:true},
  ]);
});

test('13.1 A2 carries duplicate record keys into the review manifest',()=>{
  const snapshot=sample();
  snapshot.records.push({type:'company',id:'c1',fields:{name:'نسخة ثانية'},links:[]});
  const manifest=buildLegacySnapshotReviewManifest(snapshot,['company','person','mystery_box']);
  assert.ok(manifest.issues.some(x=>x.code==='DUPLICATE_RECORD_KEY'&&x.key==='company:c1'));
});

test('13.1 A2 does not case-fold or alias a declared type',()=>{
  assert.throws(()=>buildLegacySnapshotReviewManifest(sample(),['Company']),/LEGACY_REVIEW_RECOGNIZED_TYPE_NOT_OBSERVED/);
});

test('13.1 A2 rejects whitespace-normalized declarations instead of guessing',()=>{
  assert.throws(()=>buildLegacySnapshotReviewManifest(sample(),[' company ']),/LEGACY_REVIEW_RECOGNIZED_TYPE_INVALID/);
});

test('13.1 A2 rejects duplicate caller declarations',()=>{
  assert.throws(()=>buildLegacySnapshotReviewManifest(sample(),['company','company']),/LEGACY_REVIEW_RECOGNIZED_TYPE_DUPLICATE/);
});

test('13.1 A2 leaves the parsed legacy snapshot unchanged',()=>{
  const snapshot=sample();
  const before=JSON.stringify(snapshot);
  buildLegacySnapshotReviewManifest(snapshot,['company']);
  assert.equal(JSON.stringify(snapshot),before);
});

test('13.1 A2 remains read-only with no normalization, persistence or import authority',()=>{
  const manifest=buildLegacySnapshotReviewManifest(sample(),['company','person']);
  assert.equal(manifest.readOnly,true);
  assert.equal(manifest.normalizationAllowed,false);
  assert.equal(manifest.persistenceAllowed,false);
  assert.equal(manifest.importExecutionAllowed,false);
});
