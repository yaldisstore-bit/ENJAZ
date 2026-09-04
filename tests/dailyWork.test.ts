import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import { DAILY_WORK_ITEM_LIMIT, buildDailyWorkSnapshot } from '../src/features/daily-work/dailyWorkModel.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-04T09:00:00.000Z');

function transaction(id: string, patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null,
    type: 'معاملة تأسيس', department: 'التسجيل', status: 'active', priority: 'normal', current_fee: 1_000,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-03T08:00:00.000Z', last_activity_at: '2026-09-03T08:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
    ...patch,
  };
}

function company(id = COMPANY_ID, patch: Partial<RowOf<'companies'>> = {}): RowOf<'companies'> {
  return {
    id, workspace_id: WORKSPACE_ID, legal_name: 'شركة الاختبار للتجارة العامة محدودة المسؤولية', display_name: 'شركة الاختبار',
    capital: 100_000_000, address: 'بغداد', activities: null, registration_number: null, legal_status: null,
    primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-03T08:00:00.000Z', deleted_at: null,
    ...patch,
  };
}

function route(id: string, tx: string, owner: string, occurredAt: string): RowOf<'transaction_routes'> {
  return { id, workspace_id: WORKSPACE_ID, transaction_id: tx, station_name: 'المراجعة', assigned_to_text: owner, occurred_at: occurredAt, created_by: null, legacy_id: null, legacy_source: null };
}

function followup(id: string, tx: string, patch: Partial<RowOf<'transaction_followups'>> = {}): RowOf<'transaction_followups'> {
  return {
    id, workspace_id: WORKSPACE_ID, transaction_id: tx, title: 'متابعة مستندات', due_at: '2026-09-03T08:00:00.000Z', status: 'open',
    created_at: '2026-09-01T08:00:00.000Z', completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null,
    ...patch,
  };
}

function blocker(id: string, tx: string, patch: Partial<RowOf<'transaction_blockers'>> = {}): RowOf<'transaction_blockers'> {
  return {
    id, workspace_id: WORKSPACE_ID, transaction_id: tx, title: 'مستند ناقص', severity: 'critical', note: null,
    status: 'open', opened_at: '2026-09-03T07:00:00.000Z', resolved_at: null, ...patch,
  };
}

function calendar(id: string, patch: Partial<RowOf<'calendar_events'>> = {}): RowOf<'calendar_events'> {
  return {
    id, workspace_id: WORKSPACE_ID, transaction_id: 'tx-1', company_id: COMPANY_ID, contact_id: null, title: 'موعد مراجعة', event_type: 'review',
    starts_at: '2026-09-04T11:00:00.000Z', ends_at: null, status: 'scheduled', reminder_offsets: null, note: null,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z',
    ...patch,
  };
}

function renewal(id: string, patch: Partial<RowOf<'renewals'>> = {}): RowOf<'renewals'> {
  return {
    id, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, transaction_id: null, title: 'تجديد إجازة', due_date: '2026-09-06', recurrence_rule: null,
    status: 'active', last_completed_at: null, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z', ...patch,
  };
}

function workflowInstance(id: string, tx = 'tx-1', patch: Partial<RowOf<'workflow_instances'>> = {}): RowOf<'workflow_instances'> {
  return {
    id, workspace_id: WORKSPACE_ID, transaction_id: tx, workflow_template_id: null,
    template_snapshot: { stages: [{ items: [{ key: 'approve-letter', title: 'اعتماد الكتاب النهائي' }] }] },
    current_stage_position: 1, status: 'active', started_at: '2026-09-01T08:00:00.000Z', completed_at: null, ...patch,
  };
}

function workflowState(id: string, instance = 'wf-1', patch: Partial<RowOf<'workflow_item_states'>> = {}): RowOf<'workflow_item_states'> {
  return {
    id, workspace_id: WORKSPACE_ID, workflow_instance_id: instance, template_item_key: 'approve-letter', status: 'pending', completed_at: null, note: null, ...patch,
  };
}

function snapshot(patch: Partial<Parameters<typeof buildDailyWorkSnapshot>[0]> = {}) {
  return buildDailyWorkSnapshot({
    transactions: [transaction('tx-1')], companies: [company()], routes: [], followups: [], blockers: [], calendar: [], renewals: [], workflowInstances: [], workflowItemStates: [],
    ...patch,
  }, NOW);
}

test('Daily Work consolidates operational sources and puts critical blockers first', () => {
  const result = snapshot({
    followups: [followup('late', 'tx-1')], blockers: [blocker('critical', 'tx-1')], calendar: [calendar('meeting')], renewals: [renewal('renew')],
    workflowInstances: [workflowInstance('wf-1')], workflowItemStates: [workflowState('approval')],
  });
  assert.equal(result.summary.total, 5);
  assert.equal(result.focus?.source, 'blocker');
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.summary.approvals, 1);
});

test('snoozed followups and work belonging to archived/completed/deleted transactions cannot leak into the inbox', () => {
  const hiddenTransactions = [
    transaction('archived', { archived_at: '2026-09-03T08:00:00.000Z' }),
    transaction('completed', { status: 'completed', completed_at: '2026-09-03T08:00:00.000Z' }),
    transaction('deleted', { deleted_at: '2026-09-03T08:00:00.000Z', deletion_reason: 'duplicate' }),
  ];
  const result = snapshot({
    transactions: [transaction('tx-1'), ...hiddenTransactions],
    followups: [
      followup('snoozed', 'tx-1', { snoozed_until: '2026-09-04T12:00:00.000Z' }),
      followup('archived', 'archived'),
      followup('completed', 'completed'),
      followup('deleted', 'deleted'),
    ],
    blockers: [blocker('archived-blocker', 'archived')],
  });
  assert.equal(result.items.length, 0);
});

test('latest transaction route supplies clear ownership without inventing a person', () => {
  const result = snapshot({
    routes: [
      route('old', 'tx-1', 'أحمد', '2026-09-03T08:00:00.000Z'),
      route('new', 'tx-1', 'سارة', '2026-09-04T08:30:00.000Z'),
    ],
    followups: [followup('owned', 'tx-1')],
  });
  assert.equal(result.items[0]?.ownerLabel, 'سارة');
});

test('workflow pending state receives its human title from the frozen template snapshot', () => {
  const result = snapshot({
    workflowInstances: [workflowInstance('wf-1')], workflowItemStates: [workflowState('approval')],
  });
  assert.equal(result.items[0]?.title, 'اعتماد الكتاب النهائي');
  assert.equal(result.items[0]?.source, 'workflow');
});

test('calendar and renewal horizons keep Daily Work focused instead of becoming an unbounded future calendar', () => {
  const result = snapshot({
    calendar: [calendar('near'), calendar('far', { starts_at: '2026-09-10T11:00:00.000Z' })],
    renewals: [renewal('near-renewal'), renewal('far-renewal', { due_date: '2026-10-01' })],
  });
  assert.deepEqual(result.items.map((item) => item.sourceId).sort(), ['near', 'near-renewal']);
});

test('Daily Work result is bounded even when the source contains a pathological number of open items', () => {
  const result = snapshot({
    followups: Array.from({ length: DAILY_WORK_ITEM_LIMIT + 40 }, (_, index) => followup(`followup-${index}`, 'tx-1', { due_at: '2026-09-04T10:00:00.000Z' })),
  });
  assert.equal(result.items.length, DAILY_WORK_ITEM_LIMIT);
  assert.equal(result.summary.total, DAILY_WORK_ITEM_LIMIT + 40);
});
