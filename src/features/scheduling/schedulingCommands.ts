import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type SchedulingLifecycleAction = 'complete' | 'cancel';

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

export interface SchedulingCommandGateway {
  mutateCalendarState(input: CalendarStateMutationInput): Promise<CalendarStateMutationResult>;
  mutateRenewalState(input: RenewalStateMutationInput): Promise<RenewalStateMutationResult>;
}

type RpcClientLike = {
  rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<{ data: unknown; error: DataFailureLike | null }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALENDAR_STATUSES = new Set(['scheduled', 'completed', 'cancelled']);
const RENEWAL_STATUSES = new Set(['active', 'completed', 'cancelled']);
const ACTIONS = new Set<SchedulingLifecycleAction>(['complete', 'cancel']);

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value.trim().toLowerCase();
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

function optionalInstant(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  return instant(value, label);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function parseCalendarResult(value: unknown): CalendarStateMutationResult {
  const row = record(value, 'calendar command response');
  const status = requireText(row.status, 'calendar status', 24);
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
  const status = requireText(row.status, 'renewal status', 24);
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
  });
}
