import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_authority.sql',import.meta.url),'utf8');
const hardening=fs.readFileSync(new URL('../database/migrations/phase_11_3_client_portal_authority_hardening.sql',import.meta.url),'utf8');

const has=(value)=>assert.ok(sql.includes(value),`missing SQL contract: ${value}`);

test('external principal cannot overlap same-workspace staff trust roots',()=>{
  has("ENJAZ_PORTAL_STAFF_TRUST_COLLISION");
  has("ENJAZ_PORTAL_WORKFORCE_TRUST_COLLISION");
  assert.doesNotMatch(sql,/insert\s+into\s+public\.workspace_memberships/i);
  assert.doesNotMatch(sql,/insert\s+into\s+public\.organization_members/i);
});

test('grants are exact object grants and company access is not transaction access',()=>{
  has("target_type in ('company','transaction')");
  has("(target_type='company' and company_id is not null and transaction_id is null)");
  has("(target_type='transaction' and company_id is null and transaction_id is not null)");
  has("(p_target_type='company' and g.company_id=p_target_id)");
  has("(p_target_type='transaction' and g.transaction_id=p_target_id)");
  assert.doesNotMatch(sql,/join\s+public\.transactions[\s\S]{0,300}g\.company_id/i);
});

test('revoked and expired grants fail closed',()=>{
  has('and g.revoked_at is null');
  has('and g.valid_from<=now()');
  has('and (g.valid_until is null or g.valid_until>now())');
  has('set revoked_at=coalesce(revoked_at,now())');
});

test('permission vocabulary is closed and view is mandatory',()=>{
  has("array['view','upload_requested_document','approve_document','message','confirm_appointment','view_finance']::text[]");
  has("'view'=any(permissions)");
  has("ENJAZ_PORTAL_GRANT_PERMISSIONS_INVALID");
});

test('browser roles receive no direct portal authority-table privileges',()=>{
  has('revoke all on table public.client_portal_principals,public.client_portal_grants,public.client_portal_authority_events');
  has('from public,anon,authenticated;');
  assert.doesNotMatch(sql,/grant\s+(select|insert|update|delete|all)[\s\S]{0,180}public\.client_portal_(principals|grants|authority_events)/i);
});

test('internal authority event writer is not callable by authenticated clients',()=>{
  assert.match(hardening,/revoke\s+all\s+on\s+function\s+private\.record_client_portal_authority_event_v1\(uuid,uuid,uuid,uuid,text,text,jsonb\)[\s\S]*?from\s+authenticated;/i);
});

test('portal authority does not grant or alter core tables',()=>{
  assert.doesNotMatch(sql,/alter\s+table\s+public\.(companies|transactions|documents|payments|financial_ledger_entries)\b/i);
  assert.doesNotMatch(sql,/grant\s+(select|insert|update|delete|all)[\s\S]{0,180}public\.(companies|transactions|documents|payments|financial_ledger_entries)/i);
});

test('every authority mutation is auditable',()=>{
  has('insert into public.client_portal_authority_events');
  has('insert into public.audit_events');
  has("'client_portal.'||p_event_type");
  has("'principal.revoked'");
  has("'grant.revoked'");
});

test('public surface is authenticated RPC only and private implementations fix search_path',()=>{
  for(const fn of ['save_client_portal_principal_v1','save_client_portal_grant_v1','revoke_client_portal_grant_v1','list_client_portal_workspaces_v1','get_client_portal_authority_v1','get_client_portal_admin_authority_v1']){
    has(`revoke all on function public.${fn}`);
    has(`grant execute on function public.${fn}`);
  }
  assert.match(sql,/create\s+or\s+replace\s+function\s+private\.require_client_portal_owner_v1[\s\S]*?security\s+definer\s+set\s+search_path=''/i);
  assert.match(sql,/create\s+or\s+replace\s+function\s+private\.require_client_portal_principal_v1[\s\S]*?security\s+definer\s+set\s+search_path=''/i);
});
