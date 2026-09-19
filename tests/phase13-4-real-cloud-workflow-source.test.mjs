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
  assert.ok(workflow.includes('test "${GITHUB_REF_TYPE}" = "branch"'));
  assert.ok(workflow.includes('test "${GITHUB_REF_NAME}" != "main"'));
  assert.ok(workflow.includes('[[ "${GITHUB_REF_NAME}" == phase13-4-* ]]'));
  assert.ok(workflow.includes('test "${ENJAZ_A2_BRANCH_REF}" != "${PRODUCTION_PROJECT_REF}"'));
  assert.ok(workflow.includes('test "${SUPABASE_URL}" = "https://${ENJAZ_A2_BRANCH_REF}.supabase.co"'));
  assert.ok(workflow.includes('test "${SUPABASE_URL}" != "https://${PRODUCTION_PROJECT_REF}.supabase.co"'));
});

test('Phase 13.4 hosted certification needs explicit confirmations and branch-only secrets',()=>{
  for(const marker of [
    'ENJAZ_REAL_CLOUD_CONFIRM: ${{ inputs.confirm }}',
    'ENJAZ_A2_ISOLATED_BRANCH_CONFIRM: ${{ inputs.confirm }}',
    'PHASE13_4_SUPABASE_URL',
    'PHASE13_4_SUPABASE_PUBLISHABLE_KEY',
    'PHASE13_4_SUPABASE_SECRET_KEY',
    'environment: phase13-4-isolated-real-cloud',
  ]) assert.ok(workflow.includes(marker),marker);
  assert.match(workflow,/test "\${ENJAZ_REAL_CLOUD_CONFIRM}" = "YES"/);
  assert.match(workflow,/test "\${ENJAZ_A2_ISOLATED_BRANCH_CONFIRM}" = "YES"/);
});

test('preflight precedes hosted harness and workflow cannot install branch schema',()=>{
  const preflight=workflow.indexOf('Fail closed before any Supabase or database call');
  const sourceCheck=workflow.indexOf('Require reviewed A2/A3 source to be present in selected source ref');
  const harness=workflow.indexOf('node scripts/phase13-4-a2-real-cloud-e2e.mjs');
  assert.ok(preflight>=0 && sourceCheck>preflight && harness>sourceCheck);
  assert.ok(workflow.includes('test -f database/migrations/phase_13_4_reconciliation_readback.sql'));
  assert.ok(workflow.includes('test -f database/migrations/phase_13_4_a3_trusted_comparison.sql'));
  assert.doesNotMatch(workflow,/\bpsql\b|SUPABASE_DB_URL|phase_13_4_reconciliation\.sql/);
  assert.doesNotMatch(workflow,/service_role|juzxriirhkuzviwnhkbd\.supabase\.co/);
});

test('evidence requires zero residue and is uploaded even when certification fails',()=>{
  assert.ok(workflow.includes("e.passed!==true || e.cleanupPassed!==true"));
  assert.ok(workflow.includes("e.projectRef==='juzxriirhkuzviwnhkbd'"));
  assert.ok(workflow.includes('if: always()'));
  assert.ok(workflow.includes('actions/upload-artifact@v4'));
  assert.ok(workflow.includes('artifacts/phase13-4-a2-real-cloud/evidence.json'));
});
