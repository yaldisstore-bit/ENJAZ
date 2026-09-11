import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../database/migrations/phase_9_4_regulatory_knowledge_persistence.sql', import.meta.url), 'utf8');

function extractFunction(schema: string, name: string): string {
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+${schema}\\.${name}\\s*\\([\\s\\S]*?\\$\\$;`, 'i');
  const match = sql.match(re)?.[0];
  assert.ok(match, `missing function ${schema}.${name}`);
  return match;
}

test('regulatory truth is split into source identity, authoritative versions, and derived artifacts', () => {
  assert.match(sql, /create table public\.regulatory_sources\s*\(/i);
  assert.match(sql, /create table public\.regulatory_source_versions\s*\(/i);
  assert.match(sql, /create table public\.regulatory_derived_artifacts\s*\(/i);
  assert.match(sql, /authoritative boolean not null default true/i);
  assert.match(sql, /regulatory_source_versions_authoritative_check check\(authoritative is true\)/i);
  assert.match(sql, /regulatory_derived_artifacts_authoritative_check check\(authoritative is false\)/i);
});

test('official global and workspace curated identities are structurally distinct', () => {
  assert.match(sql, /scope in \('official_global','workspace_curated'\)/i);
  assert.match(sql, /scope='official_global' and workspace_id is null/i);
  assert.match(sql, /scope='workspace_curated' and workspace_id is not null/i);
  assert.match(sql, /regulatory_sources_official_identity_key[\s\S]*where scope='official_global'/i);
  assert.match(sql, /regulatory_sources_workspace_identity_key[\s\S]*workspace_id[\s\S]*where scope='workspace_curated'/i);
});

test('authoritative versions require provenance, HTTPS source and SHA-256 hash', () => {
  assert.match(sql, /source_locator text not null/i);
  assert.match(sql, /publisher text not null/i);
  assert.match(sql, /source_url text not null/i);
  assert.match(sql, /retrieved_on date not null/i);
  assert.match(sql, /source_hash text not null/i);
  assert.match(sql, /source_url ~ '\^https:\/\/'/i);
  assert.match(sql, /source_hash ~ '\^\[0-9a-f\]\{64\}\$'/i);
});

test('browser roles have read-only table grants with RLS on every exposed regulatory table', () => {
  for (const table of ['regulatory_sources', 'regulatory_source_versions', 'regulatory_derived_artifacts']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon,authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant select on table public\\.${table} to authenticated`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`grant\\s+(insert|update|delete|all)[\\s\\S]*on table public\\.${table}`, 'i'));
    assert.doesNotMatch(
      sql,
      new RegExp(`create\\s+policy\\s+\\S+\\s+on\\s+public\\.${table}\\s+for\\s+(insert|update|delete|all)\\b`, 'i'),
    );
  }
});

test('workspace reads reuse organization authority and curated rows cannot leak cross-workspace', () => {
  const helper = extractFunction('private', 'can_read_regulatory_workspace_v1');
  assert.match(helper, /\(select auth\.uid\(\)\) is not null/i);
  assert.match(helper, /private\.is_organization_owner_v1\(p_workspace_id\)/i);
  assert.match(helper, /private\.current_organization_member_id_v1\(p_workspace_id\) is not null/i);
  const artifactWriter = extractFunction('private', 'save_regulatory_derived_artifact_v1_impl');
  assert.match(artifactWriter, /private\.require_organization_actor_v1\(p_workspace_id\)/i);
  assert.match(artifactWriter, /v_source\.scope='workspace_curated' and v_source\.workspace_id<>p_workspace_id/i);
  assert.match(artifactWriter, /ENJAZ_REGULATORY_CROSS_WORKSPACE_SOURCE_FORBIDDEN/i);
});

test('official ingestion is service-role only while workspace mutation is owner-authorized', () => {
  const curated = extractFunction('private', 'save_workspace_regulatory_version_v1_impl');
  assert.match(curated, /private\.require_organization_owner_v1\(p_workspace_id\)/i);
  assert.match(sql, /grant execute on function public\.ingest_official_regulatory_version_v1\([^)]+\) to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.ingest_official_regulatory_version_v1\([^)]+\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.save_workspace_regulatory_version_v1\([^)]+\) to authenticated/i);
});

test('version appends are serialized, optimistic and replay safe', () => {
  const writer = extractFunction('private', 'append_regulatory_version_core_v1');
  assert.match(writer, /pg_advisory_xact_lock\(hashtext\('enjaz-regulatory'\),hashtext\(p_source_id::text\)\)/i);
  assert.match(writer, /p_expected_revision<>v_previous\.revision/i);
  assert.match(writer, /ENJAZ_REGULATORY_STALE_REVISION/i);
  assert.match(writer, /v\.created_operation_id=p_operation_id/i);
  assert.match(writer, /'replayed',true/i);
  assert.match(writer, /ENJAZ_REGULATORY_OPERATION_REUSED/i);
});

test('lineage is deterministic, sequential and fork resistant', () => {
  const lineage = extractFunction('private', 'guard_regulatory_version_lineage_v1');
  assert.match(lineage, /new\.revision<>1 or new\.supersedes_version_id is not null/i);
  assert.match(lineage, /new\.revision<>v_previous\.revision\+1/i);
  assert.match(lineage, /new\.supersedes_version_id is distinct from v_previous\.id/i);
  assert.match(lineage, /ENJAZ_REGULATORY_LINEAGE_BROKEN_OR_FORKED/i);
  assert.match(sql, /unique\(source_id,revision\)/i);
});

test('authoritative effective periods are half-open, non-overlapping and historically queryable', () => {
  const overlap = extractFunction('private', 'reject_regulatory_version_overlap_v1');
  assert.match(overlap, /daterange\(v\.effective_from,v\.effective_to,'\[\)'\)\s*&&\s*daterange\(new\.effective_from,new\.effective_to,'\[\)'\)/i);
  assert.match(overlap, /ENJAZ_REGULATORY_EFFECTIVE_PERIOD_CONFLICT/i);
  const reader = extractFunction('private', 'get_regulatory_version_as_of_v1_impl');
  assert.match(reader, /v\.effective_from<=v_as_of/i);
  assert.match(reader, /v\.effective_to is null or v_as_of<v\.effective_to/i);
  assert.match(reader, /v_count>1/i);
  assert.match(reader, /ENJAZ_REGULATORY_ASOF_AMBIGUOUS/i);
});

test('official source/version/artifact history is non-destructive', () => {
  assert.match(sql, /regulatory_sources_immutable_guard/i);
  assert.match(sql, /regulatory_source_versions_immutable_guard/i);
  assert.match(sql, /regulatory_derived_artifacts_immutable_guard/i);
  const versionGuard = extractFunction('private', 'guard_regulatory_version_mutation_v1');
  assert.match(versionGuard, /ENJAZ_REGULATORY_VERSION_DELETE_FORBIDDEN/i);
  assert.match(versionGuard, /old\.effective_to is null[\s\S]*new\.effective_to is not null/i);
  assert.match(versionGuard, /ENJAZ_REGULATORY_VERSION_IMMUTABLE/i);
  assert.doesNotMatch(extractFunction('private', 'append_regulatory_version_core_v1'), /delete\s+from\s+public\.regulatory_/i);
});

test('AI and editorial artifacts are append-only non-authoritative and source-version bound', () => {
  assert.match(sql, /kind in \('editorial_interpretation','ai_summary'\)/i);
  assert.match(sql, /foreign key\(source_id,source_version_id\)[\s\S]*references public\.regulatory_source_versions\(source_id,id\)/i);
  const artifactWriter = extractFunction('private', 'save_regulatory_derived_artifact_v1_impl');
  assert.match(artifactWriter, /false,v_actor,p_operation_id/i);
  assert.match(artifactWriter, /regulatory\.derived_artifact\.created/i);
});

test('public regulatory APIs remain SECURITY INVOKER and privileged helpers are private with pinned search paths', () => {
  for (const fn of ['ingest_official_regulatory_version_v1', 'save_workspace_regulatory_version_v1', 'save_regulatory_derived_artifact_v1', 'get_regulatory_version_as_of_v1']) {
    const body = extractFunction('public', fn);
    assert.match(body, /security invoker/i);
    assert.match(body, /set search_path=''/i);
    assert.doesNotMatch(body, /security definer/i);
  }
  for (const fn of ['can_read_regulatory_workspace_v1', 'can_read_regulatory_source_v1', 'append_regulatory_version_core_v1', 'save_workspace_regulatory_version_v1_impl', 'save_regulatory_derived_artifact_v1_impl', 'get_regulatory_version_as_of_v1_impl']) {
    const body = extractFunction('private', fn);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path=''/i);
  }
});

test('search index is separate from immutable official text and persistence emits workspace audit evidence', () => {
  assert.match(sql, /search_document tsvector generated always as/i);
  assert.match(sql, /to_tsvector\('simple'::regconfig,coalesce\(title_ar,''\)\|\|' '\|\|coalesce\(official_text,''\)\)/i);
  assert.match(sql, /regulatory_source_versions_search_idx[\s\S]*using gin\(search_document\)/i);
  assert.match(sql, /insert into public\.audit_events/i);
});
