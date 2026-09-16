-- ENJAZ Phase 11.5-C — SLA state, reminder/escalation projection, and explicit missed-deadline review.
begin;

create table public.deadline_miss_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_kind text not null check (source_kind in ('workflow_deadline','renewal_occurrence')),
  source_id uuid not null,
  transaction_id uuid,
  due_date date not null,
  cutoff_at timestamptz not null,
  root_cause text not null check (char_length(btrim(root_cause)) between 3 and 2000),
  corrective_action text check (corrective_action is null or char_length(btrim(corrective_action)) between 3 and 2000),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  constraint deadline_miss_reviews_workspace_id_id_key unique(workspace_id,id),
  constraint deadline_miss_reviews_source_key unique(workspace_id,source_kind,source_id),
  constraint deadline_miss_reviews_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict
);
create index deadline_miss_reviews_source_idx on public.deadline_miss_reviews(workspace_id,source_kind,source_id);

alter table public.deadline_miss_reviews enable row level security;
revoke all on table public.deadline_miss_reviews from public,anon,authenticated;
grant select on table public.deadline_miss_reviews to authenticated;
grant select,insert,update,delete on table public.deadline_miss_reviews to service_role;
create policy deadline_miss_reviews_member_select on public.deadline_miss_reviews
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=deadline_miss_reviews.workspace_id and wm.user_id=(select auth.uid()))
);

create or replace function private.record_deadline_miss_review_v1_impl(
  p_workspace_id uuid,p_source_kind text,p_source_id uuid,p_root_cause text,p_corrective_action text default null
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_due date;
  v_cutoff timestamptz;
  v_transaction uuid;
  v_root text:=btrim(coalesce(p_root_cause,''));
  v_corrective text:=nullif(btrim(coalesce(p_corrective_action,'')),'');
  v public.deadline_miss_reviews%rowtype;
  v_completed_at timestamptz;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_source_id is null or p_source_kind not in ('workflow_deadline','renewal_occurrence') then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_SOURCE_INVALID'; end if;
  if char_length(v_root) not between 3 and 2000 or (v_corrective is not null and char_length(v_corrective) not between 3 and 2000) then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_REVIEW_TEXT_INVALID'; end if;
  if p_source_kind='workflow_deadline' then
    select d.due_date,d.cutoff_at,d.transaction_id,ws.completed_at into v_due,v_cutoff,v_transaction,v_completed_at
    from public.workflow_deadline_evidence d join public.workflow_stage_states ws on ws.workspace_id=d.workspace_id and ws.id=d.workflow_stage_state_id
    where d.workspace_id=p_workspace_id and d.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'; end if;
  else
    select o.due_date,private.m10_deadline_cutoff_v1(o.due_date,w.timezone),r.transaction_id,o.completed_at into v_due,v_cutoff,v_transaction,v_completed_at
    from public.renewal_occurrences o join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id join public.workspaces w on w.id=o.workspace_id
    where o.workspace_id=p_workspace_id and o.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
  end if;
  if now()<v_cutoff or (v_completed_at is not null and v_completed_at<=v_cutoff) then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED'; end if;
  insert into public.deadline_miss_reviews(workspace_id,source_kind,source_id,transaction_id,due_date,cutoff_at,root_cause,corrective_action,reviewed_by)
  values(p_workspace_id,p_source_kind,p_source_id,v_transaction,v_due,v_cutoff,v_root,v_corrective,v_actor)
  on conflict(workspace_id,source_kind,source_id) do nothing;
  select * into v from public.deadline_miss_reviews r where r.workspace_id=p_workspace_id and r.source_kind=p_source_kind and r.source_id=p_source_id;
  if v.reviewed_by<>v_actor or v.root_cause<>v_root or v.corrective_action is distinct from v_corrective then raise unique_violation using message='ENJAZ_SCHEDULING_MISS_REVIEW_ALREADY_RECORDED'; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.deadline_miss.reviewed','deadline_miss_review',v.id,'Missed deadline root cause explicitly reviewed',
    jsonb_build_object('sourceKind',p_source_kind,'sourceId',p_source_id,'dueDate',v_due,'cutoffAt',v_cutoff,'transactionId',v_transaction));
  return jsonb_build_object('schema','enjaz.scheduling-deadline-miss-review.v1','id',v.id,'sourceKind',v.source_kind,'sourceId',v.source_id,
    'transactionId',v.transaction_id,'dueDate',v.due_date,'cutoffAt',v.cutoff_at,'rootCause',v.root_cause,'correctiveAction',v.corrective_action,'reviewedAt',v.reviewed_at);
end; $$;

create or replace function public.record_deadline_miss_review_v1(uuid,text,uuid,text,text)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.record_deadline_miss_review_v1_impl($1,$2,$3,$4,$5); $$;
revoke all on function private.record_deadline_miss_review_v1_impl(uuid,text,uuid,text,text) from public,anon;
grant execute on function private.record_deadline_miss_review_v1_impl(uuid,text,uuid,text,text) to authenticated,service_role;
revoke all on function public.record_deadline_miss_review_v1(uuid,text,uuid,text,text) from public,anon,service_role;
grant execute on function public.record_deadline_miss_review_v1(uuid,text,uuid,text,text) to authenticated;

create or replace function private.dispatch_scheduling_attention_v1_impl(
  p_workspace_id uuid,p_source_kind text,p_source_id uuid,p_operation_id uuid,p_recipient_user_id uuid,
  p_mode text,p_scheduled_for timestamptz default null,p_followup_id uuid default null,p_followup_due_at timestamptz default null
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_due date;
  v_cutoff timestamptz;
  v_transaction uuid;
  v_title text;
  v_category text;
  v_priority text;
  v_source_version integer:=1;
  v_source_at timestamptz;
  v_schedule timestamptz;
  v_completed_at timestamptz;
  v_notification jsonb;
  v_followup jsonb;
  v_payload jsonb;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_source_id is null or p_operation_id is null or p_recipient_user_id is null or p_source_kind not in ('workflow_deadline','renewal_occurrence') or p_mode not in ('reminder','escalation') then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_ATTENTION_INVALID'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_recipient_user_id) then raise foreign_key_violation using message='ENJAZ_SCHEDULING_ATTENTION_RECIPIENT_INVALID'; end if;
  if p_source_kind='workflow_deadline' then
    select d.due_date,d.cutoff_at,d.transaction_id,d.stage_name,d.materialized_at,ws.completed_at into v_due,v_cutoff,v_transaction,v_title,v_source_at,v_completed_at
    from public.workflow_deadline_evidence d join public.workflow_stage_states ws on ws.workspace_id=d.workspace_id and ws.id=d.workflow_stage_state_id
    where d.workspace_id=p_workspace_id and d.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'; end if;
    if v_completed_at is not null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL'; end if;
    v_category:='deadline';
    v_title:=case when p_mode='escalation' then 'متابعة عاجلة: ' else 'تذكير بموعد: ' end||v_title;
  else
    select o.due_date,private.m10_deadline_cutoff_v1(o.due_date,w.timezone),r.transaction_id,r.title,o.materialized_at,o.source_renewal_version
    into v_due,v_cutoff,v_transaction,v_title,v_source_at,v_source_version
    from public.renewal_occurrences o join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id join public.workspaces w on w.id=o.workspace_id
    where o.workspace_id=p_workspace_id and o.id=p_source_id and o.status='pending';
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
    v_category:='renewal';
    v_title:=case when p_mode='escalation' then 'تجديد متأخر: ' else 'تذكير بتجديد: ' end||v_title;
  end if;
  if p_mode='escalation' and now()<v_cutoff then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_ESCALATION_NOT_DUE'; end if;
  v_schedule:=case when p_mode='escalation' then now() else coalesce(p_scheduled_for,now()) end;
  if p_mode='reminder' and (v_schedule<now() or v_schedule>=v_cutoff) then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_REMINDER_SCHEDULE_INVALID'; end if;
  if p_followup_id is not null and (v_transaction is null or p_followup_due_at is null or p_followup_due_at<=now()) then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_FOLLOWUP_INVALID'; end if;
  if p_followup_id is null and p_followup_due_at is not null then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_FOLLOWUP_INVALID'; end if;
  v_payload:=jsonb_build_object('sourceKind',p_source_kind,'sourceId',p_source_id,'recipientUserId',p_recipient_user_id,'mode',p_mode,'scheduledFor',p_scheduled_for,'followupId',p_followup_id,'followupDueAt',p_followup_due_at);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'scheduling_attention' or v_receipt.entity_id<>p_source_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  v_priority:=case when p_mode='escalation' then 'critical' else 'normal' end;
  v_notification:=public.upsert_in_app_notification_v1(
    p_workspace_id,p_recipient_user_id,v_category,v_priority,left(v_title,320),p_source_kind,p_source_id,
    'm10:'||p_mode||':'||v_due::text,v_source_version,v_source_at,v_schedule
  );
  if p_followup_id is not null then
    v_followup:=public.create_transaction_followup_v1(p_workspace_id,v_transaction,p_followup_id,left(v_title,320),p_followup_due_at);
  end if;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-attention.v1','sourceKind',p_source_kind,'sourceId',p_source_id,'mode',p_mode,
    'dueDate',v_due,'cutoffAt',v_cutoff,'notificationId',v_notification->>'id','followupId',case when v_followup is null then null else v_followup->>'followupId' end,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'scheduling_attention',p_source_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.attention.'||p_mode,p_source_kind,p_source_id,'Scheduling reminder/escalation projected through existing attention authorities',
    jsonb_build_object('operationId',p_operation_id,'recipientUserId',p_recipient_user_id,'dueDate',v_due,'cutoffAt',v_cutoff,'notificationId',v_notification->>'id','followupId',case when v_followup is null then null else v_followup->>'followupId' end));
  return v_response;
end; $$;

create or replace function public.dispatch_scheduling_attention_v1(uuid,text,uuid,uuid,uuid,text,timestamptz,uuid,timestamptz)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.dispatch_scheduling_attention_v1_impl($1,$2,$3,$4,$5,$6,$7,$8,$9); $$;
revoke all on function private.dispatch_scheduling_attention_v1_impl(uuid,text,uuid,uuid,uuid,text,timestamptz,uuid,timestamptz) from public,anon;
grant execute on function private.dispatch_scheduling_attention_v1_impl(uuid,text,uuid,uuid,uuid,text,timestamptz,uuid,timestamptz) to authenticated,service_role;
revoke all on function public.dispatch_scheduling_attention_v1(uuid,text,uuid,uuid,uuid,text,timestamptz,uuid,timestamptz) from public,anon,service_role;
grant execute on function public.dispatch_scheduling_attention_v1(uuid,text,uuid,uuid,uuid,text,timestamptz,uuid,timestamptz) to authenticated;

create or replace function private.get_scheduling_deadline_snapshot_v1_impl(p_workspace_id uuid,p_as_of timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid; v_tz text; begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  select w.timezone into v_tz from public.workspaces w where w.id=p_workspace_id;
  return jsonb_build_object(
    'schema','enjaz.scheduling-deadline-snapshot.v1','workspaceId',p_workspace_id,'asOf',p_as_of,'timezone',v_tz,
    'workflowDeadlines',coalesce((select jsonb_agg(jsonb_build_object(
      'id',x.id,'transactionId',x.transaction_id,'workflowInstanceId',x.workflow_instance_id,'stagePosition',x.stage_position,'stageName',x.stage_name,
      'dueDate',x.due_date,'cutoffAt',x.cutoff_at,'state',case when s.completed_at is not null and s.completed_at<=x.cutoff_at then 'completed_on_time' when s.completed_at is not null then 'completed_late' when p_as_of>=x.cutoff_at then 'overdue' when (p_as_of at time zone x.workspace_timezone)::date=x.due_date then 'due_today' else 'upcoming' end,
      'secondsRemaining',greatest(0,extract(epoch from (x.cutoff_at-p_as_of))::bigint),'missReviewRecorded',exists(select 1 from public.deadline_miss_reviews mr where mr.workspace_id=x.workspace_id and mr.source_kind='workflow_deadline' and mr.source_id=x.id)
    ) order by x.cutoff_at) from (
      select distinct on (d.workflow_instance_id,d.stage_position) d.* from public.workflow_deadline_evidence d where d.workspace_id=p_workspace_id order by d.workflow_instance_id,d.stage_position,d.materialized_at desc,d.id desc
    ) x join public.workflow_stage_states s on s.workspace_id=x.workspace_id and s.id=x.workflow_stage_state_id),'[]'::jsonb),
    'renewalOccurrences',coalesce((select jsonb_agg(jsonb_build_object(
      'id',o.id,'renewalId',o.renewal_id,'transactionId',r.transaction_id,'title',r.title,'dueDate',o.due_date,
      'cutoffAt',private.m10_deadline_cutoff_v1(o.due_date,v_tz),'state',case when o.status='completed' then case when o.completed_at<=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'completed_on_time' else 'completed_late' end when p_as_of>=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'overdue' when (p_as_of at time zone v_tz)::date=o.due_date then 'due_today' else 'upcoming' end,
      'secondsRemaining',greatest(0,extract(epoch from (private.m10_deadline_cutoff_v1(o.due_date,v_tz)-p_as_of))::bigint),'missReviewRecorded',exists(select 1 from public.deadline_miss_reviews mr where mr.workspace_id=o.workspace_id and mr.source_kind='renewal_occurrence' and mr.source_id=o.id)
    ) order by o.due_date,o.occurrence_sequence) from public.renewal_occurrences o join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id where o.workspace_id=p_workspace_id),'[]'::jsonb)
  );
end; $$;

create or replace function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.get_scheduling_deadline_snapshot_v1_impl($1,$2); $$;
revoke all on function private.get_scheduling_deadline_snapshot_v1_impl(uuid,timestamptz) from public,anon;
grant execute on function private.get_scheduling_deadline_snapshot_v1_impl(uuid,timestamptz) to authenticated,service_role;
revoke all on function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz) from public,anon,service_role;
grant execute on function public.get_scheduling_deadline_snapshot_v1(uuid,timestamptz) to authenticated;

commit;
