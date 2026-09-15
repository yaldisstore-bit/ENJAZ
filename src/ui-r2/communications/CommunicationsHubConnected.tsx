import { useCommunicationsHub } from '../../features/communications/useCommunicationsHub.ts';
import type { CommunicationConversation, CommunicationTimelineItem } from '../../features/communications/communicationsHubService.ts';

const COMMUNICATIONS_INLINE_CSS = `.r2-comms{display:grid;gap:1rem;min-width:0}.r2-comms__summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(7rem,1fr));gap:.5rem}.r2-comms__summary article,.r2-comms__provider-state,.r2-comms__toolbar,.r2-comms__review,.r2-comms-state{padding:.8rem;border:1px solid var(--ez-r2-surface-warm);border-radius:1rem;background:var(--ez-r2-canvas)}.r2-comms__summary article{text-align:center}.r2-comms__summary strong,.r2-comms__provider-state strong{display:block;font-size:1.25rem;color:var(--ez-r2-interactive)}.r2-comms__toolbar{display:flex;gap:.75rem;align-items:center;background:var(--ez-r2-surface-warm)}.r2-comms__toolbar label{display:flex;flex:1;min-width:0;gap:.5rem}.r2-comms__toolbar input{width:100%;min-width:0;border:0;background:transparent;color:inherit;font:inherit}.r2-comms__workspace{display:grid;grid-template-columns:minmax(16rem,21rem) minmax(0,1fr);overflow:hidden;border:1px solid var(--ez-r2-surface-warm);border-radius:1rem}.r2-comms__threads{min-width:0;background:var(--ez-r2-surface-warm)}.r2-comms__pane-head,.r2-comms__conversation-head,.r2-comms__review>header,.r2-comms__thread-copy>span,.r2-comms__message-meta,.r2-comms__bubble footer{display:flex;justify-content:space-between;gap:.6rem;align-items:center}.r2-comms__pane-head,.r2-comms__conversation-head{padding:1rem}.r2-comms__thread-list,.r2-comms__messages{display:grid;overflow:auto;max-height:38rem}.r2-comms__thread{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.65rem;align-items:center;width:100%;padding:.8rem;border:0;border-block-start:1px solid var(--ez-r2-canvas);background:transparent;color:inherit;text-align:start;font:inherit}.r2-comms__thread.is-selected{background:var(--ez-r2-canvas)}.r2-comms__avatar{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:var(--ez-r2-interactive);color:var(--ez-r2-text-on-dark)}.r2-comms__thread-copy{display:grid;gap:.2rem;min-width:0}.r2-comms__thread-copy strong,.r2-comms__thread-copy b,.r2-comms__thread-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.r2-comms__thread em{min-width:1.6rem;padding:.2rem;border-radius:999px;background:var(--ez-r2-interactive);color:var(--ez-r2-text-on-dark);text-align:center;font-style:normal}.r2-comms__messages{padding:1rem;gap:.75rem}.r2-comms__message{display:flex}.r2-comms__message.is-outgoing{justify-content:flex-end}.r2-comms__bubble{width:min(82%,40rem);padding:.8rem 1rem;border-radius:1rem;background:var(--ez-r2-surface-warm);overflow-wrap:anywhere}.r2-comms__message.is-outgoing .r2-comms__bubble{background:var(--ez-r2-interactive);color:var(--ez-r2-text-on-dark)}.r2-comms__bubble p{white-space:pre-wrap}.r2-comms__review-list{display:grid;gap:.5rem}.r2-comms__review-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;padding:.7rem}.r2-comms__empty{text-align:center;padding:1rem}@media(max-width:60rem){.r2-comms__workspace{grid-template-columns:1fr}.r2-comms__thread-list{max-height:18rem}}@media(max-width:42rem){.r2-comms__toolbar,.r2-comms__conversation-head,.r2-comms__review>header{align-items:stretch;flex-direction:column}.r2-comms__bubble{width:94%}.r2-comms__review-list article{grid-template-columns:1fr}}@media(max-width:24rem){.r2-comms__thread{grid-template-columns:auto minmax(0,1fr)}.r2-comms__thread em,.r2-comms__thread i{grid-column:2}.r2-comms__bubble{width:100%}}`;

function Styles() { return <style>{COMMUNICATIONS_INLINE_CSS}</style>; }
function when(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeStyle:'short'}).format(date);
}
function minutes(value: number | null): string {
  if (value === null) return '—';
  if (value < 60) return `${value} د`;
  const hours = Math.floor(value / 60), rest = value % 60;
  return rest ? `${hours} س ${rest} د` : `${hours} س`;
}
function channel(value: string): string {
  if (value === 'email') return 'بريد';
  if (value === 'whatsapp') return 'واتساب';
  if (value === 'sms') return 'SMS';
  if (value === 'client_portal') return 'بوابة العميل';
  return value || 'قناة';
}
function statusLabel(item: CommunicationTimelineItem): string {
  if (item.outboundStatus === 'reconciliation_required') return 'تحتاج مطابقة مع المزوّد';
  if (item.outboundStatus === 'awaiting_approval') return 'بانتظار الموافقة';
  if (item.outboundStatus === 'failed' || item.transportStatus === 'failed') return 'فشل مؤكد';
  if (item.transportStatus === 'read') return 'مقروءة';
  if (item.transportStatus === 'delivered') return 'مسلّمة';
  if (item.transportStatus === 'sent') return 'مرسلة';
  if (item.transportStatus === 'accepted') return 'مقبولة';
  if (item.direction === 'incoming') return 'واردة';
  return item.transportStatus ?? 'قيد المعالجة';
}
function identity(item: CommunicationConversation): string {
  return item.contactLabel || item.companyLabel || item.transactionLabel || item.subject;
}

export function CommunicationsHubConnected() {
  const controller = useCommunicationsHub();
  if (controller.status === 'loading' && !controller.snapshot) {
    return <><Styles/><div className="r2-screen r2-comms" data-phase11-4-unified-communications="loading"><section className="r2-comms-state" role="status"><strong>جارٍ تجهيز الاتصالات</strong><p>نقرأ المحادثات من السلطة الأصلية داخل مساحة العمل.</p></section></div></>;
  }
  if (controller.status === 'error' || !controller.snapshot) {
    return <><Styles/><div className="r2-screen r2-comms" data-phase11-4-unified-communications="error"><section className="r2-comms-state" role="alert"><strong>تعذر فتح مركز الاتصالات</strong><p>{controller.errorMessage ?? 'تعذر تجهيز البيانات.'}</p><button type="button" className="r2-action r2-action--secondary" onClick={controller.retryLoad}>إعادة المحاولة</button></section></div></>;
  }
  const snapshot = controller.snapshot;
  const selected = controller.selectedConversation;
  return (
    <><Styles/><div className="r2-screen r2-comms" data-screen="communications" data-phase11-4-unified-communications="live">
      <header className="r2-section-heading r2-section-heading--hero r2-comms__hero">
        <div><span className="r2-core-badge">Phase 11.4-D · M4 · متصل</span><p className="r2-eyebrow">Omnichannel Communications Hub</p><h1>الاتصالات</h1><p className="r2-supporting">محادثة واحدة موثوقة لكل سياق؛ البريد وواتساب وSMS وسائل نقل، وليست مخازن حقيقة مستقلة.</p></div>
        <div className="r2-comms__provider-state"><strong>{snapshot.providerAccounts.length}</strong><span>قناة مزوّد مهيأة</span></div>
      </header>

      <section className="r2-comms__summary" aria-label="ملخص الاتصالات">
        <article><strong>{snapshot.summary.unreadCount}</strong><span>غير مقروء</span></article>
        <article><strong>{snapshot.summary.reviewCount}</strong><span>تحتاج ربط</span></article>
        <article><strong>{snapshot.summary.awaitingApprovalCount}</strong><span>بانتظار موافقة</span></article>
        <article className={snapshot.summary.failedCount ? 'is-warning' : ''}><strong>{snapshot.summary.failedCount}</strong><span>فشل مؤكد</span></article>
        <article className={snapshot.summary.reconciliationCount ? 'is-warning' : ''}><strong>{snapshot.summary.reconciliationCount}</strong><span>تحتاج مطابقة</span></article>
      </section>

      <section className="r2-comms__toolbar">
        <label><span aria-hidden="true">⌕</span><input aria-label="بحث الاتصالات" value={controller.query} onChange={(event) => controller.setQuery(event.target.value)} placeholder="ابحث في العميل، الشركة، المعاملة أو نص الرسالة" /></label>
        <p>اتفاقية SLA الحالية: <strong>{snapshot.summary.slaMinutes / 60} ساعات</strong></p>
      </section>

      {controller.actionError ? <p className="r2-comms__alert" role="alert">{controller.actionError}</p> : null}
      <div className="r2-comms__workspace">
        <aside className="r2-comms__threads" aria-label="المحادثات">
          <div className="r2-comms__pane-head"><div><span>المحادثات</span><strong>{snapshot.conversations.length}</strong></div>{controller.status === 'loading' ? <small>تحديث…</small> : null}</div>
          <div className="r2-comms__thread-list">
            {snapshot.conversations.length ? snapshot.conversations.map((item) => (
              <button type="button" key={item.id} className={`r2-comms__thread${controller.selectedConversationId === item.id ? ' is-selected' : ''}`} onClick={() => controller.selectConversation(item.id)} data-unread={item.unreadCount > 0 ? 'true' : 'false'}>
                <span className="r2-comms__avatar" aria-hidden="true">{identity(item).trim().slice(0,1) || 'م'}</span>
                <span className="r2-comms__thread-copy"><span><strong>{identity(item)}</strong><time>{when(item.latestMessage?.occurredAt ?? item.updatedAt)}</time></span><b>{item.latestMessage?.summary || item.subject}</b><small>{item.awaitingParty === 'staff' ? 'بانتظار رد المكتب' : item.awaitingParty === 'client' ? 'بانتظار العميل' : 'لا إجراء حالي'}{item.slaBreached ? ' · تجاوز SLA' : ''}</small></span>
                {item.unreadCount > 0 ? <em>{item.unreadCount}</em> : item.needsAttention ? <i aria-label="تحتاج انتباه" /> : null}
              </button>
            )) : <div className="r2-comms__empty"><strong>لا توجد محادثات مطابقة</strong><p>غيّر عبارة البحث أو ابدأ من مصدر اتصال موثوق.</p></div>}
          </div>
        </aside>

        <main className="r2-comms__timeline" aria-label="سجل المحادثة">
          {selected ? <>
            <header className="r2-comms__conversation-head"><div><span>المحادثة الحالية</span><h2>{identity(selected)}</h2><p>{selected.companyLabel || 'دون شركة'}{selected.transactionLabel ? ` · ${selected.transactionLabel}` : ''}</p></div><div className="r2-comms__conversation-state"><strong>{selected.awaitingParty === 'staff' ? 'رد المكتب' : selected.awaitingParty === 'client' ? 'رد العميل' : 'مستقرة'}</strong><span>{selected.unansweredMinutes === null ? 'لا انتظار' : `منذ ${minutes(selected.unansweredMinutes)}`}</span></div></header>
            <div className="r2-comms__messages" data-communications-timeline="canonical">
              {snapshot.timeline.map((item) => (
                <article key={item.id} className={`r2-comms__message is-${item.direction}`} data-transport-status={item.transportStatus ?? 'none'}>
                  <div className="r2-comms__bubble"><div className="r2-comms__message-meta"><span>{channel(item.channel)}</span><time>{when(item.occurredAt)}</time></div>{item.subject ? <strong>{item.subject}</strong> : null}<p>{item.bodyText || item.summary}</p><footer><span>{statusLabel(item)}</span>{item.attachmentCount ? <span>📎 {item.attachmentCount}</span> : null}{item.canRetry ? <button type="button" disabled={controller.actionKey === `retry:${item.id}`} onClick={() => { void controller.retryOutbound(item); }}>{controller.actionKey === `retry:${item.id}` ? 'إعادة صف…' : 'إعادة آمنة'}</button> : null}</footer></div>
                </article>
              ))}
              {!snapshot.timeline.length ? <div className="r2-comms__empty"><strong>لا توجد رسائل</strong><p>هذه المحادثة لا تحتوي حقيقة اتصال بعد.</p></div> : null}
            </div>
          </> : <div className="r2-comms__empty r2-comms__empty--center"><strong>اختر محادثة</strong><p>ستظهر الرسائل الأصلية وحالة النقل ووقت الانتظار هنا.</p></div>}
        </main>
      </div>

      <section className="r2-comms__review" data-communications-review="governed">
        <header><div><p className="r2-eyebrow">Safe relink review queue</p><h2>رسائل تحتاج تحديد السياق</h2></div><strong>{snapshot.reviewQueue.length}</strong></header>
        {snapshot.reviewQueue.length ? <div className="r2-comms__review-list">{snapshot.reviewQueue.map((item) => (
          <article key={item.communicationId}><div><span>{channel(item.channel)} · {item.linkStatus === 'review_required' ? 'مرشحة لأكثر من سياق' : 'غير مرتبطة'}</span><strong>{item.subject || item.summary}</strong><small>{when(item.occurredAt)}</small></div><button type="button" className="r2-action r2-action--secondary" disabled={!selected || controller.actionKey === `relink:${item.communicationId}`} onClick={() => { void controller.relink(item); }}>{selected ? `ربط بـ ${identity(selected)}` : 'اختر محادثة أولًا'}</button></article>
        ))}</div> : <div className="r2-comms__empty"><strong>قائمة المراجعة نظيفة</strong><p>لا توجد رسالة واردة مجهولة أو ملتبسة حاليًا.</p></div>}
      </section>
    </div></>
  );
}
