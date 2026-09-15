import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_11_4_omnichannel_conversation_transport.sql','utf8');

const normalize=(value)=>value.replace(/\s+/g,' ').trim();

test('canonical communications is evolved, never replaced',()=>{
  assert.doesNotMatch(sql,/create\s+table\s+public\.communications\b/i);
  assert.match(sql,/alter\s+table\s+public\.communications[\s\S]*conversation_id/i);
  assert.match(sql,/communications_channel_check[\s\S]*'sms'[\s\S]*'whatsapp'[\s\S]*'client_portal'/i);
});

test('provider identity table stores no credential or raw webhook authority',()=>{
  const providerTable=sql.match(/create\s+table\s+public\.communication_provider_accounts\s*\(([\s\S]*?)\n\);/i)?.[1]??'';
  assert.ok(providerTable.length>0);
  assert.doesNotMatch(providerTable,/access_token|refresh_token|api_key|secret|credential|raw_webhook|raw_payload/i);
  assert.match(providerTable,/external_account_ref\s+text/i);
});

test('endpoint matching persists opaque fingerprints, not raw endpoints',()=>{
  const bindingTable=sql.match(/create\s+table\s+public\.communication_endpoint_bindings\s*\(([\s\S]*?)\n\);/i)?.[1]??'';
  assert.match(bindingTable,/endpoint_fingerprint\s+text\s+not\s+null/i);
  assert.match(bindingTable,/hmac-sha256-v1/i);
  assert.doesNotMatch(bindingTable,/\bemail_address\b|\bphone_number\b|\braw_endpoint\b/i);
});

test('ambiguous endpoint bindings are not uniqueness-collapsed into a guessed entity',()=>{
  assert.doesNotMatch(sql,/unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*endpoint_fingerprint\s*\)/i);
  assert.match(sql,/communication_endpoint_bindings_lookup_idx[\s\S]*endpoint_fingerprint[\s\S]*where\s+active/i);
});

test('outbound retries and inbound webhook retries have independent hard dedupe identities',()=>{
  assert.match(sql,/create\s+unique\s+index\s+communication_transport_attempts_outbound_idempotency_key[\s\S]*idempotency_key/i);
  assert.match(sql,/create\s+unique\s+index\s+communication_transport_attempts_provider_message_key[\s\S]*provider_message_id/i);
  assert.match(sql,/communication_transport_attempts_identity_check[\s\S]*direction='incoming'[\s\S]*provider_message_id\s+is\s+not\s+null[\s\S]*direction='outgoing'[\s\S]*idempotency_key\s+is\s+not\s+null/i);
});

test('provider event replay cannot mint duplicate delivery evidence',()=>{
  assert.match(sql,/communication_transport_events_provider_event_key\s+unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*provider_event_id\s*\)/i);
});

test('transport evidence cannot silently cross provider account or channel scope',()=>{
  assert.match(sql,/communication_transport_events_attempt_fk\s+foreign\s+key\s*\(\s*workspace_id\s*,\s*attempt_id\s*,\s*provider_account_id\s*\)/i);
  assert.match(sql,/ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH/);
});

test('relink evidence proves actor, reason, old/new scope and optimistic version transition',()=>{
  const relink=sql.match(/create\s+table\s+public\.communication_relink_events\s*\(([\s\S]*?)\n\);/i)?.[1]??'';
  for(const field of ['actor_user_id','old_conversation_id','new_conversation_id','old_company_id','new_company_id','old_contact_id','new_contact_id','old_transaction_id','new_transaction_id','reason','expected_version','resulting_version']){
    assert.match(relink,new RegExp(`\\b${field}\\b`));
  }
  assert.match(relink,/resulting_version\s*=\s*expected_version\s*\+\s*1/i);
});

test('transport and relink evidence are append only even for ordinary server DML',()=>{
  assert.match(sql,/communication_transport_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i);
  assert.match(sql,/communication_relink_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i);
  assert.match(normalize(sql),/revoke update,delete on table public\.communication_transport_events,public\.communication_relink_events from service_role/i);
});

test('all new public authority tables enable RLS and browser privileges are revoked',()=>{
  const tables=['communication_conversations','communication_provider_accounts','communication_endpoint_bindings','communication_channel_consents','communication_transport_attempts','communication_transport_events','communication_relink_events'];
  for(const table of tables){
    assert.match(sql,new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,'i'));
  }
  assert.match(sql,/revoke\s+all\s+on\s+table[\s\S]*from\s+public,anon,authenticated/i);
  assert.doesNotMatch(sql,/grant\s+(?:all|select|insert|update|delete)[\s\S]{0,250}\bto\s+(?:anon|authenticated)\b/i);
});

test('consent is explicit and missing consent remains representable as no authority row',()=>{
  const consent=sql.match(/create\s+table\s+public\.communication_channel_consents\s*\(([\s\S]*?)\n\);/i)?.[1]??'';
  assert.match(consent,/status\s+text\s+not\s+null\s+check\s*\(status\s+in\s*\('granted','withdrawn','not_required'\)\)/i);
  assert.doesNotMatch(consent,/default\s+'granted'/i);
  assert.match(consent,/unique\s*\(workspace_id,channel,endpoint_fingerprint\)/i);
});
