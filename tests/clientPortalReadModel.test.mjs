import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_safe_read_model.sql',import.meta.url),'utf8');
const hardening=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_safe_read_model_hardening.sql',import.meta.url),'utf8');
const start=sql.indexOf('create or replace function private.get_client_portal_read_model_v1_impl');
const end=sql.indexOf('create or replace function public.get_client_portal_read_model_v1',start);
const model=sql.slice(start,end);

const has=(source,value)=>assert.ok(source.includes(value),`missing contract: ${value}`);

test('child resources are publication metadata, not shadow domain stores',()=>{
  has(sql,'create table public.client_portal_resource_shares');
  assert.doesNotMatch(sql,/create\s+table\s+public\.client_portal_(documents|payments|companies|transactions)/i);
  has(sql,"resource_type in ('document','receipt')");
});

test('resource publication requires an exact active transaction grant',()=>{
  has(sql,"g.target_type='transaction'");
  has(sql,'g.transaction_id=p_transaction_id');
  has(sql,'g.revoked_at is null');
  has(sql,'g.valid_from<=now()');
  has(sql,'p_permission=any(g.permissions)');
  has(sql,"v_permission:='view_finance'");
});

test('document publication only accepts ready documents on a real transaction',()=>{
  has(sql,"d.transaction_id is not null and d.status='ready'");
  has(model,"s.resource_type='document'");
  has(model,"d.id=s.document_id and d.transaction_id=s.transaction_id");
});

test('receipt publication and projection require view_finance',()=>{
  has(model,"s.resource_type='receipt'");
  has(model,"private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view_finance')");
  assert.doesNotMatch(model,/financial_ledger_entries|cashbox_accounts|fee_changes/i);
});

test('transaction projection is minimal and canonical',()=>{
  for(const field of ["'id',t.id","'companyId',t.company_id","'type',t.type","'status',t.status","'createdAt',t.created_at","'updatedAt',t.updated_at","'completedAt',t.completed_at"]) has(model,field);
  for(const forbidden of ["'priority'","'currentFee'","'department'","'primaryContactId'","'deletionReason'","'legacyId'"]) assert.equal(model.includes(forbidden),false,forbidden);
});

test('document projection excludes storage and OCR intelligence',()=>{
  for(const forbidden of ['storage_path','checksum','document_analysis','ocr_text','extracted_fields','classification','confidence']) assert.equal(model.includes(forbidden),false,forbidden);
});

test('read model never joins internal transaction operations or risk/intelligence',()=>{
  for(const forbidden of ['transaction_notes','transaction_routes','transaction_followups','transaction_blockers','risk_signals','intelligence_snapshots']) assert.equal(model.includes(forbidden),false,forbidden);
});

test('requests fail closed until a governed request source exists',()=>{
  has(model,"'requests','[]'::jsonb");
  has(model,"'requestProjectionStatus','PENDING_GOVERNED_CLIENT_REQUEST_SOURCE'");
});

test('direct resource-share table browser access is closed',()=>{
  has(sql,'alter table public.client_portal_resource_shares enable row level security');
  has(sql,'revoke all on table public.client_portal_resource_shares from public,anon,authenticated');
});

test('grant revocation cannot resurrect previously published children',()=>{
  has(hardening,'client_portal_revoke_child_shares_on_grant_change_v1');
  has(hardening,'old.revoked_at is null and new.revoked_at is not null');
  has(hardening,"s.revoked_at is null");
  has(hardening,"'client_portal.resource.auto_unshared'");
});

test('removing finance permission permanently unshares receipts',()=>{
  has(hardening,"old.permissions @> array['view_finance']::text[]");
  has(hardening,"not (new.permissions @> array['view_finance']::text[])");
  has(hardening,"s.resource_type='receipt'");
});

test('share mutation helpers are not directly callable except guarded implementations',()=>{
  for(const helper of ['require_client_portal_shareable_principal_v1','client_portal_principal_has_grant_v1','record_client_portal_share_audit_v1']){
    assert.match(sql,new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${helper}[\\s\\S]{0,220}from\\s+public,anon,authenticated`,'i'));
  }
  assert.match(hardening,/revoke\s+all\s+on\s+function\s+private\.client_portal_revoke_child_shares_on_grant_change_v1\(\)[\s\S]*?from\s+public,anon,authenticated;/i);
});
