-- ENJAZ Phase 1.5 — break a mutually recursive RLS path discovered by live A/B destruction testing.
-- Supabase docs explicitly recommend a SECURITY DEFINER helper in a non-exposed schema for this case.

grant usage on schema private to authenticated;

create or replace function private.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from public.workspaces w
       where w.id = p_workspace_id
         and w.owner_user_id = (select auth.uid())
     );
$$;

revoke all on function private.is_workspace_owner(uuid) from public;
revoke all on function private.is_workspace_owner(uuid) from anon;
grant execute on function private.is_workspace_owner(uuid) to authenticated;

drop policy if exists workspace_memberships_insert_owner_self on public.workspace_memberships;
create policy workspace_memberships_insert_owner_self
on public.workspace_memberships
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and role = 'owner'
  and (select private.is_workspace_owner(workspace_id))
);
