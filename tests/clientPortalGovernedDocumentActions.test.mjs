import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_governed_document_actions.sql',import.meta.url),'utf8');
const hardening=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_governed_document_actions_hardening.sql',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('../supabase/functions/enjaz-document-vault/index.ts',import.meta.url),'utf8');
const has=(source,value)=>assert.ok(source.includes(value),`missing contract: ${value}`);

function functionBlock(source,name,nextName){
  const start=source.indexOf(`create or replace function ${name}`);
  if(start<0)return '';
  const end=nextName?source.indexOf(`create or replace function ${nextName}`,start):source.length;
  return source.slice(start,end<0?source.length:end);
}

function violations(source){
  const out=[];
  const need=(marker,label=marker)=>{if(!source.includes(marker))out.push(`missing:${label}`)};
  for(const table of ['client_portal_requested_document_uploads','client_portal_document_approval_targets','client_portal_document_approval_responses']){
    need(`create table public.${table}`,`${table}-table`);
    need(`alter table public.${table} enable row level security`,`${table}-rls`);
    need(`revoke all on table public.${table} from public,anon,authenticated`,`${table}-browser-revoke`);
  }
  const prepare=functionBlock(source,'private.prepare_client_portal_requested_document_v1_impl','public.prepare_client_portal_requested_document_v1');
  if(!prepare.includes("v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document'"))out.push('missing:upload-request-authority');
  const approval=functionBlock(source,'private.respond_client_portal_document_approval_v1_impl','public.respond_client_portal_document_approval_v1');
  if(!approval.includes("v_request.request_type<>'approval' or v_request.required_permission<>'approve_document'"))out.push('missing:approval-request-authority');
  need('private.review_document_draft_canonical_v1','document-factory-canonical-boundary');
  need("p_actor_source not in ('staff_owner','client_portal')",'document-factory-actor-source');
  need("private.require_client_portal_owner_v1(p_workspace_id)",'staff-binding-owner-authority');
  need('private.get_client_portal_read_model_v4_impl','read-model-v4');
  if(/insert\s+into\s+public\.(workspace_memberships|organization_members|transaction_notes|financial_ledger_entries)/i.test(source))out.push('foreign-authority-write');
  if(/grant\s+(select|insert|update|delete|all)[\s\S]{0,220}public\.client_portal_(requested_document_uploads|document_approval_targets|document_approval_responses)/i.test(source))out.push('direct-action-table-grant');
  if(/service_role/i.test(source))out.push('service-role-in-database-migration');
  return out;
}

function hardeningViolations(source){
  const out=[];
  for(const [marker,label] of [
    ['create or replace function private.enforce_client_portal_vault_ack_authority_v1','ack-authority-helper'],
    ['before insert on public.document_versions','document-version-trigger'],
    ["v_request.required_permission<>'upload_requested_document'",'request-permission-recheck'],
    ["v_request.status<>'open'",'request-status-recheck'],
    ["private.client_portal_principal_has_grant_v1(",'grant-recheck'],
    ["'upload_requested_document'",'upload-permission'],
    ["p.status='active' and p.revoked_at is null",'principal-recheck'],
    ['workspace_memberships','staff-collision-recheck'],
    ['organization_members','workforce-collision-recheck'],
    ['revoke all on function private.enforce_client_portal_vault_ack_authority_v1() from public,anon,authenticated','helper-browser-revoke'],
  ]) if(!source.includes(marker))out.push(`missing:${label}`);
  return out;
}

test('C2 action metadata is RLS-enabled and browser-table closed',()=>{
  assert.deepEqual(violations(sql),[]);
});

test('requested-document prepare derives exact case scope from the governed request',()=>{
  has(sql,"v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id)");
  has(sql,"v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document'");
  has(sql,'v_request.transaction_id');
  has(sql,'v_tx.company_id');
  assert.doesNotMatch(sql,/prepare_client_portal_requested_document_v1_impl[\s\S]{0,500}p_company_id/i);
  assert.doesNotMatch(sql,/prepare_client_portal_requested_document_v1_impl[\s\S]{0,500}p_transaction_id/i);
});

test('portal upload creates only canonical Vault session/document records plus action metadata',()=>{
  has(sql,'insert into public.documents(');
  has(sql,'insert into public.document_upload_sessions(');
  has(sql,'insert into public.client_portal_requested_document_uploads(');
  has(sql,"'enjaz-documents-private'");
  has(sql,"'document.upload.prepared'");
  has(sql,"'client_portal.document_upload.prepared'");
  assert.doesNotMatch(sql,/create\s+table\s+public\.client_portal_(documents|document_versions)/i);
});

test('Vault terminal state synchronizes portal upload state and failed uploads may be retried safely',()=>{
  has(sql,'create trigger client_portal_upload_session_sync');
  has(sql,"new.state='failed'");
  has(sql,"new.state='acknowledged'");
  has(sql,"where status in ('prepared','acknowledged')");
  has(sql,"set status='failed',failed_at=coalesce(failed_at,now())");
});

test('portal upload completion requires canonical checksum-bound Vault acknowledgement before fulfilling request',()=>{
  has(sql,"v_session.state<>'acknowledged'");
  has(sql,"d.status='ready'");
  has(sql,"'client_portal.document_upload.acknowledged'");
  has(sql,"'client_portal.request.fulfilled','document_vault_acknowledgement'");
  has(sql,'ENJAZ_PORTAL_UPLOAD_REQUEST_CHANGED');
});

test('Vault acknowledgement re-proves live portal authority inside the authoritative document-version transaction',()=>{
  assert.deepEqual(hardeningViolations(hardening),[]);
  has(hardening,"v_session.state<>'prepared'");
  has(hardening,'new.uploaded_by<>v_upload.actor_user_id');
  has(hardening,'ENJAZ_PORTAL_VAULT_ACK_PERMISSION_REVOKED');
  has(hardening,'ENJAZ_PORTAL_VAULT_ACK_PRINCIPAL_INVALID');
});

test('edge function reuses hardened stored-byte inspection and service-only acknowledgement for portal uploads',()=>{
  has(edge,"action==='portal-prepare'");
  has(edge,"prepare_client_portal_requested_document_v1");
  has(edge,"action==='portal-acknowledge'");
  has(edge,"get_client_portal_document_upload_claim_v1");
  has(edge,'inspectStoredBinary(admin,expected)');
  has(edge,"admin.rpc('acknowledge_document_upload_v2'");
  has(edge,"complete_client_portal_requested_document_v1");
  has(edge,"createSignedUploadUrl(expected.path,{upsert:false})");
});

test('Document Factory owner review and portal review share one canonical transition',()=>{
  has(sql,'create or replace function private.review_document_draft_canonical_v1');
  has(sql,"p_actor_source not in ('staff_owner','client_portal')");
  has(sql,'private.assert_document_factory_provenance_current_v1');
  has(sql,'ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT');
  has(sql,"'document.factory.approved'");
  has(sql,"'document.factory.returned'");
  has(sql,"return private.review_document_draft_canonical_v1(p_workspace_id,p_draft_id,p_decision,p_note,v_actor,'staff_owner')");
  has(sql,"v_comment,v_actor,'client_portal'");
});

test('only staff owner can bind an approval request to a Document Factory draft',()=>{
  const start=sql.indexOf('create or replace function private.bind_client_portal_approval_draft_v1_impl');
  const end=sql.indexOf('create or replace function public.bind_client_portal_approval_draft_v1',start);
  const block=sql.slice(start,end);
  has(block,'private.require_client_portal_owner_v1(p_workspace_id)');
  has(block,"v_request.request_type<>'approval'");
  has(block,"v_draft.transaction_id is distinct from v_request.transaction_id");
  has(block,"v_draft.status<>'review_required'");
  has(block,'ENJAZ_PORTAL_APPROVAL_TARGET_CONFLICT');
});

test('client approval is exact request/share/document scoped and idempotent',()=>{
  has(sql,"v_request.request_type<>'approval' or v_request.required_permission<>'approve_document'");
  has(sql,"s.id=v_request.resource_share_id");
  has(sql,"s.principal_id=v_request.principal_id and s.transaction_id=v_request.transaction_id");
  has(sql,"s.resource_type='document' and s.document_id is not null");
  has(sql,"d.id=v_share.document_id");
  has(sql,'ENJAZ_PORTAL_APPROVAL_IDEMPOTENCY_CONFLICT');
  has(sql,'ENJAZ_PORTAL_APPROVAL_ALREADY_RESPONDED');
  has(sql,"set status='fulfilled',version=version+1,updated_at=now()");
  has(sql,"'client_portal.document_approval.responded'");
});

test('v4 read model exposes no storage authority, draft binding or actor metadata',()=>{
  const start=sql.indexOf('create or replace function private.get_client_portal_read_model_v4_impl');
  const end=sql.indexOf('create or replace function public.get_client_portal_read_model_v1',start);
  const model=sql.slice(start,end);
  for(const marker of [
    'v_base:=private.get_client_portal_read_model_v3_impl(p_workspace_id)',
    "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',u.transaction_id,'upload_requested_document')",
    "private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'approve_document')",
    "'{documentUploads}'","'{documentApprovalResponses}'",
    "'documentFactoryApplied',a.document_factory_applied",
  ]) assert.ok(model.includes(marker),marker);
  for(const forbidden of ['storage_path','checksum','actor_user_id','draft_id','resource_share_id','created_by','approved_by']){
    assert.equal(model.includes(forbidden),false,forbidden);
  }
  assert.equal(model.includes("'principalId'"),false,'principalId must not be projected even though principal_id is used internally to filter rows');
});

test('new public commands have explicit authenticated execution and no default browser table authority',()=>{
  for(const fn of [
    'prepare_client_portal_requested_document_v1','get_client_portal_document_upload_claim_v1',
    'complete_client_portal_requested_document_v1','bind_client_portal_approval_draft_v1',
    'respond_client_portal_document_approval_v1'
  ]){
    has(sql,`revoke all on function public.${fn}`);
    has(sql,`grant execute on function public.${fn}`);
  }
});

test('destruction: removing upload request permission check is detected',()=>{
  const broken=sql.replace("v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document'",'false');
  assert.ok(violations(broken).includes('missing:upload-request-authority'));
});

test('destruction: removing canonical Document Factory boundary is detected',()=>{
  const broken=sql.replaceAll('private.review_document_draft_canonical_v1','private.fake_portal_review');
  assert.ok(violations(broken).includes('missing:document-factory-canonical-boundary'));
});

test('destruction: removing same-transaction Vault grant recheck is detected',()=>{
  const broken=hardening.replace('private.client_portal_principal_has_grant_v1(','private.fake_grant_check(');
  assert.ok(hardeningViolations(broken).includes('missing:grant-recheck'));
});

test('destruction: direct browser grant to portal upload table is detected',()=>{
  const broken=sql.replace('commit;','grant select on table public.client_portal_requested_document_uploads to authenticated;\ncommit;');
  assert.ok(violations(broken).includes('direct-action-table-grant'));
});

test('destruction: staff membership write from portal migration is detected',()=>{
  const broken=sql.replace('commit;','insert into public.workspace_memberships(workspace_id,user_id) values(null,null);\ncommit;');
  assert.ok(violations(broken).includes('foreign-authority-write'));
});