import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../database/migrations/phase_9_3_corporate_ownership_persistence.sql', import.meta.url), 'utf8');

function extractFunction(schema: string, name: string): string {
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${schema}\\.${name}\\s*\\([\\s\\S]*?\\$\\$;`, 'i');
  const match = sql.match(re)?.[0];
  assert.ok(match, `missing function ${schema}.${name}`);
  return match;
}

test('ownership persistence reuses authoritative company/contact identity with composite workspace foreign keys', () => {
  assert.match(sql, /create table public\.corporate_ownership_states\s*\(/i);
  assert.match(sql, /create table public\.corporate_ownership_stakes\s*\(/i);
  assert.match(sql, /create table public\.corporate_governance_events\s*\(/i);
  assert.match(sql, /foreign key\s*\(workspace_id,company_id\)[\s\S]*references public\.companies\(workspace_id,id\)/i);
  assert.match(sql, /foreign key\s*\(workspace_id,holder_contact_id\)[\s\S]*references public\.contacts\(workspace_id,id\)/i);
  assert.match(sql, /foreign key\s*\(workspace_id,holder_company_id\)[\s\S]*references public\.companies\(workspace_id,id\)/i);
  assert.match(sql, /holder_kind='person'[\s\S]*holder_contact_id is not null[\s\S]*holder_company_id is null/i);
  assert.match(sql, /holder_kind='company'[\s\S]*holder_contact_id is null[\s\S]*holder_company_id is not null/i);
});

test('browser roles can read authorized governance rows but cannot directly mutate them', () => {
  for (const table of ['corporate_ownership_states', 'corporate_ownership_stakes', 'corporate_governance_events']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon,authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant select on table public\\.${table} to authenticated`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`create policy\\s+\\S+\\s+on public\\.${table}\\s+for\\s+(insert|update|delete|all)`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`grant\\s+(insert|update|delete|all)[\\s\\S]*on table public\\.${table}`, 'i'));
  }
  const reader = extractFunction('private', 'can_read_corporate_governance_v1');
  assert.match(reader, /\(select auth\.uid\(\)\) is not null/i);
  assert.match(reader, /private\.is_organization_owner_v1\(p_workspace_id\)/i);
  assert.match(reader, /private\.current_organization_member_id_v1\(p_workspace_id\) is not null/i);
});

test('ownership writes are owner-only, serialized per company, optimistic and replay-safe', () => {
  const writer = extractFunction('private', 'replace_company_ownership_snapshot_v1_impl');
  assert.match(writer, /private\.require_organization_owner_v1\(p_workspace_id\)/i);
  assert.match(writer, /pg_advisory_xact_lock\(hashtext\(p_workspace_id::text\),hashtext\(p_company_id::text\)\)/i);
  assert.match(writer, /p_expected_version<>v_state\.ownership_version/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_STALE/i);
  assert.match(writer, /e\.operation_id=p_operation_id/i);
  assert.match(writer, /v_existing\.request_payload=v_request/i);
  assert.match(writer, /'replayed',true/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_OPERATION_REUSED/i);
  assert.match(writer, /p_effective_from<=v_state\.last_effective_from/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_EFFECTIVE_ORDER_INVALID/i);
});

test('ownership snapshot validates exact decimals, duplicate holders and exact 100 percent reconciliation', () => {
  const writer = extractFunction('private', 'replace_company_ownership_snapshot_v1_impl');
  assert.match(sql, /percentage numeric\(9,6\) not null/i);
  assert.match(sql, /percentage > 0 and percentage <= 100/i);
  assert.match(writer, /v_percentage_text !~ '\^\(\?:0\|\[1-9\]\[0-9\]\{0,2\}\)\(\?:\\\.\[0-9\]\{1,6\}\)\?\$'/i);
  assert.match(writer, /v_key=any\(v_seen\)/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_DUPLICATE_HOLDER/i);
  assert.match(writer, /v_total>100/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_TOTAL_EXCEEDS_100/i);
  assert.match(writer, /v_total<>100\.000000::numeric/i);
  assert.match(writer, /ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100/i);
  assert.doesNotMatch(writer, /real|double precision|float|parseFloat/i);
});

test('half-open effective periods have a database overlap guard without introducing btree_gist', () => {
  const overlap = extractFunction('private', 'reject_corporate_ownership_overlap_v1');
  assert.match(overlap, /daterange\(s\.effective_from,s\.effective_to,'\[\)'\)\s*&&\s*daterange\(new\.effective_from,new\.effective_to,'\[\)'\)/i);
  assert.match(overlap, /ENJAZ_OWNERSHIP_PERIOD_CONFLICT/i);
  assert.match(sql, /before insert or update of[\s\S]*on public\.corporate_ownership_stakes[\s\S]*reject_corporate_ownership_overlap_v1/i);
  assert.doesNotMatch(sql, /create\s+extension[\s\S]*btree_gist/i);
  assert.doesNotMatch(sql, /exclude\s+using\s+gist/i);
});

test('snapshot transitions close the prior open interval and append a new authoritative history', () => {
  const writer = extractFunction('private', 'replace_company_ownership_snapshot_v1_impl');
  assert.match(writer, /update public\.corporate_ownership_stakes[\s\S]*set effective_to=p_effective_from,[\s\S]*ended_by_operation_id=p_operation_id[\s\S]*effective_to is null/i);
  assert.match(writer, /insert into public\.corporate_ownership_stakes/i);
  assert.match(writer, /insert into public\.corporate_governance_events/i);
  assert.match(writer, /event_type[\s\S]*'ownership\.snapshot'/i);
  assert.doesNotMatch(writer, /delete\s+from\s+public\.corporate_ownership_stakes/i);
  assert.doesNotMatch(writer, /truncate\s+public\.corporate_ownership_stakes/i);
});

test('as-of reader derives current or historical ownership and fails closed on corrupt totals', () => {
  const reader = extractFunction('private', 'get_company_ownership_snapshot_v1_impl');
  assert.match(reader, /private\.require_organization_actor_v1\(p_workspace_id\)/i);
  assert.match(reader, /s\.effective_from<=v_as_of/i);
  assert.match(reader, /s\.effective_to is null or v_as_of<s\.effective_to/i);
  assert.match(reader, /v_total<>100\.000000::numeric/i);
  assert.match(reader, /ENJAZ_OWNERSHIP_HISTORY_NOT_RECONCILED/i);
  assert.match(reader, /'configured',jsonb_array_length\(v_stakes\)>0/i);
  assert.match(reader, /'reconciledTo100',jsonb_array_length\(v_stakes\)>0/i);
});

test('public ownership API remains SECURITY INVOKER while privileged helpers stay private and tightly granted', () => {
  for (const fn of ['replace_company_ownership_snapshot_v1', 'get_company_ownership_snapshot_v1']) {
    const body = extractFunction('public', fn);
    assert.match(body, /security invoker/i);
    assert.match(body, /set search_path=''/i);
    assert.doesNotMatch(body, /security definer/i);
  }
  for (const fn of ['can_read_corporate_governance_v1', 'replace_company_ownership_snapshot_v1_impl', 'get_company_ownership_snapshot_v1_impl']) {
    const body = extractFunction('private', fn);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path=''/i);
  }
  assert.match(sql, /revoke execute on function private\.replace_company_ownership_snapshot_v1_impl\([^)]+\) from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function private\.replace_company_ownership_snapshot_v1_impl\([^)]+\) to authenticated/i);
  assert.match(sql, /revoke execute on function public\.replace_company_ownership_snapshot_v1\([^)]+\) from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function public\.replace_company_ownership_snapshot_v1\([^)]+\) to authenticated/i);
  assert.doesNotMatch(sql, /service_role/i);
});

test('M2 persistence never mutates or creates shadow company/contact business truth', () => {
  for (const table of ['companies', 'contacts', 'transactions', 'payments', 'workflow_instances', 'automation_rules']) {
    const mutation = new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+public\\.${table}\\b`, 'i');
    assert.doesNotMatch(sql, mutation, `source mutation forbidden: ${table}`);
  }
  assert.match(sql, /insert into public\.audit_events/i);
  assert.match(sql, /No company\/contact identity rows are created or mutated by this migration\./i);
  assert.match(sql, /No cross-workspace party reference can satisfy the composite foreign keys\./i);
});

test('ownership persistence has bounded indexes and operation uniqueness for exact-company reads', () => {
  assert.match(sql, /corporate_ownership_stakes_company_asof_idx[\s\S]*workspace_id,company_id,effective_from,effective_to/i);
  assert.match(sql, /corporate_governance_events_operation_key unique\(workspace_id,company_id,operation_id\)/i);
  assert.match(sql, /corporate_governance_events_timeline_idx[\s\S]*workspace_id,company_id,effective_on desc,occurred_at desc,id/i);
});
