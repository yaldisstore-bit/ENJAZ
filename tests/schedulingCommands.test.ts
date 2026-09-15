import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createSchedulingCommandGateway } from '../src/features/scheduling/schedulingCommands.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';
const RENEWAL = '33333333-3333-4333-8333-333333333333';
const OPERATION = '44444444-4444-4444-8444-444444444444';
const STAFF_A = '55555555-5555-4555-8555-555555555555';
const STAFF_B = '66666666-6666-4666-8666-666666666666';
const TRANSACTION = '77777777-7777-4777-8777-777777777777';
const WORKFLOW = '88888888-8888-4888-8888-888888888888';
const RESPONSE = '99999999-9999-4999-8999-999999999999';
const STARTS_AT = '2026-09-16T08:00:00.000Z';
const ENDS_AT = '2026-09-16T09:00:00.000Z';

type RpcCall = Readonly<{ name: string; args: Readonly<Record<string, unknown>> }>;

function clientFor(handler: (name: string, args: Readonly<Record<string, unknown>>) => unknown, calls: RpcCall[]): EnjazSupabaseClient {
  return {
    async rpc(name: string, args: Readonly<Record<string, unknown>>) {
      calls.push(Object.freeze({ name, args }));
      return { data: handler(name, args), error: null };
    },
  } as unknown as EnjazSupabaseClient;
}

function calendarV2(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schema: 'enjaz.scheduling-calendar-event.v2',
    id: EVENT,
    workspaceId: WORKSPACE,
    transactionId: TRANSACTION,
    companyId: null,
    contactId: null,
    workflowInstanceId: WORKFLOW,
    title: 'موعد حكومي',
    eventType: 'government_visit',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    status: 'scheduled',
    note: null,
    staffMemberIds: [STAFF_A],
    confirmationStatus: 'unconfirmed',
    confirmationAt: null,
    confirmationSource: null,
    confirmationResponseId: null,
    attendanceOutcome: null,
    attendanceRecordedAt: null,
    version: 1,
    updatedAt: '2026-09-15T21:00:00.000Z',
    wasDuplicate: false,
    ...overrides,
  };
}

test('calendar command sends exact governed RPC identity and parses immutable response evidence', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({
    schema: 'enjaz.scheduling-calendar-state.v1', id: EVENT, workspaceId: WORKSPACE, status: 'completed',
    startsAt: STARTS_AT, endsAt: ENDS_AT, version: 2,
    updatedAt: '2026-09-15T19:35:00.000Z', wasDuplicate: false,
  }), calls));
  const result = await gateway.mutateCalendarState({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, action: 'complete' });
  assert.equal(result.status, 'completed');
  assert.equal(result.version, 2);
  assert.equal(result.wasDuplicate, false);
  assert.deepEqual(calls, [{
    name: 'mutate_calendar_event_state_v1',
    args: {
      p_workspace_id: WORKSPACE,
      p_event_id: EVENT,
      p_operation_id: OPERATION,
      p_expected_version: 1,
      p_action: 'complete',
      p_reason: null,
    },
  }]);
});

test('renewal command preserves idempotency identity and completion evidence', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({
    schema: 'enjaz.scheduling-renewal-state.v1', id: RENEWAL, workspaceId: WORKSPACE, status: 'completed',
    dueDate: '2026-10-01', lastCompletedAt: '2026-09-15T19:35:00.000Z', version: 2,
    updatedAt: '2026-09-15T19:35:00.000Z', wasDuplicate: true,
  }), calls));
  const result = await gateway.mutateRenewalState({ workspaceId: WORKSPACE, renewalId: RENEWAL, operationId: OPERATION, expectedVersion: 1, action: 'complete' });
  assert.equal(result.lastCompletedAt, '2026-09-15T19:35:00.000Z');
  assert.equal(result.wasDuplicate, true);
  assert.equal(calls[0]?.name, 'mutate_renewal_state_v1');
  assert.equal(calls[0]?.args.p_expected_version, 1);
});

test('cancel fails closed without an explicit reason and never calls RPC', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({}), calls));
  await assert.rejects(
    () => gateway.mutateCalendarState({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, action: 'cancel' }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(calls.length, 0);
});

test('malformed scheduling response fails closed instead of fabricating a successful state', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({ id: EVENT, workspaceId: WORKSPACE, status: 'completed', version: 2 }), calls));
  await assert.rejects(
    () => gateway.mutateCalendarState({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, action: 'complete' }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OPERATION_FAILED',
  );
});

test('invalid expected version is rejected before network mutation', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({}), calls));
  await assert.rejects(
    () => gateway.mutateRenewalState({ workspaceId: WORKSPACE, renewalId: RENEWAL, operationId: OPERATION, expectedVersion: 0, action: 'complete' }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(calls.length, 0);
});

test('conflict preview preserves fail-closed state and exact staff/range identity', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({
    schema: 'enjaz.scheduling-conflict.v1',
    state: 'conflict',
    conflicts: [{ eventId: EVENT, organizationMemberId: STAFF_A, startsAt: STARTS_AT, endsAt: ENDS_AT }],
    unknownRanges: [],
  }), calls));
  const result = await gateway.checkCalendarEventStaffConflicts({
    workspaceId: WORKSPACE,
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    staffMemberIds: [STAFF_B, STAFF_A, STAFF_A],
    excludeEventId: EVENT,
  });
  assert.equal(result.state, 'conflict');
  assert.equal(result.conflicts[0]?.organizationMemberId, STAFF_A);
  assert.deepEqual(calls, [{
    name: 'check_calendar_event_staff_conflicts_v1',
    args: {
      p_workspace_id: WORKSPACE,
      p_starts_at: STARTS_AT,
      p_ends_at: ENDS_AT,
      p_staff_member_ids: [STAFF_A, STAFF_B],
      p_exclude_event_id: EVENT,
    },
  }]);
});

test('appointment create sends canonical references and normalized explicit staff only', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ staffMemberIds: [STAFF_A, STAFF_B] }), calls));
  const result = await gateway.createCalendarEvent({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    title: '  موعد حكومي  ',
    eventType: ' government_visit ',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    transactionId: TRANSACTION,
    workflowInstanceId: WORKFLOW,
    staffMemberIds: [STAFF_B, STAFF_A, STAFF_B],
    note: '  مراجعة أصل المعاملة  ',
  });
  assert.deepEqual(result.staffMemberIds, [STAFF_A, STAFF_B]);
  assert.equal(result.workflowInstanceId, WORKFLOW);
  assert.deepEqual(calls, [{
    name: 'create_calendar_event_v1',
    args: {
      p_workspace_id: WORKSPACE,
      p_event_id: EVENT,
      p_operation_id: OPERATION,
      p_title: 'موعد حكومي',
      p_event_type: 'government_visit',
      p_starts_at: STARTS_AT,
      p_ends_at: ENDS_AT,
      p_transaction_id: TRANSACTION,
      p_company_id: null,
      p_contact_id: null,
      p_workflow_instance_id: WORKFLOW,
      p_staff_member_ids: [STAFF_A, STAFF_B],
      p_note: 'مراجعة أصل المعاملة',
    },
  }]);
});

test('metadata update cannot smuggle timing fields and uses optimistic version', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ version: 4, title: 'موعد معدل' }), calls));
  const result = await gateway.updateCalendarEventMetadata({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    expectedVersion: 3,
    title: 'موعد معدل',
    eventType: 'review',
    transactionId: TRANSACTION,
    workflowInstanceId: null,
    note: null,
  });
  assert.equal(result.version, 4);
  assert.equal(calls[0]?.name, 'update_calendar_event_metadata_v1');
  assert.equal(calls[0]?.args.p_expected_version, 3);
  assert.equal('p_starts_at' in (calls[0]?.args ?? {}), false);
  assert.equal('p_ends_at' in (calls[0]?.args ?? {}), false);
});

test('reschedule sends exact range/reason and rejects blank reason before network', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ version: 2 }), calls));
  const result = await gateway.rescheduleCalendarEvent({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    expectedVersion: 1,
    startsAt: '2026-09-16T10:00:00.000Z',
    endsAt: '2026-09-16T11:00:00.000Z',
    reason: '  تغيير موعد المراجعة  ',
  });
  assert.equal(result.version, 2);
  assert.equal(calls[0]?.name, 'reschedule_calendar_event_v1');
  assert.equal(calls[0]?.args.p_reason, 'تغيير موعد المراجعة');

  const rejectedCalls: RpcCall[] = [];
  const rejected = createSchedulingCommandGateway(clientFor(() => calendarV2(), rejectedCalls));
  await assert.rejects(
    () => rejected.rescheduleCalendarEvent({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, startsAt: STARTS_AT, endsAt: ENDS_AT, reason: '   ' }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(rejectedCalls.length, 0);
});

test('staff replacement is explicit, normalized and preserves changed evidence', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ staffMemberIds: [STAFF_B], version: 3, changed: true }), calls));
  const result = await gateway.setCalendarEventStaff({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    expectedVersion: 2,
    staffMemberIds: [STAFF_B, STAFF_B],
    reason: 'تغيير الموظف المسؤول',
  });
  assert.equal(result.changed, true);
  assert.deepEqual(result.staffMemberIds, [STAFF_B]);
  assert.deepEqual(calls[0]?.args.p_staff_member_ids, [STAFF_B]);
  assert.equal(calls[0]?.name, 'set_calendar_event_staff_v1');
});

test('portal confirmation carries response evidence and invalid decision never reaches RPC', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ confirmationStatus: 'confirmed', confirmationSource: 'client_portal', confirmationResponseId: RESPONSE, confirmationAt: '2026-09-15T21:05:00.000Z', version: 2 }), calls));
  const result = await gateway.setCalendarEventConfirmation({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    expectedVersion: 1,
    status: 'confirmed',
    responseId: RESPONSE,
  });
  assert.equal(result.confirmationSource, 'client_portal');
  assert.equal(result.confirmationResponseId, RESPONSE);
  assert.equal(calls[0]?.name, 'set_calendar_event_confirmation_v1');
  assert.equal(calls[0]?.args.p_response_id, RESPONSE);

  const rejectedCalls: RpcCall[] = [];
  const rejected = createSchedulingCommandGateway(clientFor(() => calendarV2(), rejectedCalls));
  await assert.rejects(
    () => rejected.setCalendarEventConfirmation({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, status: 'maybe' as never }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(rejectedCalls.length, 0);
});

test('attendance is explicit and invalid inferred outcome fails before network', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ status: 'completed', attendanceOutcome: 'attended', attendanceRecordedAt: '2026-09-16T09:05:00.000Z', version: 2 }), calls));
  const result = await gateway.recordCalendarEventAttendance({
    workspaceId: WORKSPACE,
    eventId: EVENT,
    operationId: OPERATION,
    expectedVersion: 1,
    outcome: 'attended',
    note: 'تمت المراجعة حضورياً',
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.attendanceOutcome, 'attended');
  assert.equal(calls[0]?.name, 'record_calendar_event_attendance_v1');
  assert.equal(calls[0]?.args.p_outcome, 'attended');

  const rejectedCalls: RpcCall[] = [];
  const rejected = createSchedulingCommandGateway(clientFor(() => calendarV2(), rejectedCalls));
  await assert.rejects(
    () => rejected.recordCalendarEventAttendance({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, expectedVersion: 1, outcome: 'elapsed' as never }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(rejectedCalls.length, 0);
});

test('wrong B response schema fails closed instead of accepting shadow appointment truth', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => calendarV2({ schema: 'shadow.calendar.v1' }), calls));
  await assert.rejects(
    () => gateway.createCalendarEvent({ workspaceId: WORKSPACE, eventId: EVENT, operationId: OPERATION, title: 'موعد', eventType: 'review', startsAt: STARTS_AT, endsAt: ENDS_AT }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_OPERATION_FAILED',
  );
  assert.equal(calls.length, 1);
});
