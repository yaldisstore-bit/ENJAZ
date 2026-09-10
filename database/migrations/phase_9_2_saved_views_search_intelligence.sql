-- ENJAZ Phase 9.2 — Smart Saved Views persistence foundation
-- Definitions only: never persists result/entity rows and never grants source-business writes.
-- Reuses Phase 8.5 organization authority for team/workspace sharing.

begin;

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  domain text not null check (domain in ('transactions','companies','people','procedures','documents')),
  visibility text not null default 'personal' check (visibility in ('personal','team','workspace')),
  team_id uuid,
  definition jsonb not null,
  version integer not null default 1 check (version > 0),
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint saved_views_workspace_id_id_key unique(workspace_id,id),
  constraint saved_views_team_fk foreign key(workspace_id,team_id)
    references public.organization_teams(workspace_id,id) on delete restrict,
  constraint saved_views_visibility_target_check check (
    (visibility='team' and team_id is not null)
    or (visibility in ('personal','workspace') and team_id is null)
  ),
  constraint saved_views_definition_object_check check (jsonb_typeof(definition)='object'),
  constraint saved_views_definition_schema_check check (definition->>'schema'='enjaz.saved-view.v1'),
  constraint saved_views_definition_domain_check check (definition->>'domain'=domain),
  constraint saved_views_definition_size_check check (octet_length(definition::text)<=16384)
);

create unique index saved_views_owner_name_active_unique
  on public.saved_views(workspace_id,owner_user_id,lower(btrim(name)))
  where deleted_at is null;
create unique index saved_views_operation_unique
  on public.saved_views(workspace_id,owner_user_id,operation_id);
create index saved_views_visible_lookup_idx
  on public.saved_views(workspace_id,visibility,team_id,domain,updated_at desc)
  where deleted_at is null;
create index saved_views_owner_lookup_idx
  on public.saved_views(workspace_id,owner_user_id,updated_at desc)
  where deleted_at is null;
create index saved_views_team_fk_idx on public.saved_views(workspace_id,team_id) where team_id is not null;

create trigger saved_views_set_updated_at
before update on public.saved_views
for each row execute function private.set_updated_at();

create or replace function private.is_saved_view_iso_date_v1(p_value text)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_date date; v_ts timestamptz;
begin
  if p_value is null then return true; end if;
  if p_value ~ '^\d{4}-\d{2}-\d{2}$' then
    v_date:=p_value::date;
    return to_char(v_date,'YYYY-MM-DD')=p_value;
  end if;
  if p_value ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$' then
    v_ts:=p_value::timestamptz;
    return v_ts is not null;
  end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function private.validate_saved_view_definition_v1(p_definition jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare
  v_filter record;
  v_from text;
  v_to text;
begin
  if p_definition is null or jsonb_typeof(p_definition)<>'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_definition))<>8 then return false; end if;
  if exists(select 1 from jsonb_object_keys(p_definition) k(key)
            where k.key not in ('schema','domain','query','filters','sort','dateRange','pageSize','sourceSchema')) then return false; end if;
  if p_definition->>'schema'<>'enjaz.saved-view.v1' then return false; end if;
  if p_definition->>'domain' not in ('transactions','companies','people','procedures','documents') then return false; end if;
  if jsonb_typeof(p_definition->'query')<>'string' or char_length(p_definition->>'query')>120 then return false; end if;
  if jsonb_typeof(p_definition->'filters')<>'object' then return false; end if;
  if (select count(*) from jsonb_each(p_definition->'filters'))>24 then return false; end if;
  for v_filter in select key,value from jsonb_each(p_definition->'filters') loop
    if v_filter.key !~ '^[A-Za-z][A-Za-z0-9_.-]{0,63}$' then return false; end if;
    if jsonb_typeof(v_filter.value) not in ('string','number','boolean','null') then return false; end if;
    if jsonb_typeof(v_filter.value)='string' and char_length(v_filter.value #>> '{}')>120 then return false; end if;
  end loop;
  if jsonb_typeof(p_definition->'sort') not in ('string','null') then return false; end if;
  if jsonb_typeof(p_definition->'sort')='string' and char_length(p_definition->>'sort')>64 then return false; end if;
  if jsonb_typeof(p_definition->'dateRange')<>'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_definition->'dateRange'))<>2 then return false; end if;
  if exists(select 1 from jsonb_object_keys(p_definition->'dateRange') k(key) where k.key not in ('from','to')) then return false; end if;
  if jsonb_typeof(p_definition->'dateRange'->'from') not in ('string','null')
     or jsonb_typeof(p_definition->'dateRange'->'to') not in ('string','null') then return false; end if;
  v_from:=case when jsonb_typeof(p_definition->'dateRange'->'from')='null' then null else p_definition->'dateRange'->>'from' end;
  v_to:=case when jsonb_typeof(p_definition->'dateRange'->'to')='null' then null else p_definition->'dateRange'->>'to' end;
  if not private.is_saved_view_iso_date_v1(v_from) or not private.is_saved_view_iso_date_v1(v_to) then return false; end if;
  if v_from is not null and v_to is not null and v_from>v_to then return false; end if;
  if jsonb_typeof(p_definition->'pageSize') not in ('number','null') then return false; end if;
  if jsonb_typeof(p_definition->'pageSize')='number' and (
       (p_definition->>'pageSize') !~ '^\d+$'
       or (p_definition->>'pageSize')::integer<1
       or (p_definition->>'pageSize')::integer>100
     ) then return false; end if;
  if jsonb_typeof(p_definition->'sourceSchema') not in ('string','null') then return false; end if;
  if jsonb_typeof(p_definition->'sourceSchema')='string' and char_length(p_definition->>'sourceSchema')>96 then return false; end if;
  if p_definition ? 'results' or p_definition ? 'items' or p_definition ? 'entities' then return false; end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.can_read_saved_view_v1(
  p_workspace_id uuid,p_owner_user_id uuid,p_visibility text,p_team_id uuid
)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (
    (p_visibility='personal' and p_owner_user_id=(select auth.uid()))
    or (p_visibility='team' and p_team_id is not null
        and private.can_access_organization_scope_v1(p_workspace_id,'team',null,null,p_team_id))
    or (p_visibility='workspace' and (
      private.is_organization_owner_v1(p_workspace_id)
      or private.current_organization_member_id_v1(p_workspace_id) is not null
    ))
  );
$$;

create or replace function private.require_saved_view_share_authority_v1(
  p_workspace_id uuid,p_visibility text,p_team_id uuid
)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if p_visibility='personal' then
    if p_team_id is not null then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_PERSONAL_TEAM_FORBIDDEN'; end if;
    return;
  end if;
  if p_visibility='team' then
    if p_team_id is null then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_TEAM_REQUIRED'; end if;
    perform private.validate_organization_scope_target_v1(p_workspace_id,'team',null,null,p_team_id);
    if not private.can_manage_organization_scope_v1(p_workspace_id,'team',null,null,p_team_id) then
      raise insufficient_privilege using message='ENJAZ_SAVED_VIEW_TEAM_MANAGER_REQUIRED';
    end if;
    return;
  end if;
  if p_visibility='workspace' then
    if p_team_id is not null then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_WORKSPACE_TEAM_FORBIDDEN'; end if;
    if not private.is_organization_owner_v1(p_workspace_id) then
      raise insufficient_privilege using message='ENJAZ_SAVED_VIEW_WORKSPACE_OWNER_REQUIRED';
    end if;
    return;
  end if;
  raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_VISIBILITY_INVALID';
end;
$$;

alter table public.saved_views enable row level security;

create policy saved_views_select_authorized on public.saved_views for select to authenticated
using (
  deleted_at is null
  and private.can_read_saved_view_v1(workspace_id,owner_user_id,visibility,team_id)
);

revoke all on table public.saved_views from anon,authenticated;
grant select on table public.saved_views to authenticated;

create or replace function private.save_saved_view_v1_impl(
  p_workspace_id uuid,
  p_saved_view_id uuid,
  p_expected_version integer,
  p_operation_id uuid,
  p_name text,
  p_visibility text,
  p_team_id uuid,
  p_definition jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_row public.saved_views%rowtype;
  v_existing public.saved_views%rowtype;
  v_name text:=btrim(p_name);
  v_domain text;
  v_created boolean:=false;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  if p_operation_id is null then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_OPERATION_REQUIRED'; end if;
  if v_name is null or char_length(v_name)<1 or char_length(v_name)>80 then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_NAME_INVALID'; end if;
  if not private.validate_saved_view_definition_v1(p_definition) then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_DEFINITION_INVALID'; end if;
  v_domain:=p_definition->>'domain';
  perform private.require_saved_view_share_authority_v1(p_workspace_id,p_visibility,p_team_id);

  if p_saved_view_id is null then
    select * into v_existing from public.saved_views s
    where s.workspace_id=p_workspace_id and s.owner_user_id=v_actor and s.operation_id=p_operation_id
    limit 1;
    if found then
      if v_existing.deleted_at is null and v_existing.name=v_name and v_existing.visibility=p_visibility
         and v_existing.team_id is not distinct from p_team_id and v_existing.definition=p_definition then
        return jsonb_build_object('savedViewId',v_existing.id,'version',v_existing.version,'wasCreated',true,'replayed',true);
      end if;
      raise unique_violation using message='ENJAZ_SAVED_VIEW_OPERATION_REUSED';
    end if;

    insert into public.saved_views(workspace_id,owner_user_id,name,domain,visibility,team_id,definition,operation_id)
    values(p_workspace_id,v_actor,v_name,v_domain,p_visibility,p_team_id,p_definition,p_operation_id)
    returning * into v_row;
    v_created:=true;
  else
    select * into v_row from public.saved_views s
    where s.workspace_id=p_workspace_id and s.id=p_saved_view_id
    for update;
    if not found or v_row.deleted_at is not null then raise no_data_found using message='ENJAZ_SAVED_VIEW_NOT_FOUND'; end if;
    if v_row.owner_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_SAVED_VIEW_OWNER_REQUIRED'; end if;

    if v_row.operation_id=p_operation_id then
      if v_row.name=v_name and v_row.visibility=p_visibility
         and v_row.team_id is not distinct from p_team_id and v_row.definition=p_definition then
        return jsonb_build_object('savedViewId',v_row.id,'version',v_row.version,'wasCreated',false,'replayed',true);
      end if;
      raise unique_violation using message='ENJAZ_SAVED_VIEW_OPERATION_REUSED';
    end if;
    if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_SAVED_VIEW_STALE'; end if;
    if exists(select 1 from public.saved_views s where s.workspace_id=p_workspace_id and s.owner_user_id=v_actor and s.operation_id=p_operation_id and s.id<>v_row.id) then
      raise unique_violation using message='ENJAZ_SAVED_VIEW_OPERATION_REUSED';
    end if;

    update public.saved_views set
      name=v_name,
      domain=v_domain,
      visibility=p_visibility,
      team_id=p_team_id,
      definition=p_definition,
      operation_id=p_operation_id,
      version=version+1,
      updated_at=now()
    where workspace_id=p_workspace_id and id=p_saved_view_id
    returning * into v_row;
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,
    case when v_created then 'saved_view.created' else 'saved_view.updated' end,
    'saved_view',v_row.id,'Saved operational view changed',
    jsonb_build_object('domain',v_row.domain,'visibility',v_row.visibility,'teamId',v_row.team_id,'version',v_row.version)
  );

  return jsonb_build_object('savedViewId',v_row.id,'version',v_row.version,'wasCreated',v_created,'replayed',false);
end;
$$;

create or replace function public.save_saved_view_v1(
  p_workspace_id uuid,
  p_saved_view_id uuid,
  p_expected_version integer,
  p_operation_id uuid,
  p_name text,
  p_visibility text,
  p_team_id uuid,
  p_definition jsonb
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_saved_view_v1_impl(p_workspace_id,p_saved_view_id,p_expected_version,p_operation_id,p_name,p_visibility,p_team_id,p_definition);
$$;

create or replace function private.delete_saved_view_v1_impl(
  p_workspace_id uuid,p_saved_view_id uuid,p_expected_version integer,p_operation_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_row public.saved_views%rowtype;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  if p_saved_view_id is null or p_operation_id is null then raise invalid_parameter_value using message='ENJAZ_SAVED_VIEW_DELETE_INPUT_INVALID'; end if;
  select * into v_row from public.saved_views s
  where s.workspace_id=p_workspace_id and s.id=p_saved_view_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_SAVED_VIEW_NOT_FOUND'; end if;
  if v_row.deleted_at is not null then
    if v_row.operation_id=p_operation_id then return jsonb_build_object('savedViewId',v_row.id,'version',v_row.version,'deleted',true,'replayed',true); end if;
    raise no_data_found using message='ENJAZ_SAVED_VIEW_NOT_FOUND';
  end if;
  if v_row.owner_user_id<>v_actor and not (v_row.visibility in ('team','workspace') and private.is_organization_owner_v1(p_workspace_id)) then
    raise insufficient_privilege using message='ENJAZ_SAVED_VIEW_DELETE_FORBIDDEN';
  end if;
  if v_row.operation_id=p_operation_id then raise unique_violation using message='ENJAZ_SAVED_VIEW_OPERATION_REUSED'; end if;
  if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_SAVED_VIEW_STALE'; end if;

  update public.saved_views set deleted_at=now(),operation_id=p_operation_id,version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=p_saved_view_id returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'saved_view.deleted','saved_view',v_row.id,'Saved operational view deleted',jsonb_build_object('domain',v_row.domain,'visibility',v_row.visibility,'teamId',v_row.team_id,'version',v_row.version));

  return jsonb_build_object('savedViewId',v_row.id,'version',v_row.version,'deleted',true,'replayed',false);
end;
$$;

create or replace function public.delete_saved_view_v1(
  p_workspace_id uuid,p_saved_view_id uuid,p_expected_version integer,p_operation_id uuid
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.delete_saved_view_v1_impl(p_workspace_id,p_saved_view_id,p_expected_version,p_operation_id);
$$;

create or replace function public.list_saved_views_v1(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,
    'workspaceId',s.workspace_id,
    'ownerUserId',s.owner_user_id,
    'name',s.name,
    'domain',s.domain,
    'visibility',s.visibility,
    'teamId',s.team_id,
    'definition',s.definition,
    'version',s.version,
    'createdAt',s.created_at,
    'updatedAt',s.updated_at
  ) order by s.updated_at desc,s.id),'[]'::jsonb)
  from public.saved_views s
  where s.workspace_id=p_workspace_id and s.deleted_at is null;
$$;

revoke all on function public.save_saved_view_v1(uuid,uuid,integer,uuid,text,text,uuid,jsonb) from public,anon;
revoke all on function public.delete_saved_view_v1(uuid,uuid,integer,uuid) from public,anon;
revoke all on function public.list_saved_views_v1(uuid) from public,anon;
grant execute on function public.save_saved_view_v1(uuid,uuid,integer,uuid,text,text,uuid,jsonb) to authenticated;
grant execute on function public.delete_saved_view_v1(uuid,uuid,integer,uuid) to authenticated;
grant execute on function public.list_saved_views_v1(uuid) to authenticated;

-- No INSERT/UPDATE/DELETE grants or policies exist on saved_views for browser roles.
-- Source business tables are intentionally untouched by this migration.

commit;
