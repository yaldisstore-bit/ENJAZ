import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createSchedulingCommandGateway } from '../src/features/scheduling/schedulingCommands.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';
const RENEWAL = '33333333-3333-4333-8333-333333333333';
const OPERATION = '44444444-4444-4444-8444-444444444444';

type RpcCall = Readonly<{ name: string; args: Readonly<Record<string, unknown>> }>;

function clientFor(handler: (name: string, args: Readonly<Record<string, unknown>>) => unknown, calls: RpcCall[]): EnjazSupabaseClient {
  return {
    async rpc(name: string, args: Readonly<Record<string, unknown>>) {
      calls.push(Object.freeze({ name, args }));
      return { data: handler(name, args), error: null };
    },
  } as unknown as EnjazSupabaseClient;
}

test('calendar command sends exact governed RPC identity and parses immutable response evidence', async () => {
  const calls: RpcCall[] = [];
  const gateway = createSchedulingCommandGateway(clientFor(() => ({
    schema: 'enjaz.scheduling-calendar-state.v1', id: EVENT, workspaceId: WORKSPACE, status: 'completed',
    startsAt: '2026-09-16T08:00:00.000Z', endsAt: '2026-09-16T09:00:00.000Z', version: 2,
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
