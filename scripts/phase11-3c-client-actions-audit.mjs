import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const sql=read('database/migrations/phase_11_3_client_portal_actions_foundation.sql');
const contract=read('src/features/client-portal/clientPortalActions.ts');
const state=json('docs/PHASE11_3_STATE.json');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(source,marker,label=marker)=>req(source.includes(marker),`missing ${label}`);

for(const table of ['client_portal_messages','client_portal_appointment_responses','client_portal_request_read_receipts']){
  has(sql,`create table public.${table}`,`${table} table`);
  has(sql,`alter table public.${table} enable row level security`,`${table} RLS`);
}
has(sql,'revoke all on table public.client_portal_messages,public.client_portal_appointment_responses,public.client_portal_request_read_receipts','portal action browser table revoke');
has(sql,'client_portal_requests_action_scope_unique','request action-scope unique contract');
has(sql,'client_portal_messages_request_scope_fk','message exact request scope FK');
has(sql,'client_portal_appointment_responses_request_scope_fk','appointment exact request scope FK');
has(sql,'client_portal_request_read_receipts_request_scope_fk','read receipt exact request scope FK');

for(const helper of ['require_client_portal_transaction_action_v1','require_client_portal_visible_request_v1','record_client_portal_action_audit_v1']){
  req(new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.${helper}[\\s\\S]*?security\\s+definer\\s+set\\s+search_path=''`,'i').test(sql),`${helper} must be private SECURITY DEFINER with fixed empty search_path`);
  req(new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,300}from\\s+public,anon,authenticated`,'i').test(sql),`${helper} must not be directly browser-callable`);
}

for(const marker of [
  "private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message')",
  'private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)',
  'ENJAZ_PORTAL_MESSAGE_IDEMPOTENCY_CONFLICT',
  "'client_portal.message.sent'",
  "v_request.request_type='information' and v_request.status='open'",
  "'client_portal.request.fulfilled','client_message_response'",
]) has(sql,marker,`message action marker ${marker}`);

for(const marker of [
  "p_decision not in ('confirmed','declined')",
  "v_request.request_type<>'appointment' or v_request.required_permission<>'confirm_appointment'",
  'ENJAZ_PORTAL_APPOINTMENT_IDEMPOTENCY_CONFLICT',
  'ENJAZ_PORTAL_APPOINTMENT_ALREADY_RESPONDED',
  'ENJAZ_PORTAL_APPOINTMENT_REQUEST_CHANGED',
  "'client_portal.appointment.responded'",
  "'client_portal.request.fulfilled','appointment_response'",
]) has(sql,marker,`appointment action marker ${marker}`);

for(const marker of [
  'private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)',
  'set last_read_at=greatest(last_read_at,now())',
  'ENJAZ_PORTAL_READ_RECEIPT_IDEMPOTENCY_CONFLICT',
  'ENJAZ_PORTAL_READ_RECEIPT_ID_CONFLICT',
  "'client_portal.request.read'",
]) has(sql,marker,`read receipt marker ${marker}`);

const modelStart=sql.indexOf('create or replace function private.get_client_portal_read_model_v3_impl');
const modelEnd=sql.indexOf('create or replace function public.get_client_portal_read_model_v1',modelStart);
req(modelStart>=0&&modelEnd>modelStart,'C1 read-model v3 block missing');
const model=modelStart>=0&&modelEnd>modelStart?sql.slice(modelStart,modelEnd):'';
for(const marker of [
  'v_base:=private.get_client_portal_read_model_v2_impl(p_workspace_id)',
  'm.principal_id=v_principal',
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',m.transaction_id,'message')",
  'a.principal_id=v_principal',
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'confirm_appointment')",
  'r.principal_id=v_principal',
  "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,q.required_permission)",
  "'{messages}'","'{appointmentResponses}'","'{readReceipts}'",
]) has(model,marker,`C1 read-model marker ${marker}`);
for(const forbidden of ['actor_user_id','required_permission','created_by','revoked_by','workspace_memberships','organization_members','transaction_notes','risk_signals','financial_ledger_entries'])
  req(!model.includes(forbidden),`C1 read model leaks internal source/field: ${forbidden}`);

for(const forbiddenWrite of [
  /insert\s+into\s+public\.transaction_notes/i,
  /(?:insert\s+into|update)\s+public\.(appointments|calendar_events|staff_calendar|workflow_runs|financial_ledger_entries)/i,
  /(?:insert\s+into|update)\s+public\.workspace_memberships/i,
  /(?:insert\s+into|update)\s+public\.organization_members/i,
]) req(!forbiddenWrite.test(sql),`C1 writes a foreign/staff authority domain: ${forbiddenWrite}`);
req(!/service_role/i.test(sql),'C1 migration must not depend on service_role');
req(!/grant\s+(select|insert|update|delete|all)[\s\S]{0,220}public\.client_portal_(messages|appointment_responses|request_read_receipts)/i.test(sql),'C1 portal action tables must not get direct browser grants');
req(!/prepare_document_upload_v1|acknowledge_document_upload_v1|review_document_draft_v1/i.test(sql),'C1 must not falsely implement upload/approval domain commands');

for(const fn of ['send_client_portal_message_v1','respond_client_portal_appointment_v1','mark_client_portal_request_read_v1']){
  has(sql,`create or replace function public.${fn}`,`${fn} public command`);
  has(sql,`revoke all on function public.${fn}`,`${fn} public/anon revoke`);
  has(sql,`grant execute on function public.${fn}`,`${fn} authenticated grant`);
}

for(const marker of [
  "mark_request_read: 'request_required_permission'",
  "message: 'message'",
  "confirm_appointment: 'confirm_appointment'",
  "upload_requested_document: 'upload_requested_document'",
  "approve_document: 'approve_document'",
  'CLIENT_SAFE_MESSAGE_FIELDS','CLIENT_SAFE_APPOINTMENT_RESPONSE_FIELDS','CLIENT_SAFE_READ_RECEIPT_FIELDS',
]) has(contract,marker,`client action contract ${marker}`);

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3/M3 must remain active');
req(state.currentSlice==='11.3-C'&&state.currentSliceName==='Governed Client Actions','machine state must enter canonical 11.3-C');
req(state.mode==='GOVERNED_CLIENT_ACTIONS_FOUNDATION','11.3-C mode drifted');
req(state.governedClientActionFoundationAdded===true,'C1 foundation must be recorded');
req(state.governedClientWriteBoundaryAdded===false,'C may not claim completion before upload + approval commands exist');
req(Array.isArray(state.governedClientActionsImplemented)&&state.governedClientActionsImplemented.includes('message')&&state.governedClientActionsImplemented.includes('confirm_appointment')&&state.governedClientActionsImplemented.includes('mark_request_read'),'C1 implemented action ledger incomplete');
req(Array.isArray(state.governedClientActionsPending)&&state.governedClientActionsPending.includes('upload_requested_document')&&state.governedClientActionsPending.includes('approve_document'),'C1 pending domain-command ledger incomplete');
req(state.realCloudAuthenticatedVerification==='PENDING','C1 may not claim Real Cloud verification');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','M4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-C GOVERNED CLIENT ACTIONS AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3-C GOVERNED CLIENT ACTIONS FOUNDATION PASS — portal messages, appointment responses and critical read receipts are exact-scope/idempotent/audited; foreign staff/domain truth is untouched; upload and approval remain explicitly pending.');
}
