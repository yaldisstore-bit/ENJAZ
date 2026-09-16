-- ENJAZ Phase 11.5-D — governed unified calendar read model.
-- This is a read projection only. Canonical truth remains calendar_events, workflow facts,
-- renewals/renewal_occurrences, organization_members and their existing command boundaries.
begin;

create or replace function private.get_scheduling_calendar_v1_impl(
  p_workspace_id uuid,
  p_window_start timestamptz default null,
  p_window_end timestamptz default null,
  p_staff_member_id uuid default null,
  p_company_id uuid default null,
  p_transaction_id uuid default null,
  p_authority text default null,
  p_limit integer default 500
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_tz text;
  v_authority text:=nullif(lower(btrim(coalesce(p_authority,''))), '');
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_limit integer:=least(greatest(coalesce(p_limit,500),1),1000);
  v_items jsonb:='[]'::jsonb;
  v_summary jsonb:='{}'::jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  select w.timezone into v_tz from public.workspaces w where w.id=p_workspace_id;
  if v_tz is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_WORKSPACE_TIMEZONE_MISSING';
  end if;

  v_window_start:=coalesce(
    p_window_start,
    ((date_trunc('day',now() at time zone v_tz)-interval '31 days') at time zone v_tz)
  );
  v_window_end:=coalesce(
    p_window_end,
    ((date_trunc('day',now() at time zone v_tz)+interval '62 days') at time zone v_tz)
  );
  if v_window_end<=v_window_start or v_window_end-v_window_start>interval '370 days' then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_CALENDAR_WINDOW_INVALID';
  end if;
  if v_authority is not null and v_authority not in ('appointment','workflow_deadline','renewal_occurrence') then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_CALENDAR_AUTHORITY_INVALID';
  end if;

  if p_staff_member_id is not null and not exists(
    select 1 from public.organization_members om
    where om.workspace_id=p_workspace_id and om.id=p_staff_member_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_CALENDAR_STAFF_OUT_OF_SCOPE';
  end if;
  if p_company_id is not null and not exists(
    select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_CALENDAR_COMPANY_OUT_OF_SCOPE';
  end if;
  if p_transaction_id is not null and not exists(
    select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_CALENDAR_TRANSACTION_OUT_OF_SCOPE';
  end if;
  if p_company_id is not null and p_transaction_id is not null and not exists(
    select 1 from public.transactions t
    where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.company_id=p_company_id
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_CALENDAR_FILTER_CONTEXT_MISMATCH';
  end if;

  with appointment_source as (
    select
      e.starts_at as sort_at,
      jsonb_build_object(
        'id',e.id,
        'sourceKind','appointment',
        'canonicalId',e.id,
        'title',e.title,
        'eventType',e.event_type,
        'startsAt',e.starts_at,
        'endsAt',e.ends_at,
        'allDay',false,
        'localDate',(e.starts_at at time zone v_tz)::date,
        'status',e.status,
        'temporalState',case
          when e.status='cancelled' then 'cancelled'
          when e.status='completed' then 'completed'
          when now()<e.starts_at then 'upcoming'
          when e.ends_at is not null and now()<=e.ends_at then 'in_progress'
          else 'past_unresolved'
        end,
        'isUpcoming',(e.status='scheduled' and now()<e.starts_at),
        'isOverdue',false,
        'transactionId',e.transaction_id,
        'transactionLabel',t.type,
        'companyId',coalesce(e.company_id,t.company_id),
        'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),
        'workflowInstanceId',e.workflow_instance_id,
        'confirmationStatus',e.confirmation_status,
        'attendanceOutcome',e.attendance_outcome,
        'version',e.version,
        'staffMemberIds',coalesce(staff.ids,'[]'::jsonb),
        'conflictState',conflict.snapshot->>'state',
        'isConflict',(conflict.snapshot->>'state'='conflict'),
        'rescheduleCount',coalesce(history.reschedule_count,0),
        'lastRescheduledAt',history.last_rescheduled_at,
        'lastRescheduleReason',history.last_reason,
        'missReviewRecorded',false
      ) as payload
    from public.calendar_events e
    left join public.transactions t
      on t.workspace_id=e.workspace_id and t.id=e.transaction_id
    left join public.companies c
      on c.workspace_id=e.workspace_id and c.id=coalesce(e.company_id,t.company_id)
    left join lateral (
      select
        coalesce(jsonb_agg(a.organization_member_id order by a.organization_member_id),'[]'::jsonb) ids,
        coalesce(array_agg(a.organization_member_id order by a.organization_member_id),'{}'::uuid[]) raw_ids
      from public.calendar_event_staff_assignments a
      where a.workspace_id=e.workspace_id and a.calendar_event_id=e.id and a.unassigned_at is null
    ) staff on true
    left join lateral (
      select private.calendar_staff_conflict_snapshot_v1(
        e.workspace_id,e.id,e.starts_at,e.ends_at,staff.raw_ids
      ) snapshot
    ) conflict on true
    left join lateral (
      select
        count(*)::integer reschedule_count,
        max(h.created_at) last_rescheduled_at,
        (array_agg(h.reason order by h.created_at desc,h.id desc))[1] last_reason
      from public.calendar_event_reschedule_history h
      where h.workspace_id=e.workspace_id and h.calendar_event_id=e.id
    ) history on true
    where e.workspace_id=p_workspace_id
      and (v_authority is null or v_authority='appointment')
      and e.starts_at<v_window_end
      and coalesce(e.ends_at,e.starts_at+interval '1 second')>=v_window_start
      and (p_staff_member_id is null or exists(
        select 1 from public.calendar_event_staff_assignments sa
        where sa.workspace_id=e.workspace_id and sa.calendar_event_id=e.id
          and sa.organization_member_id=p_staff_member_id and sa.unassigned_at is null
      ))
      and (p_company_id is null or coalesce(e.company_id,t.company_id)=p_company_id)
      and (p_transaction_id is null or e.transaction_id=p_transaction_id)
  ), latest_deadline as (
    select distinct on (d.workflow_instance_id,d.stage_position) d.*
    from public.workflow_deadline_evidence d
    where d.workspace_id=p_workspace_id
    order by d.workflow_instance_id,d.stage_position,d.materialized_at desc,d.id desc
  ), deadline_source as (
    select
      (d.due_date::timestamp at time zone d.workspace_timezone) as sort_at,
      jsonb_build_object(
        'id',d.id,
        'sourceKind','workflow_deadline',
        'canonicalId',d.id,
        'title',d.stage_name,
        'eventType','workflow_deadline',
        'startsAt',(d.due_date::timestamp at time zone d.workspace_timezone),
        'endsAt',d.cutoff_at,
        'allDay',true,
        'localDate',d.due_date,
        'dueDate',d.due_date,
        'cutoffAt',d.cutoff_at,
        'status',case
          when s.completed_at is not null and s.completed_at<=d.cutoff_at then 'completed_on_time'
          when s.completed_at is not null then 'completed_late'
          when now()>=d.cutoff_at then 'overdue'
          when (now() at time zone d.workspace_timezone)::date=d.due_date then 'due_today'
          else 'upcoming'
        end,
        'temporalState',case
          when s.completed_at is not null and s.completed_at<=d.cutoff_at then 'completed_on_time'
          when s.completed_at is not null then 'completed_late'
          when now()>=d.cutoff_at then 'overdue'
          when (now() at time zone d.workspace_timezone)::date=d.due_date then 'due_today'
          else 'upcoming'
        end,
        'isUpcoming',(s.completed_at is null and now()<d.cutoff_at),
        'isOverdue',(s.completed_at is null and now()>=d.cutoff_at),
        'transactionId',d.transaction_id,
        'transactionLabel',t.type,
        'companyId',t.company_id,
        'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),
        'workflowInstanceId',d.workflow_instance_id,
        'stagePosition',d.stage_position,
        'staffMemberIds','[]'::jsonb,
        'conflictState','not_applicable',
        'isConflict',false,
        'rescheduleCount',0,
        'lastRescheduledAt',null,
        'lastRescheduleReason',null,
        'missReviewRecorded',exists(
          select 1 from public.deadline_miss_reviews mr
          where mr.workspace_id=d.workspace_id and mr.source_kind='workflow_deadline' and mr.source_id=d.id
        )
      ) as payload
    from latest_deadline d
    join public.workflow_stage_states s
      on s.workspace_id=d.workspace_id and s.id=d.workflow_stage_state_id
    join public.transactions t
      on t.workspace_id=d.workspace_id and t.id=d.transaction_id
    left join public.companies c
      on c.workspace_id=t.workspace_id and c.id=t.company_id
    where (v_authority is null or v_authority='workflow_deadline')
      and p_staff_member_id is null
      and (d.due_date::timestamp at time zone d.workspace_timezone)<v_window_end
      and d.cutoff_at>=v_window_start
      and (p_company_id is null or t.company_id=p_company_id)
      and (p_transaction_id is null or d.transaction_id=p_transaction_id)
  ), renewal_source as (
    select
      (o.due_date::timestamp at time zone v_tz) as sort_at,
      jsonb_build_object(
        'id',o.id,
        'sourceKind','renewal_occurrence',
        'canonicalId',o.id,
        'title',r.title,
        'eventType','renewal_occurrence',
        'startsAt',(o.due_date::timestamp at time zone v_tz),
        'endsAt',private.m10_deadline_cutoff_v1(o.due_date,v_tz),
        'allDay',true,
        'localDate',o.due_date,
        'dueDate',o.due_date,
        'cutoffAt',private.m10_deadline_cutoff_v1(o.due_date,v_tz),
        'status',case
          when o.status='completed' and o.completed_at<=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'completed_on_time'
          when o.status='completed' then 'completed_late'
          when now()>=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'overdue'
          when (now() at time zone v_tz)::date=o.due_date then 'due_today'
          else 'upcoming'
        end,
        'temporalState',case
          when o.status='completed' and o.completed_at<=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'completed_on_time'
          when o.status='completed' then 'completed_late'
          when now()>=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'overdue'
          when (now() at time zone v_tz)::date=o.due_date then 'due_today'
          else 'upcoming'
        end,
        'isUpcoming',(o.status='pending' and now()<private.m10_deadline_cutoff_v1(o.due_date,v_tz)),
        'isOverdue',(o.status='pending' and now()>=private.m10_deadline_cutoff_v1(o.due_date,v_tz)),
        'transactionId',r.transaction_id,
        'transactionLabel',t.type,
        'companyId',coalesce(r.company_id,t.company_id),
        'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),
        'renewalId',r.id,
        'occurrenceSequence',o.occurrence_sequence,
        'staffMemberIds','[]'::jsonb,
        'conflictState','not_applicable',
        'isConflict',false,
        'rescheduleCount',0,
        'lastRescheduledAt',null,
        'lastRescheduleReason',null,
        'missReviewRecorded',exists(
          select 1 from public.deadline_miss_reviews mr
          where mr.workspace_id=o.workspace_id and mr.source_kind='renewal_occurrence' and mr.source_id=o.id
        )
      ) as payload
    from public.renewal_occurrences o
    join public.renewals r
      on r.workspace_id=o.workspace_id and r.id=o.renewal_id
    left join public.transactions t
      on t.workspace_id=r.workspace_id and t.id=r.transaction_id
    left join public.companies c
      on c.workspace_id=r.workspace_id and c.id=coalesce(r.company_id,t.company_id)
    where o.workspace_id=p_workspace_id
      and (v_authority is null or v_authority='renewal_occurrence')
      and p_staff_member_id is null
      and (o.due_date::timestamp at time zone v_tz)<v_window_end
      and private.m10_deadline_cutoff_v1(o.due_date,v_tz)>=v_window_start
      and (p_company_id is null or coalesce(r.company_id,t.company_id)=p_company_id)
      and (p_transaction_id is null or r.transaction_id=p_transaction_id)
  ), all_rows as (
    select * from appointment_source
    union all select * from deadline_source
    union all select * from renewal_source
  ), limited_rows as (
    select * from all_rows order by sort_at,payload->>'sourceKind',payload->>'id' limit v_limit
  )
  select
    coalesce((select jsonb_agg(l.payload order by l.sort_at,l.payload->>'sourceKind',l.payload->>'id') from limited_rows l),'[]'::jsonb),
    jsonb_build_object(
      'totalCount',(select count(*) from all_rows),
      'returnedCount',(select count(*) from limited_rows),
      'appointmentCount',(select count(*) from all_rows x where x.payload->>'sourceKind'='appointment'),
      'workflowDeadlineCount',(select count(*) from all_rows x where x.payload->>'sourceKind'='workflow_deadline'),
      'renewalOccurrenceCount',(select count(*) from all_rows x where x.payload->>'sourceKind'='renewal_occurrence'),
      'conflictCount',(select count(*) from all_rows x where coalesce((x.payload->>'isConflict')::boolean,false)),
      'overdueCount',(select count(*) from all_rows x where coalesce((x.payload->>'isOverdue')::boolean,false)),
      'upcomingCount',(select count(*) from all_rows x where coalesce((x.payload->>'isUpcoming')::boolean,false)),
      'pastUnresolvedAppointmentCount',(select count(*) from all_rows x where x.payload->>'temporalState'='past_unresolved')
    )
  into v_items,v_summary;

  return jsonb_build_object(
    'schema','enjaz.scheduling-calendar.v1',
    'workspaceId',p_workspace_id,
    'actorUserId',v_actor,
    'timezone',v_tz,
    'asOf',now(),
    'windowStart',v_window_start,
    'windowEnd',v_window_end,
    'filters',jsonb_build_object(
      'staffMemberId',p_staff_member_id,
      'companyId',p_company_id,
      'transactionId',p_transaction_id,
      'authority',v_authority
    ),
    'summary',v_summary,
    'items',v_items,
    'exportBoundary',jsonb_build_object(
      'mode','outbound_projection_only',
      'externalStateCanonical',false,
      'externalMutationAllowed',false
    )
  );
end;
$$;

create or replace function public.get_scheduling_calendar_v1(
  p_workspace_id uuid,
  p_window_start timestamptz default null,
  p_window_end timestamptz default null,
  p_staff_member_id uuid default null,
  p_company_id uuid default null,
  p_transaction_id uuid default null,
  p_authority text default null,
  p_limit integer default 500
) returns jsonb
language sql stable security invoker set search_path=''
as $$
  select private.get_scheduling_calendar_v1_impl($1,$2,$3,$4,$5,$6,$7,$8);
$$;

revoke all on function private.get_scheduling_calendar_v1_impl(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer) from public,anon;
grant execute on function private.get_scheduling_calendar_v1_impl(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer) to authenticated,service_role;
revoke all on function public.get_scheduling_calendar_v1(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer) from public,anon,service_role;
grant execute on function public.get_scheduling_calendar_v1(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer) to authenticated;

commit;
