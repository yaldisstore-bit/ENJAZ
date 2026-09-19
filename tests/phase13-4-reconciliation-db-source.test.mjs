import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql = fs.readFileSync(new URL('../database/migrations/phase_13_4_reconciliation_readback.sql', import.meta.url), 'utf8');
const canonical = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();

test('A2 uses exactly one read-only SQL statement and invoker RLS; it contains no write operation', () => {
  for (const marker of ['language sql', 'stable', 'security invoker', "set search_path = ''",
    'with bound_job as materialized', 'from public.import_jobs', 'from expected_items e',
    'left join public.contacts', 'left join public.companies', 'left join public.transactions'])
    assert.ok(canonical.includes(marker), marker);
  assert.doesNotMatch(canonical, /\bsecurity\s+definer\b|\b(insert|update|delete|truncate|drop|alter|create\s+table|upsert)\b/);
  assert.match(canonical, /revoke all on function public\.read_legacy_import_reconciliation_v1[\s\S]*from public, anon/);
  assert.match(canonical, /grant execute on function public\.read_legacy_import_reconciliation_v1[\s\S]*to authenticated/);
});

test('A2 denies anonymous/cross-workspace/foreign import jobs and binds the durable original payload hash', () => {
  for (const marker of [
    '(select auth.uid()) is not null',
    'private.is_workspace_owner(p_workspace_id)',
    'j.workspace_id = p_workspace_id', 'j.id = p_batch_id',
    "j.status = 'succeeded'", "j.counts->>'contract' = 'phase13.3'",
    "j.reconciliation->>'idempotencykey' = p_idempotency_key",
    "j.reconciliation->>'payloadhash'",
    "extensions.digest(convert_to(p_manifest::text, 'utf8'), 'sha256')",
    "j.reconciliation->'result'->>'batchid' = p_batch_id::text",
    "j.reconciliation->'result'->>'workspaceid' = p_workspace_id::text",
    'jsonb_array_length(p_manifest->\'items\') between 1 and 5000',
    "octet_length(convert_to(p_manifest::text, 'utf8')) <= 8388608",
  ]) assert.ok(canonical.includes(marker), marker);
});

test('A2 preserves missing rows, exact ordinal and source identities and does not claim reconciliation', () => {
  for (const marker of [
    'with ordinality', 'o.ordinal', 'o.target_table', 'o.target_id', 'o.source_key',
    "'found', o.actual_record is not null", "'record', o.actual_record",
    'order by o.ordinal', "'reconciled', false", "'mutated', false",
    "'legacyid', c.legacy_id", "'legacyid', co.legacy_id", "'legacyid', t.legacy_id",
    "'deletedat', t.deleted_at", "'status', c.status",
    "'capitaldecimal', co.capital::text", "'current_fee_decimal', t.current_fee::text",
    "'company_id', t.company_id", "'primary_contact_id', co.primary_contact_id",
  ]) assert.ok(canonical.includes(marker), marker);
});

test('A2 does not contain service key, auto-fix authority or unbounded page-based readback', () => {
  assert.doesNotMatch(canonical, /service[_-]?role|service[_-]?key|automated[_-]?repair|offset\s+\d+|limit\s+1000/);
});

test('A2 Real Cloud harness is explicitly opt-in, isolated and exercises post-import drift', () => {
  const harness = fs.readFileSync(new URL('../scripts/phase13-4-a2-real-cloud-e2e.mjs', import.meta.url), 'utf8');
  for (const marker of [
    "ENJAZ_REAL_CLOUD_CONFIRM!=='YES'",
    "url.endsWith(PROJECT+'.supabase.co')",
    "enjaz_test_marker:MARKER",
    "'anonymous_cannot_read_successful_ledger'",
    "'outsider_cannot_read_successful_ledger'",
    "'changed_fk_visible_without_silent_reconciliation'",
    "'changed_money_visible_as_exact_decimal_without_reconciliation'",
    "'isolated_test_row_restoration_verified'",
    "'missing_target_preserved_without_silent_repair'",
    "evidence.cleanupPassed=ok",
    "evidence.passed=!fatal&&evidence.cleanupPassed",
  ]) assert.ok(harness.includes(marker), marker);
  assert.ok(harness.includes(".delete().eq('id',p.ids.transactionId).eq('workspace_id',ws)"));
  assert.ok(harness.includes("admin.from('workspaces').delete().eq('id',ws)"));
});
