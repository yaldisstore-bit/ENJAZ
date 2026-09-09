import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { AutomationApprovalDecision, AutomationCommandGateway, AutomationEngineContext } from '../automation/automationCommands.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import type { FinanceCommandGateway, FinancePaymentContext } from '../finance/financeCommands.ts';
import { loadHomeDashboard } from '../home/homeDashboardService.ts';
import type { HomeDashboardSnapshot, HomePriorityLevel } from '../home/homeDashboardModel.ts';
import type { GovernmentProcedureRuntimeGateway } from '../workflow/governmentProcedureRuntime.ts';
import type { WorkflowTransitionResult } from '../workflow/governmentProcedureCommands.ts';

export type CommandCenterDomain = 'operations' | 'workflow' | 'automation' | 'finance';

export interface CommandWorkflowDecision {
  readonly transactionId: string;
  readonly title: string;
  readonly companyLabel: string | null;
  readonly level: HomePriorityLevel;
  readonly instanceId: string;
  readonly currentStagePosition: number;
  readonly pendingRequiredCount: number;
  readonly allowedTransitions: readonly Readonly<{
    key: string;
    label: string;
    kind: 'advance' | 'complete' | 'reopen';
    requiresReason: boolean;
  }>[];
}

export interface CommandCenterSnapshot {
  readonly authority: 'delegated_existing_domain_gateways_only';
  readonly commandWriteAuthority: 'none';
  readonly financeWriteAuthority: 'none';
  readonly workspaceId: string;
  readonly loadedAt: string;
  readonly home: HomeDashboardSnapshot;
  readonly finance: FinancePaymentContext;
  readonly automation: AutomationEngineContext;
  readonly field: FieldOperationsContext;
  readonly workflowDecisions: readonly CommandWorkflowDecision[];
}

export interface CommandCenterDependencies {
  readonly dataFactory: EnjazDataLayerFactory;
  readonly finance: FinanceCommandGateway;
  readonly workflow: GovernmentProcedureRuntimeGateway;
  readonly automation: AutomationCommandGateway;
  readonly field: FieldOperationsCommandGateway;
}

export interface DecideAutomationApprovalInput {
  readonly workspaceId: string;
  readonly approvalId: string;
  readonly decision: AutomationApprovalDecision;
  readonly note: string | null;
  readonly decisionKey: string;
}

export interface TransitionCommandWorkflowInput {
  readonly workspaceId: string;
  readonly instanceId: string;
  readonly transitionKey: string;
  readonly expectedStagePosition: number;
  readonly reason: string | null;
  readonly idempotencyKey: string;
}

export interface ReassignCommandFieldInput {
  readonly workspaceId: string;
  readonly assignmentId: string;
  readonly expectedVersion: number;
  readonly assignedUserId: string;
  readonly reason: string;
  readonly clientOperationId: string;
}

export interface CommandCenterOrchestrator {
  load(userId: string): Promise<CommandCenterSnapshot>;
  decideAutomationApproval(input: DecideAutomationApprovalInput): ReturnType<AutomationCommandGateway['decideApproval']>;
  transitionWorkflow(input: TransitionCommandWorkflowInput): Promise<WorkflowTransitionResult>;
  reassignField(input: ReassignCommandFieldInput): ReturnType<FieldOperationsCommandGateway['reassign']>;
}

function requiredText(value: string, label: string, min = 1, max = 1200): string {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new Error(`INVALID_${label.toUpperCase()}`);
  return normalized;
}

function optionalText(value: string | null, label: string, max = 1200): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > max) throw new Error(`INVALID_${label.toUpperCase()}`);
  return normalized;
}

export function createCommandCenterOrchestrator(dependencies: CommandCenterDependencies): CommandCenterOrchestrator {
  const { dataFactory, finance, workflow, automation, field } = dependencies;

  return Object.freeze({
    async load(userId: string) {
      const normalizedUserId = requiredText(userId, 'user_id', 1, 128);
      const homeResult = await loadHomeDashboard(dataFactory, normalizedUserId);
      const workspaceId = homeResult.workspaceId;
      const [financeContext, automationContext, fieldContext] = await Promise.all([
        finance.loadContext(workspaceId),
        automation.loadContext(workspaceId),
        field.loadContext(workspaceId),
      ]);

      const workflowDecisions = (await Promise.all(homeResult.snapshot.priorities.map(async (priority): Promise<CommandWorkflowDecision | null> => {
        const context = await workflow.loadTransactionContext(workspaceId, priority.transactionId);
        if (!context.instance || context.instance.status === 'removed') return null;
        return Object.freeze({
          transactionId: priority.transactionId,
          title: priority.title,
          companyLabel: priority.companyLabel ?? null,
          level: priority.level,
          instanceId: context.instance.instanceId,
          currentStagePosition: context.instance.currentStagePosition,
          pendingRequiredCount: context.instance.pendingRequiredCount,
          allowedTransitions: Object.freeze(context.instance.allowedTransitions.map((transition) => Object.freeze({
            key: transition.key,
            label: transition.label,
            kind: transition.kind,
            requiresReason: transition.requiresReason,
          }))),
        });
      }))).filter((item): item is CommandWorkflowDecision => item !== null);

      return Object.freeze({
        authority: 'delegated_existing_domain_gateways_only' as const,
        commandWriteAuthority: 'none' as const,
        financeWriteAuthority: 'none' as const,
        workspaceId,
        loadedAt: new Date().toISOString(),
        home: homeResult.snapshot,
        finance: financeContext,
        automation: automationContext,
        field: fieldContext,
        workflowDecisions: Object.freeze(workflowDecisions),
      });
    },

    decideAutomationApproval(input) {
      return automation.decideApproval(
        requiredText(input.workspaceId, 'workspace_id', 1, 64),
        requiredText(input.approvalId, 'approval_id', 1, 64),
        input.decision,
        optionalText(input.note, 'approval_note'),
        requiredText(input.decisionKey, 'decision_key', 1, 128),
      );
    },

    transitionWorkflow(input) {
      if (!Number.isSafeInteger(input.expectedStagePosition) || input.expectedStagePosition < 1) throw new Error('INVALID_EXPECTED_STAGE');
      return workflow.transition({
        workspaceId: requiredText(input.workspaceId, 'workspace_id', 1, 64),
        instanceId: requiredText(input.instanceId, 'instance_id', 1, 64),
        transitionKey: requiredText(input.transitionKey, 'transition_key', 1, 80),
        expectedStagePosition: input.expectedStagePosition,
        reason: optionalText(input.reason, 'transition_reason', 600),
        idempotencyKey: requiredText(input.idempotencyKey, 'idempotency_key', 1, 128),
      });
    },

    reassignField(input) {
      if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new Error('INVALID_ASSIGNMENT_VERSION');
      return field.reassign(
        requiredText(input.workspaceId, 'workspace_id', 1, 64),
        requiredText(input.assignmentId, 'assignment_id', 1, 64),
        input.expectedVersion,
        requiredText(input.assignedUserId, 'assigned_user_id', 1, 64),
        requiredText(input.reason, 'reassignment_reason', 3, 1200),
        requiredText(input.clientOperationId, 'client_operation_id', 1, 64),
      );
    },
  });
}
