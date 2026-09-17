-- ENJAZ Phase 11.5-D — governed unified calendar read model.
-- This is a read projection only. Canonical truth remains in calendar_events,
-- renewals and workflow_deadline_evidence; no shadow scheduling store is created.
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
    raise invalid_parameter_value using message = 'ENJAZ_UNIFIED_CALENDAR_RANGE_INVALID';
  end if;
  if p_range_end > p_range_start + interval '370 days' then
    raise invalid_parameter_value using message = 'ENJAZ_UNIFIED_CALENDAR_RANGE_TOO_WIDE';
  end if;
  if v_authority not in ('all','appointment','renewal','workflow_deadline') then
    raise invalid_parameter_value using message = 'ENJAZ_UNIFIED_CALENDAR_AUTHORITY_INVALID';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise invalid_parameter_value using message = 'ENJAZ_UNIFIED_CALENDAR_LIMIT_INVALID';
  end if;

  select w.timezone into v_timezone
  from public.workspaces w
  where w.id = p_workspace_id;
  if not found or nullif(btrim(v_timezone),'') is null then
    raise object_not_in_prerequisite_state using message = 'ENJAZ_UNIFIED_CALENDAR_TIMEZONE_MISSING';
  end if;

  if p_staff_member_id is not null and not exists (
    select 1
    from public.organization_members om
    where om.workspace_id = p_workspace_id
      and om.id = p_staff_member_id
      and om.status = 'active'
      and om.valid_from <= now()
      and (om.valid_until is null or om.valid_until > now())
  ) then
    raise invalid_parameter_value using message = 'ENJAZ_UNIFIED_CALENDAR_STAFF_INVALID';
  end if;

  with appointment_rows as (
    select
      e.id,
      e.starts_at as sort_at,
      jsonb_build_object(
        'id', e.id,
        'source', 'appointment',
        'authority', 'calendar_events',
        'title', e.title,
        'eventType', e.event_type,
        'startsAt', e.starts_at,
        'endsAt', e.ends_at,
        'dueDate', null,
        'status', e.status,
        'attentionState', case
          when e.status in ('completed','cancelled') then 'terminal'
          when (e.starts_at at time zone v_timezone)::date < (now() at time zone v_timezone)::date then 'overdue'
          when (e.starts_at at time zone v_timezone)::date = (now() at time zone v_timezone)::date then 'due_today'
          else 'upcoming'
        end,
        'transactionId', e.transaction_id,
        'companyId', e.company_id,
        'companyLabel', coalesce(c.display_name,c.legal_name),
        'workflowInstanceId', e.workflow_instance_id,
        'staffMemberIds', coalesce((
          select jsonb_agg(a.organization_member_id order by a.organization_member_id)
          from public.calendar_event_staff_assignments a
          where a.workspace_id = e.workspace_id
            and a.calendar_event_id = e.id
            and a.unassigned_at is null
        ), '[]'::jsonb),
        'confirmationStatus', e.confirmation_status,
        'attendanceOutcome', e.attendance_outcome,
        'version', e.version,
        'recurrenceRule', null,
        'deadlineStageName', null,
        'deadlineSourceFingerprint', null
      ) as item
    from public.calendar_events e
    left join public.companies c
      on c.workspace_id = e.workspace_id and c.id = e.company_id and c.deleted_at is null
    where e.workspace_id = p_workspace_id
      and v_authority in ('all','appointment')
      and e.starts_at < p_range_end
      and coalesce(e.ends_at,e.starts_at) >= p_range_start
      and (p_company_id is null or e.company_id = p_company_id)
      and (p_transaction_id is null or e.transaction_id = p_transaction_id)
      and (
        p_staff_member_id is null
        or exists (
          select 1 from public.calendar_event_staff_assignments af
          where af.workspace_id = e.workspace_id
            and af.calendar_event_id = e.id
            and af.organization_member_id = p_staff_member_id
            and af.unassigned_at is null
        )
      )
  ),
  renewal_rows as (
    select
      r.id,
      (r.due_date::timestamp at time zone v_timezone) as sort_at,
      jsonb_build_object(
        'id', r.id,
        'source', 'renewal',
        'authority', 'renewals',
        'title', r.title,
        'eventType', 'renewal',
        'startsAt', null,
        'endsAt', null,
        'dueDate', r.due_date,
        'status', r.status,
        'attentionState', case
          when r.status in ('completed','cancelled') then 'terminal'
          when r.due_date < (now() at time zone v_timezone)::date then 'overdue'
          when r.due_date = (now() at time zone v_timezone)::date then 'due_today'
          else 'upcoming'
        end,
        'transactionId', r.transaction_id,
        'companyId', r.company_id,
        'companyLabel', coalesce(c.display_name,c.legal_name),
        'workflowInstanceId', null,
        'staffMemberIds', '[]'::jsonb,
        'confirmationStatus', null,
        'attendanceOutcome', null,
        'version', r.version,
        'recurrenceRule', r.recurrence_rule,
        'deadlineStageName', null,
        'deadlineSourceFingerprint', null
      ) as item
    from public.renewals r
    left join public.companies c
      on c.workspace_id = r.workspace_id and c.id = r.company_id and c.deleted_at is null
    where r.workspace_id = p_workspace_id
      and p_staff_member_id is null
      and v_authority in ('all','renewal')
      and (r.due_date::timestamp at time zone v_timezone) >= p_range_start
      and (r.due_date::timestamp at time zone v_timezone) < p_range_end
      and (p_company_id is null or r.company_id = p_company_id)
      and (p_transaction_id is null or r.transaction_id = p_transaction_id)
  ),
  deadline_rows as (
    select
      d.id,
      d.cutoff_at as sort_at,
      jsonb_build_object(
        'id', d.id,
        'source', 'workflow_deadline',
        'authority', 'workflow_deadline_evidence',
        'title', d.stage_name,
        'eventType', 'workflow_deadline',
        'startsAt', d.cutoff_at,
        'endsAt', null,
        'dueDate', d.due_date,
        'status', s.status,
        'attentionState', case
          when s.status = 'completed' then 'terminal'
          when d.due_date < (now() at time zone v_timezone)::date then 'overdue'
          when d.due_date = (now() at time zone v_timezone)::date then 'due_today'
          else 'upcoming'
        end,
        'transactionId', d.transaction_id,
        'companyId', t.company_id,
        'companyLabel', coalesce(c.display_name,c.legal_name),
        'workflowInstanceId', d.workflow_instance_id,
        'staffMemberIds', '[]'::jsonb,
        'confirmationStatus', null,
        'attendanceOutcome', null,
        'version', null,
        'recurrenceRule', null,
        'deadlineStageName', d.stage_name,
        'deadlineSourceFingerprint', d.source_fingerprint
      ) as item
    from public.workflow_deadline_evidence d
    join public.workflow_stage_states s
      on s.workspace_id = d.workspace_id and s.id = d.workflow_stage_state_id
    join public.transactions t
      on t.workspace_id = d.workspace_id and t.id = d.transaction_id
    left join public.companies c
      on c.workspace_id = t.workspace_id and c.id = t.company_id and c.deleted_at is null
    where d.workspace_id = p_workspace_id
      and p_staff_member_id is null
      and v_authority in ('all','workflow_deadline')
      and d.cutoff_at >= p_range_start
      and d.cutoff_at < p_range_end
      and (p_company_id is null or t.company_id = p_company_id)
      and (p_transaction_id is null or d.transaction_id = p_transaction_id)
  ),
  all_rows as (
    select * from appointment_rows
    union all
    select * from renewal_rows
    union all
    select * from deadline_rows
  ),
  selected_rows as (
    select id,sort_at,item
    from all_rows
    order by sort_at,id
    limit p_limit
  )
  select coalesce(jsonb_agg(item order by sort_at,id),'[]'::jsonb)
  into v_items
  from selected_rows;

  return jsonb_build_object(
    'schema', 'enjaz.unified-calendar.v1',
    'workspaceId', p_workspace_id,
    'workspaceTimezone', v_timezone,
    'rangeStart', p_range_start,
    'rangeEnd', p_range_end,
    'authority', v_authority,
    'staffMemberId', p_staff_member_id,
    'companyId', p_company_id,
    'transactionId', p_transaction_id,
    'generatedAt', now(),
    'items', v_items
  );
end;
$$;

create or replace function public.list_unified_calendar_v1(
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
language sql
stable
security invoker
set search_path = ''
as $$
  select private.list_unified_calendar_v1_impl(
    p_workspace_id,p_range_start,p_range_end,p_authority,p_staff_member_id,p_company_id,p_transaction_id,p_limit
  );
$$;

revoke all on function private.list_unified_calendar_v1_impl(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.list_unified_calendar_v1_impl(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.list_unified_calendar_v1(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.list_unified_calendar_v1(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer) to authenticated;

commit;
