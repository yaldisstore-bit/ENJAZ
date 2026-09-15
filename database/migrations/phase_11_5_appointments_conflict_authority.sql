begin;

alter table public.calendar_events
  add column if not exists workflow_instance_id uuid,
  add column if not exists confirmation_status text not null default 'unconfirmed',
  add column if not exists confirmation_at timestamptz,
  add column if not exists confirmation_source text,
  add column if not exists confirmation_response_id uuid,
  add column if not exists attendance_outcome text,
  add column if not exists attendance_recorded_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='calendar_events_confirmation_status_check' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_confirmation_status_check
      check (confirmation_status in ('unconfirmed','confirmed','declined'));
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_confirmation_source_check' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_confirmation_source_check
      check (confirmation_source is null or confirmation_source in ('staff','client_portal'));
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_confirmation_consistency' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_confirmation_consistency check (
      (confirmation_status='unconfirmed' and confirmation_at is null and confirmation_source is null and confirmation_response_id is null)
      or
      (confirmation_status in ('confirmed','declined') and confirmation_at is not null and confirmation_source='staff' and confirmation_response_id is null)
      or
      (confirmation_status in ('confirmed','declined') and confirmation_at is not null and confirmation_source='client_portal' and confirmation_response_id is not null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_attendance_outcome_check' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_attendance_outcome_check
      check (attendance_outcome is null or attendance_outcome in ('attended','missed','cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_attendance_consistency' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_attendance_consistency check (
      (attendance_outcome is null and attendance_recorded_at is null)
      or
      (attendance_outcome in ('attended','missed') and attendance_recorded_at is not null and status='completed')
      or
      (attendance_outcome='cancelled' and attendance_recorded_at is not null and status='cancelled')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_workflow_instance_fk' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_workflow_instance_fk
      foreign key (workspace_id,workflow_instance_id)
      references public.workflow_instances(workspace_id,id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_events_confirmation_response_fk' and conrelid='public.calendar_events'::regclass) then
    alter table public.calendar_events add constraint calendar_events_confirmation_response_fk
      foreign key (workspace_id,confirmation_response_id)
      references public.client_portal_appointment_responses(workspace_id,id) on delete restrict;
  end if;
end $$;

create index if not exists calendar_events_workflow_instance_fk_idx
  on public.calendar_events(workspace_id,workflow_instance_id)
  where workflow_instance_id is not null;
create index if not exists calendar_events_confirmation_response_fk_idx
  on public.calendar_events(workspace_id,confirmation_response_id)
  where confirmation_response_id is not null;

create table if not exists public.calendar_event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  calendar_event_id uuid not null,
  organization_member_id uuid not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unassigned_by uuid references auth.users(id) on delete restrict,
  unassignment_reason text,
  constraint calendar_event_staff_assignments_event_fk
    foreign key (workspace_id,calendar_event_id)
    references public.calendar_events(workspace_id,id) on delete cascade,
  constraint calendar_event_staff_assignments_member_fk
    foreign key (workspace_id,organization_member_id)
    references public.organization_members(workspace_id,id) on delete restrict,
  constraint calendar_event_staff_assignments_unassignment_check check (
    (unassigned_at is null and unassigned_by is null and unassignment_reason is null)
    or
    (unassigned_at is not null and unassigned_by is not null and unassignment_reason is not null
      and char_length(btrim(unassignment_reason)) between 1 and 1200)
  )
);

create unique index if not exists calendar_event_staff_assignments_active_unique
  on public.calendar_event_staff_assignments(workspace_id,calendar_event_id,organization_member_id)
  where unassigned_at is null;
create index if not exists calendar_event_staff_assignments_event_fk_idx
  on public.calendar_event_staff_assignments(workspace_id,calendar_event_id);
create index if not exists calendar_event_staff_assignments_member_fk_idx
  on public.calendar_event_staff_assignments(workspace_id,organization_member_id)
  where unassigned_at is null;
create index if not exists calendar_event_staff_assignments_assigned_by_idx
  on public.calendar_event_staff_assignments(assigned_by);
create index if not exists calendar_event_staff_assignments_unassigned_by_idx
  on public.calendar_event_staff_assignments(unassigned_by)
  where unassigned_by is not null;

alter table public.calendar_event_staff_assignments enable row level security;
drop policy if exists calendar_event_staff_assignments_select_workspace on public.calendar_event_staff_assignments;
create policy calendar_event_staff_assignments_select_workspace
on public.calendar_event_staff_assignments for select to authenticated
using (
  (select auth.uid()) is not null
  and workspace_id in (
    select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())
  )
);
revoke all on table public.calendar_event_staff_assignments from public,anon,authenticated;
grant select on table public.calendar_event_staff_assignments to authenticated;
grant select,insert,update,delete on table public.calendar_event_staff_assignments to service_role;

create table if not exists public.calendar_event_reschedule_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  calendar_event_id uuid not null,
  operation_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_starts_at timestamptz not null,
  previous_ends_at timestamptz,
  new_starts_at timestamptz not null,
  new_ends_at timestamptz,
  reason text not null check (char_length(btrim(reason)) between 1 and 1200),
  version_before integer not null check (version_before > 0),
  version_after integer not null check (version_after = version_before + 1),
  created_at timestamptz not null default now(),
  constraint calendar_event_reschedule_history_event_fk
    foreign key (workspace_id,calendar_event_id)
    references public.calendar_events(workspace_id,id) on delete cascade,
  constraint calendar_event_reschedule_history_range_check
    check (new_ends_at is null or new_ends_at >= new_starts_at),
  unique (workspace_id,operation_id)
);

create index if not exists calendar_event_reschedule_history_event_fk_idx
  on public.calendar_event_reschedule_history(workspace_id,calendar_event_id,created_at desc);
create index if not exists calendar_event_reschedule_history_actor_idx
  on public.calendar_event_reschedule_history(actor_user_id);

alter table public.calendar_event_reschedule_history enable row level security;
drop policy if exists calendar_event_reschedule_history_select_workspace on public.calendar_event_reschedule_history;
create policy calendar_event_reschedule_history_select_workspace
on public.calendar_event_reschedule_history for select to authenticated
using (
  (select auth.uid()) is not null
  and workspace_id in (
    select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())
  )
);
revoke all on table public.calendar_event_reschedule_history from public,anon,authenticated;
grant select on table public.calendar_event_reschedule_history to authenticated;
grant select,insert,update,delete on table public.calendar_event_reschedule_history to service_role;

create or replace function private.normalize_scheduling_staff_ids_v1(p_ids uuid[])
returns uuid[]
language sql
immutable
security invoker
set search_path=''
as $$
  select coalesce(array_agg(x order by x),'{}'::uuid[])
  from (select distinct unnest(coalesce(p_ids,'{}'::uuid[])) as x) s;
$$;

revoke all on function private.normalize_scheduling_staff_ids_v1(uuid[]) from public,anon,authenticated;

create or replace function private.require_active_scheduling_staff_v1(
  p_workspace_id uuid,
  p_staff_member_ids uuid[],
  p_effective_at timestamptz
)
returns void
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_ids uuid[] := private.normalize_scheduling_staff_ids_v1(p_staff_member_ids);
begin
  if p_effective_at is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_EFFECTIVE_TIME_REQUIRED';
  end if;
  if exists (
    select 1
    from unnest(v_ids) s(member_id)
    left join public.organization_members om
      on om.workspace_id=p_workspace_id and om.id=s.member_id
    where om.id is null
       or om.status <> 'active'
       or om.valid_from > p_effective_at
       or (om.valid_until is not null and om.valid_until <= p_effective_at)
  ) then
    raise foreign_key_violation using message='ENJAZ_SCHEDULING_STAFF_NOT_ACTIVE_OR_OUT_OF_SCOPE';
  end if;
end;
$$;

revoke all on function private.require_active_scheduling_staff_v1(uuid,uuid[],timestamptz) from public,anon,authenticated;

create or replace function private.lock_scheduling_staff_set_v1(
  p_workspace_id uuid,
  p_staff_member_ids uuid[]
)
returns void
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select x from unnest(private.normalize_scheduling_staff_ids_v1(p_staff_member_ids)) x order by x
  loop
    perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':calendar-staff:' || v_member_id::text,0));
  end loop;
end;
$$;

revoke all on function private.lock_scheduling_staff_set_v1(uuid,uuid[]) from public,anon,authenticated;

create or replace function private.calendar_staff_conflict_snapshot_v1(
  p_workspace_id uuid,
  p_exclude_event_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_member_ids uuid[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_ids uuid[] := private.normalize_scheduling_staff_ids_v1(p_staff_member_ids);
  v_conflicts jsonb;
  v_unknown jsonb;
begin
  if p_starts_at is null then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_START_REQUIRED';
  end if;
  if cardinality(v_ids)=0 then
    return jsonb_build_object('schema','enjaz.scheduling-conflict.v1','state','unknown_assignment','conflicts','[]'::jsonb,'unknownRanges','[]'::jsonb);
  end if;
  if p_ends_at is null then
    return jsonb_build_object('schema','enjaz.scheduling-conflict.v1','state','unknown_range','conflicts','[]'::jsonb,'unknownRanges','[]'::jsonb);
  end if;
  if p_ends_at <= p_starts_at then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RANGE_INVALID';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'eventId',e.id,'organizationMemberId',a.organization_member_id,
      'startsAt',e.starts_at,'endsAt',e.ends_at
    ) order by e.starts_at,e.id,a.organization_member_id),'[]'::jsonb)
  into v_unknown
  from public.calendar_events e
  join public.calendar_event_staff_assignments a
    on a.workspace_id=e.workspace_id and a.calendar_event_id=e.id and a.unassigned_at is null
  where e.workspace_id=p_workspace_id
    and e.status='scheduled'
    and (p_exclude_event_id is null or e.id<>p_exclude_event_id)
    and a.organization_member_id=any(v_ids)
    and e.ends_at is null
    and e.starts_at < p_ends_at;

  if jsonb_array_length(v_unknown)>0 then
    return jsonb_build_object('schema','enjaz.scheduling-conflict.v1','state','unknown_range','conflicts','[]'::jsonb,'unknownRanges',v_unknown);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'eventId',e.id,'organizationMemberId',a.organization_member_id,
      'startsAt',e.starts_at,'endsAt',e.ends_at
    ) order by e.starts_at,e.id,a.organization_member_id),'[]'::jsonb)
  into v_conflicts
  from public.calendar_events e
  join public.calendar_event_staff_assignments a
    on a.workspace_id=e.workspace_id and a.calendar_event_id=e.id and a.unassigned_at is null
  where e.workspace_id=p_workspace_id
    and e.status='scheduled'
    and e.ends_at is not null
    and (p_exclude_event_id is null or e.id<>p_exclude_event_id)
    and a.organization_member_id=any(v_ids)
    and e.starts_at < p_ends_at
    and e.ends_at > p_starts_at;

  return jsonb_build_object(
    'schema','enjaz.scheduling-conflict.v1',
    'state',case when jsonb_array_length(v_conflicts)>0 then 'conflict' else 'clear' end,
    'conflicts',v_conflicts,
    'unknownRanges','[]'::jsonb
  );
end;
$$;

revoke all on function private.calendar_staff_conflict_snapshot_v1(uuid,uuid,timestamptz,timestamptz,uuid[]) from public,anon,authenticated;

create or replace function private.assert_no_calendar_staff_conflict_v1(
  p_workspace_id uuid,
  p_exclude_event_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_member_ids uuid[]
)
returns void
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_snapshot jsonb;
begin
  v_snapshot := private.calendar_staff_conflict_snapshot_v1(
    p_workspace_id,p_exclude_event_id,p_starts_at,p_ends_at,p_staff_member_ids
  );
  if v_snapshot->>'state'='conflict' then
    raise exclusion_violation using message='ENJAZ_SCHEDULING_STAFF_CONFLICT';
  end if;
  if v_snapshot->>'state'='unknown_range' then
    raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_CONFLICT_RANGE_UNKNOWN';
  end if;
end;
$$;

revoke all on function private.assert_no_calendar_staff_conflict_v1(uuid,uuid,timestamptz,timestamptz,uuid[]) from public,anon,authenticated;

create or replace function private.check_calendar_event_staff_conflicts_v1_impl(
  p_workspace_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_member_ids uuid[],
  p_exclude_event_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_ids uuid[] := private.normalize_scheduling_staff_ids_v1(p_staff_member_ids);
begin
  perform private.require_scheduling_workspace_member_v1(p_workspace_id);
  perform private.require_active_scheduling_staff_v1(p_workspace_id,v_ids,p_starts_at);
  return private.calendar_staff_conflict_snapshot_v1(
    p_workspace_id,p_exclude_event_id,p_starts_at,p_ends_at,v_ids
  );
end;
$$;

create or replace function public.check_calendar_event_staff_conflicts_v1(
  p_workspace_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_member_ids uuid[],
  p_exclude_event_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.check_calendar_event_staff_conflicts_v1_impl(
    p_workspace_id,p_starts_at,p_ends_at,p_staff_member_ids,p_exclude_event_id
  );
$$;

revoke all on function private.check_calendar_event_staff_conflicts_v1_impl(uuid,timestamptz,timestamptz,uuid[],uuid) from public,anon;
grant execute on function private.check_calendar_event_staff_conflicts_v1_impl(uuid,timestamptz,timestamptz,uuid[],uuid) to authenticated,service_role;
revoke all on function public.check_calendar_event_staff_conflicts_v1(uuid,timestamptz,timestamptz,uuid[],uuid) from public,anon,service_role;
grant execute on function public.check_calendar_event_staff_conflicts_v1(uuid,timestamptz,timestamptz,uuid[],uuid) to authenticated;

commit;
