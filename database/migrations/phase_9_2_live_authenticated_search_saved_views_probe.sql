-- ENJAZ Phase 9.2 — authenticated Real Cloud Saved Views + Global Search destruction probe
-- Evidence-only migration: simulates real auth.uid() JWT sessions, proves the 9.2
-- authority boundaries against the live database, removes every probe artifact,
-- then commits only the zero-residue proof execution.

begin;

create or replace function private.enjaz_phase92_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE92_PROBE_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase92_expect_direct_saved_view_dml_denied(p_workspace_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.saved_views(
    id,workspace_id,owner_user_id,name,domain,visibility,team_id,definition,operation_id
  ) values(
    '92000000-0000-4000-8000-000000000096'::uuid,p_workspace_id,(select auth.uid()),
    '__ENJAZ_PHASE92_ILLEGAL_DML__','transactions','personal',null,
    '{"schema":"enjaz.saved-view.v1","domain":"transactions","query":"P92CLOUD","filters":{"view":"current"},"sort":"activity-desc","dateRange":{"from":null,"to":null},"pageSize":20,"sourceSchema":"enjaz.transactions.list.v1"}'::jsonb,
    '92000000-0000-4000-8000-000000000099'::uuid
  );
  return false;
exception when insufficient_privilege then return true;
end;
$$;

create or replace function private.enjaz_phase92_expect_cross_workspace_search_denied(p_workspace_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.global_search_v1(p_workspace_id,'P92CLOUD',8);
  return false;
exception when insufficient_privilege then return true;
end;
$$;

create or replace function private.enjaz_phase92_expect_saved_view_stale(
  p_workspace_id uuid,p_saved_view_id uuid,p_definition jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.save_saved_view_v1(
    p_workspace_id,p_saved_view_id,0,'92000000-0000-4000-8000-000000000098'::uuid,
    '__ENJAZ_PHASE92_STALE__','personal',null,p_definition
  );
  return false;
exception when serialization_failure then return sqlerrm='ENJAZ_SAVED_VIEW_STALE';
end;
$$;

create or replace function private.enjaz_phase92_expect_workspace_share_denied(
  p_workspace_id uuid,p_definition jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.save_saved_view_v1(
    p_workspace_id,null,null,'92000000-0000-4000-8000-000000000097'::uuid,
    '__ENJAZ_PHASE92_ILLEGAL_WORKSPACE_SHARE__','workspace',null,p_definition
  );
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_SAVED_VIEW_WORKSPACE_OWNER_REQUIRED';
end;
$$;

revoke all on function private.enjaz_phase92_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase92_expect_direct_saved_view_dml_denied(uuid) from public,anon;
revoke all on function private.enjaz_phase92_expect_cross_workspace_search_denied(uuid) from public,anon;
revoke all on function private.enjaz_phase92_expect_saved_view_stale(uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase92_expect_workspace_share_denied(uuid,jsonb) from public,anon;
grant execute on function private.enjaz_phase92_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase92_expect_direct_saved_view_dml_denied(uuid) to authenticated;
grant execute on function private.enjaz_phase92_expect_cross_workspace_search_denied(uuid) to authenticated;
grant execute on function private.enjaz_phase92_expect_saved_view_stale(uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase92_expect_workspace_share_denied(uuid,jsonb) to authenticated;

-- Resolve one real production owner. No existing source-business row is modified.
select set_config('enjaz.p92.owner_user',(
  select wm.user_id::text
  from public.workspace_memberships wm
  join public.workspaces w on w.id=wm.workspace_id and w.owner_user_id=wm.user_id
  join auth.users u on u.id=wm.user_id
  where wm.role='owner'
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select private.enjaz_phase92_probe_assert(
  nullif(current_setting('enjaz.p92.owner_user',true),'') is not null,
  'no real owner exists'
);
select set_config('enjaz.p92.owner_ws',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.p92.owner_user')::uuid and wm.role='owner'
  order by wm.created_at,wm.workspace_id
  limit 1
),true);

select private.enjaz_phase92_probe_assert(
  not exists(select 1 from auth.users where id='92000000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.companies where id='92000000-0000-4000-8000-000000000002'::uuid)
  and not exists(select 1 from public.contacts where id='92000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.transactions where id='92000000-0000-4000-8000-000000000004'::uuid)
  and not exists(select 1 from public.documents where id='92000000-0000-4000-8000-000000000005'::uuid)
  and not exists(select 1 from public.saved_views where name like '__ENJAZ_PHASE92_%'),
  'probe residue exists before execution'
);

-- Temporary authenticated workforce identity. Existing auth bootstrap creates its
-- isolated home workspace, which is used for a real cross-workspace denial test.
insert into auth.users(
  id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '92000000-0000-4000-8000-000000000001'::uuid,
  'authenticated','authenticated','__enjaz_phase92_probe_workforce__@example.invalid',now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  jsonb_build_object('display_name','Phase 9.2 Probe Workforce'),now(),now()
);
select set_config('enjaz.p92.workforce_user','92000000-0000-4000-8000-000000000001',true);
select set_config('enjaz.p92.workforce_ws',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('enjaz.p92.workforce_user')::uuid and wm.role='owner'
  order by wm.created_at limit 1
),true);
select private.enjaz_phase92_probe_assert(
  nullif(current_setting('enjaz.p92.workforce_ws',true),'') is not null
  and current_setting('enjaz.p92.workforce_ws')::uuid<>current_setting('enjaz.p92.owner_ws')::uuid,
  'temporary Auth bootstrap did not create an isolated workspace'
);

-- Source fixtures in the real owner workspace. Every value carries a unique probe
-- marker and every row is removed before commit.
insert into public.companies(id,workspace_id,legal_name,display_name,status)
values(
  '92000000-0000-4000-8000-000000000002'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '__ENJAZ_PHASE92_P92CLOUD_COMPANY__','P92CLOUD Company','active'
);
insert into public.contacts(id,workspace_id,display_name,contact_type,status)
values(
  '92000000-0000-4000-8000-000000000003'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  'P92CLOUD Person','other','active'
);
insert into public.transactions(id,workspace_id,company_id,type,department,status,priority,current_fee)
values(
  '92000000-0000-4000-8000-000000000004'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000002'::uuid,'P92CLOUD Transaction','QA','active','normal',100.00
);
insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,status)
values(
  '92000000-0000-4000-8000-000000000005'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  'P92CLOUD Document','probe','text/plain','phase92/probe.txt',1,'ready'
);
insert into public.government_entities(id,workspace_id,name,entity_type,active)
values(
  '92000000-0000-4000-8000-000000000006'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  'P92CLOUD Entity','other',true
);
insert into public.workflow_templates(id,workspace_id,name,description,version,active)
values(
  '92000000-0000-4000-8000-000000000007'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  'P92CLOUD Workflow','Phase 9.2 search probe',1,true
);
insert into public.government_procedures(id,workspace_id,government_entity_id,workflow_template_id,code,name,description,active)
values(
  '92000000-0000-4000-8000-000000000008'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000006'::uuid,'92000000-0000-4000-8000-000000000007'::uuid,
  'P92CLOUD','P92CLOUD Procedure','Phase 9.2 procedure probe',true
);
insert into public.organization_branches(id,workspace_id,name,code,address,status,version,created_by)
values(
  '92000000-0000-4000-8000-000000000009'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '__ENJAZ_PHASE92_BRANCH__','P92BR','Baghdad','active',1,current_setting('enjaz.p92.owner_user')::uuid
);
insert into public.organization_departments(id,workspace_id,branch_id,name,code,status,version,created_by)
values(
  '92000000-0000-4000-8000-000000000010'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000009'::uuid,'__ENJAZ_PHASE92_DEPT__','P92DP','active',1,current_setting('enjaz.p92.owner_user')::uuid
);
insert into public.organization_teams(id,workspace_id,department_id,name,code,status,version,created_by)
values(
  '92000000-0000-4000-8000-000000000011'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000010'::uuid,'__ENJAZ_PHASE92_TEAM__','P92TM','active',1,current_setting('enjaz.p92.owner_user')::uuid
);

-- Before any M15 membership is granted, the workforce actor must learn nothing
-- about the real owner's workspace through either read surface.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p92.workforce_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p92.workforce_user'),true);
set local role authenticated;
select private.enjaz_phase92_probe_assert(auth.uid()=current_setting('enjaz.p92.workforce_user')::uuid,'workforce auth.uid mismatch before scope grant');
select private.enjaz_phase92_probe_assert(
  private.enjaz_phase92_expect_cross_workspace_search_denied(current_setting('enjaz.p92.owner_ws')::uuid),
  'cross-workspace global search did not fail closed'
);
with x as (select public.list_saved_views_v1(current_setting('enjaz.p92.owner_ws')::uuid) body)
select private.enjaz_phase92_probe_assert(jsonb_array_length(body)=0,'cross-workspace saved-view metadata leaked') from x;
reset role;

-- Owner exercises the real RPC contracts.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p92.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p92.owner_user'),true);
set local role authenticated;
select private.enjaz_phase92_probe_assert(auth.uid()=current_setting('enjaz.p92.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase92_probe_assert(
  has_table_privilege('public.saved_views','SELECT')
  and not has_table_privilege('public.saved_views','INSERT')
  and not has_table_privilege('public.saved_views','UPDATE')
  and not has_table_privilege('public.saved_views','DELETE'),
  'saved_views browser table privileges are not SELECT-only'
);
select private.enjaz_phase92_probe_assert(
  private.enjaz_phase92_expect_direct_saved_view_dml_denied(current_setting('enjaz.p92.owner_ws')::uuid),
  'direct saved_views DML did not fail closed'
);

select set_config('enjaz.p92.definition','{"schema":"enjaz.saved-view.v1","domain":"transactions","query":"P92CLOUD","filters":{"view":"current"},"sort":"activity-desc","dateRange":{"from":null,"to":null},"pageSize":20,"sourceSchema":"enjaz.transactions.list.v1"}',true);
with x as (select public.save_saved_view_v1(
  current_setting('enjaz.p92.owner_ws')::uuid,null,null,
  '92000000-0000-4000-8000-000000000020'::uuid,'__ENJAZ_PHASE92_PERSONAL__','personal',null,
  current_setting('enjaz.p92.definition')::jsonb
) body)
select set_config('enjaz.p92.personal_view',body->>'savedViewId',true),
       set_config('enjaz.p92.personal_version',body->>'version',true)
from x;
select private.enjaz_phase92_probe_assert(current_setting('enjaz.p92.personal_version')::integer=1,'personal saved-view version is not 1');
with x as (select public.save_saved_view_v1(
  current_setting('enjaz.p92.owner_ws')::uuid,null,null,
  '92000000-0000-4000-8000-000000000020'::uuid,'__ENJAZ_PHASE92_PERSONAL__','personal',null,
  current_setting('enjaz.p92.definition')::jsonb
) body)
select private.enjaz_phase92_probe_assert(
  body->>'savedViewId'=current_setting('enjaz.p92.personal_view')
  and (body->>'version')::integer=1
  and (body->>'replayed')::boolean=true,
  'saved-view create idempotency replay drifted'
) from x;
select private.enjaz_phase92_probe_assert(
  private.enjaz_phase92_expect_saved_view_stale(
    current_setting('enjaz.p92.owner_ws')::uuid,current_setting('enjaz.p92.personal_view')::uuid,current_setting('enjaz.p92.definition')::jsonb
  ),
  'stale saved-view update did not fail closed'
);
with x as (select public.save_saved_view_v1(
  current_setting('enjaz.p92.owner_ws')::uuid,null,null,
  '92000000-0000-4000-8000-000000000021'::uuid,'__ENJAZ_PHASE92_WORKSPACE__','workspace',null,
  current_setting('enjaz.p92.definition')::jsonb
) body)
select set_config('enjaz.p92.workspace_view',body->>'savedViewId',true) from x;
with x as (select public.save_saved_view_v1(
  current_setting('enjaz.p92.owner_ws')::uuid,null,null,
  '92000000-0000-4000-8000-000000000022'::uuid,'__ENJAZ_PHASE92_TEAM__','team',
  '92000000-0000-4000-8000-000000000011'::uuid,current_setting('enjaz.p92.definition')::jsonb
) body)
select set_config('enjaz.p92.team_view',body->>'savedViewId',true) from x;

with x as (select public.list_saved_views_v1(current_setting('enjaz.p92.owner_ws')::uuid) body)
select private.enjaz_phase92_probe_assert(
  jsonb_array_length(body)=3
  and exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='personal')
  and exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='team')
  and exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='workspace'),
  'owner saved-view visibility set is incomplete'
) from x;

with x as (select public.global_search_v1(current_setting('enjaz.p92.owner_ws')::uuid,'P92CLOUD',8) body)
select private.enjaz_phase92_probe_assert(
  (select count(distinct r->>'domain') from jsonb_array_elements(body) r)=5
  and not exists(select 1 from jsonb_array_elements(body) r where r->>'schema'<>'enjaz.global-search-result.v1')
  and not exists(select 1 from jsonb_array_elements(body) r where coalesce(r->>'destination','') !~ '^/app/'),
  'owner global search did not return five canonical internal domains'
) from x;
reset role;

-- Grant the temporary user one team-scoped M15 membership and assign exactly one
-- transaction to that team. No legacy workspace_memberships escalation is created.
insert into public.organization_members(id,workspace_id,user_id,status,valid_from,version,created_by)
values(
  '92000000-0000-4000-8000-000000000012'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  current_setting('enjaz.p92.workforce_user')::uuid,'active',now(),1,current_setting('enjaz.p92.owner_user')::uuid
);
insert into public.organization_scope_memberships(
  id,workspace_id,organization_member_id,scope_type,branch_id,department_id,team_id,scope_role,status,valid_from,version,created_by
) values(
  '92000000-0000-4000-8000-000000000013'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000012'::uuid,'team',null,null,
  '92000000-0000-4000-8000-000000000011'::uuid,'member','active',now(),1,current_setting('enjaz.p92.owner_user')::uuid
);
insert into public.transaction_organization_ownership(
  id,workspace_id,transaction_id,scope_type,branch_id,department_id,team_id,version,assigned_by
) values(
  '92000000-0000-4000-8000-000000000014'::uuid,current_setting('enjaz.p92.owner_ws')::uuid,
  '92000000-0000-4000-8000-000000000004'::uuid,'team',null,null,
  '92000000-0000-4000-8000-000000000011'::uuid,1,current_setting('enjaz.p92.owner_user')::uuid
);
select private.enjaz_phase92_probe_assert(
  not exists(select 1 from public.workspace_memberships where workspace_id=current_setting('enjaz.p92.owner_ws')::uuid and user_id=current_setting('enjaz.p92.workforce_user')::uuid),
  'workforce leaked into legacy workspace_memberships'
);

-- Scoped workforce: may read team/workspace saved views, never personal; global
-- search may reveal only its assigned transaction, never owner-only domains.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('enjaz.p92.workforce_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('enjaz.p92.workforce_user'),true);
set local role authenticated;
select private.enjaz_phase92_probe_assert(auth.uid()=current_setting('enjaz.p92.workforce_user')::uuid,'workforce auth.uid mismatch after scope grant');
with x as (select public.list_saved_views_v1(current_setting('enjaz.p92.owner_ws')::uuid) body)
select private.enjaz_phase92_probe_assert(
  jsonb_array_length(body)=2
  and not exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='personal')
  and exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='team')
  and exists(select 1 from jsonb_array_elements(body) r where r->>'visibility'='workspace'),
  'workforce saved-view visibility boundary drifted'
) from x;
with x as (select public.global_search_v1(current_setting('enjaz.p92.owner_ws')::uuid,'P92CLOUD',8) body)
select private.enjaz_phase92_probe_assert(
  jsonb_array_length(body)=1
  and body->0->>'domain'='transactions'
  and body->0->>'entityId'='92000000-0000-4000-8000-000000000004'
  and not exists(select 1 from jsonb_array_elements(body) r where r->>'domain' in ('companies','people','procedures','documents')),
  'workforce global search leaked owner-only domain or missed assigned transaction'
) from x;
select private.enjaz_phase92_probe_assert(
  private.enjaz_phase92_expect_workspace_share_denied(current_setting('enjaz.p92.owner_ws')::uuid,current_setting('enjaz.p92.definition')::jsonb),
  'workforce created a workspace-shared saved view without owner authority'
);
select private.enjaz_phase92_probe_assert(
  private.enjaz_phase92_expect_direct_saved_view_dml_denied(current_setting('enjaz.p92.owner_ws')::uuid),
  'workforce direct saved_views DML did not fail closed'
);
reset role;

-- Elevated truth checks: 9.2 never mutated source-business truth while exercising
-- Saved Views and Global Search.
select private.enjaz_phase92_probe_assert(
  (select status='active' and priority='normal' and current_fee=100.00 from public.transactions where id='92000000-0000-4000-8000-000000000004'::uuid)
  and not exists(select 1 from public.payments where transaction_id='92000000-0000-4000-8000-000000000004'::uuid)
  and not exists(select 1 from public.financial_ledger_entries where transaction_id='92000000-0000-4000-8000-000000000004'::uuid),
  '9.2 read/save operations mutated transaction or finance truth'
);

-- Exact cleanup, including audit records generated by Saved View RPCs.
delete from public.audit_events
where workspace_id=current_setting('enjaz.p92.owner_ws')::uuid
  and entity_type='saved_view'
  and entity_id in (
    current_setting('enjaz.p92.personal_view')::uuid,
    current_setting('enjaz.p92.workspace_view')::uuid,
    current_setting('enjaz.p92.team_view')::uuid
  );
delete from public.saved_views
where workspace_id=current_setting('enjaz.p92.owner_ws')::uuid and name like '__ENJAZ_PHASE92_%';
delete from public.transaction_organization_ownership where id='92000000-0000-4000-8000-000000000014'::uuid;
delete from public.organization_scope_memberships where id='92000000-0000-4000-8000-000000000013'::uuid;
delete from public.organization_members where id='92000000-0000-4000-8000-000000000012'::uuid;
delete from public.organization_teams where id='92000000-0000-4000-8000-000000000011'::uuid;
delete from public.organization_departments where id='92000000-0000-4000-8000-000000000010'::uuid;
delete from public.organization_branches where id='92000000-0000-4000-8000-000000000009'::uuid;
delete from public.government_procedures where id='92000000-0000-4000-8000-000000000008'::uuid;
delete from public.government_entities where id='92000000-0000-4000-8000-000000000006'::uuid;
delete from public.workflow_templates where id='92000000-0000-4000-8000-000000000007'::uuid;
delete from public.documents where id='92000000-0000-4000-8000-000000000005'::uuid;
delete from public.transactions where id='92000000-0000-4000-8000-000000000004'::uuid;
delete from public.contacts where id='92000000-0000-4000-8000-000000000003'::uuid;
delete from public.companies where id='92000000-0000-4000-8000-000000000002'::uuid;
delete from public.workspaces where id=current_setting('enjaz.p92.workforce_ws')::uuid;
delete from auth.users where id=current_setting('enjaz.p92.workforce_user')::uuid;

select private.enjaz_phase92_probe_assert(
  not exists(select 1 from auth.users where id='92000000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase92_probe_workforce__@example.invalid')
  and not exists(select 1 from public.workspaces where id=current_setting('enjaz.p92.workforce_ws')::uuid)
  and not exists(select 1 from public.companies where id='92000000-0000-4000-8000-000000000002'::uuid)
  and not exists(select 1 from public.contacts where id='92000000-0000-4000-8000-000000000003'::uuid)
  and not exists(select 1 from public.transactions where id='92000000-0000-4000-8000-000000000004'::uuid)
  and not exists(select 1 from public.documents where id='92000000-0000-4000-8000-000000000005'::uuid)
  and not exists(select 1 from public.government_entities where id='92000000-0000-4000-8000-000000000006'::uuid)
  and not exists(select 1 from public.workflow_templates where id='92000000-0000-4000-8000-000000000007'::uuid)
  and not exists(select 1 from public.government_procedures where id='92000000-0000-4000-8000-000000000008'::uuid)
  and not exists(select 1 from public.saved_views where name like '__ENJAZ_PHASE92_%')
  and not exists(select 1 from public.organization_branches where name='__ENJAZ_PHASE92_BRANCH__')
  and not exists(select 1 from public.organization_departments where name='__ENJAZ_PHASE92_DEPT__')
  and not exists(select 1 from public.organization_teams where name='__ENJAZ_PHASE92_TEAM__'),
  'zero-residue cleanup failed'
);

drop function private.enjaz_phase92_expect_workspace_share_denied(uuid,jsonb);
drop function private.enjaz_phase92_expect_saved_view_stale(uuid,uuid,jsonb);
drop function private.enjaz_phase92_expect_cross_workspace_search_denied(uuid);
drop function private.enjaz_phase92_expect_direct_saved_view_dml_denied(uuid);
drop function private.enjaz_phase92_probe_assert(boolean,text);

commit;
