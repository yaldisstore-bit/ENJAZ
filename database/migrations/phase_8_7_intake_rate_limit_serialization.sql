-- ENJAZ Phase 8.7 — M17 abuse destruction repair
-- Serialize public-intake rate decisions per secure link so concurrent count-then-insert
-- requests cannot all observe the same stale counter and escape the existing limits.
begin;

create or replace function private.enforce_public_intake_rate_v1(p_link_id uuid,p_event_type text)
returns void language plpgsql security definer set search_path='' as $$
declare v_hour integer; v_recent integer;
begin
  if p_event_type not in ('view','save_draft','submit') then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_EVENT_INVALID';
  end if;

  -- The parent-link row is the per-bearer serialization point. Every public view/save/submit
  -- reaches this function in the same transaction, so this row lock makes the following
  -- count + insert decision atomic with respect to competing requests for the same link.
  perform 1 from public.intake_links l where l.id=p_link_id for update;
  if not found then
    raise no_data_found using message='ENJAZ_INTAKE_LINK_NOT_FOUND';
  end if;

  select count(*) into v_hour
  from public.intake_public_events e
  where e.link_id=p_link_id
    and e.occurred_at>now()-interval '1 hour';

  select count(*) into v_recent
  from public.intake_public_events e
  where e.link_id=p_link_id
    and e.event_type in ('save_draft','submit')
    and e.occurred_at>now()-interval '30 seconds';

  if v_hour>=120 or (p_event_type in ('save_draft','submit') and v_recent>=4) then
    raise program_limit_exceeded using message='ENJAZ_INTAKE_RATE_LIMITED';
  end if;

  insert into public.intake_public_events(link_id,event_type)
  values(p_link_id,p_event_type);
end; $$;

revoke all on function private.enforce_public_intake_rate_v1(uuid,text) from public,anon;

commit;
