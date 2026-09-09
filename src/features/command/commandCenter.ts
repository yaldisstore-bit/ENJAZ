import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { AutomationApprovalDecision, AutomationCommandGateway, AutomationEngineContext } from '../automation/automationCommands.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../field-operations/fieldOperationsCommands.ts';
import type { FinanceCommandGateway, FinancePaymentContext } from '../finance/financeCommands.ts';
import { loadHomeDashboard } from '../home/homeDashboardService.ts';
import type { HomeDashboardSnapshot, HomePriorityLevel } from '../home/homeDashboardModel.ts';
import type { GovernmentProcedureTransition, WorkflowTransitionResult } from '../workflow/governmentProcedureCommands.ts';
import type { GovernmentProcedureRuntimeGateway } from '../workflow/governmentProcedureRuntime.ts';

export interface CommandWorkflowDecision {
  readonly transactionId:string; readonly title:string; readonly companyLabel:string|null; readonly level:HomePriorityLevel;
  readonly instanceId:string; readonly currentStagePosition:number; readonly pendingRequiredCount:number;
  readonly allowedTransitions:readonly GovernmentProcedureTransition[];
}
export interface CommandCenterSnapshot {
  readonly authority:'delegated_existing_domain_gateways_only'; readonly commandWriteAuthority:'none'; readonly financeWriteAuthority:'none';
  readonly workspaceId:string; readonly loadedAt:string; readonly home:HomeDashboardSnapshot; readonly finance:FinancePaymentContext;
  readonly automation:AutomationEngineContext; readonly field:FieldOperationsContext; readonly workflowDecisions:readonly CommandWorkflowDecision[];
}
export interface CommandCenterDependencies { readonly dataFactory:EnjazDataLayerFactory; readonly finance:FinanceCommandGateway; readonly workflow:GovernmentProcedureRuntimeGateway; readonly automation:AutomationCommandGateway; readonly field:FieldOperationsCommandGateway }
export interface DecideAutomationApprovalInput { readonly workspaceId:string; readonly approvalId:string; readonly decision:AutomationApprovalDecision; readonly note:string|null; readonly decisionKey:string }
export interface TransitionCommandWorkflowInput { readonly workspaceId:string; readonly instanceId:string; readonly transitionKey:string; readonly expectedStagePosition:number; readonly reason:string|null; readonly idempotencyKey:string }
export interface ReassignCommandFieldInput { readonly workspaceId:string; readonly assignmentId:string; readonly expectedVersion:number; readonly assignedUserId:string; readonly reason:string; readonly clientOperationId:string }
export interface CommandCenterOrchestrator {
  load(userId:string):Promise<CommandCenterSnapshot>;
  decideAutomationApproval(input:DecideAutomationApprovalInput):ReturnType<AutomationCommandGateway['decideApproval']>;
  transitionWorkflow(input:TransitionCommandWorkflowInput):Promise<WorkflowTransitionResult>;
  reassignField(input:ReassignCommandFieldInput):ReturnType<FieldOperationsCommandGateway['reassign']>;
}

export function createCommandCenterOrchestrator({dataFactory,finance,workflow,automation,field}:CommandCenterDependencies):CommandCenterOrchestrator{
  return Object.freeze({
    async load(userId:string){
      const home=await loadHomeDashboard(dataFactory,userId),workspaceId=home.workspaceId;
      const [financeState,automationState,fieldState]=await Promise.all([finance.loadContext(workspaceId),automation.loadContext(workspaceId),field.loadContext(workspaceId)]);
      const decisions=(await Promise.all(home.snapshot.priorities.map(async p=>{
        const instance=(await workflow.loadTransactionContext(workspaceId,p.transactionId)).instance;
        return !instance||instance.status==='removed'?null:Object.freeze({transactionId:p.transactionId,title:p.title,companyLabel:p.companyLabel??null,level:p.level,instanceId:instance.instanceId,currentStagePosition:instance.currentStagePosition,pendingRequiredCount:instance.pendingRequiredCount,allowedTransitions:instance.allowedTransitions});
      }))).filter((x):x is CommandWorkflowDecision=>x!==null);
      return Object.freeze({authority:'delegated_existing_domain_gateways_only',commandWriteAuthority:'none',financeWriteAuthority:'none',workspaceId,loadedAt:new Date().toISOString(),home:home.snapshot,finance:financeState,automation:automationState,field:fieldState,workflowDecisions:Object.freeze(decisions)});
    },
    decideAutomationApproval:(x:DecideAutomationApprovalInput)=>automation.decideApproval(x.workspaceId,x.approvalId,x.decision,x.note?.trim()||null,x.decisionKey),
    transitionWorkflow:(x:TransitionCommandWorkflowInput)=>workflow.transition(x),
    reassignField:(x:ReassignCommandFieldInput)=>field.reassign(x.workspaceId,x.assignmentId,x.expectedVersion,x.assignedUserId,x.reason,x.clientOperationId),
  });
}
