-- ENJAZ Phase 11.1 — follow-up lifecycle hardening
-- Browser may edit ordinary schedule text/date, but lifecycle state is RPC-governed.
begin;

revoke update on table public.transaction_followups from authenticated;
grant update(title, due_at) on table public.transaction_followups to authenticated;

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
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_FOLLOWUP_WORKSPACE_FORBIDDEN';
  end if;

  select * into v
  from public.transaction_followups f
  where f.workspace_id = p_workspace_id and f.id = p_followup_id
  for update;

  if not found then
    raise no_data_found using message = 'ENJAZ_FOLLOWUP_NOT_FOUND';
  end if;

  if v.status <> 'open' then
    raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_TERMINAL_FINAL';
  end if;

  case p_action
    when 'complete' then
      update public.transaction_followups
      set status = 'completed', completed_at = v_now, completed_by = v_actor, snoozed_until = null
      where id = v.id;
    when 'snooze' then
      if p_snoozed_until is null or p_snoozed_until <= v_now then
        raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_SNOOZE_NOT_FUTURE';
      end if;
      update public.transaction_followups
      set snoozed_until = p_snoozed_until
      where id = v.id;
    when 'wake' then
      if v.snoozed_until is null or v.snoozed_until > v_now then
        raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_NOT_READY_TO_WAKE';
      end if;
      update public.transaction_followups
      set snoozed_until = null
      where id = v.id;
    when 'cancel' then
      update public.transaction_followups
      set status = 'cancelled', completed_at = null, completed_by = null, snoozed_until = null
      where id = v.id;
    else
      raise invalid_parameter_value using message = 'ENJAZ_FOLLOWUP_ACTION_INVALID';
  end case;

  select * into v from public.transaction_followups where id = v.id;
  return jsonb_build_object(
    'schema','enjaz.transaction-followup-state.v1',
    'id',v.id,
    'workspaceId',v.workspace_id,
    'status',v.status,
    'completedAt',v.completed_at,
    'completedBy',v.completed_by,
    'snoozedUntil',v.snoozed_until
  );
end;
$$;

revoke all on function public.mutate_transaction_followup_state_v1(uuid,uuid,text,timestamptz) from public, anon, service_role;
grant execute on function public.mutate_transaction_followup_state_v1(uuid,uuid,text,timestamptz) to authenticated;

commit;
