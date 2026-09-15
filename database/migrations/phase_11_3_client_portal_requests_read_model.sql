-- ENJAZ Phase 11.3-B — governed client request source + completed client-safe read model
-- Requests are native M3 interaction records, not shadow Company/Transaction/Document/Finance truth.
-- Client mutation/fulfilment remains Phase 11.3-C; this migration only creates the staff-governed
-- request source and exposes its safe projection through the existing portal read-model RPC.

begin;

-- -----------------------------------------------------------------------------
-- "What we need from you" queue authority.
-- -----------------------------------------------------------------------------

create table public.client_portal_requests (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  transaction_id uuid not null,
  request_type text not null check (request_type in ('document','approval','information','appointment','payment')),
  required_permission text not null check (required_permission in ('upload_requested_document','approve_document','message','confirm_appointment','view_finance')),
  resource_share_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  instructions text check (instructions is null or char_length(btrim(instructions)) between 1 and 2400),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','fulfilled','cancelled')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_requests_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_requests_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_requests_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint client_portal_requests_resource_share_fk foreign key(workspace_id,resource_share_id)
    references public.client_portal_resource_shares(workspace_id,id) on delete restrict,
  constraint client_portal_requests_permission_mapping_check check (
    (request_type='document' and required_permission='upload_requested_document' and resource_share_id is null)
    or (request_type='approval' and required_permission='approve_document' and resource_share_id is not null)
    or (request_type='information' and required_permission='message' and resource_share_id is null)
    or (request_type='appointment' and required_permission='confirm_appointment' and resource_share_id is null)
    or (request_type='payment' and required_permission='view_finance' and resource_share_id is null)
  ),
  constraint client_portal_requests_validity_check check (valid_until is null or valid_until > valid_from)
);

create index client_portal_requests_queue_idx
  on public.client_portal_requests(workspace_id,principal_id,status,revoked_at,due_at,created_at desc);
create index client_portal_requests_transaction_idx
  on public.client_portal_requests(workspace_id,principal_id,transaction_id,request_type,revoked_at);
create index client_portal_requests_resource_share_idx
  on public.client_portal_requests(workspace_id,resource_share_id)
  where resource_share_id is not null;

create trigger client_portal_requests_set_updated_at
before update on public.client_portal_requests
for each row execute function private.set_updated_at();

alter table public.client_portal_requests enable row level security;
revoke all on table public.client_portal_requests from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Staff/owner publication boundary. Client fulfilment is intentionally absent.
-- -----------------------------------------------------------------------------

create or replace function private.client_portal_request_permission_v1(p_request_type text)
returns text language sql immutable security definer set search_path='' as $$
  select case p_request_type
    when 'document' then 'upload_requested_document'
    when 'approval' then 'approve_document'
    when 'information' then 'message'
    when 'appointment' then 'confirm_appointment'
    when 'payment' then 'view_finance'
    else null
  end;
$$;

create or replace function private.validate_client_portal_request_resource_v1(
  p_workspace_id uuid,p_principal_id uuid,p_transaction_id uuid,p_request_type text,p_resource_share_id uuid
)
returns void language plpgsql stable security definer set search_path='' as $$
declare v_share public.client_portal_resource_shares%rowtype;
begin
  if p_request_type='approval' then
    if p_resource_share_id is null then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_APPROVAL_SHARE_REQUIRED';
    end if;
    select * into v_share from public.client_portal_resource_shares s
    where s.workspace_id=p_workspace_id and s.id=p_resource_share_id
      and s.principal_id=p_principal_id and s.transaction_id=p_transaction_id
      and s.resource_type='document' and s.document_id is not null
      and s.revoked_at is null and s.valid_from<=now()
      and (s.valid_until is null or s.valid_until>now());
    if not found then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_APPROVAL_SHARE_INVALID';
    end if;
  elsif p_resource_share_id is not null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_RESOURCE_NOT_ALLOWED';
  end if;
end;
$$;

create or replace function private.record_client_portal_request_audit_v1(
  p_workspace_id uuid,p_actor uuid,p_request public.client_portal_requests,p_action text,p_reason text default null
)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,p_actor,p_action,'client_portal_request',p_request.id,'Client portal request changed',
    jsonb_build_object(
      'principalId',p_request.principal_id,
      'transactionId',p_request.transaction_id,
      'requestType',p_request.request_type,
      'requiredPermission',p_request.required_permission,
      'resourceShareId',p_request.resource_share_id,
      'status',p_request.status,
      'dueAt',p_request.due_at,
      'validFrom',p_request.valid_from,
      'validUntil',p_request.valid_until,
      'version',p_request.version,
      'reason',nullif(btrim(coalesce(p_reason,'')),'')
    )
  );
end;
$$;

create or replace function private.save_client_portal_request_v1_impl(
  p_workspace_id uuid,p_principal_id uuid,p_request_id uuid,p_expected_version integer,
  p_transaction_id uuid,p_request_type text,p_title text,p_instructions text,p_due_at timestamptz,
  p_valid_from timestamptz,p_valid_until timestamptz,p_resource_share_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid;
  v_permission text;
  v_request public.client_portal_requests%rowtype;
  v_from timestamptz;
  v_created boolean:=false;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  perform private.require_client_portal_shareable_principal_v1(p_workspace_id,p_principal_id);

  if p_request_id is null or p_transaction_id is null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_ID_INVALID';
  end if;
  v_permission:=private.client_portal_request_permission_v1(p_request_type);
  if v_permission is null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_TYPE_INVALID';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 320 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_TITLE_INVALID';
  end if;
  if p_instructions is not null and char_length(btrim(p_instructions)) not between 1 and 2400 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_INSTRUCTIONS_INVALID';
  end if;
  if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_TRANSACTION_INVALID';
  end if;
  if not private.client_portal_principal_has_grant_v1(p_workspace_id,p_principal_id,p_transaction_id,v_permission) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED';
  end if;
  perform private.validate_client_portal_request_resource_v1(
    p_workspace_id,p_principal_id,p_transaction_id,p_request_type,p_resource_share_id
  );

  select * into v_request from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id;

  if found then
    v_from:=coalesce(p_valid_from,v_request.valid_from);
    if p_valid_until is not null and p_valid_until<=v_from then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_VALIDITY_INVALID';
    end if;
    if v_request.principal_id<>p_principal_id
       or v_request.transaction_id<>p_transaction_id
       or v_request.request_type<>p_request_type
       or v_request.resource_share_id is distinct from p_resource_share_id then
      raise unique_violation using message='ENJAZ_PORTAL_REQUEST_ID_CONFLICT';
    end if;
    if v_request.revoked_at is not null then
      raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_REQUEST_REVOKED';
    end if;
    if p_expected_version is null then
      if v_request.title=btrim(p_title)
         and v_request.instructions is not distinct from nullif(btrim(coalesce(p_instructions,'')),'')
         and v_request.due_at is not distinct from p_due_at
         and v_request.valid_from=v_from
         and v_request.valid_until is not distinct from p_valid_until then
        return jsonb_build_object('requestId',v_request.id,'version',v_request.version,'wasCreated',false,'wasDuplicate',true);
      end if;
      raise serialization_failure using message='ENJAZ_PORTAL_REQUEST_EXPECTED_VERSION_REQUIRED';
    end if;
    if p_expected_version<>v_request.version then
      raise serialization_failure using message='ENJAZ_PORTAL_REQUEST_STALE';
    end if;
    if v_request.status<>'open' then
      raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_REQUEST_NOT_OPEN';
    end if;
    update public.client_portal_requests
      set title=btrim(p_title),instructions=nullif(btrim(coalesce(p_instructions,'')),''),due_at=p_due_at,
          valid_from=v_from,valid_until=p_valid_until,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_request_id
    returning * into v_request;
  else
    v_from:=coalesce(p_valid_from,now());
    if p_valid_until is not null and p_valid_until<=v_from then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_VALIDITY_INVALID';
    end if;
    if p_expected_version is not null then
      raise serialization_failure using message='ENJAZ_PORTAL_REQUEST_CREATE_VERSION_INVALID';
    end if;
    insert into public.client_portal_requests(
      id,workspace_id,principal_id,transaction_id,request_type,required_permission,resource_share_id,
      title,instructions,due_at,status,valid_from,valid_until,created_by
    ) values(
      p_request_id,p_workspace_id,p_principal_id,p_transaction_id,p_request_type,v_permission,p_resource_share_id,
      btrim(p_title),nullif(btrim(coalesce(p_instructions,'')),''),p_due_at,'open',v_from,p_valid_until,v_actor
    ) returning * into v_request;
    v_created:=true;
  end if;

  perform private.record_client_portal_request_audit_v1(
    p_workspace_id,v_actor,v_request,
    case when v_created then 'client_portal.request.created' else 'client_portal.request.updated' end,
    null
  );

  return jsonb_build_object(
    'requestId',v_request.id,'principalId',v_request.principal_id,'transactionId',v_request.transaction_id,
    'requestType',v_request.request_type,'requiredPermission',v_request.required_permission,
    'resourceShareId',v_request.resource_share_id,'status',v_request.status,'version',v_request.version,
    'wasCreated',v_created,'wasDuplicate',false
  );
end;
$$;

create or replace function public.save_client_portal_request_v1(
  p_workspace_id uuid,p_principal_id uuid,p_request_id uuid,p_expected_version integer,
  p_transaction_id uuid,p_request_type text,p_title text,p_instructions text default null,p_due_at timestamptz default null,
  p_valid_from timestamptz default null,p_valid_until timestamptz default null,p_resource_share_id uuid default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_client_portal_request_v1_impl(
    p_workspace_id,p_principal_id,p_request_id,p_expected_version,p_transaction_id,p_request_type,
    p_title,p_instructions,p_due_at,p_valid_from,p_valid_until,p_resource_share_id
  );
$$;

create or replace function private.revoke_client_portal_request_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_request public.client_portal_requests%rowtype;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_reason,''))) not between 1 and 800 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_REQUEST_REVOKE_REASON_INVALID';
  end if;
  select * into v_request from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id;
  if not found then raise no_data_found using message='ENJAZ_PORTAL_REQUEST_NOT_FOUND'; end if;
  if p_expected_version is null or p_expected_version<>v_request.version then
    raise serialization_failure using message='ENJAZ_PORTAL_REQUEST_STALE';
  end if;
  if v_request.revoked_at is null then
    update public.client_portal_requests
      set status=case when status='open' then 'cancelled' else status end,
          revoked_at=now(),revoked_by=v_actor,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_request_id
    returning * into v_request;
    perform private.record_client_portal_request_audit_v1(
      p_workspace_id,v_actor,v_request,'client_portal.request.revoked',p_reason
    );
  end if;
  return jsonb_build_object('requestId',v_request.id,'status',v_request.status,'revokedAt',v_request.revoked_at,'version',v_request.version);
end;
$$;

create or replace function public.revoke_client_portal_request_v1(
  p_workspace_id uuid,p_request_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.revoke_client_portal_request_v1_impl(p_workspace_id,p_request_id,p_expected_version,p_reason);
$$;

-- -----------------------------------------------------------------------------
-- Fail-closed revocation propagation.
-- Explicit grant revocation or permission removal permanently retires affected requests.
-- Revoking a published approval target permanently retires its approval request.
-- -----------------------------------------------------------------------------

create or replace function private.revoke_client_portal_requests_on_grant_change_v1()
returns trigger language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
begin
  if old.target_type='transaction' and old.transaction_id is not null then
    if old.principal_id is distinct from new.principal_id
       or old.transaction_id is distinct from new.transaction_id
       or old.target_type is distinct from new.target_type
       or (old.revoked_at is null and new.revoked_at is not null) then
      for v_request in
        update public.client_portal_requests r
        set revoked_at=now(),revoked_by=v_actor,version=version+1,updated_at=now()
        where r.workspace_id=old.workspace_id and r.principal_id=old.principal_id
          and r.transaction_id=old.transaction_id and r.revoked_at is null
        returning r.*
      loop
        perform private.record_client_portal_request_audit_v1(
          v_request.workspace_id,v_actor,v_request,'client_portal.request.auto_revoked','transaction_grant_revoked_or_retargeted'
        );
      end loop;
    else
      for v_request in
        update public.client_portal_requests r
        set revoked_at=now(),revoked_by=v_actor,version=version+1,updated_at=now()
        where r.workspace_id=new.workspace_id and r.principal_id=new.principal_id
          and r.transaction_id=new.transaction_id and r.revoked_at is null
          and r.required_permission=any(old.permissions)
          and not (r.required_permission=any(new.permissions))
        returning r.*
      loop
        perform private.record_client_portal_request_audit_v1(
          v_request.workspace_id,v_actor,v_request,'client_portal.request.auto_revoked','required_permission_removed'
        );
      end loop;
    end if;
  end if;
  return new;
end;
$$;

create trigger client_portal_requests_revoke_on_grant_change
after update on public.client_portal_grants
for each row execute function private.revoke_client_portal_requests_on_grant_change_v1();

create or replace function private.revoke_client_portal_approval_requests_on_share_revoke_v1()
returns trigger language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
begin
  if old.revoked_at is null and new.revoked_at is not null then
    for v_request in
      update public.client_portal_requests r
      set revoked_at=now(),revoked_by=v_actor,version=version+1,updated_at=now()
      where r.workspace_id=new.workspace_id and r.resource_share_id=new.id and r.revoked_at is null
      returning r.*
    loop
      perform private.record_client_portal_request_audit_v1(
        v_request.workspace_id,v_actor,v_request,'client_portal.request.auto_revoked','approval_resource_unshared'
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger client_portal_approval_requests_revoke_on_share_revoke
after update on public.client_portal_resource_shares
for each row execute function private.revoke_client_portal_approval_requests_on_share_revoke_v1();

-- -----------------------------------------------------------------------------
-- Complete the existing read model without duplicating its canonical projections.
-- -----------------------------------------------------------------------------

create or replace function private.get_client_portal_read_model_v2_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_principal uuid;
  v_base jsonb;
  v_requests jsonb;
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  v_base:=private.get_client_portal_read_model_v1_impl(p_workspace_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,
    'transactionId',r.transaction_id,
    'requestType',r.request_type,
    'title',r.title,
    'instructions',r.instructions,
    'dueAt',r.due_at,
    'status',r.status,
    'resourceShareId',r.resource_share_id,
    'createdAt',r.created_at,
    'updatedAt',r.updated_at
  ) order by r.due_at nulls last,r.created_at,r.id),'[]'::jsonb)
  into v_requests
  from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.principal_id=v_principal
    and r.revoked_at is null and r.valid_from<=now()
    and (r.valid_until is null or r.valid_until>now())
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,r.required_permission)
    and (
      r.request_type<>'approval'
      or exists(
        select 1 from public.client_portal_resource_shares s
        where s.workspace_id=r.workspace_id and s.id=r.resource_share_id
          and s.principal_id=r.principal_id and s.transaction_id=r.transaction_id
          and s.resource_type='document' and s.revoked_at is null
          and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
      )
    );

  return jsonb_set(v_base,'{requests}',v_requests,true) - 'requestProjectionStatus';
end;
$$;

create or replace function public.get_client_portal_read_model_v1(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_client_portal_read_model_v2_impl(p_workspace_id);
$$;

-- -----------------------------------------------------------------------------
-- Privileges. No direct browser table authority; public surface is guarded RPC only.
-- -----------------------------------------------------------------------------

revoke all on function private.client_portal_request_permission_v1(text) from public,anon,authenticated;
revoke all on function private.validate_client_portal_request_resource_v1(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function private.record_client_portal_request_audit_v1(uuid,uuid,public.client_portal_requests,text,text) from public,anon,authenticated;
revoke all on function private.save_client_portal_request_v1_impl(uuid,uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,timestamptz,uuid) from public,anon;
revoke all on function private.revoke_client_portal_request_v1_impl(uuid,uuid,integer,text) from public,anon;
revoke all on function private.revoke_client_portal_requests_on_grant_change_v1() from public,anon,authenticated;
revoke all on function private.revoke_client_portal_approval_requests_on_share_revoke_v1() from public,anon,authenticated;
revoke all on function private.get_client_portal_read_model_v2_impl(uuid) from public,anon;

grant execute on function private.save_client_portal_request_v1_impl(uuid,uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function private.revoke_client_portal_request_v1_impl(uuid,uuid,integer,text) to authenticated;
grant execute on function private.get_client_portal_read_model_v2_impl(uuid) to authenticated;

revoke all on function public.save_client_portal_request_v1(uuid,uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,timestamptz,uuid) from public,anon;
revoke all on function public.revoke_client_portal_request_v1(uuid,uuid,integer,text) from public,anon;
revoke all on function public.get_client_portal_read_model_v1(uuid) from public,anon;

grant execute on function public.save_client_portal_request_v1(uuid,uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function public.revoke_client_portal_request_v1(uuid,uuid,integer,text) to authenticated;
grant execute on function public.get_client_portal_read_model_v1(uuid) to authenticated;

commit;
