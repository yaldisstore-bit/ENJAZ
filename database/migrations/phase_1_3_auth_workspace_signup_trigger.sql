-- Applied live to project juzxriirhkuzviwnhkbd on 2026-09-06.
-- Guarantees every auth user has a profile, personal workspace, owner membership,
-- and workspace settings even when the client-side bootstrap RPC is not invoked.

create or replace function private.bootstrap_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_display_name text;
  v_workspace_id uuid;
begin
  v_display_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'مستخدم إنجاز'
    ),
    160
  );

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  select w.id
    into v_workspace_id
    from public.workspaces w
   where w.owner_user_id = new.id
   order by w.created_at asc
   limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (owner_user_id, name)
    values (new.id, 'مساحة إنجاز')
    returning id into v_workspace_id;
  end if;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.workspace_settings (workspace_id)
  values (v_workspace_id)
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

revoke all on function private.bootstrap_auth_user() from public, anon, authenticated;

drop trigger if exists enjaz_bootstrap_auth_user on auth.users;
create trigger enjaz_bootstrap_auth_user
after insert on auth.users
for each row
execute function private.bootstrap_auth_user();

-- Idempotent backfill for users created before the trigger existed.
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'مستخدم إنجاز'
    ),
    160
  )
from auth.users u
on conflict (id) do nothing;

insert into public.workspaces (owner_user_id, name)
select u.id, 'مساحة إنجاز'
from auth.users u
where not exists (
  select 1
  from public.workspaces w
  where w.owner_user_id = u.id
);

insert into public.workspace_memberships (workspace_id, user_id, role)
select w.id, w.owner_user_id, 'owner'
from public.workspaces w
on conflict (workspace_id, user_id) do nothing;

insert into public.workspace_settings (workspace_id)
select w.id
from public.workspaces w
on conflict (workspace_id) do nothing;
