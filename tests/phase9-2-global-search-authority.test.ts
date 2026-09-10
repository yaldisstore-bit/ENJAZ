import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql=fs.readFileSync(new URL('../database/migrations/phase_9_2_global_search_intelligence.sql',import.meta.url),'utf8');

test('global search exposes one bounded authenticated read RPC and no source writes',()=>{
  assert.match(sql,/create or replace function public\.global_search_v1/);
  assert.match(sql,/security invoker/);
  assert.match(sql,/grant execute on function public\.global_search_v1\(uuid,text,integer\) to authenticated/);
  assert.doesNotMatch(sql,/\binsert\s+into\b/i);
  assert.doesNotMatch(sql,/\bupdate\s+public\./i);
  assert.doesNotMatch(sql,/\bdelete\s+from\b/i);
  assert.match(sql,/v_limit < 1 or v_limit > 10/);
  assert.match(sql,/char_length\(v_query\) < 2 or char_length\(v_query\) > 120/);
});

test('owner transaction search includes unassigned rows while workforce reuses M15 scope',()=>{
  const owner=sql.match(/if v_owner then([\s\S]*?)else/)?.[1]??'';
  const workforce=sql.match(/else\n\s*-- Workforce results([\s\S]*?)end if;/)?.[1]??'';
  assert.match(owner,/from public\.transactions/);
  assert.match(workforce,/private\.organization_scoped_transactions_v1\(p_workspace_id\)/);
  assert.doesNotMatch(workforce,/public\.(companies|contacts|documents|government_procedures)/);
});

test('owner-only domains are all present but cannot escape the owner gate',()=>{
  const tail=sql.slice(sql.indexOf('-- Companies, people, procedures and documents'),sql.indexOf('return coalesce'));
  assert.match(tail,/if v_owner then/);
  for(const domain of ['companies','people','procedures','documents']) assert.match(tail,new RegExp(`'domain','${domain}'`));
  assert.equal((tail.match(/if v_owner then/g)??[]).length,1);
});

test('every result uses the canonical schema and exact internal app destination',()=>{
  assert.equal((sql.match(/'schema','enjaz\.global-search-result\.v1'/g)??[]).length,5);
  for(const destination of ['/app/transactions/','/app/companies?entity=','/app/people?entity=','/app/workflow?procedure=','/app/documents?entity=']) assert.ok(sql.includes(`'destination','${destination}`));
  assert.doesNotMatch(sql,/https?:\/\//i);
});

test('unauthenticated and cross-workspace authority fail before result composition',()=>{
  const authIndex=sql.indexOf("ENJAZ_GLOBAL_SEARCH_AUTH_REQUIRED");
  const actorIndex=sql.indexOf('perform private.require_organization_actor_v1(p_workspace_id)');
  const resultIndex=sql.indexOf("'domain','transactions'");
  assert.ok(authIndex>=0&&actorIndex>authIndex&&resultIndex>actorIndex);
});
