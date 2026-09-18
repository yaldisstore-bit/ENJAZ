-- ENJAZ Phase 11.7 — M10 stale conflict SQLSTATE hardening.
-- Business optimistic-concurrency conflicts must fail closed immediately over PostgREST.
-- SQLSTATE 40001 (serialization_failure) is retryable infrastructure state and caused upstream timeouts.
-- Preserve the canonical ENJAZ_SCHEDULING_STALE_VERSION message while using non-retryable 55000.

begin;

do $$
declare
  v_sig text;
  v_oid regprocedure;
  v_def text;
  v_next text;
  v_old_pattern constant text := 'raise\\s+serialization_failure\\s+using\\s+message\\s*=\\s*''ENJAZ_SCHEDULING_STALE_VERSION''';
  v_new constant text := 'raise object_not_in_prerequisite_state using message=''ENJAZ_SCHEDULING_STALE_VERSION''';
begin
  foreach v_sig in array array[
    'private.complete_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer)',
    'private.materialize_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer)',
    'private.mutate_calendar_event_state_v1_impl(uuid,uuid,uuid,integer,text,text)',
    'private.mutate_renewal_state_v1_impl(uuid,uuid,uuid,integer,text,text)',
    'private.record_calendar_event_attendance_v1_impl(uuid,uuid,uuid,integer,text,text)',
    'private.reschedule_calendar_event_v1_impl(uuid,uuid,uuid,integer,timestamptz,timestamptz,text)',
    'private.set_calendar_event_confirmation_v1_impl(uuid,uuid,uuid,integer,text,uuid)',
    'private.set_calendar_event_staff_v1_impl(uuid,uuid,uuid,integer,uuid[],text)',
    'private.update_calendar_event_metadata_v1_impl(uuid,uuid,uuid,integer,text,text,uuid,uuid,uuid,uuid,text)'
  ] loop
    v_oid := to_regprocedure(v_sig);
    if v_oid is null then
      raise exception 'ENJAZ_117_M10_STALE_FUNCTION_MISSING:%',v_sig;
    end if;
    v_def := pg_get_functiondef(v_oid);
    if v_def !~ v_old_pattern then
      raise exception 'ENJAZ_117_M10_STALE_SOURCE_DRIFT:%',v_sig;
    end if;
    v_next := regexp_replace(v_def,v_old_pattern,v_new,'g');
    execute v_next;
  end loop;
end
$$;

do $$
declare
  v_remaining integer;
begin
  select count(*) into v_remaining
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where p.prokind='f'
    and n.nspname='private'
    and p.proname in (
      'complete_renewal_occurrence_v1_impl',
      'materialize_renewal_occurrence_v1_impl',
      'mutate_calendar_event_state_v1_impl',
      'mutate_renewal_state_v1_impl',
      'record_calendar_event_attendance_v1_impl',
      'reschedule_calendar_event_v1_impl',
      'set_calendar_event_confirmation_v1_impl',
      'set_calendar_event_staff_v1_impl',
      'update_calendar_event_metadata_v1_impl'
    )
    and pg_get_functiondef(p.oid) like '%raise serialization_failure using message=''ENJAZ_SCHEDULING_STALE_VERSION''%';
  if v_remaining<>0 then
    raise exception 'ENJAZ_117_M10_RETRYABLE_STALE_REMAINS:%',v_remaining;
  end if;
end
$$;

commit;
