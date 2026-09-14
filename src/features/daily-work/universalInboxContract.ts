import type { DailyWorkItem, DailyWorkSourceKind } from './dailyWorkModel.ts';
import type { InAppNotificationRuntime } from '../notifications/notificationCommands.ts';

export type UniversalInboxAttention = Readonly<{
  notificationId: string;
  category: string;
  priority: InAppNotificationRuntime['priority'];
  unread: boolean;
  sourceVersion: number;
  sourceOccurredAt: string;
}>;

export type UniversalInboxItem = DailyWorkItem & Readonly<{
  attention: UniversalInboxAttention | null;
}>;

const SOURCE_KIND_BY_NOTIFICATION_TYPE: Readonly<Record<string, DailyWorkSourceKind | undefined>> = Object.freeze({
  transaction_followup: 'followup',
  transaction_blocker: 'blocker',
  calendar_event: 'calendar',
  renewal: 'renewal',
  workflow: 'workflow',
  workflow_item: 'workflow',
});

const PRIORITY_RANK: Readonly<Record<InAppNotificationRuntime['priority'], number>> = Object.freeze({
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
});

function safeTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function notificationSourceKey(row: InAppNotificationRuntime): string | null {
  const source = SOURCE_KIND_BY_NOTIFICATION_TYPE[row.sourceType];
  return source ? `${source}:${row.sourceId}` : null;
}

function isAttentionActive(row: InAppNotificationRuntime, workspaceId: string, nowMs: number): boolean {
  if (row.workspaceId !== workspaceId) return false;
  if (row.cancelledAt) return false;
  if (safeTime(row.scheduledFor) > nowMs) return false;
  if (row.snoozedUntil && safeTime(row.snoozedUntil) > nowMs) return false;
  return true;
}

function compareNotificationAuthority(left: InAppNotificationRuntime, right: InAppNotificationRuntime): number {
  if (left.sourceVersion !== right.sourceVersion) return right.sourceVersion - left.sourceVersion;
  const occurred = safeTime(right.sourceOccurredAt) - safeTime(left.sourceOccurredAt);
  if (occurred !== 0) return occurred;
  const priority = PRIORITY_RANK[right.priority] - PRIORITY_RANK[left.priority];
  if (priority !== 0) return priority;
  return left.id.localeCompare(right.id);
}

function attentionFrom(row: InAppNotificationRuntime): UniversalInboxAttention {
  return Object.freeze({
    notificationId: row.id,
    category: row.category,
    priority: row.priority,
    unread: row.readAt === null,
    sourceVersion: row.sourceVersion,
    sourceOccurredAt: row.sourceOccurredAt,
  });
}

/**
 * Phase 11.2 Universal Inbox is a derived composition only.
 *
 * It never creates work from notification rows. Daily Work remains the canonical
 * actionable projection and Phase 11.1 notifications may only decorate a matching
 * source item with attention state. This prevents stale/duplicate notifications
 * from resurrecting completed or archived source work.
 */
export function composeUniversalInbox(
  workItems: readonly DailyWorkItem[],
  notifications: readonly InAppNotificationRuntime[],
  workspaceId: string,
  now: Date = new Date(),
): readonly UniversalInboxItem[] {
  const nowMs = now.getTime();
  const activeBySource = new Map<string, InAppNotificationRuntime[]>();

  for (const row of notifications) {
    if (!isAttentionActive(row, workspaceId, nowMs)) continue;
    const key = notificationSourceKey(row);
    if (!key) continue;
    const existing = activeBySource.get(key);
    if (existing) existing.push(row);
    else activeBySource.set(key, [row]);
  }

  return Object.freeze(workItems.map((item) => {
    const candidates = activeBySource.get(`${item.source}:${item.sourceId}`);
    const notification = candidates?.sort(compareNotificationAuthority)[0] ?? null;
    return Object.freeze({
      ...item,
      attention: notification ? attentionFrom(notification) : null,
    });
  }));
}
