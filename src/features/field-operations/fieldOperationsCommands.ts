import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type FieldLocationPolicy = 'disabled' | 'optional' | 'required';
export type FieldPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FieldAssignmentStatus = 'queued' | 'in_progress' | 'visit_complete' | 'handoff_complete' | 'cancelled';
export type FieldVisitStatus = 'checked_in' | 'completed' | 'could_not_complete';
export type FieldVisitOutcome = 'completed' | 'could_not_complete';
export type FieldFailureReason = 'office_closed' | 'missing_requirement' | 'payment_issue' | 'authority_delay' | 'rejected' | 'technical_issue' | 'other';
export type FieldEvidenceType = 'photo' | 'document' | 'receipt' | 'other';

export interface FieldLocationEvidence {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyMeters?: number;
}

export interface FieldMemberSummary {
  readonly userId: string;
  readonly displayName: string;
}

export interface FieldAssignmentSummary {
  readonly id: string;
  readonly transactionId: string;
  readonly transactionType: string;
  readonly transactionStatus: string;
  readonly companyName: string;
  readonly assignedUserId: string;
  readonly assignedUserName: string;
  readonly scheduledFor: string;
  readonly destinationLabel: string;
  readonly department: string | null;
  readonly priority: FieldPriority;
  readonly status: FieldAssignmentStatus;
  readonly version: number;
  readonly openBlockers: number;
  readonly nextRequiredAction: string;
}

export interface FieldVisitSummary {
  readonly id: string;
  readonly assignmentId: string;
  readonly transactionId: string;
  readonly assignedUserId: string;
  readonly status: FieldVisitStatus;
  readonly version: number;
  readonly checkInAt: string;
  readonly checkOutAt: string | null;
  readonly counterDepartment: string | null;
  readonly officialReference: string | null;
  readonly officialFeePaid: string | null;
  readonly failureReason: FieldFailureReason | null;
  readonly outcomeNote: string | null;
  readonly checkInLocationRecorded: boolean;
  readonly checkOutLocationRecorded: boolean;
  readonly evidenceCount: number;
}

export interface FieldOperationsMetrics {
  readonly activeTransactions: number;
  readonly stalledTransactions: number;
  readonly highCriticalBlockers: number;
  readonly pendingAutomationApprovals: number;
  readonly queuedAssignments: number;
  readonly activeVisits: number;
}

export interface FieldOperationsContext {
  readonly authority: 'field_assignments_visits_evidence_receipts';
  readonly transactionWriteAuthority: 'none';
  readonly workflowWriteAuthority: 'existing_workflow_rpc_only';
  readonly automationWriteAuthority: 'existing_automation_rpc_only';
  readonly financeWriteAuthority: 'none';
  readonly locationPolicy: FieldLocationPolicy;
  readonly metrics: FieldOperationsMetrics;
  readonly members: readonly FieldMemberSummary[];
  readonly assignments: readonly FieldAssignmentSummary[];
  readonly visits: readonly FieldVisitSummary[];
}

export interface UpsertFieldAssignmentInput {
  readonly workspaceId: string;
  readonly assignmentId: string | null;
  readonly expectedVersion: number | null;
  readonly transactionId: string;
  readonly assignedUserId: string;
  readonly scheduledFor: string;
  readonly destinationLabel: string;
  readonly department: string | null;
  readonly priority: FieldPriority;
}

export interface FinishFieldVisitInput {
  readonly workspaceId: string;
  readonly visitId: string;
  readonly expectedVisitVersion: number;
  readonly outcome: FieldVisitOutcome;
  readonly failureReason: FieldFailureReason | null;
  readonly outcomeNote: string | null;
  readonly counterDepartment: string | null;
  readonly officialReference: string | null;
  readonly officialFeePaid: string | null;
  readonly location: FieldLocationEvidence | null;
  readonly clientOperationId: string;
}

export interface FieldMutationResult {
  readonly wasDuplicate: boolean;
  readonly [key: string]: unknown;
}

export interface FieldOperationsCommandGateway {
  loadContext(workspaceId: string): Promise<FieldOperationsContext>;
  setLocationPolicy(workspaceId: string, policy: FieldLocationPolicy): Promise<{ readonly locationEvidence: FieldLocationPolicy }>;
  upsertAssignment(input: UpsertFieldAssignmentInput): Promise<FieldMutationResult>;
  reassign(workspaceId: string, assignmentId: string, expectedVersion: number, assignedUserId: string, reason: string, clientOperationId: string): Promise<FieldMutationResult>;
  checkIn(workspaceId: string, assignmentId: string, expectedAssignmentVersion: number, location: FieldLocationEvidence | null, clientOperationId: string): Promise<FieldMutationResult>;
  checkOut(input: FinishFieldVisitInput): Promise<FieldMutationResult>;
  addEvidence(workspaceId: string, visitId: string, expectedVisitVersion: number, evidenceType: FieldEvidenceType, documentId: string | null, note: string | null, clientOperationId: string): Promise<FieldMutationResult>;
  handoff(workspaceId: string, assignmentId: string, expectedVersion: number, note: string, clientOperationId: string): Promise<FieldMutationResult>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const DEFAULT_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_PATTERN = /^\d{1,16}(?:\.\d{1,2})?$/;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}
function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}
function stringValue(value: unknown, label: string, max = 1200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.trim();
}
function nullableString(value: unknown, label: string, max = 1200): string | null {
  if (value === null || value === undefined || value === '') return null;
  return stringValue(value, label, max);
}
function uuid(value: unknown, label: string): string {
  const text = stringValue(value, label, 64);
  if (!UUID_PATTERN.test(text)) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return text;
}
function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}
function count(value: unknown, label: string): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(numeric) || numeric < 0) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return numeric;
}
function policy(value: unknown): FieldLocationPolicy {
  if (value === 'disabled' || value === 'optional' || value === 'required') return value;
  throw new DataAccessError('Field location policy drifted', 'DATA_OPERATION_FAILED');
}
function priority(value: unknown): FieldPriority {
  if (value === 'low' || value === 'normal' || value === 'high' || value === 'urgent') return value;
  throw new DataAccessError('Field priority drifted', 'DATA_OPERATION_FAILED');
}
function assignmentStatus(value: unknown): FieldAssignmentStatus {
  if (value === 'queued' || value === 'in_progress' || value === 'visit_complete' || value === 'handoff_complete' || value === 'cancelled') return value;
  throw new DataAccessError('Field assignment status drifted', 'DATA_OPERATION_FAILED');
}
function visitStatus(value: unknown): FieldVisitStatus {
  if (value === 'checked_in' || value === 'completed' || value === 'could_not_complete') return value;
  throw new DataAccessError('Field visit status drifted', 'DATA_OPERATION_FAILED');
}
function failureReason(value: unknown): FieldFailureReason | null {
  if (value === null || value === undefined || value === '') return null;
  if (value === 'office_closed' || value === 'missing_requirement' || value === 'payment_issue' || value === 'authority_delay' || value === 'rejected' || value === 'technical_issue' || value === 'other') return value;
  throw new DataAccessError('Field failure reason drifted', 'DATA_OPERATION_FAILED');
}
function validateLocation(value: FieldLocationEvidence | null): FieldLocationEvidence | null {
  if (value === null) return null;
  if (!Number.isFinite(value.lat) || value.lat < -90 || value.lat > 90 || !Number.isFinite(value.lng) || value.lng < -180 || value.lng > 180) throw new DataAccessError('Invalid visit location', 'DATA_VALIDATION_FAILED');
  if (value.accuracyMeters !== undefined && (!Number.isFinite(value.accuracyMeters) || value.accuracyMeters < 0 || value.accuracyMeters > 10_000)) throw new DataAccessError('Invalid visit location accuracy', 'DATA_VALIDATION_FAILED');
  return Object.freeze({ lat: value.lat, lng: value.lng, ...(value.accuracyMeters === undefined ? {} : { accuracyMeters: value.accuracyMeters }) });
}
function parseMember(value: unknown): FieldMemberSummary {
  const row = record(value, 'field member');
  return Object.freeze({ userId: uuid(row.userId, 'field member id'), displayName: stringValue(row.displayName, 'field member name', 160) });
}
function parseAssignment(value: unknown): FieldAssignmentSummary {
  const row = record(value, 'field assignment');
  const scheduledFor = stringValue(row.scheduledFor, 'field scheduled date', 16);
  if (!DATE_PATTERN.test(scheduledFor)) throw new DataAccessError('Field scheduled date drifted', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: uuid(row.id, 'field assignment id'), transactionId: uuid(row.transactionId, 'field transaction id'), transactionType: stringValue(row.transactionType, 'transaction type', 180),
    transactionStatus: stringValue(row.transactionStatus, 'transaction status', 40), companyName: stringValue(row.companyName, 'company name', 400), assignedUserId: uuid(row.assignedUserId, 'assigned user id'),
    assignedUserName: stringValue(row.assignedUserName, 'assigned user name', 160), scheduledFor, destinationLabel: stringValue(row.destinationLabel, 'destination label', 320), department: nullableString(row.department, 'department', 240),
    priority: priority(row.priority), status: assignmentStatus(row.status), version: integer(row.version, 'assignment version'), openBlockers: count(row.openBlockers, 'open blocker count'), nextRequiredAction: stringValue(row.nextRequiredAction, 'next required action', 800),
  });
}
function parseVisit(value: unknown): FieldVisitSummary {
  const row = record(value, 'field visit');
  const fee = row.officialFeePaid === null || row.officialFeePaid === undefined ? null : String(row.officialFeePaid);
  if (fee !== null && !DECIMAL_PATTERN.test(fee)) throw new DataAccessError('Official fee evidence drifted', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: uuid(row.id, 'field visit id'), assignmentId: uuid(row.assignmentId, 'visit assignment id'), transactionId: uuid(row.transactionId, 'visit transaction id'), assignedUserId: uuid(row.assignedUserId, 'visit assigned user id'),
    status: visitStatus(row.status), version: integer(row.version, 'visit version'), checkInAt: stringValue(row.checkInAt, 'check-in timestamp', 64), checkOutAt: nullableString(row.checkOutAt, 'check-out timestamp', 64),
    counterDepartment: nullableString(row.counterDepartment, 'counter department', 320), officialReference: nullableString(row.officialReference, 'official reference', 320), officialFeePaid: fee,
    failureReason: failureReason(row.failureReason), outcomeNote: nullableString(row.outcomeNote, 'visit outcome note', 1600), checkInLocationRecorded: row.checkInLocationRecorded === true,
    checkOutLocationRecorded: row.checkOutLocationRecorded === true, evidenceCount: count(row.evidenceCount, 'visit evidence count'),
  });
}
function parseMetrics(value: unknown): FieldOperationsMetrics {
  const row = record(value, 'field operations metrics');
  return Object.freeze({ activeTransactions: count(row.activeTransactions, 'active transaction count'), stalledTransactions: count(row.stalledTransactions, 'stalled transaction count'), highCriticalBlockers: count(row.highCriticalBlockers, 'critical blocker count'), pendingAutomationApprovals: count(row.pendingAutomationApprovals, 'pending approval count'), queuedAssignments: count(row.queuedAssignments, 'queued assignment count'), activeVisits: count(row.activeVisits, 'active visit count') });
}
function parseContext(value: unknown): FieldOperationsContext {
  const row = record(value, 'field operations context');
  if (row.authority !== 'field_assignments_visits_evidence_receipts' || row.transactionWriteAuthority !== 'none' || row.workflowWriteAuthority !== 'existing_workflow_rpc_only' || row.automationWriteAuthority !== 'existing_automation_rpc_only' || row.financeWriteAuthority !== 'none') throw new DataAccessError('Field operations authority drifted', 'DATA_OPERATION_FAILED');
  return Object.freeze({ authority: row.authority, transactionWriteAuthority: row.transactionWriteAuthority, workflowWriteAuthority: row.workflowWriteAuthority, automationWriteAuthority: row.automationWriteAuthority, financeWriteAuthority: row.financeWriteAuthority, locationPolicy: policy(row.locationPolicy), metrics: parseMetrics(row.metrics), members: Object.freeze(array(row.members, 'field members').map(parseMember)), assignments: Object.freeze(array(row.assignments, 'field assignments').map(parseAssignment)), visits: Object.freeze(array(row.visits, 'field visits').map(parseVisit)) });
}
function parseMutation(value: unknown): FieldMutationResult {
  const row = record(value, 'field mutation result');
  return Object.freeze({ ...row, wasDuplicate: row.wasDuplicate === true });
}
function validateOperationId(value: string): string { return uuid(value, 'field client operation id'); }
function validateVersion(value: number, label: string): number { if (!Number.isSafeInteger(value) || value < 1) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED'); return value; }
function validateDate(value: string): string { if (!DATE_PATTERN.test(value)) throw new DataAccessError('Invalid field scheduled date', 'DATA_VALIDATION_FAILED'); const parsed = Date.parse(`${value}T00:00:00Z`); if (!Number.isFinite(parsed)) throw new DataAccessError('Invalid field scheduled date', 'DATA_VALIDATION_FAILED'); return value; }
function validateFee(value: string | null): string | null { if (value === null || value === '') return null; if (!DECIMAL_PATTERN.test(value) || Number(value) <= 0) throw new DataAccessError('Invalid official fee evidence', 'DATA_VALIDATION_FAILED'); return value; }

async function settle<T>(operation: PromiseLike<T>, write: boolean, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DataAccessError(write ? 'Field write outcome could not be confirmed' : 'Field read deadline elapsed', write ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE')), timeoutMs); });
  try { return await Promise.race([Promise.resolve(operation), deadline]); }
  catch (error) { throw normalizeThrownDataFailure(error, write ? 'write' : 'read'); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
async function runRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, write: boolean, timeoutMs: number): Promise<unknown> {
  const response = await settle(client.rpc(name, args), write, timeoutMs);
  if (response.error) throw normalizeDataFailure(response.error);
  return response.data;
}

export function createFieldOperationsCommandGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_TIMEOUT_MS): FieldOperationsCommandGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid field operations RPC timeout');
  const rpcClient = client as unknown as RpcClientLike;
  const gateway: FieldOperationsCommandGateway = {
    async loadContext(workspaceId) { return parseContext(await runRpc(rpcClient, 'get_field_operations_context_v1', { p_workspace_id: uuid(workspaceId, 'workspace id') }, false, timeoutMs)); },
    async setLocationPolicy(workspaceId, nextPolicy) {
      const parsedPolicy = policy(nextPolicy);
      const row = record(await runRpc(rpcClient, 'set_field_location_policy_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_policy: parsedPolicy }, true, timeoutMs), 'location policy result');
      return Object.freeze({ locationEvidence: policy(row.locationEvidence) });
    },
    async upsertAssignment(input) {
      if (input.assignmentId === null ? input.expectedVersion !== null : input.expectedVersion === null) throw new DataAccessError('Invalid assignment version boundary', 'DATA_VALIDATION_FAILED');
      if (!input.destinationLabel.trim() || input.destinationLabel.length > 320) throw new DataAccessError('Invalid destination label', 'DATA_VALIDATION_FAILED');
      const parsedPriority = priority(input.priority);
      return parseMutation(await runRpc(rpcClient, 'upsert_field_assignment_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'), p_assignment_id: input.assignmentId === null ? null : uuid(input.assignmentId, 'assignment id'), p_expected_version: input.expectedVersion === null ? null : validateVersion(input.expectedVersion, 'assignment version'),
        p_transaction_id: uuid(input.transactionId, 'transaction id'), p_assigned_user_id: uuid(input.assignedUserId, 'assigned user id'), p_scheduled_for: validateDate(input.scheduledFor), p_destination_label: input.destinationLabel.trim(), p_department: input.department?.trim() || null, p_priority: parsedPriority,
      }, true, timeoutMs));
    },
    async reassign(workspaceId, assignmentId, expectedVersion, assignedUserId, reason, clientOperationId) {
      if (reason.trim().length < 3 || reason.length > 1200) throw new DataAccessError('Invalid reassignment reason', 'DATA_VALIDATION_FAILED');
      return parseMutation(await runRpc(rpcClient, 'reassign_field_assignment_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_assignment_id: uuid(assignmentId, 'assignment id'), p_expected_version: validateVersion(expectedVersion, 'assignment version'), p_assigned_user_id: uuid(assignedUserId, 'assigned user id'), p_reason: reason.trim(), p_client_operation_id: validateOperationId(clientOperationId) }, true, timeoutMs));
    },
    async checkIn(workspaceId, assignmentId, expectedAssignmentVersion, location, clientOperationId) {
      return parseMutation(await runRpc(rpcClient, 'start_field_visit_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_assignment_id: uuid(assignmentId, 'assignment id'), p_expected_assignment_version: validateVersion(expectedAssignmentVersion, 'assignment version'), p_location: validateLocation(location), p_client_operation_id: validateOperationId(clientOperationId) }, true, timeoutMs));
    },
    async checkOut(input) {
      if (input.outcome === 'could_not_complete' ? input.failureReason === null : input.failureReason !== null) throw new DataAccessError('Invalid visit failure boundary', 'DATA_VALIDATION_FAILED');
      return parseMutation(await runRpc(rpcClient, 'finish_field_visit_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'), p_visit_id: uuid(input.visitId, 'visit id'), p_expected_visit_version: validateVersion(input.expectedVisitVersion, 'visit version'), p_outcome: input.outcome,
        p_failure_reason: input.failureReason, p_outcome_note: input.outcomeNote?.trim() || null, p_counter_department: input.counterDepartment?.trim() || null, p_official_reference: input.officialReference?.trim() || null,
        p_official_fee_paid: validateFee(input.officialFeePaid), p_location: validateLocation(input.location), p_client_operation_id: validateOperationId(input.clientOperationId),
      }, true, timeoutMs));
    },
    async addEvidence(workspaceId, visitId, expectedVisitVersion, evidenceType, documentId, note, clientOperationId) {
      if (evidenceType !== 'photo' && evidenceType !== 'document' && evidenceType !== 'receipt' && evidenceType !== 'other') throw new DataAccessError('Invalid field evidence type', 'DATA_VALIDATION_FAILED');
      if (evidenceType !== 'other' && documentId === null) throw new DataAccessError('Canonical document is required for file evidence', 'DATA_VALIDATION_FAILED');
      return parseMutation(await runRpc(rpcClient, 'add_field_visit_evidence_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_visit_id: uuid(visitId, 'visit id'), p_expected_visit_version: validateVersion(expectedVisitVersion, 'visit version'), p_evidence_type: evidenceType, p_document_id: documentId === null ? null : uuid(documentId, 'document id'), p_note: note?.trim() || null, p_client_operation_id: validateOperationId(clientOperationId) }, true, timeoutMs));
    },
    async handoff(workspaceId, assignmentId, expectedVersion, note, clientOperationId) {
      if (note.trim().length < 3 || note.length > 1200) throw new DataAccessError('Invalid field handoff note', 'DATA_VALIDATION_FAILED');
      return parseMutation(await runRpc(rpcClient, 'handoff_field_assignment_v1', { p_workspace_id: uuid(workspaceId, 'workspace id'), p_assignment_id: uuid(assignmentId, 'assignment id'), p_expected_version: validateVersion(expectedVersion, 'assignment version'), p_note: note.trim(), p_client_operation_id: validateOperationId(clientOperationId) }, true, timeoutMs));
    },
  };
  return Object.freeze(gateway);
}
