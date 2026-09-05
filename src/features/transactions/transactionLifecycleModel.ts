import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type TransactionLifecycleAction = 'archive' | 'restore' | 'reactivate';

export const TRANSACTION_LIFECYCLE_NOTE_MAX_LENGTH = 600;

export interface TransactionLifecycleCapabilities {
  readonly archived: boolean;
  readonly completed: boolean;
  readonly deleted: boolean;
  readonly canArchive: boolean;
  readonly canRestore: boolean;
  readonly canReactivate: boolean;
}

export interface TransactionLifecyclePatch {
  readonly archived_at?: string | null;
  readonly completed_at?: string | null;
  readonly status?: string;
  readonly updated_at: string;
  readonly last_activity_at: string;
}

export class TransactionLifecycleRuleError extends Error {
  readonly action: TransactionLifecycleAction;

  constructor(action: TransactionLifecycleAction, message: string) {
    super(message);
    this.name = 'TransactionLifecycleRuleError';
    this.action = action;
  }
}

function completed(row: RowOf<'transactions'>): boolean {
  return row.status.trim().toLowerCase() === 'completed' || row.completed_at !== null;
}

export function transactionLifecycleCapabilities(row: RowOf<'transactions'>): TransactionLifecycleCapabilities {
  const deleted = row.deleted_at !== null;
  const archived = row.archived_at !== null;
  const isCompleted = completed(row);
  return Object.freeze({
    archived,
    completed: isCompleted,
    deleted,
    canArchive: !deleted && !archived,
    canRestore: !deleted && archived,
    canReactivate: !deleted && isCompleted,
  });
}

export function normalizeTransactionLifecycleNote(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (normalized.length > TRANSACTION_LIFECYCLE_NOTE_MAX_LENGTH) {
    throw new Error(`Lifecycle note exceeds ${TRANSACTION_LIFECYCLE_NOTE_MAX_LENGTH} characters`);
  }
  return normalized;
}

export function buildTransactionLifecyclePatch(
  row: RowOf<'transactions'>,
  action: TransactionLifecycleAction,
  now = new Date(),
): TransactionLifecyclePatch {
  const capability = transactionLifecycleCapabilities(row);
  if (capability.deleted) throw new TransactionLifecycleRuleError(action, 'Deleted transactions cannot be mutated by the lifecycle flow');

  const timestamp = now.toISOString();
  if (action === 'archive') {
    if (!capability.canArchive) throw new TransactionLifecycleRuleError(action, 'Transaction is already archived');
    return Object.freeze({ archived_at: timestamp, updated_at: timestamp, last_activity_at: timestamp });
  }

  if (action === 'restore') {
    if (!capability.canRestore) throw new TransactionLifecycleRuleError(action, 'Transaction is not archived');
    return Object.freeze({ archived_at: null, updated_at: timestamp, last_activity_at: timestamp });
  }

  if (!capability.canReactivate) throw new TransactionLifecycleRuleError(action, 'Only completed transactions can be reactivated');
  return Object.freeze({
    status: 'active',
    completed_at: null,
    archived_at: null,
    updated_at: timestamp,
    last_activity_at: timestamp,
  });
}

export function transactionLifecycleSummary(action: TransactionLifecycleAction, previous: RowOf<'transactions'>): string {
  if (action === 'archive') return `أرشفة المعاملة: ${previous.type}`;
  if (action === 'restore') {
    return completed(previous)
      ? `إلغاء أرشفة معاملة مكتملة دون إعادة تنشيطها: ${previous.type}`
      : `استعادة المعاملة من الأرشيف: ${previous.type}`;
  }
  return `إعادة تنشيط المعاملة المكتملة: ${previous.type}`;
}
