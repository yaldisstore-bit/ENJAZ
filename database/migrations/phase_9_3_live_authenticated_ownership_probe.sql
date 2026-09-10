-- ENJAZ Phase 9.3 — authenticated Real Cloud corporate ownership destruction probe
-- Evidence-only migration: exercises the production RLS/JWT/RPC boundary and leaves zero probe residue.

begin;

create or replace function private.enjaz_phase93_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE93_PROBE_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase93_expect_direct_dml_denied(p_workspace_id uuid,p_company_id uuid,p_contact_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.corporate_ownership_stakes(
    workspace_id,company_id,holder_kind,holder_contact_id,ownership_role,percentage,
    effective_from,created_by,created_operation_id
  ) values(
    p_workspace_id,p_company_id,'person',p_contact_id,'shareholder',100,
    date '2025-01-01',(select auth.uid()),gen_random_uuid()
  );
  return false;
exception when insufficient_privilege then return true;
end;
$$;

create or replace function private.enjaz_phase93_expect_stale(
  p_workspace_id uuid,p_company_id uuid,p_operation_id uuid,p_entries jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_ownership_snapshot_v1(
    p_workspace_id,p_company_id,0,p_operation_id,date '2026-06-01',p_entries
  );
  return false;
exception when serialization_failure then return sqlerrm='ENJAZ_OWNERSHIP_STALE';
end;
$$;

create or replace function private.enjaz_phase93_expect_operation_reused(
  p_workspace_id uuid,p_company_id uuid,p_operation_id uuid,p_entries jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_ownership_snapshot_v1(
    p_workspace_id,p_company_id,0,p_operation_id,date '2026-01-01',p_entries
  );
  return false;
exception when unique_violation then return sqlerrm='ENJAZ_OWNERSHIP_OPERATION_REUSED';
end;
$$;

create or replace function private.enjaz_phase93_expect_bad_total(
  p_workspace_id uuid,p_company_id uuid,p_operation_id uuid,p_entries jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_ownership_snapshot_v1(
    p_workspace_id,p_company_id,1,p_operation_id,date '2026-06-01',p_entries
  );
  return false;
exception when check_violation then return sqlerrm='ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100';
end;
$$;

create or replace function private.enjaz_phase93_expect_cross_holder_denied(
  p_workspace_id uuid,p_company_id uuid,p_operation_id uuid,p_entries jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_ownership_snapshot_v1(
    p_workspace_id,p_company_id,1,p_operation_id,date '2026-06-01',p_entries
  );
  return false;
exception when no_data_found then return sqlerrm='ENJAZ_OWNERSHIP_PERSON_NOT_FOUND';
end;
$$;

create or replace function private.enjaz_phase93_expect_nonowner_write_denied(
  p_workspace_id uuid,p_company_id uuid,p_operation_id uuid,p_entries jsonb
)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_ownership_snapshot_v1(
    p_workspace_id,p_company_id,2,p_operation_id,date '2026-09-01',p_entries
  );
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_OWNER_REQUIRED';
end;
$$;

create or replace function private.enjaz_phase93_expect_cross_workspace_read_denied(p_workspace_id uuid,p_company_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.get_company_ownership_snapshot_v1(p_workspace_id,p_company_id,date '2026-09-01');
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_WORKSPACE_FORBIDDEN';
end;
$$;

revoke all on function private.enjaz_phase93_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase93_expect_direct_dml_denied(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase93_expect_stale(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase93_expect_operation_reused(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase93_expect_bad_total(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase93_expect_cross_holder_denied(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase93_expect_nonowner_write_denied(uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function private.enjaz_phase93_expect_cross_workspace_read_denied(uuid,uuid) from public,anon;
grant execute on function private.enjaz_phase93_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase93_expect_direct_dml_denied(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase93_expect_stale(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase93_expect_operation_reused(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase93_expect_bad_total(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase93_expect_cross_holder_denied(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase93_expect_nonowner_write_denied(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function private.enjaz_phase93_expect_cross_workspace_read_denied(uuid,uuid) to authenticated;

select set_config('p93.owner_user',(
  select wm.user_id::text
  from public.workspace_memberships wm
  join public.workspaces w on w.id=wm.workspace_id and w.owner_user_id=wm.user_id
  join auth.users u on u.id=wm.user_id
  where wm.role='owner'
  order by wm.created_at,wm.workspace_id
  limit 1
),true);
select private.enjaz_phase93_probe_assert(nullif(current_setting('p93.owner_user',true),'') is not null,'no real owner exists');
select set_config('p93.owner_ws',(
  select wm.workspace_id::text
  from public.workspace_memberships wm
  where wm.user_id=current_setting('p93.owner_user')::uuid and wm.role='owner'
  order by wm.created_at,wm.workspace_id limit 1
),true);

select private.enjaz_phase93_probe_assert(
  not exists(select 1 from auth.users where id='93000000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase93_probe_outsider__@example.invalid')
  and not exists(select 1 from public.companies where id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.contacts where id in ('93000000-0000-4000-8000-000000000011'::uuid,'93000000-0000-4000-8000-000000000012'::uuid,'93000000-0000-4000-8000-000000000013'::uuid))
  and not exists(select 1 from public.corporate_ownership_stakes where company_id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_governance_events where company_id='93000000-0000-4000-8000-000000000010'::uuid),
  'probe residue exists before execution'
);

insert into auth.users(
  id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '93000000-0000-4000-8000-000000000001'::uuid,
  'authenticated','authenticated','__enjaz_phase93_probe_outsider__@example.invalid',now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  jsonb_build_object('display_name','Phase 9.3 Probe Outsider'),now(),now()
);
select set_config('p93.outsider_user','93000000-0000-4000-8000-000000000001',true);
select set_config('p93.outsider_ws',(
  select wm.workspace_id::text from public.workspace_memberships wm
  where wm.user_id=current_setting('p93.outsider_user')::uuid and wm.role='owner'
  order by wm.created_at limit 1
),true);
select private.enjaz_phase93_probe_assert(
  nullif(current_setting('p93.outsider_ws',true),'') is not null
  and current_setting('p93.outsider_ws')::uuid<>current_setting('p93.owner_ws')::uuid,
  'temporary auth bootstrap did not create an isolated workspace'
);

insert into public.companies(id,workspace_id,legal_name,display_name,status)
values('93000000-0000-4000-8000-000000000010'::uuid,current_setting('p93.owner_ws')::uuid,'__ENJAZ_PHASE93_PROBE_COMPANY__','Phase 9.3 Probe Company','active');
insert into public.contacts(id,workspace_id,display_name,contact_type,status) values
('93000000-0000-4000-8000-000000000011'::uuid,current_setting('p93.owner_ws')::uuid,'Phase 9.3 Owner A','client','active'),
('93000000-0000-4000-8000-000000000012'::uuid,current_setting('p93.owner_ws')::uuid,'Phase 9.3 Owner B','client','active');
insert into public.contacts(id,workspace_id,display_name,contact_type,status)
values('93000000-0000-4000-8000-000000000013'::uuid,current_setting('p93.outsider_ws')::uuid,'Phase 9.3 Foreign Holder','client','active');

select set_config('p93.op1',gen_random_uuid()::text,true);
select set_config('p93.op2',gen_random_uuid()::text,true);
select set_config('p93.op_stale',gen_random_uuid()::text,true);
select set_config('p93.op_bad_total',gen_random_uuid()::text,true);
select set_config('p93.op_cross',gen_random_uuid()::text,true);
select set_config('p93.op_nonowner',gen_random_uuid()::text,true);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p93.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p93.owner_user'),true);
set local role authenticated;

select private.enjaz_phase93_probe_assert(auth.uid()=current_setting('p93.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase93_probe_assert(
  has_table_privilege('public.corporate_ownership_states','SELECT')
  and has_table_privilege('public.corporate_ownership_stakes','SELECT')
  and has_table_privilege('public.corporate_governance_events','SELECT')
  and not has_table_privilege('public.corporate_ownership_states','INSERT')
  and not has_table_privilege('public.corporate_ownership_states','UPDATE')
  and not has_table_privilege('public.corporate_ownership_states','DELETE')
  and not has_table_privilege('public.corporate_ownership_stakes','INSERT')
  and not has_table_privilege('public.corporate_ownership_stakes','UPDATE')
  and not has_table_privilege('public.corporate_ownership_stakes','DELETE')
  and not has_table_privilege('public.corporate_governance_events','INSERT'),
  'authenticated governance table privileges are not read-only'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_direct_dml_denied(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    '93000000-0000-4000-8000-000000000011'::uuid
  ),
  'direct ownership DML did not fail closed'
);

with x as (
  select public.replace_company_ownership_snapshot_v1(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    0,current_setting('p93.op1')::uuid,date '2026-01-01',
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','60'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','40')
    )
  ) body
)
select private.enjaz_phase93_probe_assert(
  (body->>'version')::integer=1 and body->>'replayed'='false',
  'initial ownership snapshot failed'
) from x;

with x as (
  select public.replace_company_ownership_snapshot_v1(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    0,current_setting('p93.op1')::uuid,date '2026-01-01',
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','60'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','40')
    )
  ) body
)
select private.enjaz_phase93_probe_assert(
  (body->>'version')::integer=1 and body->>'replayed'='true',
  'idempotent replay did not return the original ownership event'
) from x;

select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_operation_reused(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    current_setting('p93.op1')::uuid,
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','50'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','50')
    )
  ),
  'operation id payload drift did not fail closed'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_stale(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    current_setting('p93.op_stale')::uuid,
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','50'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','50')
    )
  ),
  'stale ownership version did not fail closed'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_bad_total(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    current_setting('p93.op_bad_total')::uuid,
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','60'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','30')
    )
  ),
  '90 percent ownership did not fail closed'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_cross_holder_denied(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    current_setting('p93.op_cross')::uuid,
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','50'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000013','role','shareholder','percentage','50')
    )
  ),
  'cross-workspace holder reference did not fail closed'
);

with x as (
  select public.replace_company_ownership_snapshot_v1(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    1,current_setting('p93.op2')::uuid,date '2026-06-01',
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','50'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','50')
    )
  ) body
)
select private.enjaz_phase93_probe_assert(
  (body->>'version')::integer=2 and body->>'replayed'='false',
  'second ownership snapshot failed'
) from x;

with old_snapshot as (
  select public.get_company_ownership_snapshot_v1(
    current_setting('p93.owner_ws')::uuid,'93000000-0000-4000-8000-000000000010'::uuid,date '2026-05-31'
  ) body
)
select private.enjaz_phase93_probe_assert(
  (body->>'version')::integer=1
  and body->>'totalPercentage'='100'
  and body->>'reconciledTo100'='true'
  and exists(select 1 from jsonb_array_elements(body->'stakes') s where s->'holder'->>'id'='93000000-0000-4000-8000-000000000011' and s->>'percentage'='60')
  and exists(select 1 from jsonb_array_elements(body->'stakes') s where s->'holder'->>'id'='93000000-0000-4000-8000-000000000012' and s->>'percentage'='40'),
  'historical as-of snapshot lost the original 60/40 ownership'
) from old_snapshot;

with current_snapshot as (
  select public.get_company_ownership_snapshot_v1(
    current_setting('p93.owner_ws')::uuid,'93000000-0000-4000-8000-000000000010'::uuid,date '2026-09-01'
  ) body
)
select private.enjaz_phase93_probe_assert(
  (body->>'version')::integer=2
  and body->>'totalPercentage'='100'
  and body->>'reconciledTo100'='true'
  and jsonb_array_length(body->'stakes')=2
  and not exists(select 1 from jsonb_array_elements(body->'stakes') s where s->>'percentage'<>'50'),
  'current as-of snapshot did not preserve the 50/50 successor state'
) from current_snapshot;

select private.enjaz_phase93_probe_assert(
  (select count(*) from public.corporate_ownership_stakes where company_id='93000000-0000-4000-8000-000000000010'::uuid)=4
  and (select count(*) from public.corporate_governance_events where company_id='93000000-0000-4000-8000-000000000010'::uuid)=2
  and (select ownership_version from public.corporate_ownership_states where company_id='93000000-0000-4000-8000-000000000010'::uuid)=2,
  'ownership history cardinality/version drifted'
);

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p93.outsider_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p93.outsider_user'),true);
set local role authenticated;

select private.enjaz_phase93_probe_assert(auth.uid()=current_setting('p93.outsider_user')::uuid,'outsider auth.uid mismatch');
select private.enjaz_phase93_probe_assert(
  not exists(select 1 from public.corporate_ownership_states where workspace_id=current_setting('p93.owner_ws')::uuid)
  and not exists(select 1 from public.corporate_ownership_stakes where workspace_id=current_setting('p93.owner_ws')::uuid)
  and not exists(select 1 from public.corporate_governance_events where workspace_id=current_setting('p93.owner_ws')::uuid),
  'cross-workspace RLS leaked governance rows'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_cross_workspace_read_denied(
    current_setting('p93.owner_ws')::uuid,'93000000-0000-4000-8000-000000000010'::uuid
  ),
  'cross-workspace ownership RPC read did not fail closed'
);
select private.enjaz_phase93_probe_assert(
  private.enjaz_phase93_expect_nonowner_write_denied(
    current_setting('p93.owner_ws')::uuid,
    '93000000-0000-4000-8000-000000000010'::uuid,
    current_setting('p93.op_nonowner')::uuid,
    jsonb_build_array(
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000011','role','shareholder','percentage','50'),
      jsonb_build_object('kind','person','id','93000000-0000-4000-8000-000000000012','role','shareholder','percentage','50')
    )
  ),
  'non-owner governance mutation did not fail closed'
);

reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);

select private.enjaz_phase93_probe_assert(
  (select count(*) from public.audit_events where workspace_id=current_setting('p93.owner_ws')::uuid and entity_id='93000000-0000-4000-8000-000000000010'::uuid and action='corporate_ownership.snapshot_replaced')=2,
  'ownership audit evidence count is not exactly two'
);

-- Zero-residue cleanup: evidence is the successful migration execution, not retained probe data.
delete from public.audit_events
where workspace_id=current_setting('p93.owner_ws')::uuid
  and entity_id='93000000-0000-4000-8000-000000000010'::uuid
  and action='corporate_ownership.snapshot_replaced';
delete from public.corporate_governance_events where company_id='93000000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_ownership_stakes where company_id='93000000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_ownership_states where company_id='93000000-0000-4000-8000-000000000010'::uuid;
delete from public.contacts where id in ('93000000-0000-4000-8000-000000000011'::uuid,'93000000-0000-4000-8000-000000000012'::uuid);
delete from public.companies where id='93000000-0000-4000-8000-000000000010'::uuid;
delete from public.workspaces where id=current_setting('p93.outsider_ws')::uuid;
delete from auth.users where id=current_setting('p93.outsider_user')::uuid;

select private.enjaz_phase93_probe_assert(
  not exists(select 1 from auth.users where id='93000000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase93_probe_outsider__@example.invalid')
  and not exists(select 1 from public.companies where id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.contacts where id in ('93000000-0000-4000-8000-000000000011'::uuid,'93000000-0000-4000-8000-000000000012'::uuid,'93000000-0000-4000-8000-000000000013'::uuid))
  and not exists(select 1 from public.corporate_ownership_states where company_id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_ownership_stakes where company_id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_governance_events where company_id='93000000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.audit_events where entity_id='93000000-0000-4000-8000-000000000010'::uuid and action='corporate_ownership.snapshot_replaced'),
  'probe residue remains after cleanup'
);

drop function private.enjaz_phase93_expect_cross_workspace_read_denied(uuid,uuid);
drop function private.enjaz_phase93_expect_nonowner_write_denied(uuid,uuid,uuid,jsonb);
drop function private.enjaz_phase93_expect_cross_holder_denied(uuid,uuid,uuid,jsonb);
drop function private.enjaz_phase93_expect_bad_total(uuid,uuid,uuid,jsonb);
drop function private.enjaz_phase93_expect_operation_reused(uuid,uuid,uuid,jsonb);
drop function private.enjaz_phase93_expect_stale(uuid,uuid,uuid,jsonb);
drop function private.enjaz_phase93_expect_direct_dml_denied(uuid,uuid,uuid);
drop function private.enjaz_phase93_probe_assert(boolean,text);

commit;
