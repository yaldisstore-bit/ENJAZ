import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_SNAPSHOT_SCHEMA } from '../src/features/import/legacySnapshotContract.ts';
import { LEGACY_MAPPING_PLAN_SCHEMA } from '../src/features/import/legacyMappingContract.ts';
import { LEGACY_ORDERED_IMPORT_BINDING_SCHEMA, buildLegacyOrderedImportExecutionManifest } from '../src/features/import/legacyOrderedImportBinding.ts';
import { LEGACY_RECONCILIATION_PLAN_SCHEMA, buildLegacyReconciliationPlan } from '../src/features/import/legacyReconciliationPlan.ts';

const snapshot = (): any => ({
  schema: LEGACY_SNAPSHOT_SCHEMA, snapshotId: 'legacy-13-4-a1',
  source: { system: 'legacy' }, capturedAt: '2026-09-19T03:00:00Z',
  records: [
    { type: 'company', id: 'c1', fields: { name: 'شركة أ' }, links: [{ kind: 'primary_contact', targetType: 'person', targetId: 'p1' }] },
    { type: 'person', id: 'p1', fields: { name: 'أحمد' }, links: [] },
    { type: 'transaction', id: 't1', fields: { type: 'تعديل عقد', fee: 120.50 }, links: [
      { kind: 'company', targetType: 'company', targetId: 'c1' },
      { kind: 'contact', targetType: 'person', targetId: 'p1' },
    ] },
  ],
});
const mapping = (): any => ({
  schema: LEGACY_MAPPING_PLAN_SCHEMA, planId: 'map-a1-13-4',
  typeMappings: [
    { legacyType: 'company', targetTable: 'companies', fieldMappings: [{ sourceField: 'name', targetField: 'legal_name', normalize: 'trim_text' }] },
    { legacyType: 'person', targetTable: 'contacts', fieldMappings: [{ sourceField: 'name', targetField: 'display_name', normalize: 'trim_text' }] },
    { legacyType: 'transaction', targetTable: 'transactions', fieldMappings: [
      { sourceField: 'type', targetField: 'type', normalize: 'trim_text' },
      { sourceField: 'fee', targetField: 'current_fee', normalize: 'strict_number' },
    ] },
  ],
  relationshipMappings: [
    { sourceLegacyType: 'company', linkKind: 'primary_contact', targetLegacyType: 'person', targetField: 'primary_contact_id' },
    { sourceLegacyType: 'transaction', linkKind: 'company', targetLegacyType: 'company', targetField: 'company_id' },
    { sourceLegacyType: 'transaction', linkKind: 'contact', targetLegacyType: 'person', targetField: 'primary_contact_id' },
  ],
});
const binding = (): any => ({
  schema: LEGACY_ORDERED_IMPORT_BINDING_SCHEMA,
  workspaceId: '11111111-1111-4111-8111-111111111111',
  batchId: '22222222-2222-4222-8222-222222222222',
  idempotencyKey: 'legacy:batch:13-4:a1',
  bindings: [
    { sourceKey: 'person:p1', targetId: '33333333-3333-4333-8333-333333333333' },
    { sourceKey: 'company:c1', targetId: '44444444-4444-4444-8444-444444444444' },
    { sourceKey: 'transaction:t1', targetId: '55555555-5555-4555-8555-555555555555' },
  ],
});
const manifest = () => buildLegacyOrderedImportExecutionManifest(snapshot(), mapping(), binding());
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

test('A1 expects three exact lineage rows in certified dependency order', () => {
  const p = buildLegacyReconciliationPlan(manifest());
  assert.equal(p.schema, LEGACY_RECONCILIATION_PLAN_SCHEMA);
  assert.deepEqual(p.stageOrder, ['contacts', 'companies', 'transactions']);
  assert.deepEqual(p.expectedCounts, { total: 3, contacts: 1, companies: 1, transactions: 1 });
  assert.deepEqual(p.expectedRows.map(x => [x.ordinal, x.targetTable, x.sourceKey, x.targetId]), [
    [1, 'contacts', 'person:p1', '33333333-3333-4333-8333-333333333333'],
    [2, 'companies', 'company:c1', '44444444-4444-4444-8444-444444444444'],
    [3, 'transactions', 'transaction:t1', '55555555-5555-4555-8555-555555555555'],
  ]);
  assert.ok(p.expectedRows.every(x => x.workspaceId === p.workspaceId && x.legacySource === 'phase13.3'));
});

test('A1 preserves exact three explicit relationship targets without creating FKs', () => {
  const p = buildLegacyReconciliationPlan(manifest());
  assert.equal(p.expectedRelationshipCount, 3);
  assert.deepEqual(p.expectedRows[0]?.expectedRelationshipIds, {});
  assert.deepEqual(p.expectedRows[1]?.expectedRelationshipIds, { primary_contact_id: '33333333-3333-4333-8333-333333333333' });
  assert.deepEqual(p.expectedRows[2]?.expectedRelationshipIds, {
    company_id: '44444444-4444-4444-8444-444444444444',
    primary_contact_id: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(p.expectedRows[2]?.expectedNormalizedFields.current_fee, 120.5);
});

test('A1 is purely an expectation: never claims readback, successful migration or write', () => {
  const p = buildLegacyReconciliationPlan(manifest());
  assert.equal(p.readOnly, true);
  assert.equal(p.actualDatabaseReadPerformed, false);
  assert.equal(p.importedDataVerified, false);
  assert.equal(p.sourceDataRepaired, false);
  assert.equal(p.targetMutationPerformed, false);
  assert.equal(p.persistencePerformed, false);
  assert.equal(p.databaseWriteAllowed, false);
  assert.equal(p.eligibleForA2Readback, true);
});

test('A1 replay is byte-for-byte deterministic and cannot mutate the manifest', () => {
  const input = manifest(), before = JSON.stringify(input);
  assert.equal(JSON.stringify(buildLegacyReconciliationPlan(input)), JSON.stringify(buildLegacyReconciliationPlan(input)));
  assert.equal(JSON.stringify(input), before);
});

test('A1 rejects tampered target IDs, workspace authority and unknown fields via the Phase 13.3 parser', () => {
  const id: any = clone(manifest()); id.items[1].targetId = id.items[0].targetId;
  assert.throws(() => buildLegacyReconciliationPlan(id), /TARGET_ID_DUPLICATE/);
  const rights: any = clone(manifest()); rights.workspacePermissionVerified = true;
  assert.throws(() => buildLegacyReconciliationPlan(rights), /PERMISSION_PRECLAIM_FORBIDDEN/);
  const hidden: any = clone(manifest()); hidden.skipReconciliation = true;
  assert.throws(() => buildLegacyReconciliationPlan(hidden), /FIELD_FORBIDDEN/);
});

test('A1 rejects a second conflicting relationship for the same target field', () => {
  const m: any = clone(manifest());
  m.relationshipBindings.splice(1, 0, { ...m.relationshipBindings[0], targetKey: 'person:p1' });
  assert.throws(() => buildLegacyReconciliationPlan(m), /RELATION_DUPLICATE|AMBIGUOUS_RELATIONSHIP/);
});
