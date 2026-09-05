import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { classifyTransactionView } from '../src/features/transactions/transactionListModel.ts';
import {
  buildTransactionLifecyclePatch,
  normalizeTransactionLifecycleNote,
  transactionLifecycleCapabilities,
  TransactionLifecycleRuleError,
} from '../src/features/transactions/transactionLifecycleModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-05T13:00:00.000Z');

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null,
    type: 'معاملة اختبار دورة الحياة', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: 250_000,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-05T12:00:00.000Z', last_activity_at: '2026-09-05T12:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: '5401', legacy_source: null,
    ...patch,
  };
}

test('archive uses archived_at without inventing an illegal archived status', () => {
  const row = transaction({ status: 'stalled' });
  const patch = buildTransactionLifecyclePatch(row, 'archive', NOW);
  assert.equal(patch.archived_at, NOW.toISOString());
  assert.equal(patch.status, undefined);
  const next = { ...row, ...patch } as RowOf<'transactions'>;
  assert.equal(next.status, 'stalled');
  assert.equal(classifyTransactionView(next), 'archived');
});

test('restore clears archive marker but preserves completed state', () => {
  const row = transaction({ status: 'completed', completed_at: '2026-09-04T15:00:00.000Z', archived_at: '2026-09-04T16:00:00.000Z' });
  const patch = buildTransactionLifecyclePatch(row, 'restore', NOW);
  const next = { ...row, ...patch } as RowOf<'transactions'>;
  assert.equal(next.archived_at, null);
  assert.equal(next.status, 'completed');
  assert.equal(next.completed_at, '2026-09-04T15:00:00.000Z');
  assert.equal(classifyTransactionView(next), 'archived');
});

test('reactivate explicitly clears completed and archive state', () => {
  const row = transaction({ status: 'completed', completed_at: '2026-09-04T15:00:00.000Z', archived_at: '2026-09-04T16:00:00.000Z' });
  const patch = buildTransactionLifecyclePatch(row, 'reactivate', NOW);
  const next = { ...row, ...patch } as RowOf<'transactions'>;
  assert.equal(next.status, 'active');
  assert.equal(next.completed_at, null);
  assert.equal(next.archived_at, null);
  assert.equal(classifyTransactionView(next), 'current');
});

test('capabilities distinguish archive, restore and reactivation instead of conflating them', () => {
  assert.deepEqual(transactionLifecycleCapabilities(transaction()), {
    archived: false, completed: false, deleted: false, canArchive: true, canRestore: false, canReactivate: false,
  });
  assert.deepEqual(transactionLifecycleCapabilities(transaction({ archived_at: NOW.toISOString() })), {
    archived: true, completed: false, deleted: false, canArchive: false, canRestore: true, canReactivate: false,
  });
  assert.deepEqual(transactionLifecycleCapabilities(transaction({ status: 'completed', completed_at: NOW.toISOString() })), {
    archived: false, completed: true, deleted: false, canArchive: true, canRestore: false, canReactivate: true,
  });
});

test('invalid repeated lifecycle actions fail closed', () => {
  assert.throws(() => buildTransactionLifecyclePatch(transaction({ archived_at: NOW.toISOString() }), 'archive', NOW), TransactionLifecycleRuleError);
  assert.throws(() => buildTransactionLifecyclePatch(transaction(), 'restore', NOW), TransactionLifecycleRuleError);
  assert.throws(() => buildTransactionLifecyclePatch(transaction(), 'reactivate', NOW), TransactionLifecycleRuleError);
});

test('deleted transactions cannot enter any lifecycle mutation', () => {
  const row = transaction({ deleted_at: NOW.toISOString(), deletion_reason: 'duplicate' });
  for (const action of ['archive', 'restore', 'reactivate'] as const) {
    assert.throws(() => buildTransactionLifecyclePatch(row, action, NOW), TransactionLifecycleRuleError);
  }
});

test('lifecycle note is trimmed, bounded and optional', () => {
  assert.equal(normalizeTransactionLifecycleNote('  سبب إداري  '), 'سبب إداري');
  assert.equal(normalizeTransactionLifecycleNote('   '), null);
  assert.throws(() => normalizeTransactionLifecycleNote('س'.repeat(601)));
});
