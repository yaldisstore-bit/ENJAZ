do $$
declare
  v_actor uuid;
begin
  select id into v_actor from auth.users order by created_at limit 1;
  if v_actor is null then raise exception 'P115_NO_AUTH_ACTOR'; end if;
  perform set_config('p115.actor',v_actor::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
values
('11500000-0000-4000-8000-000000000001'::uuid,current_setting('p115.actor')::uuid,'__ENJAZ_P115A_1__','Asia/Baghdad','ar-IQ','IQD'),
('11500000-0000-4000-8000-000000000002'::uuid,current_setting('p115.actor')::uuid,'__ENJAZ_P115A_2__','Asia/Baghdad','ar-IQ','IQD');

insert into public.workspace_memberships(workspace_id,user_id,role)
values('11500000-0000-4000-8000-000000000001'::uuid,current_setting('p115.actor')::uuid,'owner');

insert into public.calendar_events(id,workspace_id,title,event_type,starts_at,ends_at,status)
values
('11500000-0000-4000-8000-000000000011'::uuid,'11500000-0000-4000-8000-000000000001'::uuid,'Phase 11.5 governed calendar probe','review','2026-09-16T08:00:00Z','2026-09-16T09:00:00Z','scheduled'),
('11500000-0000-4000-8000-000000000012'::uuid,'11500000-0000-4000-8000-000000000002'::uuid,'Phase 11.5 forbidden workspace probe','review','2026-09-16T10:00:00Z','2026-09-16T11:00:00Z','scheduled');

insert into public.renewals(id,workspace_id,title,due_date,status)
values('11500000-0000-4000-8000-000000000021'::uuid,'11500000-0000-4000-8000-000000000001'::uuid,'Phase 11.5 governed renewal probe','2026-10-01','active');

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
begin
  if auth.uid() is distinct from current_setting('p115.actor')::uuid then
    raise exception 'P115_AUTH_UID_MISMATCH';
  end if;

  v := public.mutate_calendar_event_state_v1(
    '11500000-0000-4000-8000-000000000001'::uuid,
    '11500000-0000-4000-8000-000000000011'::uuid,
    '11500000-0000-4000-8000-000000000031'::uuid,
    1,'complete',null
  );
  if v->>'status' <> 'completed' or (v->>'version')::int <> 2 or (v->>'wasDuplicate')::boolean then
    raise exception 'P115_CALENDAR_FIRST_MUTATION_INVALID %',v;
  end if;

  v := public.mutate_calendar_event_state_v1(
    '11500000-0000-4000-8000-000000000001'::uuid,
    '11500000-0000-4000-8000-000000000011'::uuid,
    '11500000-0000-4000-8000-000000000031'::uuid,
    1,'complete',null
  );
  if not (v->>'wasDuplicate')::boolean or (v->>'version')::int <> 2 then
    raise exception 'P115_CALENDAR_REPLAY_INVALID %',v;
  end if;

  begin
    perform public.mutate_calendar_event_state_v1(
      '11500000-0000-4000-8000-000000000001'::uuid,
      '11500000-0000-4000-8000-000000000011'::uuid,
      '11500000-0000-4000-8000-000000000031'::uuid,
      1,'cancel','different payload'
    );
    raise exception 'P115_IDEMPOTENCY_CONFLICT_NOT_REJECTED';
  exception when unique_violation then
    if sqlerrm <> 'ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT' then raise; end if;
  end;

  begin
    perform public.mutate_calendar_event_state_v1(
      '11500000-0000-4000-8000-000000000001'::uuid,
      '11500000-0000-4000-8000-000000000011'::uuid,
      '11500000-0000-4000-8000-000000000032'::uuid,
      1,'complete',null
    );
    raise exception 'P115_STALE_VERSION_NOT_REJECTED';
  exception when serialization_failure then
    if sqlerrm <> 'ENJAZ_SCHEDULING_STALE_VERSION' then raise; end if;
  end;

  begin
    perform public.mutate_calendar_event_state_v1(
      '11500000-0000-4000-8000-000000000002'::uuid,
      '11500000-0000-4000-8000-000000000012'::uuid,
      '11500000-0000-4000-8000-000000000033'::uuid,
      1,'complete',null
    );
    raise exception 'P115_CROSS_WORKSPACE_NOT_REJECTED';
  exception when insufficient_privilege then
    if sqlerrm <> 'ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN' then raise; end if;
  end;

  v := public.mutate_renewal_state_v1(
    '11500000-0000-4000-8000-000000000001'::uuid,
    '11500000-0000-4000-8000-000000000021'::uuid,
    '11500000-0000-4000-8000-000000000041'::uuid,
    1,'complete',null
  );
  if v->>'status' <> 'completed' or (v->>'version')::int <> 2 or (v->>'wasDuplicate')::boolean or v->>'lastCompletedAt' is null then
    raise exception 'P115_RENEWAL_FIRST_MUTATION_INVALID %',v;
  end if;

  v := public.mutate_renewal_state_v1(
    '11500000-0000-4000-8000-000000000001'::uuid,
    '11500000-0000-4000-8000-000000000021'::uuid,
    '11500000-0000-4000-8000-000000000041'::uuid,
    1,'complete',null
  );
  if not (v->>'wasDuplicate')::boolean or (v->>'version')::int <> 2 then
    raise exception 'P115_RENEWAL_REPLAY_INVALID %',v;
  end if;
end $$;

reset role;

do $$
begin
  if (select status <> 'completed' or version <> 2 from public.calendar_events where id='11500000-0000-4000-8000-000000000011'::uuid) then
    raise exception 'P115_CALENDAR_DB_STATE_INVALID';
  end if;
  if (select status <> 'completed' or version <> 2 or last_completed_at is null from public.renewals where id='11500000-0000-4000-8000-000000000021'::uuid) then
    raise exception 'P115_RENEWAL_DB_STATE_INVALID';
  end if;
  if (select count(*) from public.audit_events where workspace_id='11500000-0000-4000-8000-000000000001'::uuid and action in ('scheduling.calendar.completed','scheduling.renewal.completed')) <> 2 then
    raise exception 'P115_AUDIT_COUNT_INVALID';
  end if;
  if (select count(*) from private.scheduling_command_receipts where workspace_id='11500000-0000-4000-8000-000000000001'::uuid) <> 2 then
    raise exception 'P115_RECEIPT_COUNT_INVALID';
  end if;
end $$;

delete from public.workspaces where id in (
  '11500000-0000-4000-8000-000000000001'::uuid,
  '11500000-0000-4000-8000-000000000002'::uuid
);

do $$
begin
  if exists(select 1 from public.workspaces where id in ('11500000-0000-4000-8000-000000000001'::uuid,'11500000-0000-4000-8000-000000000002'::uuid)) then raise exception 'P115_WORKSPACE_RESIDUE'; end if;
  if exists(select 1 from public.calendar_events where id in ('11500000-0000-4000-8000-000000000011'::uuid,'11500000-0000-4000-8000-000000000012'::uuid)) then raise exception 'P115_CALENDAR_RESIDUE'; end if;
  if exists(select 1 from public.renewals where id='11500000-0000-4000-8000-000000000021'::uuid) then raise exception 'P115_RENEWAL_RESIDUE'; end if;
  if exists(select 1 from private.scheduling_command_receipts where workspace_id in ('11500000-0000-4000-8000-000000000001'::uuid,'11500000-0000-4000-8000-000000000002'::uuid)) then raise exception 'P115_RECEIPT_RESIDUE'; end if;
  if exists(select 1 from public.audit_events where workspace_id in ('11500000-0000-4000-8000-000000000001'::uuid,'11500000-0000-4000-8000-000000000002'::uuid)) then raise exception 'P115_AUDIT_RESIDUE'; end if;
end $$;
