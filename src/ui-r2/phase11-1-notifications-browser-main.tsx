import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { NotificationCommandProvider } from '../features/notifications/NotificationCommandContext.tsx';
import type { InAppNotificationRuntime, NotificationCommandGateway, NotificationMutationInput } from '../features/notifications/notificationCommands.ts';
import { CurrentUserIdProvider } from '../shared/session/CurrentUserIdContext.tsx';
import { LiveNotificationExperience } from './notifications/LiveNotificationExperience.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const SOURCE_A = '33333333-3333-4333-8333-333333333333';
const SOURCE_B = '44444444-4444-4444-8444-444444444444';

let rows: InAppNotificationRuntime[] = [
  Object.freeze({
    id: '55555555-5555-4555-8555-555555555555', workspaceId: WORKSPACE, userId: USER,
    category: 'follow_up', priority: 'critical', title: 'متابعة عاجلة لمعاملة متأخرة', sourceType: 'transaction_followup', sourceId: SOURCE_A,
    eventKey: 'followup.overdue', sourceVersion: 3, sourceOccurredAt: '2026-09-14T14:00:00.000Z', scheduledFor: '2026-09-14T14:05:00.000Z',
    readAt: null, snoozedUntil: null, cancelledAt: null, createdAt: '2026-09-14T14:00:00.000Z', updatedAt: '2026-09-14T14:05:00.000Z',
  }),
  Object.freeze({
    id: '66666666-6666-4666-8666-666666666666', workspaceId: WORKSPACE, userId: USER,
    category: 'renewal', priority: 'high', title: 'استحقاق تجديد خلال اليوم', sourceType: 'renewal', sourceId: SOURCE_B,
    eventKey: 'renewal.due', sourceVersion: 1, sourceOccurredAt: '2026-09-14T13:00:00.000Z', scheduledFor: '2026-09-14T13:10:00.000Z',
    readAt: '2026-09-14T15:00:00.000Z', snoozedUntil: null, cancelledAt: null, createdAt: '2026-09-14T13:00:00.000Z', updatedAt: '2026-09-14T15:00:00.000Z',
  }),
];

const testState = { mutations: [] as string[] };
declare global { interface Window { __ENJAZ_PHASE111_BROWSER__?: typeof testState } }
window.__ENJAZ_PHASE111_BROWSER__ = testState;

function applyMutation(input: NotificationMutationInput): InAppNotificationRuntime {
  const index = rows.findIndex((row) => row.id === input.notificationId && row.workspaceId === input.workspaceId);
  if (index < 0) throw new Error('NOTIFICATION_NOT_FOUND');
  const current = rows[index]!;
  const now = new Date().toISOString();
  let next: InAppNotificationRuntime;
  if (input.action === 'mark_read') next = Object.freeze({ ...current, readAt: now, updatedAt: now });
  else if (input.action === 'mark_unread') next = Object.freeze({ ...current, readAt: null, updatedAt: now });
  else if (input.action === 'snooze') next = Object.freeze({ ...current, snoozedUntil: input.snoozedUntil ?? null, updatedAt: now });
  else if (input.action === 'wake') next = Object.freeze({ ...current, snoozedUntil: null, updatedAt: now });
  else next = Object.freeze({ ...current, snoozedUntil: null, cancelledAt: now, updatedAt: now });
  rows = rows.map((row, rowIndex) => rowIndex === index ? next : row);
  testState.mutations.push(`${input.notificationId}:${input.action}`);
  return next;
}

const notificationCommands: NotificationCommandGateway = Object.freeze({
  async list(input) {
    return Object.freeze(rows.filter((row) => row.workspaceId === input.workspaceId && !row.cancelledAt && (!input.unreadOnly || !row.readAt)).slice(0, input.limit ?? 50));
  },
  async mutateNotification(input) { return applyMutation(input); },
  async mutateFollowup() { throw new Error('Follow-up mutation is outside this isolated notification UI harness'); },
});

const dataFactory = Object.freeze({
  async resolveWorkspaceId() { return WORKSPACE; },
  forWorkspace() { throw new Error('Workspace repositories are outside this isolated notification UI harness'); },
}) as unknown as EnjazDataLayerFactory;

const root = document.getElementById('phase11-1-notifications-root');
if (!root) throw new Error('Phase 11.1 browser root missing');
createRoot(root).render(
  <StrictMode>
    <DataLayerProvider factory={dataFactory}>
      <NotificationCommandProvider gateway={notificationCommands}>
        <CurrentUserIdProvider userId={USER}>
          <main className="ez-r2-root r2-shell__main" dir="rtl"><LiveNotificationExperience /></main>
        </CurrentUserIdProvider>
      </NotificationCommandProvider>
    </DataLayerProvider>
  </StrictMode>,
);
