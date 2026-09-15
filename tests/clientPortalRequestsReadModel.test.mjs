import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_requests_read_model.sql',import.meta.url),'utf8');

function finalModel(source=sql){
  const start=source.indexOf('create or replace function private.get_client_portal_read_model_v2_impl');
  const end=source.indexOf('create or replace function public.get_client_portal_read_model_v1',start);
  assert.ok(start>=0&&end>start,'final read-model block missing');
  return source.slice(start,end);
}

function violations(source){
  const out=[];
  const need=(marker,label=marker)=>{if(!source.includes(marker))out.push(`missing:${label}`)};
  need('create table public.client_portal_requests','table');
  need('alter table public.client_portal_requests enable row level security','rls');
  need('revoke all on table public.client_portal_requests from public,anon,authenticated','table-revoke');
  need("request_type in ('document','approval','information','appointment','payment')",'type-vocabulary');
  need("request_type='document' and required_permission='upload_requested_document'",'document-permission');
  need("request_type='approval' and required_permission='approve_document' and resource_share_id is not null",'approval-permission-share');
  need("request_type='information' and required_permission='message'",'information-permission');
  need("request_type='appointment' and required_permission='confirm_appointment'",'appointment-permission');
  need("request_type='payment' and required_permission='view_finance'",'payment-permission');
  need('private.require_client_portal_owner_v1(p_workspace_id)','owner-boundary');
  need('private.client_portal_principal_has_grant_v1(p_workspace_id,p_principal_id,p_transaction_id,v_permission)','exact-grant');
  need("s.resource_type='document' and s.document_id is not null",'approval-document-share');
  need('create trigger client_portal_requests_revoke_on_grant_change','grant-revoke-trigger');
  need('create trigger client_portal_approval_requests_revoke_on_share_revoke','share-revoke-trigger');
  need("'client_portal.request.auto_revoked'",'auto-revoke-audit');
  need('v_from:=coalesce(p_valid_from,v_request.valid_from)','stable-valid-from');
  need("'wasDuplicate',true",'idempotent-retry');
  need('ENJAZ_PORTAL_REQUEST_ID_CONFLICT','id-conflict');
  need('ENJAZ_PORTAL_REQUEST_STALE','stale-version');
  need("jsonb_set(v_base,'{requests}',v_requests,true) - 'requestProjectionStatus'",'placeholder-removal');

  const model=finalModel(source);
  for(const marker of [
    'from public.client_portal_requests r',
    'r.workspace_id=p_workspace_id and r.principal_id=v_principal',
    'r.revoked_at is null and r.valid_from<=now()',
    "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,r.required_permission)",
    "r.request_type<>'approval'",
    'from public.client_portal_resource_shares s',
  ]) if(!model.includes(marker)) out.push(`missing-model:${marker}`);

  for(const forbidden of [
    "'requiredPermission'","'createdBy'","'revokedAt'","'revokedBy'","'version'","'amount'","'internalNote'",
  ]) if(model.includes(forbidden)) out.push(`leak:${forbidden}`);
  if(model.includes('PENDING_GOVERNED_CLIENT_REQUEST_SOURCE'))out.push('pending-placeholder');

  if(/grant\s+(select|insert|update|delete|all)[\s\S]{0,180}public\.client_portal_requests/i.test(source))out.push('direct-table-grant');
  if(/create\s+or\s+replace\s+function\s+public\.(fulfill|complete|respond|approve)_client_portal_request/i.test(source))out.push('premature-client-write');

  const tableStart=source.indexOf('create table public.client_portal_requests');
  const tableEnd=source.indexOf(');',tableStart);
  const table=tableStart>=0&&tableEnd>tableStart?source.slice(tableStart,tableEnd):'';
  for(const forbidden of [' amount ',' currency ',' invoice_total ',' balance_due ']){
    if(table.toLowerCase().includes(forbidden))out.push(`shadow-finance:${forbidden.trim()}`);
  }

  if(!/create\s+or\s+replace\s+function\s+private\.save_client_portal_request_v1_impl\s*\([\s\S]*?p_valid_until\s+timestamptz,p_resource_share_id\s+uuid[\s\S]*?security\s+definer\s+set\s+search_path=''/i.test(source))out.push('save-signature');
  return out;
}

test('governed request source passes the destructive contract',()=>{
  assert.deepEqual(violations(sql),[]);
});

test('each request kind maps to one exact client permission',()=>{
  const expected=new Map([
    ['document','upload_requested_document'],
    ['approval','approve_document'],
    ['information','message'],
    ['appointment','confirm_appointment'],
    ['payment','view_finance'],
  ]);
  for(const [kind,permission] of expected){
    assert.ok(sql.includes(`when '${kind}' then '${permission}'`),`${kind} mapping drifted`);
  }
});

test('approval requests are anchored to an active published document for the same client and transaction',()=>{
  for(const marker of [
    's.workspace_id=p_workspace_id and s.id=p_resource_share_id',
    's.principal_id=p_principal_id and s.transaction_id=p_transaction_id',
    "s.resource_type='document' and s.document_id is not null",
    's.revoked_at is null and s.valid_from<=now()',
    '(s.valid_until is null or s.valid_until>now())',
  ]) assert.ok(sql.includes(marker),marker);
});

test('client-safe request payload excludes server authority and audit provenance',()=>{
  const model=finalModel();
  for(const safe of [
    "'id',r.id","'transactionId',r.transaction_id","'requestType',r.request_type","'title',r.title",
    "'instructions',r.instructions","'dueAt',r.due_at","'status',r.status","'resourceShareId',r.resource_share_id",
    "'createdAt',r.created_at","'updatedAt',r.updated_at",
  ]) assert.ok(model.includes(safe),safe);
  for(const forbidden of ['requiredPermission','createdBy','revokedAt','revokedBy','version','auditDetails','amount']){
    assert.ok(!model.includes(`'${forbidden}'`),forbidden);
  }
});

test('explicit revocation and permission removal permanently retire matching requests with audit',()=>{
  for(const marker of [
    'old.revoked_at is null and new.revoked_at is not null',
    'r.required_permission=any(old.permissions)',
    'not (r.required_permission=any(new.permissions))',
    "'transaction_grant_revoked_or_retargeted'",
    "'required_permission_removed'",
    "'approval_resource_unshared'",
    'perform private.record_client_portal_request_audit_v1',
  ]) assert.ok(sql.includes(marker),marker);
});

test('request retry identity is stable and conflicting replay fails closed',()=>{
  assert.ok(sql.includes('v_from:=coalesce(p_valid_from,v_request.valid_from)'));
  assert.ok(sql.includes("v_request.resource_share_id is distinct from p_resource_share_id"));
  assert.ok(sql.includes("'wasDuplicate',true"));
  assert.ok(sql.includes('ENJAZ_PORTAL_REQUEST_ID_CONFLICT'));
  assert.ok(sql.includes('ENJAZ_PORTAL_REQUEST_EXPECTED_VERSION_REQUIRED'));
  assert.ok(sql.includes('ENJAZ_PORTAL_REQUEST_STALE'));
});

test('B does not expose direct request table DML or client fulfilment commands',()=>{
  assert.doesNotMatch(sql,/grant\s+(select|insert|update|delete|all)[\s\S]{0,180}public\.client_portal_requests/i);
  assert.doesNotMatch(sql,/create\s+or\s+replace\s+function\s+public\.(fulfill|complete|respond|approve)_client_portal_request/i);
});

test('destruction: removing RLS is detected',()=>{
  const broken=sql.replace('alter table public.client_portal_requests enable row level security;','');
  assert.ok(violations(broken).includes('missing:rls'));
});

test('destruction: weakening document request permission is detected',()=>{
  const broken=sql.replace("request_type='document' and required_permission='upload_requested_document'","request_type='document' and required_permission='view'");
  assert.ok(violations(broken).includes('missing:document-permission'));
});

test('destruction: removing approval share binding is detected',()=>{
  const broken=sql.replace("request_type='approval' and required_permission='approve_document' and resource_share_id is not null","request_type='approval' and required_permission='approve_document'");
  assert.ok(violations(broken).includes('missing:approval-permission-share'));
});

test('destruction: leaking requiredPermission in the payload is detected',()=>{
  const target="'requestType',r.request_type,";
  const broken=sql.replace(target,`${target}'requiredPermission',r.required_permission,`);
  assert.ok(violations(broken).includes("leak:'requiredPermission'"));
});

test('destruction: direct authenticated request table SELECT is detected',()=>{
  const broken=sql.replace('commit;','grant select on table public.client_portal_requests to authenticated;\ncommit;');
  assert.ok(violations(broken).includes('direct-table-grant'));
});

test('destruction: removing auto-revocation trigger is detected',()=>{
  const broken=sql.replace('create trigger client_portal_requests_revoke_on_grant_change','create trigger BROKEN_client_portal_requests_revoke_on_grant_change');
  assert.ok(violations(broken).includes('missing:grant-revoke-trigger'));
});
