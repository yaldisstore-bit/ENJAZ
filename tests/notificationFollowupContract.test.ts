import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE11_1_AUTHORITY,
  assertNotificationLifecycleAction,
  assertSameNotificationIdentity,
  isActionableFollowup,
  notificationDedupeIdentity,
  validateFollowupLifecycle,
  validateNotificationCandidate,
  type FollowupLifecycleState,
  type NotificationCandidate,
} from '../src/features/notifications/notificationFollowupContract.ts';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const FOREIGN_WORKSPACE = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const SOURCE = '44444444-4444-4444-8444-444444444444';
const ACTOR = '55555555-5555-4555-8555-555555555555';

function notification(patch: Partial<NotificationCandidate> = {}): NotificationCandidate {
  return {
    workspaceId: WORKSPACE,
    recipientUserId: USER,
    category: 'follow_up',
    priority: 'high',
    title: 'متابعة معاملة متأخرة',
    source: {
      workspaceId: WORKSPACE,
      sourceType: 'transaction_followup',
      sourceId: SOURCE,
      eventKey: 'followup.overdue',
      sourceVersion: 1,
      occurredAt: '2026-09-14T08:00:00.000Z',
    },
    scheduledFor: '2026-09-14T08:05:00.000Z',
    channel: 'in_app',
    ...patch,
  };
}

function followup(patch: Partial<FollowupLifecycleState> = {}): FollowupLifecycleState {
  return {
    status: 'open',
    dueAt: '2026-09-14T10:00:00.000Z',
    completedAt: null,
    completedBy: null,
    snoozedUntil: null,
    ...patch,
  };
}

test('Phase 11.1 reuses existing notification/follow-up authorities and uses the governed in-app state extension', () => {
  assert.equal(PHASE11_1_AUTHORITY.notificationPreferences, 'notification_preferences');
  assert.equal(PHASE11_1_AUTHORITY.notificationDeliveries, 'notification_deliveries');
  assert.equal(PHASE11_1_AUTHORITY.transactionFollowups, 'transaction_followups');
  assert.equal(PHASE11_1_AUTHORITY.inAppNotificationAuthority, 'in_app_notifications');
});

test('notification dedupe identity is stable across source revisions of the same authoritative event', () => {
  const first = notification();
  const revised = notification({ source: { ...first.source, sourceVersion: 2 } });
  assert.equal(notificationDedupeIdentity(first), notificationDedupeIdentity(revised));
  assert.doesNotThrow(() => assertSameNotificationIdentity(first, revised));
});

test('stale source revision cannot replace a fresher notification projection', () => {
  const current = notification({ source: { ...notification().source, sourceVersion: 4 } });
  const stale = notification({ source: { ...notification().source, sourceVersion: 3 } });
  assert.throws(() => assertSameNotificationIdentity(current, stale), /PHASE11_1_STALE_SOURCE_VERSION/);
});

test('cross-workspace source notification fails closed', () => {
  const candidate = notification({
    source: { ...notification().source, workspaceId: FOREIGN_WORKSPACE },
  });
  assert.throws(() => validateNotificationCandidate(candidate), /PHASE11_1_CROSS_WORKSPACE_SOURCE/);
});

test('notification cannot be scheduled before its authoritative source event', () => {
  const candidate = notification({ scheduledFor: '2026-09-14T07:59:59.000Z' });
  assert.throws(() => validateNotificationCandidate(candidate), /PHASE11_1_SCHEDULE_BEFORE_SOURCE_EVENT/);
});

test('push/email cannot pretend to be integrated before an external provider exists', () => {
  assert.throws(
    () => validateNotificationCandidate(notification({ channel: 'email' })),
    /PHASE11_1_EXTERNAL_DELIVERY_PROVIDER_NOT_INTEGRATED/,
  );
  assert.doesNotThrow(() => validateNotificationCandidate(notification({ channel: 'email' }), { externalProviderIntegrated: true }));
});

test('notification read/unread lifecycle rejects duplicate actions and cancelled state is final', () => {
  assert.doesNotThrow(() => assertNotificationLifecycleAction(
    { readAt: null, snoozedUntil: null, cancelledAt: null },
    'mark_read',
    '2026-09-14T09:00:00.000Z',
  ));
  assert.throws(() => assertNotificationLifecycleAction(
    { readAt: '2026-09-14T08:30:00.000Z', snoozedUntil: null, cancelledAt: null },
    'mark_read',
    '2026-09-14T09:00:00.000Z',
  ), /PHASE11_1_NOTIFICATION_ALREADY_READ/);
  assert.throws(() => assertNotificationLifecycleAction(
    { readAt: null, snoozedUntil: null, cancelledAt: '2026-09-14T08:45:00.000Z' },
    'mark_read',
    '2026-09-14T09:00:00.000Z',
  ), /PHASE11_1_NOTIFICATION_CANCELLED_FINAL/);
});

test('snooze must be future-facing and wake cannot occur before the governed wake-up time', () => {
  assert.doesNotThrow(() => assertNotificationLifecycleAction(
    { readAt: null, snoozedUntil: null, cancelledAt: null },
    'snooze',
    '2026-09-14T09:00:00.000Z',
    { snoozeUntil: '2026-09-14T10:00:00.000Z' },
  ));
  assert.throws(() => assertNotificationLifecycleAction(
    { readAt: null, snoozedUntil: null, cancelledAt: null },
    'snooze',
    '2026-09-14T09:00:00.000Z',
    { snoozeUntil: '2026-09-14T08:59:59.000Z' },
  ), /PHASE11_1_INVALID_SNOOZE_WINDOW/);
  assert.throws(() => assertNotificationLifecycleAction(
    { readAt: null, snoozedUntil: '2026-09-14T10:00:00.000Z', cancelledAt: null },
    'wake',
    '2026-09-14T09:30:00.000Z',
  ), /PHASE11_1_NOTIFICATION_NOT_READY_TO_WAKE/);
});

test('follow-up completion/cancellation cannot carry contradictory lifecycle evidence', () => {
  assert.doesNotThrow(() => validateFollowupLifecycle(followup({
    status: 'completed',
    completedAt: '2026-09-14T09:00:00.000Z',
    completedBy: ACTOR,
  })));
  assert.throws(() => validateFollowupLifecycle(followup({ status: 'completed' })), /PHASE11_1_COMPLETED_FOLLOWUP_REQUIRES_TIMESTAMP/);
  assert.throws(() => validateFollowupLifecycle(followup({
    status: 'open',
    completedAt: '2026-09-14T11:00:00.000Z',
  })), /PHASE11_1_NON_COMPLETED_FOLLOWUP_HAS_COMPLETION_EVIDENCE/);
  assert.throws(() => validateFollowupLifecycle(followup({
    status: 'cancelled',
    snoozedUntil: '2026-09-15T10:00:00.000Z',
  })), /PHASE11_1_CANCELLED_FOLLOWUP_CANNOT_BE_SNOOZED/);
});

test('only open and awake follow-ups are actionable', () => {
  assert.equal(isActionableFollowup(followup(), '2026-09-14T09:00:00.000Z'), true);
  assert.equal(isActionableFollowup(followup({ snoozedUntil: '2026-09-14T11:00:00.000Z' }), '2026-09-14T09:00:00.000Z'), false);
  assert.equal(isActionableFollowup(followup({ snoozedUntil: '2026-09-14T08:00:00.000Z' }), '2026-09-14T09:00:00.000Z'), true);
  assert.equal(isActionableFollowup(followup({ status: 'cancelled' }), '2026-09-14T09:00:00.000Z'), false);
});
