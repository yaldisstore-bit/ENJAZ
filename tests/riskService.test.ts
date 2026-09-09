import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import type { FieldAssignmentSummary, FieldOperationsContext } from '../src/features/field-operations/fieldOperationsCommands.ts';
import {
  loadSmartRisk,
  RiskAuthorityDriftError,
  RiskSourcePageStalledError,
  type FinanceRiskLoader,
} from '../src/features/risk/riskService.ts';

const W='11111111-1111-4111-8111-111111111111';
const U='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const T='44444444-4444-4444-8444-444444444444';
const B='55555555-5555-4555-8555-555555555555';
const OWNER='66666666-6666-4666-8666-666666666666';
const NOW=new Date('2026-09-09T12:00:00.000Z');

function transaction(patch:Partial<RowOf<'transactions'>>={}):RowOf<'transactions'>{
  return {
    id:T,workspace_id:W,company_id:C,primary_contact_id:null,type:'تسجيل شركة',department:'الشركات',status:'stalled',priority:'urgent',current_fee:1000,
    created_at:'2026-09-01T08:00:00.000Z',updated_at:'2026-09-09T08:00:00.000Z',last_activity_at:'2026-09-01T08:00:00.000Z',completed_at:null,
    archived_at:null,deleted_at:null,deleted_by:null,deletion_reason:null,legacy_id:'1042',legacy_source:null,...patch,
  };
}
function company(patch:Partial<RowOf<'companies'>>={}):RowOf<'companies'>{
  return {
    id:C,workspace_id:W,legal_name:'شركة الاختبار',display_name:'شركة الاختبار',capital:null,address:null,activities:null,registration_number:null,legal_status:null,
    primary_contact_id:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-09-01T08:00:00.000Z',updated_at:'2026-09-09T08:00:00.000Z',deleted_at:null,...patch,
  };
}
function blocker(patch:Partial<RowOf<'transaction_blockers'>>={}):RowOf<'transaction_blockers'>{
  return {id:B,workspace_id:W,transaction_id:T,title:'تعطل لدى الجهة',severity:'critical',note:'تحتاج تصعيداً',status:'open',opened_at:'2026-09-08T08:00:00.000Z',resolved_at:null,...patch};
}
function repository<T>(items:readonly T[]){
  return {async list(){return {items,hasMore:false,total:items.length}}};
}
function assignment(index:number,patch:Partial<FieldAssignmentSummary>={}):FieldAssignmentSummary{
  return {
    id:`77777777-7777-4777-8${String(index).padStart(3,'0')}-777777777777`,transactionId:T,transactionType:'تسجيل شركة',transactionStatus:'stalled',companyName:'شركة الاختبار',
    assignedUserId:OWNER,assignedUserName:'أحمد',scheduledFor:'2026-09-09',destinationLabel:'مسجل الشركات',department:'الشركات',priority:'urgent',status:'queued',version:1,openBlockers:1,nextRequiredAction:'مراجعة',...patch,
  };
}
function fieldContext(assignments:readonly FieldAssignmentSummary[]=[]):FieldOperationsContext{
  return Object.freeze({
    authority:'field_assignments_visits_evidence_receipts',transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',automationWriteAuthority:'existing_automation_rpc_only',financeWriteAuthority:'none',locationPolicy:'optional',
    metrics:{activeTransactions:1,stalledTransactions:1,highCriticalBlockers:1,pendingAutomationApprovals:0,queuedAssignments:assignments.length,activeVisits:0},members:Object.freeze([]),assignments:Object.freeze(assignments),visits:Object.freeze([]),
  });
}
function layer(transactions:readonly RowOf<'transactions'>[]=[transaction()],companies:readonly RowOf<'companies'>[]=[company()],blockers:readonly RowOf<'transaction_blockers'>[]=[blocker()]):EnjazWorkspaceDataLayer{
  return {transactions:repository(transactions),companies:repository(companies),blockers:repository(blockers)} as unknown as EnjazWorkspaceDataLayer;
}
function factory(value:EnjazWorkspaceDataLayer=layer()):EnjazDataLayerFactory{
  return {async resolveWorkspaceId(userId){return userId===U?W:null},forWorkspace(workspaceId){assert.equal(workspaceId,W);return value}};
}
const financeLoader:FinanceRiskLoader=async()=>Object.freeze({workspaceId:W,snapshot:Object.freeze({asOf:NOW.toISOString(),signals:Object.freeze([
  Object.freeze({id:'payment-integrity',severity:'high' as const,title:'مطابقة الدفعات تحتاج مراجعة',explanation:'يوجد اختلاف موثق في سجل العكس.',amountCents:null}),
  Object.freeze({id:'no-high-signal',severity:'info' as const,title:'لا توجد إشارة مالية مرتفعة',explanation:'لا شيء للتصعيد.',amountCents:null}),
])})});

test('live Smart Risk composes authoritative transaction, blocker, finance and workload evidence without writes',async()=>{
  const assignments=[assignment(1),assignment(2),assignment(3)];
  const result=await loadSmartRisk({dataFactory:factory(),fieldOperations:{loadContext:async()=>fieldContext(assignments)},financeRiskLoader:financeLoader},U,NOW);
  assert.equal(result.workspaceId,W);
  assert.equal(result.authority,'read_only_derived_intelligence');
  const codes=result.signals.map((signal)=>signal.code);
  assert.ok(codes.includes('transaction_stalled'));
  assert.ok(codes.includes('transaction_inactive'));
  assert.ok(codes.includes('open_critical_blocker'));
  assert.ok(codes.includes('finance_anomaly'));
  assert.ok(codes.includes('workload_concentration'));
  assert.equal(result.signals.filter((signal)=>signal.code==='finance_anomaly').length,1,'info-only finance signal must not become risk');
  assert.ok(result.signals.every((signal)=>signal.recommendation.mutates===false));
  assert.equal(result.sourceCounts.transactions,1);
  assert.equal(result.sourceCounts.blockers,1);
  assert.equal(result.sourceCounts.financeAnomalies,1);
  assert.equal(result.sourceCounts.workloadOwners,1);
});

test('archived/completed work and closed blockers cannot leak through a permissive repository mock',async()=>{
  const archived=transaction({archived_at:'2026-09-09T09:00:00.000Z'});
  const completed=transaction({id:'88888888-8888-4888-8888-888888888888',status:'completed',completed_at:'2026-09-09T09:00:00.000Z'});
  const closed=blocker({status:'resolved',resolved_at:'2026-09-09T09:00:00.000Z'});
  const quietFinance:FinanceRiskLoader=async()=>({workspaceId:W,snapshot:{asOf:NOW.toISOString(),signals:[{id:'no-high-signal',severity:'info',title:'طبيعي',explanation:'لا تصعيد',amountCents:null}]}});
  const result=await loadSmartRisk({dataFactory:factory(layer([archived,completed],[company()],[closed])),fieldOperations:{loadContext:async()=>fieldContext()},financeRiskLoader:quietFinance},U,NOW);
  assert.deepEqual(result.signals,[]);
  assert.equal(result.sourceCounts.transactions,0);
  assert.equal(result.sourceCounts.blockers,0);
});

test('cross-workspace finance composition fails closed',async()=>{
  const drift:FinanceRiskLoader=async()=>({workspaceId:'99999999-9999-4999-8999-999999999999',snapshot:{asOf:NOW.toISOString(),signals:[]}});
  await assert.rejects(()=>loadSmartRisk({dataFactory:factory(),fieldOperations:{loadContext:async()=>fieldContext()},financeRiskLoader:drift},U,NOW),RiskAuthorityDriftError);
});

test('field authority drift is rejected even if an injected gateway lies about its type',async()=>{
  const drift={...fieldContext(),transactionWriteAuthority:'write'} as unknown as FieldOperationsContext;
  await assert.rejects(()=>loadSmartRisk({dataFactory:factory(),fieldOperations:{loadContext:async()=>drift},financeRiskLoader:financeLoader},U,NOW),RiskAuthorityDriftError);
});

test('non-progressing source pagination fails closed instead of accepting a partial risk census',async()=>{
  const stalled={async list(){return {items:[],hasMore:true,total:0}}};
  const broken={...layer(),transactions:stalled} as unknown as EnjazWorkspaceDataLayer;
  await assert.rejects(()=>loadSmartRisk({dataFactory:factory(broken),fieldOperations:{loadContext:async()=>fieldContext()},financeRiskLoader:financeLoader},U,NOW),RiskSourcePageStalledError);
});
