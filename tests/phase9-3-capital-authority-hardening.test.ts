import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync('database/migrations/phase_9_3_capital_command_authority_hardening.sql','utf8');

test('capital hardening trusts database execution authority rather than a session GUC',()=>{
  assert.match(sql,/pg_catalog\.pg_get_userbyid\(c\.relowner\)/);
  assert.match(sql,/current_user<>v_table_owner/);
  assert.match(sql,/ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND/);
  assert.doesNotMatch(sql,/current_setting\s*\(\s*'enjaz\.governance_capital_write'/);
  assert.doesNotMatch(sql,/set_config\s*\(\s*'enjaz\.governance_capital_write'/);
});

test('capital guard remains private, invoker and unavailable to browser roles',()=>{
  assert.match(sql,/function private\.guard_governed_company_capital_v1/);
  assert.match(sql,/security invoker/);
  assert.match(sql,/set search_path=''/);
  assert.match(sql,/revoke execute on function private\.guard_governed_company_capital_v1\(\) from public,anon,authenticated/);
});
