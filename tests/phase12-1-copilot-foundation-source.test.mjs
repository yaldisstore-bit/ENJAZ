import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const sql=fs.readFileSync(new URL('database/migrations/phase_12_1_copilot_foundation.sql',root),'utf8');
const edge=fs.readFileSync(new URL('supabase/functions/enjaz-copilot-foundation/index.ts',root),'utf8');
const core=fs.readFileSync(new URL('supabase/functions/enjaz-copilot-foundation/core.ts',root),'utf8');

function violations(s=sql,e=edge,c=core){
  const out=[];const req=(ok,name)=>{if(!ok)out.push(name)};
  req(s.includes('create table private.copilot_rate_buckets')&&s.includes('create table private.copilot_request_traces'),'private-evidence');
  req(s.includes('copilot_rate_buckets_actor_fk_idx')&&s.includes('copilot_request_traces_actor_fk_idx'),'fk-indexes');
  req(s.includes('public.workspace_memberships')&&s.includes('ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'),'workspace-boundary');
  req(s.includes('pg_advisory_xact_lock')&&s.indexOf('pg_advisory_xact_lock')<s.indexOf('insert into private.copilot_rate_buckets'),'concurrent-idempotency');
  req(s.indexOf('select * into v_existing')<s.indexOf('insert into private.copilot_rate_buckets'),'replay-before-quota');
  req(s.includes('ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT'),'idempotency-conflict');
  req(s.includes('least(private.copilot_rate_buckets.request_count+1,p_limit+1)'),'bounded-rate-counter');
  req(s.includes("operation in ('capabilities','provider_probe')"),'operation-check');
  req(s.includes("revoke all on table private.copilot_rate_buckets from public,anon,authenticated,service_role")&&s.includes("revoke all on table private.copilot_request_traces from public,anon,authenticated,service_role"),'private-table-grants');
  req(s.includes('grant execute on function public.copilot_begin_request_v1')&&s.includes('to service_role')&&!/grant execute on function public\.copilot_begin_request_v1[\s\S]{0,180}to authenticated/i.test(s),'service-only-begin');
  req(s.includes('grant execute on function public.copilot_finish_request_v1')&&s.includes('to service_role')&&!/grant execute on function public\.copilot_finish_request_v1[\s\S]{0,180}to authenticated/i.test(s),'service-only-finish');
  const tableDdl=s.slice(s.indexOf('create table private.copilot_rate_buckets'),s.indexOf('revoke all on table private.copilot_rate_buckets'));
  req(!/\n\s*(prompt|model_output|response_body|request_body)\s+[a-z]/i.test(tableDdl),'no-raw-ai-columns');
  req(!/\b(insert into|update|delete from)\s+public\.(companies|transactions|payments|documents|renewals|communications|calendar_events|intake_submissions)/i.test(s),'no-business-write');
  req(!/from\(['"][^'"]+['"]\)/.test(e),'edge-no-table-access');
  req(e.includes("admin.rpc('copilot_begin_request_v1'")&&e.includes("admin.rpc('copilot_finish_request_v1'"),'edge-rpc-boundary');
  req(!/from ['"]ai['"]|@ai-sdk\/|generateText|streamText|ToolLoopAgent/.test(e+c),'no-ai-provider-sdk');
  req(e.includes("parsed.operation==='capabilities'")&&e.includes("PROVIDER_NOT_CONFIGURED")&&e.includes('return json(503'),'provider-fail-closed');
  req(e.includes("finishTrace('failed'"),'failure-trace-reconciliation');
  req(!e.includes('console.log('),'no-request-logging');
  req(c.includes("FOUNDATION_SCHEMA='enjaz.copilot.foundation.v1'")&&c.includes("FOUNDATION_OPERATIONS=['capabilities','provider_probe']"),'structured-contract');
  req(c.includes("ALLOWED_KEYS=new Set(['workspaceId','requestId','operation'])"),'no-prompt-input');
  return out;
}

test('12.1 foundation source contract passes',()=>assert.deepEqual(violations(),[]));
test('destruction: browser execute grant is detected',()=>{
  const marker="grant execute on function public.copilot_begin_request_v1(uuid,uuid,uuid,text,text,integer)\n  to service_role;";
  const mutated=sql.replace(marker,marker.replace('to service_role;','to authenticated;'));
  assert.ok(violations(mutated).includes('service-only-begin'));
});
test('destruction: canonical business write is detected',()=>assert.ok(violations(sql.replace('begin;','begin;\nupdate public.transactions set type=type;')).includes('no-business-write')));
test('destruction: AI SDK/provider call is detected',()=>assert.ok(violations(sql,edge+"\nimport {generateText} from 'ai';",core).includes('no-ai-provider-sdk')));
test('destruction: raw prompt column is detected',()=>assert.ok(violations(sql.replace('payload_hash text','prompt text,\n  payload_hash text')).includes('no-raw-ai-columns')));
test('destruction: removing advisory lock is detected',()=>{
  const mutated=sql.replace(/\s*perform pg_advisory_xact_lock\([^;]+;\n/,'\n');
  assert.ok(violations(mutated).includes('concurrent-idempotency'));
});
