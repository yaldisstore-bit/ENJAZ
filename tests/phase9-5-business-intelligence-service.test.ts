import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import type { FieldOperationsContext } from '../src/features/field-operations/fieldOperationsCommands.ts';
import {
 BIAuthorityDriftError,BISourcePageStalledError,BIWorkspaceUnavailableError,loadBusinessIntelligence,
 type FinanceBiSnapshot,
} from '../src/features/intelligence/businessIntelligenceService.ts';

const W='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222',NOW=new Date('2026-09-12T00:00:00.000Z');
function tx(id:string,patch:Partial<RowOf<'transactions'>>={}):RowOf<'transactions'>{return {id,workspace_id:W,company_id:'33333333-3333-4333-8333-333333333333',primary_contact_id:null,type:'معاملة شركات',department:'مسجل الشركات',status:'active',priority:'normal',current_fee:100000,created_at:'2026-08-01T00:00:00.000Z',updated_at:'2026-09-01T00:00:00.000Z',last_activity_at:'2026-09-01T00:00:00.000Z',completed_at:null,archived_at:null,deleted_at:null,deleted_by:null,deletion_reason:null,legacy_id:null,legacy_source:null,...patch}}
function factory(rows:readonly RowOf<'transactions'>[],workspace:string|null=W,stalled=false):EnjazDataLayerFactory{return {async resolveWorkspaceId(){return workspace},forWorkspace(){return {transactions:{async list(req:any){if(stalled)return {items:[],hasMore:true,total:0};const offset=req?.offset??0,limit=req?.limit??100,items=rows.slice(offset,offset+limit);return {items,hasMore:offset+items.length<rows.length,total:rows.length}}}} as any}} as EnjazDataLayerFactory}
function field(overrides:Partial<FieldOperationsContext>={}):FieldOperationsContext{return {authority:'field_assignments_visits_evidence_receipts',transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',automationWriteAuthority:'existing_automation_rpc_only',financeWriteAuthority:'none',locationPolicy:'optional',metrics:{activeTransactions:0,stalledTransactions:0,highCriticalBlockers:0,pendingAutomationApprovals:0,queuedAssignments:1,activeVisits:1},members:[],assignments:[{id:'44444444-4444-4444-8444-444444444444',transactionId:'55555555-5555-4555-8555-555555555555',transactionType:'معاملة',transactionStatus:'active',companyName:'شركة',assignedUserId:U,assignedUserName:'مستخدم',scheduledFor:'2026-09-12',destinationLabel:'الدائرة',department:null,priority:'normal',status:'queued',version:1,openBlockers:0,nextRequiredAction:'متابعة'}],visits:[{id:'66666666-6666-4666-8666-666666666666',assignmentId:'44444444-4444-4444-8444-444444444444',transactionId:'55555555-5555-4555-8555-555555555555',assignedUserId:U,status:'checked_in',version:1,checkInAt:'2026-09-12T00:00:00.000Z',checkOutAt:null,counterDepartment:null,officialReference:null,officialFeePaid:null,failureReason:null,outcomeNote:null,checkInLocationRecorded:false,checkOutLocationRecorded:false,evidenceCount:0}],...overrides}}
function financeSnapshot(samples=5,workspace=W):Readonly<{workspaceId:string;snapshot:FinanceBiSnapshot}>{return {workspaceId:workspace,snapshot:{asOf:NOW.toISOString(),totalOutstandingCents:50000n,runRate:{recent30CollectedCents:30000n,previous30CollectedCents:20000n,changeBps:5000,averageDailyCollectionCents:1000n,projectedNext30AtSameRunRateCents:30000n,samplePaymentCount:samples,confidence:samples>=4?'directional':'insufficient'},signals:[]}}}
function deps(rows:readonly RowOf<'transactions'>[],samples=5,workspace=W){return {dataFactory:factory(rows),fieldOperations:{async loadContext(){return field()}},financeLoader:async()=>financeSnapshot(samples,workspace)}}

function kpi(snapshot:Awaited<ReturnType<typeof loadBusinessIntelligence>>,id:string){return snapshot.kpis.find(x=>x.kpiId===id)}
function forecast(snapshot:Awaited<ReturnType<typeof loadBusinessIntelligence>>,id:string){return snapshot.forecasts.find(x=>x.forecastId===id)}

test('9.5 service 01 — source composition stays read-only derived and provenance-bound',async()=>{
 const rows=[tx('70000000-0000-4000-8000-000000000001'),tx('70000000-0000-4000-8000-000000000002',{status:'stalled'}),tx('70000000-0000-4000-8000-000000000003',{status:'completed',completed_at:'2026-09-05T00:00:00.000Z'})];
 const x=await loadBusinessIntelligence(deps(rows),U,NOW);assert.equal(x.authority,'read_only_derived_intelligence');assert.equal(x.workspaceId,W);assert.equal(kpi(x,'operations.active_transactions')?.value.unit,'count');assert.equal(kpi(x,'operations.stalled_transactions')?.value.unit,'count');
 for(const item of [...x.kpis,...x.forecasts]){assert.equal(item.authoritative,false);assert.ok(item.provenance.length);assert.ok(item.provenance.every(p=>p.workspaceId===W))}
});

test('9.5 service 02 — archived/deleted facts cannot inflate active operational KPIs',async()=>{
 const rows=[tx('70000000-0000-4000-8000-000000000011'),tx('70000000-0000-4000-8000-000000000012',{archived_at:'2026-09-10T00:00:00.000Z'}),tx('70000000-0000-4000-8000-000000000013',{deleted_at:'2026-09-10T00:00:00.000Z',deleted_by:U,deletion_reason:'test'})];
 const x=await loadBusinessIntelligence(deps(rows),U,NOW),v=kpi(x,'operations.active_transactions')?.value;assert.equal(v?.unit,'count');if(v?.unit==='count')assert.equal(v.value,1);
});

test('9.5 service 03 — insufficient observed completions and payments remain insufficient forecasts',async()=>{
 const rows=[1,2,3].map(i=>tx(`70000000-0000-4000-8000-00000000002${i}`,{status:'completed',completed_at:`2026-09-0${i}T00:00:00.000Z`}));const x=await loadBusinessIntelligence(deps(rows,3),U,NOW);
 assert.equal(forecast(x,'operations.completed_next_30d')?.confidence,'insufficient');assert.equal(forecast(x,'operations.completed_next_30d')?.projectedValue,null);assert.equal(forecast(x,'finance.collections_next_30d')?.confidence,'insufficient');assert.equal(forecast(x,'finance.collections_next_30d')?.projectedValue,null);
});

test('9.5 service 04 — sufficient additive observations produce deterministic count/cents projections only',async()=>{
 const rows=[1,2,3,4].map(i=>tx(`70000000-0000-4000-8000-00000000003${i}`,{status:'completed',completed_at:`2026-09-0${i}T00:00:00.000Z`}));const x=await loadBusinessIntelligence(deps(rows,5),U,NOW),op=forecast(x,'operations.completed_next_30d'),fin=forecast(x,'finance.collections_next_30d');
 assert.equal(op?.confidence,'directional');assert.equal(op?.projectedValue?.unit,'count');if(op?.projectedValue?.unit==='count')assert.equal(op.projectedValue.value,4);assert.equal(fin?.confidence,'directional');assert.equal(fin?.projectedValue?.unit,'cents');if(fin?.projectedValue?.unit==='cents')assert.equal(fin.projectedValue.valueCents,30000n);
});

test('9.5 service 05 — finance workspace drift fails closed',async()=>{await assert.rejects(()=>loadBusinessIntelligence(deps([],5,'99999999-9999-4999-8999-999999999999'),U,NOW),BIAuthorityDriftError)});

test('9.5 service 06 — field authority drift fails closed',async()=>{const d={dataFactory:factory([]),fieldOperations:{async loadContext(){return field({financeWriteAuthority:'none',transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',automationWriteAuthority:'existing_automation_rpc_only',authority:'wrong' as any})}},financeLoader:async()=>financeSnapshot()};await assert.rejects(()=>loadBusinessIntelligence(d,U,NOW),BIAuthorityDriftError)});

test('9.5 service 07 — missing workspace fails closed before BI composition',async()=>{const d={dataFactory:factory([],null),fieldOperations:{async loadContext(){return field()}},financeLoader:async()=>financeSnapshot()};await assert.rejects(()=>loadBusinessIntelligence(d,U,NOW),BIWorkspaceUnavailableError)});

test('9.5 service 08 — stalled pagination cannot silently truncate source authority',async()=>{const d={dataFactory:factory([],W,true),fieldOperations:{async loadContext(){return field()}},financeLoader:async()=>financeSnapshot()};await assert.rejects(()=>loadBusinessIntelligence(d,U,NOW),BISourcePageStalledError)});
