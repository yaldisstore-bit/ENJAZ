import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA } from '../src/features/import/legacyOrderedImportBinding.ts';
import {
  LEGACY_RECONCILIATION_READBACK_REQUEST_SCHEMA,
  LEGACY_RECONCILIATION_READBACK_SCHEMA,
  prepareLegacyReconciliationReadbackRequest,
} from '../src/features/import/legacyReconciliationReadback.ts';

const manifest = (): any => ({
  schema: LEGACY_ORDERED_IMPORT_EXECUTION_MANIFEST_SCHEMA,
  snapshotId: 'snapshot-phase134-a2',
  mappingPlanId: 'reviewed-map-phase134-a2',
  workspaceId: '11111111-1111-4111-8111-111111111111',
  batchId: '22222222-2222-4222-8222-222222222222',
  idempotencyKey: 'reviewed:batch:13-4:a2',
  stageOrder: ['contacts', 'companies', 'transactions'],
  items: [{
    ordinal: 1, stage: 1, sourceKey: 'person:p1',
    targetTable: 'contacts', targetId: '33333333-3333-4333-8333-333333333333',
    normalizedFields: { display_name: 'أحمد', contact_type: 'lawyer' }, writeAllowed: false,
  }],
  relationshipBindings: [],
  deterministic: true,
  workspacePermissionVerified: false,
  idempotencyBound: true,
  idempotencyEnforcementPerformed: false,
  targetIdsGenerated: false,
  foreignKeyBindingPerformed: true,
  foreignKeyAssignmentPerformed: false,
  persistencePerformed: false,
  importExecutionAllowed: false,
  targetMutationPerformed: false,
  readyForA3ExecutionBoundary: true,
});
const clone = (value: any): any => JSON.parse(JSON.stringify(value));

test('A2 binds exact reviewed manifest and declared workspace/batch/idempotency to a named read-only RPC', () => {
  const m = manifest();
  const request = prepareLegacyReconciliationReadbackRequest(m);
  assert.equal(request.schema, LEGACY_RECONCILIATION_READBACK_REQUEST_SCHEMA);
  assert.equal(request.responseSchema, LEGACY_RECONCILIATION_READBACK_SCHEMA);
  assert.equal(request.functionName, 'read_legacy_import_reconciliation_v1');
  assert.deepEqual(request.args, {
    p_workspace_id: m.workspaceId,
    p_batch_id: m.batchId,
    p_idempotency_key: m.idempotencyKey,
    p_manifest: m,
  });
  assert.equal(request.expectedRowCount, 1);
});

test('A2 never preclaims authenticated read, imported-data equality or A3 authority', () => {
  const request = prepareLegacyReconciliationReadbackRequest(manifest());
  assert.equal(request.callerJwtRequired, true);
  assert.equal(request.workspacePermissionVerified, false);
  assert.equal(request.actualDatabaseReadPerformed, false);
  assert.equal(request.importedDataVerified, false);
  assert.equal(request.reconciliationPerformed, false);
  assert.equal(request.dataMutationPerformed, false);
  assert.equal(request.mayTrustCallerProvidedReadback, false);
  assert.equal(request.eligibleForA3Reconciliation, false);
});

test('A2 request building is deterministic and does not mutate the supplied manifest', () => {
  const input = manifest();
  const before = JSON.stringify(input);
  assert.equal(JSON.stringify(prepareLegacyReconciliationReadbackRequest(input)),
    JSON.stringify(prepareLegacyReconciliationReadbackRequest(input)));
  assert.equal(JSON.stringify(input), before);
});

test('A2 rejects unauthorized workspace/readback preclaims and unknown control fields', () => {
  const rights = clone(manifest());
  rights.workspacePermissionVerified = true;
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(rights), /PERMISSION_PRECLAIM_FORBIDDEN/);
  const hidden = clone(manifest());
  hidden.skipLedgerBinding = true;
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(hidden), /MANIFEST_FIELD_FORBIDDEN/);
});

test('A2 rejects falsified target identity, batch or import-manifest lifecycle', () => {
  const id = clone(manifest());
  id.items[0].targetId = 'not-a-uuid';
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(id), /TARGET_ID_INVALID/);
  const batch = clone(manifest());
  batch.batchId = 'not-a-uuid';
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(batch), /BATCH_ID_INVALID/);
  const fake = clone(manifest());
  fake.persistencePerformed = true;
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(fake), /PERSISTENCE_PRECLAIM_FORBIDDEN/);
});

test('A2 rejects undeclared target fields and reordered legacy source items', () => {
  const extra = clone(manifest());
  extra.items[0].normalizedFields.admin = true;
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(extra), /TARGET_FIELD_FORBIDDEN/);
  const ordinal = clone(manifest());
  ordinal.items[0].ordinal = 2;
  assert.throws(() => prepareLegacyReconciliationReadbackRequest(ordinal), /ORDINAL_INVALID/);
});
