import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntakeFollowupGateway } from '../src/features/intake-contract-communication/intakeFollowupCommands.ts';
import type { EnjazSupabaseClient } from '../src/core/supabase/client.ts';

const W='11111111-1111-4111-8111-111111111111';
const S='22222222-2222-4222-8222-222222222222';
const O='33333333-3333-4333-8333-333333333333';
const P='44444444-4444-4444-8444-444444444444';
const T='55555555-5555-4555-8555-555555555555';
const R='66666666-6666-4666-8666-666666666666';
const F='77777777-7777-4777-8777-777777777777';
const TOKEN='a'.repeat(64);

type Handler=(name:string,args:Readonly<Record<string,unknown>>)=>unknown|Promise<unknown>;
function client(handler:Handler){return {rpc:async(name:string,args:Readonly<Record<string,unknown>>)=>({data:await handler(name,args),error:null})} as unknown as EnjazSupabaseClient}
function issueResult(mode:'secure_link'|'client_portal'='secure_link'){return {followupId:F,submissionId:S,mode,requestKind:'information',status:'open',version:1,submissionVersion:2,portalRequestId:mode==='client_portal'?R:null,token:mode==='secure_link'?TOKEN:null,expiresAt:'2026-09-19T12:00:00Z',wasDuplicate:false}}

test('secure follow-up issue uses only the governed RPC and preserves capability scope',async()=>{
  let calls=0;
  const g=createIntakeFollowupGateway(client((name,args)=>{calls++;assert.equal(name,'issue_intake_followup_v1');assert.deepEqual(args,{p_workspace_id:W,p_submission_id:S,p_expected_submission_version:1,p_mode:'secure_link',p_request_kind:'information',p_requested_fields:['phone','email'],p_title:'استكمال البيانات',p_instructions:'يرجى التحديث',p_expires_in_hours:24,p_idempotency_key:O,p_portal_principal_id:null,p_portal_transaction_id:null,p_portal_request_id:null});return issueResult()}));
  const out=await g.issue({workspaceId:W,submissionId:S,expectedSubmissionVersion:1,mode:'secure_link',requestKind:'information',requestedFields:['phone','email'],title:'استكمال البيانات',instructions:'يرجى التحديث',expiresInHours:24,idempotencyKey:O,portalPrincipalId:null,portalTransactionId:null,portalRequestId:null});
  assert.equal(calls,1);assert.equal(out.token,TOKEN);assert.equal(out.portalRequestId,null);assert.equal(out.submissionVersion,2);
});

test('destruction: secure-link document follow-up is rejected before network',async()=>{
  let calls=0;const g=createIntakeFollowupGateway(client(()=>{calls++;return issueResult()}));
  await assert.rejects(()=>g.issue({workspaceId:W,submissionId:S,expectedSubmissionVersion:1,mode:'secure_link',requestKind:'document',requestedFields:[],title:'مستند',instructions:null,expiresInHours:24,idempotencyKey:O,portalPrincipalId:null,portalTransactionId:null,portalRequestId:null}));
  assert.equal(calls,0);
});

test('destruction: portal mode requires principal transaction and request binding before network',async()=>{
  let calls=0;const g=createIntakeFollowupGateway(client(()=>{calls++;return issueResult('client_portal')}));
  await assert.rejects(()=>g.issue({workspaceId:W,submissionId:S,expectedSubmissionVersion:1,mode:'client_portal',requestKind:'information',requestedFields:['phone'],title:'استكمال',instructions:null,expiresInHours:24,idempotencyKey:O,portalPrincipalId:P,portalTransactionId:null,portalRequestId:R}));
  assert.equal(calls,0);
});

test('portal follow-up delegates exact portal scope to the governed RPC',async()=>{
  const g=createIntakeFollowupGateway(client((name,args)=>{assert.equal(name,'issue_intake_followup_v1');assert.equal(args.p_portal_principal_id,P);assert.equal(args.p_portal_transaction_id,T);assert.equal(args.p_portal_request_id,R);return issueResult('client_portal')}));
  const out=await g.issue({workspaceId:W,submissionId:S,expectedSubmissionVersion:1,mode:'client_portal',requestKind:'information',requestedFields:['phone'],title:'استكمال',instructions:null,expiresInHours:24,idempotencyKey:O,portalPrincipalId:P,portalTransactionId:T,portalRequestId:R});
  assert.equal(out.mode,'client_portal');assert.equal(out.token,null);assert.equal(out.portalRequestId,R);
});

test('destruction: issue response cannot mix secure token and portal request authority',async()=>{
  const broken={...issueResult(),portalRequestId:R};const g=createIntakeFollowupGateway(client(()=>broken));
  await assert.rejects(()=>g.issue({workspaceId:W,submissionId:S,expectedSubmissionVersion:1,mode:'secure_link',requestKind:'information',requestedFields:['phone'],title:'استكمال',instructions:null,expiresInHours:24,idempotencyKey:O,portalPrincipalId:null,portalTransactionId:null,portalRequestId:null}));
});

test('public read requires explicit non-authoritative follow-up contract',async()=>{
  const good={publicAuthority:'non_authoritative_followup_input',followupId:F,status:'open',title:'استكمال',instructions:null,expiresAt:'2026-09-19T12:00:00Z',submissionVersion:2,form:{title:'نموذج',fields:[{key:'phone',label:'الهاتف',type:'phone',required:true,config:{}}]},draftPatch:{phone:'07700000000'}};
  const g=createIntakeFollowupGateway(client((name,args)=>{assert.equal(name,'get_public_intake_followup_v1');assert.equal(args.p_token,TOKEN);return good}));
  const out=await g.getPublic(TOKEN);assert.equal(out.publicAuthority,'non_authoritative_followup_input');assert.equal(out.draftPatch.phone,'07700000000');
  const broken=createIntakeFollowupGateway(client(()=>({...good,publicAuthority:'authoritative'})));
  await assert.rejects(()=>broken.getPublic(TOKEN));
});

test('public save never accepts blank patch values and forwards token-scoped command only',async()=>{
  let calls=0;const g=createIntakeFollowupGateway(client((name,args)=>{calls++;assert.equal(name,'save_public_intake_followup_v1');assert.deepEqual(args,{p_token:TOKEN,p_patch:{phone:'07711111111'},p_finalize:true});return {followupId:F,submissionId:S,status:'responded',version:2,submissionVersion:3,authoritative:false,wasDuplicate:false}}));
  const out=await g.savePublic(TOKEN,{phone:'07711111111'},true);assert.equal(out.authoritative,false);assert.equal(out.status,'responded');assert.equal(calls,1);
  await assert.rejects(()=>g.savePublic(TOKEN,{phone:'   '},false));assert.equal(calls,1);
});

test('portal reconciliation is staff-governed and response must be terminal responded',async()=>{
  const g=createIntakeFollowupGateway(client((name,args)=>{assert.equal(name,'reconcile_portal_intake_followup_v1');assert.equal(args.p_expected_followup_version,1);assert.equal(args.p_expected_submission_version,2);return {followupId:F,submissionId:S,status:'responded',version:2,submissionVersion:3,portalRequestId:R}}));
  const out=await g.reconcilePortal({workspaceId:W,followupId:F,expectedFollowupVersion:1,expectedSubmissionVersion:2,answerPatch:{phone:'07722222222'}});assert.equal(out.portalRequestId,R);
  const broken=createIntakeFollowupGateway(client(()=>({followupId:F,submissionId:S,status:'open',version:2,submissionVersion:3,portalRequestId:R})));
  await assert.rejects(()=>broken.reconcilePortal({workspaceId:W,followupId:F,expectedFollowupVersion:1,expectedSubmissionVersion:2,answerPatch:{phone:'07722222222'}}));
});

test('revoke carries optimistic version and attributable reason',async()=>{
  const g=createIntakeFollowupGateway(client((name,args)=>{assert.equal(name,'revoke_intake_followup_v1');assert.deepEqual(args,{p_workspace_id:W,p_followup_id:F,p_expected_version:1,p_reason:'لم تعد البيانات مطلوبة'});return {followupId:F,status:'revoked',version:2,wasDuplicate:false}}));
  const out=await g.revoke({workspaceId:W,followupId:F,expectedVersion:1,reason:'لم تعد البيانات مطلوبة'});assert.equal(out.status,'revoked');
});
