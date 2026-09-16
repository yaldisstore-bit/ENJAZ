begin;

create or replace function private.validate_calendar_event_context_v1(
  p_workspace_id uuid,
  p_transaction_id uuid,
  p_company_id uuid,
  p_contact_id uuid,
  p_workflow_instance_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_workflow_transaction_id uuid;
begin
  if p_transaction_id is not null and not exists (
    select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_TRANSACTION_OUT_OF_SCOPE';
  end if;
  if p_company_id is not null and not exists (
    select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_COMPANY_OUT_OF_SCOPE';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_CONTACT_OUT_OF_SCOPE';
  end if;
  if p_workflow_instance_id is not null then
    select wi.transaction_id into v_workflow_transaction_id
    from public.workflow_instances wi
    where wi.workspace_id=p_workspace_id and wi.id=p_workflow_instance_id;
    if not found then
      raise foreign_key_violation using message='ENJAZ_SCHEDULING_WORKFLOW_OUT_OF_SCOPE';
    end if;
    if p_transaction_id is null or v_workflow_transaction_id is distinct from p_transaction_id then
      raise foreign_key_violation using message='ENJAZ_SCHEDULING_WORKFLOW_TRANSACTION_MISMATCH';
    end if;
  end if;
end;
$$;
revoke all on function private.validate_calendar_event_context_v1(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;

create or replace function private.current_calendar_staff_ids_v1(
  p_workspace_id uuid,
  p_event_id uuid
)
returns uuid[]
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(array_agg(a.organization_member_id order by a.organization_member_id),'{}'::uuid[])
  from public.calendar_event_staff_assignments a
  where a.workspace_id=p_workspace_id and a.calendar_event_id=p_event_id and a.unassigned_at is null;
$$;
revoke all on function private.current_calendar_staff_ids_v1(uuid,uuid) from public,anon,authenticated;

create or replace function private.calendar_event_command_response_v2(
  p_workspace_id uuid,
  p_event_id uuid,
  p_was_duplicate boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_event public.calendar_events%rowtype;
  v_staff uuid[];
begin
  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  v_staff := private.current_calendar_staff_ids_v1(p_workspace_id,p_event_id);
  return jsonb_build_object(
    'schema','enjaz.scheduling-calendar-event.v2',
    'id',v_event.id,'workspaceId',v_event.workspace_id,
    'transactionId',v_event.transaction_id,'companyId',v_event.company_id,'contactId',v_event.contact_id,
    'workflowInstanceId',v_event.workflow_instance_id,
    'title',v_event.title,'eventType',v_event.event_type,
    'startsAt',v_event.starts_at,'endsAt',v_event.ends_at,
    'status',v_event.status,'note',v_event.note,
    'staffMemberIds',to_jsonb(v_staff),
    'confirmationStatus',v_event.confirmation_status,
    'confirmationAt',v_event.confirmation_at,
    'confirmationSource',v_event.confirmation_source,
    'confirmationResponseId',v_event.confirmation_response_id,
    'attendanceOutcome',v_event.attendance_outcome,
    'attendanceRecordedAt',v_event.attendance_recorded_at,
    'version',v_event.version,'updatedAt',v_event.updated_at,
    'wasDuplicate',p_was_duplicate
  );
end;
$$;
revoke all on function private.calendar_event_command_response_v2(uuid,uuid,boolean) from public,anon,authenticated;

create or replace function private.create_calendar_event_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_title text,
  p_event_type text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_transaction_id uuid default null,
  p_company_id uuid default null,
  p_contact_id uuid default null,
  p_workflow_instance_id uuid default null,
  p_staff_member_ids uuid[] default '{}'::uuid[],
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_staff uuid[] := private.normalize_scheduling_staff_ids_v1(p_staff_member_ids);
  v_title text := btrim(coalesce(p_title,''));
  v_event_type text := btrim(coalesce(p_event_type,''));
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_starts_at is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if char_length(v_title) not between 1 and 320 or char_length(v_event_type) not between 1 and 120 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_EVENT_TEXT_INVALID';
  end if;
  if v_note is not null and char_length(v_note)>4000 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_NOTE_INVALID';
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RANGE_INVALID';
  end if;

  perform private.validate_calendar_event_context_v1(
    p_workspace_id,p_transaction_id,p_company_id,p_contact_id,p_workflow_instance_id
  );
  perform private.require_active_scheduling_staff_v1(p_workspace_id,v_staff,p_starts_at);

  v_payload := jsonb_build_object(
    'eventId',p_event_id,'title',v_title,'eventType',v_event_type,
    'startsAt',p_starts_at,'endsAt',p_ends_at,
    'transactionId',p_transaction_id,'companyId',p_company_id,'contactId',p_contact_id,
    'workflowInstanceId',p_workflow_instance_id,'staffMemberIds',to_jsonb(v_staff),'note',v_note
  );
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_create' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;
  if exists(select 1 from public.calendar_events e where e.id=p_event_id) then
    raise unique_violation using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_ID_EXISTS';
  end if;

  perform private.lock_scheduling_staff_set_v1(p_workspace_id,v_staff);
  perform private.assert_no_calendar_staff_conflict_v1(
    p_workspace_id,null,p_starts_at,p_ends_at,v_staff
  );

  insert into public.calendar_events(
    id,workspace_id,transaction_id,company_id,contact_id,workflow_instance_id,
    title,event_type,starts_at,ends_at,status,note,version
  ) values (
    p_event_id,p_workspace_id,p_transaction_id,p_company_id,p_contact_id,p_workflow_instance_id,
    v_title,v_event_type,p_starts_at,p_ends_at,'scheduled',v_note,1
  );

  insert into public.calendar_event_staff_assignments(
    workspace_id,calendar_event_id,organization_member_id,assigned_by
  )
  select p_workspace_id,p_event_id,s,v_actor from unnest(v_staff) s;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'scheduling.calendar.created','calendar_event',p_event_id,
    'Calendar event created through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'startsAt',p_starts_at,'endsAt',p_ends_at,
      'staffMemberIds',to_jsonb(v_staff),'workflowInstanceId',p_workflow_instance_id)
  );

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_create',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.create_calendar_event_v1(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_title text,
  p_event_type text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_transaction_id uuid default null,
  p_company_id uuid default null,
  p_contact_id uuid default null,
  p_workflow_instance_id uuid default null,
  p_staff_member_ids uuid[] default '{}'::uuid[],
  p_note text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.create_calendar_event_v1_impl(
    p_workspace_id,p_event_id,p_operation_id,p_title,p_event_type,p_starts_at,p_ends_at,
    p_transaction_id,p_company_id,p_contact_id,p_workflow_instance_id,p_staff_member_ids,p_note
  );
$$;
revoke all on function private.create_calendar_event_v1_impl(uuid,uuid,uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,uuid,uuid[],text) from public,anon;
grant execute on function private.create_calendar_event_v1_impl(uuid,uuid,uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,uuid,uuid[],text) to authenticated,service_role;
revoke all on function public.create_calendar_event_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,uuid,uuid[],text) from public,anon,service_role;
grant execute on function public.create_calendar_event_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,uuid,uuid[],text) to authenticated;

create or replace function private.update_calendar_event_metadata_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_title text,
  p_event_type text,
  p_transaction_id uuid default null,
  p_company_id uuid default null,
  p_contact_id uuid default null,
  p_workflow_instance_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_title text := btrim(coalesce(p_title,''));
  v_event_type text := btrim(coalesce(p_event_type,''));
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if char_length(v_title) not between 1 and 320 or char_length(v_event_type) not between 1 and 120 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_EVENT_TEXT_INVALID';
  end if;
  if v_note is not null and char_length(v_note)>4000 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_NOTE_INVALID';
  end if;
  perform private.validate_calendar_event_context_v1(
    p_workspace_id,p_transaction_id,p_company_id,p_contact_id,p_workflow_instance_id
  );
  v_payload := jsonb_build_object(
    'eventId',p_event_id,'expectedVersion',p_expected_version,'title',v_title,'eventType',v_event_type,
    'transactionId',p_transaction_id,'companyId',p_company_id,'contactId',p_contact_id,
    'workflowInstanceId',p_workflow_instance_id,'note',v_note
  );
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_metadata' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status<>'scheduled' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;
  if v_event.confirmation_response_id is not null and p_transaction_id is distinct from v_event.transaction_id then
    raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CONFIRMED_CONTEXT_IMMUTABLE';
  end if;

  update public.calendar_events
  set transaction_id=p_transaction_id,company_id=p_company_id,contact_id=p_contact_id,
      workflow_instance_id=p_workflow_instance_id,title=v_title,event_type=v_event_type,note=v_note,
      updated_at=now(),version=version+1
  where workspace_id=p_workspace_id and id=p_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.calendar.metadata_updated','calendar_event',p_event_id,
    'Calendar event metadata updated through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'previousVersion',p_expected_version,'newVersion',p_expected_version+1,
      'workflowInstanceId',p_workflow_instance_id));

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_metadata',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.update_calendar_event_metadata_v1(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_title text,
  p_event_type text,
  p_transaction_id uuid default null,
  p_company_id uuid default null,
  p_contact_id uuid default null,
  p_workflow_instance_id uuid default null,
  p_note text default null
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.update_calendar_event_metadata_v1_impl(
  p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_title,p_event_type,
  p_transaction_id,p_company_id,p_contact_id,p_workflow_instance_id,p_note); $$;
revoke all on function private.update_calendar_event_metadata_v1_impl(uuid,uuid,uuid,integer,text,text,uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.update_calendar_event_metadata_v1_impl(uuid,uuid,uuid,integer,text,text,uuid,uuid,uuid,uuid,text) to authenticated,service_role;
revoke all on function public.update_calendar_event_metadata_v1(uuid,uuid,uuid,integer,text,text,uuid,uuid,uuid,uuid,text) from public,anon,service_role;
grant execute on function public.update_calendar_event_metadata_v1(uuid,uuid,uuid,integer,text,text,uuid,uuid,uuid,uuid,text) to authenticated;

create or replace function private.reschedule_calendar_event_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_staff uuid[];
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1 or p_starts_at is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if v_reason is null or char_length(v_reason)>1200 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RESCHEDULE_REASON_REQUIRED';
  end if;
  if p_ends_at is not null and p_ends_at<=p_starts_at then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RANGE_INVALID';
  end if;
  v_payload := jsonb_build_object('eventId',p_event_id,'expectedVersion',p_expected_version,
    'startsAt',p_starts_at,'endsAt',p_ends_at,'reason',v_reason);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_reschedule' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status<>'scheduled' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;
  v_staff := private.current_calendar_staff_ids_v1(p_workspace_id,p_event_id);
  perform private.require_active_scheduling_staff_v1(p_workspace_id,v_staff,p_starts_at);
  perform private.lock_scheduling_staff_set_v1(p_workspace_id,v_staff);
  perform private.assert_no_calendar_staff_conflict_v1(p_workspace_id,p_event_id,p_starts_at,p_ends_at,v_staff);

  insert into public.calendar_event_reschedule_history(
    workspace_id,calendar_event_id,operation_id,actor_user_id,
    previous_starts_at,previous_ends_at,new_starts_at,new_ends_at,reason,version_before,version_after
  ) values (
    p_workspace_id,p_event_id,p_operation_id,v_actor,
    v_event.starts_at,v_event.ends_at,p_starts_at,p_ends_at,v_reason,v_event.version,v_event.version+1
  );

  update public.calendar_events
  set starts_at=p_starts_at,ends_at=p_ends_at,
      confirmation_status='unconfirmed',confirmation_at=null,confirmation_source=null,confirmation_response_id=null,
      updated_at=now(),version=version+1
  where workspace_id=p_workspace_id and id=p_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.calendar.rescheduled','calendar_event',p_event_id,
    'Calendar event rescheduled through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'reason',v_reason,
      'previousStartsAt',v_event.starts_at,'previousEndsAt',v_event.ends_at,
      'newStartsAt',p_starts_at,'newEndsAt',p_ends_at,'staffMemberIds',to_jsonb(v_staff),
      'previousVersion',v_event.version,'newVersion',v_event.version+1));

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_reschedule',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.reschedule_calendar_event_v1(
  p_workspace_id uuid,p_event_id uuid,p_operation_id uuid,p_expected_version integer,
  p_starts_at timestamptz,p_ends_at timestamptz,p_reason text
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.reschedule_calendar_event_v1_impl(
  p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_starts_at,p_ends_at,p_reason); $$;
revoke all on function private.reschedule_calendar_event_v1_impl(uuid,uuid,uuid,integer,timestamptz,timestamptz,text) from public,anon;
grant execute on function private.reschedule_calendar_event_v1_impl(uuid,uuid,uuid,integer,timestamptz,timestamptz,text) to authenticated,service_role;
revoke all on function public.reschedule_calendar_event_v1(uuid,uuid,uuid,integer,timestamptz,timestamptz,text) from public,anon,service_role;
grant execute on function public.reschedule_calendar_event_v1(uuid,uuid,uuid,integer,timestamptz,timestamptz,text) to authenticated;

create or replace function private.set_calendar_event_staff_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_staff_member_ids uuid[],
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_old uuid[];
  v_new uuid[] := private.normalize_scheduling_staff_ids_v1(p_staff_member_ids);
  v_removed uuid[];
  v_added uuid[];
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  if v_reason is not null and char_length(v_reason)>1200 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_REASON_INVALID';
  end if;
  v_payload := jsonb_build_object('eventId',p_event_id,'expectedVersion',p_expected_version,
    'staffMemberIds',to_jsonb(v_new),'reason',v_reason);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_staff' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status<>'scheduled' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;

  v_old := private.current_calendar_staff_ids_v1(p_workspace_id,p_event_id);
  select coalesce(array_agg(x order by x),'{}'::uuid[]) into v_removed
  from unnest(v_old) x where not (x=any(v_new));
  select coalesce(array_agg(x order by x),'{}'::uuid[]) into v_added
  from unnest(v_new) x where not (x=any(v_old));

  if cardinality(v_removed)>0 and v_reason is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_UNASSIGN_REASON_REQUIRED';
  end if;
  perform private.require_active_scheduling_staff_v1(p_workspace_id,v_new,v_event.starts_at);
  perform private.lock_scheduling_staff_set_v1(p_workspace_id,private.normalize_scheduling_staff_ids_v1(v_old || v_new));
  perform private.assert_no_calendar_staff_conflict_v1(
    p_workspace_id,p_event_id,v_event.starts_at,v_event.ends_at,v_new
  );

  if v_old=v_new then
    v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false) || jsonb_build_object('changed',false);
    insert into private.scheduling_command_receipts(
      workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
    ) values (p_workspace_id,p_operation_id,'calendar_event_staff',p_event_id,v_actor,v_payload,v_response);
    return v_response;
  end if;

  update public.calendar_event_staff_assignments
  set unassigned_at=now(),unassigned_by=v_actor,unassignment_reason=v_reason
  where workspace_id=p_workspace_id and calendar_event_id=p_event_id and unassigned_at is null
    and organization_member_id=any(v_removed);

  insert into public.calendar_event_staff_assignments(
    workspace_id,calendar_event_id,organization_member_id,assigned_by
  ) select p_workspace_id,p_event_id,x,v_actor from unnest(v_added) x;

  update public.calendar_events set updated_at=now(),version=version+1
  where workspace_id=p_workspace_id and id=p_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.calendar.staff_changed','calendar_event',p_event_id,
    'Calendar event staff assignment changed through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'previousStaffMemberIds',to_jsonb(v_old),
      'newStaffMemberIds',to_jsonb(v_new),'added',to_jsonb(v_added),'removed',to_jsonb(v_removed),
      'reason',v_reason,'previousVersion',v_event.version,'newVersion',v_event.version+1));

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false) || jsonb_build_object('changed',true);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_staff',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.set_calendar_event_staff_v1(
  p_workspace_id uuid,p_event_id uuid,p_operation_id uuid,p_expected_version integer,
  p_staff_member_ids uuid[],p_reason text default null
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.set_calendar_event_staff_v1_impl(
  p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_staff_member_ids,p_reason); $$;
revoke all on function private.set_calendar_event_staff_v1_impl(uuid,uuid,uuid,integer,uuid[],text) from public,anon;
grant execute on function private.set_calendar_event_staff_v1_impl(uuid,uuid,uuid,integer,uuid[],text) to authenticated,service_role;
revoke all on function public.set_calendar_event_staff_v1(uuid,uuid,uuid,integer,uuid[],text) from public,anon,service_role;
grant execute on function public.set_calendar_event_staff_v1(uuid,uuid,uuid,integer,uuid[],text) to authenticated;

create or replace function private.set_calendar_event_confirmation_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_confirmation_status text,
  p_response_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_portal public.client_portal_appointment_responses%rowtype;
  v_status text := lower(btrim(coalesce(p_confirmation_status,'')));
  v_source text;
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1
     or v_status not in ('confirmed','declined') then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_CONFIRMATION_INVALID';
  end if;
  v_payload := jsonb_build_object('eventId',p_event_id,'expectedVersion',p_expected_version,
    'confirmationStatus',v_status,'responseId',p_response_id);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_confirmation' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status<>'scheduled' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;

  if p_response_id is null then
    v_source := 'staff';
  else
    select * into v_portal from public.client_portal_appointment_responses r
    where r.workspace_id=p_workspace_id and r.id=p_response_id;
    if not found then raise foreign_key_violation using message='ENJAZ_SCHEDULING_PORTAL_RESPONSE_OUT_OF_SCOPE'; end if;
    if v_event.transaction_id is null or v_portal.transaction_id is distinct from v_event.transaction_id then
      raise foreign_key_violation using message='ENJAZ_SCHEDULING_PORTAL_RESPONSE_TRANSACTION_MISMATCH';
    end if;
    if v_portal.decision<>v_status then
      raise invalid_parameter_value using message='ENJAZ_SCHEDULING_PORTAL_RESPONSE_DECISION_MISMATCH';
    end if;
    v_source := 'client_portal';
  end if;

  update public.calendar_events
  set confirmation_status=v_status,confirmation_at=now(),confirmation_source=v_source,
      confirmation_response_id=p_response_id,updated_at=now(),version=version+1
  where workspace_id=p_workspace_id and id=p_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.calendar.confirmation_recorded','calendar_event',p_event_id,
    'Calendar event confirmation recorded through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'confirmationStatus',v_status,'source',v_source,
      'responseId',p_response_id,'previousVersion',v_event.version,'newVersion',v_event.version+1));

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_confirmation',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.set_calendar_event_confirmation_v1(
  p_workspace_id uuid,p_event_id uuid,p_operation_id uuid,p_expected_version integer,
  p_confirmation_status text,p_response_id uuid default null
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.set_calendar_event_confirmation_v1_impl(
  p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_confirmation_status,p_response_id); $$;
revoke all on function private.set_calendar_event_confirmation_v1_impl(uuid,uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function private.set_calendar_event_confirmation_v1_impl(uuid,uuid,uuid,integer,text,uuid) to authenticated,service_role;
revoke all on function public.set_calendar_event_confirmation_v1(uuid,uuid,uuid,integer,text,uuid) from public,anon,service_role;
grant execute on function public.set_calendar_event_confirmation_v1(uuid,uuid,uuid,integer,text,uuid) to authenticated;

create or replace function private.record_calendar_event_attendance_v1_impl(
  p_workspace_id uuid,
  p_event_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_outcome text,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_event public.calendar_events%rowtype;
  v_outcome text := lower(btrim(coalesce(p_outcome,'')));
  v_note text := nullif(btrim(coalesce(p_note,'')),'');
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_event_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1
     or v_outcome not in ('attended','missed') then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_ATTENDANCE_INVALID';
  end if;
  if v_note is not null and char_length(v_note)>1200 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_ATTENDANCE_NOTE_INVALID';
  end if;
  v_payload := jsonb_build_object('eventId',p_event_id,'expectedVersion',p_expected_version,
    'outcome',v_outcome,'note',v_note);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':' || p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'calendar_event_attendance' or v_receipt.entity_id<>p_event_id
       or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_event from public.calendar_events e
  where e.workspace_id=p_workspace_id and e.id=p_event_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_NOT_FOUND'; end if;
  if v_event.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_event.status<>'scheduled' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL'; end if;
  if v_event.starts_at>now() then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_ATTENDANCE_FUTURE_EVENT'; end if;
  if v_event.confirmation_status='declined' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_ATTENDANCE_DECLINED_EVENT'; end if;

  update public.calendar_events
  set status='completed',attendance_outcome=v_outcome,attendance_recorded_at=now(),
      updated_at=now(),version=version+1
  where workspace_id=p_workspace_id and id=p_event_id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.calendar.attendance_recorded','calendar_event',p_event_id,
    'Calendar event attendance recorded through governed M10 command',
    jsonb_build_object('operationId',p_operation_id,'outcome',v_outcome,'note',v_note,
      'previousVersion',v_event.version,'newVersion',v_event.version+1));

  v_response := private.calendar_event_command_response_v2(p_workspace_id,p_event_id,false);
  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (p_workspace_id,p_operation_id,'calendar_event_attendance',p_event_id,v_actor,v_payload,v_response);
  return v_response;
end;
$$;

create or replace function public.record_calendar_event_attendance_v1(
  p_workspace_id uuid,p_event_id uuid,p_operation_id uuid,p_expected_version integer,
  p_outcome text,p_note text default null
)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.record_calendar_event_attendance_v1_impl(
  p_workspace_id,p_event_id,p_operation_id,p_expected_version,p_outcome,p_note); $$;
revoke all on function private.record_calendar_event_attendance_v1_impl(uuid,uuid,uuid,integer,text,text) from public,anon;
grant execute on function private.record_calendar_event_attendance_v1_impl(uuid,uuid,uuid,integer,text,text) to authenticated,service_role;
revoke all on function public.record_calendar_event_attendance_v1(uuid,uuid,uuid,integer,text,text) from public,anon,service_role;
grant execute on function public.record_calendar_event_attendance_v1(uuid,uuid,uuid,integer,text,text) to authenticated;

commit;
