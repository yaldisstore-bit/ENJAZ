import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useNotificationCommandGateway } from '../../features/notifications/NotificationCommandContext.tsx';
import type { InAppNotificationRuntime } from '../../features/notifications/notificationCommands.ts';
import type { NotificationLifecycleAction } from '../../features/notifications/notificationFollowupContract.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';

type LoadState = 'loading' | 'ready' | 'error';
type Filter = 'all' | 'unread';

const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  follow_up: 'متابعة', assignment: 'تكليف', deadline: 'موعد نهائي', renewal: 'تجديد', workflow: 'سير عمل',
  document: 'وثيقة', finance: 'مالية', contract: 'عقد', system: 'النظام',
});
const PRIORITY_LABELS: Readonly<Record<InAppNotificationRuntime['priority'], string>> = Object.freeze({
  low: 'منخفضة', normal: 'اعتيادية', high: 'مرتفعة', critical: 'حرجة',
});

const NOTIFICATION_STYLES = `.r2-notifications-live{display:grid;gap:18px;min-width:0;padding-bottom:28px;direction:rtl;color:var(--ez-r2-text-primary)}.r2-notifications-hero{position:relative;overflow:hidden;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:24px;border:1px solid var(--ez-r2-surface-warm);border-radius:28px;background:var(--ez-r2-gradient-warm);box-shadow:0 9px 0 var(--ez-r2-surface-warm)}.r2-notifications-hero h1{margin:6px 0 8px;font-size:clamp(30px,5vw,46px);line-height:1.1}.r2-notifications-hero .r2-supporting{max-width:760px;margin:0;line-height:1.8}.r2-notifications-hero code{font:inherit;font-weight:700}.r2-notification-alert,.r2-notification-state{padding:15px 18px;border-radius:18px;border:1px solid var(--ez-r2-accent);background:var(--ez-r2-surface-warm);line-height:1.7}.r2-notification-state{border-color:var(--ez-r2-surface-warm);background:var(--ez-r2-surface)}.r2-notification-state p{margin:6px 0 0}.r2-notification-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.r2-notification-kpis article{display:grid;gap:4px;min-width:0;padding:16px 18px;border:1px solid var(--ez-r2-surface-warm);border-radius:20px;background:var(--ez-r2-gradient-warm);box-shadow:0 6px 0 var(--ez-r2-surface-warm)}.r2-notification-kpis span{font-size:13px;opacity:.68}.r2-notification-kpis strong{font-size:28px;line-height:1}.r2-notification-filter{display:flex;gap:8px;overflow:auto;padding:3px}.r2-notification-filter button{min-height:42px;padding:8px 14px;border:1px solid var(--ez-r2-surface-warm);border-radius:999px;background:var(--ez-r2-surface);color:inherit;font:inherit;font-weight:700;white-space:nowrap;cursor:pointer}.r2-notification-filter button[aria-pressed=true]{background:var(--ez-r2-interactive);color:var(--ez-r2-text-on-dark);border-color:var(--ez-r2-interactive)}.r2-notification-filter button span{display:inline-grid;place-items:center;min-width:22px;height:22px;margin-inline-start:5px;padding:0 6px;border-radius:999px;background:var(--ez-r2-surface-warm);font-size:12px}.r2-notification-list{display:grid;gap:12px}.r2-notification-card{position:relative;display:grid;grid-template-columns:5px minmax(0,1fr);gap:14px;min-width:0;padding:17px;border:1px solid var(--ez-r2-surface-warm);border-radius:22px;background:var(--ez-r2-surface);box-shadow:0 6px 0 var(--ez-r2-surface-warm);transition:opacity .18s ease,transform .18s ease}.r2-notification-card:hover{transform:translateY(-1px)}.r2-notification-card.is-read{opacity:.76}.r2-notification-card.is-snoozed{border-style:dashed}.r2-notification-card__signal{display:flex}.r2-notification-card__signal span{width:5px;border-radius:999px;background:var(--ez-r2-surface-warm)}.r2-notification-card.is-high .r2-notification-card__signal span{background:var(--ez-r2-accent)}.r2-notification-card.is-critical .r2-notification-card__signal span{background:var(--ez-r2-structure)}.r2-notification-card__body{display:grid;gap:10px;min-width:0}.r2-notification-card__top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.r2-notification-card__top time{font-size:12px;opacity:.62;white-space:nowrap}.r2-notification-card__chips{display:flex;flex-wrap:wrap;gap:6px}.r2-notification-card__chips span{padding:5px 9px;border-radius:999px;background:var(--ez-r2-surface-warm);font-size:11px;font-weight:800}.r2-notification-card__chips [data-priority=critical]{background:var(--ez-r2-structure);color:var(--ez-r2-text-on-dark)}.r2-notification-card__chips [data-priority=high]{background:var(--ez-r2-accent);color:var(--ez-r2-structure)}.r2-notification-card h2{margin:0;font-size:18px;line-height:1.55;overflow-wrap:anywhere}.r2-notification-source,.r2-notification-snooze{margin:0;font-size:13px;line-height:1.6;opacity:.72}.r2-notification-snooze{padding:8px 10px;border-radius:12px;background:var(--ez-r2-surface-warm)}.r2-notification-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}.r2-notification-actions button{min-height:40px;padding:8px 12px;border:1px solid var(--ez-r2-interactive);border-radius:13px;background:var(--ez-r2-surface-warm);color:var(--ez-r2-structure);font:inherit;font-size:13px;font-weight:750;cursor:pointer}.r2-notification-actions button:first-child{background:var(--ez-r2-interactive);color:var(--ez-r2-text-on-dark)}.r2-notification-actions button.is-quiet{background:var(--ez-r2-surface);border-color:var(--ez-r2-surface-warm)}.r2-notification-actions button:disabled{cursor:wait;opacity:.52}.r2-notification-empty{display:grid;justify-items:center;gap:7px;padding:36px 18px;border:1px dashed var(--ez-r2-accent);border-radius:24px;text-align:center;background:var(--ez-r2-gradient-warm)}.r2-notification-empty>span{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:var(--ez-r2-structure);color:var(--ez-r2-text-on-dark);font-size:22px}.r2-notification-empty p{margin:0;opacity:.67}.r2-shell[data-destination="today.notifications"] [data-core-connected="today"]>.r2-screen{display:none!important}@media(max-width:640px){.r2-notifications-live{gap:14px}.r2-notifications-hero{display:grid;padding:18px;border-radius:22px}.r2-notifications-hero .r2-chip{justify-self:start}.r2-notification-kpis{gap:7px}.r2-notification-kpis article{padding:13px 10px;border-radius:16px}.r2-notification-kpis span{font-size:11px}.r2-notification-kpis strong{font-size:23px}.r2-notification-card{padding:14px 12px;gap:10px;border-radius:18px}.r2-notification-card__top{display:grid;gap:8px}.r2-notification-card__top time{white-space:normal}.r2-notification-actions{display:grid;grid-template-columns:1fr 1fr}.r2-notification-actions button{width:100%;min-width:0}.r2-notification-actions button:last-child:nth-child(3){grid-column:1/-1}}@media(max-width:340px){.r2-notification-kpis,.r2-notification-actions{grid-template-columns:1fr}.r2-notification-actions button:last-child:nth-child(3){grid-column:auto}.r2-notifications-hero h1{font-size:30px}}`;

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
      const mutation = snoozedUntil === undefined
        ? { workspaceId, notificationId: row.id, action }
        : { workspaceId, notificationId: row.id, action, snoozedUntil };
      await gateway.mutateNotification(mutation);
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
    <style>{NOTIFICATION_STYLES}</style>
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
