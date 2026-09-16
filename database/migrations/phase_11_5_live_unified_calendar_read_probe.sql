-- ENJAZ Phase 11.5-D — authenticated unified-calendar read-model destruction probe.
-- Creates canonical fixtures, verifies governed reads/filters/fail-closed permissions, then removes all residue.
begin;

do $$
declare v_actor uuid;
begin
  select id into v_actor from auth.users order by created_at,id limit 1;
  if v_actor is null then raise exception 'P115D_AUTH_USER_REQUIRED'; end if;
  perform set_config('p115d.actor',v_actor::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency) values
('11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'__ENJAZ_P115D_A__','Asia/Baghdad','ar-IQ','IQD'),
('11540000-0000-4000-8000-000000000002',current_setting('p115d.actor')::uuid,'__ENJAZ_P115D_B__','Asia/Baghdad','ar-IQ','IQD');
insert into public.workspace_memberships(workspace_id,user_id,role)
values('11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'owner');

insert into public.companies(id,workspace_id,legal_name,status) values
('11540000-0000-4000-8000-000000000101','11540000-0000-4000-8000-000000000001','__P115D_COMPANY_A__','active'),
('11540000-0000-4000-8000-000000000102','11540000-0000-4000-8000-000000000002','__P115D_COMPANY_B__','active');
insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee)
values('11540000-0000-4000-8000-000000000201','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000101','P115D transaction','active','normal',1);

insert into public.organization_members(id,workspace_id,user_id,status,valid_from,valid_until,created_by) values
('11540000-0000-4000-8000-000000000301','11540000-0000-4000-8000-000000000001',current_setting('p115d.actor')::uuid,'active',now()-interval '1 day',null,current_setting('p115d.actor')::uuid),
('11540000-0000-4000-8000-000000000302','11540000-0000-4000-8000-000000000002',current_setting('p115d.actor')::uuid,'active',now()-interval '1 day',null,current_setting('p115d.actor')::uuid);

insert into public.calendar_events(
  id,workspace_id,transaction_id,company_id,title,event_type,starts_at,ends_at,status,version
) values (
  '11540000-0000-4000-8000-000000000401','11540000-0000-4000-8000-000000000001',
  '11540000-0000-4000-8000-000000000201','11540000-0000-4000-8000-000000000101',
  '__P115D_APPOINTMENT__','government_visit',date_trunc('hour',now())+interval '2 days',date_trunc('hour',now())+interval '2 days 1 hour','scheduled',1
);
insert into public.calendar_event_staff_assignments(workspace_id,calendar_event_id,organization_member_id,assigned_by)
values('11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000401','11540000-0000-4000-8000-000000000301',current_setting('p115d.actor')::uuid);

insert into public.workflow_instances(id,workspace_id,transaction_id,template_snapshot,current_stage_position,status,started_at)
values(
  '11540000-0000-4000-8000-000000000501','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000201',
  jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','P115D deadline','dueOffsetDays',4))),1,'active',now()
);
insert into public.workflow_stage_states(id,workspace_id,workflow_instance_id,stage_position,status,started_at)
values('11540000-0000-4000-8000-000000000502','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000501',1,'active',now());
insert into public.workflow_deadline_evidence(
  id,workspace_id,workflow_instance_id,workflow_stage_state_id,transaction_id,stage_position,stage_name,due_offset_days,
  source_started_at,workspace_timezone,due_date,cutoff_at,source_fingerprint,materialized_by
) values (
  '11540000-0000-4000-8000-000000000503','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000501','11540000-0000-4000-8000-000000000502',
  '11540000-0000-4000-8000-000000000201',1,'P115D deadline',4,now(),'Asia/Baghdad',
  (now() at time zone 'Asia/Baghdad')::date+4,private.m10_deadline_cutoff_v1((now() at time zone 'Asia/Baghdad')::date+4,'Asia/Baghdad'),
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',current_setting('p115d.actor')::uuid
);

insert into public.renewals(id,workspace_id,company_id,transaction_id,title,due_date,recurrence_rule,status,version)
values(
  '11540000-0000-4000-8000-000000000601','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000101','11540000-0000-4000-8000-000000000201',
  '__P115D_RENEWAL__',(now() at time zone 'Asia/Baghdad')::date+6,'FREQ=MONTHLY;INTERVAL=1','active',1
);
insert into public.renewal_occurrences(
  id,workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by
) values (
  '11540000-0000-4000-8000-000000000602','11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000601',1,
  (now() at time zone 'Asia/Baghdad')::date+6,(now() at time zone 'Asia/Baghdad')::date+6,'FREQ=MONTHLY;INTERVAL=1',1,current_setting('p115d.actor')::uuid
);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115d.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115d.actor'),true);
set local role authenticated;

do $$
declare v jsonb;
begin
  if auth.uid() is distinct from current_setting('p115d.actor')::uuid then raise exception 'P115D_AUTH_UID_MISMATCH'; end if;

  v:=public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,null,null,null,null,100);
  if v->>'schema'<>'enjaz.scheduling-calendar.v1' or v->>'timezone'<>'Asia/Baghdad' then raise exception 'P115D_SNAPSHOT_CONTRACT_FAIL %',v; end if;
  if jsonb_array_length(v->'items')<>3 then raise exception 'P115D_UNIFIED_SOURCE_COUNT_FAIL %',v; end if;
  if not exists(select 1 from jsonb_array_elements(v->'items') x where x->>'sourceKind'='appointment')
     or not exists(select 1 from jsonb_array_elements(v->'items') x where x->>'sourceKind'='workflow_deadline')
     or not exists(select 1 from jsonb_array_elements(v->'items') x where x->>'sourceKind'='renewal_occurrence') then
    raise exception 'P115D_UNIFIED_SOURCE_KIND_FAIL %',v;
  end if;
  if coalesce((v->'exportBoundary'->>'externalStateCanonical')::boolean,true)
     or coalesce((v->'exportBoundary'->>'externalMutationAllowed')::boolean,true)
     or v->'exportBoundary'->>'mode'<>'outbound_projection_only' then
    raise exception 'P115D_EXPORT_BOUNDARY_FAIL %',v;
  end if;

  v:=public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,'11540000-0000-4000-8000-000000000301',null,null,null,100);
  if jsonb_array_length(v->'items')<>1 or v->'items'->0->>'sourceKind'<>'appointment' then
    raise exception 'P115D_STAFF_SCOPE_INFERENCE_FAIL %',v;
  end if;

  v:=public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,null,'11540000-0000-4000-8000-000000000101',null,null,100);
  if (v->'summary'->>'totalCount')::integer<>3 then raise exception 'P115D_COMPANY_SCOPE_FAIL %',v; end if;

  v:=public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,null,null,null,'workflow_deadline',100);
  if jsonb_array_length(v->'items')<>1 or v->'items'->0->>'sourceKind'<>'workflow_deadline' then
    raise exception 'P115D_AUTHORITY_SCOPE_FAIL %',v;
  end if;

  begin
    perform public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,'11540000-0000-4000-8000-000000000302',null,null,null,100);
    raise exception 'P115D_CROSS_WORKSPACE_STAFF_ACCEPTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_CALENDAR_STAFF_OUT_OF_SCOPE%' then raise; end if;
  end;

  begin
    perform public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000002',null,null,null,null,null,null,100);
    raise exception 'P115D_NON_MEMBER_WORKSPACE_ACCEPTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN%' then raise; end if;
  end;

  begin
    perform public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',now(),now()+interval '371 days',null,null,null,null,100);
    raise exception 'P115D_OVERSIZED_WINDOW_ACCEPTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_CALENDAR_WINDOW_INVALID%' then raise; end if;
  end;
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.get_scheduling_calendar_v1('11540000-0000-4000-8000-000000000001',null,null,null,null,null,null,100);
    raise exception 'P115D_ANON_EXECUTE_ACCEPTED';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

delete from public.renewal_occurrences where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.renewals where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.workflow_deadline_evidence where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.workflow_stage_states where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.workflow_instances where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.calendar_event_staff_assignments where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.calendar_event_reschedule_history where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.calendar_events where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.organization_members where workspace_id in ('11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000002');
delete from public.transactions where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.companies where workspace_id in ('11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000002');
delete from public.workspace_memberships where workspace_id='11540000-0000-4000-8000-000000000001';
delete from public.workspaces where id in ('11540000-0000-4000-8000-000000000001','11540000-0000-4000-8000-000000000002');

do $$ begin
  if exists(select 1 from public.workspaces where id::text like '11540000-0000-4000-8000-%')
     or exists(select 1 from public.calendar_events where workspace_id::text like '11540000-0000-4000-8000-%')
     or exists(select 1 from public.calendar_event_staff_assignments where workspace_id::text like '11540000-0000-4000-8000-%')
     or exists(select 1 from public.workflow_deadline_evidence where workspace_id::text like '11540000-0000-4000-8000-%')
     or exists(select 1 from public.renewal_occurrences where workspace_id::text like '11540000-0000-4000-8000-%')
     or exists(select 1 from public.organization_members where workspace_id::text like '11540000-0000-4000-8000-%') then
    raise exception 'P115D_ZERO_RESIDUE_FAIL';
  end if;
end $$;

commit;
