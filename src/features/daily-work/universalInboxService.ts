import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { NotificationCommandGateway, InAppNotificationRuntime } from '../notifications/notificationCommands.ts';
import type { DailyWorkSnapshot } from './dailyWorkModel.ts';
import { loadDailyWork } from './dailyWorkService.ts';
import { composeUniversalInbox, type UniversalInboxItem } from './universalInboxContract.ts';

export type UniversalInboxSnapshot = Omit<DailyWorkSnapshot, 'focus' | 'items'> & Readonly<{
  focus: UniversalInboxItem | null;
  items: readonly UniversalInboxItem[];
}>;

export function composeUniversalInboxSnapshot(
  daily: DailyWorkSnapshot,
  notifications: readonly InAppNotificationRuntime[],
  workspaceId: string,
  now: Date = new Date(),
): UniversalInboxSnapshot {
  const items = composeUniversalInbox(daily.items, notifications, workspaceId, now);
  return Object.freeze({
    generatedAt: daily.generatedAt,
    summary: daily.summary,
    focus: items[0] ?? null,
    items,
  });
}

export async function loadUniversalInbox(
  factory: EnjazDataLayerFactory,
  notificationCommands: NotificationCommandGateway,
  userId: string,
  now: Date = new Date(),
): Promise<Readonly<{ workspaceId: string; snapshot: UniversalInboxSnapshot }>> {
  const daily = await loadDailyWork(factory, userId, now);
  const notifications = await notificationCommands.list({ workspaceId: daily.workspaceId, limit: 100 });
  return Object.freeze({
    workspaceId: daily.workspaceId,
    snapshot: composeUniversalInboxSnapshot(daily.snapshot, notifications, daily.workspaceId, now),
  });
}
