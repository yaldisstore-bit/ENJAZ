import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const migrationPath='database/migrations/phase_11_4_omnichannel_conversation_transport.sql';
const statePath='docs/PHASE11_4_STATE.json';
const migration=fs.readFileSync(path.join(root,migrationPath),'utf8');
const state=JSON.parse(fs.readFileSync(path.join(root,statePath),'utf8'));
const errors=[];
const req=(condition,message)=>{if(!condition)errors.push(message)};
const has=(pattern)=>pattern.test(migration);

req(state.phase==='11.4'&&state.systemId==='M4'&&state.status==='IN_PROGRESS','Phase 11.4 / M4 must remain active');
req(state.currentSlice==='11.4-B','Phase 11.4 current slice must be 11.4-B');
req(state.currentSliceName==='Conversation & Transport Data Model','11.4-B slice name drifted');
req(state.databaseAuthorityExtensionApplied===true,'11.4-B requires applied database authority extension evidence');
req(state.databaseAuthorityMigrationPath===migrationPath,'11.4-B migration path drifted');
req(state.phase11_5Allowed===false&&state.successorStatus==='LOCKED','Phase 11.5 must remain locked');

req(!has(/create\s+table\s+public\.communications\b/i),'11.4-B must evolve canonical communications in-place, never create a shadow replacement');
req(has(/alter\s+table\s+public\.communications[\s\S]*add\s+column\s+conversation_id\s+uuid/i),'canonical communications must gain conversation grouping');
req(has(/add\s+column\s+link_status\s+text\s+not\s+null\s+default\s+'unmatched'/i),'canonical communications must preserve fail-closed link state');
req(has(/add\s+column\s+link_version\s+integer\s+not\s+null\s+default\s+1/i),'canonical communications relink concurrency version is required');
for(const channel of ['sms','whatsapp','client_portal']) req(migration.includes(`'${channel}'`),`canonical channel ${channel} is missing`);

const tables=[
  'communication_conversations','communication_provider_accounts','communication_endpoint_bindings',
  'communication_channel_consents','communication_transport_attempts','communication_transport_events','communication_relink_events',
];
for(const table of tables){
  req(has(new RegExp(`create\\s+table\\s+public\\.${table}\\b`,'i')),`${table} table is missing`);
  req(has(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,'i')),`${table} must enable RLS`);
}

req(has(/communication_transport_attempts_outbound_idempotency_key[\s\S]*workspace_id\s*,\s*provider_account_id\s*,\s*idempotency_key/i),'outbound idempotency unique index is missing');
req(has(/communication_transport_attempts_provider_message_key[\s\S]*workspace_id\s*,\s*provider_account_id\s*,\s*provider_message_id/i),'provider message retry dedupe unique index is missing');
req(has(/communication_transport_events_provider_event_key\s+unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*provider_event_id\s*\)/i),'provider event replay dedupe constraint is missing');
req(has(/direction='incoming'[\s\S]*provider_message_id\s+is\s+not\s+null[\s\S]*direction='outgoing'[\s\S]*idempotency_key\s+is\s+not\s+null/i),'inbound/outbound identity fail-closed constraint is missing');
req(has(/validate_communication_transport_scope_v1/i)&&has(/ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH/i),'provider-account/canonical-channel scope guard is missing');

req(has(/endpoint_fingerprint\s+text\s+not\s+null\s+check\s*\(\s*endpoint_fingerprint\s*~\s*'\^\[a-f0-9\]\{64\}\$'/i),'opaque HMAC endpoint fingerprint contract is missing');
req(has(/fingerprint_scheme\s+text\s+not\s+null\s+default\s+'hmac-sha256-v1'/i),'endpoint fingerprint scheme is missing');
req(!has(/^\s*(?:provider_)?(?:access_token|refresh_token|api_key|webhook_secret|signing_secret|raw_webhook_payload|raw_provider_headers)\s+/im),'provider secret/raw payload columns are forbidden');
req(!has(/\b(endpoint|email_address|phone_number|raw_endpoint)\s+text\b/i),'raw communication endpoints must not be duplicated into M4 matching authority');

req(has(/communication_transport_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i),'transport events must be append-only');
req(has(/communication_relink_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i),'relink evidence must be append-only');
req(has(/resulting_version\s+integer\s+not\s+null\s+check\s*\(\s*resulting_version\s*=\s*expected_version\s*\+\s*1\s*\)/i),'relink evidence must prove optimistic version transition');

req(has(/revoke\s+all\s+on\s+table[\s\S]*communication_relink_events[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/i),'support tables must be explicitly revoked from browser roles');
req(has(/revoke\s+all\s+on\s+table\s+public\.communications\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i),'canonical communications must remain non-direct-browser authority');
req(!has(/grant\s+(?:all|select|insert|update|delete)[\s\S]{0,250}\bto\s+(?:anon|authenticated)\b/i),'11.4-B must not grant direct browser DML/read authority');
req(has(/grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+table\s+public\.communications\s+to\s+service_role/i),'canonical communications must explicitly grant governed server authority');
req(has(/grant\s+select\s*,\s*insert\s+on\s+table[\s\S]*communication_transport_events[\s\S]*communication_relink_events[\s\S]*to\s+service_role/i),'append-only evidence requires explicit server insert/read authority');
req(has(/revoke\s+update\s*,\s*delete\s+on\s+table\s+public\.communication_transport_events\s*,\s*public\.communication_relink_events\s+from\s+service_role/i),'append-only evidence must deny server update/delete');

if(errors.length){
  console.error(`ENJAZ PHASE 11.4-B DATA MODEL AUDIT FAIL (${errors.length})`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 11.4-B DATA MODEL AUDIT PASS');
