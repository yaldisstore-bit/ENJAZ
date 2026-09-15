import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(path)=>fs.readFileSync(new URL(path,root),'utf8');
const json=(path)=>JSON.parse(read(path));
const exists=(path)=>fs.existsSync(new URL(path,root));
const errors=[];
const req=(ok,message)=>{if(!ok)errors.push(message)};
const has=(text,marker)=>text.includes(marker);

const state=json('docs/PHASE11_4_STATE.json');
const predecessor=json('docs/PHASE11_3_STATE.json');
const major=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE11_4_KICKOFF.md');
const authority=read('src/features/communications/omnichannelAuthority.ts');
const tests=read('tests/omnichannelAuthority.test.ts');
const schema=read('database/baseline/phase1_2_schema.sql');

req(state.phase==='11.4'&&state.status==='IN_PROGRESS','Phase 11.4 must remain IN_PROGRESS until formal closure');
req(['11.4-A','11.4-B','11.4-C','11.4-D'].includes(state.currentSlice),'Phase 11.4 lifecycle slice is unsupported');
const sliceRank={'11.4-A':1,'11.4-B':2,'11.4-C':3,'11.4-D':4}[state.currentSlice]??0;
if(sliceRank===1){
  req(state.mode==='CANONICAL_AUTHORITY_FOUNDATION','11.4-A lifecycle identity drifted');
  req(state.databaseAuthorityExtensionApplied===false,'11.4-A must not claim database authority extension before 11.4-B');
}else{
  req(state.databaseAuthorityExtensionApplied===true,'11.4-B+ must preserve the applied database authority extension');
  req(state.phase11_4aMergeCommit==='30a9fe04f9173f5bb4f5593e82f1843e994c49e9','11.4-B+ must preserve certified 11.4-A lineage');
}
req(state.baseCommit==='90abedd5af199fa497e3c7e4b8c5b2d5e18967d6','Phase 11.4 base must remain the formal Phase 11.3 closure merge');
req(state.systemId==='M4'&&state.systemStatus==='ACTIVE','M4 must remain ACTIVE while Phase 11.4 is open');
req(predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true,'Phase 11.3 predecessor must remain formally CLOSED');
req(predecessor.phase11_4Allowed===true&&predecessor.nextPhase==='11.4'&&predecessor.successorStatus==='AUTHORIZED_NEXT','Phase 11.3 must explicitly authorize 11.4');
req(exists(state.predecessorClosureEvidence),'Phase 11.3 closure evidence must exist');

const m4=major.systems.find((system)=>system.id==='M4');
req(m4?.name==='Omnichannel Communications Hub'&&m4?.anchors?.join(',')==='11','M4 registry identity/anchor drifted');
req(m4?.status==='ACTIVE'&&m4?.closureEvidence===null,'M4 must be ACTIVE without premature global closure evidence');

for(const marker of [
  '`communications` is the existing canonical ENJAZ communication fact',
  '`notification_deliveries` remains Phase 11.1 transport history for notifications only',
  'Provider ingress must be idempotent',
  'Ambiguous or unknown inbound communication must remain unlinked/review-required',
  'Manual re-linking must be authorized, version/concurrency guarded and fully audited',
  'Consent and channel eligibility must be checked before outbound send',
  'Provider account credentials, signing secrets and access tokens are server-side secrets only',
  'Phase 11.5 — Scheduling, Appointments & Deadline Engine — M10 remains LOCKED',
]) req(has(kickoff,marker),`kickoff missing authority marker: ${marker}`);

req(state.canonicalCommunicationAuthority==='communications','communications must remain canonical communication authority');
req(state.notificationDeliveryAuthority==='notification_deliveries'&&state.notificationDeliveryRole==='TRANSPORT_EVIDENCE_ONLY_NOT_CONVERSATION_TRUTH','notification_deliveries authority role drifted');
req(state.portalMessageAuthority==='client_portal_messages','M3 portal message authority must remain separate');
req(state.attachmentAuthority==='documents_and_document_vault','Document Vault attachment authority drifted');
req(state.auditAuthority==='audit_events','audit_events authority drifted');

for(const [key,expected] of [
  ['providerCredentialsBrowserAllowed',false],
  ['providerCredentialsPublicTableAllowed',false],
  ['providerRawWebhookPayloadClientVisible',false],
  ['editableUserMetadataAuthorizationAllowed',false],
  ['shadowCommunicationStoreAllowed',false],
  ['shadowCompanyStoreAllowed',false],
  ['shadowContactStoreAllowed',false],
  ['shadowTransactionStoreAllowed',false],
  ['providerMessageMayCreateDuplicateCanonicalFact',false],
  ['providerReplayDedupRequired',true],
  ['outboundIdempotencyRequired',true],
  ['ambiguousInboundAutoLinkAllowed',false],
  ['unmatchedInboundMustRemainReviewable',true],
  ['manualRelinkAuditRequired',true],
  ['manualRelinkConcurrencyGuardRequired',true],
  ['crossWorkspaceMatchAllowed',false],
  ['endpointAloneMayGrantWorkspaceAuthority',false],
  ['consentFailClosedRequired',true],
  ['providerDeliveryMayMutateBusinessLifecycle',false],
  ['attachmentMustUseDocumentVaultAuthority',true],
  ['conversionMustUseOwningDomainCommand',true],
  ['explicitDataApiGrantsRequired',true],
  ['rowLevelSecurityRequired',true],
]) req(state[key]===expected,`Phase 11.4 authority state drifted: ${key}`);

req(state.authorityContractAdded===true&&state.authorityContractPath==='src/features/communications/omnichannelAuthority.ts','authority contract state missing');
req(state.authorityContractTestsAdded===true&&state.authorityContractTestsPath==='tests/omnichannelAuthority.test.ts','authority destruction tests state missing');
req(Array.isArray(state.authorityContractVerifiedScenarios)&&state.authorityContractVerifiedScenarios.length>=12,'authority scenario ledger incomplete');

// Provider integration remains forbidden until 11.4-C. Once C/D is active the
// dedicated C/D audits become responsible for proving its exact governed state.
if(sliceRank<3){
  req(state.providerIngressImplemented===false&&state.providerEgressImplemented===false,'11.4-A/B must not claim provider integration');
}
req(state.exitGatePassed===false&&state.phase11_5Allowed===false&&state.nextPhase==='11.5'&&state.successorStatus==='LOCKED','Phase 11.4 must keep Phase 11.5 locked until formal closure');
req(state.knownCriticalBlockers===0&&state.knownHighBlockers===0&&state.knownFunctionalBlockers===0,'Phase 11.4 blocker ledger must remain zero');
req(state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false,'governed production budgets drifted');

for(const marker of [
  'providerMessageDedupeKey',
  'outboundCommandDedupeKey',
  'chooseAutomaticCommunicationLink',
  'manualRelinkIsAuthorized',
  'outboundDispatchAllowed',
  'canTreatTransportEvidenceAsCanonicalMessage',
  'endpointAloneGrantsWorkspaceAuthority',
  'COMMUNICATION_FORBIDDEN_CLIENT_FIELDS',
  'assertCommunicationClientSafeProjection',
]) req(has(authority,marker),`authority contract missing: ${marker}`);

for(const forbidden of ['providerAccessToken','providerRefreshToken','providerSecret','webhookSecret','signingSecret','rawWebhookPayload','rawProviderHeaders','serviceRoleKey','internalMatchEvidence']){
  req(has(authority,`'${forbidden}'`),`client-forbidden communication field missing: ${forbidden}`);
}
req(!has(authority,'user_metadata')&&!has(authority,'service_role'),'authority contract must not depend on editable metadata or service role');

for(const marker of [
  'provider webhook retries resolve to one canonical dedupe identity',
  'provider dedupe identity is isolated by workspace channel and provider account',
  'outbound commands require explicit idempotency and provider account scope',
  'ambiguous deterministic matches fail closed into review instead of guessing',
  'cross-workspace and non-deterministic candidates cannot auto-link',
  'manual relink requires workspace trust exact workspace and optimistic version match',
  'outbound dispatch fails closed on missing or withdrawn consent',
  'sensitive outbound approval cannot be bypassed',
  'transport evidence and endpoint identity never become business authority by themselves',
  'client projection rejects provider secrets raw payloads and internal matching evidence',
]) req(has(tests,marker),`destruction test missing: ${marker}`);

// The frozen Phase 1.2 baseline must never be rewritten by later migrations.
req(has(schema,'create table public.communications ('),'canonical communications table missing from baseline');
req(has(schema,"channel text not null check (channel in ('call','message','email','meeting','other'))"),'frozen baseline communications channel contract drifted');
req(has(schema,'create table public.notification_deliveries ('),'notification_deliveries transport evidence table missing');
req(has(schema,"channel text not null check (channel in ('in_app','push','email'))"),'notification_deliveries frozen baseline channel contract drifted');
req(!has(schema,'provider_access_token')&&!has(schema,'provider_refresh_token')&&!has(schema,'webhook_secret'),'baseline must not contain provider credentials');

if(errors.length){
  console.error(`ENJAZ PHASE 11.4 AUTHORITY AUDIT FAIL (${errors.length})`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log(`ENJAZ PHASE 11.4 AUTHORITY AUDIT PASS — ${state.currentSlice} preserves M4 canonical communications, dedupe, matching, relink, consent/approval, secret isolation, predecessor closure and M10 successor lock.`);
