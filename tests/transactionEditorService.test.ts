import assert from 'node:assert/strict';
import test from 'node:test';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import type { DataPage, RowOf } from '../src/data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import { createTransactionEditDraft, type TransactionEditorDraft } from '../src/features/transactions/transactionEditorModel.ts';
import { buildTransactionEditorPreviewSource } from '../src/features/transactions/transactionEditorPreview.ts';
import {
  loadTransactionEditorSource,
  saveTransactionEditorDraft,
  TransactionEditorConflictError,
} from '../src/features/transactions/transactionEditorService.ts';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKSPACE_ID = '77777777-7777-4777-8777-777777777777';
const NOW = new Date('2026-09-05T12:00:00.000Z');

function page<T>(items: readonly T[]): DataPage<T> {
  return Object.freeze({ items: Object.freeze([...items]), offset: 0, limit: 100, total: items.length, hasMore: false });
}

function buildHarness(options: Readonly<{ feeHistoryFailure?: Error }> = {}) {
  const preview = buildTransactionEditorPreviewSource('edit');
  if (!preview.transaction) throw new Error('Preview edit transaction missing');
  let currentTransaction: RowOf<'transactions'> = preview.transaction;
  const writes = {
    transactionUpdates: [] as unknown[],
    feeChanges: [] as unknown[],
    routes: [] as unknown[],
    notes: [] as unknown[],
    activity: [] as unknown[],
  };

  const layer = {
    scope: { workspaceId: WORKSPACE_ID },
    companies: {
      list: async () => page(preview.companies),
      getById: async (id: string) => preview.companies.find((item) => item.id === id) ?? null,
    },
    contacts: {
      list: async () => page(preview.contacts),
      getById: async (id: string) => preview.contacts.find((item) => item.id === id) ?? null,
    },
    companyContacts: {
      list: async () => page(preview.companyContacts),
      getById: async (id: string) => preview.companyContacts.find((item) => item.id === id) ?? null,
    },
    transactions: {
      list: async () => page([currentTransaction]),
      getById: async (id: string) => id === currentTransaction.id ? currentTransaction : null,
      create: async (values: unknown) => ({ ...currentTransaction, ...(values as object) }) as RowOf<'transactions'>,
      update: async (id: string, patch: unknown) => {
        if (id !== currentTransaction.id) throw new Error('unexpected transaction id');
        writes.transactionUpdates.push(patch);
        currentTransaction = Object.freeze({ ...currentTransaction, ...(patch as object) }) as RowOf<'transactions'>;
        return currentTransaction;
      },
    },
    transactionRoutes: {
      list: async () => page(preview.latestRoute ? [preview.latestRoute] : []),
      getById: async () => preview.latestRoute,
      create: async (values: unknown) => {
        writes.routes.push(values);
        return Object.freeze({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', workspace_id: WORKSPACE_ID, ...(values as object) });
      },
    },
    transactionNotes: {
      list: async () => page([]),
      getById: async () => null,
      create: async (values: unknown) => {
        writes.notes.push(values);
        return Object.freeze({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', workspace_id: WORKSPACE_ID, created_at: NOW.toISOString(), ...(values as object) });
      },
    },
    feeChanges: {
      list: async () => page([]),
      getById: async () => null,
      create: async (values: unknown) => {
        writes.feeChanges.push(values);
        if (options.feeHistoryFailure) throw options.feeHistoryFailure;
        return Object.freeze({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', workspace_id: WORKSPACE_ID, created_at: NOW.toISOString(), ...(values as object) });
      },
    },
    transactionActivity: {
      list: async () => page([]),
      getById: async () => null,
      create: async (values: unknown) => {
        writes.activity.push(values);
        return Object.freeze({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', workspace_id: WORKSPACE_ID, created_at: NOW.toISOString(), ...(values as object) });
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
    get transaction() { return currentTransaction; },
    set transaction(value: RowOf<'transactions'>) { currentTransaction = value; },
  };
}

function changedEditDraft(loaded: Awaited<ReturnType<typeof loadTransactionEditorSource>>): TransactionEditorDraft {
  return Object.freeze({
    ...createTransactionEditDraft(loaded.source, NOW),
    priority: 'urgent' as const,
    currentFee: '475000',
    feeChangeReason: 'اتفاق جديد على الأتعاب',
    stationName: 'المراجعة النهائية',
    assignedToText: 'المراجع الأول',
    stationOccurredAt: '2026-09-05T11:30',
    noteBody: 'تمت مراجعة البيانات قبل الحفظ.',
  });
}

test('transaction editor loads relationships and latest route inside authenticated workspace', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionEditorSource(harness.factory, USER_ID, harness.transaction.id);
  assert.equal(loaded.workspaceId, WORKSPACE_ID);
  assert.equal(loaded.source.transaction?.id, harness.transaction.id);
  assert.ok(loaded.source.companies.length >= 2);
  assert.ok(loaded.source.contacts.length >= 3);
  assert.ok(loaded.source.companyContacts.length >= 3);
  assert.equal(loaded.source.latestRoute?.station_name, 'التدقيق القانوني');
});

test('stale edit source fails before update and preserves newer transaction state', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionEditorSource(harness.factory, USER_ID, harness.transaction.id);
  harness.transaction = Object.freeze({ ...harness.transaction, updated_at: '2026-09-05T11:59:00.000Z', priority: 'high' });
  await assert.rejects(
    () => saveTransactionEditorDraft(harness.factory, USER_ID, loaded, 'edit', changedEditDraft(loaded), USER_ID, NOW),
    TransactionEditorConflictError,
  );
  assert.equal(harness.writes.transactionUpdates.length, 0);
  assert.equal(harness.writes.feeChanges.length, 0);
});

test('confirmed edit updates core row and appends fee, route, note and activity facts', async () => {
  const harness = buildHarness();
  const loaded = await loadTransactionEditorSource(harness.factory, USER_ID, harness.transaction.id);
  const result = await saveTransactionEditorDraft(harness.factory, USER_ID, loaded, 'edit', changedEditDraft(loaded), USER_ID, NOW);
  assert.equal(result.transaction.current_fee, 475000);
  assert.equal(result.transaction.priority, 'urgent');
  assert.equal(result.warnings.length, 0);
  assert.equal(harness.writes.transactionUpdates.length, 1);
  assert.equal(harness.writes.feeChanges.length, 1);
  assert.equal(harness.writes.routes.length, 1);
  assert.equal(harness.writes.notes.length, 1);
  assert.equal(harness.writes.activity.length, 1);
});

test('unknown fee-history outcome is surfaced and never reported as fully clean success', async () => {
  const harness = buildHarness({ feeHistoryFailure: new DataAccessError('unknown fee history outcome', 'DATA_OUTCOME_UNKNOWN') });
  const loaded = await loadTransactionEditorSource(harness.factory, USER_ID, harness.transaction.id);
  const result = await saveTransactionEditorDraft(harness.factory, USER_ID, loaded, 'edit', changedEditDraft(loaded), USER_ID, NOW);
  const warning = result.warnings.find((item) => item.code === 'fee-history-unconfirmed');
  assert.ok(warning);
  assert.equal(warning.outcomeUnknown, true);
  assert.equal(result.transaction.current_fee, 475000);
});
