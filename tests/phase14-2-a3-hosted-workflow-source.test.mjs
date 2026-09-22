import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const yml=readFileSync('.github/workflows/phase14-2-a3-hosted-auth-rls.yml','utf8');

test('hosted A3 certificate remains manual-only',()=>{
  assert.match(yml,/on:\n  workflow_dispatch:/);
  assert.doesNotMatch(yml,/\n  push:/);
  assert.doesNotMatch(yml,/\n  pull_request:/);
});

test('hosted A3 certificate uses isolated environment secrets',()=>{
  assert.match(yml,/environment: phase14-2-isolated-real-cloud/);
  assert.match(yml,/PHASE14_2_PRODUCTION_PROJECT_REF/);
  assert.match(yml,/PHASE14_2_A3_BRANCH_REF/);
  assert.match(yml,/PHASE14_2_A3_SUPABASE_URL/);
  assert.match(yml,/PHASE14_2_A3_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(yml,/PHASE14_2_A3_SUPABASE_SECRET_KEY/);
});

test('hosted A3 certificate always runs preflight before hosted harness',()=>{
  const pre=yml.indexOf('node scripts/phase14-2-a3-isolated-auth-preflight.mjs');
  const hosted=yml.indexOf('node scripts/phase14-2-a3-hosted-auth-rls.mjs');
  assert.ok(pre>=0);
  assert.ok(hosted>pre);
});

test('hosted A3 certificate verifies cleanup evidence',()=>{
  assert.match(yml,/cleanupPassed!==true/);
  assert.match(yml,/production target forbidden/);
  assert.match(yml,/Upload A3 hosted evidence/);
});
