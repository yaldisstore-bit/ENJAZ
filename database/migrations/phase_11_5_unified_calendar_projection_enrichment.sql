-- ENJAZ Phase 11.5-D — enrich the existing read projection with canonical M10 evidence.
-- No scheduling fact is created here. Conflict, reschedule and recurrence facts remain owned
-- by their existing Phase 11.5-B/C authorities.
begin;

create or replace function private.list_unified_calendar_v1_impl(
  p_workspace_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_authority text default 'all',
  p_staff_member_id uuid default null,
  p_company_id uuid default null,
  p_transaction_id uuid default null,
  p_limit integer default 500
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_timezone text;
  v_items jsonb;
  v_authority text := lower(btrim(coalesce(p_authority,'all')));
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_range_start is null or p_range_end is null or p_range_start >= p_range_end then
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_RANGE_INVALID';
  end if;
  if p_range_end > p_range_start + interval '370 days' then
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_RANGE_TOO_WIDE';
  end if;
  if v_authority not in ('all','appointment','renewal','workflow_deadline') then
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_AUTHORITY_INVALID';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_LIMIT_INVALID';
  end if;
  select w.timezone into v_timezone from public.workspaces w where w.id=p_workspace_id;
  if not found or nullif(btrim(v_timezone),'') is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_UNIFIED_CALENDAR_TIMEZONE_MISSING';
  end if;
  if p_staff_member_id is not null and not exists(
    select 1 from public.organization_members om
    where om.workspace_id=p_workspace_id and om.id=p_staff_member_id and om.status='active'
      and om.valid_from<=now() and (om.valid_until is null or om.valid_until>now())
  ) then
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_STAFF_INVALID';
  end if;

  with appointment_rows as (
    select e.id,e.starts_at sort_at,jsonb_build_object(
      'id',e.id,'source','appointment','authority','calendar_events','title',e.title,
      'startsAt',e.starts_at,'endsAt',e.ends_at,'dueDate',null,'status',e.status,
      'attentionState',case when e.status in ('completed','cancelled') then 'terminal'
        when (e.starts_at at time zone v_timezone)::date < (now() at time zone v_timezone)::date then 'overdue'
        when (e.starts_at at time zone v_timezone)::date = (now() at time zone v_timezone)::date then 'due_today' else 'upcoming' end,
      'transactionId',e.transaction_id,'companyId',coalesce(e.company_id,t.company_id),
      'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),'staffMemberIds',staff.ids,
      'confirmationStatus',e.confirmation_status,'attendanceOutcome',e.attendance_outcome,
      'conflictState',conflict.snapshot->>'state','rescheduleCount',history.reschedule_count,
      'lastRescheduledAt',history.last_rescheduled_at,'lastRescheduleReason',history.last_reason
    ) item
    from public.calendar_events e
    left join public.transactions t on t.workspace_id=e.workspace_id and t.id=e.transaction_id
    left join public.companies c on c.workspace_id=e.workspace_id and c.id=coalesce(e.company_id,t.company_id) and c.deleted_at is null
    left join lateral (
      select coalesce(jsonb_agg(a.organization_member_id order by a.organization_member_id),'[]'::jsonb) ids,
        coalesce(array_agg(a.organization_member_id order by a.organization_member_id),'{}'::uuid[]) raw_ids
      from public.calendar_event_staff_assignments a
      where a.workspace_id=e.workspace_id and a.calendar_event_id=e.id and a.unassigned_at is null
    ) staff on true
    left join lateral (
      select private.calendar_staff_conflict_snapshot_v1(e.workspace_id,e.id,e.starts_at,e.ends_at,staff.raw_ids) snapshot
    ) conflict on true
    left join lateral (
      select count(*)::integer reschedule_count,max(h.created_at) last_rescheduled_at,
        (array_agg(h.reason order by h.created_at desc,h.id desc))[1] last_reason
      from public.calendar_event_reschedule_history h
      where h.workspace_id=e.workspace_id and h.calendar_event_id=e.id
    ) history on true
    where e.workspace_id=p_workspace_id and v_authority in ('all','appointment')
      and e.starts_at<p_range_end and coalesce(e.ends_at,e.starts_at)>=p_range_start
      and (p_company_id is null or coalesce(e.company_id,t.company_id)=p_company_id)
      and (p_transaction_id is null or e.transaction_id=p_transaction_id)
      and (p_staff_member_id is null or p_staff_member_id=any(staff.raw_ids))
  ), latest_deadline as (
    select distinct on (d.workflow_instance_id,d.stage_position) d.*
    from public.workflow_deadline_evidence d
    where d.workspace_id=p_workspace_id
    order by d.workflow_instance_id,d.stage_position,d.materialized_at desc,d.id desc
  ), deadline_rows as (
    select d.id,d.cutoff_at sort_at,jsonb_build_object(
      'id',d.id,'source','workflow_deadline','authority','workflow_deadline_evidence','title',d.stage_name,
      'startsAt',null,'endsAt',null,'dueDate',d.due_date,
      'status',case when s.completed_at is not null and s.completed_at<=d.cutoff_at then 'completed_on_time'
        when s.completed_at is not null then 'completed_late' when now()>=d.cutoff_at then 'overdue'
        when (now() at time zone d.workspace_timezone)::date=d.due_date then 'due_today' else 'upcoming' end,
      'attentionState',case when s.completed_at is not null then 'terminal' when now()>=d.cutoff_at then 'overdue'
        when (now() at time zone d.workspace_timezone)::date=d.due_date then 'due_today' else 'upcoming' end,
      'transactionId',d.transaction_id,'companyId',t.company_id,'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),
      'staffMemberIds','[]'::jsonb,'confirmationStatus',null,'attendanceOutcome',null,
      'conflictState','not_applicable','rescheduleCount',0,'lastRescheduledAt',null,'lastRescheduleReason',null
    ) item
    from latest_deadline d
    join public.workflow_stage_states s on s.workspace_id=d.workspace_id and s.id=d.workflow_stage_state_id
    join public.transactions t on t.workspace_id=d.workspace_id and t.id=d.transaction_id
    left join public.companies c on c.workspace_id=t.workspace_id and c.id=t.company_id and c.deleted_at is null
    where p_staff_member_id is null and v_authority in ('all','workflow_deadline')
      and d.cutoff_at>=p_range_start and (d.due_date::timestamp at time zone d.workspace_timezone)<p_range_end
      and (p_company_id is null or t.company_id=p_company_id) and (p_transaction_id is null or d.transaction_id=p_transaction_id)
  ), renewal_rows as (
    select o.id,(o.due_date::timestamp at time zone v_timezone) sort_at,jsonb_build_object(
      'id',o.id,'source','renewal','authority','renewal_occurrences','title',r.title,
      'startsAt',null,'endsAt',null,'dueDate',o.due_date,'status',o.status,
      'attentionState',case when o.status='completed' then 'terminal'
        when private.m10_deadline_cutoff_v1(o.due_date,v_timezone)<=now() then 'overdue'
        when o.due_date=(now() at time zone v_timezone)::date then 'due_today' else 'upcoming' end,
      'transactionId',r.transaction_id,'companyId',coalesce(r.company_id,t.company_id),
      'companyLabel',coalesce(nullif(c.display_name,''),c.legal_name),'staffMemberIds','[]'::jsonb,
      'confirmationStatus',null,'attendanceOutcome',null,'conflictState','not_applicable',
      'rescheduleCount',0,'lastRescheduledAt',null,'lastRescheduleReason',null
    ) item
    from public.renewal_occurrences o
    join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id
    left join public.transactions t on t.workspace_id=r.workspace_id and t.id=r.transaction_id
    left join public.companies c on c.workspace_id=r.workspace_id and c.id=coalesce(r.company_id,t.company_id) and c.deleted_at is null
    where o.workspace_id=p_workspace_id and p_staff_member_id is null and v_authority in ('all','renewal')
      and (o.due_date::timestamp at time zone v_timezone)>=p_range_start
      and (o.due_date::timestamp at time zone v_timezone)<p_range_end
      and (p_company_id is null or coalesce(r.company_id,t.company_id)=p_company_id)
      and (p_transaction_id is null or r.transaction_id=p_transaction_id)
  ), all_rows as (
    select * from appointment_rows union all select * from renewal_rows union all select * from deadline_rows
  ), selected_rows as (
    select id,sort_at,item from all_rows order by sort_at,id limit p_limit
  )
  select coalesce(jsonb_agg(item order by sort_at,id),'[]'::jsonb) into v_items from selected_rows;

  return jsonb_build_object(
    'schema','enjaz.unified-calendar.v1','workspaceId',p_workspace_id,'workspaceTimezone',v_timezone,
    'rangeStart',p_range_start,'rangeEnd',p_range_end,'authority',v_authority,'staffMemberId',p_staff_member_id,
    'companyId',p_company_id,'transactionId',p_transaction_id,'generatedAt',now(),'items',v_items
  );
end;
$$;

commit;
