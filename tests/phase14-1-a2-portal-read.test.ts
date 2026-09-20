import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClientPortalGateway,
  type ClientPortalGateway, type ClientPortalReadModel, type ClientPortalAuthorityContext,
} from '../src/features/client-portal/clientPortalGateway.ts';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';
import type { CrossDomainJourneyReadProof } from '../src/features/journeys/crossDomainJourneyReadProof.ts';
import {
  verifyCrossDomainClientPortalRead, CrossDomainPortalProofError,
} from '../src/features/journeys/crossDomainJourneyPortalProof.ts';

const W = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const T = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const D = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const P = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = new Date('2026-09-20T12:00:00.000Z');
const PAID_AT = '2026-09-20T08:00:00.000Z';
const grant = (type: 'company' | 'transaction', id: string, permissions: ClientPortalAuthorityContext['grants'][number]['permissions'] = ['view'], other: Record<string,unknown> = {}) => ({
  id: type === 'company' ? C : T, targetType: type, targetId: id,
  permissions, validFrom: null, validUntil: null, version: 1, ...other,
});
const authority = (grants: readonly ReturnType<typeof grant>[] = [
  grant('company',C), grant('transaction',T,['view','view_finance']),
], overrides: Record<string,unknown> = {}): ClientPortalAuthorityContext =>
  ({ workspaceId: W, principalId: USER, grants, ...overrides }) as ClientPortalAuthorityContext;
const baseModel = (): ClientPortalReadModel => ({
  companies: [{ id:C, legalName:'Test company', displayName:null, status:'active' }],
  transactions: [{ id:T, companyId:C, type:'QA', status:'open',
    createdAt:'2026-09-20', updatedAt:'2026-09-20', completedAt:null }],
  documents: [{ id:D, transactionId:T, companyId:C, title:'Approved', documentType:null,
    mimeType:'application/pdf', sizeBytes:12, status:'ready', capturedAt:null,
    createdAt:'2026-09-20', updatedAt:'2026-09-20' }],
  receipts: [{ paymentId:P, transactionId:T, companyId:C, receiptRef:'QA1',
    amount:'0.29', method:'cash', paidAt:PAID_AT, status:'posted', receiptVersion:1 }],
  requests: [],timeline:[],messages:[],appointmentResponses:[],readReceipts:[],
  documentUploads:[],documentApprovalResponses:[],
});
const source = (): CrossDomainJourneyReadProof => ({
  workspaceId:W, company:{id:C,legal_name:'Test company',display_name:null,status:'active'},
  transaction:{id:T,company_id:C,type:'QA',status:'open',
    created_at:'2026-09-20',updated_at:'2026-09-20',completed_at:null},
  procedures:[],followups:[],payments:[{id:P,workspace_id:W,company_id:C,transaction_id:T,amount:0.29,
    receipt_ref:'QA1',method:'cash',status:'posted',paid_at:PAID_AT}],reversals:[],
  documents:[{id:D,workspace_id:W,transaction_id:T,company_id:C,title:'Approved',
    status:'ready',mime_type:'application/pdf',size_bytes:12,document_type:null,
    captured_at:null,created_at:'2026-09-20',updated_at:'2026-09-20'}],
  proofKind:'AUTHENTICATED_INTERNAL_READ_ONLY',
  atomicMultiDomainSnapshotCertified:false,clientVisibilityCertified:false,
}) as unknown as CrossDomainJourneyReadProof;
const gateway = (
  model: ClientPortalReadModel = baseModel(),
  first: ClientPortalAuthorityContext = authority(),
  second: ClientPortalAuthorityContext = first,
  calls: string[] = [],
): Pick<ClientPortalGateway,'authority'|'readModel'> => {
  let reads = 0;
  return {
    async authority(workspaceId: string) {
      assert.equal(workspaceId,W);
      calls.push('authority');
      return reads++ === 0 ? first : second;
    },
    async readModel(workspaceId: string) {
      assert.equal(workspaceId,W);
      calls.push('read');
      return model;
    },
  };
};
const reason = (code: CrossDomainPortalProofError['reason']) =>
  (error: unknown) => error instanceof CrossDomainPortalProofError && error.reason === code;

test('A2 independently scoped portal reads only explicit company, transaction, document and finance grants',async()=>{
  const calls:string[]=[];
  const proof=await verifyCrossDomainClientPortalRead(source(),gateway(baseModel(),authority(),authority(),calls),NOW);
  assert.equal(proof.targetTransactionVisible,true);
  assert.equal(proof.observedCompanyCount,1);
  assert.equal(proof.observedTransactionCount,1);
  assert.equal(proof.observedDocumentCount,1);
  assert.equal(proof.observedReceiptCount,1);
  assert.equal(proof.realAuthRlsCertified,false);
  assert.equal(proof.clientWritePermissionCertified,false);
  assert.equal(proof.atomicCrossPrincipalSnapshotCertified,false);
  assert.deepEqual(calls,['authority','read','authority']);
});

test('A2 refuses altered company and transaction facts even with valid target IDs',async()=>{
  for(const patch of [{legalName:'Wrong company'}, {displayName:'Forged label'}, {status:'inactive'}]){
    const model={...baseModel(),companies:[{...baseModel().companies[0]!,...patch}]};
    await assert.rejects(verifyCrossDomainClientPortalRead(source(),gateway(model),NOW),reason('SOURCE_DRIFT'));
  }
  for(const patch of [
    {type:'Forged type'}, {status:'closed'}, {createdAt:'2026-09-19'},
    {updatedAt:'2026-09-21'}, {completedAt:'2026-09-20'},
  ]){
    const model={...baseModel(),transactions:[{...baseModel().transactions[0]!,...patch}]};
    await assert.rejects(verifyCrossDomainClientPortalRead(source(),gateway(model),NOW),reason('SOURCE_DRIFT'));
  }
  const equivalent={...baseModel(),transactions:[{...baseModel().transactions[0]!,
    createdAt:'2026-09-20T03:00:00+03:00',updatedAt:'2026-09-20T00:00:00Z'}]};
  const proof=await verifyCrossDomainClientPortalRead(source(),gateway(equivalent),NOW);
  assert.equal(proof.targetTransactionVisible,true);
});

test('A2 rejects duplicate company rows in the client-safe projection',async()=>{
  const model={...baseModel(),companies:[...baseModel().companies,...baseModel().companies]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(model),NOW,
  ),reason('UNRELATED_RECORD'));
});

test('A2 no grant cannot be inferred from a rendered company or transaction',async()=>{
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority([grant('transaction',T,['view','view_finance'])])),NOW,
  ),reason('GRANT_MISSING'));
  const withoutCompany={...baseModel(),companies:[]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(withoutCompany,authority([grant('company',C)])),NOW,
  ),reason('GRANT_MISSING'));
});

test('A2 expired and future-dated grants are denied; no implicit finance permission',async()=>{
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority([
      grant('company',C),grant('transaction',T,['view','view_finance'],{validUntil:'2026-09-19T00:00:00Z'}),
    ])),NOW,
  ),reason('GRANT_MISSING'));
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority([
      grant('company',C),grant('transaction',T,['view','view_finance'],{validFrom:'2026-09-21T00:00:00Z'}),
    ])),NOW,
  ),reason('GRANT_MISSING'));
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority([grant('company',C),grant('transaction',T,['view'])])),NOW,
  ),reason('GRANT_MISSING'));
});

test('A2 real portal read-model parser accepts an unassigned document company only under a granted transaction',async()=>{
  const raw={...baseModel(),documents:[{...baseModel().documents[0]!,companyId:null}]};
  const rpcCalls:string[]=[];
  const realGateway=createClientPortalGateway({rpc(name:string,args:Record<string,unknown>){
    rpcCalls.push(name);
    assert.equal(name,'get_client_portal_read_model_v1');
    assert.equal(args.p_workspace_id,W);
    return Promise.resolve({data:raw,error:null});
  }} as unknown as EnjazSupabaseClient);
  const parsed=await realGateway.readModel(W);
  assert.equal(parsed.documents[0]?.companyId,null);
  assert.deepEqual(rpcCalls,['get_client_portal_read_model_v1']);
  const internal=source();
  const nullable={...internal,documents:[{...internal.documents[0],company_id:null}]} as CrossDomainJourneyReadProof;
  const result=await verifyCrossDomainClientPortalRead(nullable,gateway(parsed),NOW);
  assert.equal(result.observedDocumentCount,1);
  const wrong={...parsed,documents:[{...parsed.documents[0]!,companyId:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(nullable,gateway(wrong),NOW),reason('UNRELATED_RECORD'));
});

test('A2 rejects a document or receipt that references an unrelated transaction/company',async()=>{
  const wrongDocument={...baseModel(),documents:[{...baseModel().documents[0]!,companyId:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(wrongDocument),NOW,
  ),reason('UNRELATED_RECORD'));
  const wrongReceipt={...baseModel(),receipts:[{...baseModel().receipts[0]!,companyId:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(wrongReceipt),NOW,
  ),reason('UNRELATED_RECORD'));
});

test('A2 rejects a portal record absent from the internal source instead of inventing a share',async()=>{
  const document={...baseModel(),documents:[{...baseModel().documents[0]!,id:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(document),NOW,
  ),reason('SOURCE_DRIFT'));
  const receipt={...baseModel(),receipts:[{...baseModel().receipts[0]!,paymentId:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(receipt),NOW,
  ),reason('SOURCE_DRIFT'));
});

test('A2 refuses a portal receipt with correct payment ID but changed financial facts',async()=>{
  for (const patch of [
    {amount:'0.30'}, {amount:'0.291'}, {amount:'9007199254740992.00'},
    {method:'transfer'}, {status:'reversed'}, {receiptRef:'FORGED'},
  ]) {
    const forged={...baseModel(),receipts:[{...baseModel().receipts[0]!, ...patch}]};
    await assert.rejects(verifyCrossDomainClientPortalRead(
      source(),gateway(forged),NOW,
    ),reason('SOURCE_DRIFT'));
  }
  const tinySource=source();
  const tinyPayment={...tinySource,payments:[{...tinySource.payments[0],amount:0.00000000001}]} as CrossDomainJourneyReadProof;
  await assert.rejects(verifyCrossDomainClientPortalRead(
    tinyPayment,gateway(),NOW,
  ),reason('SOURCE_DRIFT'));
  const financeOnly={...baseModel(),transactions:[],documents:[],
    receipts:[{...baseModel().receipts[0]!,amount:'0.30'}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(financeOnly,authority([grant('company',C),grant('transaction',T,['view_finance'])])),NOW,
  ),reason('SOURCE_DRIFT'));
});

test('A2 refuses forged receipt paid-at and foreign source workspace even when identity matches',async()=>{
  for (const paidAt of ['2026-09-20T08:01:00.000Z','invalid-timestamp']) {
    const model={...baseModel(),receipts:[{...baseModel().receipts[0]!,paidAt}]};
    await assert.rejects(verifyCrossDomainClientPortalRead(
      source(),gateway(model),NOW,
    ),reason('SOURCE_DRIFT'));
  }
  const altered=source();
  const foreign={...altered,payments:[{...altered.payments[0],workspace_id:USER}]} as CrossDomainJourneyReadProof;
  await assert.rejects(verifyCrossDomainClientPortalRead(foreign,gateway(),NOW),reason('SOURCE_DRIFT'));
  const equivalent={...baseModel(),receipts:[{...baseModel().receipts[0]!,paidAt:'2026-09-20T11:00:00.000+03:00'}]};
  const proof=await verifyCrossDomainClientPortalRead(source(),gateway(equivalent),NOW);
  assert.equal(proof.observedReceiptCount,1);
});

test('A2 rejects a correctly linked document with forged client-visible source facts',async()=>{
  for (const patch of [
    {title:'Altered title'}, {status:'approved'}, {mimeType:'text/html'}, {sizeBytes:999},
    {documentType:'altered'}, {capturedAt:'2026-09-19'},
    {createdAt:'2026-09-19'}, {updatedAt:'2026-09-21'},
  ]) {
    const model={...baseModel(),documents:[{...baseModel().documents[0]!, ...patch}]};
    await assert.rejects(verifyCrossDomainClientPortalRead(
      source(),gateway(model),NOW,
    ),reason('SOURCE_DRIFT'));
  }
  const sameDates={...baseModel(),documents:[{...baseModel().documents[0]!,
    createdAt:'2026-09-20T03:00:00+03:00',updatedAt:'2026-09-20T00:00:00Z'}]};
  assert.equal((await verifyCrossDomainClientPortalRead(source(),gateway(sameDates),NOW)).observedDocumentCount,1);
  const mismatched=source() as unknown as Record<string,unknown>;
  const forgedSource={...mismatched,documents:[{...source().documents[0],workspace_id:USER}]} as unknown as CrossDomainJourneyReadProof;
  await assert.rejects(verifyCrossDomainClientPortalRead(
    forgedSource,gateway(),NOW,
  ),reason('SOURCE_DRIFT'));
});

test('A2 individually shared receipt permits finance-only scope without general transaction view',async()=>{
  const onlyFinance={...baseModel(),transactions:[],documents:[]};
  const grants=authority([grant('company',C),grant('transaction',T,['view_finance'])]);
  const proof=await verifyCrossDomainClientPortalRead(source(),gateway(onlyFinance,grants),NOW);
  assert.equal(proof.targetTransactionVisible,false);
  assert.equal(proof.observedReceiptCount,1);
  assert.equal(proof.realAuthRlsCertified,false);
  const unrelated={...onlyFinance,receipts:[{...baseModel().receipts[0]!,transactionId:USER}]};
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(unrelated,grants),NOW,
  ),reason('GRANT_MISSING'));
});

test('A2 projection rejects forbidden internal fields before returning an observation',async()=>{
  const leaked={...baseModel(),companies:[{...baseModel().companies[0]!,internalNotes:'no'}]} as unknown as ClientPortalReadModel;
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(leaked),NOW,
  ),reason('FORBIDDEN_FIELD'));
});

test('A2 revoked, changed or malformed grant evidence between reads fails closed',async()=>{
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority(),authority([])),NOW,
  ),reason('AUTHORITY_DRIFT'));
  await assert.rejects(verifyCrossDomainClientPortalRead(
    source(),gateway(baseModel(),authority([
      grant('company',C),grant('transaction',T,['view','view_finance'],{validUntil:'invalid'}),
    ])),NOW,
  ),reason('AUTHORITY_DRIFT'));
});

test('A2 client requests require their exact transaction capability, not a generic view grant',async()=>{
  const requestId='11111111-1111-4111-8111-111111111111';
  const shareId='22222222-2222-4222-8222-222222222222';
  const types=[
    ['document','upload_requested_document',null],
    ['approval','approve_document',shareId],
    ['information','message',null],
    ['appointment','confirm_appointment',null],
    ['payment','view_finance',null],
  ] as const;
  for (const [requestType, permission, resourceShareId] of types) {
    const entry={id:requestId,transactionId:T,requestType,title:'Client request',
      instructions:null,dueAt:null,status:'open',resourceShareId,
      createdAt:'2026-09-20T08:00:00Z',updatedAt:'2026-09-20T08:00:00Z'};
    const model={...baseModel(),companies:[],transactions:[],documents:[],receipts:[],requests:[entry]};
    const scoped=authority([grant('transaction',T,[permission])]);
    const proof=await verifyCrossDomainClientPortalRead(source(),gateway(model,scoped),NOW);
    assert.equal(proof.targetTransactionVisible,false);
    await assert.rejects(verifyCrossDomainClientPortalRead(source(),gateway(model,authority([
      grant('transaction',T,['view']),
    ])),NOW),reason('GRANT_MISSING'));
    await assert.rejects(verifyCrossDomainClientPortalRead(source(),gateway(model,authority([])),NOW),reason('GRANT_MISSING'));
  }
});

test('A2 rejects duplicated, malformed and internal-field client request projections',async()=>{
  const entry={id:'11111111-1111-4111-8111-111111111111',transactionId:T,requestType:'document' as const,
    title:'Client request',instructions:null,dueAt:null,status:'open',resourceShareId:null,
    createdAt:'2026-09-20T08:00:00Z',updatedAt:'2026-09-20T08:00:00Z'};
  const grants=authority([grant('transaction',T,['upload_requested_document'])]);
  const base={...baseModel(),companies:[],transactions:[],documents:[],receipts:[]};
  for (const requests of [
    [entry,entry], [{...entry,internalNotes:'private'}],
    [{...entry,resourceShareId:D}],
    [{...entry,requestType:'approval',resourceShareId:null}],
    [{...entry,requestType:'invalid'}],
    [{...entry,id:'invalid-id'}],
    [{...entry,transactionId:'invalid-transaction'}],
    [{...entry,requestType:'approval',resourceShareId:'invalid-share'}],
  ]) {
    await assert.rejects(verifyCrossDomainClientPortalRead(source(),gateway(
      {...base,requests} as ClientPortalReadModel,grants,
    ),NOW),error => error instanceof CrossDomainPortalProofError &&
      ['UNRELATED_RECORD','FORBIDDEN_FIELD'].includes(error.reason));
  }
});

test('A2 empty portal projection does not prove access; no internal data are returned',async()=>{
  const blank={...baseModel(),companies:[],transactions:[],documents:[],receipts:[]};
  const proof=await verifyCrossDomainClientPortalRead(source(),gateway(blank,authority([])),NOW);
  assert.equal(proof.targetTransactionVisible,false);
  assert.equal(proof.observedCompanyCount,0);
  assert.equal('company' in proof,false);
  assert.equal('transaction' in proof,false);
  assert.equal('documents' in proof,false);
});
