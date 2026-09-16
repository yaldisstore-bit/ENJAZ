-- ENJAZ Phase 11.5-C — workflow-derived deadline evidence.
-- Workflow truth remains workflow_instances.template_snapshot + workflow_stage_states.
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

create index workflow_deadline_evidence_due_idx on public.workflow_deadline_evidence(workspace_id,cutoff_at,transaction_id);
create index workflow_deadline_evidence_instance_idx on public.workflow_deadline_evidence(workspace_id,workflow_instance_id,stage_position,materialized_at desc);

alter table public.workflow_deadline_evidence enable row level security;
revoke all on table public.workflow_deadline_evidence from public,anon,authenticated;
grant select on table public.workflow_deadline_evidence to authenticated;
grant select,insert,update,delete on table public.workflow_deadline_evidence to service_role;
create policy workflow_deadline_evidence_member_select on public.workflow_deadline_evidence
for select to authenticated using (
  exists(select 1 from public.workspace_memberships wm where wm.workspace_id=workflow_deadline_evidence.workspace_id and wm.user_id=(select auth.uid()))
);

create or replace function private.m10_deadline_cutoff_v1(p_due_date date,p_timezone text)
returns timestamptz language sql stable security invoker set search_path=''
as $$ select ((p_due_date + 1)::timestamp at time zone p_timezone); $$;
revoke all on function private.m10_deadline_cutoff_v1(date,text) from public,anon,authenticated;

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

commit;
