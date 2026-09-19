import { parseLegacyOrderedImportExecutionManifest } from './legacyOrderedImportExecution.ts';
import type { LegacyOrderedImportStageTable } from './legacyOrderedImportContract.ts';

export const LEGACY_RECONCILIATION_PLAN_SCHEMA = 'enjaz.legacy.reconciliation.plan.v1' as const;

export type LegacyReconciliationExpectedRow = {
  ordinal: number;
  targetTable: LegacyOrderedImportStageTable;
  targetId: string;
  sourceKey: string;
  workspaceId: string;
  legacySource: 'phase13.3';
  expectedNormalizedFields: Record<string, string | number | boolean | null>;
  expectedRelationshipIds: Record<string, string>;
};

export type LegacyReconciliationPlan = {
  schema: typeof LEGACY_RECONCILIATION_PLAN_SCHEMA;
  importManifestSchema: 'enjaz.legacy.ordered-import.execution-manifest.v1';
  snapshotId: string;
  mappingPlanId: string;
  workspaceId: string;
  batchId: string;
  idempotencyKey: string;
  stageOrder: readonly ['contacts', 'companies', 'transactions'];
  expectedCounts: { total: number; contacts: number; companies: number; transactions: number };
  expectedRows: LegacyReconciliationExpectedRow[];
  expectedRelationshipCount: number;
  deterministic: true;
  readOnly: true;
  actualDatabaseReadPerformed: false;
  importedDataVerified: false;
  sourceDataRepaired: false;
  targetMutationPerformed: false;
  persistencePerformed: false;
  databaseWriteAllowed: false;
  eligibleForA2Readback: true;
};

/**
 * A1 constructs an expectation from a *validated* 13.3 execution manifest.
 * It does not read the database or attest that the import actually occurred.
 * A2 must obtain an independently authenticated, workspace-scoped readback.
 */
export function buildLegacyReconciliationPlan(manifestValue: unknown): LegacyReconciliationPlan {
  const manifest = parseLegacyOrderedImportExecutionManifest(manifestValue);
  const expectedCounts = { total: manifest.items.length, contacts: 0, companies: 0, transactions: 0 };
  const relationsBySource = new Map<string, Record<string, string>>();
  for (const relation of manifest.relationshipBindings) {
    const bindings = relationsBySource.get(relation.sourceKey) ?? {};
    // Every FK may be bound once only; a duplicate/ambiguous source target is not a reconcilable plan.
    if (Object.hasOwn(bindings, relation.targetField)) {
      throw new Error('LEGACY_RECONCILIATION_AMBIGUOUS_RELATIONSHIP');
    }
    bindings[relation.targetField] = relation.targetTargetId;
    relationsBySource.set(relation.sourceKey, bindings);
  }

  const expectedRows = manifest.items.map((item): LegacyReconciliationExpectedRow => {
    expectedCounts[item.targetTable]++;
    return {
      ordinal: item.ordinal,
      targetTable: item.targetTable,
      targetId: item.targetId,
      sourceKey: item.sourceKey,
      workspaceId: manifest.workspaceId,
      legacySource: 'phase13.3',
      expectedNormalizedFields: { ...item.normalizedFields },
      expectedRelationshipIds: { ...(relationsBySource.get(item.sourceKey) ?? {}) },
    };
  });

  return {
    schema: LEGACY_RECONCILIATION_PLAN_SCHEMA,
    importManifestSchema: manifest.schema,
    snapshotId: manifest.snapshotId,
    mappingPlanId: manifest.mappingPlanId,
    workspaceId: manifest.workspaceId,
    batchId: manifest.batchId,
    idempotencyKey: manifest.idempotencyKey,
    stageOrder: ['contacts', 'companies', 'transactions'],
    expectedCounts,
    expectedRows,
    expectedRelationshipCount: manifest.relationshipBindings.length,
    deterministic: true,
    readOnly: true,
    actualDatabaseReadPerformed: false,
    importedDataVerified: false,
    sourceDataRepaired: false,
    targetMutationPerformed: false,
    persistencePerformed: false,
    databaseWriteAllowed: false,
    eligibleForA2Readback: true,
  };
}
