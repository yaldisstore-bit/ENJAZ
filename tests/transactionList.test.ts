import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import {
  buildTransactionListSnapshot,
  classifyTransactionView,
  normalizeTransactionSearch,
} from '../src/features/transactions/transactionListModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_A = '22222222-2222-4222-8222-222222222221';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';

function company(id: string, name: string): RowOf<'companies'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    legal_name: name,
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
    updated_at: '2026-09-04T08:00:00.000Z',
    deleted_at: null,
  };
}

function transaction(id: string, patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    company_id: COMPANY_A,
    primary_contact_id: null,
    type: 'تعديل عقد تأسيس',
    department: 'مسجل الشركات',
    status: 'active',
    priority: 'normal',
    current_fee: 100_000,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-02T08:00:00.000Z',
    last_activity_at: '2026-09-02T08:00:00.000Z',
    completed_at: null,
    archived_at: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    legacy_id: null,
    legacy_source: null,
    ...patch,
  };
}

const companies = [company(COMPANY_A, 'قمر السلطان للتجارة العامة'), company(COMPANY_B, 'روز بغداد')];

test('transaction views classify current, stalled and archived/closed without leaking deleted rows', () => {
  assert.equal(classifyTransactionView(transaction('current')), 'current');
  assert.equal(classifyTransactionView(transaction('stalled', { status: 'stalled' })), 'stalled');
  assert.equal(classifyTransactionView(transaction('delayed', { status: 'delayed' })), 'stalled');
  assert.equal(classifyTransactionView(transaction('completed', { status: 'completed', completed_at: '2026-09-03T08:00:00.000Z' })), 'archived');
  assert.equal(classifyTransactionView(transaction('archived', { archived_at: '2026-09-03T08:00:00.000Z' })), 'archived');
  assert.equal(classifyTransactionView(transaction('deleted', { deleted_at: '2026-09-03T08:00:00.000Z' })), null);
});

test('transaction search normalizes Arabic forms and searches company, type, department and legacy id', () => {
  const rows = [
    transaction('a', { legacy_id: '1042', type: 'إضافة نشاط', company_id: COMPANY_A }),
    transaction('b', { legacy_id: '2044', type: 'قرار تأسيس', company_id: COMPANY_B, department: 'الضريبة' }),
  ];

  assert.equal(normalizeTransactionSearch('  إضَافة   نشاط  '), 'اضافه نشاط');
  assert.equal(buildTransactionListSnapshot({ transactions: rows, companies }, { search: 'اضافة', view: 'current' }).items[0]?.id, 'a');
  assert.equal(buildTransactionListSnapshot({ transactions: rows, companies }, { search: 'روز بغداد', view: 'current' }).items[0]?.id, 'b');
  assert.equal(buildTransactionListSnapshot({ transactions: rows, companies }, { search: 'الضريبة', view: 'current' }).items[0]?.id, 'b');
  assert.equal(buildTransactionListSnapshot({ transactions: rows, companies }, { search: '1042', view: 'current' }).items[0]?.id, 'a');
});

test('list counts remain global while the selected view and query bound visible rows', () => {
  const rows = [
    transaction('current'),
    transaction('stalled', { status: 'stalled' }),
    transaction('closed', { status: 'completed', completed_at: '2026-09-03T08:00:00.000Z' }),
    transaction('deleted', { deleted_at: '2026-09-03T08:00:00.000Z' }),
  ];
  const result = buildTransactionListSnapshot({ transactions: rows, companies }, { view: 'stalled' });
  assert.deepEqual(result.counts, { current: 1, stalled: 1, archived: 1 });
  assert.equal(result.filteredTotal, 1);
  assert.equal(result.items[0]?.id, 'stalled');
});

test('sorting is deterministic for activity and fee orders', () => {
  const rows = [
    transaction('old-high', { current_fee: 900_000, last_activity_at: '2026-09-01T08:00:00.000Z' }),
    transaction('new-low', { current_fee: 100_000, last_activity_at: '2026-09-04T08:00:00.000Z' }),
    transaction('mid', { current_fee: 500_000, last_activity_at: '2026-09-03T08:00:00.000Z' }),
  ];
  assert.deepEqual(buildTransactionListSnapshot({ transactions: rows, companies }, { sort: 'activity-desc' }).items.map((item) => item.id), ['new-low', 'mid', 'old-high']);
  assert.deepEqual(buildTransactionListSnapshot({ transactions: rows, companies }, { sort: 'fee-desc' }).items.map((item) => item.id), ['old-high', 'mid', 'new-low']);
});

test('pagination clamps out-of-range pages and never returns an impossible page number', () => {
  const rows = Array.from({ length: 45 }, (_, index) => transaction(`row-${String(index).padStart(2, '0')}`, {
    last_activity_at: `2026-09-${String((index % 9) + 1).padStart(2, '0')}T08:00:00.000Z`,
  }));
  const result = buildTransactionListSnapshot({ transactions: rows, companies }, { page: 99, pageSize: 20 });
  assert.equal(result.pageCount, 3);
  assert.equal(result.page, 2);
  assert.equal(result.items.length, 5);
  assert.equal(result.hasMore, false);
  assert.equal(result.hasPrevious, true);
});

test('missing company relations are explicit and unsafe money is never represented as precision-safe', () => {
  const unsafe = Number.MAX_SAFE_INTEGER / 100 + 10;
  const result = buildTransactionListSnapshot({
    transactions: [transaction('missing-company', { company_id: '33333333-3333-4333-8333-333333333333', current_fee: unsafe })],
    companies,
  });
  assert.equal(result.items[0]?.companyMissing, true);
  assert.equal(result.items[0]?.companyLabel, 'بيانات الشركة غير متاحة');
  assert.equal(result.items[0]?.feePrecisionSafe, false);
});
