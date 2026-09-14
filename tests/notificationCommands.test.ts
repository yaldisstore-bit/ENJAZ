import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createNotificationCommandGateway } from '../src/features/notifications/notificationCommands.ts';

const WS = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const FOLLOWUP = '33333333-3333-4333-8333-333333333333';
const NOTIFICATION = '44444444-4444-4444-8444-444444444444';
const SOURCE = '55555555-5555-4555-8555-555555555555';

function fakeClient(options: Readonly<{
  rpc?: (name: string, args: Readonly<Record<string, unknown>>) => Promise<{ data: unknown; error: null }>;
  rows?: readonly Readonly<Record<string, unknown>>[];
}>) {
  const operations: Array<readonly unknown[]> = [];
  const rows = options.rows ?? [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select','eq','is','lte','order','limit']) {
    builder[method] = (...args: unknown[]) => { operations.push([method, ...args]); return builder; };
  }
  builder.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: rows, error: null }));
  const rpcCalls: Array<Readonly<{ name: string; args: Readonly<Record<string, unknown>> }>> = [];
  const client = {
    from(table: string) { operations.push(['from', table]); return builder; },
    async rpc(name: string, args: Readonly<Record<string, unknown>>) {
      rpcCalls.push(Object.freeze({ name, args }));
      if (options.rpc) return options.rpc(name, args);
      return { data: null, error: null };
    },
  } as unknown as EnjazSupabaseClient;
  return { client, operations, rpcCalls };
}

function notificationRow() {
  return {
    id: NOTIFICATION,
    workspace_id: WS,
    user_id: USER,
    category: 'deadline',
    priority: 'high',
    title: 'موعد مهم',
    source_type: 'transaction',
    source_id: SOURCE,
    event_key: 'deadline:primary',
    source_version: 2,
    source_occurred_at: '2026-09-14T10:00:00.000Z',
    scheduled_for: '2026-09-14T11:00:00.000Z',
    read_at: null,
    snoozed_until: null,
    cancelled_at: null,
    created_at: '2026-09-14T10:00:00.000Z',
    updated_at: '2026-09-14T10:00:00.000Z',
  };
}

test('follow-up lifecycle mutation is routed only through governed RPC', async () => {
  const fake = fakeClient({
    rpc: async () => ({
      data: {
        schema: 'enjaz.transaction-followup-state.v1', id: FOLLOWUP, workspaceId: WS,
        status: 'completed', completedAt: '2026-09-14T12:00:00.000Z', completedBy: USER, snoozedUntil: null,
      },
      error: null,
    }),
  });
  const gateway = createNotificationCommandGateway(fake.client);
  const result = await gateway.mutateFollowup({ workspaceId: WS, followupId: FOLLOWUP, action: 'complete' });
  assert.equal(result.status, 'completed');
  assert.equal(fake.rpcCalls.length, 1);
  assert.equal(fake.rpcCalls[0]?.name, 'mutate_transaction_followup_state_v1');
  assert.deepEqual(fake.rpcCalls[0]?.args, {
    p_workspace_id: WS,
    p_followup_id: FOLLOWUP,
    p_action: 'complete',
    p_snoozed_until: null,
  });
});

test('notification mutation uses governed RPC then re-reads through RLS table path', async () => {
  const fake = fakeClient({
    rows: [notificationRow()],
    rpc: async () => ({ data: { id: NOTIFICATION }, error: null }),
  });
  const gateway = createNotificationCommandGateway(fake.client);
  const result = await gateway.mutateNotification({ workspaceId: WS, notificationId: NOTIFICATION, action: 'mark_read' });
  assert.equal(result.id, NOTIFICATION);
  assert.equal(fake.rpcCalls[0]?.name, 'mutate_in_app_notification_state_v1');
  assert.ok(fake.operations.some((entry) => entry[0] === 'from' && entry[1] === 'in_app_notifications'));
});

test('invalid or stale snooze is rejected before any RPC write', async () => {
  const fake = fakeClient({});
  const gateway = createNotificationCommandGateway(fake.client);
  await assert.rejects(
    () => gateway.mutateFollowup({ workspaceId: WS, followupId: FOLLOWUP, action: 'snooze', snoozedUntil: '2020-01-01T00:00:00.000Z' }),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_VALIDATION_FAILED',
  );
  assert.equal(fake.rpcCalls.length, 0);
});

test('notification list is workspace-scoped, excludes cancelled/future rows at query boundary and can request unread only', async () => {
  const fake = fakeClient({ rows: [notificationRow()] });
  const gateway = createNotificationCommandGateway(fake.client);
  const rows = await gateway.list({ workspaceId: WS, unreadOnly: true, limit: 20 });
  assert.equal(rows.length, 1);
  assert.ok(fake.operations.some((entry) => entry[0] === 'eq' && entry[1] === 'workspace_id' && entry[2] === WS));
  assert.ok(fake.operations.some((entry) => entry[0] === 'is' && entry[1] === 'cancelled_at' && entry[2] === null));
  assert.ok(fake.operations.some((entry) => entry[0] === 'is' && entry[1] === 'read_at' && entry[2] === null));
  assert.ok(fake.operations.some((entry) => entry[0] === 'lte' && entry[1] === 'scheduled_for'));
});
