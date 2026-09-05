import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import {
  buildTransactionListSnapshot,
  createTransactionSavedViewDefinition,
  parseTransactionSavedViewDefinition,
  TRANSACTION_LIST_MAX_PAGE_SIZE,
  TRANSACTION_SAVED_VIEW_SCHEMA,
  TRANSACTION_SEARCH_MAX_LENGTH,
} from '../src/features/transactions/transactionListModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';

function company(): RowOf<'companies'> {
  return {
    id: COMPANY_ID, workspace_id: WORKSPACE_ID, legal_name: 'شركة اختبار طويلة للاختبارات المدمرة', display_name: null,
    capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null,
    status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-04T08:00:00.000Z', deleted_at: null,
  };
}

function transaction(id: string, patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null, type: 'معاملة اختبار', department: 'مسجل الشركات',
    status: 'active', priority: 'normal', current_fee: 100_000, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-02T08:00:00.000Z',
    last_activity_at: '2026-09-02T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null,
    deletion_reason: null, legacy_id: null, legacy_source: null, ...patch,
  };
}

test('large transaction datasets remain bounded to the client page ceiling', () => {
  const rows = Array.from({ length: 1_250 }, (_, index) => transaction(`tx-${String(index).padStart(5, '0')}`, {
    legacy_id: String(index + 1),
    last_activity_at: `2026-09-${String((index % 28) + 1).padStart(2, '0')}T08:00:00.000Z`,
  }));
  const result = buildTransactionListSnapshot({ transactions: rows, companies: [company()] }, { pageSize: 999, page: 24 });
  assert.equal(result.pageSize, TRANSACTION_LIST_MAX_PAGE_SIZE);
  assert.equal(result.pageCount, 25);
  assert.equal(result.page, 24);
  assert.equal(result.items.length, 50);
  assert.equal(result.hasMore, false);
});

test('long mixed Arabic and Latin search is normalized and hard-clamped', () => {
  const longToken = `إضَافة   ENJAZ-2026 ${'شركة '.repeat(80)}`;
  const saved = createTransactionSavedViewDefinition({ search: longToken });
  assert.ok(saved.search.length <= TRANSACTION_SEARCH_MAX_LENGTH);
  assert.equal(saved.schema, TRANSACTION_SAVED_VIEW_SCHEMA);
  assert.equal('page' in saved, false);
});

test('saved transaction view contract round-trips only stable list state', () => {
  const definition = createTransactionSavedViewDefinition({ view: 'stalled', search: 'قمر السلطان', sort: 'fee-desc', page: 9, pageSize: 35 });
  assert.deepEqual(parseTransactionSavedViewDefinition(definition), definition);
  assert.equal('page' in definition, false);
  assert.equal(parseTransactionSavedViewDefinition({ ...definition, schema: 'other.schema' }), null);
  assert.equal(parseTransactionSavedViewDefinition({ ...definition, pageSize: 500 }), null);
  assert.equal(parseTransactionSavedViewDefinition({ ...definition, view: 'deleted' }), null);
});

test('invalid timestamps keep deterministic ordering instead of crashing', () => {
  const rows = [
    transaction('b-invalid', { last_activity_at: 'not-a-date' }),
    transaction('a-invalid', { last_activity_at: 'broken' }),
    transaction('valid', { last_activity_at: '2026-09-05T08:00:00.000Z' }),
  ];
  const result = buildTransactionListSnapshot({ transactions: rows, companies: [company()] }, { sort: 'activity-desc' });
  assert.deepEqual(result.items.map((item) => item.id), ['valid', 'a-invalid', 'b-invalid']);
});

test('deleted rows cannot leak through counts or search under dense malformed relations', () => {
  const rows = [
    transaction('visible', { legacy_id: 'VISIBLE-1' }),
    transaction('deleted-match', { legacy_id: 'SECRET-DELETED', deleted_at: '2026-09-05T08:00:00.000Z', deletion_reason: 'duplicate' }),
  ];
  const source = { transactions: rows, companies: [] };
  assert.equal(buildTransactionListSnapshot(source, { search: 'SECRET-DELETED' }).filteredTotal, 0);
  const visible = buildTransactionListSnapshot(source);
  assert.deepEqual(visible.counts, { current: 1, stalled: 0, archived: 0 });
  assert.equal(visible.items[0]?.companyMissing, true);
});

test('unsafe money stays explicitly unsafe even under fee sorting', () => {
  const unsafe = 100_000_000_000_000;
  const result = buildTransactionListSnapshot({
    transactions: [transaction('safe', { current_fee: 500_000 }), transaction('unsafe', { current_fee: unsafe })],
    companies: [company()],
  }, { sort: 'fee-desc' });
  assert.equal(result.items[0]?.id, 'unsafe');
  assert.equal(result.items[0]?.feePrecisionSafe, false);
  assert.equal(result.items[1]?.feePrecisionSafe, true);
});
