import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const state=JSON.parse(read('docs/PHASE11_3_STATE.json'));
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(src,marker,label=marker)=>req(src.includes(marker),`missing ${label}`);

const paths={
  performance:'database/migrations/phase_11_3_client_portal_performance_hardening.sql',
  live:'database/migrations/phase_11_3_live_authenticated_portal_probe.sql',
  fixture:'database/migrations/phase_11_3_durable_session_probe_fixture.sql',
  write:'database/migrations/phase_11_3_durable_session_probe_client_write.sql',
  reload:'database/migrations/phase_11_3_durable_session_probe_fresh_reload.sql',
  cleanup:'database/migrations/phase_11_3_durable_session_probe_cleanup.sql',
  edge:'supabase/functions/enjaz-document-vault/index.ts',
  pages:'.github/workflows/enjaz-pages-preview.yml',
  publishedWorkflow:'.github/workflows/phase11-3-published-client-portal.yml',
  publishedScript:'scripts/phase11-3-published-portal-e2e.mjs',
};
for(const [name,p] of Object.entries(paths)) req(exists(p),`Phase 11.3-D certification evidence missing: ${name} -> ${p}`);

const performance=read(paths.performance);
const live=read(paths.live);
const fixture=read(paths.fixture);
const write=read(paths.write);
const reload=read(paths.reload);
const cleanup=read(paths.cleanup);
const edge=read(paths.edge);
const pages=read(paths.pages);
const publishedWorkflow=read(paths.publishedWorkflow);
const publishedScript=read(paths.publishedScript);

req((performance.match(/create index if not exists cp_/g)||[]).length>=34,'Phase 11.3 FK performance hardening index set is incomplete');
for(const marker of [
  'cp_grants_transaction_fk_idx','cp_messages_request_scope_idx','cp_requested_uploads_request_scope_idx',
  'cp_approval_responses_share_idx','cp_resource_shares_transaction_fk_idx'
]) has(performance,marker,`performance hardening ${marker}`);

for(const marker of [
  "set local role authenticated",
  "p_case='direct_table_select'",
  "p_case='stale_activation'",
  "p_case='foreign_authority'",
  "p_case='vault_ack_after_permission_revoke'",
  'company grant silently implied transaction access',
  'governed request queue projection mismatch',
  'permission removal did not retire requested-document request from client projection',
  'revoked transaction grant still exposed transaction',
  'portal activation minted staff/workforce trust',
  'governed portal audit evidence incomplete',
  'Phase 11.3 probe residue remains'
]) has(live,marker,`Real Cloud destruction evidence ${marker}`);

for(const marker of [
  "'__ENJAZ_PHASE113_DURABLE__'","'invited'","array['view','message']::text[]",
  'ENJAZ_PHASE113_DURABLE_REQUEST_MISSING'
]) has(fixture,marker,`durable fixture ${marker}`);
for(const marker of [
  'ENJAZ_PHASE113_FRESH_SESSION_AUTH_MISMATCH','list_client_portal_invitations_v1()',
  'activate_client_portal_invitation_v1',"'__ENJAZ_PHASE113_DURABLE_MESSAGE__'",
  'ENJAZ_PHASE113_FRESH_SESSION_WRITE_NOT_PROJECTED'
]) has(write,marker,`fresh session write ${marker}`);
for(const marker of [
  'ENJAZ_PHASE113_RELOAD_MESSAGE_MISSING',"v_replay:=public.send_client_portal_message_v1",
  "v_replay->>'wasDuplicate'",'ENJAZ_PHASE113_RELOAD_DUPLICATE_MESSAGE_CREATED'
]) has(reload,marker,`fresh reload ${marker}`);
for(const marker of [
  'delete from public.client_portal_messages','delete from public.client_portal_requests',
  'delete from public.client_portal_principals','ENJAZ_PHASE113_DURABLE_CLEANUP_RESIDUE'
]) has(cleanup,marker,`durable cleanup ${marker}`);

for(const marker of ["action==='portal-prepare'","action==='portal-acknowledge'",'inspectStoredBinary(admin,expected)',"admin.rpc('acknowledge_document_upload_v2'"])
  has(edge,marker,`live Vault edge ${marker}`);

// Post-merge exact-deployment certificate is armed now, but must not be claimed before it runs on main.
for(const marker of [
  'Stamp exact deployed source SHA','dist-live/enjaz-deploy.json','ENJAZ_DEPLOY_SHA',
  'test -f dist/live/enjaz-deploy.json'
]) has(pages,marker,`Pages exact-SHA evidence ${marker}`);
for(const marker of [
  'workflows: ["ENJAZ Pages Preview"]','ENJAZ_SUPABASE_SECRET_KEY',
  'LIVE_PORTAL_URL: https://yaldisstore-bit.github.io/ENJAZ/live/portal',
  'EXPECTED_DEPLOYED_SHA: ${{ github.event.workflow_run.head_sha || github.sha }}',
  'node --check scripts/phase11-3-published-portal-e2e.mjs',
  'node scripts/phase11-3-published-portal-e2e.mjs'
]) has(publishedWorkflow,marker,`published workflow ${marker}`);
for(const marker of [
  "schema:'enjaz.phase11-3-published-portal.v1'",'exact_deployed_sha',
  "user_metadata:{enjaz_test_marker:'phase11_3_published_portal'}",
  "permissions:['view','message']",'published_invitation_discovered',
  'published_client_reply_completed','published_activation_did_not_mint_staff_trust',
  'published_portal_zero_residue','published_auth_user_zero_residue',
  "{width:1280,height:800,label:'desktop-1280'}","{width:320,height:720,label:'mobile-320'}"
]) has(publishedScript,marker,`published browser certificate ${marker}`);

req(state.databaseAuthorityExtensionApplied===true,'Real Cloud database authority must be recorded as applied');
req(state.governedClientRequestSourceStatus==='REAL_CLOUD_VERIFIED','governed request source Real Cloud status missing');
req(state.clientSafeReadModelStatus==='REAL_CLOUD_VERIFIED','client-safe read model Real Cloud status missing');
req(state.governedClientWriteBoundaryStatus==='REAL_CLOUD_VERIFIED','governed client write boundary Real Cloud status missing');
req(state.realCloudAuthenticatedVerification==='PASS','authenticated Real Cloud verification must be PASS');
req(state.freshPortalBootstrapVerification==='PASS','fresh portal bootstrap verification must be PASS');
req(state.durableWriteRoundTripVerification==='PASS','durable fresh-session write/reload verification must be PASS');
req(state.failureConflictRecoveryVerification==='PASS','failure/conflict recovery evidence must be PASS');
req(state.auditReconciliationVerification==='PASS','portal audit reconciliation evidence must be PASS');
req(state.realBrowserPortalShellVerification==='PASS','Real Chromium portal shell verification must be PASS');
req(state.pagesDeploymentWorkflowPath===paths.pages,'Pages deployment evidence path drifted');
req(state.deploymentShaManifestAdded===true,'exact deployed SHA manifest must be armed');
req(state.publishedPortalCertificateWorkflowPath===paths.publishedWorkflow,'published portal workflow path drifted');
req(state.publishedPortalCertificateScriptPath===paths.publishedScript,'published portal certifier path drifted');
req(state.publishedPortalCertificateStatus==='ARMED_PENDING_MAIN_DEPLOY','published portal certificate must remain armed/pending before merge');
req(state.deployedLiveCriticalPathVerification==='PENDING','deployed-live critical path must remain pending before merge/deploy');
req(state.postMergeRecertification==='PENDING','post-merge recertification must remain pending before merge');
req(state.exitGatePassed===false,'Phase 11.3 must remain open until deployed-live/post-merge certification');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','M4 must remain locked until M3 closes');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-D REAL CLOUD CERTIFICATION AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3-D REAL CLOUD CERTIFICATION AUDIT PASS — authenticated authority/isolation, revocation, Vault race denial, audit evidence, fresh-session bootstrap, durable write/reload, idempotent replay, zero-residue cleanup and Phase-11.3 FK hardening are represented by reproducible repository evidence; exact-SHA public /live/portal certification is armed but deliberately pending main deployment; M4 stays locked.');
}
