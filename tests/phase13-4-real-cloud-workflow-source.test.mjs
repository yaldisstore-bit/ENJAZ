import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(
  new URL('../.github/workflows/phase13-4-real-cloud-certification.yml',import.meta.url),
  'utf8'
);

test('Phase 13.4 hosted certification is manual-only and never production-triggered',()=>{
  assert.match(workflow,/\bon:\s*\n\s+workflow_dispatch:/);
  assert.doesNotMatch(workflow,/\n\s+(?:push|pull_request|schedule):/);
  assert.ok(workflow.includes('PRODUCTION_PROJECT_REF: juzxriirhkuzviwnhkbd'));
  assert.ok(workflow.includes('test "${ENJAZ_A2_BRANCH_REF}" != "${PRODUCTION_PROJECT_REF}"'));
  assert.ok(workflow.includes('test "${SUPABASE_URL}" = "https://${ENJAZ_A2_BRANCH_REF}.supabase.co"'));
  assert.ok(workflow.includes('test "${SUPABASE_URL}" != "https://${PRODUCTION_PROJECT_REF}.supabase.co"'));
  assert.ok(workflow.includes('[[ "${SUPABASE_DB_URL}" == *"${ENJAZ_A2_BRANCH_REF}"* ]]'));
  assert.ok(workflow.includes('[[ "${SUPABASE_DB_URL}" != *"${PRODUCTION_PROJECT_REF}"* ]]'));
});

test('Phase 13.4 hosted certification needs explicit confirmations and branch-only secrets',()=>{
  for(const marker of [
    'ENJAZ_REAL_CLOUD_CONFIRM: ${{ inputs.confirm }}',
    'ENJAZ_A2_ISOLATED_BRANCH_CONFIRM: ${{ inputs.confirm }}',
    'PHASE13_4_SUPABASE_URL',
    'PHASE13_4_SUPABASE_PUBLISHABLE_KEY',
    'PHASE13_4_SUPABASE_SECRET_KEY',
    'PHASE13_4_SUPABASE_DB_URL',
    'environment: phase13-4-isolated-real-cloud',
  ]) assert.ok(workflow.includes(marker),marker);
  assert.match(workflow,/test "\${ENJAZ_REAL_CLOUD_CONFIRM}" = "YES"/);
  assert.match(workflow,/test "\${ENJAZ_A2_ISOLATED_BRANCH_CONFIRM}" = "YES"/);
});

test('preflight precedes all network/database mutation and only reviewed A2/A3 source is installed',()=>{
  const preflight=workflow.indexOf('Fail closed before any network call');
  const a2=workflow.indexOf('--file=database/migrations/phase_13_4_reconciliation_readback.sql');
  const a3=workflow.indexOf('--file=database/migrations/phase_13_4_a3_trusted_comparison.sql');
  const harness=workflow.indexOf('node scripts/phase13-4-a2-real-cloud-e2e.mjs');
  assert.ok(preflight>=0 && a2>preflight && a3>a2 && harness>a3);
  assert.doesNotMatch(workflow,/phase_13_4_reconciliation\.sql/);
  assert.doesNotMatch(workflow,/service_role|juzxriirhkuzviwnhkbd\.supabase\.co/);
});

test('evidence requires zero residue and is uploaded even when certification fails',()=>{
  assert.ok(workflow.includes("e.passed!==true || e.cleanupPassed!==true"));
  assert.ok(workflow.includes("e.projectRef==='juzxriirhkuzviwnhkbd'"));
  assert.ok(workflow.includes('if: always()'));
  assert.ok(workflow.includes('actions/upload-artifact@v4'));
  assert.ok(workflow.includes('artifacts/phase13-4-a2-real-cloud/evidence.json'));
});
