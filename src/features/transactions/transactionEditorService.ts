import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import type { ReadRepository } from '../../data/repositories/createEntityRepository.ts';
import {
  normalizeTransactionEditorDraft,
  type TransactionEditorDraft,
  type TransactionEditorMode,
  type TransactionEditorSource,
} from './transactionEditorModel.ts';

const EDITOR_BATCH_SIZE = 100;
const EDITOR_ENTITY_LIMIT = 2_000;
const EDITOR_RELATION_LIMIT = 5_000;

export type TransactionEditorWarningCode =
  | 'fee-history-unconfirmed'
  | 'station-history-unconfirmed'
  | 'note-history-unconfirmed'
  | 'activity-history-unconfirmed';

export interface TransactionEditorWarning {
  readonly code: TransactionEditorWarningCode;
  readonly message: string;
  readonly outcomeUnknown: boolean;
}

export interface TransactionEditorLoadResult {
  readonly workspaceId: string;
  readonly source: TransactionEditorSource;
}

export interface TransactionEditorSaveResult {
  readonly transaction: RowOf<'transactions'>;
  readonly warnings: readonly TransactionEditorWarning[];
}

export class TransactionEditorWorkspaceUnavailableError extends Error {
  constructor() {
    super('No ENJAZ workspace is available for the authenticated user');
    this.name = 'TransactionEditorWorkspaceUnavailableError';
  }
}

export class TransactionEditorNotFoundError extends Error {
  constructor() {
    super('Transaction does not exist in the authenticated workspace');
    this.name = 'TransactionEditorNotFoundError';
  }
}

export class TransactionEditorConflictError extends Error {
  constructor(message = 'Transaction changed after the editor source was loaded') {
    super(message);
    this.name = 'TransactionEditorConflictError';
  }
}

export class TransactionEditorCapacityError extends Error {
  constructor(entity: string) {
    super(`Transaction editor ${entity} source exceeded its safe capacity`);
    this.name = 'TransactionEditorCapacityError';
  }
}

async function collectRows<T extends 'companies' | 'contacts' | 'company_contacts'>(
  repository: ReadRepository<T>,
  request: Parameters<ReadRepository<T>['list']>[0],
  limit: number,
  entity: string,
): Promise<readonly RowOf<T>[]> {
  const rows: RowOf<T>[] = [];
  let offset = 0;
  for (;;) {
    const page = await repository.list({ ...request, offset, limit: EDITOR_BATCH_SIZE });
    rows.push(...page.items);
    if (rows.length > limit) throw new TransactionEditorCapacityError(entity);
    if (!page.hasMore) return Object.freeze(rows);
    if (page.items.length === 0) throw new Error(`Non-progressing ${entity} editor source page`);
    offset += page.items.length;
  }
}

async function loadEditorRelations(layer: EnjazWorkspaceDataLayer): Promise<Readonly<{
  companies: readonly RowOf<'companies'>[];
  contacts: readonly RowOf<'contacts'>[];
  companyContacts: readonly RowOf<'company_contacts'>[];
}>> {
  const [companies, contacts, companyContacts] = await Promise.all([
    collectRows(layer.companies, {
      filters: [
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'neq', value: 'merged' },
      ],
      orderBy: [{ column: 'legal_name', ascending: true }],
    }, EDITOR_ENTITY_LIMIT, 'company'),
    collectRows(layer.contacts, {
      filters: [
        { column: 'deleted_at', operator: 'is', value: null },
        { column: 'status', operator: 'neq', value: 'merged' },
      ],
      orderBy: [{ column: 'display_name', ascending: true }],
    }, EDITOR_ENTITY_LIMIT, 'contact'),
    collectRows(layer.companyContacts, {
      orderBy: [{ column: 'created_at', ascending: true }],
    }, EDITOR_RELATION_LIMIT, 'company-contact relation'),
  ]);
  return Object.freeze({ companies, contacts, companyContacts });
}

export async function loadTransactionEditorSource(
  factory: EnjazDataLayerFactory,
  userId: string,
  transactionId: string | null,
): Promise<TransactionEditorLoadResult> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new TransactionEditorWorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);
  const relations = await loadEditorRelations(layer);

  let transaction: RowOf<'transactions'> | null = null;
  let latestRoute: RowOf<'transaction_routes'> | null = null;
  if (transactionId) {
    transaction = await layer.transactions.getById(transactionId);
    if (!transaction || transaction.deleted_at) throw new TransactionEditorNotFoundError();
    const routePage = await layer.transactionRoutes.list({
      filters: [{ column: 'transaction_id', operator: 'eq', value: transactionId }],
      orderBy: [{ column: 'occurred_at', ascending: false }],
      offset: 0,
      limit: 1,
    });
    latestRoute = routePage.items[0] ?? null;
  }

  return Object.freeze({
    workspaceId,
    source: Object.freeze({ ...relations, transaction, latestRoute }),
  });
}

function warningFromFailure(code: TransactionEditorWarningCode, message: string, error: unknown): TransactionEditorWarning {
  return Object.freeze({
    code,
    message,
    outcomeUnknown: error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN',
  });
}

function routeChanged(source: TransactionEditorSource, stationName: string | null, assignedToText: string | null): boolean {
  if (!stationName) return false;
  const route = source.latestRoute;
  if (!route) return true;
  return route.station_name.trim() !== stationName || (route.assigned_to_text?.trim() || null) !== assignedToText;
}

function changesSummary(previous: RowOf<'transactions'> | null, next: RowOf<'transactions'>): string {
  if (!previous) return `إنشاء معاملة: ${next.type}`;
  const labels: string[] = [];
  if (previous.company_id !== next.company_id) labels.push('الشركة');
  if (previous.primary_contact_id !== next.primary_contact_id) labels.push('جهة الاتصال');
  if (previous.type !== next.type) labels.push('النوع');
  if (previous.department !== next.department) labels.push('الجهة');
  if (previous.status !== next.status) labels.push('الحالة');
  if (previous.priority !== next.priority) labels.push('الأولوية');
  if (Math.round(previous.current_fee * 100) !== Math.round(next.current_fee * 100)) labels.push('الأتعاب');
  return labels.length ? `تعديل المعاملة: ${labels.join('، ')}` : 'حفظ المعاملة دون تغيير في الحقول الأساسية';
}

export async function saveTransactionEditorDraft(
  factory: EnjazDataLayerFactory,
  userId: string,
  loaded: TransactionEditorLoadResult,
  mode: TransactionEditorMode,
  draft: TransactionEditorDraft,
  actorUserId: string | null,
  now = new Date(),
): Promise<TransactionEditorSaveResult> {
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId || workspaceId !== loaded.workspaceId) throw new TransactionEditorWorkspaceUnavailableError();
  const layer = factory.forWorkspace(workspaceId);
  const normalized = normalizeTransactionEditorDraft(draft, loaded.source, mode, now);
  const previous = loaded.source.transaction;
  const timestamp = now.toISOString();

  let saved: RowOf<'transactions'>;
  if (mode === 'create') {
    saved = await layer.transactions.create({
      company_id: normalized.companyId,
      primary_contact_id: normalized.primaryContactId,
      type: normalized.type,
      department: normalized.department,
      status: normalized.status,
      priority: normalized.priority,
      current_fee: normalized.currentFee,
      last_activity_at: timestamp,
      completed_at: normalized.completedAt,
    });
  } else {
    if (!previous) throw new TransactionEditorNotFoundError();
    const latest = await layer.transactions.getById(previous.id);
    if (!latest || latest.deleted_at) throw new TransactionEditorNotFoundError();
    if (latest.archived_at) throw new TransactionEditorConflictError('Archived transactions require the Phase 5.4 lifecycle flow');
    if (latest.updated_at !== previous.updated_at) throw new TransactionEditorConflictError();
    saved = await layer.transactions.update(previous.id, {
      company_id: normalized.companyId,
      primary_contact_id: normalized.primaryContactId,
      type: normalized.type,
      department: normalized.department,
      status: normalized.status,
      priority: normalized.priority,
      current_fee: normalized.currentFee,
      completed_at: normalized.completedAt,
      updated_at: timestamp,
      last_activity_at: timestamp,
    });
  }

  const warnings: TransactionEditorWarning[] = [];
  const feeChanged = previous && Math.round(previous.current_fee * 100) !== Math.round(saved.current_fee * 100);
  if (feeChanged) {
    try {
      await layer.feeChanges.create({
        transaction_id: saved.id,
        previous_fee: previous.current_fee,
        new_fee: saved.current_fee,
        reason: normalized.feeChangeReason ?? 'سبب غير متاح',
        effective_at: timestamp,
        actor_user_id: actorUserId,
      });
    } catch (error: unknown) {
      warnings.push(warningFromFailure('fee-history-unconfirmed', 'تم حفظ قيمة الأتعاب الأساسية لكن لم يتم تأكيد سجل سبب التغيير. لا تعد الإرسال قبل مراجعة السجل.', error));
    }
  }

  if (routeChanged(loaded.source, normalized.stationName, normalized.assignedToText) && normalized.stationName && normalized.stationOccurredAt) {
    try {
      await layer.transactionRoutes.create({
        transaction_id: saved.id,
        station_name: normalized.stationName,
        assigned_to_text: normalized.assignedToText,
        occurred_at: normalized.stationOccurredAt,
        created_by: actorUserId,
      });
    } catch (error: unknown) {
      warnings.push(warningFromFailure('station-history-unconfirmed', 'تم حفظ المعاملة لكن لم يتم تأكيد إضافة محطة العمل الجديدة.', error));
    }
  }

  if (normalized.noteBody) {
    try {
      await layer.transactionNotes.create({
        transaction_id: saved.id,
        body: normalized.noteBody,
        created_by: actorUserId,
      });
    } catch (error: unknown) {
      warnings.push(warningFromFailure('note-history-unconfirmed', 'تم حفظ المعاملة لكن لم يتم تأكيد إضافة الملاحظة الجديدة.', error));
    }
  }

  try {
    await layer.transactionActivity.create({
      transaction_id: saved.id,
      event_type: mode === 'create' ? 'transaction_created' : 'transaction_updated',
      summary: changesSummary(previous, saved),
      occurred_at: timestamp,
      source_entity_type: 'transaction',
      source_entity_id: saved.id,
      metadata: {
        mode,
        company_id: saved.company_id,
        status: saved.status,
        priority: saved.priority,
      },
      actor_user_id: actorUserId,
    });
  } catch (error: unknown) {
    warnings.push(warningFromFailure('activity-history-unconfirmed', 'تم حفظ المعاملة لكن لم يتم تأكيد سجل النشاط الخاص بعملية الحفظ.', error));
  }

  return Object.freeze({ transaction: saved, warnings: Object.freeze(warnings) });
}
