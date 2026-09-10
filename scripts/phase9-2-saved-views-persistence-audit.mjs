import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const fail = (message) => { throw new Error(`Phase 9.2 Saved Views persistence audit: ${message}`); };
const must = (text, marker, label) => { if (!text.includes(marker)) fail(`${label} missing ${marker}`); };

const legacyGuard = read('database/migrations/phase_9_2_00_saved_views_legacy_guard.sql');
const sql = read('database/migrations/phase_9_2_saved_views_search_intelligence.sql');
const fkHardening = read('database/migrations/phase_9_2_saved_views_fk_index_hardening.sql');
const tests = read('tests/phase9-2-saved-views-persistence.test.ts');
const state = JSON.parse(read('docs/PHASE9_2_STATE.json'));

for (const marker of [
  "to_regclass('public.saved_views') is null",
  "column_name='owner_user_id'",
  "column_name='definition'",
  "column_name='operation_id'",
  "execute 'select count(*) from public.saved_views' into v_row_count",
  'ENJAZ_SAVED_VIEWS_LEGACY_DATA_REQUIRES_MANUAL_MIGRATION',
  'drop table public.saved_views',
  'Intentionally no CASCADE',
]) must(legacyGuard, marker, 'legacy upgrade guard');
if (/drop\s+table\s+public\.saved_views\s+cascade/i.test(legacyGuard)) fail('legacy upgrade guard must never CASCADE');
if (!/if\s+v_row_count<>0\s+then[\s\S]*ENJAZ_SAVED_VIEWS_LEGACY_DATA_REQUIRES_MANUAL_MIGRATION[\s\S]*end if;[\s\S]*drop table public\.saved_views/i.test(legacyGuard)) fail('legacy rows are not protected before table replacement');

for (const marker of [
  'create table public.saved_views',
  "domain text not null check (domain in ('transactions','companies','people','procedures','documents'))",
  "visibility text not null default 'personal' check (visibility in ('personal','team','workspace'))",
  'definition jsonb not null',
  "jsonb_typeof(definition->'schema')='string'",
  "definition->>'schema'='enjaz.saved-view.v1'",
  "jsonb_typeof(definition->'domain')='string'",
  "definition->>'domain'=domain",
  'saved_views_owner_name_active_unique',
  'saved_views_operation_unique',
  'saved_views_visible_lookup_idx',
  'alter table public.saved_views enable row level security',
  'create policy saved_views_select_authorized',
  'revoke all on table public.saved_views from anon,authenticated',
  'grant select on table public.saved_views to authenticated',
  'private.can_access_organization_scope_v1',
  'private.can_manage_organization_scope_v1',
  'private.is_organization_owner_v1',
  'private.current_organization_member_id_v1',
  'private.require_organization_actor_v1',
  'private.validate_saved_view_definition_v1',
  'private.save_saved_view_v1_impl',
  'private.delete_saved_view_v1_impl',
  'public.save_saved_view_v1',
  'public.delete_saved_view_v1',
  'public.list_saved_views_v1',
  "security invoker set search_path=''",
  "security definer set search_path=''",
  'ENJAZ_SAVED_VIEW_STALE',
  'ENJAZ_SAVED_VIEW_OPERATION_REUSED',
  'deleted_at=now()',
  "'saved_view.created'",
  "'saved_view.updated'",
  "'saved_view.deleted'",
]) must(sql, marker, 'migration');

for (const marker of ['create index saved_views_owner_user_fk_idx','on public.saved_views(owner_user_id)']) must(fkHardening, marker, 'FK hardening');
if (/drop\s+index/i.test(fkHardening)) fail('FK hardening must not remove an existing index');

if (!/jsonb_typeof\(p_definition->'schema'\)<>\s*'string'[\s\S]*p_definition->>'schema'<>\s*'enjaz\.saved-view\.v1'/i.test(sql)) fail('JSON null/invalid schema is not rejected explicitly');
if (!/jsonb_typeof\(p_definition->'domain'\)<>\s*'string'[\s\S]*p_definition->>'domain'\s+not\s+in\s*\('transactions','companies','people','procedures','documents'\)/i.test(sql)) fail('JSON null/invalid domain is not rejected explicitly');

if (/create\s+policy\s+\S+\s+on\s+public\.saved_views\s+for\s+(insert|update|delete|all)/i.test(sql)) fail('direct saved_views mutation policy detected');
if (/grant\s+(?:insert|update|delete|all)[\s\S]*?on\s+table\s+public\.saved_views/i.test(sql)) fail('direct saved_views mutation grant detected');
if (/\bservice_role\b/i.test(sql)) fail('service_role marker detected');
if (/alter\s+table\s+public\.workspace_memberships/i.test(sql) || /insert\s+into\s+public\.workspace_memberships/i.test(sql) || /update\s+public\.workspace_memberships/i.test(sql) || /delete\s+from\s+public\.workspace_memberships/i.test(sql)) fail('legacy workspace membership escalation detected');

for (const table of ['transactions','companies','contacts','payments','payment_reversals','financial_ledger_entries','cashbox_accounts','workflow_instances','automation_rules','automation_executions']) {
  const mutation = new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`, 'i');
  if (mutation.test(sql)) fail(`source-business mutation detected: ${table}`);
}

for (const fn of ['save_saved_view_v1','delete_saved_view_v1','list_saved_views_v1']) {
  const body = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\s*\\([\\s\\S]*?\\$\\$;`, 'i'))?.[0];
  if (!body) fail(`public function missing: ${fn}`);
  if (!/security\s+invoker\s+set\s+search_path\s*=\s*''/i.test(body) || /security\s+definer/i.test(body)) fail(`public function authority drift: ${fn}`);
}
for (const fn of ['can_read_saved_view_v1','require_saved_view_share_authority_v1','save_saved_view_v1_impl','delete_saved_view_v1_impl']) {
  const body = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.${fn}\\s*\\([\\s\\S]*?\\$\\$;`, 'i'))?.[0];
  if (!body || !/security\s+definer\s+set\s+search_path\s*=\s*''/i.test(body)) fail(`private privileged function must pin empty search_path: ${fn}`);
}

for (const marker of [
  "revoke execute on function private.validate_saved_view_definition_v1(jsonb) from public,anon,authenticated",
  "revoke execute on function private.save_saved_view_v1_impl(uuid,uuid,integer,uuid,text,text,uuid,jsonb) from public,anon,authenticated",
  "grant execute on function private.save_saved_view_v1_impl(uuid,uuid,integer,uuid,text,text,uuid,jsonb) to authenticated",
  "revoke execute on function public.save_saved_view_v1(uuid,uuid,integer,uuid,text,text,uuid,jsonb) from public,anon,authenticated",
  "grant execute on function public.save_saved_view_v1(uuid,uuid,integer,uuid,text,text,uuid,jsonb) to authenticated",
]) must(sql, marker, 'function privilege contract');

for (const marker of [
  'saved_views is definition-only persistence with strict schema/domain JSON guards',
  'saved_views exposes SELECT only and every visible row is RLS-authorized',
  'personal, team and workspace reads reuse authenticated M15 authority without legacy membership escalation',
  'team sharing requires management authority and workspace sharing requires owner authority',
  'saved-view writes are RPC-bound, optimistic, replay-safe and soft-delete only',
  'no exposed public SECURITY DEFINER or unrestricted function execution authority exists',
  'persistence migration cannot mutate source business truth',
  'persistence indexes and constraints preserve workspace ownership and bounded lookups',
]) must(tests, marker, 'destruction tests');

if (state.status !== 'IN_PROGRESS' || state.phase9_3Allowed !== false || state.successorStatus !== 'LOCKED') fail('Phase 9.3 successor lock weakened');
if (state.authority?.savedViewsPersistence !== 'DATABASE_RLS_REQUIRED' || state.authority?.sourceBusinessEntityWriteAuthority !== 'none') fail('state authority drift');

console.log('ENJAZ PHASE 9.2 SAVED VIEWS PERSISTENCE AUDIT PASS — legacy rows fail closed; RLS SELECT-only surface; guarded RPC writes; owner FK covered; M15 sharing authority reused; no source-business writes; JSON null/schema/domain attacks fail closed; Phase 9.3 LOCKED.');
