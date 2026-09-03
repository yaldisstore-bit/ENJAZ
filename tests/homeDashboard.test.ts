import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { HOME_PRIORITY_LIMIT, buildHomeDashboardSnapshot } from '../src/features/home/homeDashboardModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-03T12:00:00.000Z');

function transaction(id: string, patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    company_id: COMPANY_ID,
    primary_contact_id: null,
    type: 'معاملة اختبار',
    department: null,
    status: 'active',
    priority: 'normal',
    current_fee: 1_000,
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

function followup(id: string, transactionId: string, patch: Partial<RowOf<'transaction_followups'>> = {}): RowOf<'transaction_followups'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    transaction_id: transactionId,
    title: 'متابعة اختبار',
    due_at: '2026-09-02T08:00:00.000Z',
    status: 'open',
    created_at: '2026-09-01T08:00:00.000Z',
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
    title: 'عائق اختبار',
    severity: 'high',
    note: null,
    status: 'open',
    opened_at: '2026-09-02T08:00:00.000Z',
    resolved_at: null,
    ...patch,
  };
}

function payment(id: string, transactionId: string, patch: Partial<RowOf<'payments'>> = {}): RowOf<'payments'> {
  return {
    id,
    workspace_id: WORKSPACE_ID,
    transaction_id: transactionId,
    company_id: COMPANY_ID,
    amount: 400,
    method: 'cash',
    paid_at: '2026-09-02T08:00:00.000Z',
    status: 'posted',
    receipt_ref: `R-${id}`,
    note: null,
    legacy_id: null,
    legacy_source: null,
    created_at: '2026-09-02T08:00:00.000Z',
    ...patch,
  };
}

function snapshot(source: Partial<{
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

test('home excludes completed, archived and deleted transactions from active operational facts', () => {
  const rows = [
    transaction('active'),
    transaction('completed', { status: 'completed', completed_at: '2026-09-02T09:00:00.000Z' }),
    transaction('archived', { archived_at: '2026-09-02T09:00:00.000Z' }),
    transaction('deleted', { deleted_at: '2026-09-02T09:00:00.000Z', deletion_reason: 'duplicate' }),
  ];
  const result = snapshot({ transactions: rows });
  assert.equal(result.activeTransactions, 1);
  assert.equal(result.finance.activeFees, 1_000);
});

test('overdue followups respect snooze and do not make archived work look active', () => {
  const active = transaction('active');
  const archived = transaction('archived', { archived_at: '2026-09-02T09:00:00.000Z' });
  const result = snapshot({
    transactions: [active, archived],
    followups: [
      followup('overdue', active.id),
      followup('snoozed', active.id, { snoozed_until: '2026-09-05T08:00:00.000Z' }),
      followup('archived-parent', archived.id),
      followup('future', active.id, { due_at: '2026-09-05T08:00:00.000Z' }),
    ],
  });

  assert.equal(result.openFollowups, 4);
  assert.equal(result.overdueFollowups, 2);
  assert.ok(result.priorities.some((item) => item.id === 'followup:overdue'));
  assert.equal(result.priorities.some((item) => item.id === 'followup:snoozed'), false);
  assert.equal(result.priorities.some((item) => item.id === 'followup:archived-parent'), false);
});

test('priority ranking puts critical blockers before overdue, urgent and stalled work and stays bounded', () => {
  const rows = Array.from({ length: 8 }, (_, index) => transaction(`t-${index}`, {
    priority: index >= 4 ? 'urgent' : 'normal',
    status: index === 3 ? 'stalled' : 'active',
  }));
  const result = snapshot({
    transactions: rows,
    blockers: [
      blocker('critical', rows[0]!.id, { severity: 'critical' }),
      blocker('high', rows[1]!.id, { severity: 'high' }),
    ],
    followups: [followup('late', rows[2]!.id, { due_at: '2026-08-20T08:00:00.000Z' })],
  });

  assert.equal(result.priorities[0]?.id, 'blocker:critical');
  assert.equal(result.priorities.length, HOME_PRIORITY_LIMIT);
  assert.ok((result.priorities[0]?.score ?? 0) >= (result.priorities[1]?.score ?? 0));
  for (let index = 1; index < result.priorities.length; index += 1) {
    assert.ok(result.priorities[index - 1]!.score >= result.priorities[index]!.score);
  }
});

test('financial snapshot uses posted payments for active work only', () => {
  const active = transaction('active', { current_fee: 2_000 });
  const archived = transaction('archived', { current_fee: 4_000, archived_at: '2026-09-01T08:00:00.000Z' });
  const result = snapshot({
    transactions: [active, archived],
    payments: [
      payment('posted', active.id, { amount: 700, status: 'posted' }),
      payment('reversed', active.id, { amount: 900, status: 'reversed' }),
      payment('archived', archived.id, { amount: 1_500, status: 'posted' }),
    ],
  });

  assert.equal(result.finance.activeFees, 2_000);
  assert.equal(result.finance.collectedAgainstActive, 700);
  assert.equal(result.finance.outstandingActive, 1_300);
});

test('home never reports unsafe large money values as precision-safe', () => {
  const unsafeAmount = Number.MAX_SAFE_INTEGER / 100 + 10;
  const result = snapshot({
    transactions: [transaction('large', { current_fee: unsafeAmount })],
    payments: [payment('large-payment', 'large', { amount: unsafeAmount / 2 })],
  });
  assert.equal(result.finance.precisionSafe, false);
});

test('signals are derived from actionable state rather than decorative counters', () => {
  const stalled = transaction('stalled', { status: 'stalled' });
  const result = snapshot({
    transactions: [stalled],
    blockers: [blocker('critical', stalled.id, { severity: 'critical' })],
    followups: [followup('overdue', stalled.id)],
  });

  const signals = new Map(result.signals.map((signal) => [signal.id, signal]));
  assert.equal(signals.get('overdue-followups')?.value, 1);
  assert.equal(signals.get('open-blockers')?.value, 1);
  assert.equal(signals.get('open-blockers')?.tone, 'danger');
  assert.equal(signals.get('stalled-transactions')?.value, 1);
});
