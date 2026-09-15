-- ENJAZ Phase 11.3-B — Client-safe read model foundation
-- Read truth remains in canonical Company / Transaction / Document / Payment sources.
-- Child resources require explicit per-principal publication in addition to an active
-- exact transaction grant. No internal notes, risk, intelligence, ledger or raw storage
-- paths are projected.

begin;

-- -----------------------------------------------------------------------------
-- Explicit publication metadata for client-visible child resources.
-- This is visibility authority only; it is not a shadow Document or Finance store.
-- -----------------------------------------------------------------------------

create table public.client_portal_resource_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  transaction_id uuid not null,
  resource_type text not null check (resource_type in ('document','receipt')),
  document_id uuid,
  payment_id uuid,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_resource_shares_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_resource_shares_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_resource_shares_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint client_portal_resource_shares_document_fk foreign key(workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint client_portal_resource_shares_payment_fk foreign key(workspace_id,payment_id)
    references public.payments(workspace_id,id) on delete restrict,
  constraint client_portal_resource_shares_shape_check check (
    (resource_type='document' and document_id is not null and payment_id is null)
    or (resource_type='receipt' and payment_id is not null and document_id is null)
  ),
  constraint client_portal_resource_shares_validity_check check (valid_until is null or valid_until > valid_from)
);

create unique index client_portal_resource_shares_document_active_unique
  on public.client_portal_resource_shares(workspace_id,principal_id,document_id)
  where document_id is not null and revoked_at is null;
create unique index client_portal_resource_shares_receipt_active_unique
  on public.client_portal_resource_shares(workspace_id,principal_id,payment_id)
  where payment_id is not null and revoked_at is null;
create index client_portal_resource_shares_transaction_idx
  on public.client_portal_resource_shares(workspace_id,principal_id,transaction_id,resource_type,revoked_at,valid_from,valid_until);

create trigger client_portal_resource_shares_set_updated_at
before update on public.client_portal_resource_shares
for each row execute function private.set_updated_at();

alter table public.client_portal_resource_shares enable row level security;
revoke all on table public.client_portal_resource_shares from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Owner publication boundary.
-- -----------------------------------------------------------------------------

create or replace function private.require_client_portal_shareable_principal_v1(
  p_workspace_id uuid,p_principal_id uuid
)
returns public.client_portal_principals language plpgsql stable security definer set search_path='' as $$
declare v_principal public.client_portal_principals%rowtype;
begin
  select * into v_principal from public.client_portal_principals p
  where p.workspace_id=p_workspace_id and p.id=p_principal_id;
  if not found or v_principal.status='revoked' or v_principal.revoked_at is not null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_PRINCIPAL_INVALID';
  end if;
  if exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_principal.user_id)
     or exists(select 1 from public.organization_members om where om.workspace_id=p_workspace_id and om.user_id=v_principal.user_id) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_STAFF_COLLISION';
  end if;
  return v_principal;
end;
$$;

create or replace function private.client_portal_principal_has_grant_v1(
  p_workspace_id uuid,p_principal_id uuid,p_transaction_id uuid,p_permission text
)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.client_portal_grants g
    where g.workspace_id=p_workspace_id
      and g.principal_id=p_principal_id
      and g.target_type='transaction'
      and g.transaction_id=p_transaction_id
      and g.revoked_at is null
      and g.valid_from<=now()
      and (g.valid_until is null or g.valid_until>now())
      and 'view'=any(g.permissions)
      and p_permission=any(g.permissions)
  );
$$;

create or replace function private.record_client_portal_share_audit_v1(
  p_workspace_id uuid,p_actor uuid,p_principal_id uuid,p_share_id uuid,
  p_action text,p_resource_type text,p_resource_id uuid,p_transaction_id uuid,p_reason text,p_version integer
)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,p_actor,p_action,'client_portal_resource_share',p_share_id,'Client portal resource visibility changed',
    jsonb_build_object(
      'principalId',p_principal_id,'shareId',p_share_id,'resourceType',p_resource_type,
      'resourceId',p_resource_id,'transactionId',p_transaction_id,'reason',nullif(btrim(coalesce(p_reason,'')),''),'version',p_version
    )
  );
end;
$$;

create or replace function private.save_client_portal_resource_share_v1_impl(
  p_workspace_id uuid,p_principal_id uuid,p_share_id uuid,p_expected_version integer,
  p_resource_type text,p_resource_id uuid,p_valid_from timestamptz,p_valid_until timestamptz
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid;
  v_principal public.client_portal_principals%rowtype;
  v_share public.client_portal_resource_shares%rowtype;
  v_transaction_id uuid;
  v_from timestamptz:=coalesce(p_valid_from,now());
  v_permission text;
  v_created boolean:=false;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  v_principal:=private.require_client_portal_shareable_principal_v1(p_workspace_id,p_principal_id);

  if p_resource_id is null or p_resource_type not in ('document','receipt') then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_RESOURCE_INVALID';
  end if;
  if p_valid_until is not null and p_valid_until<=v_from then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_VALIDITY_INVALID';
  end if;

  if p_resource_type='document' then
    select d.transaction_id into v_transaction_id from public.documents d
    where d.workspace_id=p_workspace_id and d.id=p_resource_id and d.transaction_id is not null and d.status='ready';
    if not found then raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_DOCUMENT_INVALID'; end if;
    v_permission:='view';
  else
    select p.transaction_id into v_transaction_id from public.payments p
    where p.workspace_id=p_workspace_id and p.id=p_resource_id;
    if not found then raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_RECEIPT_INVALID'; end if;
    v_permission:='view_finance';
  end if;

  if not private.client_portal_principal_has_grant_v1(p_workspace_id,p_principal_id,v_transaction_id,v_permission) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_SHARE_TRANSACTION_GRANT_REQUIRED';
  end if;

  if p_share_id is null then
    if p_expected_version is not null then
      raise serialization_failure using message='ENJAZ_PORTAL_SHARE_CREATE_VERSION_INVALID';
    end if;
    insert into public.client_portal_resource_shares(
      workspace_id,principal_id,transaction_id,resource_type,document_id,payment_id,
      valid_from,valid_until,created_by
    ) values(
      p_workspace_id,p_principal_id,v_transaction_id,p_resource_type,
      case when p_resource_type='document' then p_resource_id else null end,
      case when p_resource_type='receipt' then p_resource_id else null end,
      v_from,p_valid_until,v_actor
    ) returning * into v_share;
    v_created:=true;
  else
    select * into v_share from public.client_portal_resource_shares s
    where s.workspace_id=p_workspace_id and s.id=p_share_id and s.principal_id=p_principal_id;
    if not found then raise no_data_found using message='ENJAZ_PORTAL_SHARE_NOT_FOUND'; end if;
    if v_share.revoked_at is not null then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_SHARE_REVOKED'; end if;
    if p_expected_version is null or p_expected_version<>v_share.version then
      raise serialization_failure using message='ENJAZ_PORTAL_SHARE_STALE';
    end if;
    if v_share.resource_type<>p_resource_type
       or coalesce(v_share.document_id,v_share.payment_id)<>p_resource_id
       or v_share.transaction_id<>v_transaction_id then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_RESOURCE_IMMUTABLE';
    end if;
    update public.client_portal_resource_shares
      set valid_from=v_from,valid_until=p_valid_until,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_share_id returning * into v_share;
  end if;

  perform private.record_client_portal_share_audit_v1(
    p_workspace_id,v_actor,p_principal_id,v_share.id,
    case when v_created then 'client_portal.resource.shared' else 'client_portal.resource.share_updated' end,
    p_resource_type,p_resource_id,v_transaction_id,null,v_share.version
  );

  return jsonb_build_object(
    'shareId',v_share.id,'principalId',v_share.principal_id,'transactionId',v_share.transaction_id,
    'resourceType',v_share.resource_type,'resourceId',coalesce(v_share.document_id,v_share.payment_id),
    'validFrom',v_share.valid_from,'validUntil',v_share.valid_until,'version',v_share.version,'wasCreated',v_created
  );
end;
$$;

create or replace function public.save_client_portal_resource_share_v1(
  p_workspace_id uuid,p_principal_id uuid,p_share_id uuid,p_expected_version integer,
  p_resource_type text,p_resource_id uuid,p_valid_from timestamptz default null,p_valid_until timestamptz default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.save_client_portal_resource_share_v1_impl(
    p_workspace_id,p_principal_id,p_share_id,p_expected_version,p_resource_type,p_resource_id,p_valid_from,p_valid_until
  );
$$;

create or replace function private.revoke_client_portal_resource_share_v1_impl(
  p_workspace_id uuid,p_share_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_share public.client_portal_resource_shares%rowtype; v_resource_id uuid;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_reason,''))) not between 1 and 800 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_SHARE_REVOKE_REASON_INVALID';
  end if;
  select * into v_share from public.client_portal_resource_shares s
  where s.workspace_id=p_workspace_id and s.id=p_share_id;
  if not found then raise no_data_found using message='ENJAZ_PORTAL_SHARE_NOT_FOUND'; end if;
  if p_expected_version is null or p_expected_version<>v_share.version then
    raise serialization_failure using message='ENJAZ_PORTAL_SHARE_STALE';
  end if;
  if v_share.revoked_at is null then
    update public.client_portal_resource_shares
      set revoked_at=now(),revoked_by=v_actor,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_share_id returning * into v_share;
    v_resource_id:=coalesce(v_share.document_id,v_share.payment_id);
    perform private.record_client_portal_share_audit_v1(
      p_workspace_id,v_actor,v_share.principal_id,v_share.id,'client_portal.resource.unshared',
      v_share.resource_type,v_resource_id,v_share.transaction_id,p_reason,v_share.version
    );
  end if;
  return jsonb_build_object('shareId',v_share.id,'revokedAt',v_share.revoked_at,'version',v_share.version);
end;
$$;

create or replace function public.revoke_client_portal_resource_share_v1(
  p_workspace_id uuid,p_share_id uuid,p_expected_version integer,p_reason text
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.revoke_client_portal_resource_share_v1_impl(p_workspace_id,p_share_id,p_expected_version,p_reason);
$$;

-- -----------------------------------------------------------------------------
-- Client-safe read model. All payload fields are explicitly enumerated.
-- -----------------------------------------------------------------------------

create or replace function private.get_client_portal_read_model_v1_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_principal uuid; v_user uuid:=(select auth.uid());
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);

  return jsonb_build_object(
    'workspaceId',p_workspace_id,
    'principalId',v_principal,
    'userId',v_user,
    'companies',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'legalName',c.legal_name,'displayName',c.display_name,'status',c.status
      ) order by c.legal_name,c.id)
      from public.client_portal_grants g
      join public.companies c on c.workspace_id=g.workspace_id and c.id=g.company_id
      where g.workspace_id=p_workspace_id and g.principal_id=v_principal
        and g.target_type='company' and g.revoked_at is null and g.valid_from<=now()
        and (g.valid_until is null or g.valid_until>now()) and 'view'=any(g.permissions)
        and c.deleted_at is null
    ),'[]'::jsonb),
    'transactions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,'companyId',t.company_id,'type',t.type,'status',t.status,
        'createdAt',t.created_at,'updatedAt',t.updated_at,'completedAt',t.completed_at
      ) order by t.updated_at desc,t.id)
      from public.client_portal_grants g
      join public.transactions t on t.workspace_id=g.workspace_id and t.id=g.transaction_id
      where g.workspace_id=p_workspace_id and g.principal_id=v_principal
        and g.target_type='transaction' and g.revoked_at is null and g.valid_from<=now()
        and (g.valid_until is null or g.valid_until>now()) and 'view'=any(g.permissions)
        and t.deleted_at is null
    ),'[]'::jsonb),
    'timeline',coalesce((
      select jsonb_agg(e.event order by e.occurred_at,e.sort_order)
      from public.client_portal_grants g
      join public.transactions t on t.workspace_id=g.workspace_id and t.id=g.transaction_id
      cross join lateral (
        values
          (t.created_at,1,jsonb_build_object('transactionId',t.id,'event','created','occurredAt',t.created_at,'status','active')),
          (t.updated_at,2,jsonb_build_object('transactionId',t.id,'event','current_status','occurredAt',t.updated_at,'status',t.status)),
          (t.completed_at,3,jsonb_build_object('transactionId',t.id,'event','completed','occurredAt',t.completed_at,'status','completed')),
          (t.archived_at,4,jsonb_build_object('transactionId',t.id,'event','archived','occurredAt',t.archived_at,'status',t.status))
      ) as e(occurred_at,sort_order,event)
      where g.workspace_id=p_workspace_id and g.principal_id=v_principal
        and g.target_type='transaction' and g.revoked_at is null and g.valid_from<=now()
        and (g.valid_until is null or g.valid_until>now()) and 'view'=any(g.permissions)
        and t.deleted_at is null and e.occurred_at is not null
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',d.id,'transactionId',d.transaction_id,'companyId',d.company_id,'title',d.title,
        'documentType',d.document_type,'mimeType',d.mime_type,'sizeBytes',d.size_bytes,
        'status',d.status,'capturedAt',d.captured_at,'createdAt',d.created_at,'updatedAt',d.updated_at
      ) order by d.updated_at desc,d.id)
      from public.client_portal_resource_shares s
      join public.documents d on d.workspace_id=s.workspace_id and d.id=s.document_id and d.transaction_id=s.transaction_id
      where s.workspace_id=p_workspace_id and s.principal_id=v_principal and s.resource_type='document'
        and s.revoked_at is null and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
        and d.status='ready'
        and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view')
    ),'[]'::jsonb),
    'receipts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'paymentId',p.id,'transactionId',p.transaction_id,'companyId',p.company_id,
        'receiptRef',p.receipt_ref,'amount',p.amount::text,'method',p.method,'paidAt',p.paid_at,
        'status',p.status,'receiptVersion',p.receipt_version
      ) order by p.paid_at desc,p.id)
      from public.client_portal_resource_shares s
      join public.payments p on p.workspace_id=s.workspace_id and p.id=s.payment_id and p.transaction_id=s.transaction_id
      where s.workspace_id=p_workspace_id and s.principal_id=v_principal and s.resource_type='receipt'
        and s.revoked_at is null and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())
        and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',s.transaction_id,'view_finance')
    ),'[]'::jsonb),
    'requests','[]'::jsonb,
    'requestProjectionStatus','PENDING_GOVERNED_CLIENT_REQUEST_SOURCE'
  );
end;
$$;

create or replace function public.get_client_portal_read_model_v1(p_workspace_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.get_client_portal_read_model_v1_impl(p_workspace_id);
$$;

-- -----------------------------------------------------------------------------
-- Privileges: browser may execute guarded RPCs only. No direct table read/write.
-- -----------------------------------------------------------------------------

revoke all on function private.require_client_portal_shareable_principal_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function private.client_portal_principal_has_grant_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.record_client_portal_share_audit_v1(uuid,uuid,uuid,uuid,text,text,uuid,uuid,text,integer) from public,anon,authenticated;
revoke all on function private.save_client_portal_resource_share_v1_impl(uuid,uuid,uuid,integer,text,uuid,timestamptz,timestamptz) from public,anon;
revoke all on function private.revoke_client_portal_resource_share_v1_impl(uuid,uuid,integer,text) from public,anon;
revoke all on function private.get_client_portal_read_model_v1_impl(uuid) from public,anon;

grant execute on function private.save_client_portal_resource_share_v1_impl(uuid,uuid,uuid,integer,text,uuid,timestamptz,timestamptz) to authenticated;
grant execute on function private.revoke_client_portal_resource_share_v1_impl(uuid,uuid,integer,text) to authenticated;
grant execute on function private.get_client_portal_read_model_v1_impl(uuid) to authenticated;

revoke all on function public.save_client_portal_resource_share_v1(uuid,uuid,uuid,integer,text,uuid,timestamptz,timestamptz) from public,anon;
revoke all on function public.revoke_client_portal_resource_share_v1(uuid,uuid,integer,text) from public,anon;
revoke all on function public.get_client_portal_read_model_v1(uuid) from public,anon;

grant execute on function public.save_client_portal_resource_share_v1(uuid,uuid,uuid,integer,text,uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.revoke_client_portal_resource_share_v1(uuid,uuid,integer,text) to authenticated;
grant execute on function public.get_client_portal_read_model_v1(uuid) to authenticated;

commit;
