import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync('scripts/phase14-2-a3-hosted-auth-rls.mjs','utf8');

test('hosted A3 harness is isolated-target only',()=>{
  assert.match(src,/branchRef===productionRef/);
  assert.match(src,/ENJAZ_REAL_CLOUD_CONFIRM/);
  assert.match(src,/ENJAZ_A3_ISOLATED_BRANCH_CONFIRM/);
  assert.match(src,/url!==`https:\/\/${branchRef}\.supabase\.co`/);
});

test('hosted A3 never places secret key in a browser client',()=>{
  assert.match(src,/const admin=createClient\(url,secret/);
  assert.match(src,/const make=\(\)=>createClient\(url,publishable/);
  assert.doesNotMatch(src,/const make=\(\)=>createClient\(url,secret/);
});

test('hosted A3 exercises anonymous and authenticated denial',()=>{
  assert.match(src,/anonymous_direct_integration_read_denied/);
  assert.match(src,/authenticated_owner_direct_integration_read_denied/);
  assert.match(src,/real_same_workspace_member_created/);
  assert.match(src,/authenticated_same_workspace_member_direct_integration_read_denied/);
  assert.match(src,/same_workspace_member_cannot_read_integration_fixture/);
  assert.match(src,/authenticated_outsider_direct_integration_read_denied/);
  assert.match(src,/cross_workspace_browser_read_denied/);
});

test('hosted A3 verifies server-side isolated persistence and cleanup',()=>{
  assert.match(src,/service_role_can_persist_isolated_fixture/);
  assert.match(src,/server_readback_workspace_bound/);
  assert.match(src,/deleteUser/);
  assert.match(src,/verifyZeroResidue/);
  assert.match(src,/auth_marker_absent/);
  assert.match(src,/workspace_ids_absent/);
  assert.match(src,/integration_fixture_ids_absent/);
  assert.match(src,/cleanupPassed=ok&&zero/);
});

test('hosted A3 uses marked disposable users only',()=>{
  assert.match(src,/phase14_2_a3_hosted_auth_rls/);
  assert.match(src,/enjaz-a3-/);
  assert.match(src,/@example\.com/);
});
