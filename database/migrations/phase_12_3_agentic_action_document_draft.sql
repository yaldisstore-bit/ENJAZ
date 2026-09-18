-- ENJAZ Phase 12.3 A3-E — governed document draft generation adapter.
-- Adds exactly one fifth low-risk action-specific adapter over existing M7 Document Factory authority.
-- Generation stops at review_required. Contact/OCR, review, render and finalization are not exposed.

begin;

alter table private.copilot_request_traces drop constraint if exists copilot_request_traces_operation_check;
alter table private.copilot_request_traces add constraint copilot_request_traces_operation_check check(operation in (
  'capabilities','provider_probe','search','summarize','compare','draft','explain',
  'plan','propose','approve_proposal','reject_proposal',
  'prepare_followup_snooze','execute_followup_snooze',
  'prepare_followup_create','execute_followup_create',
  'prepare_schedule_reminder','execute_schedule_reminder',
  'prepare_document_request','execute_document_request',
  'prepare_document_draft','execute_document_draft'
));

alter table private.copilot_agent_proposals
  add column action_template_version_id uuid null,
  add column action_company_id uuid null;

alter table private.copilot_agent_proposals drop constraint if exists copilot_agent_proposals_action_shape_check;
alter table private.copilot_agent_proposals add constraint copilot_agent_proposals_action_shape_check check(
  (proposal_kind='plan'
    and action_kind is null and action_target_id is null and action_snoozed_until is null
    and action_transaction_id is null and action_title is null and action_due_at is null
    and action_source_kind is null and action_operation_id is null and action_scheduled_for is null
    and action_principal_id is null and action_instructions is null and action_valid_until is null
    and action_template_version_id is null and action_company_id is null)
  or
  (proposal_kind='action' and action_kind='followup.snooze'
    and action_target_id is not null and action_snoozed_until is not null
    and action_transaction_id is null and action_title is null and action_due_at is null
    and action_source_kind is null and action_operation_id is null and action_scheduled_for is null
    and action_principal_id is null and action_instructions is null and action_valid_until is null
    and action_template_version_id is null and action_company_id is null)
  or
  (proposal_kind='action' and action_kind='followup.create'
    and action_target_id is not null and action_snoozed_until is null
    and action_transaction_id is not null and action_title is not null and char_length(action_title) between 1 and 320
    and action_due_at is not null and action_source_kind is null and action_operation_id is null and action_scheduled_for is null
    and action_principal_id is null and action_instructions is null and action_valid_until is null
    and action_template_version_id is null and action_company_id is null)
  or
  (proposal_kind='action' and action_kind='reminder.schedule'
    and action_target_id is not null and action_snoozed_until is null
    and action_transaction_id is null and action_title is null and action_due_at is null
    and action_source_kind in ('workflow_deadline','renewal_occurrence')
    and action_operation_id is not null and action_scheduled_for is not null
    and action_principal_id is null and action_instructions is null and action_valid_until is null
    and action_template_version_id is null and action_company_id is null)
  or
  (proposal_kind='action' and action_kind='document.request'
    and action_target_id is not null and action_snoozed_until is null
    and action_transaction_id is not null and action_title is not null and char_length(action_title) between 1 and 320
    and action_due_at is not null and action_source_kind is null and action_operation_id is null and action_scheduled_for is null
    and action_principal_id is not null
    and (action_instructions is null or char_length(action_instructions) between 1 and 2400)
    and action_valid_until is not null and action_due_at<=action_valid_until
    and action_template_version_id is null and action_company_id is null)
  or
  (proposal_kind='action' and action_kind='document.draft'
    and action_target_id is not null and action_snoozed_until is null
    and action_title is not null and char_length(action_title) between 1 and 320
    and action_due_at is null and action_source_kind is null and action_operation_id is null and action_scheduled_for is null
    and action_principal_id is null and action_instructions is null and action_valid_until is null
    and action_template_version_id is not null)
);

create index copilot_agent_proposals_document_draft_idx
  on private.copilot_agent_proposals(workspace_id,action_template_version_id,action_target_id)
  where action_kind='document.draft';

create or replace function private.copilot_document_draft_hash_v1(
  p_workspace_id uuid,p_request_id uuid,p_generation_request_id uuid,p_template_version_id uuid,
  p_title text,p_company_id uuid,p_transaction_id uuid
) returns text language sql immutable security invoker set search_path='' as $$
  select encode(extensions.digest(convert_to(
    'enjaz.copilot.agent.action.v1'
    ||'|'||lower(p_workspace_id::text)||'|'||lower(p_request_id::text)||'|prepare_document_draft'
    ||'|'||lower(p_generation_request_id::text)||'|'||lower(p_template_version_id::text)
    ||'|'||encode(extensions.digest(convert_to(p_title,'UTF8'),'sha256'),'hex')
    ||'|'||coalesce(lower(p_company_id::text),'')||'|'||coalesce(lower(p_transaction_id::text),'')
  ,'UTF8'),'sha256'),'hex');
$$;
revoke all on function private.copilot_document_draft_hash_v1(uuid,uuid,uuid,uuid,text,uuid,uuid)
  from public,anon,authenticated,service_role;

create or replace function private.copilot_begin_request_v8_impl(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,p_operation text,p_payload_hash text,p_limit integer default 20
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_existing private.copilot_request_traces%rowtype;
  v_trace private.copilot_request_traces%rowtype;
  v_window timestamptz:=date_trunc('minute',clock_timestamp());
  v_count integer;
begin
  if p_workspace_id is null or p_actor_user_id is null or p_request_id is null then
    raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID';
  end if;
  if p_operation not in (
    'plan','propose','approve_proposal','reject_proposal',
    'prepare_followup_snooze','execute_followup_snooze',
    'prepare_followup_create','execute_followup_create',
    'prepare_schedule_reminder','execute_schedule_reminder',
    'prepare_document_request','execute_document_request',
    'prepare_document_draft','execute_document_draft'
  ) then raise invalid_parameter_value using message='ENJAZ_COPILOT_OPERATION_FORBIDDEN'; end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_COPILOT_PAYLOAD_HASH_INVALID'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise invalid_parameter_value using message='ENJAZ_COPILOT_RATE_LIMIT_INVALID'; end if;
  if not exists(select 1 from public.workspace_memberships m where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id)
    then raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_request_id::text,0));
  select * into v_existing from private.copilot_request_traces t
    where t.workspace_id=p_workspace_id and t.request_id=p_request_id for update;
  if found then
    if v_existing.actor_user_id<>p_actor_user_id or v_existing.operation<>p_operation or v_existing.payload_hash<>p_payload_hash
      then raise unique_violation using message='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('allowed',true,'traceId',v_existing.id,'requestId',v_existing.request_id,'status',v_existing.status,'replayed',true,'rateCount',null);
  end if;

  insert into private.copilot_rate_buckets(workspace_id,actor_user_id,window_start,request_count,updated_at)
  values(p_workspace_id,p_actor_user_id,v_window,1,clock_timestamp())
  on conflict(workspace_id,actor_user_id) do update set
    window_start=excluded.window_start,
    request_count=case when private.copilot_rate_buckets.window_start=excluded.window_start then least(private.copilot_rate_buckets.request_count+1,p_limit+1) else 1 end,
    updated_at=clock_timestamp()
  returning request_count into v_count;
  if v_count>p_limit then
    return jsonb_build_object('allowed',false,'traceId',null,'requestId',p_request_id,'status','rate_limited','replayed',false,'rateCount',v_count);
  end if;

  insert into private.copilot_request_traces(workspace_id,actor_user_id,request_id,operation,payload_hash,status,metadata)
  values(p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,'accepted',jsonb_build_object('schema','enjaz.copilot.agent.v1'))
  returning * into v_trace;
  return jsonb_build_object('allowed',true,'traceId',v_trace.id,'requestId',v_trace.request_id,'status',v_trace.status,'replayed',false,'rateCount',v_count);
end;
$$;

create or replace function private.copilot_register_document_draft_proposal_v1_impl(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,p_proposal_hash text,
  p_generation_request_id uuid,p_template_version_id uuid,p_title text,p_company_id uuid,p_transaction_id uuid,p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_existing private.copilot_agent_proposals%rowtype;
  v_row private.copilot_agent_proposals%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_expected_hash text;
  v_title text:=btrim(coalesce(p_title,''));
begin
  if p_workspace_id is null or p_actor_user_id is null or p_request_id is null or p_generation_request_id is null or p_template_version_id is null
    then raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID'; end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID'; end if;
  if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TITLE_INVALID'; end if;
  if p_expires_at is null or p_expires_at<=v_now+interval '30 seconds' or p_expires_at>v_now+interval '30 minutes'
    then raise invalid_parameter_value using message='ENJAZ_COPILOT_APPROVAL_EXPIRY_INVALID'; end if;
  if not exists(select 1 from public.workspace_memberships m where m.workspace_id=p_workspace_id and m.user_id=p_actor_user_id)
    then raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'; end if;

  v_expected_hash:=private.copilot_document_draft_hash_v1(p_workspace_id,p_request_id,p_generation_request_id,p_template_version_id,v_title,p_company_id,p_transaction_id);
  if v_expected_hash<>p_proposal_hash then raise unique_violation using message='ENJAZ_COPILOT_ACTION_HASH_CONFLICT'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_request_id::text||':action',0));
  select * into v_existing from private.copilot_agent_proposals p
    where p.workspace_id=p_workspace_id and p.request_id=p_request_id for update;
  if found then
    if v_existing.actor_user_id<>p_actor_user_id or v_existing.proposal_hash<>p_proposal_hash
      or v_existing.proposal_kind<>'action' or v_existing.action_kind<>'document.draft'
      or v_existing.action_target_id<>p_generation_request_id or v_existing.action_template_version_id<>p_template_version_id
      or v_existing.action_title<>v_title or v_existing.action_company_id is distinct from p_company_id
      or v_existing.action_transaction_id is distinct from p_transaction_id
      then raise unique_violation using message='ENJAZ_COPILOT_ACTION_PROPOSAL_CONFLICT'; end if;
    return jsonb_build_object('proposalId',v_existing.id,'proposalHash',v_existing.proposal_hash,'status',v_existing.status,'expiresAt',v_existing.expires_at,
      'actionKind',v_existing.action_kind,'targetId',v_existing.action_target_id,'templateVersionId',v_existing.action_template_version_id,
      'title',v_existing.action_title,'companyId',v_existing.action_company_id,'transactionId',v_existing.action_transaction_id,'replayed',true);
  end if;

  insert into private.copilot_agent_proposals(
    workspace_id,actor_user_id,request_id,proposal_hash,plan_schema,proposal_kind,action_kind,
    action_target_id,action_template_version_id,action_title,action_company_id,action_transaction_id,expires_at
  ) values(
    p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,'enjaz.copilot.agent.plan.v1','action','document.draft',
    p_generation_request_id,p_template_version_id,v_title,p_company_id,p_transaction_id,p_expires_at
  ) returning * into v_row;

  insert into private.copilot_agent_approval_events(workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash)
  values(p_workspace_id,v_row.id,p_actor_user_id,'registered',p_request_id,p_proposal_hash);

  return jsonb_build_object('proposalId',v_row.id,'proposalHash',v_row.proposal_hash,'status',v_row.status,'expiresAt',v_row.expires_at,
    'actionKind',v_row.action_kind,'targetId',v_row.action_target_id,'templateVersionId',v_row.action_template_version_id,
    'title',v_row.action_title,'companyId',v_row.action_company_id,'transactionId',v_row.action_transaction_id,'replayed',false);
end;
$$;

create or replace function private.copilot_execute_document_draft_v1_impl(
  p_workspace_id uuid,p_proposal_id uuid,p_proposal_hash text,p_execution_key uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_row private.copilot_agent_proposals%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_domain jsonb;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_COPILOT_AUTH_REQUIRED'; end if;
  if p_workspace_id is null or p_proposal_id is null or p_execution_key is null then raise invalid_parameter_value using message='ENJAZ_COPILOT_INVALID_ID'; end if;
  if p_proposal_hash is null or p_proposal_hash !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_COPILOT_PROPOSAL_HASH_INVALID'; end if;
  if not exists(select 1 from public.workspace_memberships m where m.workspace_id=p_workspace_id and m.user_id=v_actor)
    then raise insufficient_privilege using message='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_proposal_id::text||':execute',0));
  select * into v_row from private.copilot_agent_proposals p where p.workspace_id=p_workspace_id and p.id=p_proposal_id for update;
  if not found then raise no_data_found using message='ENJAZ_COPILOT_PROPOSAL_NOT_FOUND'; end if;
  if v_row.actor_user_id<>v_actor then raise insufficient_privilege using message='ENJAZ_COPILOT_PROPOSAL_ACTOR_FORBIDDEN'; end if;
  if v_row.proposal_hash<>p_proposal_hash then raise unique_violation using message='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT'; end if;
  if v_row.proposal_kind<>'action' or v_row.action_kind<>'document.draft'
     or v_row.action_target_id is null or v_row.action_template_version_id is null or v_row.action_title is null
    then raise invalid_parameter_value using message='ENJAZ_COPILOT_ACTION_KIND_CONFLICT'; end if;

  if v_row.status='consumed' then
    if v_row.execution_key=p_execution_key and v_row.consumed_by=v_actor then
      return jsonb_build_object('schema','enjaz.copilot.agent.action-execution.v1','proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
        'executionKey',v_row.execution_key,'actionKind',v_row.action_kind,'targetId',v_row.action_target_id,
        'templateVersionId',v_row.action_template_version_id,'title',v_row.action_title,'companyId',v_row.action_company_id,
        'transactionId',v_row.action_transaction_id,'contactId',null,'ocrAnalysisId',null,'draftStatus','review_required',
        'result',v_row.execution_result,'replayed',true);
    end if;
    raise unique_violation using message='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT';
  end if;

  if v_row.status<>'approved' then raise object_not_in_prerequisite_state using message='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED'; end if;
  if v_row.expires_at<=v_now then raise check_violation using message='ENJAZ_COPILOT_APPROVAL_EXPIRED'; end if;
  if exists(select 1 from private.copilot_agent_proposals p where p.workspace_id=p_workspace_id and p.execution_key=p_execution_key and p.id<>p_proposal_id)
    then raise unique_violation using message='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT'; end if;

  v_domain:=public.generate_document_draft_v1(
    p_workspace_id,v_row.action_target_id,v_row.action_template_version_id,v_row.action_title,
    v_row.action_company_id,v_row.action_transaction_id,null,null
  );
  if coalesce(v_domain->>'status','')<>'review_required' or nullif(v_domain->>'draftId','') is null
    then raise data_exception using message='ENJAZ_COPILOT_DOCUMENT_DRAFT_RESULT_INVALID'; end if;

  update private.copilot_agent_proposals set status='consumed',consumed_at=v_now,consumed_by=v_actor,
    execution_key=p_execution_key,execution_result=v_domain
  where workspace_id=p_workspace_id and id=p_proposal_id returning * into v_row;

  insert into private.copilot_agent_approval_events(workspace_id,proposal_id,actor_user_id,event_type,event_key,proposal_hash,occurred_at)
  values(p_workspace_id,v_row.id,v_actor,'consumed',p_execution_key,p_proposal_hash,v_now);

  return jsonb_build_object('schema','enjaz.copilot.agent.action-execution.v1','proposalId',v_row.id,'proposalHash',v_row.proposal_hash,
    'executionKey',v_row.execution_key,'actionKind',v_row.action_kind,'targetId',v_row.action_target_id,
    'templateVersionId',v_row.action_template_version_id,'title',v_row.action_title,'companyId',v_row.action_company_id,
    'transactionId',v_row.action_transaction_id,'contactId',null,'ocrAnalysisId',null,'draftStatus','review_required',
    'result',v_row.execution_result,'replayed',false);
end;
$$;

create or replace function public.copilot_begin_request_v8(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,p_operation text,p_payload_hash text,p_limit integer default 20
) returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_begin_request_v8_impl(p_workspace_id,p_actor_user_id,p_request_id,p_operation,p_payload_hash,p_limit); $$;

create or replace function public.copilot_register_document_draft_proposal_v1(
  p_workspace_id uuid,p_actor_user_id uuid,p_request_id uuid,p_proposal_hash text,
  p_generation_request_id uuid,p_template_version_id uuid,p_title text,p_company_id uuid,p_transaction_id uuid,p_expires_at timestamptz
) returns jsonb language sql security invoker set search_path=''
as $$ select private.copilot_register_document_draft_proposal_v1_impl(
  p_workspace_id,p_actor_user_id,p_request_id,p_proposal_hash,p_generation_request_id,p_template_version_id,p_title,p_company_id,p_transaction_id,p_expires_at
); $$;

create or replace function public.copilot_execute_document_draft_v1(
  p_workspace_id uuid,p_proposal_id uuid,p_proposal_hash text,p_execution_key uuid
) returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.copilot_execute_document_draft_v1_impl(p_workspace_id,p_proposal_id,p_proposal_hash,p_execution_key); $$;

revoke all on function private.copilot_begin_request_v8_impl(uuid,uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function private.copilot_begin_request_v8_impl(uuid,uuid,uuid,text,text,integer) to service_role;
revoke all on function public.copilot_begin_request_v8(uuid,uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.copilot_begin_request_v8(uuid,uuid,uuid,text,text,integer) to service_role;

revoke all on function private.copilot_register_document_draft_proposal_v1_impl(uuid,uuid,uuid,text,uuid,uuid,text,uuid,uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function private.copilot_register_document_draft_proposal_v1_impl(uuid,uuid,uuid,text,uuid,uuid,text,uuid,uuid,timestamptz) to service_role;
revoke all on function public.copilot_register_document_draft_proposal_v1(uuid,uuid,uuid,text,uuid,uuid,text,uuid,uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.copilot_register_document_draft_proposal_v1(uuid,uuid,uuid,text,uuid,uuid,text,uuid,uuid,timestamptz) to service_role;

revoke all on function private.copilot_execute_document_draft_v1_impl(uuid,uuid,text,uuid) from public,anon,service_role;
grant execute on function private.copilot_execute_document_draft_v1_impl(uuid,uuid,text,uuid) to authenticated;
revoke all on function public.copilot_execute_document_draft_v1(uuid,uuid,text,uuid) from public,anon,service_role;
grant execute on function public.copilot_execute_document_draft_v1(uuid,uuid,text,uuid) to authenticated;

commit;
