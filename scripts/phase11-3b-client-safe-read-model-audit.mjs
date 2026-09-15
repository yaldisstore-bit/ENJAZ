import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const foundation=read('database/migrations/phase_11_3_client_safe_read_model.sql');
const hardening=read('database/migrations/phase_11_3_client_safe_read_model_hardening.sql');
const requests=read('database/migrations/phase_11_3_client_portal_requests_read_model.sql');
const authority=read('src/features/client-portal/clientPortalAuthority.ts');
const state=json('docs/PHASE11_3_STATE.json');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(s,m,msg=m)=>req(s.includes(m),`missing ${msg}`);

// Foundation child publication remains explicit and fail-closed.
has(foundation,'create table public.client_portal_resource_shares','resource publication table');
has(foundation,'alter table public.client_portal_resource_shares enable row level security','resource share RLS');
has(foundation,'revoke all on table public.client_portal_resource_shares from public,anon,authenticated','resource table browser revoke');
for(const marker of [
  'client_portal_resource_shares_principal_fk','client_portal_resource_shares_transaction_fk',
  'client_portal_resource_shares_document_fk','client_portal_resource_shares_payment_fk',
  'client_portal_resource_shares_shape_check','client_portal_resource_shares_validity_check',
  'client_portal_resource_shares_document_active_unique','client_portal_resource_shares_receipt_active_unique'
]) has(foundation,marker);
has(foundation,"resource_type in ('document','receipt')",'closed resource vocabulary');
has(foundation,"ENJAZ_PORTAL_SHARE_STAFF_COLLISION",'share staff collision denial');
has(foundation,"g.target_type='transaction'",'resource shares require exact transaction grant');
has(foundation,"p_permission=any(g.permissions)",'resource share exact permission requirement');
has(foundation,"v_permission:='view_finance'",'receipt finance permission requirement');
has(foundation,"d.status='ready'",'only ready documents are publishable');
has(foundation,"insert into public.audit_events",'share audit evidence');
for(const helper of ['require_client_portal_shareable_principal_v1','client_portal_principal_has_grant_v1','record_client_portal_share_audit_v1']){
  const re=new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,240}from\\s+public,anon,authenticated`,'i');
  req(re.test(foundation),`${helper} must not be directly browser-callable`);
}

// Foundation canonical projections remain minimal.
const readStart=foundation.indexOf('create or replace function private.get_client_portal_read_model_v1_impl');
const readEnd=foundation.indexOf('create or replace function public.get_client_portal_read_model_v1',readStart);
req(readStart>=0&&readEnd>readStart,'foundation client read-model implementation block missing');
const baseModel=readStart>=0&&readEnd>readStart?foundation.slice(readStart,readEnd):'';
for(const marker of [
  "'companies'","'transactions'","'timeline'","'documents'","'receipts'","'requests'",
  "'legalName',c.legal_name","'displayName',c.display_name",
  "'type',t.type","'status',t.status","'completedAt',t.completed_at",
  "'title',d.title","'documentType',d.document_type","'mimeType',d.mime_type","'sizeBytes',d.size_bytes",
  "'receiptRef',p.receipt_ref","'amount',p.amount::text","'method',p.method","'paidAt',p.paid_at","'receiptVersion',p.receipt_version",
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view')",
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view_finance')"
]) has(baseModel,marker,`foundation read model marker ${marker}`);
for(const forbidden of [
  'transaction_notes','transaction_routes','transaction_followups','transaction_blockers',
  'risk_signals','intelligence_snapshots','financial_ledger_entries','document_analysis',
  'storage_path','checksum','ocr_text','extracted_fields','cashbox_id','reversal_reason','deletion_reason','legacy_source'
]) req(!baseModel.includes(forbidden),`foundation read model leaks/internal-joins forbidden source: ${forbidden}`);
req(!baseModel.includes("'priority'"),'read model must not project internal transaction priority');
req(!baseModel.includes("'currentFee'"),'read model must not project transaction current fee through ordinary view permission');
req(!baseModel.includes("'department'"),'read model must not project staff department');

// Governed request source closes the placeholder without becoming a shadow business store.
has(requests,'create table public.client_portal_requests','governed client request table');
has(requests,'alter table public.client_portal_requests enable row level security','request RLS');
has(requests,'revoke all on table public.client_portal_requests from public,anon,authenticated','request table browser revoke');
for(const marker of [
  "request_type in ('document','approval','information','appointment','payment')",
  "required_permission in ('upload_requested_document','approve_document','message','confirm_appointment','view_finance')",
  'client_portal_requests_permission_mapping_check',
  "request_type='document' and required_permission='upload_requested_document'",
  "request_type='approval' and required_permission='approve_document' and resource_share_id is not null",
  "request_type='information' and required_permission='message'",
  "request_type='appointment' and required_permission='confirm_appointment'",
  "request_type='payment' and required_permission='view_finance'",
  'client_portal_requests_principal_fk','client_portal_requests_transaction_fk','client_portal_requests_resource_share_fk',
  'ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED','ENJAZ_PORTAL_REQUEST_APPROVAL_SHARE_REQUIRED','ENJAZ_PORTAL_REQUEST_APPROVAL_SHARE_INVALID',
  'private.require_client_portal_owner_v1(p_workspace_id)',
  'private.require_client_portal_shareable_principal_v1(p_workspace_id,p_principal_id)',
  'private.client_portal_principal_has_grant_v1(p_workspace_id,p_principal_id,p_transaction_id,v_permission)',
  "'client_portal.request.created'","'client_portal.request.updated'","'client_portal.request.revoked'","'client_portal.request.auto_revoked'",
]) has(requests,marker);

// Exact signature and retry semantics: resource share participates in immutable request identity.
req(/create\s+or\s+replace\s+function\s+private\.save_client_portal_request_v1_impl\s*\([\s\S]*?p_valid_until\s+timestamptz,p_resource_share_id\s+uuid[\s\S]*?security\s+definer\s+set\s+search_path=''/i.test(requests),'request save impl signature/search_path is incomplete');
has(requests,'v_from:=coalesce(p_valid_from,v_request.valid_from)','retry/update must preserve valid_from when omitted');
has(requests,"v_request.resource_share_id is distinct from p_resource_share_id",'request resource share must be immutable for an existing request id');
has(requests,"'wasDuplicate',true",'request create retry must have explicit duplicate result');
has(requests,'ENJAZ_PORTAL_REQUEST_ID_CONFLICT','request-id replay conflict denial');
has(requests,'ENJAZ_PORTAL_REQUEST_STALE','optimistic request version denial');

// Revocation must be permanent and auditable, not merely hidden by today's grant lookup.
for(const marker of [
  'create trigger client_portal_requests_revoke_on_grant_change',
  'create trigger client_portal_approval_requests_revoke_on_share_revoke',
  'transaction_grant_revoked_or_retargeted',
  'required_permission_removed',
  'approval_resource_unshared',
  'set revoked_at=now(),revoked_by=v_actor,version=version+1',
  'perform private.record_client_portal_request_audit_v1',
]) has(requests,marker);
has(hardening,'create or replace function private.client_portal_revoke_child_shares_on_grant_change_v1','child-share grant hardening');
has(hardening,"'client_portal.resource.auto_unshared'",'automatic child-share unshare audit');

// Final read-model wrapper must replace the placeholder with the governed queue.
const v2Start=requests.indexOf('create or replace function private.get_client_portal_read_model_v2_impl');
const v2End=requests.indexOf('create or replace function public.get_client_portal_read_model_v1',v2Start);
req(v2Start>=0&&v2End>v2Start,'final client read-model v2 implementation block missing');
const finalModel=v2Start>=0&&v2End>v2Start?requests.slice(v2Start,v2End):'';
for(const marker of [
  'v_base:=private.get_client_portal_read_model_v1_impl(p_workspace_id)',
  'from public.client_portal_requests r',
  'r.workspace_id=p_workspace_id and r.principal_id=v_principal',
  'r.revoked_at is null and r.valid_from<=now()',
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,r.required_permission)",
  "r.request_type<>'approval'",
  'from public.client_portal_resource_shares s',
  "jsonb_set(v_base,'{requests}',v_requests,true) - 'requestProjectionStatus'",
]) has(finalModel,marker,`final request read model marker ${marker}`);
for(const field of ["'id',r.id","'transactionId',r.transaction_id","'requestType',r.request_type","'title',r.title","'instructions',r.instructions","'dueAt',r.due_at","'status',r.status","'resourceShareId',r.resource_share_id","'createdAt',r.created_at","'updatedAt',r.updated_at"])
  has(finalModel,field,`client-safe request field ${field}`);
for(const forbidden of ["'requiredPermission'","'createdBy'","'revokedAt'","'revokedBy'","'version'","'amount'","'internalNote'"])
  req(!finalModel.includes(forbidden),`final request projection leaks authority/internal field ${forbidden}`);
req(!finalModel.includes('PENDING_GOVERNED_CLIENT_REQUEST_SOURCE'),'final read model must not retain pending request placeholder');

// Client cannot complete/fulfil requests in B; that authority is reserved for 11.3-C.
req(!/create\s+or\s+replace\s+function\s+public\.(fulfill|complete|respond|approve)_client_portal_request/i.test(requests),'11.3-B must not smuggle client write authority');
req(!/grant\s+(select|insert|update|delete|all)[\s\S]{0,160}public\.client_portal_requests/i.test(requests),'client request table must have no direct browser DML/read grant');

for(const helper of [
  'client_portal_request_permission_v1','validate_client_portal_request_resource_v1','record_client_portal_request_audit_v1',
  'revoke_client_portal_requests_on_grant_change_v1','revoke_client_portal_approval_requests_on_share_revoke_v1'
]){
  const re=new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,260}from\\s+public,anon,authenticated`,'i');
  req(re.test(requests),`${helper} must never be directly browser-callable`);
}

for(const marker of [
  "'type',","'completedAt',","CLIENT_SAFE_DOCUMENT_FIELDS","CLIENT_SAFE_RECEIPT_FIELDS","CLIENT_SAFE_REQUEST_FIELDS"
]) has(authority,marker,`canonical client projection contract ${marker}`);
req(!/CLIENT_SAFE_TRANSACTION_FIELDS[\s\S]{0,320}'title'/.test(authority),'transaction allowlist must not retain invented title');
req(!/CLIENT_SAFE_TRANSACTION_FIELDS[\s\S]{0,320}'referenceNumber'/.test(authority),'transaction allowlist must not retain invented referenceNumber');

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3 lifecycle must remain active');
req(state.clientSafeReadModelFoundationAdded===true,'state must record 11.3-B read-model foundation');
req(state.governedClientRequestSourceAdded===true,'state must record governed request source');
req(state.clientSafeReadModelAdded===true,'state must record completed client-safe read model code');
req(state.clientSafeReadModelCompletionBlocker===null,'read-model code completion blocker must be cleared');
req(state.databaseAuthorityExtensionApplied===false,'Real Cloud apply must remain pending until authenticated verification');
req(state.realCloudAuthenticatedVerification==='PENDING','Real Cloud verification may not be claimed by static work');
req(state.governedClientWriteBoundaryAdded===false,'11.3-C client writes remain pending');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','Phase 11.4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-B CLIENT-SAFE READ MODEL AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3-B CLIENT-SAFE READ MODEL AUDIT PASS — explicit grants, child publication and a governed request queue produce minimal client-safe Company/Transaction/Document/Receipt/Request facts; revocation is permanent/audited; 11.3-C writes remain closed.');
}
