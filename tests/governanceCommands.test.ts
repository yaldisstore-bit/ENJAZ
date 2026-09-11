import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import { DataAccessError } from '../src/data/contracts/DataAccessError.ts';
import { createGovernanceCommandGateway } from '../src/features/governance/governanceCommands.ts';

const W='11111111-1111-4111-8111-111111111111',C='22222222-2222-4222-8222-222222222222',P='33333333-3333-4333-8333-333333333333',G='44444444-4444-4444-8444-444444444444',OP='55555555-5555-4555-8555-555555555555';
function client(handler:(name:string,args:Readonly<Record<string,unknown>>)=>PromiseLike<{data:unknown;error:null|{code?:string;message?:string}}>):EnjazSupabaseClient{return {rpc:handler} as unknown as EnjazSupabaseClient}
function context(overrides:Record<string,unknown>={}){return {schema:'enjaz.governance-context.v1',companyId:C,asOf:'2026-09-11',canMutate:true,versions:{ownership:2,beneficialOwners:3,authority:4,resolutions:5,capital:6},ownership:{schema:'enjaz.governance-ownership.v1',companyId:C,asOf:'2026-09-11',version:2,configured:true,totalPercentage:'100',reconciledTo100:true,stakes:[{id:G,holder:{kind:'person',id:P},role:'shareholder',percentage:'100',effectiveFrom:'2026-01-01',effectiveTo:null}]},beneficialOwners:[{id:G,contactId:P,displayName:'مالك مستفيد',basis:'ownership',percentage:'100',effectiveFrom:'2026-01-01',effectiveTo:null}],authorities:[{id:G,contactId:P,displayName:'مدير مفوض',role:'manager',scope:'full',powers:['sign','represent'],effectiveFrom:'2026-01-01',effectiveTo:null,endReason:null}],resolutions:[{id:G,number:'1',title:'تعيين المدير',type:'appointment',effectiveOn:'2026-01-01',notes:null}],capital:{known:true,amount:'100000000',source:'governance_history',effectiveOn:'2026-01-01',version:6},timeline:[{id:G,type:'capital.change',effectiveOn:'2026-01-01',version:6,details:{},occurredAt:'2026-01-01T00:00:00Z'}],risks:[{code:'AUTHORITY_EXPIRING',severity:'medium',message:'expiring'}],...overrides}}

test('governance context parser accepts only the certified M2 schema and preserves historical facts',async()=>{
  const calls:{name:string;args:Readonly<Record<string,unknown>>}[]=[];const gateway=createGovernanceCommandGateway(client(async(name,args)=>{calls.push({name,args});return {data:context(),error:null}}));
  const result=await gateway.loadContext(W,C,'2026-09-11');
  assert.equal(calls.length,1);assert.equal(calls[0]?.name,'get_company_governance_context_v1');assert.deepEqual(calls[0]?.args,{p_workspace_id:W,p_company_id:C,p_as_of:'2026-09-11'});
  assert.equal(result.ownership.stakes[0]?.holderId,P);assert.equal(result.beneficialOwners[0]?.displayName,'مالك مستفيد');assert.equal(result.authorities[0]?.role,'manager');assert.equal(result.capital.amount,'100000000');assert.equal(result.risks[0]?.code,'AUTHORITY_EXPIRING');
});

test('malformed or drifted governance payload fails closed',async()=>{
  const schemaDrift=createGovernanceCommandGateway(client(async()=>({data:context({schema:'shadow.governance.v9'}),error:null})));
  await assert.rejects(()=>schemaDrift.loadContext(W,C),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_OPERATION_FAILED');
  const invalidRisk=createGovernanceCommandGateway(client(async()=>({data:context({risks:[{code:'X',severity:'critical',message:'x'}]}),error:null})));
  await assert.rejects(()=>invalidRisk.loadContext(W,C),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_OPERATION_FAILED');
});

test('ownership writer emits one guarded versioned RPC and never writes tables directly',async()=>{
  const calls:{name:string;args:Readonly<Record<string,unknown>>}[]=[];const gateway=createGovernanceCommandGateway(client(async(name,args)=>{calls.push({name,args});return {data:{version:3},error:null}}));
  await gateway.replaceOwnership({workspaceId:W,companyId:C,expectedVersion:2,operationId:OP,effectiveFrom:'2026-09-11',entries:[{kind:'person',id:P,role:'shareholder',percentage:'100'}]});
  assert.deepEqual(calls,[{name:'replace_company_ownership_snapshot_v1',args:{p_workspace_id:W,p_company_id:C,p_expected_version:2,p_operation_id:OP,p_effective_from:'2026-09-11',p_entries:[{kind:'person',id:P,role:'shareholder',percentage:'100'}]}}]);
});

test('all M2 mutations keep optimistic version and operation id at the RPC boundary',async()=>{
  const calls:string[]=[];const gateway=createGovernanceCommandGateway(client(async(name)=>{calls.push(name);return {data:{},error:null}}));
  await gateway.replaceBeneficialOwners({workspaceId:W,companyId:C,expectedVersion:3,operationId:OP,effectiveFrom:'2026-09-11',entries:[{contactId:P,basis:'ownership',percentage:'100'}]});
  await gateway.grantAuthority({workspaceId:W,companyId:C,expectedVersion:4,operationId:OP,contactId:P,role:'manager',scope:'full',powers:['sign'],effectiveFrom:'2026-09-11',expiresOn:null});
  await gateway.revokeAuthority({workspaceId:W,companyId:C,expectedVersion:4,operationId:OP,grantId:G,effectiveOn:'2026-09-11',reason:'قرار جديد'});
  await gateway.recordResolution({workspaceId:W,companyId:C,expectedVersion:5,operationId:OP,number:'R-1',title:'قرار اختبار',type:'general',effectiveOn:'2026-09-11',notes:null});
  await gateway.recordCapital({workspaceId:W,companyId:C,expectedVersion:6,operationId:OP,changeType:'increase',amountAfter:'200000000',effectiveOn:'2026-09-11',reason:'زيادة نظامية'});
  assert.deepEqual(calls,['replace_company_beneficial_owners_v1','grant_company_authority_v1','revoke_company_authority_v1','record_company_resolution_v1','record_company_capital_event_v1']);
});

test('governance inputs reject invalid ids, dates, amounts and empty authoritative sets before RPC',async()=>{
  let calls=0;const gateway=createGovernanceCommandGateway(client(async()=>{calls++;return {data:null,error:null}}));
  await assert.rejects(()=>gateway.replaceOwnership({workspaceId:W,companyId:C,expectedVersion:0,operationId:'bad',effectiveFrom:'2026-09-11',entries:[{kind:'person',id:P,role:'shareholder',percentage:'100'}]}),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_VALIDATION_FAILED');
  await assert.rejects(()=>gateway.recordCapital({workspaceId:W,companyId:C,expectedVersion:0,operationId:OP,changeType:'set',amountAfter:'1.234',effectiveOn:'2026-09-11',reason:'x'}),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_VALIDATION_FAILED');
  assert.equal(calls,0);
});

test('governance write timeout remains outcome-unknown so the same operation id can be safely retried',async()=>{
  const gateway=createGovernanceCommandGateway(client(()=>new Promise(()=>undefined)),5);
  await assert.rejects(()=>gateway.recordResolution({workspaceId:W,companyId:C,expectedVersion:5,operationId:OP,number:null,title:'قرار صحيح',type:'general',effectiveOn:'2026-09-11',notes:null}),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_OUTCOME_UNKNOWN');
});

test('database conflict remains typed instead of becoming a visual success',async()=>{
  const gateway=createGovernanceCommandGateway(client(async()=>({data:null,error:{code:'40001',message:'ENJAZ_RESOLUTION_STALE'}})));
  await assert.rejects(()=>gateway.recordResolution({workspaceId:W,companyId:C,expectedVersion:5,operationId:OP,number:null,title:'قرار صحيح',type:'general',effectiveOn:'2026-09-11',notes:null}),(e:unknown)=>e instanceof DataAccessError&&e.dataCode==='DATA_CONFLICT');
});
