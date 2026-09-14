-- ENJAZ Phase 11.1 — Notifications & Follow-ups authority
-- Canonical in-app notification state is separate from delivery history.
begin;

alter table public.transaction_followups
  add constraint transaction_followups_completion_actor_check
  check (status = 'completed' or completed_by is null),
  add constraint transaction_followups_terminal_snooze_check
  check (status = 'open' or snoozed_until is null);

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('follow_up','assignment','deadline','renewal','workflow','document','finance','contract','system')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  source_type text not null check (char_length(btrim(source_type)) between 1 and 120),
  source_id uuid not null,
  event_key text not null check (char_length(btrim(event_key)) between 1 and 160),
  source_version integer not null check (source_version > 0),
  source_occurred_at timestamptz not null,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  snoozed_until timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint in_app_notifications_workspace_id_id_key unique (workspace_id, id),
  constraint in_app_notifications_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_memberships(workspace_id, user_id) on delete cascade,
  constraint in_app_notifications_schedule_check check (scheduled_for >= source_occurred_at),
  constraint in_app_notifications_cancelled_snooze_check check (cancelled_at is null or snoozed_until is null),
  constraint in_app_notifications_source_identity_unique
    unique (workspace_id, user_id, source_type, source_id, event_key)
);

create index in_app_notifications_user_schedule_idx
  on public.in_app_notifications(workspace_id, user_id, scheduled_for desc);
create index in_app_notifications_actionable_idx
  on public.in_app_notifications(workspace_id, user_id, scheduled_for, priority)
  where read_at is null and cancelled_at is null;

alter table public.in_app_notifications enable row level security;

revoke all on table public.in_app_notifications from public, anon, authenticated;
grant select on table public.in_app_notifications to authenticated;
grant select, insert, update, delete on table public.in_app_notifications to service_role;

create policy in_app_notifications_select_self
  on public.in_app_notifications
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and workspace_id in (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
  );

create or replace function private.enforce_in_app_notification_lifecycle_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.snoozed_until is not null and new.snoozed_until <= now() then
      raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SNOOZE_NOT_FUTURE';
    end if;
    if new.read_at is not null or new.cancelled_at is not null then
      raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_INITIAL_STATE_INVALID';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.workspace_id is distinct from old.workspace_id
    or new.user_id is distinct from old.user_id
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
    or new.event_key is distinct from old.event_key then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SOURCE_IDENTITY_IMMUTABLE';
  end if;

  if old.cancelled_at is not null then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_CANCELLED_FINAL';
  end if;

  if new.source_version < old.source_version then
    raise serialization_failure using message = 'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION';
  end if;

  if (
    new.category is distinct from old.category
    or new.priority is distinct from old.priority
    or new.title is distinct from old.title
    or new.source_occurred_at is distinct from old.source_occurred_at
    or new.scheduled_for is distinct from old.scheduled_for
  ) and new.source_version <= old.source_version then
    raise serialization_failure using message = 'ENJAZ_NOTIFICATION_SOURCE_REVISION_REQUIRED';
  end if;

  if new.snoozed_until is distinct from old.snoozed_until
    and new.snoozed_until is not null
    and new.snoozed_until <= now() then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SNOOZE_NOT_FUTURE';
  end if;

  if new.cancelled_at is not null and new.snoozed_until is not null then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_CANCELLED_CANNOT_BE_SNOOZED';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_in_app_notification_lifecycle_v1() from public, anon, authenticated, service_role;

create trigger in_app_notifications_lifecycle_guard
  before insert or update on public.in_app_notifications
  for each row execute function private.enforce_in_app_notification_lifecycle_v1();

create or replace function public.mutate_in_app_notification_state_v1(
  p_workspace_id uuid,
  p_notification_id uuid,
  p_action text,
  p_snoozed_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v public.in_app_notifications%rowtype;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_NOTIFICATION_AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_NOTIFICATION_WORKSPACE_FORBIDDEN';
  end if;

  select * into v
  from public.in_app_notifications n
  where n.workspace_id = p_workspace_id
    and n.id = p_notification_id
    and n.user_id = v_actor
  for update;

  if not found then
    raise no_data_found using message = 'ENJAZ_NOTIFICATION_NOT_FOUND';
  end if;

  if v.cancelled_at is not null then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_CANCELLED_FINAL';
  end if;

  case p_action
    when 'mark_read' then
      if v.read_at is not null then
        raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_ALREADY_READ';
      end if;
      update public.in_app_notifications set read_at = v_now where id = v.id;
    when 'mark_unread' then
      if v.read_at is null then
        raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_ALREADY_UNREAD';
      end if;
      update public.in_app_notifications set read_at = null where id = v.id;
    when 'snooze' then
      if p_snoozed_until is null or p_snoozed_until <= v_now then
        raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SNOOZE_NOT_FUTURE';
      end if;
      update public.in_app_notifications set snoozed_until = p_snoozed_until where id = v.id;
    when 'wake' then
      if v.snoozed_until is null or v.snoozed_until > v_now then
        raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_NOT_READY_TO_WAKE';
      end if;
      update public.in_app_notifications set snoozed_until = null where id = v.id;
    when 'cancel' then
      update public.in_app_notifications
      set snoozed_until = null, cancelled_at = v_now
      where id = v.id;
    else
      raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_ACTION_INVALID';
  end case;

  select * into v from public.in_app_notifications where id = v.id;
  return jsonb_build_object(
    'schema', 'enjaz.in-app-notification-state.v1',
    'id', v.id,
    'workspaceId', v.workspace_id,
    'readAt', v.read_at,
    'snoozedUntil', v.snoozed_until,
    'cancelledAt', v.cancelled_at,
    'updatedAt', v.updated_at
  );
end;
$$;

revoke all on function public.mutate_in_app_notification_state_v1(uuid,uuid,text,timestamptz) from public, anon, service_role;
grant execute on function public.mutate_in_app_notification_state_v1(uuid,uuid,text,timestamptz) to authenticated;

create or replace function public.upsert_in_app_notification_v1(
  p_workspace_id uuid,
  p_user_id uuid,
  p_category text,
  p_priority text,
  p_title text,
  p_source_type text,
  p_source_id uuid,
  p_event_key text,
  p_source_version integer,
  p_source_occurred_at timestamptz,
  p_scheduled_for timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.in_app_notifications%rowtype;
  v_inserted boolean := false;
begin
  if p_source_version is null or p_source_version < 1 then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SOURCE_VERSION_INVALID';
  end if;
  if p_scheduled_for < p_source_occurred_at then
    raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_SCHEDULE_BEFORE_SOURCE';
  end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id
  ) then
    raise foreign_key_violation using message = 'ENJAZ_NOTIFICATION_RECIPIENT_NOT_MEMBER';
  end if;

  select * into v
  from public.in_app_notifications n
  where n.workspace_id = p_workspace_id
    and n.user_id = p_user_id
    and n.source_type = btrim(p_source_type)
    and n.source_id = p_source_id
    and n.event_key = btrim(p_event_key)
  for update;

  if not found then
    begin
      insert into public.in_app_notifications(
        workspace_id,user_id,category,priority,title,source_type,source_id,event_key,
        source_version,source_occurred_at,scheduled_for
      ) values (
        p_workspace_id,p_user_id,p_category,p_priority,btrim(p_title),btrim(p_source_type),p_source_id,btrim(p_event_key),
        p_source_version,p_source_occurred_at,p_scheduled_for
      ) returning * into v;
      v_inserted := true;
    exception when unique_violation then
      select * into v
      from public.in_app_notifications n
      where n.workspace_id = p_workspace_id
        and n.user_id = p_user_id
        and n.source_type = btrim(p_source_type)
        and n.source_id = p_source_id
        and n.event_key = btrim(p_event_key)
      for update;
    end;
  end if;

  if not v_inserted then
    if v.cancelled_at is not null then
      raise invalid_parameter_value using message = 'ENJAZ_NOTIFICATION_CANCELLED_FINAL';
    end if;
    if p_source_version < v.source_version then
      raise serialization_failure using message = 'ENJAZ_NOTIFICATION_STALE_SOURCE_VERSION';
    end if;
    if p_source_version = v.source_version then
      if v.category <> p_category
        or v.priority <> p_priority
        or v.title <> btrim(p_title)
        or v.source_occurred_at <> p_source_occurred_at
        or v.scheduled_for <> p_scheduled_for then
        raise serialization_failure using message = 'ENJAZ_NOTIFICATION_SOURCE_REVISION_DRIFT';
      end if;
      return jsonb_build_object(
        'schema','enjaz.in-app-notification.v1','id',v.id,'workspaceId',v.workspace_id,
        'sourceVersion',v.source_version,'wasDuplicate',true
      );
    end if;

    update public.in_app_notifications
    set category = p_category,
        priority = p_priority,
        title = btrim(p_title),
        source_version = p_source_version,
        source_occurred_at = p_source_occurred_at,
        scheduled_for = p_scheduled_for
    where id = v.id
    returning * into v;
  end if;

  return jsonb_build_object(
    'schema','enjaz.in-app-notification.v1','id',v.id,'workspaceId',v.workspace_id,
    'sourceVersion',v.source_version,'wasDuplicate',false
  );
end;
$$;

revoke all on function public.upsert_in_app_notification_v1(uuid,uuid,text,text,text,text,uuid,text,integer,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_in_app_notification_v1(uuid,uuid,text,text,text,text,uuid,text,integer,timestamptz,timestamptz) to service_role;

commit;
