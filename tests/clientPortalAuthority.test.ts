import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_SAFE_COMPANY_FIELDS,
  CLIENT_SAFE_DOCUMENT_FIELDS,
  CLIENT_SAFE_RECEIPT_FIELDS,
  CLIENT_SAFE_TRANSACTION_FIELDS,
  assertClientSafeProjection,
  buildClientPortalAccessIndex,
  canPerformChildAction,
  canViewChildFact,
  canViewCompany,
  canViewTransaction,
  clientPortalDomainIsAlwaysForbidden,
  hasPortalPermission,
  type ClientPortalGrant,
  type ClientPortalPrincipal,
} from '../src/features/client-portal/clientPortalAuthority.ts';

const W='11111111-1111-4111-8111-111111111111';
const W2='22222222-2222-4222-8222-222222222222';
const P='33333333-3333-4333-8333-333333333333';
const P2='44444444-4444-4444-8444-444444444444';
const C='55555555-5555-4555-8555-555555555555';
const T='66666666-6666-4666-8666-666666666666';
const NOW=new Date('2026-09-15T06:00:00.000Z');

function principal(overrides:Partial<ClientPortalPrincipal>={}):ClientPortalPrincipal{
  return {
    id:P,
    workspaceId:W,
    userId:'77777777-7777-4777-8777-777777777777',
    contactId:null,
    status:'active',
    activatedAt:'2026-09-14T00:00:00.000Z',
    revokedAt:null,
    ...overrides,
  };
}

function grant(overrides:Partial<ClientPortalGrant>={}):ClientPortalGrant{
  return {
    id:'88888888-8888-4888-8888-888888888888',
    workspaceId:W,
    principalId:P,
    targetType:'transaction',
    targetId:T,
    permissions:['view','upload_requested_document','message'],
    validFrom:null,
    validUntil:null,
    revokedAt:null,
    ...overrides,
  };
}

test('active explicit grants expose only their exact object and workspace',()=>{
  const index=buildClientPortalAccessIndex(principal(),[
    grant({targetType:'company',targetId:C,permissions:['view']}),
    grant({id:'99999999-9999-4999-8999-999999999999'}),
  ],NOW);
  assert.equal(canViewCompany(index,W,C),true);
  assert.equal(canViewTransaction(index,W,T),true);
  assert.equal(canViewCompany(index,W2,C),false);
  assert.equal(canViewTransaction(index,W2,T),false);
});

test('company access never silently grants transaction access',()=>{
  const index=buildClientPortalAccessIndex(principal(),[
    grant({targetType:'company',targetId:C,permissions:['view']}),
  ],NOW);
  assert.equal(canViewCompany(index,W,C),true);
  assert.equal(canViewTransaction(index,W,T),false);
});

test('cross-client grants are ignored',()=>{
  const index=buildClientPortalAccessIndex(principal(),[
    grant({principalId:P2,targetId:T}),
  ],NOW);
  assert.equal(canViewTransaction(index,W,T),false);
});

test('cross-workspace grants are ignored even when ids otherwise match',()=>{
  const index=buildClientPortalAccessIndex(principal(),[
    grant({workspaceId:W2,targetId:T}),
  ],NOW);
  assert.equal(canViewTransaction(index,W,T),false);
});

test('revoked portal membership fails closed immediately',()=>{
  const index=buildClientPortalAccessIndex(principal({status:'revoked',revokedAt:'2026-09-15T05:59:00.000Z'}),[grant()],NOW);
  assert.equal(index.active,false);
  assert.equal(canViewTransaction(index,W,T),false);
});

test('revoked, future and expired grants fail closed',()=>{
  for(const g of [
    grant({revokedAt:'2026-09-15T05:00:00.000Z'}),
    grant({validFrom:'2026-09-16T00:00:00.000Z'}),
    grant({validUntil:'2026-09-15T05:59:59.000Z'}),
    grant({validUntil:'not-a-date'}),
  ]){
    const index=buildClientPortalAccessIndex(principal(),[g],NOW);
    assert.equal(canViewTransaction(index,W,T),false);
  }
});

test('child facts require explicit transaction access and client-visible projection',()=>{
  const index=buildClientPortalAccessIndex(principal(),[grant()],NOW);
  const base={kind:'document' as const,workspaceId:W,transactionId:T,clientVisible:true};
  assert.equal(canViewChildFact(index,base),true);
  assert.equal(canViewChildFact(index,{...base,clientVisible:false}),false);
  assert.equal(canViewChildFact(index,{...base,staffOnly:true}),false);
  assert.equal(canViewChildFact(index,{...base,workspaceId:W2}),false);
});

test('client action requires both visible child fact and exact permission',()=>{
  const index=buildClientPortalAccessIndex(principal(),[grant()],NOW);
  const fact={kind:'document' as const,workspaceId:W,transactionId:T,clientVisible:true};
  assert.equal(canPerformChildAction(index,fact,'upload_requested_document'),true);
  assert.equal(canPerformChildAction(index,fact,'approve_document'),false);
  assert.equal(hasPortalPermission(index,W,'transaction',T,'message'),true);
  assert.equal(hasPortalPermission(index,W,'company',C,'message'),false);
});

test('internal domains remain categorically forbidden',()=>{
  for(const domain of ['transaction_notes','risk_signals','intelligence_snapshots','workspace_memberships','organization_members','staff_only_finance']){
    assert.equal(clientPortalDomainIsAlwaysForbidden(domain),true,domain);
  }
  assert.equal(clientPortalDomainIsAlwaysForbidden('client_safe_transaction_summary'),false);
});

test('client-safe company projection rejects internal fields',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','legalName','status'],CLIENT_SAFE_COMPANY_FIELDS));
  assert.throws(()=>assertClientSafeProjection(['id','internalNotes'],CLIENT_SAFE_COMPANY_FIELDS),/forbidden field/);
  assert.throws(()=>assertClientSafeProjection(['id','riskScore'],CLIENT_SAFE_COMPANY_FIELDS),/forbidden field/);
});

test('transaction projection uses canonical transaction fields and rejects invented/internal fields',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','companyId','type','status','completedAt'],CLIENT_SAFE_TRANSACTION_FIELDS));
  assert.throws(()=>assertClientSafeProjection(['id','title'],CLIENT_SAFE_TRANSACTION_FIELDS),/forbidden field/);
  assert.throws(()=>assertClientSafeProjection(['id','referenceNumber'],CLIENT_SAFE_TRANSACTION_FIELDS),/forbidden field/);
  assert.throws(()=>assertClientSafeProjection(['id','priority'],CLIENT_SAFE_TRANSACTION_FIELDS),/forbidden field/);
  assert.throws(()=>assertClientSafeProjection(['id','currentFee'],CLIENT_SAFE_TRANSACTION_FIELDS),/forbidden field/);
});

test('document projection never exposes storage, checksum or OCR intelligence',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['id','transactionId','title','status'],CLIENT_SAFE_DOCUMENT_FIELDS));
  for(const field of ['storagePath','checksum','ocrText','extractedFields','classification','confidence']){
    assert.throws(()=>assertClientSafeProjection(['id',field],CLIENT_SAFE_DOCUMENT_FIELDS),/forbidden field/);
  }
});

test('receipt projection excludes staff-only finance metadata',()=>{
  assert.doesNotThrow(()=>assertClientSafeProjection(['paymentId','receiptRef','amount','method','paidAt','status'],CLIENT_SAFE_RECEIPT_FIELDS));
  for(const field of ['note','cashboxId','createdBy','engagementId','reversalReason','metadata']){
    assert.throws(()=>assertClientSafeProjection(['paymentId',field],CLIENT_SAFE_RECEIPT_FIELDS),/forbidden field/);
  }
});

test('authority contract has no user_metadata or workspace membership inference input',()=>{
  const index=buildClientPortalAccessIndex(principal(),[grant()],NOW);
  assert.equal(Object.hasOwn(index as object,'user_metadata'),false);
  assert.equal(Object.hasOwn(index as object,'workspaceMembershipRole'),false);
});
