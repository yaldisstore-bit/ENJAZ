import test from 'node:test';
import assert from 'node:assert/strict';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createGovernmentProcedureRuntimeGateway } from '../src/features/workflow/governmentProcedureRuntime.ts';
import { createAutomationCommandGateway } from '../src/features/automation/automationCommands.ts';
import { createFieldOfflineQueue, syncFieldOfflineQueue } from '../src/features/field-operations/fieldOperationsOfflineQueue.ts';
import { createCrmIntakeGateway } from '../src/features/crm-intake/crmIntakeCommands.ts';
import { createOrganizationGateway } from '../src/features/organization/organizationCommands.ts';

const W='11111111-1111-4111-8111-111111111111';
const A='22222222-2222-4222-8222-222222222222';
const B='33333333-3333-4333-8333-333333333333';
const C='44444444-4444-4444-8444-444444444444';
const D='55555555-5555-4555-8555-555555555555';
const E='66666666-6666-4666-8666-666666666666';
const F='77777777-7777-4777-8777-777777777777';
const TOKEN='a'.repeat(64);

class MemoryStorage {
  readonly rows = new Map<string,string>();
  getItem(key:string){return this.rows.get(key)??null;}
  setItem(key:string,value:string){this.rows.set(key,value);}
  removeItem(key:string){this.rows.delete(key);}
}

function okClient(handler:(name:string,args:Readonly<Record<string,unknown>>)=>unknown){
  return {rpc(name:string,args:Readonly<Record<string,unknown>>){return Promise.resolve({data:handler(name,args),error:null});}} as never;
}
function errorClient(error:Readonly<Record<string,unknown>>){
  return {rpc(){return Promise.resolve({data:null,error});}} as never;
}

test('8.7 M5 corruption guard: unknown offline operation kind is never replayed or silently deleted',async()=>{
  const storage=new MemoryStorage();
  const key=`enjaz.field-operations.offline.v1.${W}`;
  const corrupt={operation:{kind:'unknown_future_operation',operationId:A,workspaceId:W,queuedAt:'2026-09-09T10:00:00Z'},state:'pending',attempts:0,lastError:null};
  storage.setItem(key,JSON.stringify([corrupt]));
  const queue=createFieldOfflineQueue(storage);
  let gatewayCalls=0;
  const gateway=new Proxy({}, {get(){return async()=>{gatewayCalls+=1;};}}) as never;
  const result=await syncFieldOfflineQueue(queue,gateway,W);
  assert.equal(gatewayCalls,0);
  assert.equal(result.synced,0);
  assert.equal(result.remaining,0);
  assert.match(storage.getItem(key)??'',/unknown_future_operation/);
});

test('8.7 M1 repeated transition preserves one idempotency key and accepts explicit duplicate evidence only',async()=>{
  const calls:Readonly<Record<string,unknown>>[]=[];
  let attempt=0;
  const gateway=createGovernmentProcedureRuntimeGateway(okClient((name,args)=>{
    assert.equal(name,'transition_workflow_v1');
    calls.push({...args});
    attempt+=1;
    return {instanceId:A,transitionEventId:B,transitionKey:'advance_review',eventKind:'advance',fromStagePosition:1,toStagePosition:2,currentStagePosition:2,status:'active',wasDuplicate:attempt>1};
  }));
  const input={workspaceId:W,instanceId:A,transitionKey:'advance_review',expectedStagePosition:1,reason:null,idempotencyKey:C};
  const first=await gateway.transition(input);
  const replay=await gateway.transition(input);
  assert.equal(first.wasDuplicate,false);
  assert.equal(replay.wasDuplicate,true);
  assert.deepEqual(calls[0],calls[1]);
  assert.equal(calls[0]?.p_expected_stage_position,1);
  assert.equal(calls[0]?.p_idempotency_key,C);
});

test('8.7 M1 stale transition fails closed as conflict and does not synthesize a new stage',async()=>{
  const gateway=createGovernmentProcedureRuntimeGateway(errorClient({code:'P0001',message:'ENJAZ_WORKFLOW_STALE',details:'expected stage mismatch',hint:null}));
  await assert.rejects(()=>gateway.transition({workspaceId:W,instanceId:A,transitionKey:'advance_review',expectedStagePosition:1,reason:null,idempotencyKey:C}),(error:unknown)=>error instanceof DataAccessError);
});

test('8.7 M1 large history remains canonical and does not truncate current state',async()=>{
  const stages=Array.from({length:600},(_,i)=>({position:i+1,status:i===599?'active':'completed',startedAt:'2026-09-09T10:00:00Z',completedAt:i===599?null:'2026-09-09T10:01:00Z',overrideUsed:false,overrideReason:null}));
  const items=Array.from({length:1200},(_,i)=>({id:`${(i+1).toString(16).padStart(8,'0').slice(-8)}-1111-4111-8111-${(i+1).toString(16).padStart(12,'0').slice(-12)}`,templateItemKey:`item_${i}`,stagePosition:(i%600)+1,status:'done',required:true,itemType:'check',title:`متطلب ${i}`,note:null,completedAt:'2026-09-09T10:01:00Z'}));
  const payload={authority:'canonical_workflow_instance',transactionId:B,instance:{instanceId:A,procedureId:C,branchId:null,currentStagePosition:600,status:'active',startedAt:'2026-09-09T10:00:00Z',completedAt:null,templateSnapshot:{version:1},pendingRequiredCount:0,stageStates:stages,itemStates:items,allowedTransitions:[{key:'complete_case',label:'إكمال',kind:'complete',fromStagePosition:600,toStagePosition:null,requiresReason:false}]}};
  const context=await createGovernmentProcedureRuntimeGateway(okClient(()=>payload)).loadTransactionContext(W,B);
  assert.equal(context.instance?.stageStates.length,600);
  assert.equal(context.instance?.itemStates.length,1200);
  assert.equal(context.instance?.currentStagePosition,600);
  assert.equal(context.instance?.allowedTransitions[0]?.fromStagePosition,600);
});

test('8.7 automation failure isolation: one failed dispatch cannot poison the next independent rule execution',async()=>{
  let calls=0;
  const client={rpc(name:string){
    assert.equal(name,'dispatch_automation_v1');
    calls+=1;
    if(calls===1)return Promise.resolve({data:null,error:{code:'P0001',message:'ENJAZ_AUTOMATION_ACTION_FAILED',details:null,hint:null}});
    return Promise.resolve({data:{runId:D,status:'succeeded',result:{approvalRequired:false},wasDuplicate:false},error:null});
  }} as never;
  const gateway=createAutomationCommandGateway(client);
  await assert.rejects(()=>gateway.dispatch(W,A,'transaction.updated',{transactionId:B},'receipt-failed-001'),(error:unknown)=>error instanceof DataAccessError);
  const second=await gateway.dispatch(W,C,'transaction.updated',{transactionId:B},'receipt-independent-002');
  assert.equal(second.status,'succeeded');
  assert.equal(calls,2);
});

test('8.7 M17 abuse boundary: oversized public payload is rejected before any public RPC',async()=>{
  let calls=0;
  const gateway=createCrmIntakeGateway(okClient(()=>{calls+=1;return {}; }));
  await assert.rejects(()=>gateway.savePublicIntake(TOKEN,{notes:'x'.repeat(100_000)},[],false),(error:unknown)=>error instanceof DataAccessError);
  assert.equal(calls,0);
});

test('8.7 M6 replayed conversion keeps guarded conversion RPC as the only core-write surface',async()=>{
  const calls:string[]=[];
  const gateway=createCrmIntakeGateway(okClient((name)=>{calls.push(name);return {leadId:A,companyId:B,contactId:null,transactionId:C,wasDuplicate:calls.length>1};}));
  const input={workspaceId:W,leadId:A,reuseCompanyId:B,transactionType:'تسجيل شركة',department:'مسجل الشركات'};
  const first=await gateway.convertLead(input);
  const replay=await gateway.convertLead(input);
  assert.equal(first.wasDuplicate,false);
  assert.equal(replay.wasDuplicate,true);
  assert.deepEqual(calls,['convert_crm_lead_v1','convert_crm_lead_v1']);
});

test('8.7 M15 source-less inherited workforce permission still fails closed under conflict pressure',async()=>{
  const gateway=createOrganizationGateway(okClient((name)=>{
    assert.equal(name,'explain_organization_access_v1');
    return {allowed:true,actorType:'workforce',source:'explicit_or_downward_inherited',sourceMembershipId:null,sourceScopeType:'branch',sourceRole:'manager',sourceBranchId:D,sourceDepartmentId:null,sourceTeamId:null};
  }));
  await assert.rejects(()=>gateway.explainAccess(W,{scopeType:'team',branchId:null,departmentId:null,teamId:E}),(error:unknown)=>error instanceof DataAccessError);
});

test('8.7 M15 stale ownership transfer propagates conflict instead of falling back to lifecycle mutation',async()=>{
  const names:string[]=[];
  const client={rpc(name:string){names.push(name);return Promise.resolve({data:null,error:{code:'P0001',message:'ENJAZ_ORG_OWNERSHIP_STALE',details:null,hint:null}});}} as never;
  const gateway=createOrganizationGateway(client);
  await assert.rejects(()=>gateway.assignTransaction({workspaceId:W,transactionId:A,expectedVersion:1,target:{scopeType:'team',branchId:null,departmentId:null,teamId:F},reason:'نقل متعارض إلى فريق آخر'}),(error:unknown)=>error instanceof DataAccessError);
  assert.deepEqual(names,['assign_transaction_organization_v1']);
});
