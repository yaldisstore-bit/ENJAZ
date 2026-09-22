import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('database/migrations/phase_14_2_integration_platform_foundation.sql','utf8');
const fixture=fs.readFileSync('tests/fixtures/phase14-2-a2-postgres.sql','utf8');
const has=(source,marker)=>assert.ok(source.includes(marker),marker);

test('A2 stores hashes and prefixes but no raw token or signing secret columns',()=>{
  for(const marker of ['token_hash text not null','signing_key_hash text not null','rawTokenPersisted',
    'revoke all on table private.integration_credentials']) has(migration,marker);
  assert.doesNotMatch(migration,/\b(raw_token|signing_secret|raw_secret)\s+text\b/i);
});

test('A2 binds every authority record to one workspace and service account',()=>{
  for(const marker of ['integration_credentials_service_account_fk','integration_webhook_subscriptions_account_fk',
    'integration_idempotency_receipts_account_fk','integration_webhook_delivery_subscription_fk']) has(migration,marker);
});

test('A2 delivery and idempotency evidence are append-only',()=>{
  for(const marker of ['integration_webhook_delivery_attempts_append_only',
    'integration_idempotency_receipts_append_only','ENJAZ_INTEGRATION_EVIDENCE_APPEND_ONLY']) has(migration,marker);
  assert.doesNotMatch(migration,/grant\s+[^;]*(update|delete)[^;]*integration_webhook_delivery_attempts/is);
});

test('A2 exposes no browser write escape and only server lifecycle functions',()=>{
  for(const signature of [
    'private.integration_issue_credential_v1(uuid,uuid,text,text[],text,text,timestamptz)',
    'private.integration_revoke_service_account_v1(uuid,uuid,uuid)',
    'private.integration_register_webhook_v1(uuid,uuid,text,text[],text,text)',
    'private.integration_record_idempotency_receipt_v1(uuid,uuid,text,text,text,text,text,uuid)'
  ]) {
    has(migration,`revoke all on function ${signature} from public,anon,authenticated`);
    has(migration,`grant execute on function ${signature} to service_role`);
  }
});

test('A2 credential issuance requires the canonical workspace owner',()=>{
  for(const marker of [
    'from public.workspaces w',
    'w.id=p_workspace_id and w.owner_user_id=p_actor_user_id',
    "wm.role='owner'",
    'owner-labelled membership cannot replace canonical workspace owner'
  ]) has(migration+fixture,marker);
});

test('A2 idempotency uses a serialized exact-request replay boundary',()=>{
  for(const marker of ['pg_catalog.pg_advisory_xact_lock','ENJAZ_INTEGRATION_IDEMPOTENCY_CONFLICT',
    "'receiptId',v_row.id,'replayed',true"]) has(migration,marker);
});

test('A2 disposable PostgreSQL fixture covers destructive negative cases',()=>{
  has(fixture,'\\i database/migrations/phase_14_2_integration_platform_foundation.sql');
  for(const marker of ['same-workspace non-owner issue denied','cross-workspace owner issue denied',
    'owner-labelled membership cannot replace canonical workspace owner',
    'cross-workspace webhook registration denied','changed idempotency replay denied',
    'delivery evidence update denied','idempotency evidence delete denied',
    'account revocation closes credentials and subscriptions']) has(fixture,marker);
  assert.doesNotMatch(fixture,/supabase\.co|juzxriirhkuzviwnhkbd/);
});
