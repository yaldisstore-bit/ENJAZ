import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { DailyWorkItem } from '../src/features/daily-work/dailyWorkModel.ts';
import { completeDailyWorkItem, DailyWorkActionUnavailableError, snoozeDailyWorkFollowup } from '../src/features/daily-work/dailyWorkService.ts';
import type { FollowupMutationInput, NotificationCommandGateway } from '../src/features/notifications/notificationCommands.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const FOLLOWUP_ID = '33333333-3333-4333-8333-333333333333';

function dailyItem(source: DailyWorkItem['source'], sourceId = FOLLOWUP_ID): DailyWorkItem {
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

function commandsFor(actions: FollowupMutationInput[]): NotificationCommandGateway {
  return {
    async list() { return []; },
    async mutateNotification() { throw new Error('notification mutation not expected'); },
    async mutateFollowup(input) {
      actions.push(input);
      return Object.freeze({
        id: input.followupId,
        workspaceId: input.workspaceId,
        status: input.action === 'complete' ? 'completed' : input.action === 'cancel' ? 'cancelled' : 'open',
        completedAt: input.action === 'complete' ? '2026-09-04T12:30:00.000Z' : null,
        completedBy: input.action === 'complete' ? USER_ID : null,
        snoozedUntil: input.action === 'snooze' ? input.snoozedUntil ?? null : null,
      });
    },
  };
}

test('completing a followup uses governed RPC gateway and never direct repository lifecycle update', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const actions: FollowupMutationInput[] = [];
  const now = new Date('2026-09-04T12:30:00.000Z');
  await completeDailyWorkItem(factoryFor(updates), commandsFor(actions), USER_ID, dailyItem('followup'), now);
  assert.equal(updates.length, 0);
  assert.deepEqual(actions, [{ workspaceId: WORKSPACE_ID, followupId: FOLLOWUP_ID, action: 'complete' }]);
});

test('calendar, renewal and workflow completion keep their own authoritative state contracts', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const actions: FollowupMutationInput[] = [];
  const factory = factoryFor(updates);
  const commands = commandsFor(actions);
  const now = new Date('2026-09-04T12:30:00.000Z');
  await completeDailyWorkItem(factory, commands, USER_ID, dailyItem('calendar', 'cal'), now);
  await completeDailyWorkItem(factory, commands, USER_ID, dailyItem('renewal', 'ren'), now);
  await completeDailyWorkItem(factory, commands, USER_ID, dailyItem('workflow', 'wf'), now);
  assert.deepEqual(updates.map((entry) => entry.repository), ['calendar', 'renewals', 'workflowItemStates']);
  assert.deepEqual(updates[0]?.patch, { status: 'completed' });
  assert.deepEqual(updates[1]?.patch, { status: 'completed', last_completed_at: now.toISOString() });
  assert.deepEqual(updates[2]?.patch, { status: 'done', completed_at: now.toISOString() });
  assert.equal(actions.length, 0);
});

test('blockers are not silently resolved from Daily Work', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const actions: FollowupMutationInput[] = [];
  await assert.rejects(() => completeDailyWorkItem(factoryFor(updates), commandsFor(actions), USER_ID, dailyItem('blocker')), DailyWorkActionUnavailableError);
  assert.equal(updates.length, 0);
  assert.equal(actions.length, 0);
});

test('snooze uses governed follow-up RPC and rejects non-follow-up sources', async () => {
  const updates: Array<Readonly<{ repository: string; id: string; patch: unknown }>> = [];
  const actions: FollowupMutationInput[] = [];
  const until = new Date(Date.now() + 3_600_000);
  const factory = factoryFor(updates);
  const commands = commandsFor(actions);
  await snoozeDailyWorkFollowup(factory, commands, USER_ID, dailyItem('followup'), until);
  assert.equal(updates.length, 0);
  assert.deepEqual(actions, [{ workspaceId: WORKSPACE_ID, followupId: FOLLOWUP_ID, action: 'snooze', snoozedUntil: until.toISOString() }]);
  await assert.rejects(() => snoozeDailyWorkFollowup(factory, commands, USER_ID, dailyItem('calendar'), until), DailyWorkActionUnavailableError);
});
