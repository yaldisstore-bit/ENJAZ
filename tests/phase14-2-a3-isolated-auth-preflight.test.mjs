import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const base={
  ...process.env,
  ENJAZ_REAL_CLOUD_CONFIRM*'YES',
  ENJAZ_A3_ISOLATED_BRANCH_CONFIRM:'YES',
  PRODUCTION_PROJECT_REF:'aaaaaaaaaaaaaaaaaaaa',
  ENJAZ_A3_BRANCH_REF:'bbbbbbbbbbbbbbbbbbbb',
  SUPABASE_URL:'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only',
  SUPABASE_SECRET_KEY:'sb_secret_test_only',
  SUPABASE_DB_URL:'postgresql://postgres.bbbbbbbbbbbbbbbbbbbb:test@pooler.supabase.com:5432/postgres?sslmode=require'
};
const run=(overrides={})=>spawnSync(
  process.execPath,
  ['scripts/phase14-2-a3-isolated-auth-preflight.mjs'],
  {env:{...base,...overrides},encoding:'utf8'}
);

test('accepts a confirmed isolated target with separate keys',()=>{
  const r=run();
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/PASS 14\.2 A3 isolated Supabase preflight/);
});

test('denies production as the A3 target',()=>{
  const r=run({
    ENJAZ_A3_BRANCH_REF:'aaaaaaaaaaaaaaaaaaaa',
    SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co'
  });
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/production_target_denied/);
});

test('denies a URL that does not match the isolated branch ref',()=>{
  const r=run({SUPABASE_URL:'https://cccccccccccccccccccc.supabase.co'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/url_matches_isolated_branch/);
});

test('requires explicit destructive-real-cloud confirmations',()=>{
  const r=run({ENJAZ_REAL_CLOUD_CONFIRM:'NO'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/explicit_real_cloud_confirmation/);
});

test('rejects publishable material in the secret slot',()=>{
  const r=run({SUPABASE_SECRET_KEY:'sb_publishable_wrong_slot'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/secret_is_not_publishable_key/);
});

test('requires branch and production refs to use project-ref shape',()=>{
  const r=run({ENJAZ_A3_BRANCH_REF:'bad-ref'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/branch_ref_format/);
});

test('requires a TLS PostgreSQL target bound to the isolated ref',()=>{
  const missing=run({SUPABASE_DB_URL:''});
  assert.notEqual(missing.status,0);
  assert.match(missing.stderr,/database_url_present/);
  const production=run({SUPABASE_DB_URL:'postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:test@pooler.supabase.com:5432/postgres?sslmode=require'});
  assert.notEqual(production.status,0);
  assert.match(production.stderr,/database_url_matches_isolated_branch/);
  const noTls=run({SUPABASE_DB_URL:'postgresql://postgres.bbbbbbbbbbbbbbbbbbbb:test@pooler.supabase.com:5432/postgres?sslmode=disable'});
  assert.notEqual(noTls.status,0);
  assert.match(noTls.stderr,/database_url_matches_isolated_branch/);
});
