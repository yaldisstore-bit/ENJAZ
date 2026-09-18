import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_12_2_contextual_assistance.sql',root),'utf8');
const edge=fs.readFileSync(new URL('supabase/functions/enjaz-copilot-context/index.ts',root),'utf8');
const core=fs.readFileSync(new URL('supabase/functions/enjaz-copilot-context/core.ts',root),'utf8');

function violations(s=sql,e=edge,c=core){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(s.includes("'search','summarize','compare','draft','explain'"),'context-operations');
  req(s.includes('public.workspace_memberships')&&s.includes('ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'),'workspace-boundary');
  req(s.includes('pg_advisory_xact_lock')&&s.indexOf('pg_advisory_xact_lock')<s.indexOf('insert into private.copilot_rate_buckets'),'concurrent-idempotency');
  req(s.indexOf('select * into v_existing')<s.indexOf('insert into private.copilot_rate_buckets'),'replay-before-quota');
  req(s.includes('ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT'),'idempotency-conflict');
  req(s.includes('grant execute on function public.copilot_begin_request_v2')&&s.includes('to service_role')&&!/grant execute on function public\.copilot_begin_request_v2[\s\S]{0,180}to authenticated/i.test(s),'service-only-begin-v2');
  req(!/\b(insert into|update|delete from)\s+public\.(companies|transactions|payments|documents|renewals|communications|calendar_events|intake_submissions|contacts|government_procedures)/i.test(s),'no-business-write-sql');
  req(!/\b(?:add\s+column\s+)?(prompt|query|model_output|response_body|request_body|answer)\s+(?:text|jsonb|varchar|character\s+varying)\b/i.test(s),'no-raw-ai-columns');
  req(e.includes("userClient.rpc('global_search_v1'"),'authenticated-context-read');
  req(!e.includes("admin.rpc('global_search_v1'"),'no-service-role-context-read');
  req(e.includes("admin.rpc('copilot_begin_request_v2'")&&e.includes("admin.rpc('copilot_finish_request_v1'"),'trace-rpc-boundary');
  req(!/\.from\(['"][^'"]+['"]\)/.test(e),'edge-no-direct-table-access');
  req(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|@ai-sdk\/|generateText|streamText|responses\.create/.test(e+c),'no-provider-or-browser-secret-path');
  req(!/console\.log\(/.test(e),'no-request-logging');
  req(!/\b(insert|update|delete)\b[\s\S]{0,80}\b(companies|transactions|payments|documents)\b/i.test(e),'no-business-write-edge');
  req(c.includes("CONTEXT_SCHEMA='enjaz.copilot.context.v1'")&&c.includes("CONTEXT_OPERATIONS=['search','summarize','compare','draft','explain']"),'structured-context-contract');
  req(c.includes("ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','query','compareWith','limitPerDomain'])"),'bounded-request-fields');
  req(c.includes("'enjaz.global-search-result.v1'")&&c.includes("destination.startsWith('/app/')"),'canonical-provenance-shape');
  req(c.includes("generationMode:'deterministic_grounded_v1'")&&c.includes('providerUsed:false'),'grounded-no-provider-mode');
  req(c.includes("readSemantics:'fresh_on_replay'"),'fresh-replay-semantics');
  return out;
}

test('12.2 contextual source contract passes',()=>assert.deepEqual(violations(),[]));

test('destruction: service-role context read is detected',()=>{
  const mutated=edge.replace("userClient.rpc('global_search_v1'","admin.rpc('global_search_v1'");
  assert.ok(violations(sql,mutated,core).includes('no-service-role-context-read'));
});

test('destruction: canonical business write is detected',()=>{
  const mutated=sql.replace('begin;','begin;\nupdate public.transactions set type=type;');
  assert.ok(violations(mutated,edge,core).includes('no-business-write-sql'));
});

test('destruction: raw query persistence column is detected',()=>{
  const mutated=sql.replace('begin;','begin;\nalter table private.copilot_request_traces add column query text;');
  assert.ok(violations(mutated,edge,core).includes('no-raw-ai-columns'));
});

test('destruction: provider path is detected',()=>{
  assert.ok(violations(sql,edge+"\nconst OPENAI_API_KEY='x';",core).includes('no-provider-or-browser-secret-path'));
});

test('destruction: external destination acceptance is detected',()=>{
  const mutated=core.replace("!destination.startsWith('/app/')","false");
  assert.ok(violations(sql,edge,mutated).includes('canonical-provenance-shape'));
});
