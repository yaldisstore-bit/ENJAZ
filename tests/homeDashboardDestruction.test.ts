import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { HOME_PRIORITY_LIMIT, buildHomeDashboardSnapshot } from '../src/features/home/homeDashboardModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-04T12:00:00.000Z');

function transaction(id: string, patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    company_id: COMPANY_ID,
    primary_contact_id: null,
    type: 'معاملة اختبار تدميري',
    department: 'قسم الاختبار',
    status: 'active',
    priority: 'normal',
    current_fee: 1_000,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-03T08:00:00.000Z',
    last_activity_at: '2026-09-03T08:00:00.000Z',
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

function followup(id: string, transactionId: string, patch: Partial<RowOf<'transaction_followups'>> = {}): RowOf<'transaction_followups'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    transaction_id: transactionId,
    title: 'متابعة تدميرية',
    due_at: '2026-08-20T08:00:00.000Z',
    status: 'open',
    created_at: '2026-08-19T08:00:00.000Z',
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    legacy_id: null,
    legacy_source: null,
    ...patch,
  };
}

function blocker(id: string, transactionId: string, patch: Partial<RowOf<'transaction_blockers'>> = {}): RowOf<'transaction_blockers'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    transaction_id: transactionId,
    title: 'عائق تدميري',
    severity: 'high',
    note: 'اختبار تعارض الأولويات',
    status: 'open',
    opened_at: '2026-09-03T08:00:00.000Z',
    resolved_at: null,
    ...patch,
  };
}

function payment(id: string, transactionId: string, amount = 400): RowOf<'payments'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    transaction_id: transactionId,
    company_id: COMPANY_ID,
    amount,
    method: 'cash',
    paid_at: '2026-09-03T08:00:00.000Z',
    status: 'posted',
    receipt_ref: `R-${id}`,
    note: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-09-03T08:00:00.000Z',
  };
}

function build(source: Partial<{
  transactions: readonly RowOf<'transactions'>[];
  followups: readonly RowOf<'transaction_followups'>[];
  blockers: readonly RowOf<'transaction_blockers'>[];
  payments: readonly RowOf<'payments'>[];
}>) {
  return buildHomeDashboardSnapshot({
    transactions: source.transactions ?? [],
    followups: source.followups ?? [],
    blockers: source.blockers ?? [],
    payments: source.payments ?? [],
  }, NOW);
}

test('Phase 4.4 empty dataset remains truthful, safe and non-decorative', () => {
  const result = build({});
  assert.equal(result.activeTransactions, 0);
  assert.equal(result.urgentTransactions, 0);
  assert.equal(result.stalledTransactions, 0);
  assert.equal(result.openFollowups, 0);
  assert.equal(result.overdueFollowups, 0);
  assert.equal(result.openBlockers, 0);
  assert.equal(result.criticalBlockers, 0);
  assert.equal(result.priorities.length, 0);
  assert.equal(result.finance.activeFees, 0);
  assert.equal(result.finance.collectedAgainstActive, 0);
  assert.equal(result.finance.outstandingActive, 0);
  assert.equal(result.finance.precisionSafe, true);
  assert.deepEqual(result.signals.map((signal) => signal.tone), ['success', 'success', 'success']);
});

test('Phase 4.4 huge dense dataset keeps Home output bounded and transaction-distinct', () => {
  const size = 2_500;
  const transactions = Array.from({ length: size }, (_, index) => transaction(`dense-${index}`, {
    priority: index % 2 === 0 ? 'urgent' : 'normal',
    status: index % 3 === 0 ? 'stalled' : 'active',
    current_fee: 10_000 + index,
  }));
  const followups = transactions.map((row, index) => followup(`dense-followup-${index}`, row.id));
  const blockers = transactions.map((row, index) => blocker(`dense-blocker-${index}`, row.id, { severity: index % 4 === 0 ? 'critical' : 'high' }));
  const payments = transactions.map((row, index) => payment(`dense-payment-${index}`, row.id, 500 + index));

  const result = build({ transactions, followups, blockers, payments });
  assert.equal(result.activeTransactions, size);
  assert.equal(result.openFollowups, size);
  assert.equal(result.overdueFollowups, size);
  assert.equal(result.openBlockers, size);
  assert.equal(result.priorities.length, HOME_PRIORITY_LIMIT);
  assert.equal(new Set(result.priorities.map((item) => item.transactionId)).size, result.priorities.length);
  assert.ok(result.priorities.every((item, index, list) => index === 0 || list[index - 1]!.score >= item.score));
  assert.equal(result.signals.find((signal) => signal.id === 'overdue-followups')?.value, size);
  assert.equal(result.signals.find((signal) => signal.id === 'open-blockers')?.value, size);
});

test('Phase 4.4 conflicting urgency states collapse to the highest reason for one transaction', () => {
  const row = transaction('conflict', { priority: 'urgent', status: 'stalled' });
  const result = build({
    transactions: [row],
    followups: [followup('conflict-overdue', row.id)],
    blockers: [blocker('critical-conflict', row.id, { severity: 'critical', title: 'عائق حرج أعلى من كل الإشارات' })],
  });

  assert.equal(result.urgentTransactions, 1);
  assert.equal(result.stalledTransactions, 1);
  assert.equal(result.overdueFollowups, 1);
  assert.equal(result.openBlockers, 1);
  assert.equal(result.criticalBlockers, 1);
  assert.equal(result.priorities.length, 1);
  assert.equal(result.priorities[0]?.id, 'blocker:critical-conflict');
  assert.equal(result.priorities[0]?.level, 'critical');
  assert.equal(result.priorities[0]?.transactionId, row.id);
});

test('Phase 4.4 one noisy transaction cannot starve other transactions from the bounded priority list', () => {
  const noisy = transaction('noisy', { priority: 'urgent', status: 'stalled' });
  const others = Array.from({ length: HOME_PRIORITY_LIMIT }, (_, index) => transaction(`other-${index}`, { priority: 'urgent' }));
  const result = build({
    transactions: [noisy, ...others],
    followups: [followup('noisy-followup', noisy.id)],
    blockers: [
      blocker('noisy-critical', noisy.id, { severity: 'critical' }),
      blocker('noisy-high', noisy.id, { severity: 'high' }),
    ],
  });

  assert.equal(result.priorities.length, HOME_PRIORITY_LIMIT);
  assert.equal(result.priorities.filter((item) => item.transactionId === noisy.id).length, 1);
  assert.ok(result.priorities.some((item) => item.transactionId.startsWith('other-')));
});
