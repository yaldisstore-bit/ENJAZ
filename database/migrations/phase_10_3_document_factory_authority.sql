-- ENJAZ Phase 10.3 — Document Factory & Official Form Engine — M7
-- Authority foundation: immutable template versions + exact draft provenance.
-- Generated binaries remain authoritative only through documents + document_versions.
begin;

create table public.document_template_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null,
  version_number integer not null check (version_number > 0),
  body_source text not null check (char_length(body_source) between 1 and 1000000),
  token_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(token_schema)='object'),
  status text not null default 'draft' check (status in ('draft','published')),
  content_checksum text not null check (content_checksum ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint document_template_versions_workspace_id_id_key unique(workspace_id,id),
  constraint document_template_versions_number_unique unique(workspace_id,template_id,version_number),
  constraint document_template_versions_template_fk foreign key(workspace_id,template_id)
    references public.document_templates(workspace_id,id) on delete restrict,
  constraint document_template_versions_publish_check check (
    (status='draft' and published_at is null)
    or (status='published' and published_at is not null)
  )
);

create index document_template_versions_template_idx
  on public.document_template_versions(workspace_id,template_id,version_number desc);
create index document_template_versions_created_by_idx
  on public.document_template_versions(created_by) where created_by is not null;
create index document_template_versions_published_by_idx
  on public.document_template_versions(published_by) where published_by is not null;

alter table public.document_template_versions enable row level security;
revoke all on table public.document_template_versions from public,anon,authenticated;
grant select on table public.document_template_versions to authenticated;
create policy document_template_versions_select_workspace on public.document_template_versions
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
  );

alter table public.document_drafts add column if not exists template_version_id uuid;
alter table public.document_drafts add column if not exists fact_snapshot jsonb not null default '{}'::jsonb;
alter table public.document_drafts add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.document_drafts add column if not exists generation_request_id uuid;
alter table public.document_drafts add column if not exists content_checksum text;
alter table public.document_drafts add column if not exists fact_snapshot_checksum text;
alter table public.document_drafts add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.document_drafts add column if not exists approved_at timestamptz;
alter table public.document_drafts add column if not exists approval_note text;
alter table public.document_drafts add column if not exists final_document_id uuid;
alter table public.document_drafts add column if not exists final_document_version_id uuid;
alter table public.document_drafts add column if not exists finalized_by uuid references auth.users(id) on delete set null;
alter table public.document_drafts add column if not exists finalized_at timestamptz;

alter table public.document_drafts drop constraint if exists document_drafts_status_check;
alter table public.document_drafts add constraint document_drafts_status_check
  check (status in ('draft','review_required','approved','registered','final','failed'));
alter table public.document_drafts add constraint document_drafts_fact_snapshot_check
  check (jsonb_typeof(fact_snapshot)='object');
alter table public.document_drafts add constraint document_drafts_provenance_check
  check (jsonb_typeof(provenance)='object');
alter table public.document_drafts add constraint document_drafts_content_checksum_check
  check (content_checksum is null or content_checksum ~ '^[0-9a-f]{64}$');
alter table public.document_drafts add constraint document_drafts_fact_snapshot_checksum_check
  check (fact_snapshot_checksum is null or fact_snapshot_checksum ~ '^[0-9a-f]{64}$');
alter table public.document_drafts add constraint document_drafts_approval_note_check
  check (approval_note is null or char_length(approval_note)<=1000);
alter table public.document_drafts add constraint document_drafts_template_version_fk
  foreign key(workspace_id,template_version_id)
  references public.document_template_versions(workspace_id,id) on delete restrict;

create unique index if not exists document_versions_workspace_document_id_id_key
  on public.document_versions(workspace_id,document_id,id);
alter table public.document_drafts add constraint document_drafts_final_document_version_fk
  foreign key(workspace_id,final_document_id,final_document_version_id)
  references public.document_versions(workspace_id,document_id,id) on delete restrict;
alter table public.document_drafts add constraint document_drafts_final_pair_check
  check ((final_document_id is null)=(final_document_version_id is null));
alter table public.document_drafts add constraint document_drafts_review_authority_check
  check (
    status in ('draft','registered','failed')
    or (
      template_version_id is not null
      and char_length(compiled_content)>0
      and content_checksum is not null
      and fact_snapshot_checksum is not null
    )
  );
alter table public.document_drafts add constraint document_drafts_approval_check
  check (
    status not in ('approved','final')
    or approved_at is not null
  );
alter table public.document_drafts add constraint document_drafts_finalization_check
  check (
    status<>'final'
    or (
      template_version_id is not null
      and approved_at is not null
      and finalized_at is not null
      and final_document_id is not null
      and final_document_version_id is not null
      and content_checksum is not null
      and fact_snapshot_checksum is not null
    )
  );

create unique index if not exists document_drafts_generation_request_unique
  on public.document_drafts(workspace_id,generation_request_id)
  where generation_request_id is not null;
create index if not exists document_drafts_template_version_idx
  on public.document_drafts(workspace_id,template_version_id)
  where template_version_id is not null;
create index if not exists document_drafts_approved_by_idx
  on public.document_drafts(approved_by) where approved_by is not null;
create index if not exists document_drafts_finalized_by_idx
  on public.document_drafts(finalized_by) where finalized_by is not null;

-- Direct browser writes remain useful only for an unissued draft working copy.
-- Sensitive lifecycle transitions are deliberately removed from direct RLS writes.
drop policy if exists document_drafts_insert_workspace on public.document_drafts;
drop policy if exists document_drafts_update_workspace on public.document_drafts;
drop policy if exists document_drafts_direct_insert_workspace on public.document_drafts;
drop policy if exists document_drafts_direct_update_workspace on public.document_drafts;
create policy document_drafts_direct_insert_workspace on public.document_drafts
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
    and approved_at is null
    and final_document_id is null
    and final_document_version_id is null
    and finalized_at is null
  );
create policy document_drafts_direct_update_workspace on public.document_drafts
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
  )
  with check (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
    and approved_at is null
    and final_document_id is null
    and final_document_version_id is null
    and finalized_at is null
  );

create or replace function private.require_document_factory_member_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then
    raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;$$;
revoke all on function private.require_document_factory_member_v1(uuid) from public,anon,authenticated;

create or replace function private.require_document_factory_owner_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_role text;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_AUTH_REQUIRED'; end if;
  select wm.role into v_role from public.workspace_memberships wm
  where wm.workspace_id=p_workspace_id and wm.user_id=v_actor;
  if v_role is null then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN'; end if;
  if v_role<>'owner' then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_OWNER_REQUIRED'; end if;
  return v_actor;
end;$$;
revoke all on function private.require_document_factory_owner_v1(uuid) from public,anon,authenticated;

create or replace function private.document_template_version_checksum_v1(p_body_source text,p_token_schema jsonb)
returns text language sql immutable set search_path='' as $$
  select encode(extensions.digest(convert_to(coalesce(p_body_source,'')||E'\n'||coalesce(p_token_schema,'{}'::jsonb)::text,'UTF8'),'sha256'),'hex')
$$;
revoke all on function private.document_template_version_checksum_v1(text,jsonb) from public,anon,authenticated;

create or replace function private.document_template_versions_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and old.status='published' then
    raise check_violation using message='ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE';
  end if;
  if tg_op='UPDATE' and old.status='published' then
    raise check_violation using message='ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE';
  end if;
  if tg_op='UPDATE' and old.status='draft' then
    if new.workspace_id<>old.workspace_id or new.template_id<>old.template_id or new.version_number<>old.version_number
       or new.body_source<>old.body_source or new.token_schema<>old.token_schema or new.content_checksum<>old.content_checksum
       or new.created_by is distinct from old.created_by or new.created_at<>old.created_at then
      raise check_violation using message='ENJAZ_TEMPLATE_VERSION_CONTENT_IMMUTABLE';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;$$;
revoke all on function private.document_template_versions_immutable_v1() from public,anon,authenticated;
drop trigger if exists document_template_versions_immutable_v1 on public.document_template_versions;
create trigger document_template_versions_immutable_v1
before update or delete on public.document_template_versions
for each row execute function private.document_template_versions_immutable_v1();

create or replace function private.document_drafts_final_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='final' then
    raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE';
  end if;
  if tg_op='UPDATE' and old.status<>new.status then
    if not (
      (old.status='draft' and new.status in ('review_required','failed'))
      or (old.status='review_required' and new.status in ('draft','approved','failed'))
      or (old.status='approved' and new.status in ('draft','final','failed'))
      or (old.status='registered' and new.status in ('draft','review_required','failed'))
      or (old.status='failed' and new.status='draft')
    ) then
      raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_TRANSITION_INVALID';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;$$;
revoke all on function private.document_drafts_final_immutable_v1() from public,anon,authenticated;
drop trigger if exists document_drafts_final_immutable_v1 on public.document_drafts;
create trigger document_drafts_final_immutable_v1
before update or delete on public.document_drafts
for each row execute function private.document_drafts_final_immutable_v1();

create or replace function public.create_document_template_version_v1(
  p_workspace_id uuid,p_request_id uuid,p_template_id uuid,p_body_source text,p_token_schema jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v_template public.document_templates%rowtype;v_existing public.document_template_versions%rowtype;v_version integer;v_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  if p_request_id is null or p_template_id is null then raise invalid_parameter_value using message='ENJAZ_TEMPLATE_VERSION_REQUEST_INVALID'; end if;
  if p_body_source is null or char_length(p_body_source) not between 1 and 1000000 then raise invalid_parameter_value using message='ENJAZ_TEMPLATE_VERSION_BODY_INVALID'; end if;
  if p_token_schema is null or jsonb_typeof(p_token_schema)<>'object' then raise invalid_parameter_value using message='ENJAZ_TEMPLATE_VERSION_SCHEMA_INVALID'; end if;
  v_checksum:=private.document_template_version_checksum_v1(p_body_source,p_token_schema);
  select * into v_existing from public.document_template_versions v where v.id=p_request_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.template_id<>p_template_id or v_existing.content_checksum<>v_checksum then
      raise serialization_failure using message='ENJAZ_TEMPLATE_VERSION_REQUEST_DRIFT';
    end if;
    return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v_existing.id,'templateId',v_existing.template_id,'versionNumber',v_existing.version_number,'state',v_existing.status,'contentChecksum',v_existing.content_checksum,'wasDuplicate',true);
  end if;
  select * into v_template from public.document_templates t where t.workspace_id=p_workspace_id and t.id=p_template_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_TEMPLATE_NOT_FOUND'; end if;
  select coalesce(max(v.version_number),0)+1 into v_version from public.document_template_versions v where v.workspace_id=p_workspace_id and v.template_id=p_template_id;
  insert into public.document_template_versions(id,workspace_id,template_id,version_number,body_source,token_schema,status,content_checksum,created_by)
  values(p_request_id,p_workspace_id,p_template_id,v_version,p_body_source,p_token_schema,'draft',v_checksum,v_actor)
  returning * into v_existing;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.template.version.created','document_template',p_template_id,'Document template version created',jsonb_build_object('templateVersionId',p_request_id,'versionNumber',v_version,'contentChecksum',v_checksum));
  return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v_existing.id,'templateId',v_existing.template_id,'versionNumber',v_existing.version_number,'state',v_existing.status,'contentChecksum',v_existing.content_checksum,'wasDuplicate',false);
end;$$;

create or replace function public.publish_document_template_version_v1(p_workspace_id uuid,p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_template_versions%rowtype;v_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  select * into v from public.document_template_versions x where x.workspace_id=p_workspace_id and x.id=p_version_id for update;
  if not found then raise no_data_found using message='ENJAZ_TEMPLATE_VERSION_NOT_FOUND'; end if;
  if v.status='published' then
    return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v.id,'templateId',v.template_id,'versionNumber',v.version_number,'state','published','contentChecksum',v.content_checksum,'wasDuplicate',true);
  end if;
  v_checksum:=private.document_template_version_checksum_v1(v.body_source,v.token_schema);
  if v_checksum<>v.content_checksum then raise data_exception using message='ENJAZ_TEMPLATE_VERSION_CHECKSUM_DRIFT'; end if;
  update public.document_template_versions set status='published',published_by=v_actor,published_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.template.version.published','document_template',v.template_id,'Document template version published',jsonb_build_object('templateVersionId',v.id,'versionNumber',v.version_number,'contentChecksum',v.content_checksum));
  return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v.id,'templateId',v.template_id,'versionNumber',v.version_number,'state','published','contentChecksum',v.content_checksum,'wasDuplicate',false);
end;$$;

revoke all on function public.create_document_template_version_v1(uuid,uuid,uuid,text,jsonb) from public,anon;
revoke all on function public.publish_document_template_version_v1(uuid,uuid) from public,anon;
grant execute on function public.create_document_template_version_v1(uuid,uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.publish_document_template_version_v1(uuid,uuid) to authenticated;

commit;
