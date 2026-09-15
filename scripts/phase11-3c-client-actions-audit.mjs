import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const json=(p)=>JSON.parse(read(p));
const c1=read('database/migrations/phase_11_3_client_portal_actions_foundation.sql');
const c2=read('database/migrations/phase_11_3_client_portal_governed_document_actions.sql');
const c2Hardening=read('database/migrations/phase_11_3_client_portal_governed_document_actions_hardening.sql');
const edge=read('supabase/functions/enjaz-document-vault/index.ts');
const contract=read('src/features/client-portal/clientPortalActions.ts');
const state=json('docs/PHASE11_3_STATE.json');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(source,marker,label=marker)=>req(source.includes(marker),`missing ${label}`);

for(const table of ['client_portal_messages','client_portal_appointment_responses','client_portal_request_read_receipts']){
  has(c1,`create table public.${table}`,`${table} table`);
  has(c1,`alter table public.${table} enable row level security`,`${table} RLS`);
}
for(const marker of [
  "private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message')",
  "v_request.request_type<>'appointment' or v_request.required_permission<>'confirm_appointment'",
  'ENJAZ_PORTAL_MESSAGE_IDEMPOTENCY_CONFLICT','ENJAZ_PORTAL_APPOINTMENT_IDEMPOTENCY_CONFLICT',
  'ENJAZ_PORTAL_READ_RECEIPT_IDEMPOTENCY_CONFLICT',"'client_portal.message.sent'",
  "'client_portal.appointment.responded'","'client_portal.request.read'",
  'private.get_client_portal_read_model_v3_impl'
]) has(c1,marker,`C1 marker ${marker}`);
req(!/service_role/i.test(c1),'C1 migration must not depend on service_role');
req(!/prepare_document_upload_v1|acknowledge_document_upload_v1|review_document_draft_v1/i.test(c1),'C1 must stay a foundation without smuggled C2 authority');

for(const table of ['client_portal_requested_document_uploads','client_portal_document_approval_targets','client_portal_document_approval_responses']){
  has(c2,`create table public.${table}`,`${table} table`);
  has(c2,`alter table public.${table} enable row level security`,`${table} RLS`);
  has(c2,`revoke all on table public.${table} from public,anon,authenticated`,`${table} browser revoke`);
}
for(const marker of [
  "v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document'",
  'insert into public.documents(','insert into public.document_upload_sessions(',
  'create trigger client_portal_upload_session_sync',"new.state='failed'","new.state='acknowledged'",
  "v_session.state<>'acknowledged'","d.status='ready'",
  "'client_portal.document_upload.prepared'","'client_portal.document_upload.acknowledged'",
  "'client_portal.request.fulfilled','document_vault_acknowledgement'"
]) has(c2,marker,`Vault broker marker ${marker}`);
for(const marker of [
  "action==='portal-prepare'",'prepare_client_portal_requested_document_v1',
  "action==='portal-acknowledge'",'get_client_portal_document_upload_claim_v1',
  'inspectStoredBinary(admin,expected)',"admin.rpc('acknowledge_document_upload_v2'",
  'complete_client_portal_requested_document_v1'
]) has(edge,marker,`Vault edge marker ${marker}`);
for(const marker of [
  'private.enforce_client_portal_vault_ack_authority_v1',
  'before insert on public.document_versions',
  "v_request.required_permission<>'upload_requested_document'",
  "private.client_portal_principal_has_grant_v1(",
  'ENJAZ_PORTAL_VAULT_ACK_PERMISSION_REVOKED','ENJAZ_PORTAL_VAULT_ACK_PRINCIPAL_INVALID'
]) has(c2Hardening,marker,`Vault acknowledgement hardening ${marker}`);

for(const marker of [
  'private.review_document_draft_canonical_v1',
  "p_actor_source not in ('staff_owner','client_portal')",
  'private.assert_document_factory_provenance_current_v1',
  'ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT',
  "private.require_client_portal_owner_v1(p_workspace_id)",
  "v_draft.transaction_id is distinct from v_request.transaction_id",
  "v_request.request_type<>'approval' or v_request.required_permission<>'approve_document'",
  "s.id=v_request.resource_share_id","s.principal_id=v_request.principal_id and s.transaction_id=v_request.transaction_id",
  "s.resource_type='document' and s.document_id is not null",
  'ENJAZ_PORTAL_APPROVAL_IDEMPOTENCY_CONFLICT','ENJAZ_PORTAL_APPROVAL_ALREADY_RESPONDED',
  "v_comment,v_actor,'client_portal'","'client_portal.document_approval.responded'"
]) has(c2,marker,`approval marker ${marker}`);

const modelStart=c2.indexOf('create or replace function private.get_client_portal_read_model_v4_impl');
const modelEnd=c2.indexOf('create or replace function public.get_client_portal_read_model_v1',modelStart);
req(modelStart>=0&&modelEnd>modelStart,'C2 read-model v4 missing');
const model=modelStart>=0&&modelEnd>modelStart?c2.slice(modelStart,modelEnd):'';
for(const marker of [
  'v_base:=private.get_client_portal_read_model_v3_impl(p_workspace_id)',
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',u.transaction_id,'upload_requested_document')",
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'approve_document')",
  "'{documentUploads}'","'{documentApprovalResponses}'"
]) has(model,marker,`C2 read-model marker ${marker}`);
for(const forbidden of ['storage_path','checksum','actor_user_id','draft_id','resource_share_id','created_by','approved_by','workspace_memberships','organization_members'])
  req(!model.includes(forbidden),`C2 read model leaks internal field/source: ${forbidden}`);
req(!model.includes("'principalId'"),'C2 read model must not project principalId even though principal_id is used internally for filtering');

for(const forbiddenWrite of [
  /insert\s+into\s+public\.(workspace_memberships|organization_members|transaction_notes|financial_ledger_entries)/i,
  /update\s+public\.(workspace_memberships|organization_members|transaction_notes|financial_ledger_entries)/i,
]) req(!forbiddenWrite.test(c2),`C2 writes foreign/staff authority: ${forbiddenWrite}`);
req(!/service_role/i.test(c2),'C2 database migration must not depend on service_role');
req(!/grant\s+(select|insert|update|delete|all)[\s\S]{0,220}public\.client_portal_(requested_document_uploads|document_approval_targets|document_approval_responses)/i.test(c2),'C2 action tables must not receive direct browser grants');

for(const marker of [
  "mark_request_read: 'request_required_permission'","message: 'message'","confirm_appointment: 'confirm_appointment'",
  "upload_requested_document: 'upload_requested_document'","approve_document: 'approve_document'",
  'CLIENT_SAFE_DOCUMENT_UPLOAD_FIELDS','CLIENT_SAFE_DOCUMENT_APPROVAL_RESPONSE_FIELDS',
  'assertClientPortalRequestedDocumentUpload','assertClientPortalDocumentApprovalDecision'
]) has(contract,marker,`client action contract ${marker}`);

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3/M3 must remain active');
const sliceC=state.currentSlice==='11.3-C'&&state.currentSliceName==='Governed Client Actions';
const sliceD=state.currentSlice==='11.3-D'&&state.currentSliceName==='Portal Experience & Certification';
req(sliceC||sliceD,'canonical lifecycle may preserve 11.3-C or legally advance to 11.3-D only');
if(sliceC) req(state.mode==='GOVERNED_CLIENT_ACTIONS_COMPLETE','11.3-C completion mode drifted');
if(sliceD) req(state.mode==='PORTAL_EXPERIENCE_IMPLEMENTED_PENDING_CERTIFICATION','11.3-D must preserve completed C under the portal certification mode');
req(state.governedClientActionFoundationAdded===true,'C1 foundation must be recorded');
req(state.governedClientWriteBoundaryAdded===true,'C2 governed write boundary must be recorded');
req(state.governedClientWriteBoundaryStatus==='REAL_CLOUD_VERIFIED','C2 governed write boundary must remain Real Cloud verified');
req(Array.isArray(state.governedClientActionsImplemented)&&['message','confirm_appointment','mark_request_read','upload_requested_document','approve_document'].every((x)=>state.governedClientActionsImplemented.includes(x)),'implemented client action ledger incomplete');
req(Array.isArray(state.governedClientActionsPending)&&state.governedClientActionsPending.length===0,'C action pending ledger must be empty after C2');
req(state.governedClientDocumentActionsMigrationPath==='database/migrations/phase_11_3_client_portal_governed_document_actions.sql','C2 migration evidence path drifted');
req(typeof state.realCloudProbeMigrationPath==='string'&&exists(state.realCloudProbeMigrationPath),'Real Cloud governed-action probe evidence missing');
req(state.realCloudAuthenticatedVerification==='PASS','governed client actions must retain authenticated Real Cloud certification');
if(sliceC) req(state.portalUiAdded===false,'11.3-C state must not falsely claim successor UI before advance');
if(sliceD) req(state.portalUiAdded===true&&state.invitationActivationJourneyAdded===true,'11.3-D state must record the implemented portal UI and activation journey');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','M4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-C GOVERNED CLIENT ACTIONS AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log(`ENJAZ PHASE 11.3-C GOVERNED CLIENT ACTIONS PASS — all five exact-scope, replay-safe and audited client action classes remain preserved through ${state.currentSlice}; requested-document upload stays brokered through hardened Document Vault acknowledgement and document/draft approval stays on the canonical Document Factory transition; authenticated Real Cloud evidence is recorded and M4 stays locked.`);
}
