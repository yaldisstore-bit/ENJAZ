import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('scripts/phase14-2-a3-hosted-auth-rls.mjs','utf8');
const fixture=fs.readFileSync('tests/fixtures/phase14-2-a3-hosted-postgres.sql','utf8');
const workflow=fs.readFileSync('.github/workflows/phase14-2-integration-a3-hosted.yml','utf8');
const preflight=fs.readFileSync('scripts/phase14-2-a3-isolated-auth-preflight.mjs','utf8');
const has=(source,value)=>assert.ok(source.includes(value),value);

test('A3 hosted execution is isolated and database-target bound',()=>{
  for(const value of ['database_url_present','database_url_matches_isolated_branch','branchRef!==productionRef'])
    has(preflight,value);
  for(const value of ['ENJAZ_A3_ISOLATED_BRANCH_CONFIRM','PRODUCTION_PROJECT_REF','SUPABASE_DB_URL'])
    has(workflow,value);
  assert.doesNotMatch(runner,/juzxriirhkuzviwnhkbd|sb_secret_[A-Za-z0-9_-]{8,}/);
});

test('A3 hosted SQL covers the required authority boundaries',()=>{
  for(const value of [
    'anonymous and authenticated integration access denied',
    'authenticated owner identity issues server credential',
    'same-workspace member escalation denied','cross-workspace actor denied',
    'webhook scope and workspace binding enforced','missing scope and expired authority denied',
    'exact replay stable and changed replay denied','revocation closes credential and webhook authority',
    'integration persistence remains workspace-bound','hosted PostgreSQL fixture left zero data residue'
  ]) has(fixture,value);
  assert.equal((fixture.match(/PASS 14\.2 A3/g)??[]).length,10);
});

test('A3 hosted fixture is transactionally disposable and Auth cleanup is marker-bound',()=>{
  has(fixture,'begin;');has(fixture,'rollback;');has(fixture,'\\quit 1');
  for(const value of ['enjaz_test_marker:MARKER','deleteUser(user.id,false)','marker_residue_sweep'])
    has(runner,value);
  assert.doesNotMatch(fixture,/juzxriirhkuzviwnhkbd|supabase\.co/);
});

test('A3 evidence never records database credentials or secret material',()=>{
  has(runner,'databaseCredentialRecorded:false');
  has(runner,'secretMaterialRecorded:false');
  assert.doesNotMatch(runner,/evidence\.(databaseUrl|secret|publishable)/);
});
