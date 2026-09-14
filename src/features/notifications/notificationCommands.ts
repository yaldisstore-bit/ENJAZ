import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import type { NotificationLifecycleAction } from './notificationFollowupContract.ts';

export type InAppNotificationRuntime = Readonly<{
  id: string;
  workspaceId: string;
  userId: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  sourceType: string;
  sourceId: string;
  eventKey: string;
  sourceVersion: number;
  sourceOccurredAt: string;
  scheduledFor: string;
  readAt: string | null;
  snoozedUntil: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type NotificationListInput = Readonly<{
  workspaceId: string;
  unreadOnly?: boolean;
  limit?: number;
}>;

export type NotificationMutationInput = Readonly<{
  workspaceId: string;
  notificationId: string;
  action: NotificationLifecycleAction;
  snoozedUntil?: string | null;
}>;

export type FollowupLifecycleAction = 'complete' | 'snooze' | 'wake' | 'cancel';
export type FollowupMutationInput = Readonly<{
  workspaceId: string;
  followupId: string;
  action: FollowupLifecycleAction;
  snoozedUntil?: string | null;
}>;

export type FollowupMutationResult = Readonly<{
  id: string;
  workspaceId: string;
  status: 'open' | 'completed' | 'cancelled';
  completedAt: string | null;
  completedBy: string | null;
  snoozedUntil: string | null;
}>;

export interface NotificationCommandGateway {
  list(input: NotificationListInput): Promise<readonly InAppNotificationRuntime[]>;
  mutateNotification(input: NotificationMutationInput): Promise<InAppNotificationRuntime>;
  mutateFollowup(input: FollowupMutationInput): Promise<FollowupMutationResult>;
}

type RpcClientLike = {
  rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<{ data: unknown; error: DataFailureLike | null }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIORITIES = new Set(['low', 'normal', 'high', 'critical']);
const FOLLOWUP_STATUSES = new Set(['open', 'completed', 'cancelled']);
const NOTIFICATION_ACTIONS = new Set<NotificationLifecycleAction>(['mark_read', 'mark_unread', 'snooze', 'wake', 'cancel']);
const FOLLOWUP_ACTIONS = new Set<FollowupLifecycleAction>(['complete', 'snooze', 'wake', 'cancel']);

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value.trim().toLowerCase();
}

function requireText(value: unknown, label: string, max = 320): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000\r\n]/u.test(value)) {
    throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  }
  return value.trim();
}

function optionalInstant(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function requireInstant(value: unknown, label: string): string {
  const parsed = optionalInstant(value, label);
  if (!parsed) throw new DataAccessError(`Missing ${label}`, 'DATA_OPERATION_FAILED');
  return parsed;
}

function requirePositiveInteger(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return parsed;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}

function parseNotification(value: unknown): InAppNotificationRuntime {
  const row = record(value, 'notification record');
  const priority = requireText(row.priority, 'notification priority', 16);
  if (!PRIORITIES.has(priority)) throw new DataAccessError('Invalid notification priority', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: requireUuid(row.id, 'notification id'),
    workspaceId: requireUuid(row.workspace_id ?? row.workspaceId, 'workspace id'),
    userId: requireUuid(row.user_id ?? row.userId, 'notification user id'),
    category: requireText(row.category, 'notification category', 40),
    priority: priority as InAppNotificationRuntime['priority'],
    title: requireText(row.title, 'notification title'),
    sourceType: requireText(row.source_type ?? row.sourceType, 'notification source type', 120),
    sourceId: requireUuid(row.source_id ?? row.sourceId, 'notification source id'),
    eventKey: requireText(row.event_key ?? row.eventKey, 'notification event key', 160),
    sourceVersion: requirePositiveInteger(row.source_version ?? row.sourceVersion, 'notification source version'),
    sourceOccurredAt: requireInstant(row.source_occurred_at ?? row.sourceOccurredAt, 'notification source timestamp'),
    scheduledFor: requireInstant(row.scheduled_for ?? row.scheduledFor, 'notification schedule'),
    readAt: optionalInstant(row.read_at ?? row.readAt, 'notification read timestamp'),
    snoozedUntil: optionalInstant(row.snoozed_until ?? row.snoozedUntil, 'notification snooze timestamp'),
    cancelledAt: optionalInstant(row.cancelled_at ?? row.cancelledAt, 'notification cancellation timestamp'),
    createdAt: requireInstant(row.created_at ?? row.createdAt, 'notification created timestamp'),
    updatedAt: requireInstant(row.updated_at ?? row.updatedAt, 'notification updated timestamp'),
  });
}

function parseFollowupResult(value: unknown): FollowupMutationResult {
  const row = record(value, 'follow-up mutation response');
  const status = requireText(row.status, 'follow-up status', 16);
  if (!FOLLOWUP_STATUSES.has(status)) throw new DataAccessError('Invalid follow-up status', 'DATA_OPERATION_FAILED');
  return Object.freeze({
    id: requireUuid(row.id, 'follow-up id'),
    workspaceId: requireUuid(row.workspaceId ?? row.workspace_id, 'workspace id'),
    status: status as FollowupMutationResult['status'],
    completedAt: optionalInstant(row.completedAt ?? row.completed_at, 'follow-up completion timestamp'),
    completedBy: row.completedBy === null || row.completed_by === null ? null : requireUuid(row.completedBy ?? row.completed_by, 'follow-up completion actor'),
    snoozedUntil: optionalInstant(row.snoozedUntil ?? row.snoozed_until, 'follow-up snooze timestamp'),
  });
}

function validateSnooze(action: string, value: string | null | undefined): string | null {
  if (action !== 'snooze') return null;
  if (!value || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
    throw new DataAccessError('Snooze timestamp must be in the future', 'DATA_VALIDATION_FAILED');
  }
  return value;
}

export function createNotificationCommandGateway(client: EnjazSupabaseClient, timeoutMs = 15_000): NotificationCommandGateway {
  const rpc = client as unknown as RpcClientLike;
  const wait = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('notification command timeout')), timeoutMs); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const call = async (name: string, args: Readonly<Record<string, unknown>>): Promise<unknown> => {
    try {
      const result = await wait(Promise.resolve(rpc.rpc(name, args)));
      if (result.error) throw normalizeDataFailure(result.error);
      return result.data;
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw normalizeThrownDataFailure(error, 'write');
    }
  };

  const fetchNotification = async (workspaceId: string, notificationId: string): Promise<InAppNotificationRuntime> => {
    try {
      const result = await wait(Promise.resolve(client.from('in_app_notifications')
        .select('id,workspace_id,user_id,category,priority,title,source_type,source_id,event_key,source_version,source_occurred_at,scheduled_for,read_at,snoozed_until,cancelled_at,created_at,updated_at')
        .eq('workspace_id', workspaceId)
        .eq('id', notificationId)
        .maybeSingle()));
      if (result.error) throw normalizeDataFailure(result.error as DataFailureLike);
      if (!result.data) throw new DataAccessError('Notification not found', 'DATA_OPERATION_FAILED');
      return parseNotification(result.data);
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw normalizeThrownDataFailure(error, 'read');
    }
  };

  return Object.freeze({
    async list(input: NotificationListInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const limit = input.limit ?? 50;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new DataAccessError('Invalid notification list limit', 'DATA_VALIDATION_FAILED');
      try {
        let query = client.from('in_app_notifications')
          .select('id,workspace_id,user_id,category,priority,title,source_type,source_id,event_key,source_version,source_occurred_at,scheduled_for,read_at,snoozed_until,cancelled_at,created_at,updated_at')
          .eq('workspace_id', workspaceId)
          .is('cancelled_at', null)
          .lte('scheduled_for', new Date().toISOString())
          .order('scheduled_for', { ascending: false })
          .limit(limit);
        if (input.unreadOnly === true) query = query.is('read_at', null);
        const result = await wait(Promise.resolve(query));
        if (result.error) throw normalizeDataFailure(result.error as DataFailureLike);
        if (!Array.isArray(result.data)) throw new DataAccessError('Invalid notification list response', 'DATA_OPERATION_FAILED');
        return Object.freeze(result.data.map(parseNotification));
      } catch (error) {
        if (error instanceof DataAccessError) throw error;
        throw normalizeThrownDataFailure(error, 'read');
      }
    },

    async mutateNotification(input: NotificationMutationInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const notificationId = requireUuid(input.notificationId, 'notification id');
      if (!NOTIFICATION_ACTIONS.has(input.action)) throw new DataAccessError('Invalid notification action', 'DATA_VALIDATION_FAILED');
      const snoozedUntil = validateSnooze(input.action, input.snoozedUntil);
      await call('mutate_in_app_notification_state_v1', {
        p_workspace_id: workspaceId,
        p_notification_id: notificationId,
        p_action: input.action,
        p_snoozed_until: snoozedUntil,
      });
      return fetchNotification(workspaceId, notificationId);
    },

    async mutateFollowup(input: FollowupMutationInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const followupId = requireUuid(input.followupId, 'follow-up id');
      if (!FOLLOWUP_ACTIONS.has(input.action)) throw new DataAccessError('Invalid follow-up action', 'DATA_VALIDATION_FAILED');
      const snoozedUntil = validateSnooze(input.action, input.snoozedUntil);
      const response = await call('mutate_transaction_followup_state_v1', {
        p_workspace_id: workspaceId,
        p_followup_id: followupId,
        p_action: input.action,
        p_snoozed_until: snoozedUntil,
      });
      return parseFollowupResult(response);
    },
  });
}
