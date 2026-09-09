import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import type { AutomationCommandGateway, AutomationEngineContext } from '../src/features/automation/automationCommands.ts';
import { createCommandCenterOrchestrator } from '../src/features/command/commandCenter.ts';
import type { FieldOperationsCommandGateway, FieldOperationsContext } from '../src/features/field-operations/fieldOperationsCommands.ts';
import type { FinanceCommandGateway, FinancePaymentContext } from '../src/features/finance/financeCommands.ts';
import type { GovernmentProcedureRuntimeGateway, TransactionWorkflowContext } from '../src/features/workflow/governmentProcedureRuntime.ts';

const W='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333',T='44444444-4444-4444-8444-444444444444',B='55555555-5555-4555-8555-555555555555',F='66666666-6666-4666-8666-666666666666',M1='77777777-7777-4777-8777-777777777777',M2='88888888-8888-4888-8888-888888888888',A='99999999-9999-4999-8999-999999999999',I='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const transaction=():RowOf<'transactions'>=>({id:T,workspace_id:W,company_id:C,primary_contact_id:null,type:'تسجيل شركة',department:'الشركات',status:'stalled',priority:'urgent',current_fee:1000,created_at:'2026-09-01T08:00:00.000Z',updated_at:'2026-09-09T08:00:00.000Z',last_activity_at:'2026-09-09T08:00:00.000Z',completed_at:null,archived_at:null,deleted_at:null,deleted_by:null,deletion_reason:null,legacy_id:null,legacy_source:null});
const blocker=():RowOf<'transaction_blockers'>=>({id:B,workspace_id:W,transaction_id:T,title:'تعطل لدى الجهة',severity:'critical',note:'تحتاج تصعيدًا',status:'open',opened_at:'2026-09-09T08:00:00.000Z',resolved_at:null});
const company=():RowOf<'companies'>=>({id:C,workspace_id:W,legal_name:'شركة الاختبار',display_name:'شركة الاختبار',capital:null,address:null,activities:null,registration_number:null,legal_status:null,primary_contact_id:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-09-01T08:00:00.000Z',updated_at:'2026-09-09T08:00:00.000Z',deleted_at:null,deleted_by:null,deletion_reason:null});

function page<T>(items:readonly T[]){return Promise.resolve({items,hasMore:false,total:items.length});}
function factory():EnjazDataLayerFactory{
  const layer={
    transactions:{list:()=>page([transaction()])},
    followups:{list:()=>page([])},
    blockers:{list:()=>page([blocker()])},
    payments:{list:()=>page([])},
    companies:{getById:async()=>company()},
  } as unknown as EnjazWorkspaceDataLayer;
  return {async resolveWorkspaceId(userId){return userId===U?W:null},forWorkspace(workspaceId){assert.equal(workspaceId,W);return layer}};
}

const financeContext:FinancePaymentContext={cashboxes:Object.freeze([]),engagements:Object.freeze([]),recentReceipts:Object.freeze([]),reconciliation:{postedTotalCents:0n,reversedTotalCents:0n,statusWithoutReversal:0,reversalWithoutStatus:0,shadowLedgerEntries:0,integrityWarnings:0,moneyAuthority:'payments_plus_non_payment_ledger'}};
const automationContext:AutomationEngineContext={authority:'automation_rules_and_runs',workflowWriteAuthority:'existing_workflow_rpc_only_after_human_approval',financeWriteAuthority:'none',rules:Object.freeze([]),recentRuns:Object.freeze([]),pendingApprovals:Object.freeze([{id:A,runId:A,ruleId:A,requestedAt:'2026-09-09T08:00:00.000Z',actionSnapshot:Object.freeze({type:'workflow_transition'})}])};
const fieldContext:FieldOperationsContext={authority:'field_assignments_visits_evidence_receipts',transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',automationWriteAuthority:'existing_automation_rpc_only',financeWriteAuthority:'none',locationPolicy:'optional',metrics:{activeTransactions:1,stalledTransactions:1,highCriticalBlockers:1,pendingAutomationApprovals:1,queuedAssignments:1,activeVisits:0},members:Object.freeze([{userId:M1,displayName:'مالك أول'},{userId:M2,displayName:'مالك ثان'}]),assignments:Object.freeze([{id:F,transactionId:T,transactionType:'تسجيل شركة',transactionStatus:'stalled',companyName:'شركة الاختبار',assignedUserId:M1,assignedUserName:'مالك أول',scheduledFor:'2026-09-09',destinationLabel:'مسجل الشركات',department:'الشركات',priority:'urgent',status:'queued',version:2,openBlockers:1,nextRequiredAction:'مراجعة'}]),visits:Object.freeze([])};
const workflowContext:TransactionWorkflowContext={authority:'canonical_workflow_instance',transactionId:T,instance:{instanceId:I,procedureId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',branchId:null,currentStagePosition:2,status:'active',startedAt:'2026-09-01T08:00:00.000Z',completedAt:null,templateSnapshot:Object.freeze({}),pendingRequiredCount:0,stageStates:Object.freeze([]),itemStates:Object.freeze([]),allowedTransitions:Object.freeze([{key:'advance_review',label:'اعتماد الانتقال',kind:'advance',fromStagePosition:2,toStagePosition:3,requiresReason:true}])}};

function dependencies(log:string[]=[]){
  const finance:FinanceCommandGateway={loadContext:async()=>financeContext,postPayment:async()=>{throw new Error('forbidden')},reversePayment:async()=>{throw new Error('forbidden')},getReceipt:async()=>{throw new Error('unused')},createCashbox:async()=>{throw new Error('forbidden')},createEngagement:async()=>{throw new Error('forbidden')}};
  const automation:AutomationCommandGateway={loadContext:async()=>automationContext,upsertRule:async()=>{throw new Error('unused')},setRuleEnabled:async()=>{throw new Error('unused')},dispatch:async()=>{throw new Error('unused')},async decideApproval(workspaceId,approvalId,decision,note,decisionKey){log.push(`automation:${workspaceId}:${approvalId}:${decision}:${note}:${decisionKey}`);return{approvalId,decision,runId:A,runStatus:'succeeded',wasDuplicate:false}}};
  const field:FieldOperationsCommandGateway={loadContext:async()=>fieldContext,setLocationPolicy:async()=>{throw new Error('unused')},upsertAssignment:async()=>{throw new Error('unused')},async reassign(workspaceId,assignmentId,expectedVersion,assignedUserId,reason,clientOperationId){log.push(`field:${workspaceId}:${assignmentId}:${expectedVersion}:${assignedUserId}:${reason}:${clientOperationId}`);return{wasDuplicate:false}},checkIn:async()=>{throw new Error('unused')},checkOut:async()=>{throw new Error('unused')},addEvidence:async()=>{throw new Error('unused')},handoff:async()=>{throw new Error('unused')}};
  const workflow:GovernmentProcedureRuntimeGateway={loadCatalog:async()=>{throw new Error('unused')},startProcedure:async()=>{throw new Error('unused')},async transition(input){log.push(`workflow:${input.workspaceId}:${input.instanceId}:${input.transitionKey}:${input.expectedStagePosition}:${input.reason}:${input.idempotencyKey}`);return{instanceId:input.instanceId,transitionEventId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',transitionKey:input.transitionKey,eventKind:'advance',fromStagePosition:input.expectedStagePosition,toStagePosition:input.expectedStagePosition+1,currentStagePosition:input.expectedStagePosition+1,status:'active',wasDuplicate:false}},loadTransactionContext:async()=>workflowContext};
  return {dataFactory:factory(),finance,workflow,automation,field};
}

test('Phase 8.6 loads one fail-closed executive snapshot without inventing command or finance write authority',async()=>{
  const center=createCommandCenterOrchestrator(dependencies());
  const result=await center.load(U);
  assert.equal(result.workspaceId,W);
  assert.equal(result.authority,'delegated_existing_domain_gateways_only');
  assert.equal(result.commandWriteAuthority,'none');
  assert.equal(result.financeWriteAuthority,'none');
  assert.equal(result.home.criticalBlockers,1);
  assert.equal(result.automation.pendingApprovals.length,1);
  assert.equal(result.field.assignments.length,1);
  assert.equal(result.workflowDecisions.length,1);
  assert.equal(result.workflowDecisions[0]?.instanceId,I);
  assert.equal(result.workflowDecisions[0]?.allowedTransitions[0]?.key,'advance_review');
});

test('automation approval is delegated to the existing automation gateway with a caller decision key',async()=>{
  const log:string[]=[];const center=createCommandCenterOrchestrator(dependencies(log));
  await center.decideAutomationApproval({workspaceId:W,approvalId:A,decision:'approved',note:'اعتماد إداري',decisionKey:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'});
  assert.deepEqual(log,[`automation:${W}:${A}:approved:اعتماد إداري:dddddddd-dddd-4ddd-8ddd-dddddddddddd`]);
});

test('workflow transition preserves expected-stage and idempotency guards instead of mutating transaction state',async()=>{
  const log:string[]=[];const center=createCommandCenterOrchestrator(dependencies(log));
  await center.transitionWorkflow({workspaceId:W,instanceId:I,transitionKey:'advance_review',expectedStagePosition:2,reason:'مراجعة الإدارة',idempotencyKey:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'});
  assert.deepEqual(log,[`workflow:${W}:${I}:advance_review:2:مراجعة الإدارة:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`]);
});

test('field reassignment preserves version, reason and client operation id through the field gateway',async()=>{
  const log:string[]=[];const center=createCommandCenterOrchestrator(dependencies(log));
  await center.reassignField({workspaceId:W,assignmentId:F,expectedVersion:2,assignedUserId:M2,reason:'توازن عبء العمل',clientOperationId:'ffffffff-ffff-4fff-8fff-ffffffffffff'});
  assert.deepEqual(log,[`field:${W}:${F}:2:${M2}:توازن عبء العمل:ffffffff-ffff-4fff-8fff-ffffffffffff`]);
});

test('command center fails closed when one authoritative domain cannot be read',async()=>{
  const deps=dependencies();
  const broken={...deps,finance:{...deps.finance,loadContext:async()=>{throw new Error('finance unavailable')}}};
  await assert.rejects(()=>createCommandCenterOrchestrator(broken).load(U),/finance unavailable/);
});

test('command orchestrator rejects invalid executive mutation inputs before delegation',async()=>{
  const center=createCommandCenterOrchestrator(dependencies());
  assert.throws(()=>center.transitionWorkflow({workspaceId:W,instanceId:I,transitionKey:'advance_review',expectedStagePosition:0,reason:null,idempotencyKey:'x'}),/INVALID_EXPECTED_STAGE/);
  assert.throws(()=>center.reassignField({workspaceId:W,assignmentId:F,expectedVersion:2,assignedUserId:M2,reason:'x',clientOperationId:'z'}),/INVALID_REASSIGNMENT_REASON/);
});
