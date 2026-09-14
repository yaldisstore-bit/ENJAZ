import test from 'node:test';
import assert from 'node:assert/strict';
import type { DailyWorkItem } from '../src/features/daily-work/dailyWorkModel.ts';
import type { InAppNotificationRuntime } from '../src/features/notifications/notificationCommands.ts';
import { composeUniversalInbox } from '../src/features/daily-work/universalInboxContract.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const OTHER_WORKSPACE = '22222222-2222-4222-8222-222222222222';
const SOURCE = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-09-14T18:00:00.000Z');

function work(overrides: Partial<DailyWorkItem> = {}): DailyWorkItem {
  return Object.freeze({
    id: `followup:${SOURCE}`,
    sourceId: SOURCE,
    source: 'followup',
    title: 'متابعة الشركة',
    subject: 'شركة الاختبار',
    ownerLabel: 'أنت',
    stateLabel: 'اليوم',
    tone: 'gold',
    bucket: 'today',
    dueAt: '2026-09-14T20:00:00.000Z',
    transactionId: '44444444-4444-4444-8444-444444444444',
    companyId: '55555555-5555-4555-8555-555555555555',
    score: 88,
    completable: true,
    snoozable: true,
    ...overrides,
  });
}

function notification(overrides: Partial<InAppNotificationRuntime> = {}): InAppNotificationRuntime {
  return Object.freeze({
    id: '66666666-6666-4666-8666-666666666666',
    workspaceId: WORKSPACE,
    userId: '77777777-7777-4777-8777-777777777777',
    category: 'follow_up',
    priority: 'high',
    title: 'متابعة تستحق الانتباه',
    sourceType: 'transaction_followup',
    sourceId: SOURCE,
    eventKey: 'followup:due',
    sourceVersion: 1,
    sourceOccurredAt: '2026-09-14T17:00:00.000Z',
    scheduledFor: '2026-09-14T17:00:00.000Z',
    readAt: null,
    snoozedUntil: null,
    cancelledAt: null,
    createdAt: '2026-09-14T17:00:00.000Z',
    updatedAt: '2026-09-14T17:00:00.000Z',
    ...overrides,
  });
}

test('merges notification attention onto the canonical work item without duplicating work', () => {
  const result = composeUniversalInbox([work()], [notification()], WORKSPACE, NOW);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, `followup:${SOURCE}`);
  assert.equal(result[0]?.attention?.notificationId, '66666666-6666-4666-8666-666666666666');
  assert.equal(result[0]?.attention?.unread, true);
});

test('cannot fabricate actionable work from a notification whose source is absent', () => {
  const result = composeUniversalInbox([], [notification()], WORKSPACE, NOW);
  assert.deepEqual(result, []);
});

test('unknown notification source types cannot become business work items', () => {
  const result = composeUniversalInbox([work()], [notification({ sourceType: 'document' })], WORKSPACE, NOW);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.attention, null);
});

test('foreign-workspace notification cannot decorate the current workspace item', () => {
  const result = composeUniversalInbox([work()], [notification({ workspaceId: OTHER_WORKSPACE })], WORKSPACE, NOW);
  assert.equal(result[0]?.attention, null);
});

test('notification snooze suppresses attention only and never hides the underlying work', () => {
  const result = composeUniversalInbox(
    [work()],
    [notification({ snoozedUntil: '2026-09-15T18:00:00.000Z' })],
    WORKSPACE,
    NOW,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0]?.attention, null);
});

test('cancelled and future-scheduled notifications cannot resurrect or decorate current work', () => {
  const cancelled = notification({ cancelledAt: '2026-09-14T17:30:00.000Z' });
  const future = notification({
    id: '88888888-8888-4888-8888-888888888888',
    scheduledFor: '2026-09-15T18:00:00.000Z',
  });
  const result = composeUniversalInbox([work()], [cancelled, future], WORKSPACE, NOW);
  assert.equal(result[0]?.attention, null);
});

test('newest source revision wins deterministically and stale unread state cannot resurrect', () => {
  const stale = notification({ sourceVersion: 1, readAt: null, priority: 'critical' });
  const current = notification({
    id: '99999999-9999-4999-8999-999999999999',
    sourceVersion: 2,
    sourceOccurredAt: '2026-09-14T17:30:00.000Z',
    priority: 'normal',
    readAt: '2026-09-14T17:40:00.000Z',
  });
  const result = composeUniversalInbox([work()], [stale, current], WORKSPACE, NOW);
  assert.equal(result[0]?.attention?.notificationId, '99999999-9999-4999-8999-999999999999');
  assert.equal(result[0]?.attention?.sourceVersion, 2);
  assert.equal(result[0]?.attention?.unread, false);
});

test('calendar, renewal, blocker and workflow provenance map onto their source-owned work items', () => {
  const cases = [
    ['calendar', 'calendar_event'],
    ['renewal', 'renewal'],
    ['blocker', 'transaction_blocker'],
    ['workflow', 'workflow_item'],
  ] as const;

  for (const [source, sourceType] of cases) {
    const item = work({ id: `${source}:${SOURCE}`, source });
    const result = composeUniversalInbox([item], [notification({ sourceType })], WORKSPACE, NOW);
    assert.equal(result.length, 1);
    assert.ok(result[0]?.attention, `${sourceType} should map to ${source}`);
  }
});

test('composition preserves work ordering and stable source identity', () => {
  const secondSource = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const first = work();
  const second = work({ id: `followup:${secondSource}`, sourceId: secondSource, title: 'ثانية', score: 50 });
  const result = composeUniversalInbox([first, second], [notification()], WORKSPACE, NOW);
  assert.deepEqual(result.map((item) => item.id), [first.id, second.id]);
  assert.deepEqual(result.map((item) => item.sourceId), [first.sourceId, second.sourceId]);
});
