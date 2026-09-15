import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_governed_document_actions_hardening.sql',import.meta.url),'utf8');
const has=(source,value)=>assert.ok(source.includes(value),`missing hardening contract: ${value}`);

function projectionViolations(source){
  const out=[];
  for(const [marker,label] of [
    ['join public.client_portal_resource_shares s','approval-share-join'],
    ['s.id=a.resource_share_id','exact-share-id'],
    ['s.principal_id=a.principal_id','same-principal'],
    ['s.transaction_id=a.transaction_id','same-transaction'],
    ["s.resource_type='document'",'document-share-only'],
    ['s.document_id=a.document_id','same-document'],
    ['s.revoked_at is null','share-not-revoked'],
    ['s.valid_from<=now()','share-started'],
    ['(s.valid_until is null or s.valid_until>now())','share-not-expired'],
    ["private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'approve_document')",'approval-grant'],
  ]) if(!source.includes(marker))out.push(`missing:${label}`);
  return out;
}

test('approval action projection inherits the exact live document publication boundary',()=>{
  assert.deepEqual(projectionViolations(sql),[]);
});

test('approval projection still exposes only safe response fields',()=>{
  const start=sql.indexOf('create or replace function private.get_client_portal_read_model_v4_impl');
  const end=sql.indexOf('revoke all on function private.get_client_portal_read_model_v4_impl',start);
  assert.ok(start>=0&&end>start,'hardened v4 read model missing');
  const model=sql.slice(start,end);
  for(const key of ["'id'","'requestId'","'transactionId'","'documentId'","'decision'","'comment'","'documentFactoryApplied'","'respondedAt'"]){
    has(model,key);
  }
  for(const projected of ["'storagePath'","'checksum'","'actorUserId'","'principalId'","'draftId'","'resourceShareId'","'createdBy'","'approvedBy'"]){
    assert.equal(model.includes(projected),false,`forbidden projected key: ${projected}`);
  }
});

test('destruction: removing the active-share join is detected',()=>{
  const broken=sql.replace('join public.client_portal_resource_shares s','join public.client_portal_document_approval_responses s');
  assert.ok(projectionViolations(broken).includes('missing:approval-share-join'));
});

test('destruction: allowing revoked document shares is detected',()=>{
  const broken=sql.replace('s.revoked_at is null','true');
  assert.ok(projectionViolations(broken).includes('missing:share-not-revoked'));
});

test('destruction: dropping document identity binding is detected',()=>{
  const broken=sql.replace('s.document_id=a.document_id','s.document_id is not null');
  assert.ok(projectionViolations(broken).includes('missing:same-document'));
});

test('Vault acknowledgement hardening remains transaction-local and fail closed',()=>{
  for(const marker of [
    'before insert on public.document_versions',
    "v_request.status<>'open'",
    "v_request.required_permission<>'upload_requested_document'",
    'private.client_portal_principal_has_grant_v1(',
    'ENJAZ_PORTAL_VAULT_ACK_PERMISSION_REVOKED',
    'ENJAZ_PORTAL_VAULT_ACK_PRINCIPAL_INVALID',
  ]) has(sql,marker);
});
