import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type GovernmentEntityType = 'ministry' | 'commission' | 'directorate' | 'municipality' | 'court' | 'department' | 'other';
export type WorkflowTransitionKind = 'advance' | 'complete' | 'reopen';

export interface GovernmentEntityCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly entityType: GovernmentEntityType;
  readonly active: boolean;
}

export interface GovernmentBranchCatalogItem {
  readonly id: string;
  readonly entityId: string;
  readonly name: string;
  readonly address: string | null;
  readonly jurisdiction: string | null;
  readonly active: boolean;
}

export interface GovernmentProcedureItem {
  readonly key: string;
  readonly position: number;
  readonly itemType: 'check' | 'document' | 'action';
  readonly title: string;
  readonly required: boolean;
  readonly config: Readonly<Record<string, unknown>>;
}

export interface GovernmentProcedureStage {
  readonly position: number;
  readonly name: string;
  readonly description: string | null;
  readonly dueOffsetDays: number | null;
  readonly governmentEntityId: string | null;
  readonly governmentBranchId: string | null;
  readonly officialFeeCents: bigint | null;
  readonly feeCurrency: string | null;
  readonly items: readonly GovernmentProcedureItem[];
}

export interface GovernmentProcedureTransition {
  readonly key: string;
  readonly label: string;
  readonly kind: WorkflowTransitionKind;
  readonly fromStagePosition: number;
  readonly toStagePosition: number | null;
  readonly requiresReason: boolean;
}

export interface GovernmentProcedureCatalogItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly governmentEntityId: string;
  readonly workflowTemplateId: string;
  readonly active: boolean;
  readonly branchIds: readonly string[];
  readonly prerequisiteProcedureIds: readonly string[];
  readonly stages: readonly GovernmentProcedureStage[];
  readonly transitions: readonly GovernmentProcedureTransition[];
}

export interface GovernmentProcedureCatalog {
  readonly authority: 'workflow_plus_government_catalog';
  readonly moneyAuthority: 'reference_fees_only_no_finance_write';
  readonly entities: readonly GovernmentEntityCatalogItem[];
  readonly branches: readonly GovernmentBranchCatalogItem[];
  readonly procedures: readonly GovernmentProcedureCatalogItem[];
}

export interface GovernmentProcedureRuntime {
  readonly instanceId: string;
  readonly transactionId: string;
  readonly procedureId: string;
  readonly branchId: string | null;
  readonly currentStagePosition: number;
  readonly status: 'active' | 'completed' | 'removed';
  readonly templateSnapshot: Readonly<Record<string, unknown>>;
  readonly wasDuplicate: boolean;
}

export interface WorkflowTransitionResult {
  readonly instanceId: string;
  readonly transitionEventId: string;
  readonly transitionKey: string;
  readonly eventKind: WorkflowTransitionKind;
  readonly fromStagePosition: number;
  readonly toStagePosition: number | null;
  readonly currentStagePosition: number;
  readonly status: 'active' | 'completed' | 'removed';
  readonly wasDuplicate: boolean;
}

export interface StartGovernmentProcedureInput {
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly procedureId: string;
  readonly branchId: string | null;
  readonly idempotencyKey: string;
}

export interface TransitionWorkflowInput {
  readonly workspaceId: string;
  readonly instanceId: string;
  readonly transitionKey: string;
  readonly expectedStagePosition: number;
  readonly reason: string | null;
  readonly idempotencyKey: string;
}

export interface GovernmentProcedureCommandGateway {
  loadCatalog(workspaceId: string): Promise<GovernmentProcedureCatalog>;
  startProcedure(input: StartGovernmentProcedureInput): Promise<GovernmentProcedureRuntime>;
  transition(input: TransitionWorkflowInput): Promise<WorkflowTransitionResult>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const DEFAULT_RPC_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/;
const TRANSITION_KEY_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
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

function parseMoneyToCents(value: unknown, label: string): bigint {
  const text = requireString(value, label, 32);
  const match = text.match(MONEY_PATTERN);
  if (!match?.[1]) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
}

function parseEntityType(value: unknown): GovernmentEntityType {
  if (value === 'ministry' || value === 'commission' || value === 'directorate' || value === 'municipality' || value === 'court' || value === 'department' || value === 'other') return value;
  throw new DataAccessError('Invalid government entity type', 'DATA_OPERATION_FAILED');
}

function parseTransitionKind(value: unknown): WorkflowTransitionKind {
  if (value === 'advance' || value === 'complete' || value === 'reopen') return value;
  throw new DataAccessError('Invalid workflow transition kind', 'DATA_OPERATION_FAILED');
}

function parseRuntimeStatus(value: unknown): 'active' | 'completed' | 'removed' {
  if (value === 'active' || value === 'completed' || value === 'removed') return value;
  throw new DataAccessError('Invalid workflow runtime status', 'DATA_OPERATION_FAILED');
}

function parseItem(value: unknown): GovernmentProcedureItem {
  const row = requireRecord(value, 'procedure item');
  const itemType = row.itemType;
  if (itemType !== 'check' && itemType !== 'document' && itemType !== 'action') throw new DataAccessError('Invalid procedure item type', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    key: requireString(row.key, 'procedure item key', 180),
    position: requireInteger(row.position, 'procedure item position', 1),
    itemType,
    title: requireString(row.title, 'procedure item title', 320),
    required: row.required === true,
    config: Object.freeze({ ...requireRecord(row.config ?? {}, 'procedure item config') }),
  });
}

function parseStage(value: unknown): GovernmentProcedureStage {
  const row = requireRecord(value, 'procedure stage');
  const officialFeeCents = row.officialFee === null || row.officialFee === undefined ? null : parseMoneyToCents(row.officialFee, 'official procedure fee');
  const feeCurrency = nullableString(row.feeCurrency, 'fee currency', 3);
  if ((officialFeeCents === null) !== (feeCurrency === null)) throw new DataAccessError('Procedure fee/currency shape drifted', 'DATA_OPERATION_FAILED');
  if (feeCurrency !== null && !/^[A-Z]{3}$/.test(feeCurrency)) throw new DataAccessError('Invalid fee currency', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    position: requireInteger(row.position, 'procedure stage position', 1),
    name: requireString(row.name, 'procedure stage name', 240),
    description: nullableString(row.description, 'procedure stage description'),
    dueOffsetDays: nullableInteger(row.dueOffsetDays, 'procedure stage SLA days'),
    governmentEntityId: row.governmentEntityId === null || row.governmentEntityId === undefined ? null : requireUuid(row.governmentEntityId, 'stage government entity id'),
    governmentBranchId: row.governmentBranchId === null || row.governmentBranchId === undefined ? null : requireUuid(row.governmentBranchId, 'stage government branch id'),
    officialFeeCents,
    feeCurrency,
    items: Object.freeze(requireArray(row.items, 'procedure stage items').map(parseItem)),
  });
}

function parseTransition(value: unknown): GovernmentProcedureTransition {
  const row = requireRecord(value, 'procedure transition');
  const key = requireString(row.key, 'transition key', 80);
  if (!TRANSITION_KEY_PATTERN.test(key)) throw new DataAccessError('Invalid transition key response', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    key,
    label: requireString(row.label, 'transition label', 240),
    kind: parseTransitionKind(row.kind),
    fromStagePosition: requireInteger(row.fromStagePosition, 'transition from stage', 1),
    toStagePosition: nullableInteger(row.toStagePosition, 'transition to stage', 1),
    requiresReason: row.requiresReason === true,
  });
}

function parseCatalog(value: unknown): GovernmentProcedureCatalog {
  const row = requireRecord(value, 'government procedure catalog');
  if (row.authority !== 'workflow_plus_government_catalog') throw new DataAccessError('Unexpected workflow authority', 'DATA_OPERATION_FAILED');
  if (row.moneyAuthority !== 'reference_fees_only_no_finance_write') throw new DataAccessError('Government fee authority drifted into finance', 'DATA_OPERATION_FAILED');
  const entities = requireArray(row.entities, 'government entities').map((item) => {
    const entity = requireRecord(item, 'government entity');
    return Object.freeze({
      id: requireUuid(entity.id, 'government entity id'),
      name: requireString(entity.name, 'government entity name', 240),
      shortName: nullableString(entity.shortName, 'government entity short name', 160),
      entityType: parseEntityType(entity.entityType),
      active: entity.active === true,
    });
  });
  const branches = requireArray(row.branches, 'government branches').map((item) => {
    const branch = requireRecord(item, 'government branch');
    return Object.freeze({
      id: requireUuid(branch.id, 'government branch id'),
      entityId: requireUuid(branch.entityId, 'branch entity id'),
      name: requireString(branch.name, 'government branch name', 240),
      address: nullableString(branch.address, 'government branch address'),
      jurisdiction: nullableString(branch.jurisdiction, 'government branch jurisdiction'),
      active: branch.active === true,
    });
  });
  const procedures = requireArray(row.procedures, 'government procedures').map((item) => {
    const procedure = requireRecord(item, 'government procedure');
    return Object.freeze({
      id: requireUuid(procedure.id, 'government procedure id'),
      code: requireString(procedure.code, 'government procedure code', 80),
      name: requireString(procedure.name, 'government procedure name', 320),
      description: nullableString(procedure.description, 'government procedure description'),
      governmentEntityId: requireUuid(procedure.governmentEntityId, 'procedure government entity id'),
      workflowTemplateId: requireUuid(procedure.workflowTemplateId, 'procedure workflow template id'),
      active: procedure.active === true,
      branchIds: Object.freeze(requireArray(procedure.branchIds, 'procedure branches').map((id) => requireUuid(id, 'procedure branch id'))),
      prerequisiteProcedureIds: Object.freeze(requireArray(procedure.prerequisiteProcedureIds, 'procedure prerequisites').map((id) => requireUuid(id, 'prerequisite procedure id'))),
      stages: Object.freeze(requireArray(procedure.stages, 'procedure stages').map(parseStage)),
      transitions: Object.freeze(requireArray(procedure.transitions, 'procedure transitions').map(parseTransition)),
    });
  });
  return Object.freeze({ authority: row.authority, moneyAuthority: row.moneyAuthority, entities: Object.freeze(entities), branches: Object.freeze(branches), procedures: Object.freeze(procedures) });
}

function parseRuntime(value: unknown): GovernmentProcedureRuntime {
  const row = requireRecord(value, 'government procedure runtime');
  return Object.freeze({
    instanceId: requireUuid(row.instanceId, 'workflow instance id'),
    transactionId: requireUuid(row.transactionId, 'workflow transaction id'),
    procedureId: requireUuid(row.procedureId, 'workflow procedure id'),
    branchId: row.branchId === null || row.branchId === undefined ? null : requireUuid(row.branchId, 'workflow branch id'),
    currentStagePosition: requireInteger(row.currentStagePosition, 'workflow current stage', 1),
    status: parseRuntimeStatus(row.status),
    templateSnapshot: Object.freeze({ ...requireRecord(row.templateSnapshot, 'workflow template snapshot') }),
    wasDuplicate: row.wasDuplicate === true,
  });
}

function parseTransitionResult(value: unknown): WorkflowTransitionResult {
  const row = requireRecord(value, 'workflow transition result');
  return Object.freeze({
    instanceId: requireUuid(row.instanceId, 'workflow instance id'),
    transitionEventId: requireUuid(row.transitionEventId, 'workflow transition event id'),
    transitionKey: requireString(row.transitionKey, 'workflow transition key', 80),
    eventKind: parseTransitionKind(row.eventKind),
    fromStagePosition: requireInteger(row.fromStagePosition, 'workflow transition from stage', 1),
    toStagePosition: nullableInteger(row.toStagePosition, 'workflow transition to stage', 1),
    currentStagePosition: requireInteger(row.currentStagePosition, 'workflow current stage', 1),
    status: parseRuntimeStatus(row.status),
    wasDuplicate: row.wasDuplicate === true,
  });
}

async function settleRpc<T>(operation: PromiseLike<T>, write: boolean, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DataAccessError(
      write ? 'Workflow write outcome could not be confirmed' : 'Workflow RPC read deadline elapsed',
      write ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE',
    )), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(operation), deadline]);
  } catch (error) {
    throw normalizeThrownDataFailure(error, write ? 'write' : 'read');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function runRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, write: boolean, timeoutMs: number): Promise<unknown> {
  const response = await settleRpc(client.rpc(name, args), write, timeoutMs);
  if (response.error) throw normalizeDataFailure(response.error);
  return response.data;
}

export function createGovernmentProcedureCommandGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_RPC_TIMEOUT_MS): GovernmentProcedureCommandGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid workflow RPC timeout');
  const rpcClient = client as unknown as RpcClientLike;
  return Object.freeze({
    async loadCatalog(workspaceId: string) {
      return parseCatalog(await runRpc(rpcClient, 'get_government_procedure_catalog_v1', {
        p_workspace_id: requireUuid(workspaceId, 'workspace id'),
      }, false, timeoutMs));
    },
    async startProcedure(input: StartGovernmentProcedureInput) {
      return parseRuntime(await runRpc(rpcClient, 'start_government_procedure_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_transaction_id: requireUuid(input.transactionId, 'transaction id'),
        p_procedure_id: requireUuid(input.procedureId, 'procedure id'),
        p_branch_id: input.branchId === null ? null : requireUuid(input.branchId, 'branch id'),
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }, true, timeoutMs));
    },
    async transition(input: TransitionWorkflowInput) {
      const key = input.transitionKey.trim();
      if (!TRANSITION_KEY_PATTERN.test(key)) throw new DataAccessError('Invalid workflow transition key', 'DATA_VALIDATION_FAILED');
      if (!Number.isSafeInteger(input.expectedStagePosition) || input.expectedStagePosition < 1) throw new DataAccessError('Invalid expected workflow stage', 'DATA_VALIDATION_FAILED');
      const reason = input.reason === null ? null : input.reason.trim();
      if (reason !== null && (reason.length < 3 || reason.length > 600)) throw new DataAccessError('Invalid workflow transition reason', 'DATA_VALIDATION_FAILED');
      return parseTransitionResult(await runRpc(rpcClient, 'transition_workflow_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_workflow_instance_id: requireUuid(input.instanceId, 'workflow instance id'),
        p_transition_key: key,
        p_expected_stage_position: input.expectedStagePosition,
        p_reason: reason,
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }, true, timeoutMs));
    },
  });
}
