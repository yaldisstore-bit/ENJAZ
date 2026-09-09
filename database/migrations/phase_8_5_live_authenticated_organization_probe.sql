-- ENJAZ Phase 8.5 — authenticated Real Cloud organization destruction probe
-- This migration is evidence, not product data. It creates temporary probe helpers/data,
-- simulates real authenticated JWT sessions, proves M15 boundaries, deletes every probe row,
-- drops the helpers, and commits only the zero-residue proof execution.

begin;

create or replace function private.enjaz_phase85_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE85_PROBE_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase85_expect_direct_dml_denied(p_workspace_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.organization_branches(workspace_id,name,code,status,created_by)
  values(p_workspace_id,'__ENJAZ_PHASE85_ILLEGAL_DML__','P85BAD','active',(select auth.uid()));
  return false;
exception when insufficient_privilege then return true;
end;
$$;

create or replace function private.enjaz_phase85_expect_owner_write_denied(p_workspace_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.save_organization_branch_v1(p_workspace_id,null,null,'__ENJAZ_PHASE85_ILLEGAL_OWNER_WRITE__','P85OWNBAD',null,'active');
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_OWNER_REQUIRED';
end;
$$;

create or replace function private.enjaz_phase85_expect_branch_stale(p_workspace_id uuid,p_branch_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.save_organization_branch_v1(p_workspace_id,p_branch_id,0,'__ENJAZ_PHASE85_STALE__','P85STALE',null,'active');
  return false;
exception when serialization_failure then return sqlerrm='ENJAZ_ORG_BRANCH_STALE';
end;
$$;

create or replace function private.enjaz_phase85_expect_transfer_denied(
  p_workspace_id uuid,p_transaction_id uuid,p_expected_version integer,p_branch_id uuid
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.assign_transaction_organization_v1(
    p_workspace_id,p_transaction_id,p_expected_version,'branch',p_branch_id,null,null,
    'Phase 8.5 forbidden sibling transfer probe'
  );
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_TRANSFER_MANAGE_BOTH_REQUIRED';
end;
$$;

create or replace function private.enjaz_phase85_expect_workspace_forbidden(p_workspace_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.get_organization_context_v1(p_workspace_id);
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_WORKSPACE_FORBIDDEN';
end;
$$;

revoke all on function private.enjaz_phase85_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase85_expect_direct_dml_denied(uuid) from public,anon;
revoke all on function private.enjaz_phase85_expect_owner_write_denied(uuid) from public,anon;
revoke all on function private.enjaz_phase85_expect_branch_stale(uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase85_expect_transfer_denied(uuid,uuid,integer,uuid) from public,anon;
revoke all on function private.enjaz_phase85_expect_workspace_forbidden(uuid) from public,anon;
grant execute on function private.enjaz_phase85_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase85_expect_direct_dml_denied(uuid) to authenticated;
grant execute on function private.enjaz_phase85_expect_owner_write_denied(uuid) to authenticated;
grant execute on function private.enjaz_phase85_expect_branch_stale(uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase85_expect_transfer_denied(uuid,uuid,integer,uuid) to authenticated;
grant execute on function private.enjaz_phase85_expect_workspace_forbidden(uuid) to authenticated;

select set_config('enjaz.p85.owner_user',(
  select wm.user_id::text
  from public.workspace_memberships wm
  join public.workspaces w on w.id=wm.workspace_id and w.owner_user_id=wm.user_id
  join auth.users u on u.id=wm.user_id
  where wm.role='owner'
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select private.enjaz_phase85_probe_assert(
  nullif(current_setting('enjaz.p85.owner_user',true),'') is not null,
  'no real owner exists'
);
select set_config('enjaz.p85.owner_ws',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.p85.owner_user')::uuid and wm.role='owner'
  order by wm.created_at,wm.workspace_id
  limit 1
),true);

select private.enjaz_phase85_probe_assert(
  not exists(select 1 from auth.users where id='85000000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.companies where id='85000000-0000-4000-8000-000000000002'::uuid)
  and not exists(select 1 from public.transactions where id='85000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.organization_branches where name like '__ENJAZ_PHASE85_PROBE_%'),
  'probe residue exists before execution'
);

insert into auth.users(
  id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '85000000-0000-4000-8000-000000000001'::uuid,
  'authenticated','authenticated','__enjaz_phase85_probe_workforce__@example.invalid',now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  jsonb_build_object('display_name','Phase 8.5 Probe Workforce'),now(),now()
);
select set_config('enjaz.p85.workforce_user','85000000-0000-4000-8000-000000000001',true);
select set_config('enjaz.p85.workforce_ws',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.p85.workforce_user')::uuid and wm.role='owner'
  order by wm.created_at limit 1
),true);
select private.enjaz_phase85_probe_assert(
  nullif(current_setting('enjaz.p85.workforce_ws',true),'') is not null
  and current_setting('enjaz.p85.workforce_ws')::uuid<>current_setting('enjaz.p85.owner_ws')::uuid,
  'temporary Auth bootstrap did not create an isolated workspace'
);

insert into public.companies(id,workspace_id,legal_name,display_name,status)
values(
  '85000000-0000-4000-8000-000000000002'::uuid,
  current_setting('enjaz.p85.owner_ws')::uuid,
  '__ENJAZ_PHASE85_PROBE_COMPANY__','Phase 8.5 Probe Company','active'
);
insert into public.transactions(id,workspace_id,company_id,type,department,status,priority,current_fee)
values(
  '85000000-0000-4000-8000-000000000003'::uuid,
  current_setting('enjaz.p85.owner_ws')::uuid,
  '85000000-0000-4000-8000-000000000002'::uuid,
  '__ENJAZ_PHASE85_PROBE_TRANSACTION__','QA','active','normal',100.00
);
select set_config('enjaz.p85.tx_updated_before',(
  select updated_at::text from public.transactions
  where id='85000000-0000-4000-8000-000000000003'::uuid
),true);

-- Owner: authenticate through the same JWT claims auth.uid() consumes.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p85.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p85.owner_user'),true);
set local role authenticated;

select private.enjaz_phase85_probe_assert(auth.uid()=current_setting('enjaz.p85.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase85_probe_assert(
  has_table_privilege('public.organization_branches','SELECT')
  and has_table_privilege('public.organization_departments','SELECT')
  and has_table_privilege('public.organization_teams','SELECT')
  and not has_table_privilege('public.organization_branches','INSERT')
  and not has_table_privilege('public.organization_branches','UPDATE')
  and not has_table_privilege('public.organization_branches','DELETE')
  and not has_table_privilege('public.organization_scope_memberships','INSERT')
  and not has_table_privilege('public.transaction_organization_ownership','UPDATE'),
  'authenticated organization table privileges are not read-only'
);
select private.enjaz_phase85_probe_assert(
  private.enjaz_phase85_expect_direct_dml_denied(current_setting('enjaz.p85.owner_ws')::uuid),
  'direct organization DML did not fail closed'
);
with c as (select public.get_organization_context_v1(current_setting('enjaz.p85.owner_ws')::uuid) body)
select private.enjaz_phase85_probe_assert(
  body->>'authority'='organization_structure_scoped_ownership'
  and body->>'workspaceTrustAuthority'='legacy_owner_only_unchanged'
  and body->>'workforceAuthority'='organization_members_and_scope_memberships'
  and body->>'legacyWorkspaceWideAccessForWorkforce'='forbidden'
  and body->>'transactionLifecycleWriteAuthority'='none'
  and body->>'financeLedgerWriteAuthority'='none'
  and body->'actor'->>'actorType'='owner',
  'owner authority context drifted'
) from c;

with x as (select public.save_organization_branch_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,'__ENJAZ_PHASE85_PROBE_BRANCH_A__','P85RA','Baghdad A','active') body)
select set_config('enjaz.p85.branch_a',body->>'branchId',true) from x;
with x as (select public.save_organization_branch_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,'__ENJAZ_PHASE85_PROBE_BRANCH_B__','P85RB','Baghdad B','active') body)
select set_config('enjaz.p85.branch_b',body->>'branchId',true) from x;
select private.enjaz_phase85_probe_assert(
  private.enjaz_phase85_expect_branch_stale(current_setting('enjaz.p85.owner_ws')::uuid,current_setting('enjaz.p85.branch_a')::uuid),
  'stale branch mutation did not fail closed'
);
with x as (select public.save_organization_department_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,current_setting('enjaz.p85.branch_a')::uuid,'__ENJAZ_PHASE85_PROBE_DEPT_A__','P85DA','active') body)
select set_config('enjaz.p85.dept_a',body->>'departmentId',true) from x;
with x as (select public.save_organization_department_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,current_setting('enjaz.p85.branch_b')::uuid,'__ENJAZ_PHASE85_PROBE_DEPT_B__','P85DB','active') body)
select set_config('enjaz.p85.dept_b',body->>'departmentId',true) from x;
with x as (select public.save_organization_team_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,current_setting('enjaz.p85.dept_a')::uuid,'__ENJAZ_PHASE85_PROBE_TEAM_A__','P85TA','active') body)
select set_config('enjaz.p85.team_a',body->>'teamId',true) from x;
with x as (select public.save_organization_team_v1(current_setting('enjaz.p85.owner_ws')::uuid,null,null,current_setting('enjaz.p85.dept_b')::uuid,'__ENJAZ_PHASE85_PROBE_TEAM_B__','P85TB','active') body)
select set_config('enjaz.p85.team_b',body->>'teamId',true) from x;

with x as (select public.set_organization_member_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,
  current_setting('enjaz.p85.workforce_user')::uuid,'active',null
) body)
select set_config('enjaz.p85.member_id',body->>'memberId',true) from x;
select private.enjaz_phase85_probe_assert(
  not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=current_setting('enjaz.p85.owner_ws')::uuid
      and wm.user_id=current_setting('enjaz.p85.workforce_user')::uuid
  ),
  'workforce leaked into legacy workspace_memberships'
);
with x as (select public.set_organization_scope_membership_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,null,null,
  current_setting('enjaz.p85.workforce_user')::uuid,
  'branch',current_setting('enjaz.p85.branch_a')::uuid,null,null,
  'manager','active',null,null
) body)
select set_config('enjaz.p85.scope_id',body->>'membershipId',true) from x;

with x as (select public.assign_transaction_organization_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,
  '85000000-0000-4000-8000-000000000003'::uuid,null,
  'branch',current_setting('enjaz.p85.branch_a')::uuid,null,null,
  'Phase 8.5 initial owner assignment'
) body)
select set_config('enjaz.p85.ownership_id',body->>'ownershipId',true),
       set_config('enjaz.p85.ownership_version',body->>'version',true)
from x;
select private.enjaz_phase85_probe_assert(
  current_setting('enjaz.p85.ownership_version')::integer=1,
  'initial ownership version is not 1'
);

-- Workforce: branch manager inherits only downward and retains an explicit source.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p85.workforce_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p85.workforce_user'),true);
set local role authenticated;

select private.enjaz_phase85_probe_assert(auth.uid()=current_setting('enjaz.p85.workforce_user')::uuid,'workforce auth.uid mismatch');
select private.enjaz_phase85_probe_assert(
  not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=current_setting('enjaz.p85.owner_ws')::uuid and wm.user_id=auth.uid()
  ),
  'workforce acquired legacy workspace-wide membership'
);
select private.enjaz_phase85_probe_assert(
  exists(select 1 from public.organization_branches where id=current_setting('enjaz.p85.branch_a')::uuid)
  and not exists(select 1 from public.organization_branches where id=current_setting('enjaz.p85.branch_b')::uuid)
  and exists(select 1 from public.organization_departments where id=current_setting('enjaz.p85.dept_a')::uuid)
  and not exists(select 1 from public.organization_departments where id=current_setting('enjaz.p85.dept_b')::uuid)
  and exists(select 1 from public.organization_teams where id=current_setting('enjaz.p85.team_a')::uuid)
  and not exists(select 1 from public.organization_teams where id=current_setting('enjaz.p85.team_b')::uuid),
  'RLS did not enforce downward inheritance and sibling isolation'
);
with c as (select public.get_organization_context_v1(current_setting('enjaz.p85.owner_ws')::uuid) body)
select private.enjaz_phase85_probe_assert(
  body->'actor'->>'actorType'='workforce'
  and body->'actor'->>'organizationMemberId'=current_setting('enjaz.p85.member_id')
  and exists(select 1 from jsonb_array_elements(body->'branches') j where j->>'id'=current_setting('enjaz.p85.branch_a') and j->>'accessSourceMembershipId'=current_setting('enjaz.p85.scope_id'))
  and not exists(select 1 from jsonb_array_elements(body->'branches') j where j->>'id'=current_setting('enjaz.p85.branch_b'))
  and exists(select 1 from jsonb_array_elements(body->'departments') j where j->>'id'=current_setting('enjaz.p85.dept_a') and j->>'accessSourceMembershipId'=current_setting('enjaz.p85.scope_id'))
  and not exists(select 1 from jsonb_array_elements(body->'departments') j where j->>'id'=current_setting('enjaz.p85.dept_b'))
  and exists(select 1 from jsonb_array_elements(body->'teams') j where j->>'id'=current_setting('enjaz.p85.team_a') and j->>'accessSourceMembershipId'=current_setting('enjaz.p85.scope_id'))
  and not exists(select 1 from jsonb_array_elements(body->'teams') j where j->>'id'=current_setting('enjaz.p85.team_b'))
  and exists(select 1 from jsonb_array_elements(body->'transactions') j where j->>'transactionId'='85000000-0000-4000-8000-000000000003' and j->>'accessSourceMembershipId'=current_setting('enjaz.p85.scope_id')),
  'workforce context leaked siblings or lost the explicit inheritance source'
) from c;
with e as (select public.explain_organization_access_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,'team',null,null,current_setting('enjaz.p85.team_a')::uuid
) body)
select private.enjaz_phase85_probe_assert(
  (body->>'allowed')::boolean
  and body->>'actorType'='workforce'
  and body->>'source'='explicit_or_downward_inherited'
  and body->>'sourceMembershipId'=current_setting('enjaz.p85.scope_id')
  and body->>'sourceScopeType'='branch'
  and body->>'sourceRole'='manager',
  'downward inherited access is not source-explainable'
) from e;
with e as (select public.explain_organization_access_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,'branch',current_setting('enjaz.p85.branch_b')::uuid,null,null
) body)
select private.enjaz_phase85_probe_assert(not (body->>'allowed')::boolean,'sibling branch access was incorrectly allowed') from e;
select private.enjaz_phase85_probe_assert(
  private.enjaz_phase85_expect_owner_write_denied(current_setting('enjaz.p85.owner_ws')::uuid),
  'workforce could mutate owner-governed structure'
);
select private.enjaz_phase85_probe_assert(
  private.enjaz_phase85_expect_transfer_denied(
    current_setting('enjaz.p85.owner_ws')::uuid,
    '85000000-0000-4000-8000-000000000003'::uuid,1,
    current_setting('enjaz.p85.branch_b')::uuid
  ),
  'workforce could transfer into an unmanaged sibling branch'
);
with x as (select public.assign_transaction_organization_v1(
  current_setting('enjaz.p85.owner_ws')::uuid,
  '85000000-0000-4000-8000-000000000003'::uuid,1,
  'team',null,null,current_setting('enjaz.p85.team_a')::uuid,
  'Phase 8.5 manager downward transfer'
) body)
select private.enjaz_phase85_probe_assert(
  (body->>'version')::integer=2
  and body->>'scopeType'='team'
  and body->>'teamId'=current_setting('enjaz.p85.team_a'),
  'branch manager could not transfer to a managed descendant team'
) from x;

-- Cross-workspace must still fail closed for another real authenticated owner.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p85.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p85.owner_user'),true);
set local role authenticated;
select private.enjaz_phase85_probe_assert(
  private.enjaz_phase85_expect_workspace_forbidden(current_setting('enjaz.p85.workforce_ws')::uuid),
  'cross-workspace organization context did not fail closed'
);

-- Elevated truth check proves the org layer never touched lifecycle or finance.
reset role;
select private.enjaz_phase85_probe_assert(
  (select updated_at::text=current_setting('enjaz.p85.tx_updated_before') from public.transactions where id='85000000-0000-4000-8000-000000000003'::uuid)
  and (select status='active' and priority='normal' and current_fee=100.00 from public.transactions where id='85000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.payments where transaction_id='85000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.financial_ledger_entries where transaction_id='85000000-0000-4000-8000-000000000003'::uuid),
  'organization ownership mutated transaction lifecycle or finance'
);
select private.enjaz_phase85_probe_assert(
  (select count(*) from public.transaction_organization_ownership_events where transaction_id='85000000-0000-4000-8000-000000000003'::uuid)=2,
  'ownership audit trail did not record assigned plus transferred events'
);
select private.enjaz_phase85_probe_assert(
  not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=current_setting('enjaz.p85.owner_ws')::uuid
      and wm.user_id=current_setting('enjaz.p85.workforce_user')::uuid
  ),
  'elevated truth check found legacy workspace membership leakage'
);

-- Delete every owner-workspace probe artifact using exact IDs captured above.
delete from public.audit_events
where workspace_id=current_setting('enjaz.p85.owner_ws')::uuid
  and entity_id in (
    current_setting('enjaz.p85.branch_a')::uuid,current_setting('enjaz.p85.branch_b')::uuid,
    current_setting('enjaz.p85.dept_a')::uuid,current_setting('enjaz.p85.dept_b')::uuid,
    current_setting('enjaz.p85.team_a')::uuid,current_setting('enjaz.p85.team_b')::uuid,
    current_setting('enjaz.p85.member_id')::uuid,current_setting('enjaz.p85.scope_id')::uuid,
    current_setting('enjaz.p85.ownership_id')::uuid
  );
delete from public.transactions where id='85000000-0000-4000-8000-000000000003'::uuid;
delete from public.companies where id='85000000-0000-4000-8000-000000000002'::uuid;
delete from public.organization_teams where id in (current_setting('enjaz.p85.team_a')::uuid,current_setting('enjaz.p85.team_b')::uuid);
delete from public.organization_departments where id in (current_setting('enjaz.p85.dept_a')::uuid,current_setting('enjaz.p85.dept_b')::uuid);
delete from public.organization_branches where id in (current_setting('enjaz.p85.branch_a')::uuid,current_setting('enjaz.p85.branch_b')::uuid);
delete from public.organization_members
where workspace_id=current_setting('enjaz.p85.owner_ws')::uuid
  and user_id=current_setting('enjaz.p85.workforce_user')::uuid;
delete from public.workspaces where id=current_setting('enjaz.p85.workforce_ws')::uuid;
delete from auth.users where id=current_setting('enjaz.p85.workforce_user')::uuid;

select private.enjaz_phase85_probe_assert(
  not exists(select 1 from auth.users where id='85000000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase85_probe_workforce__@example.invalid')
  and not exists(select 1 from public.workspaces where id=current_setting('enjaz.p85.workforce_ws')::uuid)
  and not exists(select 1 from public.companies where id='85000000-0000-4000-8000-000000000002'::uuid or legal_name='__ENJAZ_PHASE85_PROBE_COMPANY__')
  and not exists(select 1 from public.transactions where id='85000000-0000-4000-8000-000000000003'::uuid or type='__ENJAZ_PHASE85_PROBE_TRANSACTION__')
  and not exists(select 1 from public.organization_members where user_id='85000000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.organization_branches where name like '__ENJAZ_PHASE85_PROBE_%')
  and not exists(select 1 from public.organization_departments where name like '__ENJAZ_PHASE85_PROBE_%')
  and not exists(select 1 from public.organization_teams where name like '__ENJAZ_PHASE85_PROBE_%')
  and not exists(select 1 from public.transaction_organization_ownership where transaction_id='85000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.transaction_organization_ownership_events where transaction_id='85000000-0000-4000-8000-000000000003'::uuid),
  'zero-residue cleanup failed'
);

drop function private.enjaz_phase85_expect_workspace_forbidden(uuid);
drop function private.enjaz_phase85_expect_transfer_denied(uuid,uuid,integer,uuid);
drop function private.enjaz_phase85_expect_branch_stale(uuid,uuid);
drop function private.enjaz_phase85_expect_owner_write_denied(uuid);
drop function private.enjaz_phase85_expect_direct_dml_denied(uuid);
drop function private.enjaz_phase85_probe_assert(boolean,text);

commit;
