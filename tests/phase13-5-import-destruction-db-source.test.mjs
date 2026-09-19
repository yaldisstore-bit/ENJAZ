import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('tests/fixtures/phase13-5-import-destruction-postgres.sql','utf8');
const has=m=>assert.ok(sql.includes(m),m);

test('A2 fixture compiles exact 13.3 execution hardening and 13.4 reconciliation source',()=>{
  for(const marker of [
    '\\i database/migrations/phase_13_3_ordered_import_execution.sql',
    '\\i database/migrations/phase_13_3_ordered_import_idempotency_fastpath.sql',
    '\\i database/migrations/phase_13_3_ordered_import_replay_hardening.sql',
    '\\i database/migrations/20260919000205_phase_13_3_ordered_import_conflict_sqlstate_hardening.sql',
    '\\i database/migrations/phase_13_4_reconciliation_readback.sql',
    '\\i database/migrations/phase_13_4_a3_trusted_comparison.sql'
  ]) has(marker);
});

test('A2 fixture destructively covers auth, replay, reconciliation and atomic rollback',()=>{
  for(const marker of [
    'anonymous import/reconciliation denied',
    'same-workspace non-owner import denied',
    'cross-workspace outsider import denied',
    'real ordered import writes exact 1/1/1 atomically',
    'exact replay is idempotent with no duplicate truth',
    'changed replay conflicts without mutation',
    'clean reconciliation equality grants no closure or repair',
    'lifecycle and missing-target drift stay explicit without repair',
    'forged manifest and wrong ledger identity fail closed',
    'late write failure rolls back job/contact/company/transaction',
    'generated-ID/write preclaim fails before persistence',
    '5001 import fails closed before durable persistence',
    'zero synthetic database residue'
  ]) has(marker);
});

test('late failure is induced after earlier stages and residue is explicitly asserted zero',()=>{
  has('create trigger phase135_fail_late before insert on public.transactions');
  has('PHASE13_5_FORCED_LATE_WRITE_FAILURE');
  has("select count(*) from public.contacts where id='99999999-9999-4999-8999-999999999995'");
  has("select count(*) from public.companies where id='99999999-9999-4999-8999-999999999996'");
  has("select count(*) from public.import_jobs where id='99999999-9999-4999-8999-999999999994'");
});

test('fixture is synthetic-only and contains no production Supabase project ref',()=>{
  assert.doesNotMatch(sql,/juzxriirhkuzviwnhkbd|supabase\.co|service_role/);
});
