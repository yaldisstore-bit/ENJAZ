do $$
declare
  v_actor uuid;
begin
  select id into v_actor from auth.users order by created_at limit 1;
  if v_actor is null then raise exception 'P115_LOCKDOWN_NO_AUTH_ACTOR'; end if;
  perform set_config('p115.lock.actor',v_actor::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
values ('11510000-0000-4000-8000-000000000001'::uuid,current_setting('p115.lock.actor')::uuid,'__ENJAZ_P115_LOCKDOWN__','Asia/Baghdad','ar-IQ','IQD');

insert into public.workspace_memberships(workspace_id,user_id,role)
values ('11510000-0000-4000-8000-000000000001'::uuid,current_setting('p115.lock.actor')::uuid,'owner');

insert into public.calendar_events(id,workspace_id,title,event_type,starts_at,ends_at,status)
values ('11510000-0000-4000-8000-000000000011'::uuid,'11510000-0000-4000-8000-000000000001'::uuid,'Lockdown governed calendar probe','review','2026-09-16T08:00:00Z','2026-09-16T09:00:00Z','scheduled');

insert into public.renewals(id,workspace_id,title,due_date,status)
values ('11510000-0000-4000-8000-000000000021'::uuid,'11510000-0000-4000-8000-000000000001'::uuid,'Lockdown governed renewal probe','2026-10-01','active');

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115.lock.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115.lock.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
begin
  if auth.uid() is distinct from current_setting('p115.lock.actor')::uuid then raise exception 'P115_LOCKDOWN_AUTH_UID_MISMATCH'; end if;

  begin
    update public.calendar_events set title='FORBIDDEN DIRECT UPDATE' where id='11510000-0000-4000-8000-000000000011'::uuid;
    raise exception 'P115_DIRECT_CALENDAR_UPDATE_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.calendar_events(id,workspace_id,title,event_type,starts_at,status)
    values ('11510000-0000-4000-8000-000000000012'::uuid,'11510000-0000-4000-8000-000000000001'::uuid,'FORBIDDEN DIRECT INSERT','review','2026-09-16T10:00:00Z','scheduled');
    raise exception 'P115_DIRECT_CALENDAR_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.renewals set title='FORBIDDEN DIRECT UPDATE' where id='11510000-0000-4000-8000-000000000021'::uuid;
    raise exception 'P115_DIRECT_RENEWAL_UPDATE_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.renewals(id,workspace_id,title,due_date,status)
    values ('11510000-0000-4000-8000-000000000022'::uuid,'11510000-0000-4000-8000-000000000001'::uuid,'FORBIDDEN DIRECT INSERT','2026-10-02','active');
    raise exception 'P115_DIRECT_RENEWAL_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  v := public.mutate_calendar_event_state_v1(
    '11510000-0000-4000-8000-000000000001'::uuid,
    '11510000-0000-4000-8000-000000000011'::uuid,
    '11510000-0000-4000-8000-000000000031'::uuid,
    1,'complete',null
  );
  if v->>'status' <> 'completed' or (v->>'version')::int <> 2 then raise exception 'P115_GOVERNED_CALENDAR_FAILED %',v; end if;

  v := public.mutate_renewal_state_v1(
    '11510000-0000-4000-8000-000000000001'::uuid,
    '11510000-0000-4000-8000-000000000021'::uuid,
    '11510000-0000-4000-8000-000000000041'::uuid,
    1,'complete',null
  );
  if v->>'status' <> 'completed' or (v->>'version')::int <> 2 then raise exception 'P115_GOVERNED_RENEWAL_FAILED %',v; end if;
end $$;

reset role;

do $$
begin
  if (select title <> 'Lockdown governed calendar probe' or status <> 'completed' or version <> 2 from public.calendar_events where id='11510000-0000-4000-8000-000000000011'::uuid) then raise exception 'P115_LOCKDOWN_CALENDAR_STATE_INVALID'; end if;
  if exists(select 1 from public.calendar_events where id='11510000-0000-4000-8000-000000000012'::uuid) then raise exception 'P115_FORBIDDEN_CALENDAR_INSERT_RESIDUE'; end if;
  if (select title <> 'Lockdown governed renewal probe' or status <> 'completed' or version <> 2 from public.renewals where id='11510000-0000-4000-8000-000000000021'::uuid) then raise exception 'P115_LOCKDOWN_RENEWAL_STATE_INVALID'; end if;
  if exists(select 1 from public.renewals where id='11510000-0000-4000-8000-000000000022'::uuid) then raise exception 'P115_FORBIDDEN_RENEWAL_INSERT_RESIDUE'; end if;
  if (select count(*) from public.audit_events where workspace_id='11510000-0000-4000-8000-000000000001'::uuid and action in ('scheduling.calendar.completed','scheduling.renewal.completed')) <> 2 then raise exception 'P115_LOCKDOWN_AUDIT_INVALID'; end if;
end $$;

delete from public.workspaces where id='11510000-0000-4000-8000-000000000001'::uuid;

do $$
begin
  if exists(select 1 from public.workspaces where id='11510000-0000-4000-8000-000000000001'::uuid) then raise exception 'P115_LOCKDOWN_WORKSPACE_RESIDUE'; end if;
  if exists(select 1 from public.calendar_events where workspace_id='11510000-0000-4000-8000-000000000001'::uuid) then raise exception 'P115_LOCKDOWN_CALENDAR_RESIDUE'; end if;
  if exists(select 1 from public.renewals where workspace_id='11510000-0000-4000-8000-000000000001'::uuid) then raise exception 'P115_LOCKDOWN_RENEWAL_RESIDUE'; end if;
  if exists(select 1 from private.scheduling_command_receipts where workspace_id='11510000-0000-4000-8000-000000000001'::uuid) then raise exception 'P115_LOCKDOWN_RECEIPT_RESIDUE'; end if;
  if exists(select 1 from public.audit_events where workspace_id='11510000-0000-4000-8000-000000000001'::uuid) then raise exception 'P115_LOCKDOWN_AUDIT_RESIDUE'; end if;
end $$;
