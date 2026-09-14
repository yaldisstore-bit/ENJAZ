-- ENJAZ Phase 11.1 — governed transaction follow-up lifecycle
-- Browser reads and ordinary title/due-date edits remain RLS-scoped, while
-- completion/snooze/cancel lifecycle mutations must pass through the governed RPC.
begin;

create or replace function private.enforce_transaction_followup_lifecycle_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_governed boolean := coalesce(current_setting('enjaz.followup_lifecycle_rpc', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    if new.status <> 'open'
      or new.completed_at is not null
      or new.completed_by is not null
      or new.snoozed_until is not null then
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_INITIAL_STATE_INVALID';
    end if;
    return new;
  end if;

  if new.workspace_id is distinct from old.workspace_id
    or new.transaction_id is distinct from old.transaction_id then
    raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_SOURCE_IDENTITY_IMMUTABLE';
  end if;

  if old.status in ('completed','cancelled') and (
    new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at
    or new.completed_by is distinct from old.completed_by
    or new.snoozed_until is distinct from old.snoozed_until
  ) then
    raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_TERMINAL_FINAL';
  end if;

  if (
    new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at
    or new.completed_by is distinct from old.completed_by
    or new.snoozed_until is distinct from old.snoozed_until
  ) and not v_governed then
    raise insufficient_privilege using message = 'ENJAZ_FOLLOWUP_LIFECYCLE_RPC_REQUIRED';
  end if;

  if new.status = 'completed' then
    if new.completed_at is null or new.completed_by is null or new.snoozed_until is not null then
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_COMPLETION_EVIDENCE_INVALID';
    end if;
  elsif new.status = 'cancelled' then
    if new.completed_at is not null or new.completed_by is not null or new.snoozed_until is not null then
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_CANCELLED_EVIDENCE_INVALID';
    end if;
  else
    if new.completed_at is not null or new.completed_by is not null then
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_OPEN_HAS_COMPLETION_EVIDENCE';
    end if;
    if new.snoozed_until is not null and new.snoozed_until <= now() then
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_SNOOZE_NOT_FUTURE';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_transaction_followup_lifecycle_v1() from public, anon, authenticated, service_role;

drop trigger if exists transaction_followups_lifecycle_guard on public.transaction_followups;
create trigger transaction_followups_lifecycle_guard
  before insert or update on public.transaction_followups
  for each row execute function private.enforce_transaction_followup_lifecycle_v1();

create or replace function public.mutate_transaction_followup_state_v1(
  p_workspace_id uuid,
  p_followup_id uuid,
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
  v public.transaction_followups%rowtype;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_FOLLOWUP_AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_FOLLOWUP_WORKSPACE_FORBIDDEN';
  end if;

  select * into v
  from public.transaction_followups f
  where f.workspace_id = p_workspace_id
    and f.id = p_followup_id
  for update;

  if not found then
    raise no_data_found using message = 'ENJAZ_FOLLOWUP_NOT_FOUND';
  end if;

  if v.status in ('completed','cancelled') then
    raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_TERMINAL_FINAL';
  end if;

  perform set_config('enjaz.followup_lifecycle_rpc', '1', true);

  case p_action
    when 'complete' then
      update public.transaction_followups
      set status = 'completed',
          completed_at = v_now,
          completed_by = v_actor,
          snoozed_until = null
      where workspace_id = p_workspace_id and id = p_followup_id;

    when 'snooze' then
      if p_snoozed_until is null or p_snoozed_until <= v_now then
        raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_SNOOZE_NOT_FUTURE';
      end if;
      update public.transaction_followups
      set snoozed_until = p_snoozed_until
      where workspace_id = p_workspace_id and id = p_followup_id;

    when 'wake' then
      if v.snoozed_until is null then
        raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_NOT_SNOOZED';
      end if;
      update public.transaction_followups
      set snoozed_until = null
      where workspace_id = p_workspace_id and id = p_followup_id;

    when 'cancel' then
      update public.transaction_followups
      set status = 'cancelled',
          completed_at = null,
          completed_by = null,
          snoozed_until = null
      where workspace_id = p_workspace_id and id = p_followup_id;

    else
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_ACTION_INVALID';
  end case;

  select * into v
  from public.transaction_followups
  where workspace_id = p_workspace_id and id = p_followup_id;

  return jsonb_build_object(
    'schema', 'enjaz.transaction-followup-state.v1',
    'id', v.id,
    'workspaceId', v.workspace_id,
    'status', v.status,
    'completedAt', v.completed_at,
    'completedBy', v.completed_by,
    'snoozedUntil', v.snoozed_until
  );
end;
$$;

revoke all on function public.mutate_transaction_followup_state_v1(uuid,uuid,text,timestamptz) from public, anon, service_role;
grant execute on function public.mutate_transaction_followup_state_v1(uuid,uuid,text,timestamptz) to authenticated;

commit;
