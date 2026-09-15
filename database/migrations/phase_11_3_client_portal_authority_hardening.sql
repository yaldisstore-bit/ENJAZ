-- ENJAZ Phase 11.3B hardening
-- 1) internal authority-event writer is never browser-callable;
-- 2) if a portal user later acquires same-workspace staff/workforce trust, portal authority fails closed immediately.

begin;

create or replace function private.current_client_portal_principal_id_v1(p_workspace_id uuid)
returns uuid language sql stable security definer set search_path='' as $$
  select p.id
  from public.client_portal_principals p
  where p.workspace_id=p_workspace_id
    and p.user_id=(select auth.uid())
    and p.status='active'
    and p.activated_at is not null
    and p.revoked_at is null
    and not exists(
      select 1 from public.workspace_memberships wm
      where wm.workspace_id=p.workspace_id and wm.user_id=p.user_id
    )
    and not exists(
      select 1 from public.organization_members om
      where om.workspace_id=p.workspace_id and om.user_id=p.user_id
    )
  limit 1;
$$;

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
    where p.user_id=v_actor
      and p.status='active'
      and p.activated_at is not null
      and p.revoked_at is null
      and not exists(
        select 1 from public.workspace_memberships wm
        where wm.workspace_id=p.workspace_id and wm.user_id=p.user_id
      )
      and not exists(
        select 1 from public.organization_members om
        where om.workspace_id=p.workspace_id and om.user_id=p.user_id
      )
  ),'[]'::jsonb);
end;
$$;

revoke all on function private.current_client_portal_principal_id_v1(uuid) from public,anon;
revoke all on function private.list_client_portal_workspaces_v1_impl() from public,anon;
grant execute on function private.current_client_portal_principal_id_v1(uuid) to authenticated;
grant execute on function private.list_client_portal_workspaces_v1_impl() to authenticated;

revoke all on function private.record_client_portal_authority_event_v1(uuid,uuid,uuid,uuid,text,text,jsonb)
from authenticated;

commit;
