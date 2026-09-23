import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('database/migrations/phase_14_2_webhook_delivery_vault.sql','utf8');
const worker=fs.readFileSync('supabase/functions/enjaz-integration-webhook-worker/index.ts','utf8');

const has=(source,value)=>assert.ok(source.includes(value),value);

test('A4 stores per-subscription signing material in Vault, not ENJAZ tables',()=>{
  for(const value of [
    "create extension if not exists supabase_vault with schema vault","to_regclass('vault.secrets')","vault.create_secret(","vault.decrypted_secrets",
    "signing_secret_id","rawSecretPersistedInEnjazTables',false"
  ]) has(migration,value);
  assert.match(migration,/revoke all on schema vault from public,anon,authenticated,service_role/i);
  assert.match(migration,/revoke all on table vault\.decrypted_secrets from public,anon,authenticated,service_role/i);
  assert.doesNotMatch(migration,/add column[^;]*(raw_secret|signing_secret\s+text)/i);
});

test('A4 outbox and delivery evidence are private and service-role only',()=>{
  for(const value of [
    'private.integration_webhook_outbox','force row level security',
    'revoke all on table private.integration_webhook_outbox from public,anon,authenticated,service_role',
    'grant select,insert,update on table private.integration_webhook_outbox to service_role',
    'integration_webhook_delivery_attempts'
  ]) has(migration,value);
  assert.doesNotMatch(migration,/grant execute[^;]+to authenticated/i);
});

test('A4 public RPC bridge is fail-closed and service-role only',()=>{
  for(const fn of [
    'integration_register_webhook_v2','integration_enqueue_webhook_event_v1',
    'integration_claim_webhook_delivery_v1','integration_complete_webhook_delivery_v1'
  ]){
    has(migration,`revoke all on function public.${fn}`);
    has(migration,`grant execute on function public.${fn}`);
  }
});

test('A4 worker signs exact v1 material and enforces retry/dead-letter limits',()=>{
  for(const value of [
    'ENJAZ_INTEGRATION_WORKER_KEY','X-ENJAZ-Signature','enjaz.webhook.v1',
    'MAX_ATTEMPTS=5','RETRY_DELAYS=[60,300,1800,7200]',
    "redirect:'error'","AbortSignal.timeout(10_000)",
    "ENDPOINT_UNSAFE","SIGNING_SECRET_UNAVAILABLE"
  ]) has(worker,value);
  assert.doesNotMatch(worker,/console\.log\([^)]*(signingSecret|secret)/);
});

test('A4 worker rejects literal local/private endpoints before fetch',()=>{
  for(const value of ["u.protocol!=='https:'","h==='localhost'","h.endsWith('.localhost')","isPrivateIpv4(h)"])
    has(worker,value);
});

test('A4 Vault preflight PL/pgSQL block uses balanced dollar quote delimiters',()=>{
  assert.match(migration,/\bdo \$\$\s*begin[\s\S]*?end;\s*\$\$;/i);
  assert.doesNotMatch(migration,/\bdo \$\s*begin/i);
});

test('A4 claim denies delivery after service-account revocation or expiry',()=>{
  const claim=migration.split('create or replace function public.integration_claim_webhook_delivery_v1(')[1]?.split('create or replace function public.integration_complete_webhook_delivery_v1(')[0]??'';
  has(claim,'join public.integration_service_accounts a');
  has(claim,"a.status='active'");
  has(claim,'a.expires_at is null or a.expires_at>clock_timestamp()');
  has(claim,"s.status='active'");
});

test('A4 worker blocks IPv4 and IPv6 literal webhook destinations before signed fetch',()=>{
  has(worker,"/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(h)");
  has(worker,"h.startsWith('[')");
  assert.ok(worker.indexOf("h.startsWith('[')")<worker.indexOf('const response=await fetch(endpoint')));
});
