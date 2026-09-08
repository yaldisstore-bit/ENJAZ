import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import type { FieldEvidenceType, FieldFailureReason, FieldLocationEvidence, FieldOperationsCommandGateway, FieldVisitOutcome } from './fieldOperationsCommands.ts';

export type FieldOfflineOperation =
  | Readonly<{ kind: 'check_in'; operationId: string; workspaceId: string; assignmentId: string; expectedAssignmentVersion: number; location: FieldLocationEvidence | null; queuedAt: string }>
  | Readonly<{ kind: 'check_out'; operationId: string; workspaceId: string; visitId: string; expectedVisitVersion: number; outcome: FieldVisitOutcome; failureReason: FieldFailureReason | null; outcomeNote: string | null; counterDepartment: string | null; officialReference: string | null; officialFeePaid: string | null; location: FieldLocationEvidence | null; queuedAt: string }>
  | Readonly<{ kind: 'evidence'; operationId: string; workspaceId: string; visitId: string; expectedVisitVersion: number; evidenceType: FieldEvidenceType; documentId: string | null; note: string | null; queuedAt: string }>
  | Readonly<{ kind: 'handoff'; operationId: string; workspaceId: string; assignmentId: string; expectedVersion: number; note: string; queuedAt: string }>
  | Readonly<{ kind: 'reassign'; operationId: string; workspaceId: string; assignmentId: string; expectedVersion: number; assignedUserId: string; reason: string; queuedAt: string }>;

export interface FieldOfflineQueueItem {
  readonly operation: FieldOfflineOperation;
  readonly state: 'pending' | 'blocked';
  readonly attempts: number;
  readonly lastError: string | null;
}

export interface FieldOfflineQueue {
  list(workspaceId: string): readonly FieldOfflineQueueItem[];
  enqueue(operation: FieldOfflineOperation): void;
  remove(workspaceId: string, operationId: string): void;
  markFailure(workspaceId: string, operationId: string, error: string, blocked: boolean): void;
  clear(workspaceId: string): void;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY_PREFIX = 'enjaz.field-operations.offline.v1.';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function key(workspaceId: string) { return `${KEY_PREFIX}${workspaceId}`; }
function validOperation(value: unknown): value is FieldOfflineOperation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Readonly<Record<string, unknown>>;
  return typeof row.kind === 'string' && typeof row.operationId === 'string' && UUID_PATTERN.test(row.operationId) && typeof row.workspaceId === 'string' && UUID_PATTERN.test(row.workspaceId) && typeof row.queuedAt === 'string';
}
function readItems(storage: StorageLike, workspaceId: string): FieldOfflineQueueItem[] {
  try {
    const raw = storage.getItem(key(workspaceId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
      const row = candidate as Readonly<Record<string, unknown>>;
      if (!validOperation(row.operation) || row.operation.workspaceId !== workspaceId) return [];
      const attempts = typeof row.attempts === 'number' && Number.isSafeInteger(row.attempts) && row.attempts >= 0 ? row.attempts : 0;
      return [{ operation: row.operation, state: row.state === 'blocked' ? 'blocked' as const : 'pending' as const, attempts, lastError: typeof row.lastError === 'string' ? row.lastError : null }];
    });
  } catch { return []; }
}
function writeItems(storage: StorageLike, workspaceId: string, items: readonly FieldOfflineQueueItem[]) {
  if (items.length === 0) storage.removeItem(key(workspaceId));
  else storage.setItem(key(workspaceId), JSON.stringify(items));
}
function resolveDefaultStorage(): StorageLike {
  const storage = (globalThis as typeof globalThis & { localStorage?: StorageLike }).localStorage;
  if (!storage) throw new Error('Field offline storage is unavailable in this runtime');
  return storage;
}

export function createFieldOfflineQueue(storage?: StorageLike): FieldOfflineQueue {
  const resolvedStorage = storage ?? resolveDefaultStorage();
  const queue: FieldOfflineQueue = {
    list(workspaceId) { return Object.freeze(readItems(resolvedStorage, workspaceId)); },
    enqueue(operation) {
      if (!validOperation(operation)) throw new Error('Invalid field offline operation');
      if (operation.kind === 'evidence' && operation.documentId === null && operation.evidenceType !== 'other') throw new Error('Offline queue never stores file bytes; canonical document id is required first');
      const items = readItems(resolvedStorage, operation.workspaceId);
      const existing = items.find((item) => item.operation.operationId === operation.operationId);
      if (existing) {
        if (JSON.stringify(existing.operation) !== JSON.stringify(operation)) throw new Error('Field offline operation id conflict');
        return;
      }
      writeItems(resolvedStorage, operation.workspaceId, [...items, { operation, state: 'pending', attempts: 0, lastError: null }]);
    },
    remove(workspaceId, operationId) { writeItems(resolvedStorage, workspaceId, readItems(resolvedStorage, workspaceId).filter((item) => item.operation.operationId !== operationId)); },
    markFailure(workspaceId, operationId, error, blocked) {
      writeItems(resolvedStorage, workspaceId, readItems(resolvedStorage, workspaceId).map((item) => item.operation.operationId === operationId ? { ...item, state: blocked ? 'blocked' : 'pending', attempts: item.attempts + 1, lastError: error.slice(0, 600) } : item));
    },
    clear(workspaceId) { resolvedStorage.removeItem(key(workspaceId)); },
  };
  return Object.freeze(queue);
}

async function replay(gateway: FieldOperationsCommandGateway, operation: FieldOfflineOperation) {
  switch (operation.kind) {
    case 'check_in': return gateway.checkIn(operation.workspaceId, operation.assignmentId, operation.expectedAssignmentVersion, operation.location, operation.operationId);
    case 'check_out': return gateway.checkOut({ workspaceId: operation.workspaceId, visitId: operation.visitId, expectedVisitVersion: operation.expectedVisitVersion, outcome: operation.outcome, failureReason: operation.failureReason, outcomeNote: operation.outcomeNote, counterDepartment: operation.counterDepartment, officialReference: operation.officialReference, officialFeePaid: operation.officialFeePaid, location: operation.location, clientOperationId: operation.operationId });
    case 'evidence': return gateway.addEvidence(operation.workspaceId, operation.visitId, operation.expectedVisitVersion, operation.evidenceType, operation.documentId, operation.note, operation.operationId);
    case 'handoff': return gateway.handoff(operation.workspaceId, operation.assignmentId, operation.expectedVersion, operation.note, operation.operationId);
    case 'reassign': return gateway.reassign(operation.workspaceId, operation.assignmentId, operation.expectedVersion, operation.assignedUserId, operation.reason, operation.operationId);
  }
}

export interface FieldOfflineSyncResult {
  readonly synced: number;
  readonly remaining: number;
  readonly blockedOperationId: string | null;
  readonly outcomeUnknown: boolean;
}

export async function syncFieldOfflineQueue(queue: FieldOfflineQueue, gateway: FieldOperationsCommandGateway, workspaceId: string): Promise<FieldOfflineSyncResult> {
  let synced = 0;
  let blockedOperationId: string | null = null;
  let outcomeUnknown = false;
  const items = queue.list(workspaceId);
  for (const item of items) {
    if (item.state === 'blocked') { blockedOperationId = item.operation.operationId; break; }
    try {
      await replay(gateway, item.operation);
      queue.remove(workspaceId, item.operation.operationId);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Field offline sync failed';
      const unknown = error instanceof DataAccessError && error.dataCode === 'DATA_OUTCOME_UNKNOWN';
      const retryable = error instanceof DataAccessError && (error.dataCode === 'DATA_UNAVAILABLE' || error.dataCode === 'DATA_OUTCOME_UNKNOWN');
      queue.markFailure(workspaceId, item.operation.operationId, message, !retryable);
      outcomeUnknown = unknown;
      if (!retryable) blockedOperationId = item.operation.operationId;
      break;
    }
  }
  return Object.freeze({ synced, remaining: queue.list(workspaceId).length, blockedOperationId, outcomeUnknown });
}
