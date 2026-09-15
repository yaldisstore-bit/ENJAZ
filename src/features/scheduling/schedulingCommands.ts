import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type SchedulingLifecycleAction = 'complete' | 'cancel';
export type CalendarConfirmationStatus = 'confirmed' | 'declined';
export type CalendarAttendanceOutcome = 'attended' | 'missed';
export type CalendarConflictState = 'clear' | 'conflict' | 'unknown_assignment' | 'unknown_range';

export type CalendarStateMutationInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; action: SchedulingLifecycleAction; reason?: string | null }>;
export type RenewalStateMutationInput = Readonly<{ workspaceId: string; renewalId: string; operationId: string; expectedVersion: number; action: SchedulingLifecycleAction; reason?: string | null }>;
export type CreateCalendarEventInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; title: string; eventType: string; startsAt: string; endsAt?: string | null; transactionId?: string | null; companyId?: string | null; contactId?: string | null; workflowInstanceId?: string | null; staffMemberIds?: readonly string[]; note?: string | null }>;
export type UpdateCalendarEventMetadataInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; title: string; eventType: string; transactionId?: string | null; companyId?: string | null; contactId?: string | null; workflowInstanceId?: string | null; note?: string | null }>;
export type RescheduleCalendarEventInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; startsAt: string; endsAt?: string | null; reason: string }>;
export type SetCalendarEventStaffInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; staffMemberIds: readonly string[]; reason?: string | null }>;
export type SetCalendarEventConfirmationInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; status: CalendarConfirmationStatus; responseId?: string | null }>;
export type RecordCalendarEventAttendanceInput = Readonly<{ workspaceId: string; eventId: string; operationId: string; expectedVersion: number; outcome: CalendarAttendanceOutcome; note?: string | null }>;
export type CheckCalendarEventStaffConflictsInput = Readonly<{ workspaceId: string; startsAt: string; endsAt?: string | null; staffMemberIds: readonly string[]; excludeEventId?: string | null }>;

export type CalendarStateMutationResult = Readonly<{ id: string; workspaceId: string; status: 'scheduled' | 'completed' | 'cancelled'; startsAt: string; endsAt: string | null; version: number; updatedAt: string; wasDuplicate: boolean }>;
export type RenewalStateMutationResult = Readonly<{ id: string; workspaceId: string; status: 'active' | 'completed' | 'cancelled'; dueDate: string; lastCompletedAt: string | null; version: number; updatedAt: string; wasDuplicate: boolean }>;
export type CalendarEventMutationResult = Readonly<{
  id: string; workspaceId: string; transactionId: string | null; companyId: string | null; contactId: string | null; workflowInstanceId: string | null;
  title: string; eventType: string; startsAt: string; endsAt: string | null; status: 'scheduled' | 'completed' | 'cancelled'; note: string | null;
  staffMemberIds: readonly string[]; confirmationStatus: 'unconfirmed' | 'confirmed' | 'declined'; confirmationAt: string | null;
  confirmationSource: 'staff' | 'client_portal' | null; confirmationResponseId: string | null; attendanceOutcome: 'attended' | 'missed' | 'cancelled' | null;
  attendanceRecordedAt: string | null; version: number; updatedAt: string; wasDuplicate: boolean; changed?: boolean;
}>;
export type CalendarConflictItem = Readonly<{ eventId: string; organizationMemberId: string; startsAt: string; endsAt: string | null }>;
export type CalendarConflictResult = Readonly<{ state: CalendarConflictState; conflicts: readonly CalendarConflictItem[]; unknownRanges: readonly CalendarConflictItem[] }>;

export interface SchedulingCommandGateway {
  mutateCalendarState(input: CalendarStateMutationInput): Promise<CalendarStateMutationResult>;
  mutateRenewalState(input: RenewalStateMutationInput): Promise<RenewalStateMutationResult>;
  checkCalendarEventStaffConflicts(input: CheckCalendarEventStaffConflictsInput): Promise<CalendarConflictResult>;
  createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEventMutationResult>;
  updateCalendarEventMetadata(input: UpdateCalendarEventMetadataInput): Promise<CalendarEventMutationResult>;
  rescheduleCalendarEvent(input: RescheduleCalendarEventInput): Promise<CalendarEventMutationResult>;
  setCalendarEventStaff(input: SetCalendarEventStaffInput): Promise<CalendarEventMutationResult>;
  setCalendarEventConfirmation(input: SetCalendarEventConfirmationInput): Promise<CalendarEventMutationResult>;
  recordCalendarEventAttendance(input: RecordCalendarEventAttendanceInput): Promise<CalendarEventMutationResult>;
}

type RpcClientLike = { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<{ data: unknown; error: DataFailureLike | null }> };
type BCommandInput = CreateCalendarEventInput | UpdateCalendarEventMetadataInput | RescheduleCalendarEventInput | SetCalendarEventStaffInput | SetCalendarEventConfirmationInput | RecordCalendarEventAttendanceInput;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALENDAR_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
const RENEWAL_STATUSES = ['active', 'completed', 'cancelled'] as const;
const CONFLICT_STATES = ['clear', 'conflict', 'unknown_assignment', 'unknown_range'] as const;
const CONFIRMATION_STATUSES = ['unconfirmed', 'confirmed', 'declined'] as const;
const CONFIRMATION_SOURCES = ['staff', 'client_portal'] as const;
const ATTENDANCE_OUTCOMES = ['attended', 'missed', 'cancelled'] as const;

function fail(label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED'): never {
  throw new DataAccessError(`Invalid ${label}`, code);
}
function uuid(value: unknown, label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): string {
  if (typeof value !== 'string' || !UUID.test(value.trim())) return fail(label, code);
  return value.trim().toLowerCase();
}
function optUuid(value: unknown, label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): string | null {
  return value === null || value === undefined || value === '' ? null : uuid(value, label, code);
}
function uuidList(value: readonly string[] | undefined, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return fail('staff member ids', code);
  return Object.freeze([...new Set(value.map((entry) => uuid(entry, 'staff member id', code)))].sort());
}
function positive(value: unknown, label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return fail(label, code);
  return value;
}
function text(value: unknown, label: string, max: number, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || (code === 'DATA_VALIDATION_FAILED' && /[\u0000\r\n]/u.test(value))) return fail(label, code);
  return value.trim();
}
function optText(value: unknown, label: string, max: number, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED' = 'DATA_VALIDATION_FAILED'): string | null {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim()) ? null : text(value, label, max, code);
}
function instant(value: unknown, label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED'): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return fail(label, code);
  return value;
}
function optInstant(value: unknown, label: string, code: 'DATA_VALIDATION_FAILED' | 'DATA_OPERATION_FAILED'): string | null {
  return value === null || value === undefined || value === '' ? null : instant(value, label, code);
}
function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(label, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') return fail(label, 'DATA_OPERATION_FAILED');
  return value;
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  const parsed = text(value, label, 40, 'DATA_OPERATION_FAILED');
  if (!allowed.includes(parsed as T)) return fail(label, 'DATA_OPERATION_FAILED');
  return parsed as T;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail('renewal date', 'DATA_OPERATION_FAILED');
  return value;
}
function commandIds(input: BCommandInput) {
  return {
    p_workspace_id: uuid(input.workspaceId, 'workspace id'),
    p_event_id: uuid(input.eventId, 'calendar event id'),
    p_operation_id: uuid(input.operationId, 'operation id'),
  };
}

function parseCalendarResult(value: unknown): CalendarStateMutationResult {
  const row = record(value, 'calendar response');
  return Object.freeze({
    id: uuid(row.id, 'event id', 'DATA_OPERATION_FAILED'), workspaceId: uuid(row.workspaceId, 'workspace id', 'DATA_OPERATION_FAILED'),
    status: oneOf(row.status, CALENDAR_STATUSES, 'calendar status'), startsAt: instant(row.startsAt, 'calendar start', 'DATA_OPERATION_FAILED'),
    endsAt: optInstant(row.endsAt, 'calendar end', 'DATA_OPERATION_FAILED'), version: positive(row.version, 'calendar version', 'DATA_OPERATION_FAILED'),
    updatedAt: instant(row.updatedAt, 'calendar update', 'DATA_OPERATION_FAILED'), wasDuplicate: bool(row.wasDuplicate, 'duplicate marker'),
  });
}
function parseRenewalResult(value: unknown): RenewalStateMutationResult {
  const row = record(value, 'renewal response');
  return Object.freeze({
    id: uuid(row.id, 'renewal id', 'DATA_OPERATION_FAILED'), workspaceId: uuid(row.workspaceId, 'workspace id', 'DATA_OPERATION_FAILED'),
    status: oneOf(row.status, RENEWAL_STATUSES, 'renewal status'), dueDate: date(row.dueDate),
    lastCompletedAt: optInstant(row.lastCompletedAt, 'renewal completion', 'DATA_OPERATION_FAILED'), version: positive(row.version, 'renewal version', 'DATA_OPERATION_FAILED'),
    updatedAt: instant(row.updatedAt, 'renewal update', 'DATA_OPERATION_FAILED'), wasDuplicate: bool(row.wasDuplicate, 'duplicate marker'),
  });
}
function parseCalendarEventResult(value: unknown): CalendarEventMutationResult {
  const row = record(value, 'calendar event response');
  if (row.schema !== 'enjaz.scheduling-calendar-event.v2') return fail('calendar event schema', 'DATA_OPERATION_FAILED');
  const source = row.confirmationSource === null || row.confirmationSource === undefined ? null : oneOf(row.confirmationSource, CONFIRMATION_SOURCES, 'confirmation source');
  const attendance = row.attendanceOutcome === null || row.attendanceOutcome === undefined ? null : oneOf(row.attendanceOutcome, ATTENDANCE_OUTCOMES, 'attendance outcome');
  return Object.freeze({
    id: uuid(row.id, 'event id', 'DATA_OPERATION_FAILED'), workspaceId: uuid(row.workspaceId, 'workspace id', 'DATA_OPERATION_FAILED'),
    transactionId: optUuid(row.transactionId, 'transaction id', 'DATA_OPERATION_FAILED'), companyId: optUuid(row.companyId, 'company id', 'DATA_OPERATION_FAILED'),
    contactId: optUuid(row.contactId, 'contact id', 'DATA_OPERATION_FAILED'), workflowInstanceId: optUuid(row.workflowInstanceId, 'workflow id', 'DATA_OPERATION_FAILED'),
    title: text(row.title, 'calendar title', 320, 'DATA_OPERATION_FAILED'), eventType: text(row.eventType, 'event type', 120, 'DATA_OPERATION_FAILED'),
    startsAt: instant(row.startsAt, 'calendar start', 'DATA_OPERATION_FAILED'), endsAt: optInstant(row.endsAt, 'calendar end', 'DATA_OPERATION_FAILED'),
    status: oneOf(row.status, CALENDAR_STATUSES, 'calendar status'), note: optText(row.note, 'calendar note', 4000, 'DATA_OPERATION_FAILED'),
    staffMemberIds: uuidList(row.staffMemberIds as readonly string[] | undefined, 'DATA_OPERATION_FAILED'), confirmationStatus: oneOf(row.confirmationStatus, CONFIRMATION_STATUSES, 'confirmation status'),
    confirmationAt: optInstant(row.confirmationAt, 'confirmation time', 'DATA_OPERATION_FAILED'), confirmationSource: source,
    confirmationResponseId: optUuid(row.confirmationResponseId, 'confirmation response id', 'DATA_OPERATION_FAILED'), attendanceOutcome: attendance,
    attendanceRecordedAt: optInstant(row.attendanceRecordedAt, 'attendance time', 'DATA_OPERATION_FAILED'), version: positive(row.version, 'calendar version', 'DATA_OPERATION_FAILED'),
    updatedAt: instant(row.updatedAt, 'calendar update', 'DATA_OPERATION_FAILED'), wasDuplicate: bool(row.wasDuplicate, 'duplicate marker'),
    ...(row.changed === undefined ? {} : { changed: bool(row.changed, 'changed marker') }),
  });
}
function parseConflictItem(value: unknown): CalendarConflictItem {
  const row = record(value, 'conflict item');
  return Object.freeze({
    eventId: uuid(row.eventId, 'conflict event id', 'DATA_OPERATION_FAILED'), organizationMemberId: uuid(row.organizationMemberId, 'conflict staff id', 'DATA_OPERATION_FAILED'),
    startsAt: instant(row.startsAt, 'conflict start', 'DATA_OPERATION_FAILED'), endsAt: optInstant(row.endsAt, 'conflict end', 'DATA_OPERATION_FAILED'),
  });
}
function conflictArray(value: unknown): readonly CalendarConflictItem[] {
  if (!Array.isArray(value)) return fail('conflict list', 'DATA_OPERATION_FAILED');
  return Object.freeze(value.map(parseConflictItem));
}
function parseConflictResult(value: unknown): CalendarConflictResult {
  const row = record(value, 'conflict response');
  if (row.schema !== 'enjaz.scheduling-conflict.v1') return fail('conflict schema', 'DATA_OPERATION_FAILED');
  return Object.freeze({ state: oneOf(row.state, CONFLICT_STATES, 'conflict state'), conflicts: conflictArray(row.conflicts), unknownRanges: conflictArray(row.unknownRanges) });
}

export function createSchedulingCommandGateway(client: EnjazSupabaseClient, timeoutMs = 15_000): SchedulingCommandGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid scheduling command timeout');
  const rpc = client as unknown as RpcClientLike;
  const call = async (name: string, args: Readonly<Record<string, unknown>>): Promise<unknown> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve(rpc.rpc(name, args)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DataAccessError('Scheduling command timeout', 'DATA_UNAVAILABLE')), timeoutMs); }),
      ]);
      if (result.error) throw normalizeDataFailure(result.error);
      return result.data;
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw normalizeThrownDataFailure(error, 'write');
    } finally { if (timer) clearTimeout(timer); }
  };
  const bCall = async (name: string, input: BCommandInput, args: Readonly<Record<string, unknown>>) => parseCalendarEventResult(await call(name, { ...commandIds(input), ...args }));

  return Object.freeze({
    async mutateCalendarState(input: CalendarStateMutationInput) {
      const action = input.action;
      if (action !== 'complete' && action !== 'cancel') return fail('calendar lifecycle action', 'DATA_VALIDATION_FAILED');
      const reason = input.reason?.trim() ? text(input.reason, 'scheduling reason', 1200) : null;
      if (action === 'cancel' && !reason) throw new DataAccessError('Cancellation reason is required', 'DATA_VALIDATION_FAILED');
      return parseCalendarResult(await call('mutate_calendar_event_state_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'), p_event_id: uuid(input.eventId, 'event id'), p_operation_id: uuid(input.operationId, 'operation id'),
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_action: action, p_reason: reason,
      }));
    },
    async mutateRenewalState(input: RenewalStateMutationInput) {
      const action = input.action;
      if (action !== 'complete' && action !== 'cancel') return fail('renewal lifecycle action', 'DATA_VALIDATION_FAILED');
      const reason = input.reason?.trim() ? text(input.reason, 'scheduling reason', 1200) : null;
      if (action === 'cancel' && !reason) throw new DataAccessError('Cancellation reason is required', 'DATA_VALIDATION_FAILED');
      return parseRenewalResult(await call('mutate_renewal_state_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'), p_renewal_id: uuid(input.renewalId, 'renewal id'), p_operation_id: uuid(input.operationId, 'operation id'),
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_action: action, p_reason: reason,
      }));
    },
    async checkCalendarEventStaffConflicts(input: CheckCalendarEventStaffConflictsInput) {
      return parseConflictResult(await call('check_calendar_event_staff_conflicts_v1', {
        p_workspace_id: uuid(input.workspaceId, 'workspace id'), p_starts_at: instant(input.startsAt, 'calendar start', 'DATA_VALIDATION_FAILED'),
        p_ends_at: optInstant(input.endsAt, 'calendar end', 'DATA_VALIDATION_FAILED'), p_staff_member_ids: uuidList(input.staffMemberIds),
        p_exclude_event_id: optUuid(input.excludeEventId, 'excluded event id'),
      }));
    },
    async createCalendarEvent(input: CreateCalendarEventInput) {
      return bCall('create_calendar_event_v1', input, {
        p_title: text(input.title, 'calendar title', 320), p_event_type: text(input.eventType, 'event type', 120),
        p_starts_at: instant(input.startsAt, 'calendar start', 'DATA_VALIDATION_FAILED'), p_ends_at: optInstant(input.endsAt, 'calendar end', 'DATA_VALIDATION_FAILED'),
        p_transaction_id: optUuid(input.transactionId, 'transaction id'), p_company_id: optUuid(input.companyId, 'company id'), p_contact_id: optUuid(input.contactId, 'contact id'),
        p_workflow_instance_id: optUuid(input.workflowInstanceId, 'workflow id'), p_staff_member_ids: uuidList(input.staffMemberIds), p_note: optText(input.note, 'calendar note', 4000),
      });
    },
    async updateCalendarEventMetadata(input: UpdateCalendarEventMetadataInput) {
      return bCall('update_calendar_event_metadata_v1', input, {
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_title: text(input.title, 'calendar title', 320), p_event_type: text(input.eventType, 'event type', 120),
        p_transaction_id: optUuid(input.transactionId, 'transaction id'), p_company_id: optUuid(input.companyId, 'company id'), p_contact_id: optUuid(input.contactId, 'contact id'),
        p_workflow_instance_id: optUuid(input.workflowInstanceId, 'workflow id'), p_note: optText(input.note, 'calendar note', 4000),
      });
    },
    async rescheduleCalendarEvent(input: RescheduleCalendarEventInput) {
      return bCall('reschedule_calendar_event_v1', input, {
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_starts_at: instant(input.startsAt, 'calendar start', 'DATA_VALIDATION_FAILED'),
        p_ends_at: optInstant(input.endsAt, 'calendar end', 'DATA_VALIDATION_FAILED'), p_reason: text(input.reason, 'reschedule reason', 1200),
      });
    },
    async setCalendarEventStaff(input: SetCalendarEventStaffInput) {
      return bCall('set_calendar_event_staff_v1', input, {
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_staff_member_ids: uuidList(input.staffMemberIds), p_reason: optText(input.reason, 'staff reason', 1200),
      });
    },
    async setCalendarEventConfirmation(input: SetCalendarEventConfirmationInput) {
      if (input.status !== 'confirmed' && input.status !== 'declined') return fail('confirmation status', 'DATA_VALIDATION_FAILED');
      return bCall('set_calendar_event_confirmation_v1', input, {
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_confirmation_status: input.status, p_response_id: optUuid(input.responseId, 'portal response id'),
      });
    },
    async recordCalendarEventAttendance(input: RecordCalendarEventAttendanceInput) {
      if (input.outcome !== 'attended' && input.outcome !== 'missed') return fail('attendance outcome', 'DATA_VALIDATION_FAILED');
      return bCall('record_calendar_event_attendance_v1', input, {
        p_expected_version: positive(input.expectedVersion, 'expected version'), p_outcome: input.outcome, p_note: optText(input.note, 'attendance note', 1200),
      });
    },
  });
}
