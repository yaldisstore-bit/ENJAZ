-- ENJAZ Phase 8.5 — organization workspace resolution for owner + scoped workforce.
-- This RPC never inserts workforce into legacy workspace_memberships and never grants legacy table access.

begin;

grant usage on schema private to authenticated;

create or replace function private.organization_workspaces_for_actor_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_ORG_AUTH_REQUIRED';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'workspaceId',q.workspace_id,
      'workspaceName',q.workspace_name,
      'actorType',q.actor_type,
      'organizationMemberId',q.organization_member_id
    ) order by q.workspace_name,q.workspace_id)
    from (
      select w.id as workspace_id,w.name as workspace_name,'owner'::text as actor_type,null::uuid as organization_member_id
      from public.workspaces w
      where w.owner_user_id=v_actor
        and exists(select 1 from public.workspace_memberships wm where wm.workspace_id=w.id and wm.user_id=v_actor and wm.role='owner')

      union all

      select w.id,w.name,'workforce'::text,m.id
      from public.organization_members m
      join public.workspaces w on w.id=m.workspace_id
      where m.user_id=v_actor
        and m.status='active'
        and m.valid_from<=now()
        and (m.valid_until is null or m.valid_until>now())
        and w.owner_user_id<>v_actor
    ) q
  ),'[]'::jsonb);
end;
$$;

create or replace function public.list_organization_workspaces_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.organization_workspaces_for_actor_v1();
$$;

revoke all on function private.organization_workspaces_for_actor_v1() from public,anon;
grant execute on function private.organization_workspaces_for_actor_v1() to authenticated;
revoke all on function public.list_organization_workspaces_v1() from public,anon;
grant execute on function public.list_organization_workspaces_v1() to authenticated;

commit;
