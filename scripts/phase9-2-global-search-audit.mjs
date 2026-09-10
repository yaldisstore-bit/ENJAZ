import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('database/migrations/phase_9_2_global_search_intelligence.sql');
const grantFix=read('database/migrations/phase_9_2_global_search_invoker_grant_fix.sql');
const fail=(m)=>{throw new Error(`Phase 9.2 Global Search audit: ${m}`)};
const must=(m)=>{if(!sql.includes(m))fail(`missing ${m}`)};

for(const marker of [
  'create or replace function private.global_search_v1_impl',
  'security definer',
  "set search_path = ''",
  'perform private.require_organization_actor_v1(p_workspace_id)',
  'v_owner := private.is_organization_owner_v1(p_workspace_id)',
  'private.organization_scoped_transactions_v1(p_workspace_id)',
  "'domain','transactions'",
  "'domain','companies'",
  "'domain','people'",
  "'domain','procedures'",
  "'domain','documents'",
  "'schema','enjaz.global-search-result.v1'",
  "'destination','/app/transactions/'",
  "'destination','/app/companies?entity='",
  "'destination','/app/people?entity='",
  "'destination','/app/workflow?procedure='",
  "'destination','/app/documents?entity='",
  'create or replace function public.global_search_v1',
  'security invoker',
  'revoke all on function private.global_search_v1_impl(uuid,text,integer) from public,anon,authenticated',
  'revoke all on function public.global_search_v1(uuid,text,integer) from public,anon',
  'grant execute on function public.global_search_v1(uuid,text,integer) to authenticated',
]) must(marker);

for(const marker of [
  'revoke all on function private.global_search_v1_impl(uuid,text,integer) from public,anon,authenticated',
  'grant execute on function private.global_search_v1_impl(uuid,text,integer) to authenticated',
  'revoke all on function public.global_search_v1(uuid,text,integer) from public,anon',
  'grant execute on function public.global_search_v1(uuid,text,integer) to authenticated',
]) if(!grantFix.includes(marker))fail(`invoker bridge repair missing ${marker}`);
if(/grant\s+execute[\s\S]*\bto\s+anon\b/i.test(grantFix))fail('anon execution authority introduced by invoker bridge repair');

const ownerBlock=sql.match(/if v_owner then([\s\S]*?)else/)?.[1]??'';
if(!ownerBlock.includes('from public.transactions'))fail('owner transaction search must include unassigned authoritative transactions');
const workforceBlock=sql.match(/else\n\s*-- Workforce results([\s\S]*?)end if;/)?.[1]??'';
if(!workforceBlock.includes('private.organization_scoped_transactions_v1'))fail('workforce transaction search must reuse M15 scoped authority');
if(/from\s+public\.(companies|contacts|documents|government_procedures)/i.test(workforceBlock))fail('workforce branch leaks an owner-only domain');
const ownerOnlyTail=sql.match(/-- Companies, people, procedures and documents([\s\S]*?)return coalesce/)?.[1]??'';
if(!/^\s*[\s\S]*if v_owner then/.test(ownerOnlyTail))fail('legacy domains must stay owner-gated');
for(const forbidden of [/\binsert\s+into\b/i,/\bupdate\s+public\./i,/\bdelete\s+from\b/i,/\bupsert\b/i,/service_role/i,/execute\s+format/i]){
  if(forbidden.test(sql))fail(`forbidden write/bypass marker ${forbidden}`);
}
if(!/char_length\(v_query\) < 2 or char_length\(v_query\) > 120/.test(sql))fail('query bounds missing');
if(!/v_limit < 1 or v_limit > 10/.test(sql))fail('per-domain result bound missing');
console.log('ENJAZ PHASE 9.2 GLOBAL SEARCH AUDIT PASS — owner completeness preserved; M15 workforce transaction scope reused; SECURITY INVOKER bridge executable only by authenticated callers; owner-only domains do not leak; read-only RPC and internal deep links enforced.');
