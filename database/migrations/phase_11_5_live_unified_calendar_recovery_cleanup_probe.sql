-- ENJAZ Phase 11.5-D — Real Cloud authenticated projection, stale/recovery and cleanup probe.
-- Continues from the durable setup probe, validates the final v2 calendar API, then removes all business-data residue.

do $$
declare v_actor uuid;
begin
  select owner_user_id into v_actor from public.workspaces where id='11540000-0000-4000-8000-000000000001';
  if v_actor is null then raise exception 'P115D_DURABLE_SETUP_MISSING'; end if;
  perform set_config('p115d.actor',v_actor::text,true);
end $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115d.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115d.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
  v_anchor date;
  v_old_start timestamptz;
  v_old_end timestamptz;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_item jsonb;
begin
  if auth.uid() is distinct from current_setting('p115d.actor')::uuid then raise exception 'P115D_AUTH_UID_MISMATCH'; end if;
  select starts_at,ends_at,(starts_at at time zone 'Asia/Baghdad')::date into v_old_start,v_old_end,v_anchor
  from public.calendar_events where workspace_id='11540000-0000-4000-8000-000000000001' and id='11540000-0000-4000-8000-000000000401';
  if v_old_start is null then raise exception 'P115D_DURABLE_EVENT_MISSING'; end if;

  v:=public.list_unified_calendar_v2(
    '11540000-0000-4000-8000-000000000001',v_anchor,'day','appointment',
    '11540000-0000-4000-8000-000000000301',null,null,100
  );
  if v->>'schema'<>'enjaz.unified-calendar.v2' or v->>'workspaceTimezone'<>'Asia/Baghdad'
     or v->>'view'<>'day' or (v->>'businessStartDate')::date<>v_anchor then
    raise exception 'P115D_V2_BOUNDARY_CONTRACT_FAIL %',v;
  end if;
  if jsonb_array_length(v->'items')<>1 then raise exception 'P115D_V2_DURABLE_ITEM_COUNT_FAIL %',v; end if;
  v_item:=v->'items'->0;
  if v_item->>'id'<>'11540000-0000-4000-8000-000000000401'
     or v_item->>'source'<>'appointment' or v_item->>'authority'<>'calendar_events'
     or coalesce((v_item->>'rescheduleCount')::int,-1)<>0
     or not ((v_item->'staffMemberIds') @> '["11540000-0000-4000-8000-000000000301"]'::jsonb) then
    raise exception 'P115D_V2_DURABLE_PROJECTION_FAIL %',v_item;
  end if;

  begin
    perform public.list_unified_calendar_v2('11540000-0000-4000-8000-000000000002',v_anchor,'day','all',null,null,null,100);
    raise exception 'P115D_CROSS_WORKSPACE_READ_ACCEPTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN%' then raise; end if;
  end;

  begin
    update public.calendar_events set title='FORBIDDEN DIRECT UPDATE'
    where workspace_id='11540000-0000-4000-8000-000000000001' and id='11540000-0000-4000-8000-000000000401';
    raise exception 'P115D_DIRECT_UPDATE_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  v_new_start:=v_old_start+interval '1 day';
  v_new_end:=v_old_end+interval '1 day';
  begin
    perform public.reschedule_calendar_event_v1(
      '11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000401',
      '11540000-0000-4000-8000-000000000702',99,v_new_start,v_new_end,'Expected stale rejection'
    );
    raise exception 'P115D_STALE_RESCHEDULE_ACCEPTED';
  exception when serialization_failure then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STALE_VERSION%' then raise; end if;
  end;

  v:=public.reschedule_calendar_event_v1(
    '11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000401',
    '11540000-0000-4000-8000-000000000703',1,v_new_start,v_new_end,'Recover with current version'
  );
  if (v->>'version')::int<>2 or v->>'startsAt'<>to_jsonb(v_new_start)#>>'{}' then
    raise exception 'P115D_RESCHEDULE_RECOVERY_FAIL %',v;
  end if;

  v:=public.list_unified_calendar_v2(
    '11540000-0000-4000-8000-000000000001',(v_new_start at time zone 'Asia/Baghdad')::date,'day','appointment',
    '11540000-0000-4000-8000-000000000301',null,null,100
  );
  if jsonb_array_length(v->'items')<>1 then raise exception 'P115D_RECOVERED_PROJECTION_COUNT_FAIL %',v; end if;
  v_item:=v->'items'->0;
  if v_item->>'id'<>'11540000-0000-4000-8000-000000000401'
     or coalesce((v_item->>'rescheduleCount')::int,-1)<>1
     or v_item->>'lastRescheduleReason'<>'Recover with current version' then
    raise exception 'P115D_RECOVERED_PROJECTION_EVIDENCE_FAIL %',v_item;
  end if;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.calendar_event_reschedule_history where workspace_id='11540000-0000-4000-8000-000000000001' and calendar_event_id='11540000-0000-4000-8000-000000000401')<>1 then
    raise exception 'P115D_RESCHEDULE_HISTORY_COUNT_INVALID';
  end if;
  if (select count(*) from private.scheduling_command_receipts where workspace_id='11540000-0000-4000-8000-000000000001')<>2 then
    raise exception 'P115D_RECEIPT_COUNT_INVALID';
  end if;
  if (select count(*) from public.audit_events where workspace_id='11540000-0000-4000-8000-000000000001' and action in ('scheduling.calendar.created','scheduling.calendar.rescheduled'))<>2 then
    raise exception 'P115D_AUDIT_COUNT_INVALID';
  end if;
end $$;

delete from public.workspaces where id in (
  '11540000-0000-4000-8000-000000000001'::uuid,
  '11540000-0000-4000-8000-000000000002'::uuid
);

do $$
begin
  if exists(select 1 from public.workspaces where id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_WORKSPACE_RESIDUE'; end if;
  if exists(select 1 from public.workspace_memberships where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_MEMBERSHIP_RESIDUE'; end if;
  if exists(select 1 from public.calendar_events where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_CALENDAR_RESIDUE'; end if;
  if exists(select 1 from public.calendar_event_staff_assignments where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_ASSIGNMENT_RESIDUE'; end if;
  if exists(select 1 from public.calendar_event_reschedule_history where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_HISTORY_RESIDUE'; end if;
  if exists(select 1 from public.organization_members where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_ORG_MEMBER_RESIDUE'; end if;
  if exists(select 1 from private.scheduling_command_receipts where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_RECEIPT_RESIDUE'; end if;
  if exists(select 1 from public.audit_events where workspace_id::text like '11540000-0000-4000-8000-%') then raise exception 'P115D_AUDIT_RESIDUE'; end if;
end $$;
