import assert from 'node:assert/strict';
import test from 'node:test';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import type { DataPage, ListRequest, RowOf } from '../src/data/contracts/dataTypes.ts';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import { buildTransactionListSnapshot } from '../src/features/transactions/transactionListModel.ts';
import { loadTransactionListSource } from '../src/features/transactions/transactionListService.ts';
import { createTransactionEditDraft, type TransactionEditorDraft } from '../src/features/transactions/transactionEditorModel.ts';
import { buildTransactionEditorPreviewSource } from '../src/features/transactions/transactionEditorPreview.ts';
import { loadTransactionEditorSource, saveTransactionEditorDraft, TransactionEditorConflictError } from '../src/features/transactions/transactionEditorService.ts';
import { applyTransactionLifecycleAction, loadTransactionLifecycleContext, TransactionLifecycleConflictError } from '../src/features/transactions/transactionLifecycleService.ts';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKSPACE_ID = '77777777-7777-4777-8777-777777777777';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const TX_ID = '99999999-9999-4999-8999-999999999999';
const NOW = new Date('2026-09-06T10:00:00.000Z');

function page<T>(items: readonly T[], offset = 0, limit = 100, total: number | null = items.length): DataPage<T> {
  return Object.freeze({ items: Object.freeze([...items]), offset, limit, total, hasMore: total !== null ? offset + items.length < total : items.length === limit });
}

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id: TX_ID,
    workspace_id: WORKSPACE_ID,
    company_id: COMPANY_ID,
    primary_contact_id: null,
    type: 'معاملة تدمير ENJAZ-5.5',
    department: 'مسجل الشركات',
    status: 'active',
    priority: 'normal',
    current_fee: 300_000,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-06T09:00:00.000Z',
    last_activity_at: '2026-09-06T09:00:00.000Z',
    completed_at: null,
    archived_at: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    legacy_id: '5501',
    legacy_source: null,
    ...patch,
  };
}

function company(id = COMPANY_ID): RowOf<'companies'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    legal_name: 'شركة اختبار Phase 5.5',
    display_name: null,
    capital: null,
    address: null,
    activities: null,
    registration_number: null,
    legal_status: null,
    primary_contact_id: null,
    status: 'active',
    merged_into_id: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-09-05T08:00:00.000Z',
    deleted_at: null,
  };
}

test('offline list failure propagates and cannot degrade into a partial company-backed result', async () => {
  let companyRead = false;
  const layer = {
    transactions: {
      async list(_request: ListRequest<'transactions'> = {}) {
        throw new DataAccessError('offline during transaction destruction', 'DATA_UNAVAILABLE');
      },
    },
    companies: {
      async list() {
        companyRead = true;
        return page([company()]);
      },
    },
  } as unknown as EnjazWorkspaceDataLayer;

  const factory = {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace(id: string) {
      assert.equal(id, WORKSPACE_ID);
      return layer;
    },
  } as EnjazDataLayerFactory;

  await assert.rejects(
    () => loadTransactionListSource(factory, USER_ID),
    (error: unknown) => error instanceof DataAccessError && error.dataCode === 'DATA_UNAVAILABLE',
  );
  assert.equal(companyRead, false);
});

test('repeated archive intent with a stale lifecycle context is rejected before duplicate mutation or history', async () => {
  let current = transaction();
  const writes = { updates: 0, activity: 0 };

  const layer = {
    transactions: {
      async getById(id: string) { return id === current.id ? current : null; },
      async update(id: string, patch: Partial<RowOf<'transactions'>>) {
        assert.equal(id, current.id);
        writes.updates += 1;
        current = Object.freeze({ ...current, ...patch, updated_at: NOW.toISOString() });
        return current;
      },
    },
    followups: {
      async list() { return page([]); },
    },
    transactionActivity: {
      async create(values: unknown) {
        writes.activity += 1;
        return Object.freeze({ id: `activity-${writes.activity}`, workspace_id: WORKSPACE_ID, ...(values as object) });
      },
    },
  } as unknown as EnjazWorkspaceDataLayer;

  const factory = {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace() { return layer; },
  } as EnjazDataLayerFactory;

  const loaded = await loadTransactionLifecycleContext(factory, USER_ID, current.id);
  const first = await applyTransactionLifecycleAction(factory, USER_ID, loaded, 'archive', USER_ID, 'أرشفة أولى', NOW);
  assert.equal(first.transaction.archived_at, NOW.toISOString());
  assert.equal(writes.updates, 1);
  assert.equal(writes.activity, 1);

  await assert.rejects(
    () => applyTransactionLifecycleAction(factory, USER_ID, loaded, 'archive', USER_ID, 'إعادة ضغط غير مقصودة', new Date('2026-09-06T10:01:00.000Z')),
    TransactionLifecycleConflictError,
  );
  assert.equal(writes.updates, 1);
  assert.equal(writes.activity, 1);
});

test('stale editor context cannot overwrite a lifecycle change and emits no companion writes', async () => {
  const preview = buildTransactionEditorPreviewSource('edit');
  if (!preview.transaction) throw new Error('Phase 5.5 editor preview transaction missing');
  let current = preview.transaction;
  let transactionUpdates = 0;
  let companionWrites = 0;

  const layer = {
    companies: {
      async list() { return page(preview.companies); },
      async getById(id: string) { return preview.companies.find((item) => item.id === id) ?? null; },
    },
    contacts: {
      async list() { return page(preview.contacts); },
      async getById(id: string) { return preview.contacts.find((item) => item.id === id) ?? null; },
    },
    companyContacts: {
      async list() { return page(preview.companyContacts); },
      async getById(id: string) { return preview.companyContacts.find((item) => item.id === id) ?? null; },
    },
    transactions: {
      async getById(id: string) { return id === current.id ? current : null; },
      async update() { transactionUpdates += 1; return current; },
      async create() { throw new Error('unexpected create'); },
    },
    transactionRoutes: {
      async list() { return page(preview.latestRoute ? [preview.latestRoute] : []); },
      async create() { companionWrites += 1; throw new Error('must not write route'); },
    },
    transactionNotes: {
      async create() { companionWrites += 1; throw new Error('must not write note'); },
    },
    feeChanges: {
      async create() { companionWrites += 1; throw new Error('must not write fee history'); },
    },
    transactionActivity: {
      async create() { companionWrites += 1; throw new Error('must not write activity'); },
    },
  } as unknown as EnjazWorkspaceDataLayer;

  const factory = {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace() { return layer; },
  } as EnjazDataLayerFactory;

  const loaded = await loadTransactionEditorSource(factory, USER_ID, current.id);
  const draft = createTransactionEditDraft(loaded.source, NOW);

  current = Object.freeze({
    ...current,
    archived_at: '2026-09-06T09:30:00.000Z',
    updated_at: '2026-09-06T09:30:00.000Z',
  });

  await assert.rejects(
    () => saveTransactionEditorDraft(factory, USER_ID, loaded, 'edit', draft, USER_ID, NOW),
    TransactionEditorConflictError,
  );
  assert.equal(transactionUpdates, 0);
  assert.equal(companionWrites, 0);
});

test('malformed relation and timestamp remain explicit instead of crashing or inventing identity', () => {
  const missingCompanyId = '33333333-3333-4333-8333-333333333333';
  const source = {
    transactions: [transaction({ company_id: missingCompanyId, last_activity_at: 'not-a-date', type: 'تجديد / RENEWAL — شركة-XYZ-2026' })],
    companies: [company()],
  };
  const snapshot = buildTransactionListSnapshot(source, { sort: 'activity-desc' });
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0]?.companyMissing, true);
  assert.equal(snapshot.items[0]?.companyLabel, 'بيانات الشركة غير متاحة');
  assert.equal(snapshot.items[0]?.id, TX_ID);
});

test('stable create operation id makes repeated create retries idempotent and rejects payload drift', async () => {
  const preview = buildTransactionEditorPreviewSource('create');
  const loaded = Object.freeze({ workspaceId: WORKSPACE_ID, source: preview });
  const operationId = '12121212-1212-4212-8212-121212121212';
  const draft: TransactionEditorDraft = Object.freeze({
    companyId: preview.companies[0]!.id,
    primaryContactId: '',
    type: 'تجديد إجازة شركة',
    department: 'مسجل الشركات',
    status: 'active',
    priority: 'normal',
    currentFee: '350000',
    completedAt: '',
    stationName: '',
    assignedToText: '',
    stationOccurredAt: '',
    noteBody: '',
    feeChangeReason: '',
  });
  let stored: RowOf<'transactions'> | null = null;
  let transactionCreates = 0;
  let activityCreates = 0;

  const layer = {
    transactions: {
      async getById(id: string) { return stored?.id === id ? stored : null; },
      async create(values: Record<string, unknown>) {
        transactionCreates += 1;
        stored = Object.freeze({
          id: String(values.id),
          workspace_id: WORKSPACE_ID,
          company_id: String(values.company_id),
          primary_contact_id: values.primary_contact_id === null ? null : String(values.primary_contact_id),
          type: String(values.type),
          department: values.department === null ? null : String(values.department),
          status: String(values.status),
          priority: String(values.priority),
          current_fee: Number(values.current_fee),
          created_at: NOW.toISOString(),
          updated_at: NOW.toISOString(),
          last_activity_at: String(values.last_activity_at),
          completed_at: values.completed_at === null ? null : String(values.completed_at),
          archived_at: null,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          legacy_id: null,
          legacy_source: null,
        });
        return stored;
      },
    },
    transactionRoutes: { async create() { throw new Error('unexpected route write'); } },
    transactionNotes: { async create() { throw new Error('unexpected note write'); } },
    feeChanges: { async create() { throw new Error('unexpected fee write'); } },
    transactionActivity: {
      async create(values: unknown) {
        activityCreates += 1;
        return Object.freeze({ id: `activity-${activityCreates}`, workspace_id: WORKSPACE_ID, ...(values as object) });
      },
    },
  } as unknown as EnjazWorkspaceDataLayer;
  const factory = {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace() { return layer; },
  } as EnjazDataLayerFactory;

  const first = await saveTransactionEditorDraft(factory, USER_ID, loaded, 'create', draft, USER_ID, NOW, operationId);
  const replay = await saveTransactionEditorDraft(factory, USER_ID, loaded, 'create', draft, USER_ID, new Date('2026-09-06T10:05:00.000Z'), operationId);

  assert.equal(first.transaction.id, operationId);
  assert.equal(replay.transaction.id, operationId);
  assert.equal(transactionCreates, 1);
  assert.equal(activityCreates, 1);
  assert.deepEqual(replay.warnings.map((warning) => warning.code), ['create-replay-detected']);

  const driftedDraft = Object.freeze({ ...draft, type: 'طلب مختلف لا يجوز أن يستخدم نفس هوية العملية' });
  await assert.rejects(
    () => saveTransactionEditorDraft(factory, USER_ID, loaded, 'create', driftedDraft, USER_ID, NOW, operationId),
    TransactionEditorConflictError,
  );
  assert.equal(transactionCreates, 1);
  assert.equal(activityCreates, 1);
});
