import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditProductionFixtureWorkflow,
  auditProductionFixtureWorkflows,
  scanRepositoryProductionFixtures,
} from '../scripts/audit-production-fixture-workflows.mjs';

const production = "env:\n      SUPABASE_URL: https://juzxriirhkuzviwnhkbd.supabase.co\n      SUPABASE_SECRET_KEY: \$\{\{ secrets.ENJAZ_SUPABASE_SECRET_KEY \}\}";
const make = condition => "name: test\non:\n  workflow_dispatch:\njobs:\n  fixture:\n" +
  condition + "    runs-on: ubuntu-24.04\n    " + production + "\n    steps:\n      - run: node test.mjs\n";

test('all currently tracked production-admin jobs are disabled at job level', () => {
  const result = scanRepositoryProductionFixtures();
  assert.ok(result.checked >= 20);
  assert.ok(result.quarantined >= 22);
  assert.deepEqual(result.findings, []);
});

test('manual-only and branch-filtered workflows must also be quarantined', () => {
  assert.equal(auditProductionFixtureWorkflow('manual.yml', make('')).length, 1);
  assert.deepEqual(auditProductionFixtureWorkflow('manual.yml', make('    if: \$\{\{ false \}\}\n')), []);
  assert.equal(auditProductionFixtureWorkflow('manual.yml', make('    if: github.ref == \'refs/heads/old\'\n')).length, 1);
});

test('a step-level false and a multiline manual bypass cannot substitute for a job-level false', () => {
  const step = make('').replace('      - run: node test.mjs','      - if: \$\{\{ false \}\}\n        run: node test.mjs');
  assert.equal(auditProductionFixtureWorkflow('step.yml', step).length, 1);
  const multiline = make("    if: >-\n      github.event_name == 'workflow_dispatch' ||\n      false\n");
  assert.equal(auditProductionFixtureWorkflow('multiline.yml', multiline).length, 1);
});

test('new or additional production-admin jobs are scanned rather than relying on a fixed filename list', () => {
  const first = make('    if: \$\{\{ false \}\}\n');
  const another = first + '  extra:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: echo unsafe\n';
  assert.equal(auditProductionFixtureWorkflow('new.yml', another).length, 1);
  assert.equal(auditProductionFixtureWorkflows([{name:'new.yml',content:another}]).length, 1);
});

test('read-only or isolated workflows without the production/admin pairing are not disabled', () => {
  assert.deepEqual(auditProductionFixtureWorkflow('isolated.yml', make('').replaceAll(
    'juzxriirhkuzviwnhkbd', 'abcdefghijklmnopqrst',
  )), []);
  assert.deepEqual(auditProductionFixtureWorkflow('no-admin.yml', make('').replace(
    'secrets.ENJAZ_SUPABASE_SECRET_KEY', 'secrets.ISOLATED_BRANCH_SECRET_KEY',
  )), []);
});

test('missing jobs metadata in a production-admin file cannot pass', () => {
  assert.equal(auditProductionFixtureWorkflow('bad.yml',production).length, 1);
  assert.equal(auditProductionFixtureWorkflow('bad.yml', 'jobs:\n  missing:\n    '+production).length, 1);
});
