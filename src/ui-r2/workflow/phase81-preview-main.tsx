import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GovernmentProcedureCatalog, GovernmentProcedureTransition } from '../../features/workflow/governmentProcedureCommands.ts';
import type { GovernmentProcedureWorkflowController } from '../../features/workflow/useGovernmentProcedureWorkflow.ts';
import type { TransactionWorkflowContext, WorkflowItemRuntimeState, WorkflowStageRuntimeState } from '../../features/workflow/governmentProcedureRuntime.ts';
import { GovernmentProcedurePanelView } from './GovernmentProcedurePanel.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import '../golden/golden.css';
import '../core-work/core-work.css';
import './workflow.css';

const W = '11111111-1111-4111-8111-111111111111';
const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const P = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const TEMPLATE = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const INSTANCE = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
const REQUIRED = '99999999-9999-4999-8999-999999999991';
const OPTIONAL = '99999999-9999-4999-8999-999999999992';

const transition12: GovernmentProcedureTransition = Object.freeze({ key: 'submit_review', label: 'إرسال إلى التدقيق', kind: 'advance', fromStagePosition: 1, toStagePosition: 2, requiresReason: false });
const transition23: GovernmentProcedureTransition = Object.freeze({ key: 'approve_review', label: 'إرسال للمصادقة', kind: 'advance', fromStagePosition: 2, toStagePosition: 3, requiresReason: false });
const transitionDone: GovernmentProcedureTransition = Object.freeze({ key: 'complete_procedure', label: 'إكمال الإجراء', kind: 'complete', fromStagePosition: 3, toStagePosition: null, requiresReason: false });
const transitionReopen: GovernmentProcedureTransition = Object.freeze({ key: 'reopen_final', label: 'إعادة فتح المصادقة', kind: 'reopen', fromStagePosition: 3, toStagePosition: 3, requiresReason: true });

const catalog: GovernmentProcedureCatalog = Object.freeze({
  authority: 'workflow_plus_government_catalog',
  moneyAuthority: 'reference_fees_only_no_finance_write',
  entities: Object.freeze([{ id: E, name: 'هيئة الاختبار الحكومية', shortName: 'هيئة الاختبار', entityType: 'commission' as const, active: true }]),
  branches: Object.freeze([{ id: B, entityId: E, name: 'فرع بغداد المركزي', address: 'بغداد', jurisdiction: 'بغداد', active: true }]),
  procedures: Object.freeze([{
    id: P,
    code: 'TEST-REG-01',
    name: 'تسجيل معاملة حكومية تجريبية',
    description: 'Preview deterministic for Phase 8.1 Chromium gates.',
    governmentEntityId: E,
    workflowTemplateId: TEMPLATE,
    active: true,
    branchIds: Object.freeze([B]),
    prerequisiteProcedureIds: Object.freeze([]),
    stages: Object.freeze([
      { position: 1, name: 'تقديم الطلب', description: 'تثبيت الطلب الأولي', dueOffsetDays: 2, governmentEntityId: E, governmentBranchId: B, officialFeeCents: 250000n, feeCurrency: 'IQD', items: Object.freeze([{ key: 'application_form', position: 1, itemType: 'document' as const, title: 'استمارة الطلب الأصلية', required: true, config: Object.freeze({}) }, { key: 'contact_copy', position: 2, itemType: 'document' as const, title: 'نسخة جهة الاتصال', required: false, config: Object.freeze({}) }]) },
      { position: 2, name: 'التدقيق', description: 'تدقيق البيانات', dueOffsetDays: 3, governmentEntityId: E, governmentBranchId: B, officialFeeCents: null, feeCurrency: null, items: Object.freeze([]) },
      { position: 3, name: 'المصادقة', description: 'المصادقة النهائية', dueOffsetDays: 1, governmentEntityId: E, governmentBranchId: B, officialFeeCents: 100000n, feeCurrency: 'IQD', items: Object.freeze([]) },
    ]),
    transitions: Object.freeze([transition12, transition23, transitionDone, transitionReopen]),
  }]),
});

type PreviewState = Readonly<{ started: boolean; stage: 1 | 2 | 3; completed: boolean; requiredDone: boolean; actionMessage: string | null }>;

function stageStates(state: PreviewState): readonly WorkflowStageRuntimeState[] {
  return Object.freeze(([1, 2, 3] as const).map((position) => Object.freeze({
    position,
    status: state.completed && position === 3 ? 'completed' : position < state.stage ? 'completed' : position === state.stage ? 'active' : 'pending',
    startedAt: position <= state.stage ? `2026-09-0${position}T09:00:00.000Z` : null,
    completedAt: position < state.stage || (state.completed && position === 3) ? `2026-09-0${position + 1}T09:00:00.000Z` : null,
    overrideUsed: false,
    overrideReason: null,
  } satisfies WorkflowStageRuntimeState)));
}

function itemStates(state: PreviewState): readonly WorkflowItemRuntimeState[] {
  if (!state.started) return Object.freeze([]);
  return Object.freeze([
    Object.freeze({ id: REQUIRED, templateItemKey: 'application_form', stagePosition: 1, status: state.requiredDone ? 'done' : 'pending', required: true, itemType: 'document', title: 'استمارة الطلب الأصلية', note: null, completedAt: state.requiredDone ? '2026-09-07T09:10:00.000Z' : null }),
    Object.freeze({ id: OPTIONAL, templateItemKey: 'contact_copy', stagePosition: 1, status: 'done', required: false, itemType: 'document', title: 'نسخة جهة الاتصال', note: null, completedAt: '2026-09-07T09:05:00.000Z' }),
  ]);
}

function allowedTransitions(state: PreviewState): readonly GovernmentProcedureTransition[] {
  if (!state.started) return Object.freeze([]);
  if (state.completed) return Object.freeze([transitionReopen]);
  if (state.stage === 1) return Object.freeze([transition12]);
  if (state.stage === 2) return Object.freeze([transition23]);
  return Object.freeze([transitionDone]);
}

function contextFor(state: PreviewState): TransactionWorkflowContext {
  if (!state.started) return Object.freeze({ authority: 'canonical_workflow_instance', transactionId: T, instance: null });
  return Object.freeze({
    authority: 'canonical_workflow_instance',
    transactionId: T,
    instance: Object.freeze({
      instanceId: INSTANCE,
      procedureId: P,
      branchId: B,
      currentStagePosition: state.stage,
      status: state.completed ? 'completed' : 'active',
      startedAt: '2026-09-07T09:00:00.000Z',
      completedAt: state.completed ? '2026-09-07T12:00:00.000Z' : null,
      templateSnapshot: Object.freeze({ authority: 'phase81-preview' }),
      pendingRequiredCount: state.stage === 1 && !state.requiredDone ? 1 : 0,
      stageStates: stageStates(state),
      itemStates: itemStates(state),
      allowedTransitions: allowedTransitions(state),
    }),
  });
}

function PreviewApp() {
  const initialEmpty = new URLSearchParams(window.location.search).get('mode') === 'empty';
  const [state, setState] = useState<PreviewState>(() => Object.freeze({ started: !initialEmpty, stage: 1, completed: false, requiredDone: false, actionMessage: null }));
  const controller = useMemo<GovernmentProcedureWorkflowController>(() => Object.freeze({
    status: 'ready' as const,
    workspaceId: W,
    catalog,
    context: contextFor(state),
    errorMessage: null,
    actionMessage: state.actionMessage,
    retry() {},
    async startProcedure() {
      setState(Object.freeze({ started: true, stage: 1, completed: false, requiredDone: false, actionMessage: 'تم بدء الإجراء الحكومي وتثبيت Snapshot المراحل والمتطلبات.' }));
      return true;
    },
    async completeRequirement(itemStateId: string) {
      if (itemStateId !== REQUIRED) return false;
      setState((current) => Object.freeze({ ...current, requiredDone: true, actionMessage: 'تم تثبيت إنجاز المتطلب في حالة الـWorkflow الكانونية.' }));
      return true;
    },
    async transition(transition: GovernmentProcedureTransition) {
      setState((current) => {
        if (transition.kind === 'reopen') return Object.freeze({ ...current, completed: false, actionMessage: 'تمت إعادة فتح المرحلة مع حفظ السبب في السجل.' });
        if (transition.kind === 'complete') return Object.freeze({ ...current, completed: true, actionMessage: 'تم إكمال الإجراء وتثبيت الحدث في سجل الانتقالات.' });
        const nextStage = transition.toStagePosition === 2 ? 2 : transition.toStagePosition === 3 ? 3 : current.stage;
        return Object.freeze({ ...current, stage: nextStage, actionMessage: 'تم الانتقال إلى المرحلة التالية وتحديث السياق من المصدر الموثوق.' });
      });
      return true;
    },
  }), [state]);

  return <div className="r2-shell" data-r2-runtime-mode="phase81-preview" dir="rtl"><main id="r2-main" className="r2-main"><div className="r2-screen"><GovernmentProcedurePanelView controller={controller} transactionId={T} /></div></main></div>;
}

const root = document.getElementById('phase81-workflow-root');
if (!root) throw new Error('Phase 8.1 workflow preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);