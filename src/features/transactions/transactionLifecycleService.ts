import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import {
  buildTransactionLifecyclePatch,
  normalizeTransactionLifecycleNote,
  transactionLifecycleSummary,
  type TransactionLifecycleAction,
} from './transactionLifecycleModel.ts';

const FOLLOWUP_BATCH_SIZE = 100;
const FOLLOWUP_SAFE_LIMIT = 5_000;

export type TransactionLifecycleWarningCode = 'activity-history-unconfirmed';

export interface TransactionLifecycleWarning {
  readonly code: TransactionLifecycleWarningCode;
  readonly message: string;
  readonly outcomeUnknown: boolean;
}

export interface TransactionLifecycleLoadResult {
  readonly workspaceId: string;
  readonly transaction: RowOf<'transactions'>;
  readonly openFollowupCount: number;
}

export interface TransactionLifecycleMutationResult {
  readonly transaction: RowOf<'transactions'>;
  readonly action: TransactionLifecycleAction;
  readonly preservedOpenFollowupCount: number;
  readonly warnings: readonly TransactionLifecycleWarning[];
}

export class TransactionLifecycleWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'TransactionLifecycleWorkspaceUnavailableError';
  }
}

export class TransactionLifecycleNotFoundError extends Error {
  constructor() {
    super('Transaction does not exist in the authenticated workspace');
    this.name = 'TransactionLifecycleNotFoundError';
  }
}

export class TransactionLifecycleConflictError extends Error {
  constructor(message = 'Transaction changed after the lifecycle context was loaded') {
    super(message);
    this.name = 'TransactionLifecycleConflictError';
  }
}

export class TransactionLifecycleCapacityError extends Error {
  constructor() {
    super('Transaction lifecycle follow-up context exceeded its safe capacity');
    this.name = 'TransactionLifecycleCapacityError';
  }
}

async function countOpenFollowups(layer: EnjazWorkspaceDataLayer, transactionId: string): Promise<number> {
  let offset = 0;
  let count = 0;
  for (;;) {
    const page = await layer.followups.list({
      filters: [
        { column: 'transaction_id', operator: 'eq', value: transactionId },
        { column: 'status', operator: 'eq', value: 'open' },
      ],
      orderBy: [{ column: 'created_at', ascending: true }],
      offset,
      limit: FOLLOWUP_BATCH_SIZE,
    });
    count += page.items.length;
    if (count > FOLLOWUP_SAFE_LIMIT) throw new TransactionLifecycleCapacityError();
    if (!page.hasMore) return count;
    if (page.items.length === 0) throw new TransactionLifecycleCapacityError();
    offset += page.items.length;
  }
}

export async function loadTransactionLifecycleContext(
  factory: EnjazDataLayerFactory,
  userId: string,
  transactionId: string,
): Promise<TransactionLifecycleLoadResult> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new TransactionLifecycleWorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);
  const transaction = await layer.transactions.getById(transactionId);
  if (!transaction || transaction.deleted_at !== null) throw new TransactionLifecycleNotFoundError();
  const openFollowupCount = await countOpenFollowups(layer, transaction.id);
  return Object.freeze({ workspaceId, transaction, openFollowupCount });
}

function activityWarning(error: unknown): TransactionLifecycleWarning {
  return Object.freeze({
    code: 'activity-history-unconfirmed',
    message: 'تم تنفيذ تغيير دورة الحياة، لكن لم يتم تأكيد سجل النشاط. راجع المعاملة قبل إعادة الإجراء.',
    outcomeUnknown: error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN',
  });
}

export async function applyTransactionLifecycleAction(
  factory: EnjazDataLayerFactory,
  userId: string,
  loaded: TransactionLifecycleLoadResult,
  action: TransactionLifecycleAction,
  actorUserId: string | null,
  note?: string | null,
  now = new Date(),
): Promise<TransactionLifecycleMutationResult> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId || workspaceId !== loaded.workspaceId) throw new TransactionLifecycleWorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);
  const latest = await layer.transactions.getById(loaded.transaction.id);
  if (!latest || latest.deleted_at !== null) throw new TransactionLifecycleNotFoundError();
  if (latest.updated_at !== loaded.transaction.updated_at) throw new TransactionLifecycleConflictError();

  const normalizedNote = normalizeTransactionLifecycleNote(note);
  const patch = buildTransactionLifecyclePatch(latest, action, now);
  const saved = await layer.transactions.update(latest.id, patch);
  const warnings: TransactionLifecycleWarning[] = [];
  const timestamp = now.toISOString();

  try {
    await layer.transactionActivity.create({
      transaction_id: saved.id,
      event_type: `transaction_${action}`,
      summary: transactionLifecycleSummary(action, latest),
      occurred_at: timestamp,
      source_entity_type: 'transaction',
      source_entity_id: saved.id,
      metadata: {
        action,
        note: normalizedNote,
        previous_status: latest.status,
        previous_archived_at: latest.archived_at,
        previous_completed_at: latest.completed_at,
        next_status: saved.status,
        next_archived_at: saved.archived_at,
        next_completed_at: saved.completed_at,
        preserved_open_followups: loaded.openFollowupCount,
      },
      actor_user_id: actorUserId,
    });
  } catch (error: unknown) {
    warnings.push(activityWarning(error));
  }

  return Object.freeze({
    transaction: saved,
    action,
    preservedOpenFollowupCount: loaded.openFollowupCount,
    warnings: Object.freeze(warnings),
  });
}
