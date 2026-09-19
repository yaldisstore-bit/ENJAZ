import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../database/migrations/phase_13_4_a3_trusted_comparison.sql',import.meta.url),'utf8');
const canonical=sql.replace(/--[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'').toLowerCase();

test('A3 comparison obtains only authenticated A2 database evidence in one read-only invoker statement',()=>{
  for(const marker of [
    'language sql stable security invoker',"set search_path = ''",
    'with secure_readback as materialized',
    'public.read_legacy_import_reconciliation_v1(',
    'from secure_readback','from guarded',
    "evidence->>'workspaceid'=p_workspace_id::text",
    "evidence->>'batchid'=p_batch_id::text",
    "evidence->>'mutated'='false'",
    "evidence->>'reconciled'='false'",
    'cross join lateral jsonb_array_elements(p_manifest->',
  ]) assert.ok(canonical.includes(marker),marker);
  assert.match(canonical,/create or replace function public\.compare_legacy_import_reconciliation_v1\(\s*p_workspace_id uuid,\s*p_batch_id uuid,\s*p_idempotency_key text,\s*p_manifest jsonb/);
  assert.doesNotMatch(canonical,/\bsecurity\s+definer\b|\b(insert|update|delete|truncate|drop|alter|create\s+table|upsert)\b/);
  assert.doesNotMatch(canonical,/\bp_readback\b|\bp_observed_rows\b|\bp_verified\b|\bp_attestation\b/);
  assert.match(canonical,/revoke all on function public\.compare_legacy_import_reconciliation_v1[\s\S]*from public,anon/);
  assert.match(canonical,/grant execute on function public\.compare_legacy_import_reconciliation_v1[\s\S]*to authenticated/);
});

test('A3 tests every field, lifecycle, source identity, exact decimal and all relationship IDs',()=>{
  for(const marker of [
    "'missing_target'","'identity_drift'","'lifecycle_drift'",
    "'field_drift'","'money_drift'","'relationship_drift'",
    "record,legacyid","record,legacysource","record,deletedat","record,status",
    "'display_name'","'contact_type'","'phone'","'email'","'notes'",
    "'legal_name'","'capitaldecimal'","'address'","'activities'",
    "'registration_number'","'legal_status'","'department'","'current_fee_decimal'",
    "'primary_contact_id'","'company_id'",
    'is distinct from (x.item#>>',
    "'allmatchedatsnapshot',r.total>0 and r.total=r.matched",
    "'reconciled',false","'closureauthorized',false","'mutated',false",
  ])assert.ok(canonical.includes(marker),marker);
  assert.ok(canonical.includes('from report r cross join guarded g'));
  assert.ok(canonical.includes("r.total=(g.evidence->>'expectedrowcount')::integer"));
});

test('A3 destructive fixture executes only in disposable A2 PostgreSQL CI job',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/phase13-4-reconciliation.yml',import.meta.url),'utf8');
  const fixture=fs.readFileSync(new URL('./fixtures/phase13-4-a3-postgres.sql',import.meta.url),'utf8');
  assert.ok(workflow.includes('postgres:17'));
  assert.ok(workflow.includes('--file=tests/fixtures/phase13-4-a2-postgres.sql'));
  assert.ok(workflow.includes('--file=tests/fixtures/phase13-4-a3-postgres.sql'));
  assert.ok(workflow.includes('node --test tests/phase13-4-a3-db-source.test.mjs'));
  assert.ok(fixture.includes('\\i database/migrations/phase_13_4_a3_trusted_comparison.sql'));
  for(const marker of [
    'A3 isolated owner exact fields/decimal/FK and no premature closure',
    'A3 isolated outsider cannot compare',
    'A3 isolated non-owner workspace member cannot compare',
    'A3 isolated normalized field drift blocks snapshot equality',
    'A3 isolated precise money drift blocks snapshot equality',
    'A3 isolated relationship drift blocks snapshot equality',
    'A3 isolated legacy source lineage drift visible',
    'A3 isolated deleted lifecycle drift visible',
    'A3 isolated missing target never produces closure authority',
    'A3 isolated anonymous execution forbidden',
    'A3 isolated forged manifest and idempotency denied',
    'A3 isolated mutually corrupt totals cannot compare',
    'A3 isolated ledger restoration never repairs missing imported row',
  ])assert.ok(fixture.includes(marker),marker);
});

test('A3 branch-only live harness checks equality and adversarial cases without touching production',()=>{
  const harness=fs.readFileSync(new URL('../scripts/phase13-4-a2-real-cloud-e2e.mjs',import.meta.url),'utf8');
  for(const marker of [
    "branchRef===PRODUCTION_PROJECT",
    "process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES'",
    "const compare=(client,m)=>client.rpc('compare_legacy_import_reconciliation_v1',params(m))",
    "'a3_actual_phase13_3_import_matches_only_at_snapshot_without_closure'",
    "'a3_same_workspace_member_cannot_compare_as_canonical_owner'",
    "'a3_changed_company_fk_detected_without_closure'",
    "'a3_changed_transaction_money_detected'",
    "'a3_source_lineage_and_normalized_fields_detected'",
    "'a3_corrupt_durable_ledger_cannot_attest'",
    "'a3_forged_manifest_cannot_attest'",
    "'a3_wrong_idempotency_cannot_attest'",
    "'a3_missing_transaction_is_explicit_without_false_drift_or_closure'",
    "'a3_all_three_missing_targets_never_close_or_repair'",
    "evidence.cleanupPassed=ok"
  ])assert.ok(harness.includes(marker),marker);
});
