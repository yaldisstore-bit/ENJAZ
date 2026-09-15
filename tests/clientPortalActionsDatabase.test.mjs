import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_actions_foundation.sql',import.meta.url),'utf8');
const has=(value)=>assert.ok(sql.includes(value),`missing SQL contract: ${value}`);

function violations(source){
  const out=[];
  const need=(marker,label=marker)=>{if(!source.includes(marker))out.push(`missing:${label}`)};
  for(const table of ['client_portal_messages','client_portal_appointment_responses','client_portal_request_read_receipts']){
    need(`create table public.${table}`,`${table}-table`);
    need(`alter table public.${table} enable row level security`,`${table}-rls`);
  }
  need('from public,anon,authenticated;','browser-table-revoke');
  need("private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message')",'message-permission');
  need('v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)','request-visibility');
  need("v_request.request_type<>'appointment' or v_request.required_permission<>'confirm_appointment'",'appointment-request-authority');
  need("'client_portal.message.sent'",'message-audit');
  need("'client_portal.appointment.responded'",'appointment-audit');
  need("'client_portal.request.read'",'read-audit');
  need('ENJAZ_PORTAL_MESSAGE_IDEMPOTENCY_CONFLICT','message-idempotency');
  need('ENJAZ_PORTAL_APPOINTMENT_IDEMPOTENCY_CONFLICT','appointment-idempotency');
  need('ENJAZ_PORTAL_READ_RECEIPT_IDEMPOTENCY_CONFLICT','read-idempotency');
  need('private.get_client_portal_read_model_v3_impl','read-model-v3');

  if(/insert\s+into\s+public\.transaction_notes/i.test(source))out.push('transaction-note-write');
  if(/insert\s+into\s+public\.(appointments|calendar_events|staff_calendar|workflow_runs|financial_ledger_entries)/i.test(source))out.push('foreign-domain-write');
  if(/update\s+public\.(transactions|transaction_notes|appointments|calendar_events|workflow_runs|financial_ledger_entries)/i.test(source))out.push('foreign-domain-update');
  if(/grant\s+(select|insert|update|delete|all)[\s\S]{0,220}public\.client_portal_(messages|appointment_responses|request_read_receipts)/i.test(source))out.push('direct-table-grant');
  if(/service_role/i.test(source))out.push('service-role-reference');
  return out;
}

test('portal-native action tables are RLS-enabled and browser-table closed',()=>{
  assert.deepEqual(violations(sql),[]);
  has('revoke all on table public.client_portal_messages,public.client_portal_appointment_responses,public.client_portal_request_read_receipts');
});

test('messages require exact transaction message authority and optional request scope matches transaction',()=>{
  has("private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message')");
  has('v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)');
  has('v_request.transaction_id<>p_transaction_id');
  has('client_portal_messages_request_scope_fk');
});

test('message id is an idempotency key and payload drift fails closed',()=>{
  has('where m.workspace_id=p_workspace_id and m.id=p_message_id');
  has('v_existing.body<>v_body');
  has('ENJAZ_PORTAL_MESSAGE_IDEMPOTENCY_CONFLICT');
  has("'wasDuplicate',true");
});

test('information request fulfilment is command-bound and audited',()=>{
  has("v_request.request_type='information' and v_request.status='open'");
  has("set status='fulfilled',version=version+1,updated_at=now()");
  has("'client_portal.request.fulfilled','client_message_response'");
});

test('appointment response is limited to appointment requests and never mutates staff calendar truth',()=>{
  has("v_request.request_type<>'appointment' or v_request.required_permission<>'confirm_appointment'");
  has("p_decision not in ('confirmed','declined')");
  has('ENJAZ_PORTAL_APPOINTMENT_ALREADY_RESPONDED');
  assert.doesNotMatch(sql,/\b(appointments|calendar_events|staff_calendar)\b/i);
});

test('appointment response fulfils the request atomically and creates audit evidence',()=>{
  has("insert into public.client_portal_appointment_responses");
  has("where workspace_id=p_workspace_id and id=p_request_id and status='open'");
  has('ENJAZ_PORTAL_APPOINTMENT_REQUEST_CHANGED');
  has("'client_portal.appointment.responded'");
  has("'client_portal.request.fulfilled','appointment_response'");
});

test('read receipt inherits the request required permission instead of relying on plain view',()=>{
  has('private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)');
  has("p_workspace_id,'transaction',v_request.transaction_id,v_request.required_permission");
  assert.doesNotMatch(sql,/mark_client_portal_request_read[\s\S]{0,1600}client_portal_grant_allows_v1\([^)]*'view'/i);
});

test('read receipt retry updates only last-read time and does not duplicate first-read audit',()=>{
  has('set last_read_at=greatest(last_read_at,now())');
  has('ENJAZ_PORTAL_READ_RECEIPT_IDEMPOTENCY_CONFLICT');
  has("'firstReadAt',v_receipt.first_read_at");
  const firstAudit=sql.indexOf("'client_portal.request.read'");
  assert.ok(firstAudit>sql.indexOf('insert into public.client_portal_request_read_receipts'));
});

test('v3 read model exposes only the calling principal action facts behind current grants',()=>{
  const start=sql.indexOf('create or replace function private.get_client_portal_read_model_v3_impl');
  const end=sql.indexOf('create or replace function public.get_client_portal_read_model_v1',start);
  const model=sql.slice(start,end);
  for(const marker of [
    'm.principal_id=v_principal',
    "client_portal_grant_allows_v1(p_workspace_id,'transaction',m.transaction_id,'message')",
    'a.principal_id=v_principal',
    "client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'confirm_appointment')",
    'r.principal_id=v_principal',
    "client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,q.required_permission)",
    "'{messages}'","'{appointmentResponses}'","'{readReceipts}'",
  ]) assert.ok(model.includes(marker),marker);
  for(const forbiddenProjection of ["'actorUserId'","'requiredPermission'","'createdBy'","'revokedBy'","'principalId'"]){
    assert.equal(model.includes(forbiddenProjection),false,forbiddenProjection);
  }
  for(const forbiddenSource of ['workspace_memberships','organization_members','transaction_notes']){
    assert.equal(model.includes(forbiddenSource),false,forbiddenSource);
  }
});

test('private authority and audit helpers are not directly browser-callable',()=>{
  for(const helper of ['require_client_portal_transaction_action_v1','require_client_portal_visible_request_v1','record_client_portal_action_audit_v1']){
    assert.match(sql,new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,260}from\\s+public,anon,authenticated`,'i'));
  }
});

test('C1 does not smuggle requested-document upload or document approval implementation',()=>{
  assert.doesNotMatch(sql,/prepare_document_upload_v1|review_document_draft_v1|acknowledge_document_upload_v1/i);
});

test('destruction: removing message permission check is detected',()=>{
  const broken=sql.replace("private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message')",'p_transaction_id');
  assert.ok(violations(broken).includes('missing:message-permission'));
});

test('destruction: direct portal message table select is detected',()=>{
  const broken=sql.replace('commit;','grant select on table public.client_portal_messages to authenticated;\ncommit;');
  assert.ok(violations(broken).includes('direct-table-grant'));
});

test('destruction: writing client messages into transaction notes is detected',()=>{
  const broken=sql.replace('insert into public.client_portal_messages','insert into public.transaction_notes');
  assert.ok(violations(broken).includes('transaction-note-write'));
});