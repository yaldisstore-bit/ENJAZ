import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { DailyWorkItem } from '../src/features/daily-work/dailyWorkModel.ts';
import { completeDailyWorkItem, DailyWorkActionUnavailableError, snoozeDailyWorkFollowup } from '../src/features/daily-work/dailyWorkService.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function dailyItem(source: DailyWorkItem['source'], sourceId = 'item-1'): DailyWorkItem {
  return Object.freeze({
    id: `${source}:${sourceId}`, sourceId, source, title: 'عنصر اختبار', subject: 'شركة اختبار', ownerLabel: 'أنت', stateLabel: 'اليوم', tone: 'gold',
    bucket: 'today', dueAt: '2026-09-04T12:00:00.000Z', transactionId: 'tx-1', companyId: 'company-1', score: 90,
    completable: source !== 'blocker', snoozable: source === 'followup',
  });
}

function factoryFor(updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>>): EnjazDataLayerFactory {
  const mutable = (repository: string) => ({
    async update(id: string, patch: unknown) {
      updates.push(Object.freeze({ repository, id, patch }));
      return {};
    },
  });
  const layer = {
    followups: mutable('followups'),
    calendar: mutable('calendar'),
    renewals: mutable('renewals'),
    workflowItemStates: mutable('workflowItemStates'),
  } as unknown as EnjazWorkspaceDataLayer;
  return {
    async resolveWorkspaceId() { return WORKSPACE_ID; },
    forWorkspace(workspaceId: string) {
      assert.equal(workspaceId, WORKSPACE_ID);
      return layer;
    },
  };
}

test('completing a followup writes completion identity and timestamp through the repository', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const now = new Date('2026-09-04T12:30:00.000Z');
  await completeDailyWorkItem(factoryFor(updates), USER_ID, dailyItem('followup'), now);
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.repository, 'followups');
  assert.deepEqual(updates[0]?.patch, { status: 'completed', completed_at: now.toISOString(), completed_by: USER_ID, snoozed_until: null });
});

test('calendar, renewal and workflow completion map to their own authoritative state contracts', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const factory = factoryFor(updates);
  const now = new Date('2026-09-04T12:30:00.000Z');
  await completeDailyWorkItem(factory, USER_ID, dailyItem('calendar', 'cal'), now);
  await completeDailyWorkItem(factory, USER_ID, dailyItem('renewal', 'ren'), now);
  await completeDailyWorkItem(factory, USER_ID, dailyItem('workflow', 'wf'), now);
  assert.deepEqual(updates.map((entry) => entry.repository), ['calendar', 'renewals', 'workflowItemStates']);
  assert.deepEqual(updates[0]?.patch, { status: 'completed' });
  assert.deepEqual(updates[1]?.patch, { status: 'completed', last_completed_at: now.toISOString() });
  assert.deepEqual(updates[2]?.patch, { status: 'done', completed_at: now.toISOString() });
});

test('blockers are not silently resolved from Universal Inbox', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  await assert.rejects(() => completeDailyWorkItem(factoryFor(updates), USER_ID, dailyItem('blocker')), DailyWorkActionUnavailableError);
  assert.equal(updates.length, 0);
});

test('snooze only changes a followup snooze timestamp and rejects non-followup sources', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const until = new Date(Date.now() + 3_600_000);
  const factory = factoryFor(updates);
  await snoozeDailyWorkFollowup(factory, USER_ID, dailyItem('followup'), until);
  assert.deepEqual(updates[0]?.patch, { snoozed_until: until.toISOString() });
  await assert.rejects(() => snoozeDailyWorkFollowup(factory, USER_ID, dailyItem('calendar'), until), DailyWorkActionUnavailableError);
});
