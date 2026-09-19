import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../scripts/phase13-4-a2-real-cloud-e2e.mjs',import.meta.url));
const production='juzxriirhkuzviwnhkbd';
const syntheticBranch='aaaaaaaaaaaaaaaaaaaa';

// Invoke ONLY inputs which MUST be rejected before createClient, import or any
// user/workspace mutation. Never invoke this process with a valid branch here.
const safeBase={
  ...process.env,
  ENJAZ_REAL_CLOUD_CONFIRM:'YES',
  ENJAZ_A2_ISOLATED_BRANCH_CONFIRM:'YES',
  ENJAZ_A2_BRANCH_REF:syntheticBranch,
  SUPABASE_URL:`https://${syntheticBranch}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_inert_preflight_only',
  SUPABASE_SECRET_KEY:'sb_secret_inert_preflight_only',
};

function expectPreflightFailure(label,overrides,diagnostic='isolated branch-only safety guard'){
  const env={...safeBase,...overrides};
  const result=spawnSync(process.execPath,[script],{
    env,timeout:10_000,encoding:'utf8',
  });
  assert.equal(result.status,1,`${label}: subprocess must fail before network or mutation`);
  assert.ok(result.stderr.includes(diagnostic),
    `${label}: expected preflight error missing: ${result.stderr.slice(0,800)}`);
  assert.equal(result.signal,null,`${label}: subprocess must exit via preflight, not timeout`);
}

test('A2 destructive harness rejects the production project despite all confirms',()=>{
  expectPreflightFailure('production project and URL',{
    ENJAZ_A2_BRANCH_REF:production,SUPABASE_URL:`https://${production}.supabase.co`,
  });
});

test('A2 destructive harness rejects production URL even with different branch ref',()=>{
  expectPreflightFailure('mismatched production URL',{
    SUPABASE_URL:`https://${production}.supabase.co`,
  });
});

test('A2 destructive harness rejects no branch confirmation, invalid ref, wrong URL and published secret',()=>{
  expectPreflightFailure('missing branch confirm',{ENJAZ_A2_ISOLATED_BRANCH_CONFIRM:'NO'});
  expectPreflightFailure('missing explicit real cloud confirm',{ENJAZ_REAL_CLOUD_CONFIRM:'NO'});
  expectPreflightFailure('invalid branch ref',{ENJAZ_A2_BRANCH_REF:'../malformed'});
  expectPreflightFailure('insecure origin',{SUPABASE_URL:`http://${syntheticBranch}.supabase.co`});
  expectPreflightFailure('wrong Supabase project origin',{SUPABASE_URL:'https://example.org'});
  expectPreflightFailure('secret is publishable key',{
    SUPABASE_SECRET_KEY:'sb_publishable_inert_preflight_only',
  });
});

test('A2 destructive harness refuses to start without branch lineage selection',()=>{
  expectPreflightFailure('absent branch ref',{ENJAZ_A2_BRANCH_REF:''},'Missing ENJAZ_A2_BRANCH_REF');
});
