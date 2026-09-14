import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useNotificationCommandGateway } from '../../features/notifications/NotificationCommandContext.tsx';
import type { InAppNotificationRuntime, NotificationLifecycleAction } from '../../features/notifications/notificationCommands.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import './notifications.css';

type LoadState = 'loading' | 'ready' | 'error';
type Filter = 'all' | 'unread';

const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  follow_up: 'متابعة', assignment: 'تكليف', deadline: 'موعد نهائي', renewal: 'تجديد', workflow: 'سير عمل',
  document: 'وثيقة', finance: 'مالية', contract: 'عقد', system: 'النظام',
});
const PRIORITY_LABELS: Readonly<Record<InAppNotificationRuntime['priority'], string>> = Object.freeze({
  low: 'منخفضة', normal: 'اعتيادية', high: 'مرتفعة', critical: 'حرجة',
});

function dateTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function errorMessage(): string {
  return 'تعذر تأكيد حالة الإشعارات من المصدر الموثوق. لم يتم افتراض أي تغيير؛ أعد المحاولة بعد تحديث البيانات.';
}

function sourceLabel(row: InAppNotificationRuntime): string {
  if (row.sourceType === 'transaction_followup') return 'متابعة معاملة';
  if (row.sourceType === 'renewal') return 'تجديد';
  if (row.sourceType === 'calendar_event') return 'تقويم';
  if (row.sourceType === 'workflow') return 'سير عمل';
  if (row.sourceType === 'document') return 'وثيقة';
  return row.sourceType.replaceAll('_', ' ');
}

export function LiveNotificationExperience() {
  const userId = useCurrentUserId();
  const dataFactory = useDataLayerFactory();
  const gateway = useNotificationCommandGateway();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly InAppNotificationRuntime[]>(Object.freeze([]));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async (resolvedWorkspaceId: string) => {
    const next = await gateway.list({ workspaceId: resolvedWorkspaceId, limit: 100 });
    setRows(next);
    setLoadState('ready');
    return next;
  }, [gateway]);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    setMessage(null);
    void (async () => {
      try {
        if (!userId) throw new Error('AUTH_USER_REQUIRED');
        const resolvedWorkspaceId = await dataFactory.resolveWorkspaceId(userId);
        if (!resolvedWorkspaceId) throw new Error('WORKSPACE_REQUIRED');
        const next = await gateway.list({ workspaceId: resolvedWorkspaceId, limit: 100 });
        if (!active) return;
        setWorkspaceId(resolvedWorkspaceId);
        setRows(next);
        setLoadState('ready');
      } catch {
        if (!active) return;
        setRows(Object.freeze([]));
        setLoadState('error');
        setMessage(errorMessage());
      }
    })();
    return () => { active = false; };
  }, [dataFactory, gateway, userId]);

  const mutate = useCallback(async (row: InAppNotificationRuntime, action: NotificationLifecycleAction, snoozedUntil?: string | null) => {
    if (!workspaceId || busyId) return;
    setBusyId(row.id);
    setMessage(null);
    try {
      await gateway.mutateNotification({ workspaceId, notificationId: row.id, action, snoozedUntil });
      await reload(workspaceId);
    } catch {
      setMessage(errorMessage());
      try { await reload(workspaceId); } catch { setLoadState('error'); }
    } finally {
      setBusyId(null);
    }
  }, [busyId, gateway, reload, workspaceId]);

  const unread = useMemo(() => rows.filter((row) => !row.readAt).length, [rows]);
  const critical = useMemo(() => rows.filter((row) => row.priority === 'critical' || row.priority === 'high').length, [rows]);
  const snoozed = useMemo(() => rows.filter((row) => row.snoozedUntil && Date.parse(row.snoozedUntil) > Date.now()).length, [rows]);
  const visible = useMemo(() => rows.filter((row) => filter === 'all' || !row.readAt), [filter, rows]);

  return <div className="r2-screen r2-notifications-live" data-phase11-1-notifications="live" data-notification-authority="in_app_notifications">
    <header className="r2-notifications-hero">
      <div>
        <p className="r2-eyebrow">Phase 11.1 · Canonical In-App State</p>
        <h1>الإشعارات</h1>
        <p className="r2-supporting">حالة القراءة والتأجيل والإلغاء تأتي من <code>in_app_notifications</code>. سجل التوصيل يبقى منفصلًا ولا يُستخدم لاختلاق نجاح push أو email.</p>
      </div>
      <span className="r2-chip r2-chip--accent">Live · RLS</span>
    </header>

    {message ? <div className="r2-notification-alert" role="alert">{message}</div> : null}
    {loadState === 'loading' ? <section className="r2-notification-state" aria-live="polite"><strong>جارٍ تحميل الإشعارات الموثوقة…</strong></section> : null}
    {loadState === 'error' ? <section className="r2-notification-state"><strong>تعذر تحميل مركز الإشعارات.</strong><p>لا توجد بيانات بديلة أو حالة وهمية.</p></section> : null}

    {loadState === 'ready' ? <>
      <section className="r2-notification-kpis" aria-label="ملخص الإشعارات">
        <article><span>غير مقروءة</span><strong>{unread}</strong></article>
        <article><span>مرتفعة/حرجة</span><strong>{critical}</strong></article>
        <article><span>مؤجلة</span><strong>{snoozed}</strong></article>
      </section>

      <div className="r2-notification-filter" role="group" aria-label="فلترة الإشعارات">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>الكل <span>{rows.length}</span></button>
        <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>غير المقروءة <span>{unread}</span></button>
      </div>

      <section className="r2-notification-list" aria-live="polite">
        {visible.length === 0 ? <div className="r2-notification-empty"><span aria-hidden="true">✓</span><strong>{filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات مستحقة الآن'}</strong><p>لن ينشئ إنجاز إشعارات بديلة أو افتراضية.</p></div> : visible.map((row) => {
          const busy = busyId === row.id;
          const futureSnooze = row.snoozedUntil && Date.parse(row.snoozedUntil) > Date.now();
          return <article className={`r2-notification-card is-${row.priority}${row.readAt ? ' is-read' : ' is-unread'}${futureSnooze ? ' is-snoozed' : ''}`} key={row.id} data-notification-id={row.id} data-notification-read={row.readAt ? 'true' : 'false'}>
            <div className="r2-notification-card__signal" aria-hidden="true"><span /></div>
            <div className="r2-notification-card__body">
              <div className="r2-notification-card__top">
                <div className="r2-notification-card__chips"><span>{CATEGORY_LABELS[row.category] ?? row.category}</span><span data-priority={row.priority}>{PRIORITY_LABELS[row.priority]}</span>{futureSnooze ? <span>مؤجل</span> : null}</div>
                <time dateTime={row.scheduledFor}>{dateTime(row.scheduledFor)}</time>
              </div>
              <h2>{row.title}</h2>
              <p className="r2-notification-source">المصدر: {sourceLabel(row)} · إصدار {row.sourceVersion}</p>
              {futureSnooze ? <p className="r2-notification-snooze">مؤجل حتى {dateTime(row.snoozedUntil!)}</p> : null}
              <div className="r2-notification-actions">
                <button type="button" disabled={Boolean(busyId)} onClick={() => void mutate(row, row.readAt ? 'mark_unread' : 'mark_read')}>{busy ? 'جارٍ التأكيد…' : row.readAt ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}</button>
                {!futureSnooze ? <button type="button" disabled={Boolean(busyId)} onClick={() => void mutate(row, 'snooze', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())}>تأجيل ساعتين</button> : null}
                <button type="button" className="is-quiet" disabled={Boolean(busyId)} onClick={() => void mutate(row, 'cancel')}>إلغاء الإشعار</button>
              </div>
            </div>
          </article>;
        })}
      </section>
    </> : null}
  </div>;
}
