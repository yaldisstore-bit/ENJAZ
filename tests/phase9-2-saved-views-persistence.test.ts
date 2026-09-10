import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../database/migrations/phase_9_2_saved_views_search_intelligence.sql', import.meta.url), 'utf8');
const compact = sql.replace(/\s+/g, ' ');

function extractFunction(schema: string, name: string): string {
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${schema}\\.${name}\\s*\\([\\s\\S]*?\\$\\$;`, 'i');
  const match = sql.match(re)?.[0];
  assert.ok(match, `missing function ${schema}.${name}`);
  return match;
}

test('saved_views is definition-only persistence with strict schema/domain JSON guards', () => {
  assert.match(sql, /create table public\.saved_views\s*\(/i);
  assert.match(sql, /definition jsonb not null/i);
  assert.match(sql, /jsonb_typeof\(definition->'schema'\)='string'[\s\S]*definition->>'schema'='enjaz\.saved-view\.v1'/i);
  assert.match(sql, /jsonb_typeof\(definition->'domain'\)='string'[\s\S]*definition->>'domain'=domain/i);
  assert.match(sql, /octet_length\(definition::text\)<=16384/i);
  assert.match(sql, /jsonb_typeof\(p_definition->'schema'\)<>'string'[\s\S]*p_definition->>'schema'<>'enjaz\.saved-view\.v1'/i);
  assert.match(sql, /jsonb_typeof\(p_definition->'domain'\)<>'string'[\s\S]*p_definition->>'domain' not in \('transactions','companies','people','procedures','documents'\)/i);
  assert.match(sql, /p_definition \? 'results' or p_definition \? 'items' or p_definition \? 'entities'/i);
});

test('saved_views exposes SELECT only and every visible row is RLS-authorized', () => {
  assert.match(sql, /alter table public\.saved_views enable row level security/i);
  assert.match(sql, /create policy saved_views_select_authorized[\s\S]*for select to authenticated[\s\S]*deleted_at is null[\s\S]*private\.can_read_saved_view_v1/i);
  assert.match(sql, /revoke all on table public\.saved_views from anon,authenticated/i);
  assert.match(sql, /grant select on table public\.saved_views to authenticated/i);
  assert.doesNotMatch(sql, /create policy\s+\S+\s+on public\.saved_views\s+for\s+(insert|update|delete|all)/i);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all)(?:\s*,\s*(?:insert|update|delete|select))*\s+on table public\.saved_views/i);
});

test('personal, team and workspace reads reuse authenticated M15 authority without legacy membership escalation', () => {
  const reader = extractFunction('private', 'can_read_saved_view_v1');
  assert.match(reader, /\(select auth\.uid\(\)\) is not null/i);
  assert.match(reader, /p_visibility='personal'[\s\S]*p_owner_user_id=\(select auth\.uid\(\)\)/i);
  assert.match(reader, /p_visibility='team'[\s\S]*private\.can_access_organization_scope_v1\(p_workspace_id,'team',null,null,p_team_id\)/i);
  assert.match(reader, /p_visibility='workspace'[\s\S]*private\.is_organization_owner_v1\(p_workspace_id\)[\s\S]*private\.current_organization_member_id_v1\(p_workspace_id\) is not null/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.workspace_memberships/i);
  assert.doesNotMatch(sql, /update\s+public\.workspace_memberships/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.workspace_memberships/i);
  assert.doesNotMatch(sql, /alter\s+table\s+public\.workspace_memberships/i);
});

test('team sharing requires management authority and workspace sharing requires owner authority', () => {
  const share = extractFunction('private', 'require_saved_view_share_authority_v1');
  assert.match(share, /p_visibility='team'[\s\S]*validate_organization_scope_target_v1\(p_workspace_id,'team',null,null,p_team_id\)/i);
  assert.match(share, /can_manage_organization_scope_v1\(p_workspace_id,'team',null,null,p_team_id\)/i);
  assert.match(share, /ENJAZ_SAVED_VIEW_TEAM_MANAGER_REQUIRED/i);
  assert.match(share, /p_visibility='workspace'[\s\S]*private\.is_organization_owner_v1\(p_workspace_id\)/i);
  assert.match(share, /ENJAZ_SAVED_VIEW_WORKSPACE_OWNER_REQUIRED/i);
});

test('saved-view writes are RPC-bound, optimistic, replay-safe and soft-delete only', () => {
  const save = extractFunction('private', 'save_saved_view_v1_impl');
  const del = extractFunction('private', 'delete_saved_view_v1_impl');
  assert.match(save, /private\.require_organization_actor_v1\(p_workspace_id\)/i);
  assert.match(save, /p_expected_version<>v_row\.version/i);
  assert.match(save, /ENJAZ_SAVED_VIEW_STALE/i);
  assert.match(save, /operation_id=p_operation_id/i);
  assert.match(save, /'replayed',true/i);
  assert.match(save, /ENJAZ_SAVED_VIEW_OPERATION_REUSED/i);
  assert.match(del, /deleted_at=now\(\)/i);
  assert.match(del, /p_expected_version<>v_row\.version/i);
  assert.doesNotMatch(del, /delete\s+from\s+public\.saved_views/i);
  assert.match(sql, /public\.save_saved_view_v1[\s\S]*security invoker set search_path=''/i);
  assert.match(sql, /public\.delete_saved_view_v1[\s\S]*security invoker set search_path=''/i);
  assert.match(sql, /public\.list_saved_views_v1[\s\S]*security invoker set search_path=''/i);
});

test('no exposed public SECURITY DEFINER or unrestricted function execution authority exists', () => {
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function\s+public\.[\s\S]*?security\s+definer/i);
  for (const fn of ['can_read_saved_view_v1','save_saved_view_v1_impl','delete_saved_view_v1_impl']) {
    const body = extractFunction('private', fn);
    assert.match(body, /security definer set search_path=''/i);
  }
  assert.match(sql, /revoke execute on function private\.validate_saved_view_definition_v1\(jsonb\) from public,anon,authenticated/i);
  assert.match(sql, /revoke execute on function private\.save_saved_view_v1_impl\([^)]+\) from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function private\.save_saved_view_v1_impl\([^)]+\) to authenticated/i);
  assert.match(sql, /revoke execute on function public\.save_saved_view_v1\([^)]+\) from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function public\.save_saved_view_v1\([^)]+\) to authenticated/i);
  assert.doesNotMatch(sql, /service_role/i);
});

test('persistence migration cannot mutate source business truth', () => {
  const forbiddenTables = [
    'transactions','companies','contacts','payments','payment_reversals','financial_ledger_entries',
    'cashbox_accounts','workflow_instances','automation_rules','automation_executions',
  ];
  for (const table of forbiddenTables) {
    const mutation = new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`, 'i');
    assert.doesNotMatch(sql, mutation, `source mutation forbidden: ${table}`);
  }
  assert.match(sql, /insert into public\.audit_events/i);
  assert.match(compact, /No legacy workforce insertion into workspace_memberships exists here\./i);
  assert.match(compact, /Source business tables are intentionally untouched by this migration\./i);
});

test('persistence indexes and constraints preserve workspace ownership and bounded lookups', () => {
  assert.match(sql, /constraint saved_views_workspace_id_id_key unique\(workspace_id,id\)/i);
  assert.match(sql, /create unique index saved_views_owner_name_active_unique[\s\S]*workspace_id,owner_user_id,lower\(btrim\(name\)\)/i);
  assert.match(sql, /create unique index saved_views_operation_unique[\s\S]*workspace_id,owner_user_id,operation_id/i);
  assert.match(sql, /create index saved_views_visible_lookup_idx[\s\S]*workspace_id,visibility,team_id,domain,updated_at desc/i);
  assert.match(sql, /constraint saved_views_team_fk foreign key\(workspace_id,team_id\)[\s\S]*organization_teams\(workspace_id,id\)/i);
});
