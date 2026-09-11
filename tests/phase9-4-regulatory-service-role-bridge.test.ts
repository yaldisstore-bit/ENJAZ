import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const baseSql = fs.readFileSync(new URL('../database/migrations/phase_9_4_regulatory_knowledge_persistence.sql', import.meta.url), 'utf8');
const bridgeSql = fs.readFileSync(new URL('../database/migrations/phase_9_4_regulatory_knowledge_service_role_bridge.sql', import.meta.url), 'utf8');

test('service role receives schema visibility only to complete the SECURITY INVOKER official ingestion bridge', () => {
  assert.match(bridgeSql, /grant usage on schema private to service_role/i);
  assert.doesNotMatch(bridgeSql, /grant usage on schema private to (anon|authenticated)/i);
  assert.doesNotMatch(bridgeSql, /grant\s+(select|insert|update|delete|all)\s+on/i);
  assert.match(baseSql, /grant execute on function private\.ingest_official_regulatory_version_v1_impl\([^)]+\) to service_role/i);
  assert.match(baseSql, /grant execute on function public\.ingest_official_regulatory_version_v1\([^)]+\) to service_role/i);
  assert.doesNotMatch(baseSql, /grant execute on function public\.ingest_official_regulatory_version_v1\([^)]+\) to authenticated/i);
});
