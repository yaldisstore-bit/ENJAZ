import { parseLegacyOrderedImportExecutionManifest } from './legacyOrderedImportExecution.ts';
import { buildLegacyReconciliationPlan } from './legacyReconciliationPlan.ts';

export const LEGACY_RECONCILIATION_READBACK_REQUEST_SCHEMA =
  'enjaz.legacy.reconciliation.readback-request.v1' as const;
export const LEGACY_RECONCILIATION_READBACK_SCHEMA =
  'enjaz.legacy.reconciliation.readback.v1' as const;

/**
 * A2 prepares a narrowly bound, caller-JWT Supabase RPC invocation.
 * It does not execute the RPC, accept client-supplied permission attestations,
 * or make an A3 equivalence claim. The SQL RPC independently checks the owner,
 * workspace, batch, idempotency key and the durable Phase 13.3 payload hash.
 * Only trusted server/DB code may use the returned evidence for A3.
 */
export function prepareLegacyReconciliationReadbackRequest(value: unknown) {
  const plan = buildLegacyReconciliationPlan(value);
  const manifest = parseLegacyOrderedImportExecutionManifest(value);
  return {
    schema: LEGACY_RECONCILIATION_READBACK_REQUEST_SCHEMA,
    responseSchema: LEGACY_RECONCILIATION_READBACK_SCHEMA,
    functionName: 'read_legacy_import_reconciliation_v1' as const,
    args: {
      p_workspace_id: plan.workspaceId,
      p_batch_id: plan.batchId,
      p_idempotency_key: plan.idempotencyKey,
      p_manifest: manifest,
    },
    expectedRowCount: plan.expectedCounts.total,
    callerJwtRequired: true as const,
    workspacePermissionVerified: false as const,
    actualDatabaseReadPerformed: false as const,
    importedDataVerified: false as const,
    reconciliationPerformed: false as const,
    dataMutationPerformed: false as const,
    mayTrustCallerProvidedReadback: false as const,
    eligibleForA3Reconciliation: false as const,
  };
}
