import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('database/migrations/phase_11_4_omnichannel_conversation_transport.sql','utf8');
const deny=fs.readFileSync('database/migrations/phase_11_4_omnichannel_browser_deny_hardening.sql','utf8');
const performance=fs.readFileSync('database/migrations/phase_11_4_omnichannel_performance_hardening.sql','utf8');
const direction=fs.readFileSync('database/migrations/phase_11_4_omnichannel_transport_direction_hardening.sql','utf8');
const content=fs.readFileSync('database/migrations/phase_11_4_omnichannel_canonical_content_hardening.sql','utf8');
const probe=fs.readFileSync('database/migrations/phase_11_4_live_conversation_transport_probe.sql','utf8');
const contentProbe=fs.readFileSync('database/migrations/phase_11_4_live_canonical_content_probe.sql','utf8');

const normalize=(value)=>value.replace(/\s+/g,' ').trim();

test('canonical communications is evolved, never replaced',()=>{
  assert.doesNotMatch(sql,/create\s+table\s+public\.communications\b/i);
  assert.match(sql,/alter\s+table\s+public\.communications[\s\S]*conversation_id/i);
  assert.match(sql,/communications_channel_check[\s\S]*'sms'[\s\S]*'whatsapp'[\s\S]*'client_portal'/i);
});

test('full message subject and body stay on canonical communications instead of a shadow store',()=>{
  assert.match(content,/alter\s+table\s+public\.communications[\s\S]*add\s+column\s+subject\s+text[\s\S]*add\s+column\s+body_text\s+text/i);
  assert.match(content,/communications_subject_check[\s\S]*between\s+1\s+and\s+998/i);
  assert.match(content,/communications_body_text_check[\s\S]*between\s+1\s+and\s+200000/i);
  assert.match(content,/Short canonical preview\/search summary only; not the full message body\./i);
  assert.match(content,/Canonical sanitized plain-text message body\. Provider raw payload\/HTML is not authoritative here\./i);
  assert.doesNotMatch(content,/create\s+table\s+public\.(?:message|communication)_(?:bodies|contents|payloads)\b/i);
});

test('canonical message envelope and content become immutable once transport begins',()=>{
  assert.match(content,/guard_communication_content_immutability_v1/i);
  for(const field of ['channel','direction','summary','subject','body_text','occurred_at','metadata']){
    assert.match(content,new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`,'i'));
  }
  assert.match(content,/ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT/);
  assert.match(content,/security\s+invoker[\s\S]*set\s+search_path\s*=\s*''/i);
  assert.match(content,/revoke\s+all\s+on\s+function\s+private\.guard_communication_content_immutability_v1\(\)\s+from\s+public,anon,authenticated/i);
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

test('exact endpoint-target duplicates are blocked without collapsing genuine ambiguity',()=>{
  assert.doesNotMatch(sql,/unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*endpoint_fingerprint\s*\)/i);
  assert.match(sql,/communication_endpoint_bindings_lookup_idx[\s\S]*endpoint_fingerprint[\s\S]*where\s+active/i);
  assert.match(performance,/create\s+unique\s+index\s+communication_endpoint_bindings_exact_target_key[\s\S]*company_id\s*,\s*contact_id\s*,\s*transaction_id[\s\S]*nulls\s+not\s+distinct/i);
});

test('outbound retries and inbound webhook retries have independent hard dedupe identities',()=>{
  assert.match(sql,/create\s+unique\s+index\s+communication_transport_attempts_outbound_idempotency_key[\s\S]*idempotency_key/i);
  assert.match(sql,/create\s+unique\s+index\s+communication_transport_attempts_provider_message_key[\s\S]*provider_message_id/i);
  assert.match(sql,/communication_transport_attempts_identity_check[\s\S]*direction='incoming'[\s\S]*provider_message_id\s+is\s+not\s+null[\s\S]*direction='outgoing'[\s\S]*idempotency_key\s+is\s+not\s+null/i);
});

test('provider event replay cannot mint duplicate delivery evidence',()=>{
  assert.match(sql,/communication_transport_events_provider_event_key\s+unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*provider_event_id\s*\)/i);
});

test('transport evidence cannot silently cross provider account, channel, or direction scope',()=>{
  assert.match(sql,/communication_transport_events_attempt_fk\s+foreign\s+key\s*\(\s*workspace_id\s*,\s*attempt_id\s*,\s*provider_account_id\s*\)/i);
  assert.match(sql,/ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH/);
  assert.match(direction,/ENJAZ_COMMUNICATION_TRANSPORT_DIRECTION_MISMATCH/);
  assert.match(direction,/v_communication_direction<>new\.direction/i);
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

test('all new authority tables use RLS plus restrictive browser deny and no browser privilege',()=>{
  const tables=['communication_conversations','communication_provider_accounts','communication_endpoint_bindings','communication_channel_consents','communication_transport_attempts','communication_transport_events','communication_relink_events'];
  for(const table of tables){
    assert.match(sql,new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,'i'));
    assert.match(deny,new RegExp(`create\\s+policy\\s+${table}_browser_deny[\\s\\S]*?as\\s+restrictive\\s+for\\s+all\\s+to\\s+anon,authenticated[\\s\\S]*?using\\s*\\(false\\)\\s+with\\s+check\\s*\\(false\\)`,'i'));
  }
  assert.match(deny,/communications_m4_browser_deny/);
  assert.match(sql,/revoke\s+all\s+on\s+table[\s\S]*from\s+public,anon,authenticated/i);
  assert.doesNotMatch(sql,/grant\s+(?:all|select|insert|update|delete)[\s\S]{0,250}\bto\s+(?:anon|authenticated)\b/i);
});

test('consent is explicit and missing consent remains representable as no authority row',()=>{
  const consent=sql.match(/create\s+table\s+public\.communication_channel_consents\s*\(([\s\S]*?)\n\);/i)?.[1]??'';
  assert.match(consent,/status\s+text\s+not\s+null\s+check\s*\(status\s+in\s*\('granted','withdrawn','not_required'\)\)/i);
  assert.doesNotMatch(consent,/default\s+'granted'/i);
  assert.match(consent,/unique\s*\(workspace_id,channel,endpoint_fingerprint\)/i);
});

test('performance hardening covers every M4 foreign key flagged by the live advisor',()=>{
  const required=[
    'communication_channel_consents_updated_by_fk_idx','communication_conversations_created_by_fk_idx',
    'communication_endpoint_bindings_company_fk_idx','communication_endpoint_bindings_transaction_fk_idx',
    'communication_endpoint_bindings_created_by_fk_idx','communication_provider_accounts_created_by_fk_idx',
    'communication_relink_events_old_conversation_fk_idx','communication_relink_events_new_conversation_fk_idx',
    'communication_relink_events_old_company_fk_idx','communication_relink_events_new_company_fk_idx',
    'communication_relink_events_old_contact_fk_idx','communication_relink_events_new_contact_fk_idx',
    'communication_relink_events_old_transaction_fk_idx','communication_relink_events_new_transaction_fk_idx',
    'communication_transport_events_attempt_fk_idx',
  ];
  for(const index of required)assert.match(performance,new RegExp(`\\b${index}\\b`));
});

test('Real Cloud probe attacks every critical data-model boundary and proves zero residue',()=>{
  for(const marker of [
    'OUTBOUND_DEDUPE_FAILED','INBOUND_DEDUPE_FAILED','CHANNEL_GUARD_FAILED','DIRECTION_GUARD_FAILED',
    'EVENT_REPLAY_GUARD_FAILED','EVENT_APPEND_ONLY_FAILED','RELINK_APPEND_ONLY_FAILED',
    'EXACT_BINDING_DEDUPE_FAILED','CONSENT_IDENTITY_FAILED','CROSS_WORKSPACE_FK_FAILED','PROBE_RESIDUE',
  ]) assert.match(probe,new RegExp(`ENJAZ_PHASE114B_${marker}`));
  assert.match(probe,/disable\s+trigger\s+communication_transport_events_append_only[\s\S]*enable\s+trigger\s+communication_transport_events_append_only/i);
  assert.match(probe,/disable\s+trigger\s+communication_relink_events_append_only[\s\S]*enable\s+trigger\s+communication_relink_events_append_only/i);
});

test('Real Cloud canonical content probe proves long body, pre-send editability, post-send immutability, relink separation, and zero residue',()=>{
  for(const marker of [
    'CONTENT_PROBE_BODY_NOT_LONG_ENOUGH','PRETRANSPORT_CONTENT_EDIT_FAILED',
    'POSTTRANSPORT_BODY_MUTATION_ALLOWED','POSTTRANSPORT_SUBJECT_MUTATION_ALLOWED',
    'POSTTRANSPORT_SUMMARY_MUTATION_ALLOWED','POSTTRANSPORT_METADATA_MUTATION_ALLOWED',
    'RELINK_STATE_SEPARATION_FAILED','CONTENT_PROBE_RESIDUE',
  ]) assert.match(contentProbe,new RegExp(`ENJAZ_PHASE114B_${marker}`));
  assert.match(contentProbe,/char_length\(body_text\)>1200/i);
  assert.match(contentProbe,/insert\s+into\s+public\.communication_transport_attempts[\s\S]*update\s+public\.communications\s+set\s+body_text='mutated after transport'/i);
  assert.match(contentProbe,/set\s+link_status='review_required'\s*,\s*link_version=link_version\+1/i);
});
