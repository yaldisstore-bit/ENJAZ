import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../database/migrations/phase_9_4_regulatory_version_generated_search_guard_hardening.sql', import.meta.url), 'utf8');

test('version history closure ignores only the generated search document in immutability comparison', () => {
  assert.match(sql, /create or replace function private\.guard_regulatory_version_mutation_v1\(\)/i);
  assert.match(sql, /old\.effective_to is null/i);
  assert.match(sql, /new\.effective_to is not null/i);
  assert.match(sql, /old\.ended_by_operation_id is null/i);
  assert.match(sql, /new\.ended_by_operation_id is not null/i);
  assert.match(sql, /to_jsonb\(new\)-'effective_to'-'ended_by_operation_id'-'search_document'/i);
  assert.match(sql, /to_jsonb\(old\)-'effective_to'-'ended_by_operation_id'-'search_document'/i);
  assert.match(sql, /ENJAZ_REGULATORY_VERSION_IMMUTABLE/i);
});

test('hardening keeps delete forbidden and does not introduce any mutation bypass', () => {
  assert.match(sql, /tg_op='DELETE'/i);
  assert.match(sql, /ENJAZ_REGULATORY_VERSION_DELETE_FORBIDDEN/i);
  assert.doesNotMatch(sql, /disable trigger|session_replication_role|alter table[\s\S]*disable/i);
  assert.match(sql, /revoke all on function private\.guard_regulatory_version_mutation_v1\(\) from public,anon,authenticated/i);
});
