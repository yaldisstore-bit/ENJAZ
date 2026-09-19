import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const matrix=JSON.parse(read('docs/PHASE13_5_DESTRUCTION_MATRIX.json'));
const snapshot=read('src/features/import/legacySnapshotContract.ts');
const mapping=read('src/features/import/legacyMappingContract.ts');
const ordered=read('src/features/import/legacyOrderedImportContract.ts');
const binding=read('src/features/import/legacyOrderedImportBinding.ts');
const execution=read('src/features/import/legacyOrderedImportExecution.ts');
const a2=read('database/migrations/phase_13_4_reconciliation_readback.sql').toLowerCase();
const a3=read('database/migrations/phase_13_4_a3_trusted_comparison.sql').toLowerCase();

test('Phase 13.5 destruction matrix is complete, deterministic and production-safe',()=>{
  assert.equal(matrix.schema,'enjaz.phase13-5.import-destruction.matrix.v1');
  assert.equal(matrix.productionDestructiveTargetAllowed,false);
  assert.equal(matrix.automaticRepairAllowed,false);
  assert.deepEqual(matrix.targetTables,['contacts','companies','transactions']);
  assert.equal(matrix.cases.length,24);
  assert.equal(new Set(matrix.cases.map(x=>x.id)).size,24);
  for(const d of ['counts','orphan_relations','money','workflow_state','ownership','documents','duplicate_idempotency'])
    assert.ok(matrix.requiredRoadmapDimensions.includes(d),d);
});

test('unknown workflow, ownership and document concepts remain quarantined rather than gaining shadow authority',()=>{
  for(const id of ['D01_UNMAPPED_TYPE_QUARANTINE','D02_OWNERSHIP_CONCEPT_QUARANTINE','D03_DOCUMENT_CONCEPT_QUARANTINE','D24_UNKNOWN_CONCEPT_SHADOW_WRITE'])
    assert.ok(matrix.cases.some(x=>x.id===id),id);
  assert.match(mapping,/disposition:'QUARANTINED_UNMAPPED_TYPE'/);
  assert.match(ordered,/LEGACY_ORDERED_IMPORT_UNMAPPED_TYPES/);
  assert.match(ordered,/LEGACY_ORDERED_IMPORT_UNMAPPED_RELATIONSHIPS/);
  assert.match(mapping,/const TARGET_TABLES=new Set<LegacyMappingTargetTable>\(\['companies','contacts','transactions'\]\)/);
});

test('binding and execution remain caller-ID, fixed-order and allowlist constrained',()=>{
  for(const marker of [
    'LEGACY_IMPORT_SOURCE_KEY_DUPLICATE','LEGACY_IMPORT_TARGET_ID_DUPLICATE',
    'LEGACY_IMPORT_EXECUTION_STAGE_ORDER_INVALID','LEGACY_IMPORT_EXECUTION_TARGET_TABLE_INVALID',
    'LEGACY_IMPORT_EXECUTION_TARGET_FIELD_FORBIDDEN','LEGACY_IMPORT_EXECUTION_RELATION_AUTHORITY_INVALID',
    'LEGACY_IMPORT_EXECUTION_RELATION_ID_DRIFT','LEGACY_IMPORT_EXECUTION_GENERATED_IDS_FORBIDDEN',
    'LEGACY_IMPORT_EXECUTION_ITEMS_INVALID'
  ]) assert.ok((binding+execution).includes(marker),marker);
  assert.match(execution,/items\.length>5000/);
  assert.match(execution,/stageOrder\.join\(','\)!=='contacts,companies,transactions'/);
});

test('snapshot and mapping fail closed for duplicates, dangling links and unsafe money precision',()=>{
  assert.match(snapshot,/duplicateRecordKeys/);
  assert.match(snapshot,/danglingLinks/);
  assert.match(mapping,/LEGACY_MAPPING_NUMBER_PRECISION_UNSAFE/);
  assert.match(ordered,/LEGACY_ORDERED_IMPORT_DUPLICATE_KEYS/);
  assert.match(ordered,/LEGACY_ORDERED_IMPORT_DANGLING_LINKS/);
});

test('production reconciliation authority remains authenticated-only, owner-bound and non-repairing',()=>{
  for(const sql of [a2,a3]){
    assert.match(sql,/security invoker/);
    assert.match(sql,/revoke all on function/);
    assert.match(sql,/grant execute on function[\s\S]*to authenticated/);
    assert.match(sql,/private\.is_workspace_owner/);
  }
  assert.match(a2,/5000/);
  assert.match(a3,/5000/);
  assert.doesNotMatch(a2,/\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/);
  assert.doesNotMatch(a3,/\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/);
});
