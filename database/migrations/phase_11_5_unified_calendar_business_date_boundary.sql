-- ENJAZ Phase 11.5-D — workspace-timezone calendar range authority.
-- Browser/device timezone is not allowed to define business scheduling boundaries.
begin;

create or replace function private.list_unified_calendar_v2_impl(
  p_workspace_id uuid,
  p_anchor_date date default null,
  p_view text default 'month',
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
  v_today date;
  v_anchor date;
  v_view text := lower(btrim(coalesce(p_view,'month')));
  v_start_date date;
  v_end_date date;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_snapshot jsonb;
begin
  v_actor := private.require_scheduling_workspace_member_v1(p_workspace_id);
  select w.timezone into v_timezone from public.workspaces w where w.id=p_workspace_id;
  if not found or nullif(btrim(v_timezone),'') is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_UNIFIED_CALENDAR_TIMEZONE_MISSING';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_anchor := coalesce(p_anchor_date,v_today);

  if v_view='day' then
    v_start_date:=v_anchor;
    v_end_date:=v_anchor+1;
  elsif v_view='week' then
    v_start_date:=v_anchor-(extract(isodow from v_anchor)::integer-1);
    v_end_date:=v_start_date+7;
  elsif v_view='month' then
    v_start_date:=date_trunc('month',v_anchor::timestamp)::date;
    v_end_date:=(v_start_date+interval '1 month')::date;
  elsif v_view='agenda' then
    v_start_date:=v_anchor;
    v_end_date:=v_anchor+90;
  else
    raise invalid_parameter_value using message='ENJAZ_UNIFIED_CALENDAR_VIEW_INVALID';
  end if;

  v_start_at := v_start_date::timestamp at time zone v_timezone;
  v_end_at := v_end_date::timestamp at time zone v_timezone;

  v_snapshot := private.list_unified_calendar_v1_impl(
    p_workspace_id,v_start_at,v_end_at,p_authority,p_staff_member_id,p_company_id,p_transaction_id,p_limit
  );

  return (v_snapshot - 'schema') || jsonb_build_object(
    'schema','enjaz.unified-calendar.v2',
    'view',v_view,
    'anchorDate',v_anchor,
    'businessToday',v_today,
    'businessStartDate',v_start_date,
    'businessEndDate',v_end_date
  );
end;
$$;

create or replace function public.list_unified_calendar_v2(
  p_workspace_id uuid,
  p_anchor_date date default null,
  p_view text default 'month',
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
  select private.list_unified_calendar_v2_impl(
    p_workspace_id,p_anchor_date,p_view,p_authority,p_staff_member_id,p_company_id,p_transaction_id,p_limit
  );
$$;

revoke all on function private.list_unified_calendar_v2_impl(uuid,date,text,text,uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.list_unified_calendar_v2_impl(uuid,date,text,text,uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.list_unified_calendar_v2(uuid,date,text,text,uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.list_unified_calendar_v2(uuid,date,text,text,uuid,uuid,uuid,integer) to authenticated;

-- v1 remains private implementation plumbing only; remove its browser/API entry point.
revoke execute on function public.list_unified_calendar_v1(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer) from authenticated;
drop function public.list_unified_calendar_v1(uuid,timestamptz,timestamptz,text,uuid,uuid,uuid,integer);

commit;
