import type { EnjazSupabaseClient } from '../core/supabase/client.ts';
import { createWorkspaceScope, type WorkspaceScope } from './contracts/dataTypes.ts';
import {
  createAppendOnlyRepository, createMutableRepository, createReadRepository,
  type AppendOnlyRepository, type MutableRepository, type ReadRepository,
} from './repositories/createEntityRepository.ts';
import { createSupabaseDataGateway } from './supabase/SupabaseDataGateway.ts';

export interface EnjazWorkspaceDataLayer {
  readonly scope: WorkspaceScope;

  readonly contacts: MutableRepository<'contacts'>;
  readonly companies: MutableRepository<'companies'>;
  readonly companyContacts: MutableRepository<'company_contacts'>;
  readonly transactions: MutableRepository<'transactions'>;
  readonly followups: MutableRepository<'transaction_followups'>;
  readonly blockers: MutableRepository<'transaction_blockers'>;
  readonly documents: ReadRepository<'documents'>;
  readonly cashboxes: MutableRepository<'cashbox_accounts'>;
  readonly calendar: MutableRepository<'calendar_events'>;
  readonly renewals: MutableRepository<'renewals'>;
  readonly workflowItemStates: MutableRepository<'workflow_item_states'>;

  readonly transactionRoutes: AppendOnlyRepository<'transaction_routes'>;
  readonly transactionNotes: AppendOnlyRepository<'transaction_notes'>;
  readonly workflowInstances: ReadRepository<'workflow_instances'>;

  readonly lifecycleEvents: AppendOnlyRepository<'entity_lifecycle_events'>;
  readonly transactionActivity: AppendOnlyRepository<'transaction_activity'>;
  readonly payments: AppendOnlyRepository<'payments'>;
  readonly paymentReversals: AppendOnlyRepository<'payment_reversals'>;
  readonly feeChanges: AppendOnlyRepository<'fee_changes'>;
  readonly ledger: AppendOnlyRepository<'financial_ledger_entries'>;

  readonly automationRuns: ReadRepository<'automation_runs'>;
  readonly intelligenceSnapshots: ReadRepository<'intelligence_snapshots'>;
  readonly notificationDeliveries: ReadRepository<'notification_deliveries'>;
  readonly auditEvents: ReadRepository<'audit_events'>;
  readonly importJobs: ReadRepository<'import_jobs'>;
}

export interface EnjazRpcResult<T = unknown> {
  readonly data: T | null;
  readonly error: unknown | null;
}

export interface EnjazDataLayerFactory {
  resolveWorkspaceId(userId: string): Promise<string | null>;
  forWorkspace(workspaceId: string): EnjazWorkspaceDataLayer;
  rpc?<T = unknown>(functionName: string, args?: Record<string, unknown>): Promise<EnjazRpcResult<T>>;
  edge?(functionName: string, init?: RequestInit): Promise<Response>;
}

export function createEnjazDataLayerFactory(client: EnjazSupabaseClient): EnjazDataLayerFactory {
  const gateway = createSupabaseDataGateway(client);
  return Object.freeze({
    resolveWorkspaceId(userId: string) {
      return gateway.resolveWorkspaceIdForUser(userId);
    },
    forWorkspace(workspaceId: string): EnjazWorkspaceDataLayer {
      const scope = createWorkspaceScope(workspaceId);
      return Object.freeze({
        scope,
        contacts: createMutableRepository(gateway, scope, 'contacts'),
        companies: createMutableRepository(gateway, scope, 'companies'),
        companyContacts: createMutableRepository(gateway, scope, 'company_contacts'),
        transactions: createMutableRepository(gateway, scope, 'transactions'),
        followups: createMutableRepository(gateway, scope, 'transaction_followups'),
        blockers: createMutableRepository(gateway, scope, 'transaction_blockers'),
        documents: createReadRepository(gateway, scope, 'documents'),
        cashboxes: createMutableRepository(gateway, scope, 'cashbox_accounts'),
        calendar: createMutableRepository(gateway, scope, 'calendar_events'),
        renewals: createMutableRepository(gateway, scope, 'renewals'),
        workflowItemStates: createMutableRepository(gateway, scope, 'workflow_item_states'),

        transactionRoutes: createAppendOnlyRepository(gateway, scope, 'transaction_routes'),
        transactionNotes: createAppendOnlyRepository(gateway, scope, 'transaction_notes'),
        workflowInstances: createReadRepository(gateway, scope, 'workflow_instances'),

        lifecycleEvents: createAppendOnlyRepository(gateway, scope, 'entity_lifecycle_events'),
        transactionActivity: createAppendOnlyRepository(gateway, scope, 'transaction_activity'),
        payments: createAppendOnlyRepository(gateway, scope, 'payments'),
        paymentReversals: createAppendOnlyRepository(gateway, scope, 'payment_reversals'),
        feeChanges: createAppendOnlyRepository(gateway, scope, 'fee_changes'),
        ledger: createAppendOnlyRepository(gateway, scope, 'financial_ledger_entries'),

        automationRuns: createReadRepository(gateway, scope, 'automation_runs'),
        intelligenceSnapshots: createReadRepository(gateway, scope, 'intelligence_snapshots'),
        notificationDeliveries: createReadRepository(gateway, scope, 'notification_deliveries'),
        auditEvents: createReadRepository(gateway, scope, 'audit_events'),
        importJobs: createReadRepository(gateway, scope, 'import_jobs'),
      });
    },
    async rpc<T = unknown>(functionName: string, args: Record<string, unknown> = {}): Promise<EnjazRpcResult<T>> {
      const result = await client.rpc(functionName, args);
      return Object.freeze({ data: result.data as T | null, error: result.error ?? null });
    },
    edge(functionName: string, init?: RequestInit) {
      return client.edge(functionName, init);
    },
  });
}
