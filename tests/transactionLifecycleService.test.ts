import assert from 'node:assert/strict';
import test from 'node:test';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import type { DataPage, RowOf } from '../src/data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import { classifyTransactionView } from '../src/features/transactions/transactionListModel.ts';
import { TransactionLifecycleRuleError } from '../src/features/transactions/transactionLifecycleModel.ts';
import {
  applyTransactionLifecycleAction,
  loadTransactionLifecycleContext,
  TransactionLifecycleConflictError,
  TransactionLifecycleNotFoundError,
} from '../src/features/transactions/transactionLifecycleService.ts';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKSPACE_ID = '77777777-7777-4777-8777-777777777777';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-05T13:30:00.000Z');

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id: '99999999-9999-4999-8999-999999999999', workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null,
    type: 'معاملة دورة حياة', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: 300_000,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-05T12:00:00.000Z', last_activity_at: '2026-09-05T12:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: '5402', legacy_source: null,
    ...patch,
  };
}

function followup(id: string, status = 'open'): RowOf<'transaction_followups'> {
  return {
    id, workspace_id: WORKSPACE_ID, transaction_id: '99999999-9999-4999-8999-999999999999', title: `متابعة ${id}`,
    due_at: '2026-09-06T08:00:00.000Z', status, created_at: '2026-09-01T08:00:00.000Z', completed_at: status === 'completed' ? '2026-09-02T08:00:00.000Z' : null,
    completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null,
  };
}

function page<T>(items: readonly T[], offset = 0, limit = 100, total: number | null = items.length): DataPage<T> {
  return Object.freeze({ items: Object.freeze([...items]), offset, limit, total, hasMore: total !== null ? offset + items.length < total : items.length === limit });
}

function buildHarness(options: Readonly<{ initial?: RowOf<'transactions'>; activityFailure?: Error }> = {}) {
  let current = options.initial ?? transaction();
  const followups = [followup('f-1'), followup('f-2'), followup('f-3', 'completed')];
  const writes = { updates: [] as unknown[], activity: [] as unknown[] };

  const layer = {
    scope: { workspaceId: WORKSPACE_ID },
    transactions: {
      list: async () => page([current]),
      getById: async (id: string) => id === current.id ? current : null,
      create: async () => current,
      update: async (id: string, patch: unknown) => {
        if (id !== current.id) throw new Error('unexpected transaction id');
        writes.updates.push(patch);
        current = Object.freeze({ ...current, ...(patch as object) }) as RowOf<'transactions'>;
        return current;
      },
    },
    followups: {
      list: async (request: { offset?: number; limit?: number }) => {
        const open = followups.filter((item) => item.status === 'open');
        const offset = request.offset ?? 0;
        const limit = request.limit ?? 100;
        return page(open.slice(offset, offset + limit), offset, limit, open.length);
      },
      getById: async (id: string) => followups.find((item) => item.id === id) ?? null,
      create: async () => { throw new Error('not expected'); },
      update: async () => { throw new Error('lifecycle must not rewrite followups'); },
    },
    transactionActivity: {
      list: async () => page([]),
      getById: async () => null,
      create: async (values: unknown) => {
        writes.activity.push(values);
        if (options.activityFailure) throw options.activityFailure;
        return Object.freeze({
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', workspace_id: WORKSPACE_ID, transaction_id: current.id,
          event_type: 'transaction_archive', summary: 'activity', occurred_at: NOW.toISOString(), source_entity_type: 'transaction',
          source_entity_id: current.id, metadata: {}, actor_user_id: USER_ID, legacy_id: null, legacy_source: null,
          ...(values as object),
        });
      },
    },
  } as unknown as EnjazWorkspaceDataLayer;

  const factory: EnjazDataLayerFactory = Object.freeze({
    async resolveWorkspaceId(userId: string) { return userId === USER_ID ? WORKSPACE_ID : null; },
    forWorkspace(workspaceId: string) {
      if (workspaceId !== WORKSPACE_ID) throw new Error('unexpected workspace');
      return layer;
    },
  });

  return {
    factory,
    writes,
    followups,
    get transaction() { return current; },
    set transaction(value: RowOf<'transactions'>) { current = value; },
  };
}

test('lifecycle loader counts only open followups without mutating them', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  assert.equal(loaded.openFollowupCount, 2);
  assert.equal(harness.followups[0]?.status, 'open');
  assert.equal(harness.writes.updates.length, 0);
});

test('archive preserves status and followup history while moving the transaction out of active views', async () => {
  const harness = buildHarness({ initial: transaction({ status: 'stalled' }) });
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  const result = await applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'archive', USER_ID, 'حفظ السجل مع إيقاف العمل النشط', NOW);
  assert.equal(result.transaction.status, 'stalled');
  assert.equal(result.transaction.archived_at, NOW.toISOString());
  assert.equal(result.preservedOpenFollowupCount, 2);
  assert.equal(classifyTransactionView(result.transaction), 'archived');
  assert.equal(harness.followups.filter((item) => item.status === 'open').length, 2);
  assert.equal(harness.writes.activity.length, 1);
});

test('restore of an archived active transaction makes preserved followups eligible only through explicit restore', async () => {
  const harness = buildHarness({ initial: transaction({ archived_at: '2026-09-04T12:00:00.000Z' }) });
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  const result = await applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'restore', USER_ID, null, NOW);
  assert.equal(result.transaction.archived_at, null);
  assert.equal(result.transaction.status, 'active');
  assert.equal(classifyTransactionView(result.transaction), 'current');
  assert.equal(result.preservedOpenFollowupCount, 2);
});

test('restore does not silently reactivate a completed transaction', async () => {
  const harness = buildHarness({ initial: transaction({ status: 'completed', completed_at: '2026-09-03T12:00:00.000Z', archived_at: '2026-09-04T12:00:00.000Z' }) });
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  const result = await applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'restore', USER_ID, null, NOW);
  assert.equal(result.transaction.archived_at, null);
  assert.equal(result.transaction.status, 'completed');
  assert.equal(result.transaction.completed_at, '2026-09-03T12:00:00.000Z');
  assert.equal(classifyTransactionView(result.transaction), 'archived');
});

test('reactivate is the explicit action that reopens a completed transaction', async () => {
  const harness = buildHarness({ initial: transaction({ status: 'completed', completed_at: '2026-09-03T12:00:00.000Z', archived_at: '2026-09-04T12:00:00.000Z' }) });
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  const result = await applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'reactivate', USER_ID, 'إعادة العمل بعد ورود مستند جديد', NOW);
  assert.equal(result.transaction.status, 'active');
  assert.equal(result.transaction.completed_at, null);
  assert.equal(result.transaction.archived_at, null);
  assert.equal(classifyTransactionView(result.transaction), 'current');
});

test('stale lifecycle context fails before any mutation', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  harness.transaction = Object.freeze({ ...harness.transaction, updated_at: '2026-09-05T13:20:00.000Z', priority: 'high' });
  await assert.rejects(() => applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'archive', USER_ID, null, NOW), TransactionLifecycleConflictError);
  assert.equal(harness.writes.updates.length, 0);
  assert.equal(harness.writes.activity.length, 0);
});

test('deleted transactions are unavailable to the lifecycle loader', async () => {
  const harness = buildHarness({ initial: transaction({ deleted_at: NOW.toISOString(), deletion_reason: 'duplicate' }) });
  await assert.rejects(() => loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id), TransactionLifecycleNotFoundError);
});

test('invalid lifecycle transition fails without rewriting the row', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  await assert.rejects(() => applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'restore', USER_ID, null, NOW), TransactionLifecycleRuleError);
  assert.equal(harness.writes.updates.length, 0);
});

test('unknown activity outcome is reported as a warning after confirmed core mutation', async () => {
  const harness = buildHarness({ activityFailure: new DataAccessError('activity outcome unknown', 'DATA_OUTCOME_UNKNOWN') });
  const loaded = await loadTransactionLifecycleContext(harness.factory, USER_ID, harness.transaction.id);
  const result = await applyTransactionLifecycleAction(harness.factory, USER_ID, loaded, 'archive', USER_ID, null, NOW);
  assert.equal(result.transaction.archived_at, NOW.toISOString());
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, 'activity-history-unconfirmed');
  assert.equal(result.warnings[0]?.outcomeUnknown, true);
});
