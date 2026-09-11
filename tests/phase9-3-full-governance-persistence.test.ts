import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync('database/migrations/phase_9_3_full_governance_registry.sql','utf8');
const has=(x:string)=>assert.ok(sql.includes(x),`missing ${x}`);

test('full M2 persistence covers beneficial owners, authority, resolutions, capital and unified timeline',()=>{
  for(const x of ['create table public.corporate_registry_states','create table public.corporate_beneficial_owners','create table public.corporate_authority_grants','create table public.corporate_resolutions','create table public.corporate_capital_events',"'beneficial_owner.snapshot'","'authority.grant'","'authority.revoke'","'resolution.record'","'capital.change'"]) has(x);
});

test('all new public governance tables are RLS read-only to authenticated browser roles',()=>{
  for(const t of ['corporate_registry_states','corporate_beneficial_owners','corporate_authority_grants','corporate_resolutions','corporate_capital_events']) { has(`alter table public.${t} enable row level security`); has(`revoke all on table public.${t} from anon,authenticated`); has(`grant select on table public.${t} to authenticated`); }
  assert.doesNotMatch(sql,/grant\s+(?:insert|update|delete)[^;]+to authenticated/i);
});

test('party identity is reused through composite workspace foreign keys and active-contact checks',()=>{
  has('references public.companies(workspace_id,id)'); has('references public.contacts(workspace_id,id)'); has("c.workspace_id=p_workspace_id and c.id=p_contact_id and c.deleted_at is null and c.status='active'");
  assert.doesNotMatch(sql,/create table public\.(?:governance_people|governance_companies|shadow_)/i);
});

test('beneficial-owner register is effective-dated, replay safe, optimistic and allows explicit empty snapshot',()=>{
  for(const x of ['replace_company_beneficial_owners_v1_impl','ENJAZ_BENEFICIAL_OWNER_STALE','ENJAZ_GOVERNANCE_OPERATION_REUSED','last_beneficial_owner_effective_from','daterange(x.effective_from,x.effective_to',"v_count:=jsonb_array_length(p_entries)"]) has(x);
  assert.ok(sql.includes('if v_count>100'), 'empty snapshot must not be rejected');
});

test('authority grants and revocations preserve history and cannot overlap same person-role period',()=>{
  for(const x of ['grant_company_authority_v1_impl','revoke_company_authority_v1_impl','ENJAZ_AUTHORITY_STALE','ENJAZ_AUTHORITY_PERIOD_CONFLICT',"governance_role in ('director','manager','authorized_person')","end_reason='revoked'","end_reason='expiry'"]) has(x);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.corporate_authority_grants/i);
});

test('resolutions are immutable append-only governance evidence with version and operation replay guards',()=>{
  for(const x of ['record_company_resolution_v1_impl','corporate_resolutions_operation_key','ENJAZ_RESOLUTION_STALE',"'corporate_resolution.recorded'"]) has(x);
  assert.doesNotMatch(sql,/(?:update|delete\s+from)\s+public\.corporate_resolutions/i);
});

test('capital history synchronizes authoritative company capital and rejects bypass writes',()=>{
  for(const x of ['companies_governed_capital_guard','ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND','record_company_capital_event_v1_impl',"set_config('enjaz.governance_capital_write','allowed',true)",'update public.companies set capital=v_after','ENJAZ_CAPITAL_STALE','ENJAZ_CAPITAL_EFFECTIVE_ORDER_INVALID']) has(x);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.corporate_capital_events/i);
});

test('sensitive writes are owner-only security-definer internals with pinned search_path and invoker public APIs',()=>{
  assert.ok((sql.match(/private\.require_organization_owner_v1/g)??[]).length>=5);
  assert.ok((sql.match(/security definer set search_path=''/g)??[]).length>=5);
  const publicApis=['replace_company_beneficial_owners_v1','grant_company_authority_v1','revoke_company_authority_v1','record_company_resolution_v1','record_company_capital_event_v1','get_company_governance_context_v1'];
  for(const rpc of publicApis) {
    has(`function public.${rpc}`);
    const start=sql.indexOf(`function public.${rpc}`), end=sql.indexOf('$$;',start);
    const body=sql.slice(start,end);
    assert.match(body,/security invoker/);
    assert.match(body,/set search_path=''/);
  }
});

test('unified as-of context exposes current/historical ownership, governance domains and derived risk alerts',()=>{
  for(const x of ["'enjaz.governance-context.v1'",'private.get_company_ownership_snapshot_v1_impl','beneficialOwners','authorities','resolutions','capital','timeline','risks','OWNERSHIP_NOT_CONFIGURED','BENEFICIAL_OWNER_MISSING','REPRESENTATION_AUTHORITY_MISSING','AUTHORITY_EXPIRING']) has(x);
});

test('M2 persistence remains bounded and indexed for company timelines and actor/contact foreign keys',()=>{
  for(const x of ['corporate_beneficial_owners_company_asof_idx','corporate_beneficial_owners_contact_history_idx','corporate_beneficial_owners_created_by_fk_idx','corporate_authority_grants_company_asof_idx','corporate_authority_grants_contact_history_idx','corporate_authority_grants_created_by_fk_idx','corporate_resolutions_timeline_idx','corporate_resolutions_actor_user_id_fk_idx','corporate_capital_events_timeline_idx','corporate_capital_events_actor_user_id_fk_idx','limit 50','limit 100']) has(x);
});
