-- ENJAZ Phase 11.3-D — Client Portal invitation activation
-- Exact auth.users-bound invitations may be discovered/activated by that same user only.
-- Activation never grants workspace/workforce membership and never creates object grants.

begin;

create or replace function private.list_client_portal_invitations_v1_impl()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'workspaceId',p.workspace_id,
      'workspaceName',w.name,
      'principalId',p.id,
      'status',p.status,
      'version',p.version
    ) order by p.created_at,p.id)
    from public.client_portal_principals p
    join public.workspaces w on w.id=p.workspace_id
    where p.user_id=v_actor
      and p.status='invited'
      and p.activated_at is null
      and p.revoked_at is null
      and not exists(
        select 1 from public.workspace_memberships wm
        where wm.workspace_id=p.workspace_id and wm.user_id=v_actor
      )
      and not exists(
        select 1 from public.organization_members om
        where om.workspace_id=p.workspace_id and om.user_id=v_actor
      )
  ),'[]'::jsonb);
end;
$$;

create or replace function public.list_client_portal_invitations_v1()
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.list_client_portal_invitations_v1_impl();
$$;

create or replace function private.activate_client_portal_invitation_v1_impl(
  p_workspace_id uuid,p_expected_version integer
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid := (select auth.uid());
  v_row public.client_portal_principals%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_workspace_id is null or p_expected_version is null or p_expected_version<1 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_INVITATION_INPUT_INVALID';
  end if;

  select * into v_row
  from public.client_portal_principals p
  where p.workspace_id=p_workspace_id
    and p.user_id=v_actor
  for update;

  if not found then raise no_data_found using message='ENJAZ_PORTAL_INVITATION_NOT_FOUND'; end if;
  if v_row.status<>'invited' or v_row.revoked_at is not null or v_row.activated_at is not null then
    raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_INVITATION_NOT_ACTIVE';
  end if;
  if v_row.version<>p_expected_version then
    raise serialization_failure using message='ENJAZ_PORTAL_INVITATION_STALE';
  end if;
  if exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) or exists(
    select 1 from public.organization_members om
    where om.workspace_id=p_workspace_id and om.user_id=v_actor
  ) then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_STAFF_TRUST_COLLISION';
  end if;

  update public.client_portal_principals
  set status='active',activated_at=now(),revoked_at=null,version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=v_row.id and version=p_expected_version
  returning * into v_row;

  if not found then raise serialization_failure using message='ENJAZ_PORTAL_INVITATION_CHANGED'; end if;

  perform private.record_client_portal_authority_event_v1(
    p_workspace_id,v_row.id,null,v_actor,'principal.activated','self_activation',
    jsonb_build_object('userId',v_actor,'version',v_row.version,'source','client_portal')
  );

  return jsonb_build_object(
    'workspaceId',v_row.workspace_id,
    'principalId',v_row.id,
    'status',v_row.status,
    'version',v_row.version,
    'activatedAt',v_row.activated_at
  );
end;
$$;

create or replace function public.activate_client_portal_invitation_v1(
  p_workspace_id uuid,p_expected_version integer
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.activate_client_portal_invitation_v1_impl(p_workspace_id,p_expected_version);
$$;

revoke all on function private.list_client_portal_invitations_v1_impl() from public,anon,authenticated;
revoke all on function private.activate_client_portal_invitation_v1_impl(uuid,integer) from public,anon,authenticated;
grant execute on function private.list_client_portal_invitations_v1_impl() to authenticated;
grant execute on function private.activate_client_portal_invitation_v1_impl(uuid,integer) to authenticated;

revoke all on function public.list_client_portal_invitations_v1() from public,anon;
revoke all on function public.activate_client_portal_invitation_v1(uuid,integer) from public,anon;
grant execute on function public.list_client_portal_invitations_v1() to authenticated;
grant execute on function public.activate_client_portal_invitation_v1(uuid,integer) to authenticated;

commit;
