import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type AutomationRunStatus = 'started' | 'awaiting_approval' | 'succeeded' | 'skipped' | 'failed';
export type AutomationApprovalDecision = 'approved' | 'rejected';
export type AutomationConditionOperator = 'eq' | 'neq' | 'in' | 'exists';

export interface AutomationCondition {
  readonly field: string;
  readonly operator: AutomationConditionOperator;
  readonly value?: unknown;
}

export type AutomationAction =
  | { readonly type: 'create_followup'; readonly title: string; readonly dueInDays: number }
  | { readonly type: 'workflow_transition'; readonly instanceIdField: string; readonly expectedStageField: string; readonly transitionKey: string; readonly reason?: string };

export interface AutomationRule {
  readonly id: string;
  readonly ruleKey: string;
  readonly name: string;
  readonly description: string | null;
  readonly enabled: boolean;
  readonly version: number;
  readonly triggerConfig: Readonly<Record<string, unknown>>;
  readonly conditions: readonly AutomationCondition[];
  readonly actions: readonly AutomationAction[];
  readonly throttlePolicy: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AutomationRunSummary {
  readonly id: string;
  readonly ruleId: string;
  readonly status: AutomationRunStatus;
  readonly receiptKey: string | null;
  readonly eventKey: string | null;
  readonly result: Readonly<Record<string, unknown>>;
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export interface AutomationApprovalSummary {
  readonly id: string;
  readonly runId: string;
  readonly ruleId: string;
  readonly requestedAt: string;
  readonly actionSnapshot: Readonly<Record<string, unknown>>;
}

export interface AutomationEngineContext {
  readonly authority: 'automation_rules_and_runs';
  readonly workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval';
  readonly financeWriteAuthority: 'none';
  readonly rules: readonly AutomationRule[];
  readonly recentRuns: readonly AutomationRunSummary[];
  readonly pendingApprovals: readonly AutomationApprovalSummary[];
}

export interface UpsertAutomationRuleInput {
  readonly workspaceId: string;
  readonly ruleId: string | null;
  readonly expectedVersion: number | null;
  readonly ruleKey: string;
  readonly name: string;
  readonly description: string | null;
  readonly triggerConfig: Readonly<Record<string, unknown>>;
  readonly conditions: readonly AutomationCondition[];
  readonly actions: readonly AutomationAction[];
  readonly throttlePolicy: Readonly<Record<string, unknown>>;
  readonly enabled: boolean;
}

export interface AutomationDispatchResult {
  readonly runId: string;
  readonly status: AutomationRunStatus;
  readonly result: Readonly<Record<string, unknown>>;
  readonly wasDuplicate: boolean;
}

export interface AutomationApprovalResult {
  readonly approvalId: string;
  readonly decision: AutomationApprovalDecision;
  readonly runId: string;
  readonly runStatus: AutomationRunStatus;
  readonly wasDuplicate: boolean;
}

export interface AutomationCommandGateway {
  loadContext(workspaceId: string): Promise<AutomationEngineContext>;
  upsertRule(input: UpsertAutomationRuleInput): Promise<AutomationRule>;
  setRuleEnabled(workspaceId: string, ruleId: string, expectedVersion: number, enabled: boolean): Promise<{ readonly id: string; readonly enabled: boolean; readonly version: number }>;
  dispatch(workspaceId: string, ruleId: string, eventKey: string, payload: Readonly<Record<string, unknown>>, receiptKey: string): Promise<AutomationDispatchResult>;
  decideApproval(workspaceId: string, approvalId: string, decision: AutomationApprovalDecision, note: string | null, decisionKey: string): Promise<AutomationApprovalResult>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const DEFAULT_RPC_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RULE_KEY_PATTERN = /^[a-z][a-z0-9_]{2,79}$/;
const EVENT_KEY_PATTERN = /^[a-z][a-z0-9_.-]{1,119}$/;
const FIELD_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.]{0,119}$/;
const TRANSITION_KEY_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;

function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}
function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}
function requireString(value: unknown, label: string, max = 1000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.trim();
}
function nullableString(value: unknown, label: string, max = 1000): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireString(value, label, max);
}
function requireUuid(value: unknown, label: string): string {
  const text = requireString(value, label, 64);
  if (!UUID_PATTERN.test(text)) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return text;
}
function requireInteger(value: unknown, label: string, min = 0): number {
  const numberValue = typeof value === 'number' ? value : NaN;
  if (!Number.isSafeInteger(numberValue) || numberValue < min) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return numberValue;
}
function parseStatus(value: unknown): AutomationRunStatus {
  if (value === 'started' || value === 'awaiting_approval' || value === 'succeeded' || value === 'skipped' || value === 'failed') return value;
  throw new DataAccessError('Invalid automation run status', 'DATA_OPERATION_FAILED');
}
function parseDecision(value: unknown): AutomationApprovalDecision {
  if (value === 'approved' || value === 'rejected') return value;
  throw new DataAccessError('Invalid automation approval decision', 'DATA_OPERATION_FAILED');
}
function parseCondition(value: unknown): AutomationCondition {
  const row = requireRecord(value, 'automation condition');
  const field = requireString(row.field, 'automation condition field', 120);
  if (!FIELD_PATTERN.test(field)) throw new DataAccessError('Invalid automation condition field', 'DATA_OPERATION_FAILED');
  const operator = row.operator;
  if (operator !== 'eq' && operator !== 'neq' && operator !== 'in' && operator !== 'exists') throw new DataAccessError('Invalid automation condition operator', 'DATA_OPERATION_FAILED');
  if (operator === 'in' && !Array.isArray(row.value)) throw new DataAccessError('Invalid automation condition value', 'DATA_OPERATION_FAILED');
  return Object.freeze({ field, operator, value: row.value });
}
function parseAction(value: unknown): AutomationAction {
  const row = requireRecord(value, 'automation action');
  if (row.type === 'create_followup') {
    return Object.freeze({ type: 'create_followup', title: requireString(row.title, 'follow-up title', 320), dueInDays: requireInteger(row.dueInDays, 'follow-up due days') });
  }
  if (row.type === 'workflow_transition') {
    const instanceIdField = requireString(row.instanceIdField, 'workflow instance field', 120);
    const expectedStageField = requireString(row.expectedStageField, 'workflow stage field', 120);
    const transitionKey = requireString(row.transitionKey, 'workflow transition key', 80);
    if (!FIELD_PATTERN.test(instanceIdField) || !FIELD_PATTERN.test(expectedStageField) || !TRANSITION_KEY_PATTERN.test(transitionKey)) throw new DataAccessError('Invalid workflow automation action', 'DATA_OPERATION_FAILED');
    return Object.freeze({ type: 'workflow_transition', instanceIdField, expectedStageField, transitionKey, ...(row.reason === undefined ? {} : { reason: requireString(row.reason, 'workflow transition reason', 600) }) });
  }
  throw new DataAccessError('Unsupported automation action', 'DATA_OPERATION_FAILED');
}
function validateRuleInput(input: UpsertAutomationRuleInput): void {
  if (!RULE_KEY_PATTERN.test(input.ruleKey.trim())) throw new DataAccessError('Invalid automation rule key', 'DATA_VALIDATION_FAILED');
  if (!input.name.trim() || input.name.length > 240) throw new DataAccessError('Invalid automation rule name', 'DATA_VALIDATION_FAILED');
  if (input.description !== null && (input.description.trim().length < 1 || input.description.length > 1200)) throw new DataAccessError('Invalid automation rule description', 'DATA_VALIDATION_FAILED');
  if (input.ruleId === null ? input.expectedVersion !== null : !Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion ?? 0) < 1) throw new DataAccessError('Invalid automation rule version boundary', 'DATA_VALIDATION_FAILED');
  const triggerType = input.triggerConfig.type;
  if (triggerType !== 'manual' && triggerType !== 'domain_event') throw new DataAccessError('Unsupported automation trigger', 'DATA_VALIDATION_FAILED');
  if (triggerType === 'domain_event' && (typeof input.triggerConfig.event !== 'string' || !EVENT_KEY_PATTERN.test(input.triggerConfig.event))) throw new DataAccessError('Invalid domain event trigger', 'DATA_VALIDATION_FAILED');
  if (input.conditions.length > 20 || input.actions.length < 1 || input.actions.length > 20) throw new DataAccessError('Invalid automation rule size', 'DATA_VALIDATION_FAILED');
  input.conditions.forEach(parseCondition);
  input.actions.forEach(parseAction);
}
function parseRule(value: unknown): AutomationRule {
  const row = requireRecord(value, 'automation rule');
  const ruleKey = requireString(row.ruleKey, 'automation rule key', 80);
  if (!RULE_KEY_PATTERN.test(ruleKey)) throw new DataAccessError('Automation rule key drifted', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: requireUuid(row.id, 'automation rule id'), ruleKey, name: requireString(row.name, 'automation rule name', 240), description: nullableString(row.description, 'automation rule description', 1200), enabled: row.enabled === true,
    version: requireInteger(row.version, 'automation rule version', 1), triggerConfig: Object.freeze({ ...requireRecord(row.triggerConfig, 'automation trigger config') }),
    conditions: Object.freeze(requireArray(row.conditions, 'automation conditions').map(parseCondition)), actions: Object.freeze(requireArray(row.actions, 'automation actions').map(parseAction)),
    throttlePolicy: Object.freeze({ ...requireRecord(row.throttlePolicy, 'automation throttle policy') }), createdAt: requireString(row.createdAt, 'automation created timestamp', 64), updatedAt: requireString(row.updatedAt, 'automation updated timestamp', 64),
  });
}
function parseRun(value: unknown): AutomationRunSummary {
  const row = requireRecord(value, 'automation run');
  return Object.freeze({ id: requireUuid(row.id, 'automation run id'), ruleId: requireUuid(row.ruleId, 'automation run rule id'), status: parseStatus(row.status), receiptKey: nullableString(row.receiptKey, 'automation receipt key', 200), eventKey: nullableString(row.eventKey, 'automation event key', 120), result: Object.freeze({ ...requireRecord(row.result, 'automation run result') }), startedAt: requireString(row.startedAt, 'automation started timestamp', 64), finishedAt: nullableString(row.finishedAt, 'automation finished timestamp', 64) });
}
function parseApproval(value: unknown): AutomationApprovalSummary {
  const row = requireRecord(value, 'automation approval');
  return Object.freeze({ id: requireUuid(row.id, 'approval id'), runId: requireUuid(row.runId, 'approval run id'), ruleId: requireUuid(row.ruleId, 'approval rule id'), requestedAt: requireString(row.requestedAt, 'approval requested timestamp', 64), actionSnapshot: Object.freeze({ ...requireRecord(row.actionSnapshot, 'approval action snapshot') }) });
}
function parseContext(value: unknown): AutomationEngineContext {
  const row = requireRecord(value, 'automation engine context');
  if (row.authority !== 'automation_rules_and_runs') throw new DataAccessError('Automation authority drifted', 'DATA_OPERATION_FAILED');
  if (row.workflowWriteAuthority !== 'existing_workflow_rpc_only_after_human_approval') throw new DataAccessError('Workflow automation authority drifted', 'DATA_OPERATION_FAILED');
  if (row.financeWriteAuthority !== 'none') throw new DataAccessError('Automation attempted finance authority', 'DATA_OPERATION_FAILED');
  return Object.freeze({ authority: row.authority, workflowWriteAuthority: row.workflowWriteAuthority, financeWriteAuthority: row.financeWriteAuthority, rules: Object.freeze(requireArray(row.rules, 'automation rules').map(parseRule)), recentRuns: Object.freeze(requireArray(row.recentRuns, 'automation runs').map(parseRun)), pendingApprovals: Object.freeze(requireArray(row.pendingApprovals, 'automation approvals').map(parseApproval)) });
}
function parseDispatch(value: unknown): AutomationDispatchResult {
  const row = requireRecord(value, 'automation dispatch result');
  return Object.freeze({ runId: requireUuid(row.runId, 'automation run id'), status: parseStatus(row.status), result: Object.freeze({ ...requireRecord(row.result, 'automation dispatch result payload') }), wasDuplicate: row.wasDuplicate === true });
}
function parseApprovalResult(value: unknown): AutomationApprovalResult {
  const row = requireRecord(value, 'automation approval result');
  return Object.freeze({ approvalId: requireUuid(row.approvalId, 'automation approval id'), decision: parseDecision(row.decision), runId: requireUuid(row.runId, 'automation approval run id'), runStatus: parseStatus(row.runStatus), wasDuplicate: row.wasDuplicate === true });
}
async function settleRpc<T>(operation: PromiseLike<T>, write: boolean, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DataAccessError(write ? 'Automation write outcome could not be confirmed' : 'Automation read deadline elapsed', write ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE')), timeoutMs); });
  try { return await Promise.race([Promise.resolve(operation), deadline]); }
  catch (error) { throw normalizeThrownDataFailure(error, write ? 'write' : 'read'); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
async function runRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, write: boolean, timeoutMs: number): Promise<unknown> {
  const response = await settleRpc(client.rpc(name, args), write, timeoutMs);
  if (response.error) throw normalizeDataFailure(response.error);
  return response.data;
}

export function createAutomationCommandGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_RPC_TIMEOUT_MS): AutomationCommandGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid automation RPC timeout');
  const rpcClient = client as unknown as RpcClientLike;
  return Object.freeze({
    async loadContext(workspaceId) { return parseContext(await runRpc(rpcClient, 'get_automation_engine_context_v1', { p_workspace_id: requireUuid(workspaceId, 'workspace id') }, false, timeoutMs)); },
    async upsertRule(input) {
      validateRuleInput(input);
      return parseRule(await runRpc(rpcClient, 'upsert_automation_rule_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'), p_rule_id: input.ruleId === null ? null : requireUuid(input.ruleId, 'automation rule id'), p_expected_version: input.expectedVersion,
        p_rule_key: input.ruleKey.trim(), p_name: input.name.trim(), p_description: input.description === null ? null : input.description.trim(), p_trigger_config: input.triggerConfig,
        p_conditions: input.conditions, p_actions: input.actions, p_throttle_policy: input.throttlePolicy, p_enabled: input.enabled,
      }, true, timeoutMs));
    },
    async setRuleEnabled(workspaceId, ruleId, expectedVersion, enabled) {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new DataAccessError('Invalid automation rule version', 'DATA_VALIDATION_FAILED');
      const row = requireRecord(await runRpc(rpcClient, 'set_automation_rule_enabled_v1', { p_workspace_id: requireUuid(workspaceId, 'workspace id'), p_rule_id: requireUuid(ruleId, 'automation rule id'), p_expected_version: expectedVersion, p_enabled: enabled }, true, timeoutMs), 'automation enabled result');
      return Object.freeze({ id: requireUuid(row.id, 'automation rule id'), enabled: row.enabled === true, version: requireInteger(row.version, 'automation rule version', 1) });
    },
    async dispatch(workspaceId, ruleId, eventKey, payload, receiptKey) {
      const cleanEvent = eventKey.trim(); const cleanReceipt = receiptKey.trim();
      if (!EVENT_KEY_PATTERN.test(cleanEvent)) throw new DataAccessError('Invalid automation event key', 'DATA_VALIDATION_FAILED');
      if (cleanReceipt.length < 8 || cleanReceipt.length > 200) throw new DataAccessError('Invalid automation receipt key', 'DATA_VALIDATION_FAILED');
      return parseDispatch(await runRpc(rpcClient, 'dispatch_automation_v1', { p_workspace_id: requireUuid(workspaceId, 'workspace id'), p_rule_id: requireUuid(ruleId, 'automation rule id'), p_event_key: cleanEvent, p_event_payload: payload, p_receipt_key: cleanReceipt }, true, timeoutMs));
    },
    async decideApproval(workspaceId, approvalId, decision, note, decisionKey) {
      if (decision !== 'approved' && decision !== 'rejected') throw new DataAccessError('Invalid automation approval decision', 'DATA_VALIDATION_FAILED');
      const cleanNote = note === null ? null : note.trim();
      if (cleanNote !== null && (cleanNote.length < 3 || cleanNote.length > 600)) throw new DataAccessError('Invalid automation approval note', 'DATA_VALIDATION_FAILED');
      return parseApprovalResult(await runRpc(rpcClient, 'decide_automation_approval_v1', { p_workspace_id: requireUuid(workspaceId, 'workspace id'), p_approval_id: requireUuid(approvalId, 'approval id'), p_decision: decision, p_decision_note: cleanNote, p_decision_key: requireUuid(decisionKey, 'approval decision key') }, true, timeoutMs));
    },
  });
}
