import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));
const sql=read('database/migrations/phase_11_3_client_portal_authority.sql');
const hardening=read('database/migrations/phase_11_3_client_portal_authority_hardening.sql');
const state=json('docs/PHASE11_3_STATE.json');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg)};
const has=(s,m,msg=m)=>req(s.includes(m),`missing ${msg}`);

for(const table of ['client_portal_principals','client_portal_grants','client_portal_authority_events']){
  has(sql,`create table public.${table}`,`${table} table`);
  has(sql,`alter table public.${table} enable row level security`,`${table} RLS`);
}

for(const marker of [
  'client_portal_principals_workspace_user_key',
  'client_portal_principals_contact_fk',
  'client_portal_grants_principal_fk',
  'client_portal_grants_company_fk',
  'client_portal_grants_transaction_fk',
  'client_portal_grants_target_check',
  'client_portal_grants_permissions_check',
  "permissions <@ array['view','upload_requested_document','approve_document','message','confirm_appointment','view_finance']::text[]",
  "and 'view'=any(permissions)",
  'client_portal_grants_company_active_unique',
  'client_portal_grants_transaction_active_unique',
]) has(sql,marker);

for(const fn of [
  'is_client_portal_owner_v1','require_client_portal_owner_v1','current_client_portal_principal_id_v1',
  'require_client_portal_principal_v1','client_portal_grant_allows_v1','record_client_portal_authority_event_v1',
  'save_client_portal_principal_v1_impl','save_client_portal_grant_v1_impl','revoke_client_portal_grant_v1_impl',
  'list_client_portal_workspaces_v1_impl','get_client_portal_authority_v1_impl','get_client_portal_admin_authority_v1_impl',
]){
  const re=new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.${fn}\\s*\\([\\s\\S]*?security\\s+definer\\s+set\\s+search_path\\s*=\\s*''`,'i');
  req(re.test(sql),`${fn} must be SECURITY DEFINER with fixed empty search_path`);
}

for(const fn of [
  'save_client_portal_principal_v1','save_client_portal_grant_v1','revoke_client_portal_grant_v1',
  'list_client_portal_workspaces_v1','get_client_portal_authority_v1','get_client_portal_admin_authority_v1',
]) has(sql,`create or replace function public.${fn}`);

has(sql,"raise invalid_parameter_value using message='ENJAZ_PORTAL_STAFF_TRUST_COLLISION'",'staff trust collision denial');
has(sql,"raise invalid_parameter_value using message='ENJAZ_PORTAL_WORKFORCE_TRUST_COLLISION'",'workforce trust collision denial');
has(sql,"exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_user_id)",'workspace staff collision query');
has(sql,"exists(select 1 from public.organization_members om where om.workspace_id=p_workspace_id and om.user_id=p_user_id)",'organization workforce collision query');

req(!/insert\s+into\s+public\.workspace_memberships/i.test(sql),'portal migration must never insert workspace_memberships');
req(!/insert\s+into\s+public\.organization_members/i.test(sql),'portal migration must never insert organization_members');
req(!/update\s+public\.workspace_memberships/i.test(sql),'portal migration must never update workspace_memberships');
req(!/update\s+public\.organization_members/i.test(sql),'portal migration must never update organization_members');
req(!/alter\s+table\s+public\.(companies|transactions|documents|payments|financial_ledger_entries)\b/i.test(sql),'portal authority foundation must not alter core authority tables');
req(!/grant\s+(select|insert|update|delete|all)[\s\S]*?on\s+(table\s+)?public\.(companies|transactions|documents|payments|financial_ledger_entries)/i.test(sql),'portal migration must not grant browser core-table authority');

has(sql,'revoke all on table public.client_portal_principals,public.client_portal_grants,public.client_portal_authority_events','authority table privilege revoke');
has(sql,'from public,anon,authenticated;','authority tables revoked from browser roles');
has(sql,"and p.status='active'",'active principal condition');
has(sql,'and p.revoked_at is null','principal revocation fail-closed');
has(sql,'and g.revoked_at is null','grant revocation fail-closed');
has(sql,'and g.valid_from<=now()','grant valid-from enforcement');
has(sql,'and (g.valid_until is null or g.valid_until>now())','grant expiry enforcement');
has(sql,"and ((p_target_type='company' and g.company_id=p_target_id)",'explicit company target test');
has(sql,"or (p_target_type='transaction' and g.transaction_id=p_target_id))",'explicit transaction target test');
req(!/company_id\s*=.*transaction/i.test(sql),'company authority must not be translated into transaction authority');

has(sql,'insert into public.client_portal_authority_events','dedicated authority audit');
has(sql,'insert into public.audit_events','global audit integration');
has(sql,"'client_portal.'||p_event_type",'portal audit action namespace');
has(sql,"set revoked_at=coalesce(revoked_at,now())",'principal deactivation cascades grant revocation');
has(hardening,'revoke all on function private.record_client_portal_authority_event_v1(uuid,uuid,uuid,uuid,text,text,jsonb)','internal authority-event writer revoke');
has(hardening,'from authenticated;','internal authority-event writer must not remain browser-callable');

req(state.phase==='11.3'&&state.status==='IN_PROGRESS'&&state.systemId==='M3','Phase 11.3 lifecycle must remain active');
req(state.databaseAuthorityMigrationAdded===true,'state must record database authority migration');
req(state.databaseAuthorityStaticAuditAdded===true,'state must record database authority static audit');
req(state.databaseAuthorityExtensionApplied===false,'Real Cloud apply must remain pending until authenticated verification');
req(state.directWorkspaceWideReadAllowed===false&&state.directCoreTablePortalDmlAllowed===false,'direct portal core access must remain forbidden');
req(state.portalPrincipalMayBecomeWorkspaceMember===false&&state.portalPrincipalMayBecomeOrganizationMember===false,'portal/staff trust roots must remain isolated');
req(state.realCloudAuthenticatedVerification==='PENDING','Real Cloud verification may not be claimed by static migration work');
req(state.phase11_4Allowed===false&&state.successorStatus==='LOCKED','Phase 11.4 must remain locked');

if(errors.length){
  console.error(`ENJAZ PHASE 11.3B CLIENT PORTAL DB AUTHORITY AUDIT FAIL (${errors.length})`);
  errors.forEach((e)=>console.error(`- ${e}`));
  process.exitCode=1;
}else{
  console.log('ENJAZ PHASE 11.3B CLIENT PORTAL DB AUTHORITY AUDIT PASS — external principals and exact object grants are isolated from staff trust roots; direct browser table authority stays closed; internal audit writer is non-callable; revocation and audit are explicit.');
}
