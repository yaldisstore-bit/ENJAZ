-- ENJAZ Phase 11.5-C — Deadline, Recurrence, Reminder & Escalation Engine
-- Canonical truths remain workflow instance/stage state + renewals. These tables are governed evidence/projections only.
begin;

create table public.workflow_deadline_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_instance_id uuid not null,
  workflow_stage_state_id uuid not null,
  transaction_id uuid not null,
  stage_position integer not null check (stage_position > 0),
  stage_name text not null check (char_length(btrim(stage_name)) between 1 and 320),
  due_offset_days integer not null check (due_offset_days between 0 and 3650),
  source_started_at timestamptz not null,
  workspace_timezone text not null check (char_length(btrim(workspace_timezone)) between 1 and 80),
  due_date date not null,
  cutoff_at timestamptz not null,
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{32}$'),
  materialized_by uuid not null references auth.users(id) on delete restrict,
  materialized_at timestamptz not null default now(),
  constraint workflow_deadline_evidence_workspace_id_id_key unique(workspace_id,id),
  constraint workflow_deadline_evidence_instance_fk foreign key(workspace_id,workflow_instance_id)
    references public.workflow_instances(workspace_id,id) on delete cascade,
  constraint workflow_deadline_evidence_stage_state_fk foreign key(workspace_id,workflow_stage_state_id)
    references public.workflow_stage_states(workspace_id,id) on delete cascade,
  constraint workflow_deadline_evidence_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint workflow_deadline_evidence_provenance_key
    unique(workspace_id,workflow_instance_id,stage_position,source_fingerprint)
);

create table public.renewal_occurrences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  renewal_id uuid not null,
  occurrence_sequence integer not null check (occurrence_sequence > 0),
  anchor_due_date date not null,
  due_date date not null,
  recurrence_rule_snapshot text not null check (char_length(btrim(recurrence_rule_snapshot)) between 1 and 160),
  source_renewal_version integer not null check (source_renewal_version > 0),
  status text not null default 'pending' check (status in ('pending','completed')),
  materialized_by uuid not null references auth.users(id) on delete restrict,
  materialized_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  constraint renewal_occurrences_workspace_id_id_key unique(workspace_id,id),
  constraint renewal_occurrences_renewal_fk foreign key(workspace_id,renewal_id)
    references public.renewals(workspace_id,id) on delete cascade,
  constraint renewal_occurrences_sequence_key unique(workspace_id,renewal_id,occurrence_sequence),
  constraint renewal_occurrences_due_key unique(workspace_id,renewal_id,due_date),
  constraint renewal_occurrences_completion_check check (
    (status='pending' and completed_by is null and completed_at is null)
    or (status='completed' and completed_by is not null and completed_at is not null)
  )
);

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

create index workflow_deadline_evidence_due_idx on public.workflow_deadline_evidence(workspace_id,cutoff_at,transaction_id);
create index workflow_deadline_evidence_instance_idx on public.workflow_deadline_evidence(workspace_id,workflow_instance_id,stage_position,materialized_at desc);
create index renewal_occurrences_due_idx on public.renewal_occurrences(workspace_id,due_date,status);
create index renewal_occurrences_root_idx on public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence desc);
create index deadline_miss_reviews_source_idx on public.deadline_miss_reviews(workspace_id,source_kind,source_id);

alter table public.workflow_deadline_evidence enable row level security;
alter table public.renewal_occurrences enable row level security;
alter table public.deadline_miss_reviews enable row level security;

revoke all on table public.workflow_deadline_evidence from public,anon,authenticated;
revoke all on table public.renewal_occurrences from public,anon,authenticated;
revoke all on table public.deadline_miss_reviews from public,anon,authenticated;
grant select on table public.workflow_deadline_evidence,public.renewal_occurrences,public.deadline_miss_reviews to authenticated;
grant select,insert,update,delete on table public.workflow_deadline_evidence,public.renewal_occurrences,public.deadline_miss_reviews to service_role;

create policy workflow_deadline_evidence_member_select on public.workflow_deadline_evidence
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=workflow_deadline_evidence.workspace_id and wm.user_id=(select auth.uid()))
);
create policy renewal_occurrences_member_select on public.renewal_occurrences
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=renewal_occurrences.workspace_id and wm.user_id=(select auth.uid()))
);
create policy deadline_miss_reviews_member_select on public.deadline_miss_reviews
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=deadline_miss_reviews.workspace_id and wm.user_id=(select auth.uid()))
);

create or replace function private.m10_deadline_cutoff_v1(p_due_date date,p_timezone text)
returns timestamptz language sql stable security invoker set search_path=''
as $$ select ((p_due_date + 1)::timestamp at time zone p_timezone); $$;
revoke all on function private.m10_deadline_cutoff_v1(date,text) from public,anon,authenticated;

create or replace function private.m10_normalize_recurrence_rule_v1(p_rule text)
returns text language plpgsql immutable security invoker set search_path=''
as $$
declare v text:=upper(regexp_replace(btrim(coalesce(p_rule,'')),'\s+','','g')); begin
  if v !~ '^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;INTERVAL=([1-9][0-9]{0,2}))?$' then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RECURRENCE_RULE_UNSUPPORTED';
  end if;
  return v;
end; $$;
revoke all on function private.m10_normalize_recurrence_rule_v1(text) from public,anon,authenticated;

create or replace function private.m10_renewal_occurrence_date_v1(p_anchor date,p_rule text,p_sequence integer)
returns date language plpgsql immutable security invoker set search_path=''
as $$
declare
  v_rule text:=private.m10_normalize_recurrence_rule_v1(p_rule);
  v_freq text:=substring(v_rule from 'FREQ=([A-Z]+)');
  v_interval integer:=coalesce(nullif(substring(v_rule from 'INTERVAL=([0-9]+)'),'')::integer,1);
  v_steps integer;
  v_month date;
  v_last date;
  v_day integer:=extract(day from p_anchor)::integer;
begin
  if p_anchor is null or p_sequence is null or p_sequence<1 or p_sequence>100000 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_RECURRENCE_SEQUENCE_INVALID';
  end if;
  v_steps:=(p_sequence-1)*v_interval;
  if v_freq='DAILY' then return p_anchor+v_steps; end if;
  if v_freq='WEEKLY' then return p_anchor+(v_steps*7); end if;
  if v_freq='MONTHLY' then
    v_month:=(date_trunc('month',p_anchor)::date + make_interval(months=>v_steps))::date;
  else
    v_month:=(date_trunc('month',p_anchor)::date + make_interval(months=>v_steps*12))::date;
  end if;
  v_last:=(v_month+interval '1 month - 1 day')::date;
  return make_date(extract(year from v_month)::integer,extract(month from v_month)::integer,least(v_day,extract(day from v_last)::integer));
end; $$;
revoke all on function private.m10_renewal_occurrence_date_v1(date,text,integer) from public,anon,authenticated;

create or replace function private.materialize_workflow_deadline_v1_impl(
  p_workspace_id uuid,p_workflow_instance_id uuid,p_stage_position integer,p_operation_id uuid
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_instance public.workflow_instances%rowtype;
  v_state public.workflow_stage_states%rowtype;
  v_stage jsonb;
  v_matches jsonb;
  v_offset integer;
  v_name text;
  v_tz text;
  v_due date;
  v_cutoff timestamptz;
  v_fingerprint text;
  v public.workflow_deadline_evidence%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_workflow_instance_id is null or p_operation_id is null or p_stage_position is null or p_stage_position<1 then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID';
  end if;
  v_payload:=jsonb_build_object('workflowInstanceId',p_workflow_instance_id,'stagePosition',p_stage_position);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'workflow_deadline_materialize' or v_receipt.entity_id<>p_workflow_instance_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_instance from public.workflow_instances wi where wi.workspace_id=p_workspace_id and wi.id=p_workflow_instance_id;
  if not found or v_instance.status='removed' then raise no_data_found using message='ENJAZ_SCHEDULING_WORKFLOW_NOT_FOUND'; end if;
  select * into v_state from public.workflow_stage_states ws where ws.workspace_id=p_workspace_id and ws.workflow_instance_id=p_workflow_instance_id and ws.stage_position=p_stage_position;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_WORKFLOW_STAGE_STATE_NOT_FOUND'; end if;
  if v_state.started_at is null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_DEADLINE_STAGE_ANCHOR_MISSING'; end if;
  if jsonb_typeof(v_instance.template_snapshot->'stages')<>'array' then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_DEADLINE_SNAPSHOT_INVALID'; end if;
  select coalesce(jsonb_agg(s),'[]'::jsonb) into v_matches
  from jsonb_array_elements(v_instance.template_snapshot->'stages') s
  where (s->>'position')~'^[0-9]+$' and (s->>'position')::integer=p_stage_position;
  if jsonb_array_length(v_matches)<>1 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_DEADLINE_STAGE_RULE_AMBIGUOUS'; end if;
  v_stage:=v_matches->0;
  if coalesce(v_stage->>'dueOffsetDays','') !~ '^[0-9]+$' then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_DEADLINE_RULE_MISSING'; end if;
  v_offset:=(v_stage->>'dueOffsetDays')::integer;
  if v_offset>3650 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_DEADLINE_RULE_INVALID'; end if;
  v_name:=btrim(coalesce(v_stage->>'name',''));
  if char_length(v_name) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_DEADLINE_STAGE_NAME_INVALID'; end if;
  select w.timezone into v_tz from public.workspaces w where w.id=p_workspace_id;
  if v_tz is null then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_WORKSPACE_TIMEZONE_MISSING'; end if;
  v_due:=((v_state.started_at at time zone v_tz)::date+v_offset);
  v_cutoff:=private.m10_deadline_cutoff_v1(v_due,v_tz);
  v_fingerprint:=md5(concat_ws('|',v_instance.id::text,v_state.id::text,v_state.started_at::text,v_offset::text,v_stage::text,v_tz));
  insert into public.workflow_deadline_evidence(
    workspace_id,workflow_instance_id,workflow_stage_state_id,transaction_id,stage_position,stage_name,due_offset_days,
    source_started_at,workspace_timezone,due_date,cutoff_at,source_fingerprint,materialized_by
  ) values (
    p_workspace_id,v_instance.id,v_state.id,v_instance.transaction_id,p_stage_position,v_name,v_offset,
    v_state.started_at,v_tz,v_due,v_cutoff,v_fingerprint,v_actor
  ) on conflict(workspace_id,workflow_instance_id,stage_position,source_fingerprint) do nothing;
  select * into v from public.workflow_deadline_evidence d where d.workspace_id=p_workspace_id and d.workflow_instance_id=v_instance.id and d.stage_position=p_stage_position and d.source_fingerprint=v_fingerprint;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-workflow-deadline.v1','id',v.id,'workspaceId',v.workspace_id,
    'workflowInstanceId',v.workflow_instance_id,'transactionId',v.transaction_id,'stagePosition',v.stage_position,'stageName',v.stage_name,
    'dueDate',v.due_date,'cutoffAt',v.cutoff_at,'timezone',v.workspace_timezone,'sourceFingerprint',v.source_fingerprint,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'workflow_deadline_materialize',p_workflow_instance_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.deadline.materialized','workflow_deadline',v.id,'Workflow deadline evidence materialized',
    jsonb_build_object('operationId',p_operation_id,'workflowInstanceId',v_instance.id,'stagePosition',p_stage_position,'dueDate',v_due,'cutoffAt',v_cutoff,'sourceFingerprint',v_fingerprint));
  return v_response;
end; $$;

create or replace function public.materialize_workflow_deadline_v1(uuid,uuid,integer,uuid)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.materialize_workflow_deadline_v1_impl($1,$2,$3,$4); $$;
revoke all on function private.materialize_workflow_deadline_v1_impl(uuid,uuid,integer,uuid) from public,anon;
grant execute on function private.materialize_workflow_deadline_v1_impl(uuid,uuid,integer,uuid) to authenticated,service_role;
revoke all on function public.materialize_workflow_deadline_v1(uuid,uuid,integer,uuid) from public,anon,service_role;
grant execute on function public.materialize_workflow_deadline_v1(uuid,uuid,integer,uuid) to authenticated;

create or replace function private.materialize_renewal_occurrence_v1_impl(
  p_workspace_id uuid,p_renewal_id uuid,p_operation_id uuid,p_expected_version integer
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_renewal public.renewals%rowtype;
  v_rule text;
  v_seq integer;
  v_anchor date;
  v public.renewal_occurrences%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_renewal_id is null or p_operation_id is null or p_expected_version is null or p_expected_version<1 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID'; end if;
  v_payload:=jsonb_build_object('renewalId',p_renewal_id,'expectedVersion',p_expected_version);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'renewal_occurrence_materialize' or v_receipt.entity_id<>p_renewal_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_renewal from public.renewals r where r.workspace_id=p_workspace_id and r.id=p_renewal_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_NOT_FOUND'; end if;
  if v_renewal.version<>p_expected_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_renewal.status<>'active' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_TERMINAL'; end if;
  if v_renewal.recurrence_rule is null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_NOT_RECURRING'; end if;
  v_rule:=private.m10_normalize_recurrence_rule_v1(v_renewal.recurrence_rule);
  select coalesce(max(o.occurrence_sequence),0)+1,coalesce(min(o.anchor_due_date),v_renewal.due_date) into v_seq,v_anchor
  from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id;
  if exists(select 1 from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id and o.due_date=v_renewal.due_date) then
    select * into v from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.renewal_id=p_renewal_id and o.due_date=v_renewal.due_date;
  else
    if private.m10_renewal_occurrence_date_v1(v_anchor,v_rule,v_seq)<>v_renewal.due_date then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_DRIFT'; end if;
    insert into public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by)
    values(p_workspace_id,p_renewal_id,v_seq,v_anchor,v_renewal.due_date,v_rule,v_renewal.version,v_actor) returning * into v;
  end if;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-renewal-occurrence.v1','id',v.id,'workspaceId',v.workspace_id,'renewalId',v.renewal_id,
    'sequence',v.occurrence_sequence,'anchorDueDate',v.anchor_due_date,'dueDate',v.due_date,'recurrenceRule',v.recurrence_rule_snapshot,
    'sourceRenewalVersion',v.source_renewal_version,'status',v.status,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'renewal_occurrence_materialize',p_renewal_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.renewal_occurrence.materialized','renewal_occurrence',v.id,'Recurring renewal occurrence materialized',
    jsonb_build_object('operationId',p_operation_id,'renewalId',p_renewal_id,'sequence',v.occurrence_sequence,'dueDate',v.due_date,'sourceRenewalVersion',v.source_renewal_version));
  return v_response;
end; $$;

create or replace function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.materialize_renewal_occurrence_v1_impl($1,$2,$3,$4); $$;
revoke all on function private.materialize_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.materialize_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.materialize_renewal_occurrence_v1(uuid,uuid,uuid,integer) to authenticated;

create or replace function private.complete_renewal_occurrence_v1_impl(
  p_workspace_id uuid,p_occurrence_id uuid,p_operation_id uuid,p_expected_renewal_version integer
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_occ public.renewal_occurrences%rowtype;
  v_renewal public.renewals%rowtype;
  v_rule text;
  v_next_date date;
  v_next public.renewal_occurrences%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_occurrence_id is null or p_operation_id is null or p_expected_renewal_version is null or p_expected_renewal_version<1 then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_COMMAND_INVALID'; end if;
  v_payload:=jsonb_build_object('occurrenceId',p_occurrence_id,'expectedRenewalVersion',p_expected_renewal_version);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt from private.scheduling_command_receipts r where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'renewal_occurrence_complete' or v_receipt.entity_id<>p_occurrence_id or v_receipt.actor_user_id<>v_actor or v_receipt.request_payload<>v_payload then raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT'; end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;
  select * into v_occ from public.renewal_occurrences o where o.workspace_id=p_workspace_id and o.id=p_occurrence_id for update;
  if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
  if v_occ.status<>'pending' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_TERMINAL'; end if;
  select * into v_renewal from public.renewals r where r.workspace_id=p_workspace_id and r.id=v_occ.renewal_id for update;
  if not found or v_renewal.status<>'active' then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_TERMINAL'; end if;
  if v_renewal.version<>p_expected_renewal_version then raise serialization_failure using message='ENJAZ_SCHEDULING_STALE_VERSION'; end if;
  if v_renewal.due_date<>v_occ.due_date then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_CURRENT'; end if;
  if v_renewal.recurrence_rule is null then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_RENEWAL_NOT_RECURRING'; end if;
  v_rule:=private.m10_normalize_recurrence_rule_v1(v_renewal.recurrence_rule);
  if v_rule<>v_occ.recurrence_rule_snapshot then raise serialization_failure using message='ENJAZ_SCHEDULING_RENEWAL_RECURRENCE_CHANGED'; end if;
  v_next_date:=private.m10_renewal_occurrence_date_v1(v_occ.anchor_due_date,v_rule,v_occ.occurrence_sequence+1);
  update public.renewal_occurrences set status='completed',completed_by=v_actor,completed_at=now() where workspace_id=p_workspace_id and id=v_occ.id;
  update public.renewals set due_date=v_next_date,last_completed_at=now(),updated_at=now(),version=version+1 where workspace_id=p_workspace_id and id=v_renewal.id returning * into v_renewal;
  insert into public.renewal_occurrences(workspace_id,renewal_id,occurrence_sequence,anchor_due_date,due_date,recurrence_rule_snapshot,source_renewal_version,materialized_by)
  values(p_workspace_id,v_renewal.id,v_occ.occurrence_sequence+1,v_occ.anchor_due_date,v_next_date,v_rule,v_renewal.version,v_actor)
  returning * into v_next;
  v_response:=jsonb_build_object('schema','enjaz.scheduling-renewal-occurrence-completion.v1','occurrenceId',v_occ.id,'renewalId',v_renewal.id,
    'completedDueDate',v_occ.due_date,'nextOccurrenceId',v_next.id,'nextDueDate',v_next.due_date,'renewalVersion',v_renewal.version,'wasDuplicate',false);
  insert into private.scheduling_command_receipts(workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload)
  values(p_workspace_id,p_operation_id,'renewal_occurrence_complete',p_occurrence_id,v_actor,v_payload,v_response);
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'scheduling.renewal_occurrence.completed','renewal_occurrence',v_occ.id,'Recurring renewal occurrence completed and next occurrence advanced',
    jsonb_build_object('operationId',p_operation_id,'renewalId',v_renewal.id,'completedDueDate',v_occ.due_date,'nextDueDate',v_next_date,'newRenewalVersion',v_renewal.version));
  return v_response;
end; $$;

create or replace function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.complete_renewal_occurrence_v1_impl($1,$2,$3,$4); $$;
revoke all on function private.complete_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) from public,anon;
grant execute on function private.complete_renewal_occurrence_v1_impl(uuid,uuid,uuid,integer) to authenticated,service_role;
revoke all on function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.complete_renewal_occurrence_v1(uuid,uuid,uuid,integer) to authenticated;

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
  v_stage_completed_at timestamptz;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_source_id is null or p_source_kind not in ('workflow_deadline','renewal_occurrence') then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_SOURCE_INVALID'; end if;
  if char_length(v_root) not between 3 and 2000 or (v_corrective is not null and char_length(v_corrective) not between 3 and 2000) then raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_REVIEW_TEXT_INVALID'; end if;
  if p_source_kind='workflow_deadline' then
    select d.due_date,d.cutoff_at,d.transaction_id,ws.completed_at into v_due,v_cutoff,v_transaction,v_stage_completed_at
    from public.workflow_deadline_evidence d join public.workflow_stage_states ws on ws.workspace_id=d.workspace_id and ws.id=d.workflow_stage_state_id
    where d.workspace_id=p_workspace_id and d.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'; end if;
    if v_stage_completed_at is not null and v_stage_completed_at<=v_cutoff then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED'; end if;
  else
    select o.due_date,private.m10_deadline_cutoff_v1(o.due_date,w.timezone),r.transaction_id into v_due,v_cutoff,v_transaction
    from public.renewal_occurrences o join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id join public.workspaces w on w.id=o.workspace_id
    where o.workspace_id=p_workspace_id and o.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
  end if;
  if now()<v_cutoff then raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED'; end if;
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
    select d.due_date,d.cutoff_at,d.transaction_id,d.stage_name,d.materialized_at into v_due,v_cutoff,v_transaction,v_title,v_source_at
    from public.workflow_deadline_evidence d where d.workspace_id=p_workspace_id and d.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'; end if;
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
      'cutoffAt',private.m10_deadline_cutoff_v1(o.due_date,v_tz),'state',case when o.status='completed' then 'completed' when p_as_of>=private.m10_deadline_cutoff_v1(o.due_date,v_tz) then 'overdue' when (p_as_of at time zone v_tz)::date=o.due_date then 'due_today' else 'upcoming' end,
      'secondsRemaining',greatest(0,extract(epoch from (private.m10_deadline_cutoff_v1(o.due_date,v_tz)-p_as_of))::bigint),'missReviewRecorded',exists(select 1 from public.deadline_miss_reviews mr where mr.workspace_id=o.workspace_id and mr.source_kind='renewal_occurrence' and mr.source_id=o.id)
    ) order by o.due_date,o.occurrence_sequence) from public.renewal_occurrences o join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id where o.workspace_id=p_workspace_id and o.status='pending'),'[]'::jsonb)
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
