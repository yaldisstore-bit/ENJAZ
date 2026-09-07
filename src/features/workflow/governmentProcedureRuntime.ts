import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import {
  createGovernmentProcedureCommandGateway,
  type GovernmentProcedureCommandGateway,
  type GovernmentProcedureTransition,
} from './governmentProcedureCommands.ts';

export type WorkflowRuntimeStatus = 'active' | 'completed' | 'removed';
export type WorkflowStageRuntimeStatus = 'pending' | 'active' | 'completed' | 'reopened';
export type WorkflowItemRuntimeStatus = 'pending' | 'done' | 'waived' | 'skipped';

export interface WorkflowStageRuntimeState {
  readonly position: number;
  readonly status: WorkflowStageRuntimeStatus;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly overrideUsed: boolean;
  readonly overrideReason: string | null;
}

export interface WorkflowItemRuntimeState {
  readonly id: string;
  readonly templateItemKey: string;
  readonly stagePosition: number;
  readonly status: WorkflowItemRuntimeStatus;
  readonly required: boolean;
  readonly itemType: 'check' | 'document' | 'action';
  readonly title: string;
  readonly note: string | null;
  readonly completedAt: string | null;
}

export interface TransactionWorkflowInstanceContext {
  readonly instanceId: string;
  readonly procedureId: string;
  readonly branchId: string | null;
  readonly currentStagePosition: number;
  readonly status: WorkflowRuntimeStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly templateSnapshot: Readonly<Record<string, unknown>>;
  readonly pendingRequiredCount: number;
  readonly stageStates: readonly WorkflowStageRuntimeState[];
  readonly itemStates: readonly WorkflowItemRuntimeState[];
  readonly allowedTransitions: readonly GovernmentProcedureTransition[];
}

export interface TransactionWorkflowContext {
  readonly authority: 'canonical_workflow_instance';
  readonly transactionId: string;
  readonly instance: TransactionWorkflowInstanceContext | null;
}

export interface GovernmentProcedureRuntimeGateway extends GovernmentProcedureCommandGateway {
  loadTransactionContext(workspaceId: string, transactionId: string): Promise<TransactionWorkflowContext>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSITION_KEY_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;
const DEFAULT_TIMEOUT_MS = 15_000;

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.trim();
}
function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}
function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}
function requireString(value: unknown, label: string, max = 10_000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.trim();
}
function nullableString(value: unknown, label: string, max = 10_000): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireString(value, label, max);
}
function requireInteger(value: unknown, label: string, min = 0): number {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(numberValue) || numberValue < min) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return numberValue;
}
function nullableInteger(value: unknown, label: string, min = 0): number | null {
  if (value === null || value === undefined) return null;
  return requireInteger(value, label, min);
}
function nullableIso(value: unknown, label: string): string | null {
  const text = nullableString(value, label, 80);
  if (text === null) return null;
  if (!Number.isFinite(new Date(text).getTime())) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return text;
}
function parseRuntimeStatus(value: unknown): WorkflowRuntimeStatus {
  if (value === 'active' || value === 'completed' || value === 'removed') return value;
  throw new DataAccessError('Invalid workflow status', 'DATA_OPERATION_FAILED');
}
function parseStageStatus(value: unknown): WorkflowStageRuntimeStatus {
  if (value === 'pending' || value === 'active' || value === 'completed' || value === 'reopened') return value;
  throw new DataAccessError('Invalid workflow stage status', 'DATA_OPERATION_FAILED');
}
function parseItemStatus(value: unknown): WorkflowItemRuntimeStatus {
  if (value === 'pending' || value === 'done' || value === 'waived' || value === 'skipped') return value;
  throw new DataAccessError('Invalid workflow item status', 'DATA_OPERATION_FAILED');
}
function parseItemType(value: unknown): 'check' | 'document' | 'action' {
  if (value === 'check' || value === 'document' || value === 'action') return value;
  throw new DataAccessError('Invalid workflow item type', 'DATA_OPERATION_FAILED');
}
function parseTransition(value: unknown): GovernmentProcedureTransition {
  const row = requireRecord(value, 'allowed transition');
  const key = requireString(row.key, 'transition key', 80);
  const kind = row.kind;
  if (!TRANSITION_KEY_PATTERN.test(key) || (kind !== 'advance' && kind !== 'complete' && kind !== 'reopen')) throw new DataAccessError('Invalid allowed transition', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    key,
    label: requireString(row.label, 'transition label', 240),
    kind,
    fromStagePosition: requireInteger(row.fromStagePosition, 'transition source stage', 1),
    toStagePosition: nullableInteger(row.toStagePosition, 'transition target stage', 1),
    requiresReason: row.requiresReason === true,
  });
}
function parseContext(value: unknown): TransactionWorkflowContext {
  const row = requireRecord(value, 'transaction workflow context');
  if (row.authority !== 'canonical_workflow_instance') throw new DataAccessError('Unexpected workflow context authority', 'DATA_OPERATION_FAILED');
  const transactionId = requireUuid(row.transactionId, 'workflow context transaction id');
  if (row.instance === null) return Object.freeze({ authority: row.authority, transactionId, instance: null });
  const instance = requireRecord(row.instance, 'workflow instance context');
  const stageStates = requireArray(instance.stageStates, 'workflow stage states').map((item) => {
    const state = requireRecord(item, 'workflow stage state');
    return Object.freeze({
      position: requireInteger(state.position, 'stage position', 1),
      status: parseStageStatus(state.status),
      startedAt: nullableIso(state.startedAt, 'stage started at'),
      completedAt: nullableIso(state.completedAt, 'stage completed at'),
      overrideUsed: state.overrideUsed === true,
      overrideReason: nullableString(state.overrideReason, 'stage override reason', 600),
    });
  });
  const itemStates = requireArray(instance.itemStates, 'workflow item states').map((item) => {
    const state = requireRecord(item, 'workflow item state');
    return Object.freeze({
      id: requireUuid(state.id, 'workflow item state id'),
      templateItemKey: requireString(state.templateItemKey, 'workflow item template key', 180),
      stagePosition: requireInteger(state.stagePosition, 'workflow item stage position', 1),
      status: parseItemStatus(state.status),
      required: state.required === true,
      itemType: parseItemType(state.itemType),
      title: requireString(state.title, 'workflow item title', 320),
      note: nullableString(state.note, 'workflow item note', 2_000),
      completedAt: nullableIso(state.completedAt, 'workflow item completed at'),
    });
  });
  return Object.freeze({
    authority: row.authority,
    transactionId,
    instance: Object.freeze({
      instanceId: requireUuid(instance.instanceId, 'workflow instance id'),
      procedureId: requireUuid(instance.procedureId, 'workflow procedure id'),
      branchId: instance.branchId === null || instance.branchId === undefined ? null : requireUuid(instance.branchId, 'workflow branch id'),
      currentStagePosition: requireInteger(instance.currentStagePosition, 'workflow current stage', 1),
      status: parseRuntimeStatus(instance.status),
      startedAt: requireString(instance.startedAt, 'workflow started at', 80),
      completedAt: nullableIso(instance.completedAt, 'workflow completed at'),
      templateSnapshot: Object.freeze({ ...requireRecord(instance.templateSnapshot, 'workflow template snapshot') }),
      pendingRequiredCount: requireInteger(instance.pendingRequiredCount, 'pending required count'),
      stageStates: Object.freeze(stageStates),
      itemStates: Object.freeze(itemStates),
      allowedTransitions: Object.freeze(requireArray(instance.allowedTransitions, 'allowed transitions').map(parseTransition)),
    }),
  });
}

async function readRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, timeoutMs: number): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DataAccessError('Workflow context read deadline elapsed', 'DATA_UNAVAILABLE')), timeoutMs);
  });
  try {
    const response = await Promise.race([Promise.resolve(client.rpc(name, args)), deadline]);
    if (response.error) throw normalizeDataFailure(response.error);
    return response.data;
  } catch (error) {
    throw normalizeThrownDataFailure(error, 'read');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function createGovernmentProcedureRuntimeGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_TIMEOUT_MS): GovernmentProcedureRuntimeGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid workflow runtime timeout');
  const commands = createGovernmentProcedureCommandGateway(client, timeoutMs);
  const rpcClient = client as unknown as RpcClientLike;
  return Object.freeze({
    ...commands,
    async loadTransactionContext(workspaceId: string, transactionId: string) {
      const workspace = requireUuid(workspaceId, 'workspace id');
      const transaction = requireUuid(transactionId, 'transaction id');
      const context = parseContext(await readRpc(rpcClient, 'get_transaction_workflow_context_v1', {
        p_workspace_id: workspace,
        p_transaction_id: transaction,
      }, timeoutMs));
      if (context.transactionId !== transaction) throw new DataAccessError('Workflow context transaction drifted', 'DATA_OPERATION_FAILED');
      return context;
    },
  });
}
