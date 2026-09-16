-- ENJAZ Phase 11.5-C — authenticated live destruction probe.
-- Proves deadline derivation, recurrence anchoring, attention reuse, explicit miss review, RLS and zero residue.
begin;

do $$
declare v_actor uuid; begin
  select id into v_actor from auth.users order by created_at,id limit 1;
  if v_actor is null then raise exception 'P115C_AUTH_USER_REQUIRED'; end if;
  perform set_config('p115c.actor',v_actor::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
values('11530000-0000-4000-8000-000000000001',current_setting('p115c.actor')::uuid,'__ENJAZ_P115C__','Asia/Baghdad','ar-IQ','IQD');
insert into public.workspace_memberships(workspace_id,user_id,role)
values('11530000-0000-4000-8000-000000000001',current_setting('p115c.actor')::uuid,'owner');
insert into public.companies(id,workspace_id,legal_name,status)
values('11530000-0000-4000-8000-000000000101','11530000-0000-4000-8000-000000000001','__P115C_COMPANY__','active');
insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee) values
('11530000-0000-4000-8000-000000000201','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000101','P115C future','active','normal',1),
('11530000-0000-4000-8000-000000000202','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000101','P115C overdue','active','normal',1),
('11530000-0000-4000-8000-000000000203','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000101','P115C terminal','active','normal',1);

insert into public.workflow_instances(id,workspace_id,transaction_id,template_snapshot,current_stage_position,status,started_at) values
('11530000-0000-4000-8000-000000000301','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000201',jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','Future stage','dueOffsetDays',2))),1,'active',now()),
('11530000-0000-4000-8000-000000000302','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000202',jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','Overdue stage','dueOffsetDays',1))),1,'active',now()-interval '10 days'),
('11530000-0000-4000-8000-000000000303','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000203',jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','Terminal stage','dueOffsetDays',2))),1,'active',now()),
('11530000-0000-4000-8000-000000000304','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000201',jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','Missing rule'))),1,'active',now()),
('11530000-0000-4000-8000-000000000305','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000201',jsonb_build_object('stages',jsonb_build_array(jsonb_build_object('position',1,'name','Missing anchor','dueOffsetDays',1))),1,'active',now());

insert into public.workflow_stage_states(id,workspace_id,workflow_instance_id,stage_position,status,started_at,completed_at) values
('11530000-0000-4000-8000-000000000401','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000301',1,'active',now(),null),
('11530000-0000-4000-8000-000000000402','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000302',1,'active',now()-interval '10 days',null),
('11530000-0000-4000-8000-000000000403','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000303',1,'completed',now(),now()),
('11530000-0000-4000-8000-000000000404','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000304',1,'active',now(),null),
('11530000-0000-4000-8000-000000000405','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000305',1,'pending',null,null);

insert into public.renewals(id,workspace_id,company_id,transaction_id,title,due_date,recurrence_rule,status,version) values
('11530000-0000-4000-8000-000000000501','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000101','11530000-0000-4000-8000-000000000201','Month-end renewal','2027-01-31','FREQ=MONTHLY;INTERVAL=1','active',1),
('11530000-0000-4000-8000-000000000502','11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000101','11530000-0000-4000-8000-000000000201','Unsupported renewal',(now() at time zone 'Asia/Baghdad')::date+30,'FREQ=HOURLY','active',1);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p115c.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p115c.actor'),true);
set local role authenticated;

do $$
declare
  v jsonb;
  v2 jsonb;
  v_future uuid;
  v_overdue uuid;
  v_terminal uuid;
  v_occ1 uuid;
  v_occ2 uuid;
  v_occ3 uuid;
  v_expected_due date;
  v_failed boolean;
begin
  if auth.uid() is distinct from current_setting('p115c.actor')::uuid then raise exception 'P115C_AUTH_UID_MISMATCH'; end if;

  begin
    insert into public.workflow_deadline_evidence(
      workspace_id,workflow_instance_id,workflow_stage_state_id,transaction_id,stage_position,stage_name,due_offset_days,
      source_started_at,workspace_timezone,due_date,cutoff_at,source_fingerprint,materialized_by
    ) values(
      '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000301','11530000-0000-4000-8000-000000000401',
      '11530000-0000-4000-8000-000000000201',1,'FORBIDDEN',1,now(),'Asia/Baghdad',current_date,current_date+1,
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',current_setting('p115c.actor')::uuid
    );
    raise exception 'P115C_DIRECT_DEADLINE_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.renewal_occurrences(
      workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by
    ) values(
      '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000501',99,'2027-01-31','2035-01-31','FREQ=YEARLY',1,current_setting('p115c.actor')::uuid
    );
    raise exception 'P115C_DIRECT_OCCURRENCE_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  v:=public.materialize_workflow_deadline_v1(
    '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000301',1,'11530000-0000-4000-8000-000000000601'
  );
  v_future:=(v->>'id')::uuid;
  v_expected_due:=(now() at time zone 'Asia/Baghdad')::date+2;
  if (v->>'dueDate')::date<>v_expected_due or v->>'timezone'<>'Asia/Baghdad' then raise exception 'P115C_WORKFLOW_DEADLINE_DERIVATION_FAIL %',v; end if;
  v2:=public.materialize_workflow_deadline_v1(
    '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000301',1,'11530000-0000-4000-8000-000000000601'
  );
  if coalesce((v2->>'wasDuplicate')::boolean,false) is not true or v2->>'id'<>v->>'id' then raise exception 'P115C_DEADLINE_REPLAY_FAIL %',v2; end if;

  v:=public.materialize_workflow_deadline_v1(
    '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000302',1,'11530000-0000-4000-8000-000000000602'
  );
  v_overdue:=(v->>'id')::uuid;
  if (v->>'cutoffAt')::timestamptz>=now() then raise exception 'P115C_OVERDUE_DEADLINE_NOT_OVERDUE %',v; end if;

  v:=public.materialize_workflow_deadline_v1(
    '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000303',1,'11530000-0000-4000-8000-000000000603'
  );
  v_terminal:=(v->>'id')::uuid;

  begin
    perform public.materialize_workflow_deadline_v1(
      '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000304',1,'11530000-0000-4000-8000-000000000604'
    );
    raise exception 'P115C_MISSING_RULE_NOT_FAIL_CLOSED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_DEADLINE_RULE_MISSING%' then raise; end if; end;

  begin
    perform public.materialize_workflow_deadline_v1(
      '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000305',1,'11530000-0000-4000-8000-000000000605'
    );
    raise exception 'P115C_MISSING_ANCHOR_NOT_FAIL_CLOSED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_DEADLINE_STAGE_ANCHOR_MISSING%' then raise; end if; end;

  v:=public.materialize_renewal_occurrence_v1(
    '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000501','11530000-0000-4000-8000-000000000610',1
  );
  v_occ1:=(v->>'id')::uuid;
  if (v->>'sequence')::integer<>1 or (v->>'dueDate')::date<>'2027-01-31'::date then raise exception 'P115C_OCCURRENCE_1_FAIL %',v; end if;

  v:=public.complete_renewal_occurrence_v1(
    '11530000-0000-4000-8000-000000000001',v_occ1,'11530000-0000-4000-8000-000000000611',1
  );
  v_occ2:=(v->>'nextOccurrenceId')::uuid;
  if (v->>'nextDueDate')::date<>'2027-02-28'::date or (v->>'renewalVersion')::integer<>2 then raise exception 'P115C_MONTH_END_FEB_FAIL %',v; end if;
  v2:=public.complete_renewal_occurrence_v1(
    '11530000-0000-4000-8000-000000000001',v_occ1,'11530000-0000-4000-8000-000000000611',1
  );
  if coalesce((v2->>'wasDuplicate')::boolean,false) is not true then raise exception 'P115C_OCCURRENCE_COMPLETE_REPLAY_FAIL %',v2; end if;

  v:=public.complete_renewal_occurrence_v1(
    '11530000-0000-4000-8000-000000000001',v_occ2,'11530000-0000-4000-8000-000000000612',2
  );
  v_occ3:=(v->>'nextOccurrenceId')::uuid;
  if (v->>'nextDueDate')::date<>'2027-03-31'::date or (v->>'renewalVersion')::integer<>3 then raise exception 'P115C_MONTH_END_ANCHOR_DRIFT %',v; end if;

  begin
    perform public.materialize_renewal_occurrence_v1(
      '11530000-0000-4000-8000-000000000001','11530000-0000-4000-8000-000000000502','11530000-0000-4000-8000-000000000613',1
    );
    raise exception 'P115C_UNSUPPORTED_RECURRENCE_NOT_FAIL_CLOSED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_RECURRENCE_RULE_UNSUPPORTED%' then raise; end if; end;

  v:=public.dispatch_scheduling_attention_v1(
    '11530000-0000-4000-8000-000000000001','workflow_deadline',v_future,'11530000-0000-4000-8000-000000000620',current_setting('p115c.actor')::uuid,
    'reminder',now()+interval '1 hour',null,null
  );
  if v->>'notificationId' is null then raise exception 'P115C_REMINDER_NOTIFICATION_MISSING %',v; end if;
  v2:=public.dispatch_scheduling_attention_v1(
    '11530000-0000-4000-8000-000000000001','workflow_deadline',v_future,'11530000-0000-4000-8000-000000000620',current_setting('p115c.actor')::uuid,
    'reminder',now()+interval '1 hour',null,null
  );
  if coalesce((v2->>'wasDuplicate')::boolean,false) is not true then raise exception 'P115C_REMINDER_REPLAY_FAIL %',v2; end if;

  begin
    perform public.dispatch_scheduling_attention_v1(
      '11530000-0000-4000-8000-000000000001','workflow_deadline',v_future,'11530000-0000-4000-8000-000000000621',current_setting('p115c.actor')::uuid,
      'escalation',null,null,null
    );
    raise exception 'P115C_EARLY_ESCALATION_NOT_BLOCKED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_ESCALATION_NOT_DUE%' then raise; end if; end;

  begin
    perform public.dispatch_scheduling_attention_v1(
      '11530000-0000-4000-8000-000000000001','workflow_deadline',v_terminal,'11530000-0000-4000-8000-000000000622',current_setting('p115c.actor')::uuid,
      'reminder',now()+interval '1 hour',null,null
    );
    raise exception 'P115C_TERMINAL_ATTENTION_NOT_BLOCKED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL%' then raise; end if; end;

  v:=public.dispatch_scheduling_attention_v1(
    '11530000-0000-4000-8000-000000000001','workflow_deadline',v_overdue,'11530000-0000-4000-8000-000000000623',current_setting('p115c.actor')::uuid,
    'escalation',null,'11530000-0000-4000-8000-000000000701',now()+interval '1 day'
  );
  if v->>'notificationId' is null or v->>'followupId'<>'11530000-0000-4000-8000-000000000701' then raise exception 'P115C_ESCALATION_PROJECTION_FAIL %',v; end if;

  begin
    perform public.record_deadline_miss_review_v1(
      '11530000-0000-4000-8000-000000000001','workflow_deadline',v_future,'11530000-0000-4000-8000-000000000630','Too early','None'
    );
    raise exception 'P115C_FUTURE_MISS_REVIEW_NOT_BLOCKED';
  exception when others then if sqlerrm not like '%ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED%' then raise; end if; end;

  v:=public.record_deadline_miss_review_v1(
    '11530000-0000-4000-8000-000000000001','workflow_deadline',v_overdue,'11530000-0000-4000-8000-000000000631',
    'Government response arrived after the expected window','Escalate two business days before future cutoff'
  );
  if v->>'rootCause'<>'Government response arrived after the expected window' then raise exception 'P115C_MISS_REVIEW_FAIL %',v; end if;
  v2:=public.record_deadline_miss_review_v1(
    '11530000-0000-4000-8000-000000000001','workflow_deadline',v_overdue,'11530000-0000-4000-8000-000000000631',
    'Government response arrived after the expected window','Escalate two business days before future cutoff'
  );
  if coalesce((v2->>'wasDuplicate')::boolean,false) is not true then raise exception 'P115C_MISS_REVIEW_REPLAY_FAIL %',v2; end if;

  v:=public.get_scheduling_deadline_snapshot_v1('11530000-0000-4000-8000-000000000001',now());
  if v->>'timezone'<>'Asia/Baghdad' then raise exception 'P115C_SNAPSHOT_TIMEZONE_FAIL %',v; end if;
  if not exists(select 1 from jsonb_array_elements(v->'workflowDeadlines') x where x->>'id'=v_overdue::text and x->>'state'='overdue' and coalesce((x->>'missReviewRecorded')::boolean,false)) then
    raise exception 'P115C_SNAPSHOT_OVERDUE_REVIEW_FAIL %',v;
  end if;
  if not exists(select 1 from jsonb_array_elements(v->'renewalOccurrences') x where x->>'id'=v_occ3::text and x->>'state'='upcoming') then
    raise exception 'P115C_SNAPSHOT_RENEWAL_FAIL %',v;
  end if;

  if not exists(select 1 from public.in_app_notifications n where n.workspace_id='11530000-0000-4000-8000-000000000001' and n.source_id=v_future and n.event_key like 'm10:reminder:%') then
    raise exception 'P115C_NOTIFICATION_AUTHORITY_NOT_REUSED';
  end if;
  if not exists(select 1 from public.transaction_followups f where f.workspace_id='11530000-0000-4000-8000-000000000001' and f.id='11530000-0000-4000-8000-000000000701') then
    raise exception 'P115C_FOLLOWUP_AUTHORITY_NOT_REUSED';
  end if;
end $$;

reset role;

delete from public.in_app_notifications where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.transaction_followups where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.deadline_miss_reviews where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.renewal_occurrences where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.workflow_deadline_evidence where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.audit_events where workspace_id='11530000-0000-4000-8000-000000000001';
delete from private.scheduling_command_receipts where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.workflow_stage_states where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.workflow_instances where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.renewals where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.transactions where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.companies where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.workspace_memberships where workspace_id='11530000-0000-4000-8000-000000000001';
delete from public.workspaces where id='11530000-0000-4000-8000-000000000001';

do $$ begin
  if exists(select 1 from public.workspaces where id='11530000-0000-4000-8000-000000000001')
     or exists(select 1 from private.scheduling_command_receipts where workspace_id='11530000-0000-4000-8000-000000000001')
     or exists(select 1 from public.in_app_notifications where workspace_id='11530000-0000-4000-8000-000000000001')
     or exists(select 1 from public.workflow_deadline_evidence where workspace_id='11530000-0000-4000-8000-000000000001')
     or exists(select 1 from public.renewal_occurrences where workspace_id='11530000-0000-4000-8000-000000000001')
     or exists(select 1 from public.deadline_miss_reviews where workspace_id='11530000-0000-4000-8000-000000000001') then
    raise exception 'P115C_ZERO_RESIDUE_FAIL';
  end if;
end $$;

commit;
