-- ENJAZ Phase 10.3 — authenticated Real Cloud Document Factory authority probe
-- Evidence-only migration: exercises the real JWT/RLS/RPC boundary and removes all fixtures.
begin;

create or replace function private.enjaz_phase103_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE103_PROBE_FAILED: %',p_message;
  end if;
end;$$;

create or replace function private.enjaz_phase103_expect_drift(p_workspace_id uuid,p_request_id uuid,p_template_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.create_document_template_version_v1(
    p_workspace_id,p_request_id,p_template_id,'DIFFERENT BODY',jsonb_build_object('name','text')
  );
  return false;
exception when serialization_failure then
  return sqlerrm='ENJAZ_TEMPLATE_VERSION_REQUEST_DRIFT';
end;$$;

create or replace function private.enjaz_phase103_expect_cross_workspace_create_denied(p_workspace_id uuid,p_request_id uuid,p_template_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform public.create_document_template_version_v1(
    p_workspace_id,p_request_id,p_template_id,'OUTSIDER BODY',jsonb_build_object('name','text')
  );
  return false;
exception when insufficient_privilege then
  return sqlerrm='ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN';
end;$$;

create or replace function private.enjaz_phase103_expect_smuggled_insert_denied(p_workspace_id uuid,p_template_id uuid,p_draft_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.document_drafts(id,workspace_id,template_id,title,status,approved_by,approved_at)
  values(p_draft_id,p_workspace_id,p_template_id,'Phase 10.3 smuggled insert','draft',auth.uid(),now());
  return false;
exception when check_violation or insufficient_privilege then
  return true;
end;$$;

create or replace function private.enjaz_phase103_expect_smuggled_update_denied(p_draft_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.document_drafts set approved_by=auth.uid(),approved_at=now() where id=p_draft_id;
  return false;
exception when check_violation or insufficient_privilege then
  return true;
end;$$;

create or replace function private.enjaz_phase103_expect_published_immutable(p_version_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.document_template_versions set body_source='MUTATED' where id=p_version_id;
  return false;
exception when check_violation then
  return sqlerrm='ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE';
end;$$;

create or replace function private.enjaz_phase103_expect_invalid_transition(p_draft_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.document_drafts set status='final' where id=p_draft_id;
  return false;
exception when check_violation then
  return true;
end;$$;

revoke all on function private.enjaz_phase103_probe_assert(boolean,text) from public,anon;
revoke all on function private.enjaz_phase103_expect_drift(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase103_expect_cross_workspace_create_denied(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase103_expect_smuggled_insert_denied(uuid,uuid,uuid) from public,anon;
revoke all on function private.enjaz_phase103_expect_smuggled_update_denied(uuid) from public,anon;
grant execute on function private.enjaz_phase103_probe_assert(boolean,text) to authenticated;
grant execute on function private.enjaz_phase103_expect_drift(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase103_expect_cross_workspace_create_denied(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase103_expect_smuggled_insert_denied(uuid,uuid,uuid) to authenticated;
grant execute on function private.enjaz_phase103_expect_smuggled_update_denied(uuid) to authenticated;

select private.enjaz_phase103_probe_assert(
  not exists(select 1 from auth.users where id in (
    '10300000-0000-4000-8000-000000000001'::uuid,
    '10300000-0000-4000-8000-000000000002'::uuid
  ) or email in ('__enjaz_phase103_owner__@example.invalid','__enjaz_phase103_outsider__@example.invalid'))
  and not exists(select 1 from public.document_templates where id='10300000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.document_template_versions where id in (
    '10300000-0000-4000-8000-000000000020'::uuid,
    '10300000-0000-4000-8000-000000000021'::uuid
  ))
  and not exists(select 1 from public.document_drafts where id in (
    '10300000-0000-4000-8000-000000000030'::uuid,
    '10300000-0000-4000-8000-000000000031'::uuid
  )),
  'probe residue exists before execution'
);

insert into auth.users(
  id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '10300000-0000-4000-8000-000000000001'::uuid,
  'authenticated','authenticated','__enjaz_phase103_owner__@example.invalid',now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  jsonb_build_object('display_name','Phase 10.3 Probe Owner'),now(),now()
),
(
  '10300000-0000-4000-8000-000000000002'::uuid,
  'authenticated','authenticated','__enjaz_phase103_outsider__@example.invalid',now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  jsonb_build_object('display_name','Phase 10.3 Probe Outsider'),now(),now()
);

select set_config('p103.owner_user','10300000-0000-4000-8000-000000000001',true);
select set_config('p103.outsider_user','10300000-0000-4000-8000-000000000002',true);
select set_config('p103.owner_ws',(
  select workspace_id::text from public.workspace_memberships
  where user_id=current_setting('p103.owner_user')::uuid and role='owner'
  order by created_at limit 1
),true);
select set_config('p103.outsider_ws',(
  select workspace_id::text from public.workspace_memberships
  where user_id=current_setting('p103.outsider_user')::uuid and role='owner'
  order by created_at limit 1
),true);

select private.enjaz_phase103_probe_assert(nullif(current_setting('p103.owner_ws',true),'') is not null,'owner bootstrap workspace missing');
select private.enjaz_phase103_probe_assert(nullif(current_setting('p103.outsider_ws',true),'') is not null,'outsider bootstrap workspace missing');
select private.enjaz_phase103_probe_assert(
  current_setting('p103.owner_ws')::uuid<>current_setting('p103.outsider_ws')::uuid,
  'temporary users did not receive isolated workspaces'
);

insert into public.document_templates(id,workspace_id,name,kind,body_source,token_schema,active)
values(
  '10300000-0000-4000-8000-000000000010'::uuid,
  current_setting('p103.owner_ws')::uuid,
  '__ENJAZ_PHASE103_TEMPLATE__','official-letter','السيد {{name}}',
  jsonb_build_object('name','text'),true
);

select private.enjaz_phase103_probe_assert(
  (select count(*)=0 from public.documents where workspace_id=current_setting('p103.owner_ws')::uuid)
  and (select count(*)=0 from public.document_versions where workspace_id=current_setting('p103.owner_ws')::uuid),
  'temporary owner workspace source-document authority is not clean before probe'
);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103.owner_user'),true);
set local role authenticated;

select private.enjaz_phase103_probe_assert(auth.uid()=current_setting('p103.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase103_probe_assert(
  has_table_privilege('public.document_template_versions','SELECT')
  and not has_table_privilege('public.document_template_versions','INSERT')
  and not has_table_privilege('public.document_template_versions','UPDATE')
  and not has_table_privilege('public.document_template_versions','DELETE'),
  'authenticated template-version table privilege boundary drifted'
);

with x as (
  select public.create_document_template_version_v1(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000020'::uuid,
    '10300000-0000-4000-8000-000000000010'::uuid,
    'السيد {{name}}',jsonb_build_object('name','text')
  ) body
)
select private.enjaz_phase103_probe_assert(
  body->>'state'='draft' and body->>'wasDuplicate'='false' and (body->>'versionNumber')::integer=1,
  'owner template-version creation failed'
) from x;

with x as (
  select public.create_document_template_version_v1(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000020'::uuid,
    '10300000-0000-4000-8000-000000000010'::uuid,
    'السيد {{name}}',jsonb_build_object('name','text')
  ) body
)
select private.enjaz_phase103_probe_assert(body->>'wasDuplicate'='true','idempotent version replay failed') from x;

select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_drift(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000020'::uuid,
    '10300000-0000-4000-8000-000000000010'::uuid
  ),
  'request-id payload drift did not fail closed'
);

with x as (
  select public.publish_document_template_version_v1(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000020'::uuid
  ) body
)
select private.enjaz_phase103_probe_assert(
  body->>'state'='published' and body->>'wasDuplicate'='false',
  'owner publish failed'
) from x;

with x as (
  select public.publish_document_template_version_v1(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000020'::uuid
  ) body
)
select private.enjaz_phase103_probe_assert(body->>'wasDuplicate'='true','publish replay failed') from x;

select private.enjaz_phase103_probe_assert(
  (select content_checksum=encode(extensions.digest(convert_to(body_source||E'\n'||token_schema::text,'UTF8'),'sha256'),'hex')
   from public.document_template_versions where id='10300000-0000-4000-8000-000000000020'::uuid),
  'template-version checksum mismatch'
);

insert into public.document_drafts(id,workspace_id,template_id,title,status)
values(
  '10300000-0000-4000-8000-000000000030'::uuid,
  current_setting('p103.owner_ws')::uuid,
  '10300000-0000-4000-8000-000000000010'::uuid,
  'Phase 10.3 clean draft','draft'
);

select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_smuggled_insert_denied(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000010'::uuid,
    '10300000-0000-4000-8000-000000000031'::uuid
  ),
  'browser smuggled approval insert was accepted'
);
select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_smuggled_update_denied('10300000-0000-4000-8000-000000000030'::uuid),
  'browser smuggled approval update was accepted'
);
select private.enjaz_phase103_probe_assert(
  (select count(*)=1 from public.document_template_versions where workspace_id=current_setting('p103.owner_ws')::uuid),
  'owner RLS cannot read its template version'
);

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103.outsider_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103.outsider_user'),true);
set local role authenticated;

select private.enjaz_phase103_probe_assert(auth.uid()=current_setting('p103.outsider_user')::uuid,'outsider auth.uid mismatch');
select private.enjaz_phase103_probe_assert(
  not exists(select 1 from public.document_template_versions where workspace_id=current_setting('p103.owner_ws')::uuid),
  'cross-workspace template version leaked through RLS'
);
select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_cross_workspace_create_denied(
    current_setting('p103.owner_ws')::uuid,
    '10300000-0000-4000-8000-000000000021'::uuid,
    '10300000-0000-4000-8000-000000000010'::uuid
  ),
  'cross-workspace owner created target template version'
);

reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);

select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_published_immutable('10300000-0000-4000-8000-000000000020'::uuid),
  'published template version was mutable'
);
select private.enjaz_phase103_probe_assert(
  private.enjaz_phase103_expect_invalid_transition('10300000-0000-4000-8000-000000000030'::uuid),
  'invalid draft-to-final transition was accepted'
);
select private.enjaz_phase103_probe_assert(
  (select count(*)=2 from public.audit_events
   where workspace_id=current_setting('p103.owner_ws')::uuid
     and entity_id='10300000-0000-4000-8000-000000000010'::uuid
     and action in ('document.template.version.created','document.template.version.published')),
  'template-version audit evidence count is not exactly two'
);
select private.enjaz_phase103_probe_assert(
  (select count(*)=0 from public.documents where workspace_id=current_setting('p103.owner_ws')::uuid)
  and (select count(*)=0 from public.document_versions where workspace_id=current_setting('p103.owner_ws')::uuid),
  'template-version operations mutated source document authority'
);

-- Zero-residue cleanup. Temporarily disable only the immutable DELETE trigger so the
-- published probe version can be removed; this DDL and cleanup are in the same migration transaction.
delete from public.document_drafts where id='10300000-0000-4000-8000-000000000030'::uuid;
delete from public.audit_events
where workspace_id=current_setting('p103.owner_ws')::uuid
  and entity_id='10300000-0000-4000-8000-000000000010'::uuid
  and action in ('document.template.version.created','document.template.version.published');
alter table public.document_template_versions disable trigger document_template_versions_immutable_v1;
delete from public.document_template_versions where id='10300000-0000-4000-8000-000000000020'::uuid;
alter table public.document_template_versions enable trigger document_template_versions_immutable_v1;
delete from public.document_templates where id='10300000-0000-4000-8000-000000000010'::uuid;
delete from public.workspaces where id in (current_setting('p103.owner_ws')::uuid,current_setting('p103.outsider_ws')::uuid);
delete from auth.users where id in (current_setting('p103.owner_user')::uuid,current_setting('p103.outsider_user')::uuid);

select private.enjaz_phase103_probe_assert(
  not exists(select 1 from auth.users where id in (
    '10300000-0000-4000-8000-000000000001'::uuid,
    '10300000-0000-4000-8000-000000000002'::uuid
  ) or email in ('__enjaz_phase103_owner__@example.invalid','__enjaz_phase103_outsider__@example.invalid'))
  and not exists(select 1 from public.document_templates where id='10300000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.document_template_versions where id in (
    '10300000-0000-4000-8000-000000000020'::uuid,
    '10300000-0000-4000-8000-000000000021'::uuid
  ))
  and not exists(select 1 from public.document_drafts where id in (
    '10300000-0000-4000-8000-000000000030'::uuid,
    '10300000-0000-4000-8000-000000000031'::uuid
  ))
  and not exists(select 1 from public.audit_events where entity_id='10300000-0000-4000-8000-000000000010'::uuid),
  'probe residue remains after cleanup'
);

-- Ensure the immutable trigger was restored before the migration can certify PASS.
select private.enjaz_phase103_probe_assert(
  exists(
    select 1 from pg_trigger g
    join pg_class t on t.oid=g.tgrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='document_template_versions'
      and g.tgname='document_template_versions_immutable_v1' and g.tgenabled<>'D'
  ),
  'published-version immutable trigger was not restored'
);

drop function private.enjaz_phase103_expect_invalid_transition(uuid);
drop function private.enjaz_phase103_expect_published_immutable(uuid);
drop function private.enjaz_phase103_expect_smuggled_update_denied(uuid);
drop function private.enjaz_phase103_expect_smuggled_insert_denied(uuid,uuid,uuid);
drop function private.enjaz_phase103_expect_cross_workspace_create_denied(uuid,uuid,uuid);
drop function private.enjaz_phase103_expect_drift(uuid,uuid,uuid);
drop function private.enjaz_phase103_probe_assert(boolean,text);

commit;
