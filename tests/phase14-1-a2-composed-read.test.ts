import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../src/data/createDataLayer.ts';
import type { FinanceCommandGateway } from '../src/features/finance/financeCommands.ts';
import type { CrossDomainOperationsReaders } from '../src/features/journeys/crossDomainJourneyOperationsProof.ts';
import type { ClientPortalGateway } from '../src/features/client-portal/clientPortalGateway.ts';
import { verifyCrossDomainA2Read } from '../src/features/journeys/crossDomainJourneyA2Read.ts';

const U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', W='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc', T='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', CLIENT='ffffffff-ffff-4fff-8fff-ffffffffffff';
const UPDATED='2026-09-20T08:00:00Z',PAID='2026-09-19T17:30:00Z',NOW=new Date('2026-09-20T12:00:00Z');
function fixture(flags:{mismatchedReceipt?:boolean;foreignEngagement?:boolean;clientLeak?:boolean}={}){
  const calls:string[]=[];
  const company={id:C,workspace_id:W,legal_name:'Company',display_name:null,status:'active',
    updated_at:UPDATED,deleted_at:null,merged_into_id:null};
  const transaction={id:T,company_id:C,workspace_id:W,type:'registration',status:'open',
    created_at:UPDATED,updated_at:UPDATED,completed_at:null,deleted_at:null};
  const payment={id:P,workspace_id:W,company_id:C,transaction_id:T,
    amount:0.29,receipt_ref:'QA-1',method:'cash',status:'posted',paid_at:PAID,note:'Approved'};
  const list=(name:string,items:readonly Record<string,unknown>[])=>({
    async list(){calls.push('source:'+name);return {items,total:items.length,hasMore:false,offset:0,limit:100};},
  });
  const layer={scope:{workspaceId:W},
    companies:{async getById(){return company;}},
    transactions:{async getById(){return transaction;}},
    workflowInstances:list('procedures',[]),followups:list('followups',[]),
    payments:list('payments',[payment]),paymentReversals:list('reversals',[]),documents:list('documents',[]),
  } as unknown as EnjazWorkspaceDataLayer;
  const factory={async resolveWorkspaceId(id:string){assert.equal(id,U);return W;},
    forWorkspace(ws:string){assert.equal(ws,W);return layer;}} as EnjazDataLayerFactory;
  const finance={
    async getReceipt(ws:string,id:string){calls.push('finance:receipt');
      assert.equal(ws,W);assert.equal(id,P);
      return {paymentId:P,transactionId:T,companyId:C,receiptRef:'QA-1',
        amountCents:flags.mismatchedReceipt?30n:29n,method:'cash',status:'posted',
        paidAt:PAID,note:'Approved',reversal:null};},
    async loadContext(){calls.push('finance:context');
      return {engagements:flags.foreignEngagement?[{id:P,companyId:U,transactionIds:[T]}]:[]};},
  } as unknown as Pick<FinanceCommandGateway,'getReceipt'|'loadContext'>;
  const operations={
    field:{async loadContext(){calls.push('field:context');
      return {authority:'field_assignments_visits_evidence_receipts',
        transactionWriteAuthority:'none',workflowWriteAuthority:'existing_workflow_rpc_only',
        automationWriteAuthority:'existing_automation_rpc_only',financeWriteAuthority:'none',
        assignments:[],visits:[]};}},
    governance:{async loadContext(){calls.push('governance:context');return {companyId:C};}},
    contracts:{async list(){calls.push('contract:read');return [];}},
  } as unknown as Pick<CrossDomainOperationsReaders,'field'|'governance'|'contracts'>;
  const grants=[
    {id:C,targetType:'company',targetId:C,permissions:['view'],validFrom:null,validUntil:null,version:1},
    {id:T,targetType:'transaction',targetId:T,permissions:['view','view_finance'],
      validFrom:null,validUntil:null,version:1},
  ];
  const portal={
    async authority(){calls.push('portal:authority');return {workspaceId:W,principalId:CLIENT,grants};},
    async readModel(){calls.push('portal:read');return {
      companies:[{id:C,legalName:'Company',displayName:null,status:'active',
        ...(flags.clientLeak?{internalField:'not allowed'}:{})}],
      transactions:[{id:T,companyId:C,type:'registration',status:'open',
        createdAt:UPDATED,updatedAt:UPDATED,completedAt:null}],
      documents:[],receipts:[{paymentId:P,transactionId:T,companyId:C,receiptRef:'QA-1',
        amount:'0.29',method:'cash',status:'posted',paidAt:PAID,receiptVersion:1}],
      requests:[],timeline:[],messages:[],appointmentResponses:[],readReceipts:[],
      documentUploads:[],documentApprovalResponses:[]};},
  } as unknown as Pick<ClientPortalGateway,'authority'|'readModel'>;
  return {calls,run:()=>verifyCrossDomainA2Read(factory,U,C,T,finance,operations,portal,NOW)};
}

test('A2 composed read observes every authority without implying a cloud, browser or write certificate',async()=>{
  const {run,calls}=fixture(),result=await run();
  assert.equal(result.workspaceId,W);
  assert.equal(result.companyId,C);
  assert.equal(result.transactionId,T);
  assert.equal(result.observedNetPaymentCents,29n);
  assert.equal(result.clientPrincipalId,CLIENT);
  assert.equal(result.targetTransactionVisible,true);
  assert.equal(result.observedClientReceiptCount,1);
  for(const flag of ['actualHostedAuthRlsCertified','durableWriteJourneyCertified',
    'atomicCrossPrincipalSnapshotCertified','publishedBrowserCertified','dataMutationAuthorized'] as const)
    assert.equal(result[flag],false);
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(calls.filter(x=>x.startsWith('portal:')),
    ['portal:authority','portal:read','portal:authority']);
  assert.ok(!calls.some(x=>/create|update|delete|write|insert/.test(x)));
});

test('A2 composed read stops before field and portal if payment receipt mismatches',async()=>{
  const {run,calls}=fixture({mismatchedReceipt:true});
  await assert.rejects(run(),/SOURCE_DRIFT/);
  assert.ok(calls.includes('finance:receipt'));
  assert.ok(!calls.some(x=>x.startsWith('field:')||x.startsWith('portal:')));
});

test('A2 composed read rejects a commercial engagement for another company before portal read',async()=>{
  const {run,calls}=fixture({foreignEngagement:true});
  await assert.rejects(run(),/ENGAGEMENT_LINK_DRIFT/);
  assert.ok(calls.includes('field:context'));
  assert.ok(!calls.some(x=>x.startsWith('portal:')));
});

test('A2 composed read refuses an internal field visible to the independently scoped client',async()=>{
  const {run,calls}=fixture({clientLeak:true});
  await assert.rejects(run(),/FORBIDDEN_FIELD/);
  assert.ok(calls.includes('portal:read'));
});
