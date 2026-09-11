-- ENJAZ Phase 9.3 / M2 — authenticated Real Cloud full-governance destruction probe
-- Evidence-only migration. Exercises production JWT/RLS/RPC boundaries and leaves zero probe residue.

begin;

create or replace function private.enjaz_phase93_m2_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE93_M2_PROBE_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function private.enjaz_phase93_m2_expect_direct_capital_denied(p_workspace_id uuid,p_company_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.companies set capital=999 where workspace_id=p_workspace_id and id=p_company_id;
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND';
end;
$$;

create or replace function private.enjaz_phase93_m2_expect_nonowner_write_denied(p_workspace_id uuid,p_company_id uuid,p_contact_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_beneficial_owners_v1(
    p_workspace_id,p_company_id,1,gen_random_uuid(),date '2026-04-01',
    jsonb_build_array(jsonb_build_object('contactId',p_contact_id,'basis','ownership','percentage','100'))
  );
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_OWNER_REQUIRED';
end;
$$;

create or replace function private.enjaz_phase93_m2_expect_anon_read_denied(p_workspace_id uuid,p_company_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.get_company_governance_context_v1(p_workspace_id,p_company_id,date '2026-02-01');
  return false;
exception when insufficient_privilege then return sqlerrm='ENJAZ_ORG_AUTH_REQUIRED';
end;
$$;

create or replace function private.enjaz_phase93_m2_expect_cross_workspace_beneficial_denied(p_workspace_id uuid,p_company_id uuid,p_contact_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.replace_company_beneficial_owners_v1(
    p_workspace_id,p_company_id,1,gen_random_uuid(),date '2026-04-01',
    jsonb_build_array(jsonb_build_object('contactId',p_contact_id,'basis','ownership','percentage','100'))
  );
  return false;
exception when no_data_found then return sqlerrm='ENJAZ_BENEFICIAL_OWNER_CONTACT_NOT_FOUND';
end;
$$;

create or replace function private.enjaz_phase93_m2_expect_stale_resolution(p_workspace_id uuid,p_company_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.record_company_resolution_v1(
    p_workspace_id,p_company_id,0,gen_random_uuid(),'M2-STALE','Stale resolution','general',date '2026-03-01',null
  );
  return false;
exception when serialization_failure then return sqlerrm='ENJAZ_RESOLUTION_STALE';
end;
$$;

revoke all on function private.enjaz_phase93_m2_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase93_m2_expect_direct_capital_denied(uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase93_m2_expect_nonowner_write_denied(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase93_m2_expect_anon_read_denied(uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase93_m2_expect_cross_workspace_beneficial_denied(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase93_m2_expect_stale_resolution(uuid,uuid) from public,anon;
grant execute on function private.enjaz_phase93_m2_probe_assert(boolean,text) to authenticated,anon;
grant execute on function private.enjaz_phase93_m2_expect_direct_capital_denied(uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase93_m2_expect_nonowner_write_denied(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase93_m2_expect_anon_read_denied(uuid,uuid) to anon;
grant execute on function private.enjaz_phase93_m2_expect_cross_workspace_beneficial_denied(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase93_m2_expect_stale_resolution(uuid,uuid) to authenticated;

select set_config('p93m2.owner_user',(
  select w.owner_user_id::text from public.workspaces w
  join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
  where w.owner_user_id is not null order by w.created_at,w.id limit 1
),true);
select private.enjaz_phase93_m2_probe_assert(nullif(current_setting('p93m2.owner_user',true),'') is not null,'no real workspace owner exists');
select set_config('p93m2.owner_ws',(
  select w.id::text from public.workspaces w where w.owner_user_id=current_setting('p93m2.owner_user')::uuid order by w.created_at,w.id limit 1
),true);

select private.enjaz_phase93_m2_probe_assert(
  not exists(select 1 from auth.users where id='93f00000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase93_m2_probe__@example.invalid')
  and not exists(select 1 from public.companies where id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.contacts where id in ('93f00000-0000-4000-8000-000000000011'::uuid,'93f00000-0000-4000-8000-000000000012'::uuid,'93f00000-0000-4000-8000-000000000013'::uuid)),
  'probe residue exists before execution'
);

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('93f00000-0000-4000-8000-000000000001'::uuid,'authenticated','authenticated','__enjaz_phase93_m2_probe__@example.invalid',now(),jsonb_build_object('provider','email','providers',jsonb_build_array('email')),jsonb_build_object('display_name','Phase 9.3 M2 Probe Member'),now(),now());
select set_config('p93m2.member_user','93f00000-0000-4000-8000-000000000001',true);
select set_config('p93m2.member_ws',(
  select w.id::text from public.workspaces w where w.owner_user_id=current_setting('p93m2.member_user')::uuid order by w.created_at limit 1
),true);
select private.enjaz_phase93_m2_probe_assert(nullif(current_setting('p93m2.member_ws',true),'') is not null,'probe auth bootstrap did not create isolated workspace');

insert into public.organization_members(workspace_id,user_id,status,created_by)
values(current_setting('p93m2.owner_ws')::uuid,current_setting('p93m2.member_user')::uuid,'active',current_setting('p93m2.owner_user')::uuid);

insert into public.companies(id,workspace_id,legal_name,display_name,status)
values('93f00000-0000-4000-8000-000000000010'::uuid,current_setting('p93m2.owner_ws')::uuid,'__ENJAZ_PHASE93_M2_COMPANY__','Phase 9.3 M2 Company','active');
insert into public.contacts(id,workspace_id,display_name,contact_type,status) values
('93f00000-0000-4000-8000-000000000011'::uuid,current_setting('p93m2.owner_ws')::uuid,'M2 Beneficial Owner','client','active'),
('93f00000-0000-4000-8000-000000000012'::uuid,current_setting('p93m2.owner_ws')::uuid,'M2 Authorized Manager','client','active'),
('93f00000-0000-4000-8000-000000000013'::uuid,current_setting('p93m2.member_ws')::uuid,'M2 Foreign Person','client','active');

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p93m2.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p93m2.owner_user'),true);
set local role authenticated;

select private.enjaz_phase93_m2_probe_assert(auth.uid()=current_setting('p93m2.owner_user')::uuid,'owner JWT simulation failed');
select private.enjaz_phase93_m2_probe_assert(
  has_table_privilege('public.corporate_registry_states','SELECT') and not has_table_privilege('public.corporate_registry_states','INSERT')
  and has_table_privilege('public.corporate_beneficial_owners','SELECT') and not has_table_privilege('public.corporate_beneficial_owners','INSERT')
  and has_table_privilege('public.corporate_authority_grants','SELECT') and not has_table_privilege('public.corporate_authority_grants','UPDATE')
  and has_table_privilege('public.corporate_resolutions','SELECT') and not has_table_privilege('public.corporate_resolutions','DELETE')
  and has_table_privilege('public.corporate_capital_events','SELECT') and not has_table_privilege('public.corporate_capital_events','INSERT'),
  'browser governance tables are not SELECT-only'
);

with x as (select public.replace_company_ownership_snapshot_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,gen_random_uuid(),date '2026-01-01',
  jsonb_build_array(jsonb_build_object('kind','person','id','93f00000-0000-4000-8000-000000000011','role','shareholder','percentage','100'))
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=1,'ownership foundation failed') from x;

select set_config('p93m2.bo_op',gen_random_uuid()::text,true);
with x as (select public.replace_company_beneficial_owners_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,current_setting('p93m2.bo_op')::uuid,date '2026-01-01',
  jsonb_build_array(jsonb_build_object('contactId','93f00000-0000-4000-8000-000000000011','basis','ownership','percentage','100'))
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=1 and body->>'replayed'='false','beneficial-owner snapshot failed') from x;
with x as (select public.replace_company_beneficial_owners_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,current_setting('p93m2.bo_op')::uuid,date '2026-01-01',
  jsonb_build_array(jsonb_build_object('contactId','93f00000-0000-4000-8000-000000000011','basis','ownership','percentage','100'))
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=1 and body->>'replayed'='true','beneficial-owner replay is not idempotent') from x;

select set_config('p93m2.auth_op',gen_random_uuid()::text,true);
with x as (select public.grant_company_authority_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,current_setting('p93m2.auth_op')::uuid,
  '93f00000-0000-4000-8000-000000000012'::uuid,'manager','full',jsonb_build_array('sign','represent'),date '2026-01-15',date '2026-12-31'
) body) select set_config('p93m2.grant_id',body->>'grantId',true) from x;
select private.enjaz_phase93_m2_probe_assert(nullif(current_setting('p93m2.grant_id',true),'') is not null,'authority grant failed');

with x as (select public.record_company_resolution_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,gen_random_uuid(),'M2-001','تعيين المدير المفوض','appointment',date '2026-01-15','Real Cloud M2 probe'
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=1,'resolution append failed') from x;

with x as (select public.record_company_capital_event_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,0,gen_random_uuid(),'set','1000000',date '2026-01-20','Initial governed capital'
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=1 and body->>'capital'='1000000','governed capital set failed') from x;

select private.enjaz_phase93_m2_probe_assert(private.enjaz_phase93_m2_expect_direct_capital_denied(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid),'direct company capital bypass was not blocked');
select private.enjaz_phase93_m2_probe_assert(private.enjaz_phase93_m2_expect_stale_resolution(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid),'stale resolution version did not fail closed');
select private.enjaz_phase93_m2_probe_assert(private.enjaz_phase93_m2_expect_cross_workspace_beneficial_denied(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,'93f00000-0000-4000-8000-000000000013'::uuid),'cross-workspace beneficial owner was accepted');

with x as (select public.get_company_governance_context_v1(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,date '2026-02-01') body)
select private.enjaz_phase93_m2_probe_assert(
  body->>'schema'='enjaz.governance-context.v1' and body->>'canMutate'='true'
  and (body#>>'{versions,ownership}')::int=1 and (body#>>'{versions,beneficialOwners}')::int=1 and (body#>>'{versions,authority}')::int=1
  and (body#>>'{versions,resolutions}')::int=1 and (body#>>'{versions,capital}')::int=1
  and jsonb_array_length(body->'beneficialOwners')=1 and jsonb_array_length(body->'authorities')=1 and jsonb_array_length(body->'resolutions')=1
  and body#>>'{capital,amount}'='1000000' and jsonb_array_length(body->'timeline')>=5,
  'unified owner governance context is incomplete'
) from x;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p93m2.member_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p93m2.member_user'),true);
with x as (select public.get_company_governance_context_v1(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,date '2026-02-01') body)
select private.enjaz_phase93_m2_probe_assert(body->>'canMutate'='false' and jsonb_array_length(body->'authorities')=1,'authorized non-owner read failed or mutation flag escaped') from x;
select private.enjaz_phase93_m2_probe_assert(private.enjaz_phase93_m2_expect_nonowner_write_denied(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,'93f00000-0000-4000-8000-000000000011'::uuid),'non-owner governance mutation was accepted');

reset role;
set local role anon;
select set_config('request.jwt.claims',jsonb_build_object('role','anon')::text,true);
select set_config('request.jwt.claim.sub','',true);
select private.enjaz_phase93_m2_probe_assert(private.enjaz_phase93_m2_expect_anon_read_denied(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid),'anonymous governance read was accepted');

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p93m2.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p93m2.owner_user'),true);
set local role authenticated;

with x as (select public.replace_company_beneficial_owners_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,1,gen_random_uuid(),date '2026-07-01','[]'::jsonb
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=2,'explicit empty beneficial-owner snapshot failed') from x;

with x as (select public.revoke_company_authority_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,1,gen_random_uuid(),current_setting('p93m2.grant_id')::uuid,date '2026-08-01','Governed revocation probe'
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=2,'authority revocation failed') from x;

with x as (select public.record_company_capital_event_v1(
  current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,1,gen_random_uuid(),'increase','2000000',date '2026-08-05','Governed capital increase'
) body) select private.enjaz_phase93_m2_probe_assert((body->>'version')::int=2 and body->>'capital'='2000000','capital increase failed') from x;

with old_ctx as (select public.get_company_governance_context_v1(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,date '2026-02-01') body),
new_ctx as (select public.get_company_governance_context_v1(current_setting('p93m2.owner_ws')::uuid,'93f00000-0000-4000-8000-000000000010'::uuid,date '2026-09-01') body)
select private.enjaz_phase93_m2_probe_assert(
  jsonb_array_length(old_ctx.body->'beneficialOwners')=1 and jsonb_array_length(old_ctx.body->'authorities')=1 and old_ctx.body#>>'{capital,amount}'='1000000'
  and jsonb_array_length(new_ctx.body->'beneficialOwners')=0 and jsonb_array_length(new_ctx.body->'authorities')=0 and new_ctx.body#>>'{capital,amount}'='2000000'
  and exists(select 1 from jsonb_array_elements(new_ctx.body->'risks') r where r->>'code'='BENEFICIAL_OWNER_MISSING')
  and exists(select 1 from jsonb_array_elements(new_ctx.body->'risks') r where r->>'code'='REPRESENTATION_AUTHORITY_MISSING'),
  'effective-dated history or derived governance risks are incorrect'
) from old_ctx,new_ctx;

reset role;

-- Zero-residue cleanup. Child/history facts first; no production identity is touched.
delete from public.audit_events where entity_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_capital_events where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_resolutions where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_authority_grants where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_beneficial_owners where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_ownership_stakes where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_governance_events where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_registry_states where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.corporate_ownership_states where company_id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.organization_members where workspace_id=current_setting('p93m2.owner_ws')::uuid and user_id=current_setting('p93m2.member_user')::uuid;
delete from public.companies where id='93f00000-0000-4000-8000-000000000010'::uuid;
delete from public.contacts where id in ('93f00000-0000-4000-8000-000000000011'::uuid,'93f00000-0000-4000-8000-000000000012'::uuid);
delete from auth.users where id=current_setting('p93m2.member_user')::uuid;

select private.enjaz_phase93_m2_probe_assert(
  not exists(select 1 from auth.users where id='93f00000-0000-4000-8000-000000000001'::uuid or email='__enjaz_phase93_m2_probe__@example.invalid')
  and not exists(select 1 from public.companies where id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.contacts where id in ('93f00000-0000-4000-8000-000000000011'::uuid,'93f00000-0000-4000-8000-000000000012'::uuid,'93f00000-0000-4000-8000-000000000013'::uuid))
  and not exists(select 1 from public.corporate_ownership_stakes where company_id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_beneficial_owners where company_id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_authority_grants where company_id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_resolutions where company_id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_capital_events where company_id='93f00000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.corporate_governance_events where company_id='93f00000-0000-4000-8000-000000000010'::uuid),
  'full M2 probe did not leave zero residue'
);

drop function private.enjaz_phase93_m2_expect_stale_resolution(uuid,uuid);
drop function private.enjaz_phase93_m2_expect_cross_workspace_beneficial_denied(uuid,uuid,uuid);
drop function private.enjaz_phase93_m2_expect_anon_read_denied(uuid,uuid);
drop function private.enjaz_phase93_m2_expect_nonowner_write_denied(uuid,uuid,uuid);
drop function private.enjaz_phase93_m2_expect_direct_capital_denied(uuid,uuid);
drop function private.enjaz_phase93_m2_probe_assert(boolean,text);

commit;
