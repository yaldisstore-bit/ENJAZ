import type { PublicTableName, TableInsert, TableRow, TableUpdate } from '../../core/supabase/database.types.ts';

export const WORKSPACE_TABLES = [
  'workspace_memberships', 'contacts', 'companies', 'company_contacts', 'entity_lifecycle_events',
  'transactions', 'transaction_routes', 'transaction_notes', 'transaction_followups', 'transaction_activity',
  'transaction_blockers', 'transaction_dependencies', 'payments', 'payment_reversals', 'fee_changes',
  'financial_ledger_entries', 'cashbox_accounts', 'documents', 'document_versions', 'document_analysis',
  'document_templates', 'correspondence_registry', 'document_drafts', 'pdf_jobs', 'workspace_settings',
  'workflow_templates', 'workflow_template_stages', 'workflow_template_items', 'workflow_instances',
  'workflow_stage_states', 'workflow_item_states', 'calendar_events', 'renewals', 'communications',
  'saved_views', 'automation_rules', 'automation_runs', 'intelligence_snapshots', 'notification_preferences',
  'notification_deliveries', 'audit_events', 'sync_devices', 'import_jobs',
] as const satisfies readonly PublicTableName[];

export type WorkspaceTableName = typeof WORKSPACE_TABLES[number];

export const INSERTABLE_WORKSPACE_TABLES = [
  'workspace_memberships', 'contacts', 'companies', 'company_contacts', 'entity_lifecycle_events',
  'transactions', 'transaction_routes', 'transaction_notes', 'transaction_followups', 'transaction_activity',
  'transaction_blockers', 'transaction_dependencies', 'payments', 'payment_reversals', 'fee_changes',
  'financial_ledger_entries', 'cashbox_accounts', 'documents', 'document_versions', 'document_analysis',
  'document_templates', 'correspondence_registry', 'document_drafts', 'pdf_jobs', 'workspace_settings',
  'workflow_templates', 'workflow_template_stages', 'workflow_template_items', 'workflow_instances',
  'workflow_stage_states', 'workflow_item_states', 'calendar_events', 'renewals', 'communications',
  'saved_views', 'automation_rules', 'notification_preferences', 'sync_devices',
] as const satisfies readonly WorkspaceTableName[];

export type InsertableWorkspaceTableName = typeof INSERTABLE_WORKSPACE_TABLES[number];

export const UPDATABLE_WORKSPACE_TABLES = [
  'contacts', 'companies', 'company_contacts', 'transactions', 'transaction_routes', 'transaction_notes',
  'transaction_followups', 'transaction_blockers', 'transaction_dependencies', 'cashbox_accounts', 'documents',
  'document_versions', 'document_analysis', 'document_templates', 'correspondence_registry', 'document_drafts',
  'pdf_jobs', 'workspace_settings', 'workflow_templates', 'workflow_template_stages', 'workflow_template_items',
  'workflow_instances', 'workflow_stage_states', 'workflow_item_states', 'calendar_events', 'renewals',
  'communications', 'saved_views', 'automation_rules', 'notification_preferences', 'sync_devices',
] as const satisfies readonly WorkspaceTableName[];

export type UpdatableWorkspaceTableName = typeof UPDATABLE_WORKSPACE_TABLES[number];

export const ID_WORKSPACE_TABLES = WORKSPACE_TABLES.filter((table) => ![
  'workspace_memberships', 'workspace_settings', 'notification_preferences',
].includes(table)) as readonly Exclude<WorkspaceTableName, 'workspace_memberships' | 'workspace_settings' | 'notification_preferences'>[];

export type IdWorkspaceTableName = typeof ID_WORKSPACE_TABLES[number];

export type RowOf<T extends PublicTableName> = TableRow<T>;
export type InsertOf<T extends PublicTableName> = TableInsert<T>;
export type UpdateOf<T extends PublicTableName> = TableUpdate<T>;
export type ColumnOf<T extends PublicTableName> = Extract<keyof RowOf<T>, string>;

export interface WorkspaceScope {
  readonly workspaceId: string;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'in';

export interface DataFilter<T extends WorkspaceTableName> {
  readonly column: ColumnOf<T>;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export interface DataOrder<T extends WorkspaceTableName> {
  readonly column: ColumnOf<T>;
  readonly ascending?: boolean;
  readonly nullsFirst?: boolean;
}

export interface ListRequest<T extends WorkspaceTableName> {
  readonly filters?: readonly DataFilter<T>[];
  readonly orderBy?: readonly DataOrder<T>[];
  readonly offset?: number;
  readonly limit?: number;
}

export interface DataPage<T> {
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly total: number | null;
  readonly hasMore: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;

export function createWorkspaceScope(workspaceId: string): WorkspaceScope {
  const value = workspaceId.trim();
  if (!UUID_PATTERN.test(value)) throw new Error('Invalid workspace id');
  return Object.freeze({ workspaceId: value });
}

export function normalizeListWindow(offset = 0, limit = 50): Readonly<{ offset: number; limit: number }> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid data offset');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new Error('Invalid data page size');
  return Object.freeze({ offset, limit });
}

export function assertSafeColumn(column: string): void {
  if (!/^[a-z_][a-z0-9_]*$/.test(column)) throw new Error('Unsafe data column');
  if (column === 'workspace_id') throw new Error('workspace_id is controlled by the data layer');
}
