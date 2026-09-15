import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type SchedulingLifecycleAction = 'complete' | 'cancel';
export type CalendarConfirmationStatus = 'confirmed' | 'declined';
export type CalendarAttendanceOutcome = 'attended' | 'missed';
export type CalendarConflictState = 'clear' | 'conflict' | 'unknown_assignment' | 'unknown_range';

export type CalendarStateMutationInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  action: SchedulingLifecycleAction;
  reason?: string | null;
}>;

export type RenewalStateMutationInput = Readonly<{
  workspaceId: string;
  renewalId: string;
  operationId: string;
  expectedVersion: number;
  action: SchedulingLifecycleAction;
  reason?: string | null;
}>;

export type CreateCalendarEventInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  title: string;
  eventType: string;
  startsAt: string;
  endsAt?: string | null;
  transactionId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  workflowInstanceId?: string | null;
  staffMemberIds?: readonly string[];
  note?: string | null;
}>;

export type UpdateCalendarEventMetadataInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  title: string;
  eventType: string;
  transactionId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  workflowInstanceId?: string | null;
  note?: string | null;
}>;

export type RescheduleCalendarEventInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  startsAt: string;
  endsAt?: string | null;
  reason: string;
}>;

export type SetCalendarEventStaffInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  staffMemberIds: readonly string[];
  reason?: string | null;
}>;

export type SetCalendarEventConfirmationInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  status: CalendarConfirmationStatus;
  responseId?: string | null;
}>;

export type RecordCalendarEventAttendanceInput = Readonly<{
  workspaceId: string;
  eventId: string;
  operationId: string;
  expectedVersion: number;
  outcome: CalendarAttendanceOutcome;
  note?: string | null;
}>;

export type CheckCalendarEventStaffConflictsInput = Readonly<{
  workspaceId: string;
  startsAt: string;
  endsAt?: string | null;
  staffMemberIds: readonly string[];
  excludeEventId?: string | null;
}>;

export type CalendarStateMutationResult = Readonly<{
  id: string;
  workspaceId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  startsAt: string;
  endsAt: string | null;
  version: number;
  updatedAt: string;
  wasDuplicate: boolean;
}>;

export type RenewalStateMutationResult = Readonly<{
  id: string;
  workspaceId: string;
  status: 'active' | 'completed' | 'cancelled';
  dueDate: string;
  lastCompletedAt: string | null;
  version: number;
  updatedAt: string;
  wasDuplicate: boolean;
}>;

export type CalendarEventMutationResult = Readonly<{
  id: string;
  workspaceId: string;
  transactionId: string | null;
  companyId: string | null;
  contactId: string | null;
  workflowInstanceId: string | null;
  title: string;
  eventType: string;
  startsAt: string;
  endsAt: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  note: string | null;
  staffMemberIds: readonly string[];
  confirmationStatus: 'unconfirmed' | 'confirmed' | 'declined';
  confirmationAt: string | null;
  confirmationSource: 'staff' | 'client_portal' | null;
  confirmationResponseId: string | null;
  attendanceOutcome: 'attended' | 'missed' | 'cancelled' | null;
  attendanceRecordedAt: string | null;
  version: number;
  updatedAt: string;
  wasDuplicate: boolean;
  changed?: boolean;
}>;

export type CalendarConflictItem = Readonly<{
  eventId: string;
  organizationMemberId: string;
  startsAt: string;
  endsAt: string | null;
}>;

export type CalendarConflictResult = Readonly<{
  state: CalendarConflictState;
  conflicts: readonly CalendarConflictItem[];
  unknownRanges: readonly CalendarConflictItem[];
}>;

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

type RpcClientLike = {
  rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<{ data: unknown; error: DataFailureLike | null }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALENDAR_STATUSES = new Set(['scheduled', 'completed', 'cancelled']);
const RENEWAL_STATUSES = new Set(['active', 'completed', 'cancelled']);
const ACTIONS = new Set<SchedulingLifecycleAction>(['complete', 'cancel']);
const CONFIRMATION_STATUSES = new Set<CalendarConfirmationStatus>(['confirmed', 'declined']);
const ATTENDANCE_OUTCOMES = new Set<CalendarAttendanceOutcome>(['attended', 'missed']);
const CONFLICT_STATES = new Set<CalendarConflictState>(['clear', 'conflict', 'unknown_assignment', 'unknown_range']);
const EVENT_CONFIRMATION_STATUSES = new Set(['unconfirmed', 'confirmed', 'declined']);
const EVENT_CONFIRMATION_SOURCES = new Set(['staff', 'client_portal']);
const EVENT_ATTENDANCE_OUTCOMES = new Set(['attended', 'missed', 'cancelled']);

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value.trim().toLowerCase();
}

function optionalUuid(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireUuid(value, label);
}

function requireUuidList(value: readonly string[] | undefined, label: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  const normalized = [...new Set(value.map((item) => requireUuid(item, label)))].sort();
  return Object.freeze(normalized);
}

function requirePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value;
}

function requireText(value: unknown, label: string, max = 1200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000\r\n]/u.test(value)) {
    throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  }
  return value.trim();
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  return requireText(value, label, max);
}

function optionalReason(value: string | null | undefined, action: SchedulingLifecycleAction): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    if (action === 'cancel') throw new DataAccessError('Cancellation reason is required', 'DATA_VALIDATION_FAILED');
    return null;
  }
  return requireText(value, 'scheduling reason');
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}

function instant(value: unknown, label: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function inputInstant(value: unknown, label: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value;
}

function optionalInstant(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  return instant(value, label);
}

function optionalInputInstant(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  return inputInstant(value, label);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return boolean(value, label);
}

function requireResponseText(value: unknown, label: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function optionalResponseText(value: unknown, label: string, max = 4000): string | null {
  if (value === null || value === undefined) return null;
  return requireResponseText(value, label, max);
}

function parseCalendarResult(value: unknown): CalendarStateMutationResult {
  const row = record(value, 'calendar command response');
  const status = requireResponseText(row.status, 'calendar status', 24);
  if (!CALENDAR_STATUSES.has(status)) throw new DataAccessError('Invalid calendar status', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: requireUuid(row.id, 'calendar event id'),
    workspaceId: requireUuid(row.workspaceId ?? row.workspace_id, 'workspace id'),
    status: status as CalendarStateMutationResult['status'],
    startsAt: instant(row.startsAt ?? row.starts_at, 'calendar start'),
    endsAt: optionalInstant(row.endsAt ?? row.ends_at, 'calendar end'),
    version: requirePositiveInteger(row.version, 'calendar version'),
    updatedAt: instant(row.updatedAt ?? row.updated_at, 'calendar updated timestamp'),
    wasDuplicate: boolean(row.wasDuplicate ?? row.was_duplicate, 'calendar duplicate marker'),
  });
}

function requireDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function parseRenewalResult(value: unknown): RenewalStateMutationResult {
  const row = record(value, 'renewal command response');
  const status = requireResponseText(row.status, 'renewal status', 24);
  if (!RENEWAL_STATUSES.has(status)) throw new DataAccessError('Invalid renewal status', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: requireUuid(row.id, 'renewal id'),
    workspaceId: requireUuid(row.workspaceId ?? row.workspace_id, 'workspace id'),
    status: status as RenewalStateMutationResult['status'],
    dueDate: requireDate(row.dueDate ?? row.due_date, 'renewal due date'),
    lastCompletedAt: optionalInstant(row.lastCompletedAt ?? row.last_completed_at, 'renewal completion timestamp'),
    version: requirePositiveInteger(row.version, 'renewal version'),
    updatedAt: instant(row.updatedAt ?? row.updated_at, 'renewal updated timestamp'),
    wasDuplicate: boolean(row.wasDuplicate ?? row.was_duplicate, 'renewal duplicate marker'),
  });
}

function parseUuidArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return Object.freeze(value.map((item) => requireUuid(item, label)));
}

function parseCalendarEventResult(value: unknown): CalendarEventMutationResult {
  const row = record(value, 'calendar event command response');
  if (row.schema !== 'enjaz.scheduling-calendar-event.v2') throw new DataAccessError('Invalid calendar event schema', 'DATA_OPERATION_FAILED');
  const status = requireResponseText(row.status, 'calendar status', 24);
  const confirmationStatus = requireResponseText(row.confirmationStatus ?? row.confirmation_status, 'confirmation status', 24);
  const confirmationSourceRaw = row.confirmationSource ?? row.confirmation_source;
  const attendanceOutcomeRaw = row.attendanceOutcome ?? row.attendance_outcome;
  if (!CALENDAR_STATUSES.has(status)) throw new DataAccessError('Invalid calendar status', 'DATA_OPERATION_FAILED');
  if (!EVENT_CONFIRMATION_STATUSES.has(confirmationStatus)) throw new DataAccessError('Invalid confirmation status', 'DATA_OPERATION_FAILED');
  const confirmationSource = confirmationSourceRaw === null || confirmationSourceRaw === undefined ? null : requireResponseText(confirmationSourceRaw, 'confirmation source', 24);
  if (confirmationSource !== null && !EVENT_CONFIRMATION_SOURCES.has(confirmationSource)) throw new DataAccessError('Invalid confirmation source', 'DATA_OPERATION_FAILED');
  const attendanceOutcome = attendanceOutcomeRaw === null || attendanceOutcomeRaw === undefined ? null : requireResponseText(attendanceOutcomeRaw, 'attendance outcome', 24);
  if (attendanceOutcome !== null && !EVENT_ATTENDANCE_OUTCOMES.has(attendanceOutcome)) throw new DataAccessError('Invalid attendance outcome', 'DATA_OPERATION_FAILED');
  const changed = optionalBoolean(row.changed, 'calendar changed marker');
  return Object.freeze({
    id: requireUuid(row.id, 'calendar event id'),
    workspaceId: requireUuid(row.workspaceId ?? row.workspace_id, 'workspace id'),
    transactionId: optionalUuid(row.transactionId ?? row.transaction_id, 'transaction id'),
    companyId: optionalUuid(row.companyId ?? row.company_id, 'company id'),
    contactId: optionalUuid(row.contactId ?? row.contact_id, 'contact id'),
    workflowInstanceId: optionalUuid(row.workflowInstanceId ?? row.workflow_instance_id, 'workflow instance id'),
    title: requireResponseText(row.title, 'calendar title', 320),
    eventType: requireResponseText(row.eventType ?? row.event_type, 'calendar event type', 120),
    startsAt: instant(row.startsAt ?? row.starts_at, 'calendar start'),
    endsAt: optionalInstant(row.endsAt ?? row.ends_at, 'calendar end'),
    status: status as CalendarEventMutationResult['status'],
    note: optionalResponseText(row.note, 'calendar note', 4000),
    staffMemberIds: parseUuidArray(row.staffMemberIds ?? row.staff_member_ids, 'staff member id'),
    confirmationStatus: confirmationStatus as CalendarEventMutationResult['confirmationStatus'],
    confirmationAt: optionalInstant(row.confirmationAt ?? row.confirmation_at, 'confirmation timestamp'),
    confirmationSource: confirmationSource as CalendarEventMutationResult['confirmationSource'],
    confirmationResponseId: optionalUuid(row.confirmationResponseId ?? row.confirmation_response_id, 'confirmation response id'),
    attendanceOutcome: attendanceOutcome as CalendarEventMutationResult['attendanceOutcome'],
    attendanceRecordedAt: optionalInstant(row.attendanceRecordedAt ?? row.attendance_recorded_at, 'attendance timestamp'),
    version: requirePositiveInteger(row.version, 'calendar version'),
    updatedAt: instant(row.updatedAt ?? row.updated_at, 'calendar updated timestamp'),
    wasDuplicate: boolean(row.wasDuplicate ?? row.was_duplicate, 'calendar duplicate marker'),
    ...(changed === undefined ? {} : { changed }),
  });
}

function parseConflictItem(value: unknown, label: string): CalendarConflictItem {
  const row = record(value, label);
  return Object.freeze({
    eventId: requireUuid(row.eventId ?? row.event_id, 'conflict event id'),
    organizationMemberId: requireUuid(row.organizationMemberId ?? row.organization_member_id, 'conflict organization member id'),
    startsAt: instant(row.startsAt ?? row.starts_at, 'conflict start'),
    endsAt: optionalInstant(row.endsAt ?? row.ends_at, 'conflict end'),
  });
}

function parseConflictArray(value: unknown, label: string): readonly CalendarConflictItem[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return Object.freeze(value.map((entry, index) => parseConflictItem(entry, `${label}[${index}]`)));
}

function parseConflictResult(value: unknown): CalendarConflictResult {
  const row = record(value, 'calendar conflict response');
  if (row.schema !== 'enjaz.scheduling-conflict.v1') throw new DataAccessError('Invalid calendar conflict schema', 'DATA_OPERATION_FAILED');
  const state = requireResponseText(row.state, 'conflict state', 32);
  if (!CONFLICT_STATES.has(state as CalendarConflictState)) throw new DataAccessError('Invalid calendar conflict state', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    state: state as CalendarConflictState,
    conflicts: parseConflictArray(row.conflicts, 'conflicts'),
    unknownRanges: parseConflictArray(row.unknownRanges ?? row.unknown_ranges, 'unknown ranges'),
  });
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
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return Object.freeze({
    async mutateCalendarState(input: CalendarStateMutationInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      const expectedVersion = requirePositiveInteger(input.expectedVersion, 'calendar expected version');
      if (!ACTIONS.has(input.action)) throw new DataAccessError('Invalid calendar lifecycle action', 'DATA_VALIDATION_FAILED');
      const reason = optionalReason(input.reason, input.action);
      return parseCalendarResult(await call('mutate_calendar_event_state_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: expectedVersion,
        p_action: input.action,
        p_reason: reason,
      }));
    },

    async mutateRenewalState(input: RenewalStateMutationInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const renewalId = requireUuid(input.renewalId, 'renewal id');
      const operationId = requireUuid(input.operationId, 'operation id');
      const expectedVersion = requirePositiveInteger(input.expectedVersion, 'renewal expected version');
      if (!ACTIONS.has(input.action)) throw new DataAccessError('Invalid renewal lifecycle action', 'DATA_VALIDATION_FAILED');
      const reason = optionalReason(input.reason, input.action);
      return parseRenewalResult(await call('mutate_renewal_state_v1', {
        p_workspace_id: workspaceId,
        p_renewal_id: renewalId,
        p_operation_id: operationId,
        p_expected_version: expectedVersion,
        p_action: input.action,
        p_reason: reason,
      }));
    },

    async checkCalendarEventStaffConflicts(input: CheckCalendarEventStaffConflictsInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const startsAt = inputInstant(input.startsAt, 'calendar start');
      const endsAt = optionalInputInstant(input.endsAt, 'calendar end');
      const staffMemberIds = requireUuidList(input.staffMemberIds, 'staff member id');
      const excludeEventId = optionalUuid(input.excludeEventId, 'excluded calendar event id');
      return parseConflictResult(await call('check_calendar_event_staff_conflicts_v1', {
        p_workspace_id: workspaceId,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_staff_member_ids: staffMemberIds,
        p_exclude_event_id: excludeEventId,
      }));
    },

    async createCalendarEvent(input: CreateCalendarEventInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      const title = requireText(input.title, 'calendar title', 320);
      const eventType = requireText(input.eventType, 'calendar event type', 120);
      const startsAt = inputInstant(input.startsAt, 'calendar start');
      const endsAt = optionalInputInstant(input.endsAt, 'calendar end');
      const staffMemberIds = requireUuidList(input.staffMemberIds, 'staff member id');
      return parseCalendarEventResult(await call('create_calendar_event_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_title: title,
        p_event_type: eventType,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_transaction_id: optionalUuid(input.transactionId, 'transaction id'),
        p_company_id: optionalUuid(input.companyId, 'company id'),
        p_contact_id: optionalUuid(input.contactId, 'contact id'),
        p_workflow_instance_id: optionalUuid(input.workflowInstanceId, 'workflow instance id'),
        p_staff_member_ids: staffMemberIds,
        p_note: optionalText(input.note, 'calendar note', 4000),
      }));
    },

    async updateCalendarEventMetadata(input: UpdateCalendarEventMetadataInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      return parseCalendarEventResult(await call('update_calendar_event_metadata_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: requirePositiveInteger(input.expectedVersion, 'calendar expected version'),
        p_title: requireText(input.title, 'calendar title', 320),
        p_event_type: requireText(input.eventType, 'calendar event type', 120),
        p_transaction_id: optionalUuid(input.transactionId, 'transaction id'),
        p_company_id: optionalUuid(input.companyId, 'company id'),
        p_contact_id: optionalUuid(input.contactId, 'contact id'),
        p_workflow_instance_id: optionalUuid(input.workflowInstanceId, 'workflow instance id'),
        p_note: optionalText(input.note, 'calendar note', 4000),
      }));
    },

    async rescheduleCalendarEvent(input: RescheduleCalendarEventInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      return parseCalendarEventResult(await call('reschedule_calendar_event_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: requirePositiveInteger(input.expectedVersion, 'calendar expected version'),
        p_starts_at: inputInstant(input.startsAt, 'calendar start'),
        p_ends_at: optionalInputInstant(input.endsAt, 'calendar end'),
        p_reason: requireText(input.reason, 'reschedule reason', 1200),
      }));
    },

    async setCalendarEventStaff(input: SetCalendarEventStaffInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      return parseCalendarEventResult(await call('set_calendar_event_staff_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: requirePositiveInteger(input.expectedVersion, 'calendar expected version'),
        p_staff_member_ids: requireUuidList(input.staffMemberIds, 'staff member id'),
        p_reason: optionalText(input.reason, 'staff assignment reason', 1200),
      }));
    },

    async setCalendarEventConfirmation(input: SetCalendarEventConfirmationInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      if (!CONFIRMATION_STATUSES.has(input.status)) throw new DataAccessError('Invalid confirmation status', 'DATA_VALIDATION_FAILED');
      return parseCalendarEventResult(await call('set_calendar_event_confirmation_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: requirePositiveInteger(input.expectedVersion, 'calendar expected version'),
        p_confirmation_status: input.status,
        p_response_id: optionalUuid(input.responseId, 'portal response id'),
      }));
    },

    async recordCalendarEventAttendance(input: RecordCalendarEventAttendanceInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const eventId = requireUuid(input.eventId, 'calendar event id');
      const operationId = requireUuid(input.operationId, 'operation id');
      if (!ATTENDANCE_OUTCOMES.has(input.outcome)) throw new DataAccessError('Invalid attendance outcome', 'DATA_VALIDATION_FAILED');
      return parseCalendarEventResult(await call('record_calendar_event_attendance_v1', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_operation_id: operationId,
        p_expected_version: requirePositiveInteger(input.expectedVersion, 'calendar expected version'),
        p_outcome: input.outcome,
        p_note: optionalText(input.note, 'attendance note', 1200),
      }));
    },
  });
}
