import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { DataLayerProvider } from '../../data/react/DataLayerContext.tsx';
import { AutomationCommandProvider } from '../../features/automation/AutomationCommandContext.tsx';
import type { AutomationApprovalDecision, AutomationApprovalResult, AutomationCommandGateway, AutomationDispatchResult, AutomationEngineContext, AutomationRule, UpsertAutomationRuleInput } from '../../features/automation/automationCommands.ts';
import { CurrentUserIdProvider } from '../../shared/session/CurrentUserIdContext.tsx';
import { LiveAutomationExperience } from './LiveAutomationExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import '../operational-intelligence/operational-intelligence.css';
import './automation.css';

const W = '11111111-1111-4111-8111-111111111111';
const U = '22222222-2222-4222-8222-222222222222';
const MANUAL_RULE = '33333333-3333-4333-8333-333333333331';
const EVENT_RULE = '33333333-3333-4333-8333-333333333332';
const APPROVAL = '44444444-4444-4444-8444-444444444441';
const APPROVAL_RUN = '55555555-5555-4555-8555-555555555551';
const NOW = '2026-09-07T12:00:00.000Z';

const manualRule: AutomationRule = Object.freeze({
  id: MANUAL_RULE,
  ruleKey: 'manual_late_followup',
  name: 'متابعة المعاملة المتأخرة',
  description: 'تنشئ متابعة موثقة عند التشغيل اليدوي بعد التحقق من الحمولة.',
  enabled: true,
  version: 3,
  triggerConfig: Object.freeze({ type: 'manual' }),
  conditions: Object.freeze([]),
  actions: Object.freeze([{ type: 'create_followup', title: 'متابعة التأخير', dueInDays: 1 }]),
  throttlePolicy: Object.freeze({}),
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: NOW,
});

const eventRule: AutomationRule = Object.freeze({
  id: EVENT_RULE,
  ruleKey: 'workflow_stage_changed',
  name: 'مراجعة انتقال المرحلة',
  description: 'تستجيب لحدث نطاق فقط ولا تدعي تشغيلًا يدويًا.',
  enabled: true,
  version: 2,
  triggerConfig: Object.freeze({ type: 'domain_event', event: 'workflow.stage.changed' }),
  conditions: Object.freeze([{ field: 'priority', operator: 'eq', value: 'high' }]),
  actions: Object.freeze([{ type: 'workflow_transition', instanceIdField: 'workflowInstanceId', expectedStageField: 'stagePosition', transitionKey: 'approve_review', reason: 'مراجعة بشرية' }]),
  throttlePolicy: Object.freeze({ minimumSeconds: 60 }),
  createdAt: '2026-09-02T08:00:00.000Z',
  updatedAt: NOW,
});

let context: AutomationEngineContext = Object.freeze({
  authority: 'automation_rules_and_runs',
  workflowWriteAuthority: 'existing_workflow_rpc_only_after_human_approval',
  financeWriteAuthority: 'none',
  rules: Object.freeze([manualRule, eventRule]),
  recentRuns: Object.freeze([
    Object.freeze({ id: '55555555-5555-4555-8555-555555555552', ruleId: MANUAL_RULE, status: 'succeeded', receiptKey: 'manual-preview-existing', eventKey: 'manual', result: Object.freeze({ approvalRequired: false }), startedAt: '2026-09-07T10:00:00.000Z', finishedAt: '2026-09-07T10:00:01.000Z' }),
    Object.freeze({ id: APPROVAL_RUN, ruleId: EVENT_RULE, status: 'awaiting_approval', receiptKey: 'event-preview-approval', eventKey: 'workflow.stage.changed', result: Object.freeze({ approvalRequired: true }), startedAt: '2026-09-07T11:00:00.000Z', finishedAt: null }),
  ]),
  pendingApprovals: Object.freeze([
    Object.freeze({ id: APPROVAL, runId: APPROVAL_RUN, ruleId: EVENT_RULE, requestedAt: '2026-09-07T11:00:01.000Z', actionSnapshot: Object.freeze({ type: 'workflow_transition', transitionKey: 'approve_review' }) }),
  ]),
});

function replaceRule(ruleId: string, update: (rule: AutomationRule) => AutomationRule) {
  context = Object.freeze({ ...context, rules: Object.freeze(context.rules.map((rule) => rule.id === ruleId ? update(rule) : rule)) });
}

const gateway: AutomationCommandGateway = Object.freeze({
  async loadContext(workspaceId: string) {
    if (workspaceId !== W) throw new Error('preview workspace mismatch');
    return context;
  },
  async upsertRule(_input: UpsertAutomationRuleInput) {
    throw new Error('Preview does not create rules');
  },
  async setRuleEnabled(workspaceId: string, ruleId: string, expectedVersion: number, enabled: boolean) {
    if (workspaceId !== W) throw new Error('preview workspace mismatch');
    const current = context.rules.find((rule) => rule.id === ruleId);
    if (!current || current.version !== expectedVersion) throw new Error('preview stale rule');
    const version = current.version + 1;
    replaceRule(ruleId, (rule) => Object.freeze({ ...rule, enabled, version, updatedAt: NOW }));
    return Object.freeze({ id: ruleId, enabled, version });
  },
  async dispatch(workspaceId: string, ruleId: string, eventKey: string, payload: Readonly<Record<string, unknown>>, receiptKey: string): Promise<AutomationDispatchResult> {
    if (workspaceId !== W || eventKey !== 'manual' || ruleId !== MANUAL_RULE || typeof payload.transactionId !== 'string') throw new Error('preview dispatch boundary');
    const runId = crypto.randomUUID();
    context = Object.freeze({
      ...context,
      recentRuns: Object.freeze([Object.freeze({ id: runId, ruleId, status: 'succeeded' as const, receiptKey, eventKey, result: Object.freeze({ approvalRequired: false }), startedAt: NOW, finishedAt: NOW }), ...context.recentRuns]),
    });
    return Object.freeze({ runId, status: 'succeeded', result: Object.freeze({ approvalRequired: false }), wasDuplicate: false });
  },
  async decideApproval(workspaceId: string, approvalId: string, decision: AutomationApprovalDecision, _note: string | null, _decisionKey: string): Promise<AutomationApprovalResult> {
    if (workspaceId !== W || approvalId !== APPROVAL) throw new Error('preview approval boundary');
    const runStatus = decision === 'approved' ? 'succeeded' as const : 'skipped' as const;
    context = Object.freeze({
      ...context,
      pendingApprovals: Object.freeze(context.pendingApprovals.filter((item) => item.id !== approvalId)),
      recentRuns: Object.freeze(context.recentRuns.map((run) => run.id === APPROVAL_RUN ? Object.freeze({ ...run, status: runStatus, finishedAt: NOW, result: Object.freeze({ decision }) }) : run)),
    });
    return Object.freeze({ approvalId, decision, runId: APPROVAL_RUN, runStatus, wasDuplicate: false });
  },
});

const dataFactory = Object.freeze({
  async resolveWorkspaceId(userId: string) { return userId === U ? W : null; },
  forWorkspace() { throw new Error('Phase 8.2 isolated preview never opens repositories'); },
}) as unknown as EnjazDataLayerFactory;

function PreviewApp() {
  return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="automation" dir="rtl"><main id="r2-main" className="r2-main"><DataLayerProvider factory={dataFactory}><AutomationCommandProvider gateway={gateway}><CurrentUserIdProvider userId={U}><LiveAutomationExperience mode="preview" /></CurrentUserIdProvider></AutomationCommandProvider></DataLayerProvider></main></div>;
}

const root = document.getElementById('phase82-automation-root');
if (!root) throw new Error('Phase 8.2 preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);
