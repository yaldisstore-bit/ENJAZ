import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { NotificationCommandProvider } from '../features/notifications/NotificationCommandContext.tsx';
import type { InAppNotificationRuntime, NotificationCommandGateway, NotificationListInput } from '../features/notifications/notificationCommands.ts';
import { SchedulingCommandProvider } from '../features/scheduling/SchedulingCommandContext.tsx';
import type { SchedulingCommandGateway } from '../features/scheduling/schedulingCommands.ts';
import { CurrentUserIdProvider } from '../shared/session/CurrentUserIdContext.tsx';
import { ConnectedCoreWorkRouter } from './core-work/CoreWorkConnected.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './core-work/core-work.css';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const TRANSACTION = '33333333-3333-4333-8333-333333333333';
const COMPANY = '44444444-4444-4444-8444-444444444444';
const FOLLOWUP = '55555555-5555-4555-8555-555555555555';
const BLOCKER = '66666666-6666-4666-8666-666666666666';

function repo(items: readonly unknown[]) {
  return Object.freeze({
    async list() { return Object.freeze({ items: Object.freeze([...items]), hasMore: false, total: items.length, offset: 0, limit: 100 }); },
    async update() { throw new Error('Phase 11.2 browser certificate does not mutate source facts'); },
  });
}

const layer = Object.freeze({
  transactions: repo([{ id: TRANSACTION, company_id: COMPANY, deleted_at: null, archived_at: null, status: 'active', type: 'تأسيس شركة', last_activity_at: '2026-09-14T19:00:00.000Z' }]),
  companies: repo([{ id: COMPANY, deleted_at: null, status: 'active', display_name: 'شركة الاختبار القانونية ذات الاسم العربي الطويل', legal_name: 'شركة الاختبار القانونية ذات الاسم العربي الطويل' }]),
  transactionRoutes: repo([]),
  followups: repo([{ id: FOLLOWUP, transaction_id: TRANSACTION, status: 'open', title: 'متابعة توقيع العقد والوثائق النهائية', due_at: '2026-09-14T18:00:00.000Z', snoozed_until: null }]),
  blockers: repo([{ id: BLOCKER, transaction_id: TRANSACTION, status: 'open', title: 'عائق حرج يحتاج مراجعة المستند الأصلي', severity: 'critical', opened_at: '2026-09-14T17:00:00.000Z' }]),
  calendar: repo([]),
  renewals: repo([]),
  workflowInstances: repo([]),
  workflowItemStates: repo([]),
}) as unknown as EnjazWorkspaceDataLayer;

const factory = Object.freeze({
  async resolveWorkspaceId(userId: string) {
    if (userId !== USER) throw new Error('Unexpected browser user');
    return WORKSPACE;
  },
  forWorkspace(workspaceId: string) {
    if (workspaceId !== WORKSPACE) throw new Error('Unexpected browser workspace');
    return layer;
  },
}) as EnjazDataLayerFactory;

const notification: InAppNotificationRuntime = Object.freeze({
  id: '77777777-7777-4777-8777-777777777777', workspaceId: WORKSPACE, userId: USER,
  category: 'follow_up', priority: 'high', title: 'تنبيه متابعة', sourceType: 'transaction_followup', sourceId: FOLLOWUP,
  eventKey: 'followup.overdue', sourceVersion: 2, sourceOccurredAt: '2026-09-14T18:30:00.000Z', scheduledFor: '2026-09-14T18:30:00.000Z',
  readAt: null, snoozedUntil: null, cancelledAt: null, createdAt: '2026-09-14T18:30:00.000Z', updatedAt: '2026-09-14T18:30:00.000Z',
});

const commands: NotificationCommandGateway = Object.freeze({
  async list(input: NotificationListInput) {
    if (input.workspaceId !== WORKSPACE) throw new Error('Unexpected notification workspace');
    return Object.freeze([notification]);
  },
  async mutateNotification() { throw new Error('Notification mutation is not part of this composition certificate'); },
  async mutateFollowup() { throw new Error('Follow-up mutation is not part of this composition certificate'); },
});

const schedulingUnavailable = async (): Promise<never> => {
  throw new Error('Scheduling mutation is not part of this Phase 11.2 composition certificate');
};

const schedulingCommands: SchedulingCommandGateway = Object.freeze({
  mutateCalendarState: schedulingUnavailable,
  mutateRenewalState: schedulingUnavailable,
  checkCalendarEventStaffConflicts: schedulingUnavailable,
  createCalendarEvent: schedulingUnavailable,
  updateCalendarEventMetadata: schedulingUnavailable,
  rescheduleCalendarEvent: schedulingUnavailable,
  setCalendarEventStaff: schedulingUnavailable,
  setCalendarEventConfirmation: schedulingUnavailable,
  recordCalendarEventAttendance: schedulingUnavailable,
});

function BrowserApp() {
  return <>{ConnectedCoreWorkRouter({ destinationId: 'today', transactionId: null, navigate() {}, openTransaction() {} })}</>;
}

const root = document.getElementById('phase11-2-universal-inbox-root');
if (!root) throw new Error('Phase 11.2 Universal Inbox browser root missing');

createRoot(root).render(
  <StrictMode>
    <DataLayerProvider factory={factory}>
      <NotificationCommandProvider gateway={commands}>
        <SchedulingCommandProvider gateway={schedulingCommands}>
          <CurrentUserIdProvider userId={USER}>
            <main className="ez-r2-root r2-shell__main" dir="rtl"><BrowserApp /></main>
          </CurrentUserIdProvider>
        </SchedulingCommandProvider>
      </NotificationCommandProvider>
    </DataLayerProvider>
  </StrictMode>,
);
