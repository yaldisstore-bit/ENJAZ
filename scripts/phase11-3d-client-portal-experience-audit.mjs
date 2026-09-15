import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const main=read('src/main.tsx');
const root=read('src/ui-r2/client-portal/ClientPortalProductionRoot.tsx');
const gateway=read('src/features/client-portal/clientPortalGateway.ts');
const css=read('src/ui-r2/client-portal/client-portal.css');
const activation=read('database/migrations/phase_11_3_client_portal_activation.sql');
const state=JSON.parse(read('docs/PHASE11_3_STATE.json'));
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(source,marker,msg=marker)=>req(source.includes(marker),`missing ${msg}`);

// A dedicated external route must short-circuit staff deep-link normalization and lazy-load its own root.
has(main,"lazy(()=>import('./ui-r2/client-portal/ClientPortalProductionRoot.tsx')",'lazy client portal root');
has(main,"parts.includes('portal')",'portal route discriminator');
has(main,'if(isClientPortalPath())return;','staff deep-link normalizer portal short-circuit');
has(main,'<ClientPortalProductionRoot />','portal root mount');
has(main,': <UiR2ProductionRoot />','staff root alternate mount');
req(!/ClientPortalProductionRoot[\s\S]{0,320}<UiR2ProductionRoot\s*\/>[\s\S]{0,320}<ClientPortalProductionRoot/.test(main),'portal may not nest inside staff root');

// Portal runtime may share Auth and low-level Supabase transport, but never staff workspace/data/command providers.
for(const marker of ['createSupabaseAuthGateway','createEnjazSupabaseClient','createClientPortalGateway','<AuthProvider gateway={runtime.auth}>','data-client-portal-shell="isolated"']) has(root,marker);
for(const forbidden of [
  'createEnjazDataLayerFactory','DataLayerProvider','resolveWorkspaceId','UiR2LiveRoot','LazyLiveProductionPortals',
  'FinanceCommandProvider','GovernanceCommandProvider','GovernmentProcedureCommandProvider','AutomationCommandProvider',
  'FieldOperationsCommandProvider','NotificationCommandProvider','CurrentUserIdProvider'
]) req(!root.includes(forbidden),`client portal runtime must not import/mount staff authority: ${forbidden}`);
req(!root.includes('.signUp('),'client portal must not expose staff/workspace sign-up');
req(!root.includes('bootstrapWorkspace'),'client portal must not bootstrap a workspace');
has(root,'auth.service.signIn({email:email.trim(),password})','shared Auth sign-in only');
has(root,'auth.service.requestPasswordReset','password recovery');
has(root,'gateway.listInvitations()','invitation discovery');
has(root,'gateway.activateInvitation','invitation activation');
has(root,"request.requestType==='information'",'information response UI');
has(root,"request.requestType==='appointment'",'appointment response UI');
has(root,"request.requestType==='approval'",'approval response UI');
has(root,"request.requestType==='document'",'requested document upload UI');
has(root,"request.requestType==='payment'",'display-only payment request UI');

// Browser gateway is narrow: portal RPCs + the existing hardened Vault edge function only.
for(const rpc of [
  'list_client_portal_workspaces_v1','list_client_portal_invitations_v1','activate_client_portal_invitation_v1',
  'get_client_portal_authority_v1','get_client_portal_read_model_v1','send_client_portal_message_v1',
  'respond_client_portal_appointment_v1','mark_client_portal_request_read_v1',
  'respond_client_portal_document_approval_v1'
]) has(gateway,`'${rpc}'`,`gateway RPC ${rpc}`);
has(gateway,"client.edge('enjaz-document-vault'",'canonical Document Vault edge');
has(gateway,"action:'portal-prepare'",'portal Vault prepare');
has(gateway,"action:'portal-acknowledge'",'portal Vault acknowledge');
for(const forbidden of ['service_role','SUPABASE_SERVICE_ROLE_KEY','workspace_memberships','organization_members','transaction_notes','financial_ledger_entries'])
  req(!gateway.toLowerCase().includes(forbidden.toLowerCase()),`browser gateway contains forbidden authority reference ${forbidden}`);
req(!/\.from\s*\(/.test(gateway),'client portal browser gateway must not directly query tables');

// Invitation discovery and activation are exact auth.uid()-bound, optimistic and auditable.
for(const marker of [
  "v_actor uuid := (select auth.uid())","p.user_id=v_actor","p.status='invited'","p.activated_at is null","p.revoked_at is null",
  'workspace_memberships','organization_members','p.user_id=v_actor','for update',"v_row.status<>'invited'",
  'v_row.version<>p_expected_version',"set status='active',activated_at=now(),revoked_at=null,version=version+1",
  "'principal.activated','self_activation'",'private.record_client_portal_authority_event_v1',
  'revoke all on function public.list_client_portal_invitations_v1() from public,anon',
  'grant execute on function public.list_client_portal_invitations_v1() to authenticated',
  'revoke all on function public.activate_client_portal_invitation_v1(uuid,integer) from public,anon',
  'grant execute on function public.activate_client_portal_invitation_v1(uuid,integer) to authenticated'
]) has(activation,marker,`activation contract ${marker}`);
for(const forbidden of ['insert into public.workspace_memberships','insert into public.organization_members','insert into public.client_portal_grants'])
  req(!activation.toLowerCase().includes(forbidden),`activation must not mint authority: ${forbidden}`);

// Mobile-first shell must include narrow-phone and ordinary-mobile recomposition plus reduced motion.
has(css,'@media(max-width:680px)','mobile layout');
has(css,'@media(max-width:360px)','narrow mobile layout');
has(css,'@media(prefers-reduced-motion:reduce)','reduced motion contract');
has(css,'min-height:100dvh','mobile viewport contract');
has(css,'.cp-bottom-nav','client mobile navigation');

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3 / M3 must remain active while D is under certification');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','M4 / Phase 11.4 must remain locked');
req(state.realCloudAuthenticatedVerification==='PENDING','static D work may not claim Real Cloud verification');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3-D PORTAL EXPERIENCE AUDIT FAIL (${errors.length})`);
  for(const error of errors)console.error(`- ${error}`);
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3-D PORTAL EXPERIENCE AUDIT PASS — /portal is an isolated lazy client runtime, invite activation is auth.uid-bound and non-escalating, governed action UI uses only portal RPC/Vault boundaries, mobile RTL contracts exist, Real Cloud remains unclaimed and M4 stays locked.');
}
