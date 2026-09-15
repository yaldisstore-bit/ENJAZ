import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const state=JSON.parse(read('docs/PHASE11_4_STATE.json'));
const edge=read('supabase/functions/enjaz-communications/index.ts');
const core=read('supabase/functions/enjaz-communications/providerCore.ts');
const authority=read('database/migrations/phase_11_4_omnichannel_governed_actions.sql');
const conversions=read('database/migrations/phase_11_4_omnichannel_conversion_hardening.sql');
const advisor=read('database/migrations/phase_11_4_omnichannel_advisor_hardening.sql');
const attachments=read('database/migrations/phase_11_4_omnichannel_provider_attachment_registration.sql');

const assert=(condition,message)=>{if(!condition)throw new Error(`PHASE11_4C_AUDIT_FAIL: ${message}`)};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

assert(state.phase==='11.4','phase state must remain 11.4');
assert(state.currentSlice==='11.4-C','current slice must be 11.4-C before merge');
assert(state.providerIngressImplemented===true,'provider ingress must be implemented');
assert(state.providerEgressImplemented===true,'provider egress must be implemented');
assert(state.phase11_4cExitGatePassed===true,'11.4-C exit gate must pass');
assert(state.providerGatewayDeploymentVerification==='PASS','deployed provider gateway proof required');
assert(state.providerGatewayFailClosedVerification==='PASS_401_INTERNAL_AUTH_REQUIRED','deployed fail-closed proof required');
assert(state.providerConfiguredIntegrationVerification==='PENDING_NOT_CONFIGURED','must not claim provider evidence when no account is configured');
assert(state.exitGatePassed===false,'overall 11.4 exit gate stays closed until 11.4-D certification');
assert(state.phase11_5Allowed===false,'11.5 must remain locked');

has(edge,"ENJAZ_COMMUNICATIONS_INTERNAL_KEY",'server-only dispatch key missing');
has(edge,"verifyTwilioSignature",'Twilio webhook verification missing');
has(edge,"verifySvixSignature",'Resend webhook verification missing');
has(edge,"register_communication_provider_attachment_v1",'Document Vault provider attachment registration missing');
has(edge,"GATEWAY_ERROR",'generic outward gateway error missing');
lacks(edge,"Access-Control-Allow-Origin",'provider gateway must not expose browser CORS');
lacks(edge,"SUPABASE_ANON_KEY",'gateway must not use browser authority');

has(core,"HMAC",'endpoint/signature HMAC primitives missing');
has(core,"SHA-256",'HMAC-SHA256 endpoint fingerprint missing');
has(core,"SHA-1",'Twilio documented HMAC-SHA1 validation missing');
has(core,"MERGE_FIELD_MISSING",'merge-field fail-closed behavior missing');

for(const needle of ['communication_templates','communication_outbound_commands','communication_document_links','communication_conversion_receipts','reconciliation_required'])
  has(authority,needle,`governed authority missing ${needle}`);
has(authority,"ENJAZ_COMMUNICATION_RENDERED_CONTENT_IMMUTABLE",'rendered outbound immutability missing');
has(authority,"ENJAZ_COMMUNICATION_CONSENT_REQUIRED",'consent fail-closed missing');
has(conversions,"canonicalAuthority','transaction_followup",'task conversion must use follow-up authority');
has(conversions,"save_client_portal_request_v1",'document request conversion must use Client Portal authority');
has(advisor,'security invoker','public command façades must be security invoker');
has(attachments,"communication.attachment.imported",'attachment audit evidence missing');
has(attachments,"public.document_versions",'Document Vault version authority missing');

for(const text of [edge,core,authority,conversions,advisor,attachments]){
  lacks(text,'TWILIO_AUTH_TOKEN=', 'hard-coded Twilio secret detected');
  lacks(text,'RESEND_API_KEY=', 'hard-coded Resend secret detected');
}

console.log('ENJAZ PHASE 11.4-C GOVERNED ACTIONS AUDIT PASS');
