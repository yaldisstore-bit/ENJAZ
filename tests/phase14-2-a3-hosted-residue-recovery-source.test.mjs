import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync('scripts/phase14-2-a3-hosted-residue-recovery.mjs','utf8');

test('A3 recovery is isolated-target only',()=>{
  assert.match(src,/branchRef===productionRef/);
  assert.match(src,/ENJAZ_REAL_CLOUD_CONFIRM/);
  assert.match(src,/ENJAZ_A3_ISOLATED_BRANCH_CONFIRM/);
  assert.match(src,/PHASE14_2_A3_RECOVERY_TARGET_DENIED/);
});

test('A3 recovery only selects explicitly marked disposable users',()=>{
  assert.match(src,/phase14_2_a3_hosted_auth_rls/);
  assert.match(src,/enjaz-a3-/);
  assert.match(src,/@example\.com/);
  assert.match(src,/A3_RECOVERY_UNMARKED_USER_DENIED/);
  assert.match(src,/A3_RECOVERY_UNEXPECTED_MARKED_USER_COUNT/);
});

test('A3 recovery deletes only workspaces owned by a marked user',()=>{
  assert.match(src,/\.eq\('owner_user_id',user\.id\)/);
  assert.match(src,/A3_RECOVERY_UNEXPECTED_WORKSPACE_COUNT/);
  assert.match(src,/delete\(\)\.eq\('id',row\.id\)\.eq\('owner_user_id',user\.id\)/);
});

test('A3 recovery independently verifies marked Auth residue is zero',()=>{
  assert.match(src,/A3_RECOVERY_ZERO_RESIDUE_NOT_VERIFIED/);
  assert.match(src,/remaining\.length!==0/);
});
