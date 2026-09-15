import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  authority:'database/migrations/phase_11_4_omnichannel_conversation_transport.sql',
  browserDeny:'database/migrations/phase_11_4_omnichannel_browser_deny_hardening.sql',
  performance:'database/migrations/phase_11_4_omnichannel_performance_hardening.sql',
  direction:'database/migrations/phase_11_4_omnichannel_transport_direction_hardening.sql',
  canonicalContent:'database/migrations/phase_11_4_omnichannel_canonical_content_hardening.sql',
  probe:'database/migrations/phase_11_4_live_conversation_transport_probe.sql',
  contentProbe:'database/migrations/phase_11_4_live_canonical_content_probe.sql',
};
const statePath='docs/PHASE11_4_STATE.json';
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read(paths.authority);
const browserDeny=read(paths.browserDeny);
const performance=read(paths.performance);
const direction=read(paths.direction);
const canonicalContent=read(paths.canonicalContent);
const probe=read(paths.probe);
const contentProbe=read(paths.contentProbe);
const state=JSON.parse(read(statePath));
const errors=[];
const req=(condition,message)=>{if(!condition)errors.push(message)};
const has=(text,pattern)=>pattern.test(text);

req(state.phase==='11.4'&&state.systemId==='M4'&&state.status==='IN_PROGRESS','Phase 11.4 / M4 must remain active');
req(state.phase11_4aMergeCommit==='30a9fe04f9173f5bb4f5593e82f1843e994c49e9','11.4-A merge lineage drifted');
req(state.currentSliceBaseCommit===state.phase11_4aMergeCommit,'11.4-B must branch from certified 11.4-A merge');
req(state.mode==='CONVERSATION_TRANSPORT_DATA_MODEL_REAL_CLOUD_VERIFIED','11.4-B mode must record Real Cloud verification');
req(state.currentSlice==='11.4-B','Phase 11.4 current slice must be 11.4-B');
req(state.currentSliceName==='Conversation & Transport Data Model','11.4-B slice name drifted');
req(state.databaseAuthorityExtensionApplied===true,'11.4-B requires applied database authority extension evidence');
req(state.databaseAuthorityMigrationPath===paths.authority,'11.4-B authority migration path drifted');
req(state.databaseBrowserDenyHardeningPath===paths.browserDeny,'11.4-B browser deny hardening path drifted');
req(state.databasePerformanceHardeningPath===paths.performance,'11.4-B performance hardening path drifted');
req(state.databaseTransportDirectionHardeningPath===paths.direction,'11.4-B direction hardening path drifted');
req(state.databaseCanonicalContentHardeningPath===paths.canonicalContent,'11.4-B canonical content hardening path drifted');
req(state.databaseLiveProbePath===paths.probe,'11.4-B live probe path drifted');
req(state.databaseCanonicalContentLiveProbePath===paths.contentProbe,'11.4-B canonical content live probe path drifted');
req(state.realCloudDatabaseVerification==='PASS'&&state.realCloudDatabaseProbeZeroResidue===true,'11.4-B Real Cloud database evidence must PASS with zero residue');
req(state.realCloudCanonicalContentVerification==='PASS'&&state.realCloudCanonicalContentProbeZeroResidue===true,'11.4-B canonical content Real Cloud evidence must PASS with zero residue');
req(state.canonicalMessageContentAuthority==='communications','full message content must remain on canonical communications');
req(state.canonicalMessageSubjectColumn==='subject'&&state.canonicalMessageBodyColumn==='body_text','canonical message subject/body columns drifted');
req(state.summaryRole==='SHORT_PREVIEW_SEARCH_ONLY','summary must not be treated as full message body');
req(state.providerRawHtmlCanonicalAllowed===false,'raw provider HTML must not become canonical communication truth');
req(state.contentMutableBeforeTransport===true&&state.contentImmutableAfterTransport===true,'canonical content lifecycle contract drifted');
req(state.durableWriteRoundTripVerification==='PASS_DATABASE_PROBE','11.4-B durable database round trip must PASS');
req(state.permissionMatrixVerification==='PASS_BACKEND_ONLY_DIRECT_BROWSER_DENY','11.4-B browser authority boundary must PASS');
req(state.supabaseM4SecurityAdvisorRlsNoPolicyFindings===0,'M4 must have zero RLS-no-policy advisor findings');
req(state.supabaseM4UnindexedForeignKeys===0,'M4 must have zero unindexed foreign keys');
req(state.supabaseM4ForbiddenSecretOrRawEndpointColumns===0,'M4 must have zero secret/raw endpoint columns');
req(state.phase11_5Allowed===false&&state.successorStatus==='LOCKED','Phase 11.5 must remain locked');

req(!has(migration,/create\s+table\s+public\.communications\b/i),'11.4-B must evolve canonical communications in-place, never create a shadow replacement');
req(has(migration,/alter\s+table\s+public\.communications[\s\S]*add\s+column\s+conversation_id\s+uuid/i),'canonical communications must gain conversation grouping');
req(has(migration,/add\s+column\s+link_status\s+text\s+not\s+null\s+default\s+'unmatched'/i),'canonical communications must preserve fail-closed link state');
req(has(migration,/add\s+column\s+link_version\s+integer\s+not\s+null\s+default\s+1/i),'canonical communications relink concurrency version is required');
for(const channel of ['sms','whatsapp','client_portal']) req(migration.includes(`'${channel}'`),`canonical channel ${channel} is missing`);

req(has(canonicalContent,/alter\s+table\s+public\.communications[\s\S]*add\s+column\s+subject\s+text[\s\S]*add\s+column\s+body_text\s+text/i),'canonical communications must own full subject/body content');
req(has(canonicalContent,/communications_subject_check[\s\S]*between\s+1\s+and\s+998/i),'canonical subject bound is missing');
req(has(canonicalContent,/communications_body_text_check[\s\S]*between\s+1\s+and\s+200000/i),'canonical body bound is missing');
req(has(canonicalContent,/Short canonical preview\/search summary only; not the full message body\./i),'summary preview-only role must be documented at the database boundary');
req(has(canonicalContent,/Canonical sanitized plain-text message body\. Provider raw payload\/HTML is not authoritative here\./i),'canonical body must explicitly reject provider raw payload/HTML authority');
req(has(canonicalContent,/guard_communication_content_immutability_v1/i),'post-transport content immutability guard is missing');
for(const field of ['channel','direction','summary','subject','body_text','occurred_at','metadata']){
  req(has(canonicalContent,new RegExp(`new\\.${field}\\s+is\\s+distinct\\s+from\\s+old\\.${field}`,'i')),`post-transport immutability guard omits ${field}`);
}
req(has(canonicalContent,/ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT/i),'content immutability failure contract is missing');
req(has(canonicalContent,/before\s+update\s+of\s+channel\s*,\s*direction\s*,\s*summary\s*,\s*subject\s*,\s*body_text\s*,\s*occurred_at\s*,\s*metadata/i),'canonical content trigger field scope drifted');
req(has(canonicalContent,/security\s+invoker[\s\S]*set\s+search_path\s*=\s*''/i),'canonical content guard must remain security invoker with empty search_path');
req(has(canonicalContent,/revoke\s+all\s+on\s+function\s+private\.guard_communication_content_immutability_v1\(\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i),'canonical content helper must not be directly API callable');

const tables=[
  'communication_conversations','communication_provider_accounts','communication_endpoint_bindings',
  'communication_channel_consents','communication_transport_attempts','communication_transport_events','communication_relink_events',
];
for(const table of tables){
  req(has(migration,new RegExp(`create\\s+table\\s+public\\.${table}\\b`,'i')),`${table} table is missing`);
  req(has(migration,new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,'i')),`${table} must enable RLS`);
  req(has(browserDeny,new RegExp(`create\\s+policy\\s+${table}_browser_deny[\\s\\S]*?on\\s+public\\.${table}[\\s\\S]*?as\\s+restrictive\\s+for\\s+all\\s+to\\s+anon\\s*,\\s*authenticated[\\s\\S]*?using\\s*\\(false\\)\\s+with\\s+check\\s*\\(false\\)`,'i')),`${table} restrictive browser-deny policy is missing`);
}
req(has(browserDeny,/create\s+policy\s+communications_m4_browser_deny[\s\S]*?on\s+public\.communications[\s\S]*?as\s+restrictive\s+for\s+all\s+to\s+anon\s*,\s*authenticated[\s\S]*?using\s*\(false\)\s+with\s+check\s*\(false\)/i),'canonical communications restrictive browser-deny policy is missing');

req(has(migration,/communication_transport_attempts_outbound_idempotency_key[\s\S]*workspace_id\s*,\s*provider_account_id\s*,\s*idempotency_key/i),'outbound idempotency unique index is missing');
req(has(migration,/communication_transport_attempts_provider_message_key[\s\S]*workspace_id\s*,\s*provider_account_id\s*,\s*provider_message_id/i),'provider message retry dedupe unique index is missing');
req(has(migration,/communication_transport_events_provider_event_key\s+unique\s*\(\s*workspace_id\s*,\s*provider_account_id\s*,\s*provider_event_id\s*\)/i),'provider event replay dedupe constraint is missing');
req(has(migration,/direction='incoming'[\s\S]*provider_message_id\s+is\s+not\s+null[\s\S]*direction='outgoing'[\s\S]*idempotency_key\s+is\s+not\s+null/i),'inbound/outbound identity fail-closed constraint is missing');
req(has(migration,/ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH/i),'provider-account/canonical-channel scope guard is missing');
req(has(direction,/ENJAZ_COMMUNICATION_TRANSPORT_DIRECTION_MISMATCH/i)&&has(direction,/v_communication_direction<>new\.direction/i),'canonical/transport direction guard is missing');

req(has(migration,/endpoint_fingerprint\s+text\s+not\s+null\s+check\s*\(\s*endpoint_fingerprint\s*~\s*'\^\[a-f0-9\]\{64\}\$'/i),'opaque HMAC endpoint fingerprint contract is missing');
req(has(migration,/fingerprint_scheme\s+text\s+not\s+null\s+default\s+'hmac-sha256-v1'/i),'endpoint fingerprint scheme is missing');
req(!has(migration,/^\s*(?:provider_)?(?:access_token|refresh_token|api_key|webhook_secret|signing_secret|raw_webhook_payload|raw_provider_headers)\s+/im),'provider secret/raw payload columns are forbidden');
req(!has(migration,/\b(email_address|phone_number|raw_endpoint)\s+text\b/i),'raw communication endpoints must not be duplicated into M4 matching authority');
req(has(performance,/communication_endpoint_bindings_exact_target_key[\s\S]*nulls\s+not\s+distinct/i),'exact endpoint-target binding dedupe hardening is missing');

req(has(migration,/communication_transport_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i),'transport events must be append-only');
req(has(migration,/communication_relink_events_append_only[\s\S]*reject_communication_evidence_mutation_v1/i),'relink evidence must be append-only');
req(has(migration,/resulting_version\s+integer\s+not\s+null\s+check\s*\(\s*resulting_version\s*=\s*expected_version\s*\+\s*1\s*\)/i),'relink evidence must prove optimistic version transition');

req(has(migration,/revoke\s+all\s+on\s+table[\s\S]*communication_relink_events[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/i),'support tables must be explicitly revoked from browser roles');
req(has(migration,/revoke\s+all\s+on\s+table\s+public\.communications\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i),'canonical communications must remain non-direct-browser authority');
req(!has(migration,/grant\s+(?:all|select|insert|update|delete)[\s\S]{0,250}\bto\s+(?:anon|authenticated)\b/i),'11.4-B must not grant direct browser DML/read authority');
req(has(migration,/grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+table\s+public\.communications\s+to\s+service_role/i),'canonical communications must explicitly grant governed server authority');
req(has(migration,/grant\s+select\s*,\s*insert\s+on\s+table[\s\S]*communication_transport_events[\s\S]*communication_relink_events[\s\S]*to\s+service_role/i),'append-only evidence requires explicit server insert/read authority');
req(has(migration,/revoke\s+update\s*,\s*delete\s+on\s+table\s+public\.communication_transport_events\s*,\s*public\.communication_relink_events\s+from\s+service_role/i),'append-only evidence must deny server update/delete');

const requiredPerformanceIndexes=[
  'communication_channel_consents_updated_by_fk_idx','communication_conversations_created_by_fk_idx',
  'communication_endpoint_bindings_company_fk_idx','communication_endpoint_bindings_transaction_fk_idx',
  'communication_endpoint_bindings_created_by_fk_idx','communication_provider_accounts_created_by_fk_idx',
  'communication_relink_events_old_conversation_fk_idx','communication_relink_events_new_conversation_fk_idx',
  'communication_relink_events_old_company_fk_idx','communication_relink_events_new_company_fk_idx',
  'communication_relink_events_old_contact_fk_idx','communication_relink_events_new_contact_fk_idx',
  'communication_relink_events_old_transaction_fk_idx','communication_relink_events_new_transaction_fk_idx',
  'communication_transport_events_attempt_fk_idx',
];
for(const indexName of requiredPerformanceIndexes) req(performance.includes(indexName),`performance hardening index ${indexName} is missing`);

for(const marker of [
  'ENJAZ_PHASE114B_OUTBOUND_DEDUPE_FAILED','ENJAZ_PHASE114B_INBOUND_DEDUPE_FAILED',
  'ENJAZ_PHASE114B_CHANNEL_GUARD_FAILED','ENJAZ_PHASE114B_DIRECTION_GUARD_FAILED',
  'ENJAZ_PHASE114B_EVENT_REPLAY_GUARD_FAILED','ENJAZ_PHASE114B_EVENT_APPEND_ONLY_FAILED',
  'ENJAZ_PHASE114B_RELINK_APPEND_ONLY_FAILED','ENJAZ_PHASE114B_EXACT_BINDING_DEDUPE_FAILED',
  'ENJAZ_PHASE114B_CONSENT_IDENTITY_FAILED','ENJAZ_PHASE114B_CROSS_WORKSPACE_FK_FAILED',
  'ENJAZ_PHASE114B_PROBE_RESIDUE',
]) req(probe.includes(marker),`Real Cloud destructive probe marker ${marker} is missing`);
req(has(probe,/disable\s+trigger\s+communication_transport_events_append_only[\s\S]*enable\s+trigger\s+communication_transport_events_append_only/i),'probe must re-enable transport append-only trigger after privileged cleanup');
req(has(probe,/disable\s+trigger\s+communication_relink_events_append_only[\s\S]*enable\s+trigger\s+communication_relink_events_append_only/i),'probe must re-enable relink append-only trigger after privileged cleanup');

for(const marker of [
  'ENJAZ_PHASE114B_CONTENT_PROBE_BODY_NOT_LONG_ENOUGH','ENJAZ_PHASE114B_PRETRANSPORT_CONTENT_EDIT_FAILED',
  'ENJAZ_PHASE114B_POSTTRANSPORT_BODY_MUTATION_ALLOWED','ENJAZ_PHASE114B_POSTTRANSPORT_SUBJECT_MUTATION_ALLOWED',
  'ENJAZ_PHASE114B_POSTTRANSPORT_SUMMARY_MUTATION_ALLOWED','ENJAZ_PHASE114B_POSTTRANSPORT_METADATA_MUTATION_ALLOWED',
  'ENJAZ_PHASE114B_RELINK_STATE_SEPARATION_FAILED','ENJAZ_PHASE114B_CONTENT_PROBE_RESIDUE',
]) req(contentProbe.includes(marker),`Real Cloud canonical-content probe marker ${marker} is missing`);
req(has(contentProbe,/char_length\(body_text\)>1200/i),'canonical-content probe must prove body capacity beyond legacy summary limit');
req(has(contentProbe,/insert\s+into\s+public\.communication_transport_attempts[\s\S]*update\s+public\.communications\s+set\s+body_text='mutated after transport'/i),'canonical-content probe must attempt mutation only after transport begins');

if(errors.length){
  console.error(`ENJAZ PHASE 11.4-B DATA MODEL AUDIT FAIL (${errors.length})`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 11.4-B DATA MODEL AUDIT PASS');
