import fs from 'node:fs';

const statePath = 'docs/PHASE9_4_STATE.json';
const sqlPath = 'database/migrations/phase_9_4_regulatory_knowledge_persistence.sql';
const testPath = 'tests/phase9-4-regulatory-knowledge-persistence.test.ts';

for (const path of [statePath, sqlPath, testPath]) {
  if (!fs.existsSync(path)) throw new Error(`Phase 9.4 persistence audit missing ${path}`);
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const sql = fs.readFileSync(sqlPath, 'utf8');

const requiredState =
  state.phase === '9.4'
  && state.status === 'IN_PROGRESS'
  && state.majorSystem?.id === 'M8'
  && state.majorSystem?.status === 'ACTIVE'
  && state.foundation?.status === 'LOCAL_GATE_PASS'
  && ['AUTHORIZED_FOR_IMPLEMENTATION', 'IMPLEMENTED_PENDING_STATIC_GATE', 'STATIC_GATE_PASS', 'REAL_CLOUD_CERTIFIED'].includes(state.persistence?.status)
  && state.authority?.officialSourceProvenance === 'REQUIRED'
  && state.authority?.aiOutputAuthority === 'NEVER_AUTHORITATIVE'
  && state.authority?.directBrowserSensitiveDmlAllowed === false
  && state.authority?.destructiveHistoryOverwriteAllowed === false
  && state.phase9_5Allowed === false
  && state.successorStatus === 'LOCKED';

if (!requiredState) throw new Error('Phase 9.4 persistence lifecycle/authority state is invalid');

const requiredFragments = [
  'create table public.regulatory_sources',
  'create table public.regulatory_source_versions',
  'create table public.regulatory_derived_artifacts',
  'alter table public.regulatory_sources enable row level security',
  'alter table public.regulatory_source_versions enable row level security',
  'alter table public.regulatory_derived_artifacts enable row level security',
  "scope in ('official_global','workspace_curated')",
  'regulatory_source_versions_authoritative_check check(authoritative is true)',
  'regulatory_derived_artifacts_authoritative_check check(authoritative is false)',
  'private.require_organization_owner_v1(p_workspace_id)',
  'private.require_organization_actor_v1(p_workspace_id)',
  'ENJAZ_REGULATORY_OPERATION_REUSED',
  'ENJAZ_REGULATORY_STALE_REVISION',
  'ENJAZ_REGULATORY_EFFECTIVE_PERIOD_CONFLICT',
  'ENJAZ_REGULATORY_LINEAGE_BROKEN_OR_FORKED',
  'ENJAZ_REGULATORY_VERSION_IMMUTABLE',
  'ENJAZ_REGULATORY_CROSS_WORKSPACE_SOURCE_FORBIDDEN',
  'grant execute on function public.ingest_official_regulatory_version_v1',
  'to service_role',
];

for (const fragment of requiredFragments) {
  if (!sql.includes(fragment)) throw new Error(`Phase 9.4 persistence SQL missing invariant: ${fragment}`);
}

if (/grant\s+(insert|update|delete|all)[\s\S]*on table public\.regulatory_/i.test(sql)) {
  throw new Error('Phase 9.4 persistence exposes direct regulatory table mutation');
}
if (/grant execute on function public\.ingest_official_regulatory_version_v1\([^)]+\) to authenticated/i.test(sql)) {
  throw new Error('Official regulatory ingestion must never be granted to authenticated browser actors');
}
if (/authoritative\s+boolean\s+not\s+null\s+default\s+false[\s\S]*check\(authoritative is true\)/i.test(sql)) {
  throw new Error('Derived authority boundary is contradictory');
}

console.log('Phase 9.4 regulatory persistence audit: PASS');
