import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { NotificationCommandGateway, InAppNotificationRuntime } from '../src/features/notifications/notificationCommands.ts';
import { loadUniversalInbox } from '../src/features/daily-work/universalInboxService.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const TRANSACTION_ID = '33333333-3333-4333-8333-333333333333';
const COMPANY_ID = '44444444-4444-4444-8444-444444444444';
const FOLLOWUP_ID = '55555555-5555-4555-8555-555555555555';
const NOTIFICATION_ID = '66666666-6666-4666-8666-666666666666';

function repository(items: readonly unknown[]) {
  return {
    async list() {
      return Object.freeze({ items: Object.freeze([...items]), hasMore: false, total: items.length, limit: 100, offset: 0 });
    },
  };
}

function factory(): EnjazDataLayerFactory {
  const layer = {
    transactions: repository([{ id: TRANSACTION_ID, company_id: COMPANY_ID, deleted_at: null, archived_at: null, status: 'active', type: 'تأسيس شركة', last_activity_at: '2026-09-14T19:00:00.000Z' }]),
    companies: repository([{ id: COMPANY_ID, deleted_at: null, status: 'active', display_name: 'شركة الاختبار', legal_name: 'شركة الاختبار' }]),
    transactionRoutes: repository([]),
    followups: repository([{ id: FOLLOWUP_ID, transaction_id: TRANSACTION_ID, status: 'open', title: 'متابعة التوقيع', due_at: '2026-09-14T20:00:00.000Z', snoozed_until: null }]),
    blockers: repository([]),
    calendar: repository([]),
    renewals: repository([]),
    workflowInstances: repository([]),
    workflowItemStates: repository([]),
  } as unknown as EnjazWorkspaceDataLayer;
  return {
    async resolveWorkspaceId(userId: string) {
      assert.equal(userId, USER_ID);
      return WORKSPACE_ID;
    },
    forWorkspace(workspaceId: string) {
      assert.equal(workspaceId, WORKSPACE_ID);
      return layer;
    },
  };
}

function notification(): InAppNotificationRuntime {
  return Object.freeze({
    id: NOTIFICATION_ID,
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    category: 'followup',
    priority: 'high',
    title: 'متابعة تستحق الانتباه',
    sourceType: 'transaction_followup',
    sourceId: FOLLOWUP_ID,
    eventKey: 'followup:due',
    sourceVersion: 1,
    sourceOccurredAt: '2026-09-14T19:30:00.000Z',
    scheduledFor: '2026-09-14T19:30:00.000Z',
    readAt: null,
    snoozedUntil: null,
    cancelledAt: null,
    createdAt: '2026-09-14T19:30:00.000Z',
    updatedAt: '2026-09-14T19:30:00.000Z',
  });
}

function commands(calls: Array<Readonly<{ workspaceId: string; limit?: number }>>): NotificationCommandGateway {
  return {
    async list(input) {
      calls.push(Object.freeze({ workspaceId: input.workspaceId, limit: input.limit }));
      return Object.freeze([notification()]);
    },
    async mutateNotification() { throw new Error('mutation not expected'); },
    async mutateFollowup() { throw new Error('mutation not expected'); },
  };
}

test('Universal Inbox service composes Daily Work with notification attention without duplicating work', async () => {
  const calls: Array<Readonly<{ workspaceId: string; limit?: number }>> = [];
  const now = new Date('2026-09-14T21:00:00.000Z');
  const result = await loadUniversalInbox(factory(), commands(calls), USER_ID, now);

  assert.equal(result.workspaceId, WORKSPACE_ID);
  assert.deepEqual(calls, [{ workspaceId: WORKSPACE_ID, limit: 100 }]);
  assert.equal(result.snapshot.summary.total, 1);
  assert.equal(result.snapshot.items.length, 1);
  assert.equal(result.snapshot.focus?.id, `followup:${FOLLOWUP_ID}`);
  assert.equal(result.snapshot.items[0]?.id, `followup:${FOLLOWUP_ID}`);
  assert.equal(result.snapshot.items[0]?.attention?.notificationId, NOTIFICATION_ID);
  assert.equal(result.snapshot.items[0]?.attention?.unread, true);
  assert.equal(result.snapshot.items[0]?.attention?.priority, 'high');
});

test('Universal Inbox service preserves actionable work when no matching notification exists', async () => {
  const noAttentionCommands: NotificationCommandGateway = {
    async list() { return Object.freeze([]); },
    async mutateNotification() { throw new Error('mutation not expected'); },
    async mutateFollowup() { throw new Error('mutation not expected'); },
  };
  const result = await loadUniversalInbox(factory(), noAttentionCommands, USER_ID, new Date('2026-09-14T21:00:00.000Z'));
  assert.equal(result.snapshot.items.length, 1);
  assert.equal(result.snapshot.items[0]?.attention, null);
  assert.equal(result.snapshot.summary.total, 1);
});
