import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useAutomationCommandGateway } from '../../features/automation/AutomationCommandContext.tsx';
import type { AutomationApprovalDecision, AutomationEngineContext, AutomationRule, AutomationRunStatus } from '../../features/automation/automationCommands.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';

type LoadState = 'loading' | 'ready' | 'error';
type Props = Readonly<{ mode?: 'live' | 'preview' }>;

const RUN_STATUS_LABELS: Readonly<Record<AutomationRunStatus, string>> = Object.freeze({
  started: 'قيد التنفيذ',
  awaiting_approval: 'بانتظار موافقة',
  succeeded: 'نجح',
  skipped: 'تم التجاوز',
  failed: 'فشل',
});

function safeDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'وقت غير صالح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function triggerLabel(rule: AutomationRule): string {
  if (rule.triggerConfig.type === 'manual') return 'تشغيل يدوي';
  const eventName = typeof rule.triggerConfig.event === 'string' ? rule.triggerConfig.event : 'حدث غير معروف';
  return `حدث نطاق · ${eventName}`;
}

function parsePayload(raw: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AUTOMATION_PAYLOAD_OBJECT_REQUIRED');
  return parsed as Readonly<Record<string, unknown>>;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'AUTOMATION_PAYLOAD_OBJECT_REQUIRED') return 'حمولة التشغيل يجب أن تكون كائن JSON صالحاً.';
  if (error instanceof SyntaxError) return 'صيغة JSON غير صالحة. صحح الحمولة ثم أعد المحاولة.';
  return 'تعذر تأكيد العملية. أُعيدت الحالة إلى المصدر الموثوق؛ حدّث الصفحة قبل إعادة أي كتابة غير مؤكدة.';
}

function actionLabel(action: Readonly<Record<string, unknown>>): string {
  if (action.type === 'workflow_transition') return 'انتقال سير عمل — يتطلب موافقة بشرية';
  if (action.type === 'create_followup') return 'إنشاء متابعة';
  return 'إجراء أتمتة';
}

export function LiveAutomationExperience({ mode = 'live' }: Props = {}) {
  const userId = useCurrentUserId();
  const dataFactory = useDataLayerFactory();
  const gateway = useAutomationCommandGateway();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [context, setContext] = useState<AutomationEngineContext | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payloads, setPayloads] = useState<Readonly<Record<string, string>>>({});
  const [approvalNotes, setApprovalNotes] = useState<Readonly<Record<string, string>>>({});

  const reload = useCallback(async (resolvedWorkspaceId: string) => {
    const next = await gateway.loadContext(resolvedWorkspaceId);
    setContext(next);
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
        const next = await gateway.loadContext(resolvedWorkspaceId);
        if (!active) return;
        setWorkspaceId(resolvedWorkspaceId);
        setContext(next);
        setLoadState('ready');
      } catch (error) {
        if (!active) return;
        setContext(null);
        setLoadState('error');
        setMessage(errorMessage(error));
      }
    })();
    return () => { active = false; };
  }, [dataFactory, gateway, userId]);

  const runMutation = useCallback(async (key: string, operation: (resolvedWorkspaceId: string) => Promise<unknown>) => {
    if (!workspaceId || busyKey) return;
    setBusyKey(key);
    setMessage(null);
    try {
      await operation(workspaceId);
      await reload(workspaceId);
    } catch (error) {
      setMessage(errorMessage(error));
      try { await reload(workspaceId); } catch { setLoadState('error'); }
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, reload, workspaceId]);

  const enabledCount = useMemo(() => context?.rules.filter((rule) => rule.enabled).length ?? 0, [context]);

  const toggleRule = (rule: AutomationRule) => {
    void runMutation(`toggle:${rule.id}`, (resolvedWorkspaceId) => gateway.setRuleEnabled(resolvedWorkspaceId, rule.id, rule.version, !rule.enabled));
  };

  const dispatchManual = (rule: AutomationRule) => {
    if (rule.triggerConfig.type !== 'manual') return;
    let payload: Readonly<Record<string, unknown>>;
    try { payload = parsePayload(payloads[rule.id] ?? '{}'); }
    catch (error) { setMessage(errorMessage(error)); return; }
    void runMutation(`run:${rule.id}`, (resolvedWorkspaceId) => gateway.dispatch(resolvedWorkspaceId, rule.id, 'manual', payload, `manual-${crypto.randomUUID()}`));
  };

  const decideApproval = (approvalId: string, decision: AutomationApprovalDecision) => {
    const note = (approvalNotes[approvalId] ?? '').trim();
    void runMutation(`approval:${approvalId}`, (resolvedWorkspaceId) => gateway.decideApproval(resolvedWorkspaceId, approvalId, decision, note || null, crypto.randomUUID()));
  };

  return <div
    className="r2-screen r2-intel-screen r2-automation-live"
    data-automation-stage="8.2"
    data-automation-mode={mode}
    data-automation-authority="automation_rules_and_runs"
    data-finance-write-authority="none"
  >
    <header className="r2-intel-hero r2-automation-hero">
      <div>
        <p className="r2-eyebrow">Phase 8.2 · Automation Engine</p>
        <h1>الأتمتة</h1>
        <p className="r2-supporting">قواعد وتشغيلات موثوقة من automation_rules + automation_runs. الإجراءات الحساسة لا تتجاوز الموافقة البشرية، وسلطة الكتابة المالية = لا شيء.</p>
      </div>
      <span className="r2-chip r2-chip--accent">Live · Canonical</span>
    </header>

    {message && <div className="r2-automation-alert" role="alert">{message}</div>}
    {loadState === 'loading' && <section className="r2-intel-card r2-automation-state" aria-live="polite"><strong>جارٍ تحميل محرك الأتمتة الموثوق…</strong></section>}
    {loadState === 'error' && <section className="r2-intel-card r2-automation-state"><strong>تعذر تحميل الأتمتة من المصدر الموثوق.</strong><p>لم يتم إنشاء بيانات بديلة أو تشغيل وهمي.</p></section>}

    {loadState === 'ready' && context && <>
      <section className="r2-automation-kpis" aria-label="ملخص الأتمتة">
        <article><span>القواعد</span><strong>{context.rules.length}</strong></article>
        <article><span>المفعّلة</span><strong>{enabledCount}</strong></article>
        <article><span>موافقات معلقة</span><strong>{context.pendingApprovals.length}</strong></article>
        <article><span>تشغيلات حديثة</span><strong>{context.recentRuns.length}</strong></article>
      </section>

      <section className="r2-automation-section" aria-labelledby="automation-rules-title">
        <div className="r2-intel-card__header"><div><p className="r2-eyebrow">Rules</p><h2 id="automation-rules-title">قواعد الأتمتة</h2></div></div>
        {context.rules.length === 0 ? <div className="r2-intel-card r2-automation-empty">لا توجد قواعد أتمتة مثبتة في مساحة العمل.</div> : <div className="r2-automation-rules">
          {context.rules.map((rule) => {
            const manual = rule.triggerConfig.type === 'manual';
            const toggleBusy = busyKey === `toggle:${rule.id}`;
            const runBusy = busyKey === `run:${rule.id}`;
            return <article className="r2-intel-card r2-automation-rule" key={rule.id} data-rule-key={rule.ruleKey} data-rule-enabled={String(rule.enabled)}>
              <div className="r2-automation-rule__top">
                <div><p className="r2-eyebrow">{rule.ruleKey} · v{rule.version}</p><h3>{rule.name}</h3>{rule.description && <p>{rule.description}</p>}</div>
                <span className={`r2-chip${rule.enabled ? ' r2-chip--accent' : ''}`}>{rule.enabled ? 'مفعّلة' : 'متوقفة'}</span>
              </div>
              <div className="r2-automation-meta">
                <span><b>المشغّل</b>{triggerLabel(rule)}</span>
                <span><b>الشروط</b>{rule.conditions.length}</span>
                <span><b>الإجراءات</b>{rule.actions.length}</span>
              </div>
              <div className="r2-intel-actions">
                <button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => toggleRule(rule)} aria-label={`${rule.enabled ? 'تعطيل' : 'تفعيل'} قاعدة ${rule.name}`}>{toggleBusy ? 'جارٍ الحفظ…' : rule.enabled ? 'تعطيل القاعدة' : 'تفعيل القاعدة'}</button>
              </div>
              {manual ? <div className="r2-automation-manual">
                <label htmlFor={`payload-${rule.id}`}>حمولة التشغيل — {rule.name}</label>
                <textarea id={`payload-${rule.id}`} value={payloads[rule.id] ?? '{}'} onChange={(event) => setPayloads((current) => ({ ...current, [rule.id]: event.target.value }))} spellCheck={false} dir="ltr" />
                <button type="button" className="r2-action r2-action--primary" disabled={Boolean(busyKey) || !rule.enabled} onClick={() => dispatchManual(rule)}>{runBusy ? 'جارٍ التشغيل…' : 'تشغيل يدوي'}</button>
                {!rule.enabled && <small>فعّل القاعدة أولًا؛ المحرك لن ينفذ قاعدة متوقفة.</small>}
              </div> : <p className="r2-automation-event-note">تعمل هذه القاعدة عبر الحدث <code>{typeof rule.triggerConfig.event === 'string' ? rule.triggerConfig.event : 'غير محدد'}</code> فقط؛ لا يوجد تشغيل يدوي مزيف.</p>}
            </article>;
          })}
        </div>}
      </section>

      <section className="r2-automation-section" aria-labelledby="automation-approvals-title">
        <div className="r2-intel-card__header"><div><p className="r2-eyebrow">Human Gate</p><h2 id="automation-approvals-title">الموافقات البشرية</h2></div><span className="r2-chip">{context.pendingApprovals.length}</span></div>
        {context.pendingApprovals.length === 0 ? <div className="r2-intel-card r2-automation-empty">لا توجد موافقات معلقة.</div> : <div className="r2-automation-approvals">
          {context.pendingApprovals.map((approval) => <article className="r2-intel-card r2-automation-approval" key={approval.id} data-approval-id={approval.id}>
            <div><p className="r2-eyebrow">{safeDate(approval.requestedAt)}</p><h3>{actionLabel(approval.actionSnapshot)}</h3><small>Run · {approval.runId.slice(0, 8)}…</small></div>
            <label htmlFor={`approval-note-${approval.id}`}>ملاحظة القرار (اختيارية)</label>
            <input id={`approval-note-${approval.id}`} value={approvalNotes[approval.id] ?? ''} onChange={(event) => setApprovalNotes((current) => ({ ...current, [approval.id]: event.target.value }))} maxLength={600} />
            <div className="r2-intel-actions">
              <button type="button" className="r2-action r2-action--primary" disabled={Boolean(busyKey)} onClick={() => decideApproval(approval.id, 'approved')}>موافقة وتنفيذ</button>
              <button type="button" className="r2-action r2-action--secondary" disabled={Boolean(busyKey)} onClick={() => decideApproval(approval.id, 'rejected')}>رفض</button>
            </div>
          </article>)}
        </div>}
      </section>

      <section className="r2-automation-section" aria-labelledby="automation-runs-title">
        <div className="r2-intel-card__header"><div><p className="r2-eyebrow">Runs</p><h2 id="automation-runs-title">التشغيلات الأخيرة</h2></div></div>
        {context.recentRuns.length === 0 ? <div className="r2-intel-card r2-automation-empty">لا توجد تشغيلات مسجلة بعد.</div> : <div className="r2-automation-runs">
          {context.recentRuns.map((run) => <article className="r2-intel-card r2-automation-run" key={run.id} data-run-status={run.status}>
            <div><strong>{RUN_STATUS_LABELS[run.status]}</strong><small>{safeDate(run.startedAt)}</small></div>
            <span>{run.eventKey ?? 'بدون حدث'}</span>
            <code>{run.receiptKey ? `${run.receiptKey.slice(0, 24)}${run.receiptKey.length > 24 ? '…' : ''}` : 'بدون receipt'}</code>
          </article>)}
        </div>}
      </section>
    </>}
  </div>;
}
