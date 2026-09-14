export const PHASE11_1_AUTHORITY = Object.freeze({
  notificationPreferences: 'notification_preferences',
  notificationDeliveries: 'notification_deliveries',
  transactionFollowups: 'transaction_followups',
  inAppNotificationAuthority: 'PHASE11_1_REQUIRED_EXTENSION',
} as const);

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationCategory =
  | 'follow_up'
  | 'assignment'
  | 'deadline'
  | 'renewal'
  | 'workflow'
  | 'document'
  | 'finance'
  | 'contract'
  | 'system';

export type NotificationChannel = 'in_app' | 'push' | 'email';
export type NotificationLifecycleAction = 'mark_read' | 'mark_unread' | 'snooze' | 'wake' | 'cancel';
export type FollowupStatus = 'open' | 'completed' | 'cancelled';

export interface NotificationSourceRef {
  readonly workspaceId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly eventKey: string;
  readonly sourceVersion: number;
  readonly occurredAt: string;
}

export interface NotificationCandidate {
  readonly workspaceId: string;
  readonly recipientUserId: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly source: NotificationSourceRef;
  readonly scheduledFor: string;
  readonly channel: NotificationChannel;
}

export interface InAppNotificationState {
  readonly readAt: string | null;
  readonly snoozedUntil: string | null;
  readonly cancelledAt: string | null;
}

export interface FollowupLifecycleState {
  readonly status: FollowupStatus;
  readonly dueAt: string;
  readonly completedAt: string | null;
  readonly completedBy: string | null;
  readonly snoozedUntil: string | null;
}

export interface NotificationContractOptions {
  readonly externalProviderIntegrated?: boolean;
  readonly now?: string;
  readonly snoozeUntil?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertText(value: string, name: string, max = 320): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`PHASE11_1_INVALID_${name.toUpperCase()}`);
  return normalized;
}

function assertUuid(value: string, name: string): string {
  if (!UUID.test(value)) throw new Error(`PHASE11_1_INVALID_${name.toUpperCase()}`);
  return value.toLowerCase();
}

function instant(value: string, name: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`PHASE11_1_INVALID_${name.toUpperCase()}`);
  return parsed;
}

function validateNotificationIdentityFields(candidate: NotificationCandidate): void {
  const workspaceId = assertUuid(candidate.workspaceId, 'workspace_id');
  assertUuid(candidate.recipientUserId, 'recipient_user_id');
  if (assertUuid(candidate.source.workspaceId, 'source_workspace_id') !== workspaceId) {
    throw new Error('PHASE11_1_CROSS_WORKSPACE_SOURCE');
  }
  assertText(candidate.source.sourceType, 'source_type', 120);
  assertUuid(candidate.source.sourceId, 'source_id');
  assertText(candidate.source.eventKey, 'event_key', 160);
  if (!Number.isSafeInteger(candidate.source.sourceVersion) || candidate.source.sourceVersion < 1) {
    throw new Error('PHASE11_1_INVALID_SOURCE_VERSION');
  }
  assertText(candidate.title, 'title');
}

export function notificationDedupeIdentity(candidate: NotificationCandidate): string {
  validateNotificationIdentityFields(candidate);
  const source = candidate.source;
  return [
    'ENJAZ:NOTIFICATION:v1',
    candidate.workspaceId.toLowerCase(),
    candidate.recipientUserId.toLowerCase(),
    assertText(source.sourceType, 'source_type', 120),
    source.sourceId.toLowerCase(),
    assertText(source.eventKey, 'event_key', 160),
  ].join(':');
}

export function validateNotificationCandidate(
  candidate: NotificationCandidate,
  options: NotificationContractOptions = {},
): void {
  validateNotificationIdentityFields(candidate);
  const occurred = instant(candidate.source.occurredAt, 'source_occurred_at');
  const scheduled = instant(candidate.scheduledFor, 'scheduled_for');
  if (scheduled < occurred) throw new Error('PHASE11_1_SCHEDULE_BEFORE_SOURCE_EVENT');
  if (candidate.channel !== 'in_app' && options.externalProviderIntegrated !== true) {
    throw new Error('PHASE11_1_EXTERNAL_DELIVERY_PROVIDER_NOT_INTEGRATED');
  }
}

export function assertNotificationLifecycleAction(
  state: InAppNotificationState,
  action: NotificationLifecycleAction,
  at: string,
  options: NotificationContractOptions = {},
): void {
  const actionAt = instant(at, 'action_at');
  const readAt = state.readAt === null ? null : instant(state.readAt, 'read_at');
  const snoozedUntil = state.snoozedUntil === null ? null : instant(state.snoozedUntil, 'snoozed_until');
  const cancelledAt = state.cancelledAt === null ? null : instant(state.cancelledAt, 'cancelled_at');

  if (cancelledAt !== null) throw new Error('PHASE11_1_NOTIFICATION_CANCELLED_FINAL');
  if (action === 'mark_read' && readAt !== null) throw new Error('PHASE11_1_NOTIFICATION_ALREADY_READ');
  if (action === 'mark_unread' && readAt === null) throw new Error('PHASE11_1_NOTIFICATION_ALREADY_UNREAD');
  if (action === 'snooze') {
    if (!options.snoozeUntil || instant(options.snoozeUntil, 'requested_snooze_until') <= actionAt) {
      throw new Error('PHASE11_1_INVALID_SNOOZE_WINDOW');
    }
  }
  if (action === 'wake' && (snoozedUntil === null || snoozedUntil > actionAt)) {
    throw new Error('PHASE11_1_NOTIFICATION_NOT_READY_TO_WAKE');
  }
}

export function validateFollowupLifecycle(state: FollowupLifecycleState): void {
  instant(state.dueAt, 'followup_due_at');
  const completedAt = state.completedAt === null ? null : instant(state.completedAt, 'followup_completed_at');
  const snoozedUntil = state.snoozedUntil === null ? null : instant(state.snoozedUntil, 'followup_snoozed_until');

  if (state.completedBy !== null) assertUuid(state.completedBy, 'followup_completed_by');
  if (state.status === 'completed') {
    if (completedAt === null) throw new Error('PHASE11_1_COMPLETED_FOLLOWUP_REQUIRES_TIMESTAMP');
    if (snoozedUntil !== null) throw new Error('PHASE11_1_COMPLETED_FOLLOWUP_CANNOT_BE_SNOOZED');
    return;
  }

  if (completedAt !== null || state.completedBy !== null) {
    throw new Error('PHASE11_1_NON_COMPLETED_FOLLOWUP_HAS_COMPLETION_EVIDENCE');
  }
  if (state.status === 'cancelled' && snoozedUntil !== null) {
    throw new Error('PHASE11_1_CANCELLED_FOLLOWUP_CANNOT_BE_SNOOZED');
  }
}

export function isActionableFollowup(state: FollowupLifecycleState, at: string): boolean {
  validateFollowupLifecycle(state);
  if (state.status !== 'open') return false;
  const atMs = instant(at, 'actionability_at');
  return state.snoozedUntil === null || instant(state.snoozedUntil, 'followup_snoozed_until') <= atMs;
}

export function assertSameNotificationIdentity(
  previous: NotificationCandidate,
  incoming: NotificationCandidate,
): void {
  if (notificationDedupeIdentity(previous) !== notificationDedupeIdentity(incoming)) {
    throw new Error('PHASE11_1_NOTIFICATION_IDENTITY_MISMATCH');
  }
  if (incoming.source.sourceVersion < previous.source.sourceVersion) {
    throw new Error('PHASE11_1_STALE_SOURCE_VERSION');
  }
}
