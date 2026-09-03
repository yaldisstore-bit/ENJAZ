-- Applied live to project juzxriirhkuzviwnhkbd.
drop policy if exists notification_preferences_select_workspace on public.notification_preferences;
drop policy if exists notification_preferences_insert_workspace on public.notification_preferences;
drop policy if exists notification_preferences_update_workspace on public.notification_preferences;
drop policy if exists notification_deliveries_select_workspace on public.notification_deliveries;
drop policy if exists sync_devices_select_workspace on public.sync_devices;
drop policy if exists sync_devices_insert_workspace on public.sync_devices;
drop policy if exists sync_devices_update_workspace on public.sync_devices;

create policy notification_preferences_select_self on public.notification_preferences for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy notification_preferences_insert_self on public.notification_preferences for insert to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy notification_preferences_update_self on public.notification_preferences for update to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy notification_deliveries_select_self on public.notification_deliveries for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy sync_devices_select_self on public.sync_devices for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy sync_devices_insert_self on public.sync_devices for insert to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));
create policy sync_devices_update_self on public.sync_devices for update to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()) and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id = (select auth.uid())));

create or replace function public.bootstrap_personal_workspace(p_display_name text, p_workspace_name text default 'مساحة إنجاز')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'Invalid display name';
  end if;
  if p_workspace_name is null or char_length(btrim(p_workspace_name)) not between 1 and 180 then
    raise exception using errcode = '22023', message = 'Invalid workspace name';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));
  insert into public.profiles(id, display_name) values (v_user_id, btrim(p_display_name))
  on conflict (id) do update set display_name = excluded.display_name;

  select w.id into v_workspace_id from public.workspaces w
  where w.owner_user_id = v_user_id order by w.created_at asc limit 1;

  if v_workspace_id is null then
    insert into public.workspaces(owner_user_id, name) values (v_user_id, btrim(p_workspace_name)) returning id into v_workspace_id;
  end if;

  insert into public.workspace_memberships(workspace_id, user_id, role) values (v_workspace_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  insert into public.workspace_settings(workspace_id) values (v_workspace_id) on conflict (workspace_id) do nothing;
  return v_workspace_id;
end;
$$;

revoke all on function public.bootstrap_personal_workspace(text, text) from public;
revoke all on function public.bootstrap_personal_workspace(text, text) from anon;
grant execute on function public.bootstrap_personal_workspace(text, text) to authenticated;
