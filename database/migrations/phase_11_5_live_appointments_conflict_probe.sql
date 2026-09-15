begin;

do $$
declare
  v_users uuid[];
begin
  select array_agg(id order by created_at,id) into v_users from (select id,created_at from auth.users order by created_at,id limit 3) u;
  if cardinality(v_users)<3 then raise exception 'P115B_AUTH_USERS_REQUIRED'; end if;
  perform set_config('p115b.actor',v_users[1]::text,true);
  perform set_config('p115b.staff2_user',v_users[2]::text,true);
  perform set_config('p115b.staff3_user',v_users[3]::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency) values
('11520000-0000-4000-8000-000000000001',current_setting('p115b.actor')::uuid,'__ENJAZ_P115B_A__','Asia/Baghdad','ar-IQ','IQD'),
('11520000-0000-4000-8000-000000000002',current_setting('p115b.actor')::uuid,'__ENJAZ_P115B_B__','Asia/Baghdad','ar-IQ','IQD');

insert into public.workspace_memberships(workspace_id,user_id,role) values
('11520000-0000-4000-8000-000000000001',current_setting('p115b.actor')::uuid,'owner');

insert into public.companies(id,workspace_id,legal_name,status) values
('11520000-0000-4000-8000-000000000101','11520000-0000-4000-8000-000000000001','__P115B_COMPANY__','active');

insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee) values
('11520000-0000-4000-8000-000000000201','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000101','P115B transaction A','active','normal',1),
('11520000-0000-4000-8000-000000000202','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000101','P115B transaction B','active','normal',1);

insert into public.workflow_instances(id,workspace_id,transaction_id,template_snapshot,current_stage_position,status) values
('11520000-0000-4000-8000-000000000301','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000201','{}'::jsonb,1,'active'),
('11520000-0000-4000-8000-000000000302','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000202','{}'::jsonb,1,'active');

insert into public.organization_members(id,workspace_id,user_id,status,valid_from,valid_until,created_by) values
('11520000-0000-4000-8000-000000000401','11520000-0000-4000-8000-000000000001',current_setting('p115b.actor')::uuid,'active',now()-interval '30 days',null,current_setting('p115b.actor')::uuid),
('11520000-0000-4000-8000-000000000402','11520000-0000-4000-8000-000000000001',current_setting('p115b.staff2_user')::uuid,'active',now()-interval '30 days',null,current_setting('p115b.actor')::uuid),
('11520000-0000-4000-8000-000000000403','11520000-0000-4000-8000-000000000001',current_setting('p115b.staff3_user')::uuid,'inactive',now()-interval '30 days',null,current_setting('p115b.actor')::uuid),
('11520000-0000-4000-8000-000000000404','11520000-0000-4000-8000-000000000002',current_setting('p115b.staff2_user')::uuid,'active',now()-interval '30 days',null,current_setting('p115b.actor')::uuid);

insert into public.client_portal_principals(id,workspace_id,user_id,status,version,created_by) values
('11520000-0000-4000-8000-000000000501','11520000-0000-4000-8000-000000000001',current_setting('p115b.staff3_user')::uuid,'invited',1,current_setting('p115b.actor')::uuid);
insert into public.client_portal_requests(id,workspace_id,principal_id,transaction_id,request_type,required_permission,title,status,version,created_by) values
('11520000-0000-4000-8000-000000000502','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000501','11520000-0000-4000-8000-000000000201','appointment','confirm_appointment','__P115B_APPOINTMENT__','open',1,current_setting('p115b.actor')::uuid);
insert into public.client_portal_appointment_responses(id,workspace_id,principal_id,request_id,transaction_id,decision,actor_user_id) values
('11520000-0000-4000-8000-000000000503','11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000501','11520000-0000-4000-8000-000000000502','11520000-0000-4000-8000-000000000201','confirmed',current_setting('p115b.staff3_user')::uuid);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115b.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115b.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
  v_base timestamptz := date_trunc('hour',now()) + interval '2 days';
  v_past timestamptz := date_trunc('hour',now()) - interval '2 hours';
begin
  if auth.uid() is distinct from current_setting('p115b.actor')::uuid then raise exception 'P115B_AUTH_UID_MISMATCH'; end if;

  begin
    insert into public.calendar_event_staff_assignments(workspace_id,calendar_event_id,organization_member_id,assigned_by)
    values('11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000401',current_setting('p115b.actor')::uuid);
    raise exception 'P115B_DIRECT_ASSIGNMENT_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.calendar_event_reschedule_history(
      workspace_id,calendar_event_id,operation_id,actor_user_id,previous_starts_at,new_starts_at,reason,version_before,version_after
    ) values(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000901',current_setting('p115b.actor')::uuid,
      v_base,v_base+interval '1 hour','FORBIDDEN',1,2
    );
    raise exception 'P115B_DIRECT_HISTORY_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  v := public.check_calendar_event_staff_conflicts_v1(
    '11520000-0000-4000-8000-000000000001',v_base,v_base+interval '1 hour','{}'::uuid[],null
  );
  if v->>'state'<>'unknown_assignment' then raise exception 'P115B_UNKNOWN_ASSIGNMENT_NOT_FAIL_CLOSED %',v; end if;

  v := public.check_calendar_event_staff_conflicts_v1(
    '11520000-0000-4000-8000-000000000001',v_base,null,
    array['11520000-0000-4000-8000-000000000401'::uuid],null
  );
  if v->>'state'<>'unknown_range' then raise exception 'P115B_UNKNOWN_RANGE_NOT_FAIL_CLOSED %',v; end if;

  v := public.create_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000701',
    'Primary appointment','government_visit',v_base,v_base+interval '1 hour',
    '11520000-0000-4000-8000-000000000201',null,null,'11520000-0000-4000-8000-000000000301',
    array['11520000-0000-4000-8000-000000000401'::uuid],'Primary appointment probe'
  );
  if v->>'status'<>'scheduled' or (v->>'version')::int<>1 or v->>'workflowInstanceId'<>'11520000-0000-4000-8000-000000000301' then
    raise exception 'P115B_CREATE_INVALID %',v;
  end if;
  if v->>'confirmationStatus'<>'unconfirmed' then raise exception 'P115B_PORTAL_EVIDENCE_MUTATED_SCHEDULE_DIRECTLY %',v; end if;

  v := public.create_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000701',
    'Primary appointment','government_visit',v_base,v_base+interval '1 hour',
    '11520000-0000-4000-8000-000000000201',null,null,'11520000-0000-4000-8000-000000000301',
    array['11520000-0000-4000-8000-000000000401'::uuid],'Primary appointment probe'
  );
  if coalesce((v->>'wasDuplicate')::boolean,false) is not true or (v->>'version')::int<>1 then
    raise exception 'P115B_CREATE_REPLAY_NOT_IDEMPOTENT %',v;
  end if;

  begin
    perform public.create_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000602','11520000-0000-4000-8000-000000000702',
      'Overlap same staff','review',v_base+interval '30 minutes',v_base+interval '90 minutes',
      '11520000-0000-4000-8000-000000000201',null,null,null,
      array['11520000-0000-4000-8000-000000000401'::uuid],null
    );
    raise exception 'P115B_OVERLAP_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STAFF_CONFLICT%' then raise; end if;
  end;

  v := public.create_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000603','11520000-0000-4000-8000-000000000703',
    'Adjacent same staff','review',v_base+interval '1 hour',v_base+interval '2 hours',
    '11520000-0000-4000-8000-000000000201',null,null,null,
    array['11520000-0000-4000-8000-000000000401'::uuid],null
  );
  if (v->>'version')::int<>1 then raise exception 'P115B_ADJACENT_CREATE_FAILED %',v; end if;

  v := public.create_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000604','11520000-0000-4000-8000-000000000704',
    'Overlap different staff','review',v_base+interval '30 minutes',v_base+interval '90 minutes',
    '11520000-0000-4000-8000-000000000201',null,null,null,
    array['11520000-0000-4000-8000-000000000402'::uuid],null
  );
  if (v->>'version')::int<>1 then raise exception 'P115B_DIFFERENT_STAFF_CREATE_FAILED %',v; end if;

  begin
    perform public.create_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000605','11520000-0000-4000-8000-000000000705',
      'Unknown range with staff','review',v_base+interval '4 hours',null,
      '11520000-0000-4000-8000-000000000201',null,null,null,
      array['11520000-0000-4000-8000-000000000401'::uuid],null
    );
    raise exception 'P115B_UNKNOWN_RANGE_WRITE_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_CONFLICT_RANGE_UNKNOWN%' then raise; end if;
  end;

  begin
    perform public.create_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000606','11520000-0000-4000-8000-000000000706',
      'Inactive staff','review',v_base+interval '4 hours',v_base+interval '5 hours',
      '11520000-0000-4000-8000-000000000201',null,null,null,
      array['11520000-0000-4000-8000-000000000403'::uuid],null
    );
    raise exception 'P115B_INACTIVE_STAFF_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STAFF_NOT_ACTIVE_OR_OUT_OF_SCOPE%' then raise; end if;
  end;

  begin
    perform public.create_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000607','11520000-0000-4000-8000-000000000707',
      'Cross workspace staff','review',v_base+interval '4 hours',v_base+interval '5 hours',
      '11520000-0000-4000-8000-000000000201',null,null,null,
      array['11520000-0000-4000-8000-000000000404'::uuid],null
    );
    raise exception 'P115B_CROSS_WORKSPACE_STAFF_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STAFF_NOT_ACTIVE_OR_OUT_OF_SCOPE%' then raise; end if;
  end;

  begin
    perform public.create_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000608','11520000-0000-4000-8000-000000000708',
      'Workflow mismatch','government_visit',v_base+interval '4 hours',v_base+interval '5 hours',
      '11520000-0000-4000-8000-000000000201',null,null,'11520000-0000-4000-8000-000000000302',
      '{}'::uuid[],null
    );
    raise exception 'P115B_WORKFLOW_MISMATCH_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_WORKFLOW_TRANSACTION_MISMATCH%' then raise; end if;
  end;

  v := public.update_calendar_event_metadata_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000604','11520000-0000-4000-8000-000000000709',1,
    'Updated different staff','government_visit','11520000-0000-4000-8000-000000000201',null,null,
    '11520000-0000-4000-8000-000000000301','Metadata updated'
  );
  if (v->>'version')::int<>2 or v->>'title'<>'Updated different staff' then raise exception 'P115B_METADATA_UPDATE_FAILED %',v; end if;

  v := public.reschedule_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000710',1,
    v_base+interval '2 hours',v_base+interval '3 hours','Move after adjacent appointment'
  );
  if (v->>'version')::int<>2 or v->>'confirmationStatus'<>'unconfirmed' then raise exception 'P115B_RESCHEDULE_FAILED %',v; end if;

  begin
    perform public.reschedule_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000711',1,
      v_base+interval '3 hours',v_base+interval '4 hours','Stale attempt'
    );
    raise exception 'P115B_STALE_RESCHEDULE_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STALE_VERSION%' then raise; end if;
  end;

  begin
    perform public.reschedule_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000712',2,
      v_base+interval '90 minutes',v_base+interval '150 minutes','Overlap adjacent appointment'
    );
    raise exception 'P115B_RESCHEDULE_OVERLAP_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_STAFF_CONFLICT%' then raise; end if;
  end;

  v := public.set_calendar_event_staff_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000713',2,
    array['11520000-0000-4000-8000-000000000402'::uuid],'Reassign appointment owner'
  );
  if (v->>'version')::int<>3 or v->'staffMemberIds'<>jsonb_build_array('11520000-0000-4000-8000-000000000402'::text) then
    raise exception 'P115B_STAFF_REPLACEMENT_FAILED %',v;
  end if;

  begin
    perform public.set_calendar_event_confirmation_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000603','11520000-0000-4000-8000-000000000714',1,
      'declined','11520000-0000-4000-8000-000000000503'
    );
    raise exception 'P115B_PORTAL_DECISION_MISMATCH_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_PORTAL_RESPONSE_DECISION_MISMATCH%' then raise; end if;
  end;

  v := public.set_calendar_event_confirmation_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000601','11520000-0000-4000-8000-000000000715',3,
    'confirmed','11520000-0000-4000-8000-000000000503'
  );
  if (v->>'version')::int<>4 or v->>'confirmationSource'<>'client_portal' or v->>'confirmationStatus'<>'confirmed' then
    raise exception 'P115B_PORTAL_CONFIRMATION_FAILED %',v;
  end if;

  v := public.create_calendar_event_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000609','11520000-0000-4000-8000-000000000716',
    'Past attendance appointment','review',v_past,v_past+interval '1 hour',
    '11520000-0000-4000-8000-000000000201',null,null,null,
    array['11520000-0000-4000-8000-000000000401'::uuid],null
  );
  if (v->>'status'<>'scheduled' then raise exception 'P115B_PAST_EVENT_CREATE_FAILED %',v; end if;

  v := public.record_calendar_event_attendance_v1(
    '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000609','11520000-0000-4000-8000-000000000717',1,
    'attended','Observed attendance'
  );
  if v->>'status'<>'completed' or v->>'attendanceOutcome'<>'attended' or (v->>'version')::int<>2 then
    raise exception 'P115B_ATTENDANCE_FAILED %',v;
  end if;

  begin
    perform public.record_calendar_event_attendance_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000603','11520000-0000-4000-8000-000000000718',1,
      'attended','Too early'
    );
    raise exception 'P115B_FUTURE_ATTENDANCE_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_ATTENDANCE_FUTURE_EVENT%' then raise; end if;
  end;

  begin
    perform public.reschedule_calendar_event_v1(
      '11520000-0000-4000-8000-000000000001','11520000-0000-4000-8000-000000000609','11520000-0000-4000-8000-000000000719',2,
      v_base+interval '6 hours',v_base+interval '7 hours','Forbidden terminal reschedule'
    );
    raise exception 'P115B_TERMINAL_RESCHEDULE_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_SCHEDULING_CALENDAR_EVENT_TERMINAL%' then raise; end if;
  end;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.calendar_event_reschedule_history h
      where h.workspace_id='11520000-0000-4000-8000-000000000001' and h.calendar_event_id='11520000-0000-4000-8000-000000000601')<>1 then
    raise exception 'P115B_RESCHEDULE_HISTORY_COUNT_INVALID';
  end if;
  if not exists(
    select 1 from public.calendar_event_reschedule_history h
    where h.workspace_id='11520000-0000-4000-8000-000000000001'
      and h.calendar_event_id='11520000-0000-4000-8000-000000000601'
      and h.operation_id='11520000-0000-4000-8000-000000000710'
      and h.reason='Move after adjacent appointment' and h.version_before=1 and h.version_after=2
  ) then raise exception 'P115B_RESCHEDULE_HISTORY_INVALID'; end if;

  if not exists(
    select 1 from public.calendar_event_staff_assignments a
    where a.workspace_id='11520000-0000-4000-8000-000000000001'
      and a.calendar_event_id='11520000-0000-4000-8000-000000000601'
      and a.organization_member_id='11520000-0000-4000-8000-000000000401'
      and a.unassigned_at is not null and a.unassignment_reason='Reassign appointment owner'
  ) then raise exception 'P115B_OLD_ASSIGNMENT_HISTORY_MISSING'; end if;
  if not exists(
    select 1 from public.calendar_event_staff_assignments a
    where a.workspace_id='11520000-0000-4000-8000-000000000001'
      and a.calendar_event_id='11520000-0000-4000-8000-000000000601'
      and a.organization_member_id='11520000-0000-4000-8000-000000000402'
      and a.unassigned_at is null
  ) then raise exception 'P115B_NEW_ASSIGNMENT_MISSING'; end if;

  if (select count(*) from public.audit_events a
      where a.workspace_id='11520000-0000-4000-8000-000000000001'
        and a.action in ('scheduling.calendar.created','scheduling.calendar.metadata_updated','scheduling.calendar.rescheduled','scheduling.calendar.staff_changed','scheduling.calendar.confirmation_recorded','scheduling.calendar.attendance_recorded')) < 9 then
    raise exception 'P115B_AUDIT_EVIDENCE_INCOMPLETE';
  end if;
end $$;

delete from public.workspaces where id in (
  '11520000-0000-4000-8000-000000000001'::uuid,
  '11520000-0000-4000-8000-000000000002'::uuid
);

do $$
begin
  if exists(select 1 from public.workspaces where id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_WORKSPACE_RESIDUE'; end if;
  if exists(select 1 from public.calendar_events where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_CALENDAR_RESIDUE'; end if;
  if exists(select 1 from public.calendar_event_staff_assignments where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_ASSIGNMENT_RESIDUE'; end if;
  if exists(select 1 from public.calendar_event_reschedule_history where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_HISTORY_RESIDUE'; end if;
  if exists(select 1 from public.organization_members where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_ORG_MEMBER_RESIDUE'; end if;
  if exists(select 1 from public.workflow_instances where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_WORKFLOW_RESIDUE'; end if;
  if exists(select 1 from public.client_portal_appointment_responses where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_PORTAL_RESPONSE_RESIDUE'; end if;
  if exists(select 1 from private.scheduling_command_receipts where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_RECEIPT_RESIDUE'; end if;
  if exists(select 1 from public.audit_events where workspace_id::text like '11520000-0000-4000-8000-%') then raise exception 'P115B_AUDIT_RESIDUE'; end if;
end $$;

commit;
