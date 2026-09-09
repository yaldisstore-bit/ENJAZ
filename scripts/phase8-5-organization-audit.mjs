import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const kickoff=read('docs/PHASE8_5_KICKOFF.md');
const state=JSON.parse(read('docs/PHASE8_5_STATE.json'));
const sql=read('database/migrations/phase_8_5_multi_branch_departments_teams_m15.sql');
const resolverSql=read('database/migrations/phase_8_5_organization_workspace_resolution.sql');
const catalogSql=read('database/migrations/phase_8_5_owner_assignment_catalog.sql');
const commands=read('src/features/organization/organizationCommands.ts');
const resolver=read('src/features/organization/organizationWorkspaceResolver.ts');
const catalog=read('src/features/organization/organizationAssignmentCatalog.ts');
const production=read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const liveRoot=read('src/ui-r2/runtime/UiR2LiveRoot.tsx');
const nav=read('src/ui-r2/architecture/navigation-contract.ts');
const ui=read('src/ui-r2/organization/LiveOrganizationExperience.tsx');
const css=read('src/ui-r2/organization/organization.css');
const tests=read('tests/organizationEngine.test.ts');
const browser=read('tests-external/phase8-5-organization.spec.cjs');
const must=(text,marker,label)=>{if(!text.includes(marker))throw new Error(`${label}: missing ${marker}`)};

if(state.phase!=='8.5'||state.name!=='Multi-Branch / Departments / Teams — M15 foundation'||state.status!=='IN_PROGRESS')throw new Error('Phase 8.5 identity/status drift');
if(state.baseCommit!=='4fff1f6b25687d8ca305edac3d5a033e77e224c9'||state.implementationBranch!=='phase8-5-multi-branch-teams')throw new Error('Phase 8.5 base/branch drift');
if(state.predecessor?.phase!=='8.4'||state.predecessor?.requiredStatus!=='CLOSED'||state.predecessor?.requiredAuthorization!=='phase8_5Allowed=true')throw new Error('Phase 8.5 predecessor drift');
if(state.system?.id!=='M15'||state.system?.phaseSliceStatus!=='IN_PROGRESS'||state.system?.globalSystemStatus!=='OPEN')throw new Error('M15 slice/global closure boundary drift');
if(state.rootAuthority?.workspaceTrustTable!=='workspace_memberships'||state.rootAuthority?.workspaceTrustRoleConstraint!=='owner_only_unchanged')throw new Error('Legacy workspace trust root must remain owner-only');
if(state.rootAuthority?.workforceAuthorizationTable!=='organization_members'||state.rootAuthority?.workforceIdentitySource!=='auth.users'||state.rootAuthority?.workforceWriteAuthority!=='workspace_owner_only_rpc')throw new Error('Workforce authorization boundary drift');
if(state.rootAuthority?.legacyBroadPolicyProtection!=='non_owner_workforce_never_inserted_into_workspace_memberships')throw new Error('Legacy workspace-wide protection drift');
if(state.authorityBoundaries?.crossWorkspace!=='FORBIDDEN'||state.authorityBoundaries?.legacyWorkspaceWideAccessForWorkforce!=='FORBIDDEN'||state.authorityBoundaries?.legacyRpcMembershipEscalation!=='FORBIDDEN_BY_SEPARATE_AUTHORIZATION_TABLE')throw new Error('M15 cross/legacy authority boundary drift');
if(state.authorityBoundaries?.transactionLifecycleWriteAuthority!=='existing_transaction_workflow_boundaries_only'||state.authorityBoundaries?.financeLedgerWriteAuthority!=='none')throw new Error('M15 transaction/finance boundary drift');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)throw new Error('Phase 8.5 JavaScript budget drift');
if(state.phase8_6Allowed!==false||state.nextPhase!=='8.6'||state.successorStatus!=='LOCKED')throw new Error('Phase 8.6 must remain locked');
if(state.realCloudVerification!=='PENDING'||state.realChromium!=='PENDING'||state.postMergeRecertification!=='PENDING'||state.exitGatePassed!==false)throw new Error('Phase 8.5 cannot claim unearned evidence');

for(const m of ['workspace_memberships table remains the **owner-only workspace trust root**','does **not** insert non-owner employees into that legacy table','organization_members','Inheritance is downward only','Finance ledger write authority remains `none`','Phase 8.6 — Global Command Center remains LOCKED'])must(kickoff,m,'kickoff');

for(const t of ['organization_members','organization_branches','organization_departments','organization_teams','organization_scope_memberships','transaction_organization_ownership','transaction_organization_ownership_events'])must(sql,`create table public.${t}`,'schema');
for(const m of ['user_id uuid not null references auth.users(id) on delete cascade',"scope_role text not null default 'member' check (scope_role in ('member','lead','manager'))","scope_type text not null check (scope_type in ('branch','department','team'))",'organization_scope_memberships_target_check','transaction_organization_ownership_target_check','transaction_org_ownership_events_from_target_check','transaction_org_ownership_events_to_target_check','organization_scope_memberships_branch_unique','organization_scope_memberships_department_unique','organization_scope_memberships_team_unique'])must(sql,m,'schema invariant');

for(const source of [sql,resolverSql,catalogSql]){
  if(/alter\s+table\s+public\.workspace_memberships/i.test(source))throw new Error('Phase 8.5 must not alter legacy workspace_memberships');
  if(/insert\s+into\s+public\.workspace_memberships/i.test(source))throw new Error('Phase 8.5 workforce must never be inserted into workspace_memberships');
  if(/update\s+public\.workspace_memberships/i.test(source)||/delete\s+from\s+public\.workspace_memberships/i.test(source))throw new Error('Phase 8.5 must not mutate legacy workspace membership rows');
  if(/service_role/i.test(source))throw new Error('service_role must not appear in Phase 8.5 migrations');
}

for(const m of ['private.is_organization_owner_v1','private.current_organization_member_id_v1','private.require_organization_actor_v1','private.require_organization_owner_v1','private.validate_organization_scope_target_v1','private.organization_scope_source_v1','private.can_access_organization_scope_v1','private.can_manage_organization_scope_v1','private.organization_scoped_transactions_v1'])must(sql,m,'authorization helper');

const privateDefiners=['is_organization_owner_v1','current_organization_member_id_v1','require_organization_actor_v1','require_organization_owner_v1','validate_organization_scope_target_v1','organization_scope_source_v1','can_access_organization_scope_v1','can_manage_organization_scope_v1','organization_scoped_transactions_v1','set_organization_member_v1_impl','save_organization_branch_v1_impl','save_organization_department_v1_impl','save_organization_team_v1_impl','set_organization_scope_membership_v1_impl','assign_transaction_organization_v1_impl'];
for(const fn of privateDefiners){const re=new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.${fn}\\s*\\([\\s\\S]*?security\\s+definer\\s+set\\s+search_path\\s*=\\s*''[\\s\\S]*?\\$\\$;`,'i');if(!re.test(sql))throw new Error(`Private function ${fn} must be SECURITY DEFINER with empty search_path`);}
const publicInvokers=['set_organization_member_v1','save_organization_branch_v1','save_organization_department_v1','save_organization_team_v1','set_organization_scope_membership_v1','assign_transaction_organization_v1','explain_organization_access_v1','get_organization_context_v1'];
for(const fn of publicInvokers){const re=new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\s*\\([\\s\\S]*?security\\s+invoker\\s+set\\s+search_path\\s*=\\s*''[\\s\\S]*?\\$\\$;`,'i');if(!re.test(sql))throw new Error(`Public function ${fn} must be SECURITY INVOKER with empty search_path`);}

for(const t of ['organization_members','organization_branches','organization_departments','organization_teams','organization_scope_memberships','transaction_organization_ownership','transaction_organization_ownership_events'])must(sql,`alter table public.${t} enable row level security`,'RLS');
must(sql,'revoke all on table public.organization_members,public.organization_branches,public.organization_departments,public.organization_teams,public.organization_scope_memberships,public.transaction_organization_ownership,public.transaction_organization_ownership_events from anon,authenticated','DML deny');
must(sql,'grant select on table public.organization_members,public.organization_branches,public.organization_departments,public.organization_teams,public.organization_scope_memberships,public.transaction_organization_ownership,public.transaction_organization_ownership_events to authenticated','read grant');
if(/grant\s+(insert|update|delete|all)\s+on\s+table/i.test(sql))throw new Error('Direct organizational table mutation grant detected');

for(const m of ["s.department_id=p_department_id or (v_branch_id is not null and s.branch_id=v_branch_id)","s.team_id=p_team_id or s.department_id=v_department_id or (v_branch_id is not null and s.branch_id=v_branch_id)","order by case when s.team_id=p_team_id then 1 when s.department_id=v_department_id then 2 else 3 end","and (not p_management or s.scope_role='manager')"])must(sql,m,'downward inheritance');
const scopeSource=sql.match(/create\s+or\s+replace\s+function\s+private\.organization_scope_source_v1[\s\S]*?\$\$;/i)?.[0]??'';
if(!scopeSource)throw new Error('organization_scope_source_v1 extraction failed');
const branchScope=scopeSource.match(/if\s+p_scope_type='branch'\s+then([\s\S]*?)elsif\s+p_scope_type='department'/i)?.[1]??'';
const departmentScope=scopeSource.match(/elsif\s+p_scope_type='department'\s+then([\s\S]*?)elsif\s+p_scope_type='team'/i)?.[1]??'';
if(!branchScope||!departmentScope)throw new Error('organization scope inheritance branch extraction failed');
if(/s\.department_id|s\.team_id/i.test(branchScope))throw new Error('Branch access must not be derived from descendant membership');
if(/s\.team_id/i.test(departmentScope))throw new Error('Department access must not be derived from team membership');
if(scopeSource.includes('teamToParent'))throw new Error('Potential upward team inheritance marker detected');
for(const m of ['ENJAZ_ORG_DEPARTMENT_REPARENT_BLOCKED','ENJAZ_ORG_TEAM_REPARENT_BLOCKED','ENJAZ_ORG_SCOPE_MEMBERSHIP_STALE','ENJAZ_ORG_OWNERSHIP_STALE','ENJAZ_ORG_TRANSFER_MANAGE_BOTH_REQUIRED',"'transactionLifecycleMutated',false","'financeLedgerMutated',false"])must(sql,m,'destructive safety');

const forbiddenWrites=[/update\s+public\.transactions\b/i,/insert\s+into\s+public\.transactions\b/i,/delete\s+from\s+public\.transactions\b/i,/\bpayments\b/i,/financial_ledger_entries/i,/cashbox_accounts/i,/payment_reversals/i];
for(const source of [sql,resolverSql,catalogSql])for(const re of forbiddenWrites){if(re.test(source))throw new Error(`Forbidden M15 authority/write marker detected: ${re}`);}
for(const m of ["'authority','organization_structure_scoped_ownership'","'workspaceTrustAuthority','legacy_owner_only_unchanged'","'workforceAuthority','organization_members_and_scope_memberships'","'legacyWorkspaceWideAccessForWorkforce','forbidden'","'transactionLifecycleWriteAuthority','none'","'financeLedgerWriteAuthority','none'","'accessSourceMembershipId'",'private.organization_scoped_transactions_v1(p_workspace_id)'])must(sql,m,'read contract');

for(const m of ['private.organization_workspaces_for_actor_v1()',"'owner'::text as actor_type","'workforce'::text,m.id",'public.list_organization_workspaces_v1()','security invoker',"m.status='active'",'w.owner_user_id<>v_actor'])must(resolverSql,m,'workspace resolver SQL');
if(/from\s+public\.transactions/i.test(resolverSql)||/from\s+public\.companies/i.test(resolverSql))throw new Error('Workspace resolver must not expose operational records');
for(const m of ['private.organization_assignable_transactions_v1','perform private.require_organization_owner_v1(p_workspace_id)','left join public.transaction_organization_ownership','public.list_organization_assignable_transactions_v1','security invoker'])must(catalogSql,m,'owner catalog SQL');

for(const m of ["authority:'organization_structure_scoped_ownership'","workspaceTrustAuthority:'legacy_owner_only_unchanged'","legacyWorkspaceWideAccessForWorkforce:'forbidden'","transactionLifecycleWriteAuthority:'none'","financeLedgerWriteAuthority:'none'",'function target(v:OrganizationScopeTarget)','sourceMembershipId===null','assign_transaction_organization_v1'])must(commands,m,'command gateway');
for(const m of ['list_organization_workspaces_v1','actorType===\'owner\'','actorType===\'workforce\''])must(resolver,m,'workspace resolver client');
for(const m of ['list_organization_assignable_transactions_v1','ownershipId===null','scopeType:OrganizationScopeType|null'])must(catalog,m,'owner catalog client');
for(const m of ['OrganizationWorkspaceResolverProvider','OrganizationAssignmentCatalogProvider','OrganizationCommandProvider','createOrganizationWorkspaceResolver(client)','createOrganizationAssignmentCatalog(client)','createOrganizationGateway(client)','../organization/organization.css'])must(production,m,'production wiring');

if(nav.includes("id: 'organization'")||nav.includes("id: 'branches'")||nav.includes("id: 'teams'"))throw new Error('Phase 8.5 must not create a duplicate IA destination');
must(nav,"id: 'account', label: 'الحساب ومساحة العمل'",'frozen account home');
for(const m of ["import { LiveOrganizationExperience }","data-account-workspace-home=\"8.5\"","writeUrlState('account', null, null, 'replace')","destinationId === 'account') content = <LiveOrganizationExperience />"])must(liveRoot,m,'live route');
for(const m of ['data-organization-stage="8.5"','data-workspace-trust-authority="legacy_owner_only_unchanged"','data-legacy-workspace-wide-access="forbidden"','data-transaction-lifecycle-write-authority="none"','data-finance-write-authority="none"','عرض المالك الموحد','عرض موظف محدود النطاق','accessSourceMembershipId','لا نعرض معاملات workspace خارج صلاحيتك','لا يغيّر هذا الإجراء حالة المعاملة أو أي سجل مالي'])must(ui,m,'live UI');
for(const m of ['grid-template-columns:minmax(0,1.7fr)','@media(max-width:640px)','@media(max-width:380px)','env(safe-area-inset-bottom)','prefers-reduced-motion'])must(css,m,'organization CSS');
for(const m of ['rejects legacy/finance authority drift','scope target validation is exact and happens before network','never invents lifecycle or finance payload fields','requires a concrete source membership','workforce access claim without source membership is rejected'])must(tests,m,'command tests');
for(const m of ['1280,430,390,360,320','owner builds branch → department → team hierarchy','grants explicit branch manager source','assigns then transfers operational ownership','workforce view is branch-scoped, downward inherited','data-legacy-workspace-wide-access=\"forbidden\"'])must(browser,m,'Real Chromium contract');

console.log('ENJAZ PHASE 8.5 ORGANIZATION AUDIT PASS — legacy owner membership untouched; workforce authorization isolated from legacy RLS/RPCs; workspace resolution and unscoped transaction catalog are separately guarded; branch→department→team inheritance is downward/source-explainable; direct org DML denied; account remains the sole frozen IA home; transaction ownership is audited without lifecycle/finance writes; Phase 8.6 remains LOCKED.');
