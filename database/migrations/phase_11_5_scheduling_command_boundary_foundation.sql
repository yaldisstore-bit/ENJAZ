begin;

alter table public.calendar_events
  add column if not exists version integer not null default 1 check (version > 0);

alter table public.renewals
  add column if not exists version integer not null default 1 check (version > 0);

create table if not exists private.scheduling_command_receipts (
  workspace_id uuid not null,
  operation_id uuid not null,
  command_type text not null check (char_length(btrim(command_type)) between 1 and 80),
  entity_id uuid not null,
  actor_user_id uuid not null,
  request_payload jsonb not null check (jsonb_typeof(request_payload) = 'object'),
  response_payload jsonb not null check (jsonb_typeof(response_payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, operation_id)
);

revoke all on table private.scheduling_command_receipts from public, anon, authenticated;
grant select, insert, update, delete on table private.scheduling_command_receipts to service_role;

create or replace function private.require_scheduling_workspace_member_v1(p_workspace_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_SCHEDULING_AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;
$$;

revoke all on function private.require_scheduling_workspace_member_v1(uuid) from public, anon;
grant execute on function private.require_scheduling_workspace_member_v1(uuid) to authenticated, service_role;

create or replace function private.mutate_calendar_event_state_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version < 1 then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if p_action not in ('complete','cancel') then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_CALENDAR_ACTION_INVALID';
  end if;
  if p_action = 'cancel' and v_reason is null then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_CANCEL_REASON_REQUIRED';
  end if;
  if v_reason is not null and char_length(v_reason) > 1200 then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_REASON_INVALID';
  end if;

  v_payload := jsonb_build_object(
    'eventId',p_event_id,'expectedVersion',p_expected_version,'action',p_action,'reason',v_reason
  );
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text, 0));

  select * into v_receipt
  from private.scheduling_command_receipts r
  where r.workspace_id = p_workspace_id and r.operation_id = p_operation_id;
  if found then
    if v_receipt.command_type <> 'calendar_event_state'
       or v_receipt.entity_id <> p_event_id
       or v_receipt.actor_user_id <> v_actor
       or v_receipt.request_payload <> v_payload then
      raise unique_violation using message = 'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event
  from public.calendar_events e
  where e.workspace_id = p_workspace_id and e.id = p_event_id
  for update;
  if not found then raise no_data_found using message = 'ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version <> p_expected_version then raise serialization_failure using message = 'ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status <> 'scheduled' then raise object_not_in_prerequisite_state using message = 'ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;

  update public.calendar_events
  set status = case when p_action='complete' then 'completed' else 'cancelled' end,
      updated_at = now(),
      version = version + 1
  where workspace_id = p_workspace_id and id = p_event_id
  returning * into v_event;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,
    case when p_action='complete' then 'scheduling.calendar.completed' else 'scheduling.calendar.cancelled' end,
    'calendar_event',v_event.id,
    case when p_action='complete' then 'Calendar event completed through governed M10 command' else 'Calendar event cancelled through governed M10 command' end,
    jsonb_build_object('operationId',p_operation_id,'newStatus',v_event.status,'newVersion',v_event.version,'reason',v_reason)
  );

  v_response := jsonb_build_object(
    'schema','enjaz.scheduling-calendar-state.v1',
    'id',v_event.id,'workspaceId',v_event.workspace_id,'status',v_event.status,
    'startsAt',v_event.starts_at,'endsAt',v_event.ends_at,'version',v_event.version,
    'updatedAt',v_event.updated_at,'wasDuplicate',false
  );

  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (
    p_workspace_id,p_operation_id,'calendar_event_state',p_event_id,v_actor,v_payload,v_response
  );

  return v_response;
end;
$$;

create or replace function public.mutate_calendar_event_state_v1(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.mutate_calendar_event_state_v1_impl(p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_action,p_reason);
$$;

revoke all on function private.mutate_calendar_event_state_v1_impl(uuid,uuid,uuid,integer,text,text) from public, anon;
grant execute on function private.mutate_calendar_event_state_v1_impl(uuid,uuid,uuid,integer,text,text) to authenticated, service_role;
revoke all on function public.mutate_calendar_event_state_v1(uuid,uuid,uuid,integer,text,text) from public, anon, service_role;
grant execute on function public.mutate_calendar_event_state_v1(uuid,uuid,uuid,integer,text,text) to authenticated;

create or replace function private.mutate_renewal_state_v1_impl(
  p_workspace_id uuid,
  p_renewal_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_renewal public.renewals%rowtype;
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_renewal_id is null or p_operation_id is null or p_expected_version is null or p_expected_version < 1 then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if p_action not in ('complete','cancel') then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_RENEWAL_ACTION_INVALID';
  end if;
  if p_action = 'cancel' and v_reason is null then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_CANCEL_REASON_REQUIRED';
  end if;
  if v_reason is not null and char_length(v_reason) > 1200 then
    raise invalid_parameter_value using message = 'ENJAZ_SCHEDULING_REASON_INVALID';
  end if;

  v_payload := jsonb_build_object(
    'renewalId',p_renewal_id,'expectedVersion',p_expected_version,'action',p_action,'reason',v_reason
  );
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text, 0));

  select * into v_receipt
  from private.scheduling_command_receipts r
  where r.workspace_id = p_workspace_id and r.operation_id = p_operation_id;
  if found then
    if v_receipt.command_type <> 'renewal_state'
       or v_receipt.entity_id <> p_renewal_id
       or v_receipt.actor_user_id <> v_actor
       or v_receipt.request_payload <> v_payload then
      raise unique_violation using message = 'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_renewal
  from public.renewals r
  where r.workspace_id = p_workspace_id and r.id = p_renewal_id
  for update;
  if not found then raise no_data_found using message = 'ENJAZ_SCHEDULING_RENEWAL_NOT_FOUND'; end if;
  if v_renewal.version <> p_expected_version then raise serialization_failure using message = 'ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_renewal.status <> 'active' then raise object_not_in_prerequisite_state using message = 'ENJAZ_SCHEDULING_RENEWAL_TERMINAL'; end if;

  update public.renewals
  set status = case when p_action='complete' then 'completed' else 'cancelled' end,
      last_completed_at = case when p_action='complete' then now() else last_completed_at end,
      updated_at = now(),
      version = version + 1
  where workspace_id = p_workspace_id and id = p_renewal_id
  returning * into v_renewal;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,
    case when p_action='complete' then 'scheduling.renewal.completed' else 'scheduling.renewal.cancelled' end,
    'renewal',v_renewal.id,
    case when p_action='complete' then 'Renewal completed through governed M10 command' else 'Renewal cancelled through governed M10 command' end,
    jsonb_build_object('operationId',p_operation_id,'newStatus',v_renewal.status,'newVersion',v_renewal.version,'reason',v_reason,'lastCompletedAt',v_renewal.last_completed_at)
  );

  v_response := jsonb_build_object(
    'schema','enjaz.scheduling-renewal-state.v1',
    'id',v_renewal.id,'workspaceId',v_renewal.workspace_id,'status',v_renewal.status,
    'dueDate',v_renewal.due_date,'lastCompletedAt',v_renewal.last_completed_at,
    'version',v_renewal.version,'updatedAt',v_renewal.updated_at,'wasDuplicate',false
  );

  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (
    p_workspace_id,p_operation_id,'renewal_state',p_renewal_id,v_actor,v_payload,v_response
  );

  return v_response;
end;
$$;

create or replace function public.mutate_renewal_state_v1(
  p_workspace_id uuid,
  p_renewal_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.mutate_renewal_state_v1_impl(p_workspace_id,p_renewal_id,p_operation_id,p_expected_version,p_action,p_reason);
$$;

revoke all on function private.mutate_renewal_state_v1_impl(uuid,uuid,uuid,integer,text,text) from public, anon;
grant execute on function private.mutate_renewal_state_v1_impl(uuid,uuid,uuid,integer,text,text) to authenticated, service_role;
revoke all on function public.mutate_renewal_state_v1(uuid,uuid,uuid,integer,text,text) from public, anon, service_role;
grant execute on function public.mutate_renewal_state_v1(uuid,uuid,uuid,integer,text,text) to authenticated;

commit;
