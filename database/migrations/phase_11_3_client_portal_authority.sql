-- ENJAZ Phase 11.3B — Client Portal M3 database authority foundation
-- External client identities reuse auth.users but never inherit staff workspace/workforce trust.
-- Portal access is explicit, object-scoped, revocable, auditable and deny-by-default.

begin;

grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Dedicated external principal / grant / authority-audit model
-- -----------------------------------------------------------------------------

create table public.client_portal_principals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid,
  status text not null default 'invited' check (status in ('invited','active','revoked')),
  activated_at timestamptz,
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_principals_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_principals_workspace_user_key unique(workspace_id,user_id),
  constraint client_portal_principals_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint client_portal_principals_lifecycle_check check (
    (status='invited' and activated_at is null and revoked_at is null)
    or (status='active' and activated_at is not null and revoked_at is null)
    or (status='revoked' and revoked_at is not null)
  )
);

create table public.client_portal_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  target_type text not null check (target_type in ('company','transaction')),
  company_id uuid,
  transaction_id uuid,
  permissions text[] not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_grants_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_grants_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_grants_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on delete restrict,
  constraint client_portal_grants_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint client_portal_grants_target_check check (
    (target_type='company' and company_id is not null and transaction_id is null)
    or (target_type='transaction' and company_id is null and transaction_id is not null)
  ),
  constraint client_portal_grants_permissions_check check (
    cardinality(permissions) between 1 and 6
    and permissions <@ array['view','upload_requested_document','approve_document','message','confirm_appointment','view_finance']::text[]
    and 'view'=any(permissions)
  ),
  constraint client_portal_grants_validity_check check (valid_until is null or valid_until > valid_from)
);

create table public.client_portal_authority_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid,
  grant_id uuid,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'principal.created','principal.updated','principal.activated','principal.revoked',
    'grant.created','grant.updated','grant.revoked'
  )),
  reason text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  occurred_at timestamptz not null default now(),
  constraint client_portal_authority_events_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_authority_events_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete restrict,
  constraint client_portal_authority_events_grant_fk foreign key(workspace_id,grant_id)
    references public.client_portal_grants(workspace_id,id) on delete restrict
);

create index client_portal_principals_user_idx on public.client_portal_principals(user_id,workspace_id,status);
create index client_portal_principals_contact_idx on public.client_portal_principals(workspace_id,contact_id) where contact_id is not null;
create index client_portal_grants_principal_idx on public.client_portal_grants(workspace_id,principal_id,revoked_at,valid_from,valid_until);
create unique index client_portal_grants_company_active_unique
  on public.client_portal_grants(workspace_id,principal_id,company_id)
  where company_id is not null and revoked_at is null;
create unique index client_portal_grants_transaction_active_unique
  on public.client_portal_grants(workspace_id,principal_id,transaction_id)
  where transaction_id is not null and revoked_at is null;
create index client_portal_authority_events_principal_idx
  on public.client_portal_authority_events(workspace_id,principal_id,occurred_at desc);

create trigger client_portal_principals_set_updated_at
before update on public.client_portal_principals
for each row execute function private.set_updated_at();

create trigger client_portal_grants_set_updated_at
before update on public.client_portal_grants
for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- External authority helpers
-- -----------------------------------------------------------------------------

create or replace function private.is_client_portal_owner_v1(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_workspace_owner(p_workspace_id);
$$;

create or replace function private.require_client_portal_owner_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.is_client_portal_owner_v1(p_workspace_id) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_OWNER_REQUIRED';
  end if;
  return v_actor;
end;
$$;

create or replace function private.current_client_portal_principal_id_v1(p_workspace_id uuid)
returns uuid language sql stable security definer set search_path='' as $$
  select p.id
  from public.client_portal_principals p
  where p.workspace_id=p_workspace_id
    and p.user_id=(select auth.uid())
    and p.status='active'
    and p.activated_at is not null
    and p.revoked_at is null
  limit 1;
$$;

create or replace function private.require_client_portal_principal_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_principal uuid;
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED';
  end if;
  v_principal:=private.current_client_portal_principal_id_v1(p_workspace_id);
  if v_principal is null then
    raise insufficient_privilege using message='ENJAZ_PORTAL_WORKSPACE_FORBIDDEN';
  end if;
  return v_principal;
end;
$$;

create or replace function private.client_portal_grant_allows_v1(
  p_workspace_id uuid,p_target_type text,p_target_id uuid,p_permission text
)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.client_portal_grants g
    where g.workspace_id=p_workspace_id
      and g.principal_id=private.current_client_portal_principal_id_v1(p_workspace_id)
      and g.target_type=p_target_type
      and ((p_target_type='company' and g.company_id=p_target_id)
        or (p_target_type='transaction' and g.transaction_id=p_target_id))
      and g.revoked_at is null
      and g.valid_from<=now()
      and (g.valid_until is null or g.valid_until>now())
      and p_permission=any(g.permissions)
  );
$$;

create or replace function private.record_client_portal_authority_event_v1(
  p_workspace_id uuid,p_principal_id uuid,p_grant_id uuid,p_actor uuid,p_event_type text,p_reason text,p_details jsonb
)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare v_event_id uuid;
begin
  insert into public.client_portal_authority_events(
    workspace_id,principal_id,grant_id,actor_user_id,event_type,reason,details
  ) values(
    p_workspace_id,p_principal_id,p_grant_id,p_actor,p_event_type,nullif(btrim(p_reason),''),coalesce(p_details,'{}'::jsonb)
  ) returning id into v_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,p_actor,'client_portal.'||p_event_type,'client_portal_authority',coalesce(p_grant_id,p_principal_id),
    'Client portal authority changed',
    jsonb_build_object('principalId',p_principal_id,'grantId',p_grant_id,'reason',nullif(btrim(p_reason),''),'eventId',v_event_id)
      || coalesce(p_details,'{}'::jsonb)
  );
  return v_event_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Owner-only principal lifecycle. Portal identities are explicitly rejected if
-- the same user already holds staff/workforce trust in this workspace.
-- -----------------------------------------------------------------------------

create or replace function private.save_client_portal_principal_v1_impl(
  p_workspace_id uuid,p_user_id uuid,p_contact_id uuid,p_status text,p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_row public.client_portal_principals%rowtype;
  v_old_status text;
  v_created boolean:=false;
  v_event_type text;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);

  if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_USER_INVALID';
  end if;
  if exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_user_id) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_STAFF_TRUST_COLLISION';
  end if;
  if exists(select 1 from public.organization_members om where om.workspace_id=p_workspace_id and om.user_id=p_user_id) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_WORKFORCE_TRUST_COLLISION';
  end if;
  if p_contact_id is not null and not exists(
    select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id and c.deleted_at is null
  ) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_CONTACT_INVALID';
  end if;
  if p_status not in ('invited','active','revoked') then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_PRINCIPAL_STATUS_INVALID';
  end if;

  select * into v_row
  from public.client_portal_principals p
  where p.workspace_id=p_workspace_id and p.user_id=p_user_id;

  if not found then
    if p_expected_version is not null then
      raise serialization_failure using message='ENJAZ_PORTAL_PRINCIPAL_CREATE_VERSION_INVALID';
    end if;
    if p_status='revoked' then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_PRINCIPAL_CREATE_REVOKED_INVALID';
    end if;
    insert into public.client_portal_principals(
      workspace_id,user_id,contact_id,status,activated_at,revoked_at,created_by
    ) values(
      p_workspace_id,p_user_id,p_contact_id,p_status,
      case when p_status='active' then now() else null end,
      null,v_actor
    ) returning * into v_row;
    v_created:=true;
    v_event_type:=case when p_status='active' then 'principal.activated' else 'principal.created' end;
  else
    v_old_status:=v_row.status;
    if p_expected_version is null or p_expected_version<>v_row.version then
      raise serialization_failure using message='ENJAZ_PORTAL_PRINCIPAL_STALE';
    end if;

    update public.client_portal_principals
    set contact_id=p_contact_id,
        status=p_status,
        activated_at=case
          when p_status='invited' then null
          when p_status='active' then coalesce(activated_at,now())
          else activated_at
        end,
        revoked_at=case when p_status='revoked' then now() else null end,
        version=version+1,
        updated_at=now()
    where workspace_id=p_workspace_id and id=v_row.id
    returning * into v_row;

    if p_status<>'active' then
      update public.client_portal_grants
      set revoked_at=coalesce(revoked_at,now()),version=case when revoked_at is null then version+1 else version end,updated_at=now()
      where workspace_id=p_workspace_id and principal_id=v_row.id and revoked_at is null;
    end if;

    v_event_type:=case
      when p_status='revoked' then 'principal.revoked'
      when p_status='active' and v_old_status<>'active' then 'principal.activated'
      else 'principal.updated'
    end;
  end if;

  perform private.record_client_portal_authority_event_v1(
    p_workspace_id,v_row.id,null,v_actor,v_event_type,null,
    jsonb_build_object('userId',v_row.user_id,'contactId',v_row.contact_id,'status',v_row.status,'version',v_row.version,'wasCreated',v_created)
  );

  return jsonb_build_object(
    'principalId',v_row.id,'userId',v_row.user_id,'contactId',v_row.contact_id,
    'status',v_row.status,'version',v_row.version,'wasCreated',v_created
  );
end;
$$;

create or replace function public.save_client_portal_principal_v1(
  p_workspace_id uuid,p_user_id uuid,p_contact_id uuid,p_status text,p_expected_version integer default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_client_portal_principal_v1_impl(p_workspace_id,p_user_id,p_contact_id,p_status,p_expected_version);
$$;

-- -----------------------------------------------------------------------------
-- Owner-only explicit object grants. A company grant never implies transaction
-- access; transaction authority requires its own transaction row.
-- -----------------------------------------------------------------------------

create or replace function private.save_client_portal_grant_v1_impl(
  p_workspace_id uuid,p_principal_id uuid,p_grant_id uuid,p_expected_version integer,
  p_target_type text,p_target_id uuid,p_permissions text[],p_valid_from timestamptz,p_valid_until timestamptz
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_principal public.client_portal_principals%rowtype;
  v_row public.client_portal_grants%rowtype;
  v_permissions text[];
  v_from timestamptz:=coalesce(p_valid_from,now());
  v_created boolean:=false;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);

  select * into v_principal from public.client_portal_principals p
  where p.workspace_id=p_workspace_id and p.id=p_principal_id;
  if not found or v_principal.status='revoked' or v_principal.revoked_at is not null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_PRINCIPAL_NOT_GRANTABLE';
  end if;

  if p_target_type='company' then
    if p_target_id is null or not exists(
      select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_target_id and c.deleted_at is null
    ) then raise invalid_parameter_value using message='ENJAZ_PORTAL_COMPANY_TARGET_INVALID'; end if;
  elsif p_target_type='transaction' then
    if p_target_id is null or not exists(
      select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_target_id and t.deleted_at is null
    ) then raise invalid_parameter_value using message='ENJAZ_PORTAL_TRANSACTION_TARGET_INVALID'; end if;
  else
    raise invalid_parameter_value using message='ENJAZ_PORTAL_GRANT_TARGET_TYPE_INVALID';
  end if;

  select coalesce(array_agg(x order by x),'{}'::text[]) into v_permissions
  from (select distinct unnest(coalesce(p_permissions,'{}'::text[])) as x) q;
  if cardinality(v_permissions)<1 or cardinality(v_permissions)>6
     or not (v_permissions <@ array['view','upload_requested_document','approve_document','message','confirm_appointment','view_finance']::text[])
     or not ('view'=any(v_permissions)) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_GRANT_PERMISSIONS_INVALID';
  end if;
  if p_valid_until is not null and p_valid_until<=v_from then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_GRANT_VALIDITY_INVALID';
  end if;

  if p_grant_id is null then
    if p_expected_version is not null then
      raise serialization_failure using message='ENJAZ_PORTAL_GRANT_CREATE_VERSION_INVALID';
    end if;
    insert into public.client_portal_grants(
      workspace_id,principal_id,target_type,company_id,transaction_id,permissions,valid_from,valid_until,created_by
    ) values(
      p_workspace_id,p_principal_id,p_target_type,
      case when p_target_type='company' then p_target_id else null end,
      case when p_target_type='transaction' then p_target_id else null end,
      v_permissions,v_from,p_valid_until,v_actor
    ) returning * into v_row;
    v_created:=true;
  else
    select * into v_row from public.client_portal_grants g
    where g.workspace_id=p_workspace_id and g.id=p_grant_id and g.principal_id=p_principal_id;
    if not found then raise no_data_found using message='ENJAZ_PORTAL_GRANT_NOT_FOUND'; end if;
    if v_row.revoked_at is not null then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_GRANT_REVOKED'; end if;
    if p_expected_version is null or p_expected_version<>v_row.version then
      raise serialization_failure using message='ENJAZ_PORTAL_GRANT_STALE';
    end if;
    if v_row.target_type<>p_target_type
       or (p_target_type='company' and v_row.company_id<>p_target_id)
       or (p_target_type='transaction' and v_row.transaction_id<>p_target_id) then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_GRANT_TARGET_IMMUTABLE';
    end if;
    update public.client_portal_grants
    set permissions=v_permissions,valid_from=v_from,valid_until=p_valid_until,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_grant_id
    returning * into v_row;
  end if;

  perform private.record_client_portal_authority_event_v1(
    p_workspace_id,p_principal_id,v_row.id,v_actor,
    case when v_created then 'grant.created' else 'grant.updated' end,null,
    jsonb_build_object('targetType',v_row.target_type,'targetId',coalesce(v_row.company_id,v_row.transaction_id),'permissions',v_row.permissions,'validFrom',v_row.valid_from,'validUntil',v_row.valid_until,'version',v_row.version)
  );

  return jsonb_build_object(
    'grantId',v_row.id,'principalId',v_row.principal_id,'targetType',v_row.target_type,
    'targetId',coalesce(v_row.company_id,v_row.transaction_id),'permissions',v_row.permissions,
    'validFrom',v_row.valid_from,'validUntil',v_row.valid_until,'version',v_row.version,'wasCreated',v_created
  );
end;
$$;

create or replace function public.save_client_portal_grant_v1(
  p_workspace_id uuid,p_principal_id uuid,p_grant_id uuid,p_expected_version integer,
  p_target_type text,p_target_id uuid,p_permissions text[],p_valid_from timestamptz default null,p_valid_until timestamptz default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_client_portal_grant_v1_impl(
    p_workspace_id,p_principal_id,p_grant_id,p_expected_version,p_target_type,p_target_id,p_permissions,p_valid_from,p_valid_until
  );
$$;

create or replace function private.revoke_client_portal_grant_v1_impl(
  p_workspace_id uuid,p_grant_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_row public.client_portal_grants%rowtype;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_reason,''))) not between 1 and 800 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REVOKE_REASON_INVALID';
  end if;
  select * into v_row from public.client_portal_grants g where g.workspace_id=p_workspace_id and g.id=p_grant_id;
  if not found then raise no_data_found using message='ENJAZ_PORTAL_GRANT_NOT_FOUND'; end if;
  if p_expected_version is null or p_expected_version<>v_row.version then
    raise serialization_failure using message='ENJAZ_PORTAL_GRANT_STALE';
  end if;
  if v_row.revoked_at is null then
    update public.client_portal_grants
    set revoked_at=now(),version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_grant_id returning * into v_row;
    perform private.record_client_portal_authority_event_v1(
      p_workspace_id,v_row.principal_id,v_row.id,v_actor,'grant.revoked',p_reason,
      jsonb_build_object('targetType',v_row.target_type,'targetId',coalesce(v_row.company_id,v_row.transaction_id),'version',v_row.version)
    );
  end if;
  return jsonb_build_object('grantId',v_row.id,'revokedAt',v_row.revoked_at,'version',v_row.version);
end;
$$;

create or replace function public.revoke_client_portal_grant_v1(
  p_workspace_id uuid,p_grant_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.revoke_client_portal_grant_v1_impl(p_workspace_id,p_grant_id,p_expected_version,p_reason);
$$;

-- -----------------------------------------------------------------------------
-- Read-only authority context. These functions expose only portal authority,
-- never staff notes/risk/intelligence/core-table write authority.
-- -----------------------------------------------------------------------------

create or replace function private.list_client_portal_workspaces_v1_impl()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'workspaceId',p.workspace_id,'workspaceName',w.name,'principalId',p.id,'status',p.status
    ) order by w.name)
    from public.client_portal_principals p
    join public.workspaces w on w.id=p.workspace_id
    where p.user_id=v_actor and p.status='active' and p.activated_at is not null and p.revoked_at is null
  ),'[]'::jsonb);
end;
$$;

create or replace function public.list_client_portal_workspaces_v1()
returns jsonb language sql security invoker set search_path='' as $$
  select private.list_client_portal_workspaces_v1_impl();
$$;

create or replace function private.get_client_portal_authority_v1_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_principal uuid; v_user uuid := (select auth.uid());
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  return jsonb_build_object(
    'workspaceId',p_workspace_id,
    'principalId',v_principal,
    'userId',v_user,
    'grants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',g.id,'targetType',g.target_type,'targetId',coalesce(g.company_id,g.transaction_id),
        'permissions',g.permissions,'validFrom',g.valid_from,'validUntil',g.valid_until,'version',g.version
      ) order by g.created_at)
      from public.client_portal_grants g
      where g.workspace_id=p_workspace_id and g.principal_id=v_principal
        and g.revoked_at is null and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.get_client_portal_authority_v1(p_workspace_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.get_client_portal_authority_v1_impl(p_workspace_id);
$$;

create or replace function private.get_client_portal_admin_authority_v1_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  return jsonb_build_object(
    'workspaceId',p_workspace_id,
    'principals',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'userId',p.user_id,'contactId',p.contact_id,'status',p.status,
        'activatedAt',p.activated_at,'revokedAt',p.revoked_at,'version',p.version
      ) order by p.created_at)
      from public.client_portal_principals p where p.workspace_id=p_workspace_id
    ),'[]'::jsonb),
    'grants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',g.id,'principalId',g.principal_id,'targetType',g.target_type,
        'targetId',coalesce(g.company_id,g.transaction_id),'permissions',g.permissions,
        'validFrom',g.valid_from,'validUntil',g.valid_until,'revokedAt',g.revoked_at,'version',g.version
      ) order by g.created_at)
      from public.client_portal_grants g where g.workspace_id=p_workspace_id
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.get_client_portal_admin_authority_v1(p_workspace_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.get_client_portal_admin_authority_v1_impl(p_workspace_id);
$$;

-- -----------------------------------------------------------------------------
-- Fail-closed RLS and privileges. Browser-authenticated clients never receive
-- direct authority-table or core-table DML through this migration.
-- -----------------------------------------------------------------------------

alter table public.client_portal_principals enable row level security;
alter table public.client_portal_grants enable row level security;
alter table public.client_portal_authority_events enable row level security;

revoke all on table public.client_portal_principals,public.client_portal_grants,public.client_portal_authority_events
from public,anon,authenticated;

revoke all on function private.is_client_portal_owner_v1(uuid) from public,anon;
revoke all on function private.require_client_portal_owner_v1(uuid) from public,anon;
revoke all on function private.current_client_portal_principal_id_v1(uuid) from public,anon;
revoke all on function private.require_client_portal_principal_v1(uuid) from public,anon;
revoke all on function private.client_portal_grant_allows_v1(uuid,text,uuid,text) from public,anon;
revoke all on function private.record_client_portal_authority_event_v1(uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon;
revoke all on function private.save_client_portal_principal_v1_impl(uuid,uuid,uuid,text,integer) from public,anon;
revoke all on function private.save_client_portal_grant_v1_impl(uuid,uuid,uuid,integer,text,uuid,text[],timestamptz,timestamptz) from public,anon;
revoke all on function private.revoke_client_portal_grant_v1_impl(uuid,uuid,integer,text) from public,anon;
revoke all on function private.list_client_portal_workspaces_v1_impl() from public,anon;
revoke all on function private.get_client_portal_authority_v1_impl(uuid) from public,anon;
revoke all on function private.get_client_portal_admin_authority_v1_impl(uuid) from public,anon;

grant execute on function private.is_client_portal_owner_v1(uuid) to authenticated;
grant execute on function private.require_client_portal_owner_v1(uuid) to authenticated;
grant execute on function private.current_client_portal_principal_id_v1(uuid) to authenticated;
grant execute on function private.require_client_portal_principal_v1(uuid) to authenticated;
grant execute on function private.client_portal_grant_allows_v1(uuid,text,uuid,text) to authenticated;
grant execute on function private.record_client_portal_authority_event_v1(uuid,uuid,uuid,uuid,text,text,jsonb) to authenticated;
grant execute on function private.save_client_portal_principal_v1_impl(uuid,uuid,uuid,text,integer) to authenticated;
grant execute on function private.save_client_portal_grant_v1_impl(uuid,uuid,uuid,integer,text,uuid,text[],timestamptz,timestamptz) to authenticated;
grant execute on function private.revoke_client_portal_grant_v1_impl(uuid,uuid,integer,text) to authenticated;
grant execute on function private.list_client_portal_workspaces_v1_impl() to authenticated;
grant execute on function private.get_client_portal_authority_v1_impl(uuid) to authenticated;
grant execute on function private.get_client_portal_admin_authority_v1_impl(uuid) to authenticated;

revoke all on function public.save_client_portal_principal_v1(uuid,uuid,uuid,text,integer) from public,anon;
revoke all on function public.save_client_portal_grant_v1(uuid,uuid,uuid,integer,text,uuid,text[],timestamptz,timestamptz) from public,anon;
revoke all on function public.revoke_client_portal_grant_v1(uuid,uuid,integer,text) from public,anon;
revoke all on function public.list_client_portal_workspaces_v1() from public,anon;
revoke all on function public.get_client_portal_authority_v1(uuid) from public,anon;
revoke all on function public.get_client_portal_admin_authority_v1(uuid) from public,anon;

grant execute on function public.save_client_portal_principal_v1(uuid,uuid,uuid,text,integer) to authenticated;
grant execute on function public.save_client_portal_grant_v1(uuid,uuid,uuid,integer,text,uuid,text[],timestamptz,timestamptz) to authenticated;
grant execute on function public.revoke_client_portal_grant_v1(uuid,uuid,integer,text) to authenticated;
grant execute on function public.list_client_portal_workspaces_v1() to authenticated;
grant execute on function public.get_client_portal_authority_v1(uuid) to authenticated;
grant execute on function public.get_client_portal_admin_authority_v1(uuid) to authenticated;

commit;
