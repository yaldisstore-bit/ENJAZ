-- ENJAZ Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation
-- Non-owner workforce authorization is deliberately isolated from legacy workspace_memberships.
-- This prevents a scoped workforce member from satisfying pre-M15 workspace-wide RLS/RPC membership checks.

begin;

grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Canonical organization structure and workforce authorization
-- -----------------------------------------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_workspace_id_id_key unique(workspace_id,id),
  constraint organization_members_workspace_user_key unique(workspace_id,user_id),
  constraint organization_members_validity_check check (valid_until is null or valid_until > valid_from)
);

create table public.organization_branches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  code text check (code is null or code ~ '^[A-Za-z0-9_.-]{1,48}$'),
  address text check (address is null or char_length(btrim(address)) between 1 and 800),
  status text not null default 'active' check (status in ('active','inactive')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_branches_workspace_id_id_key unique(workspace_id,id)
);

create table public.organization_departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  branch_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  code text check (code is null or code ~ '^[A-Za-z0-9_.-]{1,48}$'),
  status text not null default 'active' check (status in ('active','inactive')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_departments_workspace_id_id_key unique(workspace_id,id),
  constraint organization_departments_branch_fk foreign key(workspace_id,branch_id)
    references public.organization_branches(workspace_id,id) on delete restrict
);

create table public.organization_teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  department_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  code text check (code is null or code ~ '^[A-Za-z0-9_.-]{1,48}$'),
  status text not null default 'active' check (status in ('active','inactive')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_teams_workspace_id_id_key unique(workspace_id,id),
  constraint organization_teams_department_fk foreign key(workspace_id,department_id)
    references public.organization_departments(workspace_id,id) on delete restrict
);

create table public.organization_scope_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_member_id uuid not null,
  scope_type text not null check (scope_type in ('branch','department','team')),
  branch_id uuid,
  department_id uuid,
  team_id uuid,
  scope_role text not null default 'member' check (scope_role in ('member','lead','manager')),
  status text not null default 'active' check (status in ('active','inactive')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_scope_memberships_workspace_id_id_key unique(workspace_id,id),
  constraint organization_scope_memberships_member_fk foreign key(workspace_id,organization_member_id)
    references public.organization_members(workspace_id,id) on delete cascade,
  constraint organization_scope_memberships_branch_fk foreign key(workspace_id,branch_id)
    references public.organization_branches(workspace_id,id) on delete cascade,
  constraint organization_scope_memberships_department_fk foreign key(workspace_id,department_id)
    references public.organization_departments(workspace_id,id) on delete cascade,
  constraint organization_scope_memberships_team_fk foreign key(workspace_id,team_id)
    references public.organization_teams(workspace_id,id) on delete cascade,
  constraint organization_scope_memberships_target_check check (
    (scope_type='branch' and branch_id is not null and department_id is null and team_id is null)
    or (scope_type='department' and branch_id is null and department_id is not null and team_id is null)
    or (scope_type='team' and branch_id is null and department_id is null and team_id is not null)
  ),
  constraint organization_scope_memberships_validity_check check (valid_until is null or valid_until > valid_from)
);

create table public.transaction_organization_ownership (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  scope_type text not null check (scope_type in ('branch','department','team')),
  branch_id uuid,
  department_id uuid,
  team_id uuid,
  version integer not null default 1 check (version > 0),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_organization_ownership_workspace_id_id_key unique(workspace_id,id),
  constraint transaction_organization_ownership_transaction_key unique(workspace_id,transaction_id),
  constraint transaction_organization_ownership_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete cascade,
  constraint transaction_organization_ownership_branch_fk foreign key(workspace_id,branch_id)
    references public.organization_branches(workspace_id,id) on delete restrict,
  constraint transaction_organization_ownership_department_fk foreign key(workspace_id,department_id)
    references public.organization_departments(workspace_id,id) on delete restrict,
  constraint transaction_organization_ownership_team_fk foreign key(workspace_id,team_id)
    references public.organization_teams(workspace_id,id) on delete restrict,
  constraint transaction_organization_ownership_target_check check (
    (scope_type='branch' and branch_id is not null and department_id is null and team_id is null)
    or (scope_type='department' and branch_id is null and department_id is not null and team_id is null)
    or (scope_type='team' and branch_id is null and department_id is null and team_id is not null)
  )
);

create table public.transaction_organization_ownership_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ownership_id uuid not null,
  transaction_id uuid not null,
  event_type text not null check (event_type in ('assigned','transferred')),
  from_scope_type text check (from_scope_type is null or from_scope_type in ('branch','department','team')),
  from_branch_id uuid,
  from_department_id uuid,
  from_team_id uuid,
  to_scope_type text not null check (to_scope_type in ('branch','department','team')),
  to_branch_id uuid,
  to_department_id uuid,
  to_team_id uuid,
  reason text not null check (char_length(btrim(reason)) between 1 and 1200),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint transaction_org_ownership_events_workspace_id_id_key unique(workspace_id,id),
  constraint transaction_org_ownership_events_ownership_fk foreign key(workspace_id,ownership_id)
    references public.transaction_organization_ownership(workspace_id,id) on delete cascade,
  constraint transaction_org_ownership_events_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete cascade,
  constraint transaction_org_ownership_events_from_target_check check (
    (event_type='assigned' and from_scope_type is null and from_branch_id is null and from_department_id is null and from_team_id is null)
    or (event_type='transferred' and (
      (from_scope_type='branch' and from_branch_id is not null and from_department_id is null and from_team_id is null)
      or (from_scope_type='department' and from_branch_id is null and from_department_id is not null and from_team_id is null)
      or (from_scope_type='team' and from_branch_id is null and from_department_id is null and from_team_id is not null)
    ))
  ),
  constraint transaction_org_ownership_events_to_target_check check (
    (to_scope_type='branch' and to_branch_id is not null and to_department_id is null and to_team_id is null)
    or (to_scope_type='department' and to_branch_id is null and to_department_id is not null and to_team_id is null)
    or (to_scope_type='team' and to_branch_id is null and to_department_id is null and to_team_id is not null)
  )
);

create unique index organization_branches_code_unique on public.organization_branches(workspace_id,lower(code)) where code is not null;
create unique index organization_departments_code_unique on public.organization_departments(workspace_id,lower(code)) where code is not null;
create unique index organization_teams_code_unique on public.organization_teams(workspace_id,lower(code)) where code is not null;
create index organization_members_user_idx on public.organization_members(user_id,workspace_id,status);
create index organization_departments_branch_idx on public.organization_departments(workspace_id,branch_id,status);
create index organization_teams_department_idx on public.organization_teams(workspace_id,department_id,status);
create index organization_scope_memberships_member_idx on public.organization_scope_memberships(workspace_id,organization_member_id,status,valid_from,valid_until);
create unique index organization_scope_memberships_branch_unique on public.organization_scope_memberships(workspace_id,organization_member_id,branch_id) where branch_id is not null;
create unique index organization_scope_memberships_department_unique on public.organization_scope_memberships(workspace_id,organization_member_id,department_id) where department_id is not null;
create unique index organization_scope_memberships_team_unique on public.organization_scope_memberships(workspace_id,organization_member_id,team_id) where team_id is not null;
create index transaction_org_ownership_scope_idx on public.transaction_organization_ownership(workspace_id,scope_type,branch_id,department_id,team_id,updated_at desc);
create index transaction_org_ownership_events_transaction_idx on public.transaction_organization_ownership_events(workspace_id,transaction_id,created_at desc);

create trigger organization_members_set_updated_at before update on public.organization_members for each row execute function private.set_updated_at();
create trigger organization_branches_set_updated_at before update on public.organization_branches for each row execute function private.set_updated_at();
create trigger organization_departments_set_updated_at before update on public.organization_departments for each row execute function private.set_updated_at();
create trigger organization_teams_set_updated_at before update on public.organization_teams for each row execute function private.set_updated_at();
create trigger organization_scope_memberships_set_updated_at before update on public.organization_scope_memberships for each row execute function private.set_updated_at();
create trigger transaction_organization_ownership_set_updated_at before update on public.transaction_organization_ownership for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Authorization helpers. Owner authority remains anchored in workspace_memberships;
-- non-owner workforce authority is only organization_members + explicit scope rows.
-- -----------------------------------------------------------------------------

create or replace function private.is_organization_owner_v1(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from public.workspaces w
       join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
       where w.id=p_workspace_id and w.owner_user_id=(select auth.uid())
     );
$$;

create or replace function private.current_organization_member_id_v1(p_workspace_id uuid)
returns uuid language sql stable security definer set search_path='' as $$
  select m.id
  from public.organization_members m
  where m.workspace_id=p_workspace_id
    and m.user_id=(select auth.uid())
    and m.status='active'
    and m.valid_from<=now()
    and (m.valid_until is null or m.valid_until>now())
  limit 1;
$$;

create or replace function private.require_organization_actor_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_ORG_AUTH_REQUIRED'; end if;
  if private.is_organization_owner_v1(p_workspace_id) then return v_actor; end if;
  if private.current_organization_member_id_v1(p_workspace_id) is null then
    raise insufficient_privilege using message='ENJAZ_ORG_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;
$$;

create or replace function private.require_organization_owner_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.is_organization_owner_v1(p_workspace_id) then
    raise insufficient_privilege using message='ENJAZ_ORG_OWNER_REQUIRED';
  end if;
  return v_actor;
end;
$$;

create or replace function private.validate_organization_scope_target_v1(
  p_workspace_id uuid,p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid
)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if p_scope_type='branch' then
    if p_branch_id is null or p_department_id is not null or p_team_id is not null
       or not exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=p_branch_id and b.status='active') then
      raise invalid_parameter_value using message='ENJAZ_ORG_BRANCH_TARGET_INVALID';
    end if;
  elsif p_scope_type='department' then
    if p_branch_id is not null or p_department_id is null or p_team_id is not null
       or not exists(select 1 from public.organization_departments d where d.workspace_id=p_workspace_id and d.id=p_department_id and d.status='active'
                     and (d.branch_id is null or exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=d.branch_id and b.status='active'))) then
      raise invalid_parameter_value using message='ENJAZ_ORG_DEPARTMENT_TARGET_INVALID';
    end if;
  elsif p_scope_type='team' then
    if p_branch_id is not null or p_department_id is not null or p_team_id is null
       or not exists(
         select 1 from public.organization_teams t
         join public.organization_departments d on d.workspace_id=t.workspace_id and d.id=t.department_id
         left join public.organization_branches b on b.workspace_id=d.workspace_id and b.id=d.branch_id
         where t.workspace_id=p_workspace_id and t.id=p_team_id and t.status='active' and d.status='active'
           and (d.branch_id is null or b.status='active')
       ) then
      raise invalid_parameter_value using message='ENJAZ_ORG_TEAM_TARGET_INVALID';
    end if;
  else
    raise invalid_parameter_value using message='ENJAZ_ORG_SCOPE_TYPE_INVALID';
  end if;
end;
$$;

create or replace function private.organization_scope_source_v1(
  p_workspace_id uuid,p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid,p_management boolean default false
)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare
  v_member_id uuid;
  v_department_id uuid;
  v_branch_id uuid;
  v_source uuid;
begin
  if private.is_organization_owner_v1(p_workspace_id) then return null; end if;
  v_member_id:=private.current_organization_member_id_v1(p_workspace_id);
  if v_member_id is null then return null; end if;

  if p_scope_type='branch' then
    if not exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=p_branch_id and b.status='active') then return null; end if;
    select s.id into v_source from public.organization_scope_memberships s
    where s.workspace_id=p_workspace_id and s.organization_member_id=v_member_id and s.branch_id=p_branch_id
      and s.status='active' and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
      and (not p_management or s.scope_role='manager')
    order by case s.scope_role when 'manager' then 1 when 'lead' then 2 else 3 end limit 1;
    return v_source;
  elsif p_scope_type='department' then
    select d.branch_id into v_branch_id from public.organization_departments d
    where d.workspace_id=p_workspace_id and d.id=p_department_id and d.status='active'
      and (d.branch_id is null or exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=d.branch_id and b.status='active'));
    if not found then return null; end if;
    select s.id into v_source from public.organization_scope_memberships s
    where s.workspace_id=p_workspace_id and s.organization_member_id=v_member_id
      and s.status='active' and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
      and (not p_management or s.scope_role='manager')
      and (s.department_id=p_department_id or (v_branch_id is not null and s.branch_id=v_branch_id))
    order by case when s.department_id=p_department_id then 1 else 2 end,
             case s.scope_role when 'manager' then 1 when 'lead' then 2 else 3 end limit 1;
    return v_source;
  elsif p_scope_type='team' then
    select t.department_id,d.branch_id into v_department_id,v_branch_id
    from public.organization_teams t
    join public.organization_departments d on d.workspace_id=t.workspace_id and d.id=t.department_id
    left join public.organization_branches b on b.workspace_id=d.workspace_id and b.id=d.branch_id
    where t.workspace_id=p_workspace_id and t.id=p_team_id and t.status='active' and d.status='active'
      and (d.branch_id is null or b.status='active');
    if not found then return null; end if;
    select s.id into v_source from public.organization_scope_memberships s
    where s.workspace_id=p_workspace_id and s.organization_member_id=v_member_id
      and s.status='active' and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
      and (not p_management or s.scope_role='manager')
      and (s.team_id=p_team_id or s.department_id=v_department_id or (v_branch_id is not null and s.branch_id=v_branch_id))
    order by case when s.team_id=p_team_id then 1 when s.department_id=v_department_id then 2 else 3 end,
             case s.scope_role when 'manager' then 1 when 'lead' then 2 else 3 end limit 1;
    return v_source;
  end if;
  return null;
end;
$$;

create or replace function private.can_access_organization_scope_v1(
  p_workspace_id uuid,p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid
)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_organization_owner_v1(p_workspace_id)
      or private.organization_scope_source_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id,false) is not null;
$$;

create or replace function private.can_manage_organization_scope_v1(
  p_workspace_id uuid,p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid
)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_organization_owner_v1(p_workspace_id)
      or private.organization_scope_source_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id,true) is not null;
$$;

create or replace function private.organization_scoped_transactions_v1(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid; v_owner boolean;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  v_owner:=private.is_organization_owner_v1(p_workspace_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'transactionId',t.id,
      'companyId',t.company_id,
      'companyName',coalesce(c.display_name,c.legal_name),
      'type',t.type,
      'status',t.status,
      'priority',t.priority,
      'updatedAt',t.updated_at,
      'ownershipId',o.id,
      'ownershipVersion',o.version,
      'scopeType',o.scope_type,
      'branchId',o.branch_id,
      'departmentId',o.department_id,
      'teamId',o.team_id,
      'accessSourceMembershipId',case when v_owner then null else private.organization_scope_source_v1(o.workspace_id,o.scope_type,o.branch_id,o.department_id,o.team_id,false) end
    ) order by t.updated_at desc)
    from public.transaction_organization_ownership o
    join public.transactions t on t.workspace_id=o.workspace_id and t.id=o.transaction_id
    join public.companies c on c.workspace_id=t.workspace_id and c.id=t.company_id
    where o.workspace_id=p_workspace_id and t.deleted_at is null
      and (v_owner or private.organization_scope_source_v1(o.workspace_id,o.scope_type,o.branch_id,o.department_id,o.team_id,false) is not null)
  ),'[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS and grants. Authenticated gets read only; every mutation is RPC-bound.
-- -----------------------------------------------------------------------------

alter table public.organization_members enable row level security;
alter table public.organization_branches enable row level security;
alter table public.organization_departments enable row level security;
alter table public.organization_teams enable row level security;
alter table public.organization_scope_memberships enable row level security;
alter table public.transaction_organization_ownership enable row level security;
alter table public.transaction_organization_ownership_events enable row level security;

create policy organization_members_select_scoped on public.organization_members for select to authenticated
using ((select auth.uid()) is not null and (private.is_organization_owner_v1(workspace_id) or user_id=(select auth.uid())));

create policy organization_branches_select_scoped on public.organization_branches for select to authenticated
using ((select auth.uid()) is not null and private.can_access_organization_scope_v1(workspace_id,'branch',id,null,null));

create policy organization_departments_select_scoped on public.organization_departments for select to authenticated
using ((select auth.uid()) is not null and private.can_access_organization_scope_v1(workspace_id,'department',null,id,null));

create policy organization_teams_select_scoped on public.organization_teams for select to authenticated
using ((select auth.uid()) is not null and private.can_access_organization_scope_v1(workspace_id,'team',null,null,id));

create policy organization_scope_memberships_select_scoped on public.organization_scope_memberships for select to authenticated
using ((select auth.uid()) is not null and (
  private.is_organization_owner_v1(workspace_id)
  or organization_member_id=private.current_organization_member_id_v1(workspace_id)
));

create policy transaction_organization_ownership_select_scoped on public.transaction_organization_ownership for select to authenticated
using ((select auth.uid()) is not null and private.can_access_organization_scope_v1(workspace_id,scope_type,branch_id,department_id,team_id));

create policy transaction_organization_ownership_events_select_scoped on public.transaction_organization_ownership_events for select to authenticated
using ((select auth.uid()) is not null and (
  private.is_organization_owner_v1(workspace_id)
  or (from_scope_type is not null and private.can_access_organization_scope_v1(workspace_id,from_scope_type,from_branch_id,from_department_id,from_team_id))
  or private.can_access_organization_scope_v1(workspace_id,to_scope_type,to_branch_id,to_department_id,to_team_id)
));

revoke all on table public.organization_members,public.organization_branches,public.organization_departments,public.organization_teams,public.organization_scope_memberships,public.transaction_organization_ownership,public.transaction_organization_ownership_events from anon,authenticated;
grant select on table public.organization_members,public.organization_branches,public.organization_departments,public.organization_teams,public.organization_scope_memberships,public.transaction_organization_ownership,public.transaction_organization_ownership_events to authenticated;

-- -----------------------------------------------------------------------------
-- Owner-governed workforce and structure writes
-- -----------------------------------------------------------------------------

create or replace function private.set_organization_member_v1_impl(
  p_workspace_id uuid,p_user_id uuid,p_status text,p_valid_until timestamptz
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_member public.organization_members%rowtype; v_created boolean:=false;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then raise invalid_parameter_value using message='ENJAZ_ORG_USER_INVALID'; end if;
  if p_user_id=v_actor then raise invalid_parameter_value using message='ENJAZ_ORG_OWNER_IS_IMPLICIT'; end if;
  if p_status not in ('active','inactive') then raise invalid_parameter_value using message='ENJAZ_ORG_MEMBER_STATUS_INVALID'; end if;
  if p_valid_until is not null and p_valid_until<=now() then raise invalid_parameter_value using message='ENJAZ_ORG_MEMBER_VALID_UNTIL_INVALID'; end if;

  select * into v_member from public.organization_members m where m.workspace_id=p_workspace_id and m.user_id=p_user_id;
  if found then
    update public.organization_members set status=p_status,valid_until=p_valid_until,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=v_member.id returning * into v_member;
  else
    insert into public.organization_members(workspace_id,user_id,status,valid_until,created_by)
    values(p_workspace_id,p_user_id,p_status,p_valid_until,v_actor) returning * into v_member;
    v_created:=true;
  end if;
  if p_status='inactive' then
    update public.organization_scope_memberships set status='inactive',version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and organization_member_id=v_member.id and status<>'inactive';
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.member.created' else 'organization.member.updated' end,'organization_member',v_member.id,'Organization workforce member changed',jsonb_build_object('userId',v_member.user_id,'status',v_member.status,'version',v_member.version));
  return jsonb_build_object('memberId',v_member.id,'userId',v_member.user_id,'status',v_member.status,'version',v_member.version,'wasCreated',v_created);
end;
$$;

create or replace function public.set_organization_member_v1(p_workspace_id uuid,p_user_id uuid,p_status text,p_valid_until timestamptz default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.set_organization_member_v1_impl(p_workspace_id,p_user_id,p_status,p_valid_until);
$$;

create or replace function private.save_organization_branch_v1_impl(
  p_workspace_id uuid,p_branch_id uuid,p_expected_version integer,p_name text,p_code text,p_address text,p_status text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_row public.organization_branches%rowtype; v_created boolean:=false;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 180 then raise invalid_parameter_value using message='ENJAZ_ORG_BRANCH_NAME_INVALID'; end if;
  if p_code is not null and p_code !~ '^[A-Za-z0-9_.-]{1,48}$' then raise invalid_parameter_value using message='ENJAZ_ORG_BRANCH_CODE_INVALID'; end if;
  if p_status not in ('active','inactive') then raise invalid_parameter_value using message='ENJAZ_ORG_BRANCH_STATUS_INVALID'; end if;
  if p_branch_id is null then
    insert into public.organization_branches(workspace_id,name,code,address,status,created_by)
    values(p_workspace_id,btrim(p_name),nullif(btrim(p_code),''),nullif(btrim(p_address),''),p_status,v_actor) returning * into v_row;
    v_created:=true;
  else
    select * into v_row from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=p_branch_id;
    if not found then raise no_data_found using message='ENJAZ_ORG_BRANCH_NOT_FOUND'; end if;
    if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_ORG_BRANCH_STALE'; end if;
    update public.organization_branches set name=btrim(p_name),code=nullif(btrim(p_code),''),address=nullif(btrim(p_address),''),status=p_status,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_branch_id returning * into v_row;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.branch.created' else 'organization.branch.updated' end,'organization_branch',v_row.id,'Organization branch changed',jsonb_build_object('name',v_row.name,'status',v_row.status,'version',v_row.version));
  return jsonb_build_object('branchId',v_row.id,'version',v_row.version,'status',v_row.status,'wasCreated',v_created);
end;
$$;

create or replace function public.save_organization_branch_v1(p_workspace_id uuid,p_branch_id uuid,p_expected_version integer,p_name text,p_code text,p_address text,p_status text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_organization_branch_v1_impl(p_workspace_id,p_branch_id,p_expected_version,p_name,p_code,p_address,p_status);
$$;

create or replace function private.save_organization_department_v1_impl(
  p_workspace_id uuid,p_department_id uuid,p_expected_version integer,p_branch_id uuid,p_name text,p_code text,p_status text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_row public.organization_departments%rowtype; v_created boolean:=false;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 180 then raise invalid_parameter_value using message='ENJAZ_ORG_DEPARTMENT_NAME_INVALID'; end if;
  if p_code is not null and p_code !~ '^[A-Za-z0-9_.-]{1,48}$' then raise invalid_parameter_value using message='ENJAZ_ORG_DEPARTMENT_CODE_INVALID'; end if;
  if p_status not in ('active','inactive') then raise invalid_parameter_value using message='ENJAZ_ORG_DEPARTMENT_STATUS_INVALID'; end if;
  if p_branch_id is not null and not exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=p_branch_id and b.status='active') then raise invalid_parameter_value using message='ENJAZ_ORG_DEPARTMENT_BRANCH_INVALID'; end if;
  if p_department_id is null then
    insert into public.organization_departments(workspace_id,branch_id,name,code,status,created_by)
    values(p_workspace_id,p_branch_id,btrim(p_name),nullif(btrim(p_code),''),p_status,v_actor) returning * into v_row;
    v_created:=true;
  else
    select * into v_row from public.organization_departments d where d.workspace_id=p_workspace_id and d.id=p_department_id;
    if not found then raise no_data_found using message='ENJAZ_ORG_DEPARTMENT_NOT_FOUND'; end if;
    if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_ORG_DEPARTMENT_STALE'; end if;
    if v_row.branch_id is distinct from p_branch_id and (
      exists(select 1 from public.organization_scope_memberships s where s.workspace_id=p_workspace_id and s.department_id=p_department_id and s.status='active')
      or exists(select 1 from public.organization_teams t join public.organization_scope_memberships s on s.workspace_id=t.workspace_id and s.team_id=t.id and s.status='active' where t.workspace_id=p_workspace_id and t.department_id=p_department_id)
      or exists(select 1 from public.transaction_organization_ownership o where o.workspace_id=p_workspace_id and (o.department_id=p_department_id or o.team_id in (select t.id from public.organization_teams t where t.workspace_id=p_workspace_id and t.department_id=p_department_id)))
    ) then raise object_not_in_prerequisite_state using message='ENJAZ_ORG_DEPARTMENT_REPARENT_BLOCKED'; end if;
    update public.organization_departments set branch_id=p_branch_id,name=btrim(p_name),code=nullif(btrim(p_code),''),status=p_status,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_department_id returning * into v_row;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.department.created' else 'organization.department.updated' end,'organization_department',v_row.id,'Organization department changed',jsonb_build_object('branchId',v_row.branch_id,'name',v_row.name,'status',v_row.status,'version',v_row.version));
  return jsonb_build_object('departmentId',v_row.id,'version',v_row.version,'status',v_row.status,'wasCreated',v_created);
end;
$$;

create or replace function public.save_organization_department_v1(p_workspace_id uuid,p_department_id uuid,p_expected_version integer,p_branch_id uuid,p_name text,p_code text,p_status text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_organization_department_v1_impl(p_workspace_id,p_department_id,p_expected_version,p_branch_id,p_name,p_code,p_status);
$$;

create or replace function private.save_organization_team_v1_impl(
  p_workspace_id uuid,p_team_id uuid,p_expected_version integer,p_department_id uuid,p_name text,p_code text,p_status text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_row public.organization_teams%rowtype; v_created boolean:=false;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 180 then raise invalid_parameter_value using message='ENJAZ_ORG_TEAM_NAME_INVALID'; end if;
  if p_code is not null and p_code !~ '^[A-Za-z0-9_.-]{1,48}$' then raise invalid_parameter_value using message='ENJAZ_ORG_TEAM_CODE_INVALID'; end if;
  if p_status not in ('active','inactive') then raise invalid_parameter_value using message='ENJAZ_ORG_TEAM_STATUS_INVALID'; end if;
  if not exists(select 1 from public.organization_departments d where d.workspace_id=p_workspace_id and d.id=p_department_id and d.status='active'
                and (d.branch_id is null or exists(select 1 from public.organization_branches b where b.workspace_id=p_workspace_id and b.id=d.branch_id and b.status='active'))) then
    raise invalid_parameter_value using message='ENJAZ_ORG_TEAM_DEPARTMENT_INVALID';
  end if;
  if p_team_id is null then
    insert into public.organization_teams(workspace_id,department_id,name,code,status,created_by)
    values(p_workspace_id,p_department_id,btrim(p_name),nullif(btrim(p_code),''),p_status,v_actor) returning * into v_row;
    v_created:=true;
  else
    select * into v_row from public.organization_teams t where t.workspace_id=p_workspace_id and t.id=p_team_id;
    if not found then raise no_data_found using message='ENJAZ_ORG_TEAM_NOT_FOUND'; end if;
    if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_ORG_TEAM_STALE'; end if;
    if v_row.department_id<>p_department_id and (
      exists(select 1 from public.organization_scope_memberships s where s.workspace_id=p_workspace_id and s.team_id=p_team_id and s.status='active')
      or exists(select 1 from public.transaction_organization_ownership o where o.workspace_id=p_workspace_id and o.team_id=p_team_id)
    ) then raise object_not_in_prerequisite_state using message='ENJAZ_ORG_TEAM_REPARENT_BLOCKED'; end if;
    update public.organization_teams set department_id=p_department_id,name=btrim(p_name),code=nullif(btrim(p_code),''),status=p_status,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_team_id returning * into v_row;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.team.created' else 'organization.team.updated' end,'organization_team',v_row.id,'Organization team changed',jsonb_build_object('departmentId',v_row.department_id,'name',v_row.name,'status',v_row.status,'version',v_row.version));
  return jsonb_build_object('teamId',v_row.id,'version',v_row.version,'status',v_row.status,'wasCreated',v_created);
end;
$$;

create or replace function public.save_organization_team_v1(p_workspace_id uuid,p_team_id uuid,p_expected_version integer,p_department_id uuid,p_name text,p_code text,p_status text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_organization_team_v1_impl(p_workspace_id,p_team_id,p_expected_version,p_department_id,p_name,p_code,p_status);
$$;

create or replace function private.set_organization_scope_membership_v1_impl(
  p_workspace_id uuid,p_membership_id uuid,p_expected_version integer,p_user_id uuid,
  p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid,p_scope_role text,p_status text,
  p_valid_from timestamptz,p_valid_until timestamptz
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_member public.organization_members%rowtype; v_row public.organization_scope_memberships%rowtype; v_created boolean:=false;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  select * into v_member from public.organization_members m where m.workspace_id=p_workspace_id and m.user_id=p_user_id and m.status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now());
  if not found then raise invalid_parameter_value using message='ENJAZ_ORG_MEMBER_NOT_ACTIVE'; end if;
  perform private.validate_organization_scope_target_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id);
  if p_scope_role not in ('member','lead','manager') then raise invalid_parameter_value using message='ENJAZ_ORG_SCOPE_ROLE_INVALID'; end if;
  if p_status not in ('active','inactive') then raise invalid_parameter_value using message='ENJAZ_ORG_SCOPE_STATUS_INVALID'; end if;
  if p_valid_from is null then p_valid_from:=now(); end if;
  if p_valid_until is not null and p_valid_until<=p_valid_from then raise invalid_parameter_value using message='ENJAZ_ORG_SCOPE_VALIDITY_INVALID'; end if;

  if p_membership_id is null then
    select * into v_row from public.organization_scope_memberships s
    where s.workspace_id=p_workspace_id and s.organization_member_id=v_member.id
      and ((p_scope_type='branch' and s.branch_id=p_branch_id) or (p_scope_type='department' and s.department_id=p_department_id) or (p_scope_type='team' and s.team_id=p_team_id));
    if found then
      update public.organization_scope_memberships set scope_role=p_scope_role,status=p_status,valid_from=p_valid_from,valid_until=p_valid_until,version=version+1,updated_at=now()
      where workspace_id=p_workspace_id and id=v_row.id returning * into v_row;
    else
      insert into public.organization_scope_memberships(workspace_id,organization_member_id,scope_type,branch_id,department_id,team_id,scope_role,status,valid_from,valid_until,created_by)
      values(p_workspace_id,v_member.id,p_scope_type,p_branch_id,p_department_id,p_team_id,p_scope_role,p_status,p_valid_from,p_valid_until,v_actor) returning * into v_row;
      v_created:=true;
    end if;
  else
    select * into v_row from public.organization_scope_memberships s where s.workspace_id=p_workspace_id and s.id=p_membership_id and s.organization_member_id=v_member.id;
    if not found then raise no_data_found using message='ENJAZ_ORG_SCOPE_MEMBERSHIP_NOT_FOUND'; end if;
    if p_expected_version is null or p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_ORG_SCOPE_MEMBERSHIP_STALE'; end if;
    update public.organization_scope_memberships set scope_type=p_scope_type,branch_id=p_branch_id,department_id=p_department_id,team_id=p_team_id,scope_role=p_scope_role,status=p_status,valid_from=p_valid_from,valid_until=p_valid_until,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_membership_id returning * into v_row;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.scope_membership.created' else 'organization.scope_membership.updated' end,'organization_scope_membership',v_row.id,'Organization scope membership changed',jsonb_build_object('userId',p_user_id,'scopeType',v_row.scope_type,'branchId',v_row.branch_id,'departmentId',v_row.department_id,'teamId',v_row.team_id,'scopeRole',v_row.scope_role,'status',v_row.status,'version',v_row.version));
  return jsonb_build_object('membershipId',v_row.id,'version',v_row.version,'status',v_row.status,'wasCreated',v_created);
end;
$$;

create or replace function public.set_organization_scope_membership_v1(
  p_workspace_id uuid,p_membership_id uuid,p_expected_version integer,p_user_id uuid,
  p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid,p_scope_role text,p_status text,
  p_valid_from timestamptz default null,p_valid_until timestamptz default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.set_organization_scope_membership_v1_impl(p_workspace_id,p_membership_id,p_expected_version,p_user_id,p_scope_type,p_branch_id,p_department_id,p_team_id,p_scope_role,p_status,p_valid_from,p_valid_until);
$$;

-- -----------------------------------------------------------------------------
-- Scoped transaction ownership. This never mutates transaction lifecycle state.
-- -----------------------------------------------------------------------------

create or replace function private.assign_transaction_organization_v1_impl(
  p_workspace_id uuid,p_transaction_id uuid,p_expected_version integer,
  p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid,p_reason text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid; v_owner boolean; v_row public.transaction_organization_ownership%rowtype;
  v_old public.transaction_organization_ownership%rowtype; v_created boolean:=false; v_same boolean:=false;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  v_owner:=private.is_organization_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_reason,''))) not between 1 and 1200 then raise invalid_parameter_value using message='ENJAZ_ORG_TRANSFER_REASON_REQUIRED'; end if;
  if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then raise no_data_found using message='ENJAZ_ORG_TRANSACTION_NOT_FOUND'; end if;
  perform private.validate_organization_scope_target_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id);

  select * into v_old from public.transaction_organization_ownership o where o.workspace_id=p_workspace_id and o.transaction_id=p_transaction_id;
  if not found then
    if not v_owner and not private.can_manage_organization_scope_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id) then raise insufficient_privilege using message='ENJAZ_ORG_TARGET_MANAGE_REQUIRED'; end if;
    insert into public.transaction_organization_ownership(workspace_id,transaction_id,scope_type,branch_id,department_id,team_id,assigned_by)
    values(p_workspace_id,p_transaction_id,p_scope_type,p_branch_id,p_department_id,p_team_id,v_actor) returning * into v_row;
    v_created:=true;
    insert into public.transaction_organization_ownership_events(workspace_id,ownership_id,transaction_id,event_type,to_scope_type,to_branch_id,to_department_id,to_team_id,reason,actor_user_id)
    values(p_workspace_id,v_row.id,p_transaction_id,'assigned',p_scope_type,p_branch_id,p_department_id,p_team_id,btrim(p_reason),v_actor);
  else
    if p_expected_version is null or p_expected_version<>v_old.version then raise serialization_failure using message='ENJAZ_ORG_OWNERSHIP_STALE'; end if;
    v_same:=v_old.scope_type=p_scope_type and v_old.branch_id is not distinct from p_branch_id and v_old.department_id is not distinct from p_department_id and v_old.team_id is not distinct from p_team_id;
    if v_same then
      return jsonb_build_object('ownershipId',v_old.id,'version',v_old.version,'wasCreated',false,'wasNoop',true);
    end if;
    if not v_owner and (
      not private.can_manage_organization_scope_v1(p_workspace_id,v_old.scope_type,v_old.branch_id,v_old.department_id,v_old.team_id)
      or not private.can_manage_organization_scope_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id)
    ) then raise insufficient_privilege using message='ENJAZ_ORG_TRANSFER_MANAGE_BOTH_REQUIRED'; end if;
    update public.transaction_organization_ownership set scope_type=p_scope_type,branch_id=p_branch_id,department_id=p_department_id,team_id=p_team_id,assigned_by=v_actor,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=v_old.id returning * into v_row;
    insert into public.transaction_organization_ownership_events(workspace_id,ownership_id,transaction_id,event_type,from_scope_type,from_branch_id,from_department_id,from_team_id,to_scope_type,to_branch_id,to_department_id,to_team_id,reason,actor_user_id)
    values(p_workspace_id,v_row.id,p_transaction_id,'transferred',v_old.scope_type,v_old.branch_id,v_old.department_id,v_old.team_id,p_scope_type,p_branch_id,p_department_id,p_team_id,btrim(p_reason),v_actor);
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_created then 'organization.transaction.assigned' else 'organization.transaction.transferred' end,'transaction_organization_ownership',v_row.id,'Transaction organizational ownership changed',jsonb_build_object('transactionId',p_transaction_id,'scopeType',v_row.scope_type,'branchId',v_row.branch_id,'departmentId',v_row.department_id,'teamId',v_row.team_id,'version',v_row.version,'transactionLifecycleMutated',false,'financeLedgerMutated',false));
  return jsonb_build_object('ownershipId',v_row.id,'version',v_row.version,'scopeType',v_row.scope_type,'branchId',v_row.branch_id,'departmentId',v_row.department_id,'teamId',v_row.team_id,'wasCreated',v_created,'wasNoop',false);
end;
$$;

create or replace function public.assign_transaction_organization_v1(
  p_workspace_id uuid,p_transaction_id uuid,p_expected_version integer,
  p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid,p_reason text
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.assign_transaction_organization_v1_impl(p_workspace_id,p_transaction_id,p_expected_version,p_scope_type,p_branch_id,p_department_id,p_team_id,p_reason);
$$;

-- -----------------------------------------------------------------------------
-- Read/explain contract
-- -----------------------------------------------------------------------------

create or replace function public.explain_organization_access_v1(
  p_workspace_id uuid,p_scope_type text,p_branch_id uuid,p_department_id uuid,p_team_id uuid
)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_actor uuid; v_owner boolean; v_source uuid; v_scope public.organization_scope_memberships%rowtype;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  v_owner:=private.is_organization_owner_v1(p_workspace_id);
  if v_owner then return jsonb_build_object('allowed',true,'actorType','owner','source','workspace_owner','sourceMembershipId',null); end if;
  v_source:=private.organization_scope_source_v1(p_workspace_id,p_scope_type,p_branch_id,p_department_id,p_team_id,false);
  if v_source is null then return jsonb_build_object('allowed',false,'actorType','workforce','source',null,'sourceMembershipId',null); end if;
  select * into v_scope from public.organization_scope_memberships s where s.workspace_id=p_workspace_id and s.id=v_source;
  return jsonb_build_object('allowed',true,'actorType','workforce','source','explicit_or_downward_inherited','sourceMembershipId',v_scope.id,'sourceScopeType',v_scope.scope_type,'sourceRole',v_scope.scope_role,'sourceBranchId',v_scope.branch_id,'sourceDepartmentId',v_scope.department_id,'sourceTeamId',v_scope.team_id);
end;
$$;

create or replace function public.get_organization_context_v1(p_workspace_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_actor uuid; v_owner boolean; v_member_id uuid;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  v_owner:=private.is_organization_owner_v1(p_workspace_id);
  v_member_id:=private.current_organization_member_id_v1(p_workspace_id);
  return jsonb_build_object(
    'authority','organization_structure_scoped_ownership',
    'workspaceTrustAuthority','legacy_owner_only_unchanged',
    'workforceAuthority','organization_members_and_scope_memberships',
    'legacyWorkspaceWideAccessForWorkforce','forbidden',
    'transactionLifecycleWriteAuthority','none',
    'financeLedgerWriteAuthority','none',
    'actor',jsonb_build_object('userId',v_actor,'actorType',case when v_owner then 'owner' else 'workforce' end,'organizationMemberId',v_member_id),
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'userId',m.user_id,'status',m.status,'validFrom',m.valid_from,'validUntil',m.valid_until,'version',m.version) order by m.created_at) from public.organization_members m where m.workspace_id=p_workspace_id),'[]'::jsonb),
    'branches',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'code',b.code,'address',b.address,'status',b.status,'version',b.version,'accessSourceMembershipId',case when v_owner then null else private.organization_scope_source_v1(b.workspace_id,'branch',b.id,null,null,false) end) order by b.name) from public.organization_branches b where b.workspace_id=p_workspace_id),'[]'::jsonb),
    'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'branchId',d.branch_id,'name',d.name,'code',d.code,'status',d.status,'version',d.version,'accessSourceMembershipId',case when v_owner then null else private.organization_scope_source_v1(d.workspace_id,'department',null,d.id,null,false) end) order by d.name) from public.organization_departments d where d.workspace_id=p_workspace_id),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'departmentId',t.department_id,'name',t.name,'code',t.code,'status',t.status,'version',t.version,'accessSourceMembershipId',case when v_owner then null else private.organization_scope_source_v1(t.workspace_id,'team',null,null,t.id,false) end) order by t.name) from public.organization_teams t where t.workspace_id=p_workspace_id),'[]'::jsonb),
    'scopeMemberships',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'organizationMemberId',s.organization_member_id,'scopeType',s.scope_type,'branchId',s.branch_id,'departmentId',s.department_id,'teamId',s.team_id,'scopeRole',s.scope_role,'status',s.status,'validFrom',s.valid_from,'validUntil',s.valid_until,'version',s.version) order by s.created_at) from public.organization_scope_memberships s where s.workspace_id=p_workspace_id),'[]'::jsonb),
    'transactions',private.organization_scoped_transactions_v1(p_workspace_id),
    'ownershipEvents',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'transactionId',e.transaction_id,'eventType',e.event_type,'fromScopeType',e.from_scope_type,'fromBranchId',e.from_branch_id,'fromDepartmentId',e.from_department_id,'fromTeamId',e.from_team_id,'toScopeType',e.to_scope_type,'toBranchId',e.to_branch_id,'toDepartmentId',e.to_department_id,'toTeamId',e.to_team_id,'reason',e.reason,'actorUserId',e.actor_user_id,'createdAt',e.created_at) order by e.created_at desc) from public.transaction_organization_ownership_events e where e.workspace_id=p_workspace_id),'[]'::jsonb)
  );
end;
$$;

-- Function execution is allow-listed. Private functions remain outside exposed schemas and validate auth.uid().
revoke all on function private.is_organization_owner_v1(uuid) from public,anon;
revoke all on function private.current_organization_member_id_v1(uuid) from public,anon;
revoke all on function private.require_organization_actor_v1(uuid) from public,anon;
revoke all on function private.require_organization_owner_v1(uuid) from public,anon;
revoke all on function private.validate_organization_scope_target_v1(uuid,text,uuid,uuid,uuid) from public,anon;
revoke all on function private.organization_scope_source_v1(uuid,text,uuid,uuid,uuid,boolean) from public,anon;
revoke all on function private.can_access_organization_scope_v1(uuid,text,uuid,uuid,uuid) from public,anon;
revoke all on function private.can_manage_organization_scope_v1(uuid,text,uuid,uuid,uuid) from public,anon;
revoke all on function private.organization_scoped_transactions_v1(uuid) from public,anon;
revoke all on function private.set_organization_member_v1_impl(uuid,uuid,text,timestamptz) from public,anon;
revoke all on function private.save_organization_branch_v1_impl(uuid,uuid,integer,text,text,text,text) from public,anon;
revoke all on function private.save_organization_department_v1_impl(uuid,uuid,integer,uuid,text,text,text) from public,anon;
revoke all on function private.save_organization_team_v1_impl(uuid,uuid,integer,uuid,text,text,text) from public,anon;
revoke all on function private.set_organization_scope_membership_v1_impl(uuid,uuid,integer,uuid,text,uuid,uuid,uuid,text,text,timestamptz,timestamptz) from public,anon;
revoke all on function private.assign_transaction_organization_v1_impl(uuid,uuid,integer,text,uuid,uuid,uuid,text) from public,anon;

grant execute on function private.is_organization_owner_v1(uuid) to authenticated;
grant execute on function private.current_organization_member_id_v1(uuid) to authenticated;
grant execute on function private.require_organization_actor_v1(uuid) to authenticated;
grant execute on function private.require_organization_owner_v1(uuid) to authenticated;
grant execute on function private.validate_organization_scope_target_v1(uuid,text,uuid,uuid,uuid) to authenticated;
grant execute on function private.organization_scope_source_v1(uuid,text,uuid,uuid,uuid,boolean) to authenticated;
grant execute on function private.can_access_organization_scope_v1(uuid,text,uuid,uuid,uuid) to authenticated;
grant execute on function private.can_manage_organization_scope_v1(uuid,text,uuid,uuid,uuid) to authenticated;
grant execute on function private.organization_scoped_transactions_v1(uuid) to authenticated;
grant execute on function private.set_organization_member_v1_impl(uuid,uuid,text,timestamptz) to authenticated;
grant execute on function private.save_organization_branch_v1_impl(uuid,uuid,integer,text,text,text,text) to authenticated;
grant execute on function private.save_organization_department_v1_impl(uuid,uuid,integer,uuid,text,text,text) to authenticated;
grant execute on function private.save_organization_team_v1_impl(uuid,uuid,integer,uuid,text,text,text) to authenticated;
grant execute on function private.set_organization_scope_membership_v1_impl(uuid,uuid,integer,uuid,text,uuid,uuid,uuid,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function private.assign_transaction_organization_v1_impl(uuid,uuid,integer,text,uuid,uuid,uuid,text) to authenticated;

revoke all on function public.set_organization_member_v1(uuid,uuid,text,timestamptz) from public,anon;
revoke all on function public.save_organization_branch_v1(uuid,uuid,integer,text,text,text,text) from public,anon;
revoke all on function public.save_organization_department_v1(uuid,uuid,integer,uuid,text,text,text) from public,anon;
revoke all on function public.save_organization_team_v1(uuid,uuid,integer,uuid,text,text,text) from public,anon;
revoke all on function public.set_organization_scope_membership_v1(uuid,uuid,integer,uuid,text,uuid,uuid,uuid,text,text,timestamptz,timestamptz) from public,anon;
revoke all on function public.assign_transaction_organization_v1(uuid,uuid,integer,text,uuid,uuid,uuid,text) from public,anon;
revoke all on function public.explain_organization_access_v1(uuid,text,uuid,uuid,uuid) from public,anon;
revoke all on function public.get_organization_context_v1(uuid) from public,anon;

grant execute on function public.set_organization_member_v1(uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.save_organization_branch_v1(uuid,uuid,integer,text,text,text,text) to authenticated;
grant execute on function public.save_organization_department_v1(uuid,uuid,integer,uuid,text,text,text) to authenticated;
grant execute on function public.save_organization_team_v1(uuid,uuid,integer,uuid,text,text,text) to authenticated;
grant execute on function public.set_organization_scope_membership_v1(uuid,uuid,integer,uuid,text,uuid,uuid,uuid,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.assign_transaction_organization_v1(uuid,uuid,integer,text,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.explain_organization_access_v1(uuid,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.get_organization_context_v1(uuid) to authenticated;

commit;
