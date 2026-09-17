-- ENJAZ Phase 11.5-D — durable Real Cloud setup probe.
-- Persists a disposable canonical appointment across the migration boundary so an
-- independent read-only transaction can prove durable round-trip behavior.

do $$
declare v_actor uuid;
begin
  select id into v_actor from auth.users order by created_at,id limit 1;
  if v_actor is null then raise exception 'P115D_AUTH_USER_REQUIRED'; end if;
  if exists(select 1 from public.workspaces where id::text like '11540000-0000-4000-8000-%') then
    raise exception 'P115D_PROBE_PREFIX_NOT_CLEAN';
  end if;
  perform set_config('p115d.actor',v_actor::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency) values
('11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'__ENJAZ_P115D_DURABLE_A__','Asia/Baghdad','ar-IQ','IQD'),
('11540000-0000-4000-8000-000000000002',current_setting('p115d.actor')::uuid,'__ENJAZ_P115D_ISOLATION_B__','Asia/Baghdad','ar-IQ','IQD');

insert into public.workspace_memberships(workspace_id,user_id,role)
values('11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'owner');

insert into public.organization_members(id,workspace_id,user_id,status,valid_from,valid_until,created_by) values
('11540000-0000-4000-8000-000000000301','11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'active',now()-interval '1 day',null,current_setting('p115d.actor')::uuid),
('11540000-0000-4000-8000-000000000302','11540000-0000-4000-8000-000000000002',current_setting('p115d.actor')::uuid,'active',now()-interval '1 day',null,current_setting('p115d.actor')::uuid);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115d.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115d.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
  v_start timestamptz:=date_trunc('hour',now())+interval '7 days';
  v_end timestamptz:=date_trunc('hour',now())+interval '7 days 1 hour';
begin
  if auth.uid() is distinct from current_setting('p115d.actor')::uuid then raise exception 'P115D_AUTH_UID_MISMATCH'; end if;

  begin
    insert into public.calendar_events(id,workspace_id,title,event_type,starts_at,ends_at,status,version)
    values('11540000-0000-4000-8000-000000000499','11540000-0000-4000-8000-000000000001','FORBIDDEN DIRECT','review',v_start,v_end,'scheduled',1);
    raise exception 'P115D_DIRECT_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null;
  end;

  v:=public.create_calendar_event_v1(
    '11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000401','11540000-0000-4000-8000-000000000701',
    'Phase 11.5-D durable appointment','review',v_start,v_end,null,null,null,null,
    array['11540000-0000-4000-8000-000000000301'::uuid],'Real Cloud D durable-write probe'
  );
  if v->>'schema'<>'enjaz.scheduling-calendar-event.v2'
     or v->>'id'<>'11540000-0000-4000-8000-000000000401'
     or (v->>'version')::int<>1 or v->>'status'<>'scheduled' then
    raise exception 'P115D_GOVERNED_CREATE_INVALID %',v;
  end if;

  v:=public.create_calendar_event_v1(
    '11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000401','11540000-0000-4000-8000-000000000701',
    'Phase 11.5-D durable appointment','review',v_start,v_end,null,null,null,null,
    array['11540000-0000-4000-8000-000000000301'::uuid],'Real Cloud D durable-write probe'
  );
  if coalesce((v->>'wasDuplicate')::boolean,false) is not true or (v->>'version')::int<>1 then
    raise exception 'P115D_CREATE_REPLAY_NOT_IDEMPOTENT %',v;
  end if;

  v:=public.check_calendar_event_staff_conflicts_v1(
    '11540000-0000-4000-8000-000000000001',v_start,v_end,'{}'::uuid[],null
  );
  if v->>'state'<>'unknown_assignment' then raise exception 'P115D_UNKNOWN_ASSIGNMENT_NOT_FAIL_CLOSED %',v; end if;

  v:=public.check_calendar_event_staff_conflicts_v1(
    '11540000-0000-4000-8000-000000000001',v_start,v_end,
    array['11540000-0000-4000-8000-000000000301'::uuid],null
  );
  if v->>'state'<>'conflict' then raise exception 'P115D_EXISTING_STAFF_CONFLICT_NOT_DETECTED %',v; end if;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.calendar_events where id='11540000-0000-4000-8000-000000000401')<>1 then
    raise exception 'P115D_DURABLE_EVENT_NOT_PERSISTED';
  end if;
  if (select count(*) from private.scheduling_command_receipts where workspace_id='11540000-0000-4000-8000-000000000001' and operation_id='11540000-0000-4000-8000-000000000701')<>1 then
    raise exception 'P115D_CREATE_RECEIPT_MISSING';
  end if;
  if not exists(select 1 from public.audit_events where workspace_id='11540000-0000-4000-8000-000000000001' and action='scheduling.calendar.created') then
    raise exception 'P115D_CREATE_AUDIT_MISSING';
  end if;
end $$;
