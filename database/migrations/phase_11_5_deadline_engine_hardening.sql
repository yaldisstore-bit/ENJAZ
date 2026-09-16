-- ENJAZ Phase 11.5-C — hardening: retry-safe explicit miss reviews + covering FK indexes.
begin;

create index workflow_deadline_evidence_stage_state_fk_idx
  on public.workflow_deadline_evidence(workspace_id,workflow_stage_state_id);
create index workflow_deadline_evidence_transaction_fk_idx
  on public.workflow_deadline_evidence(workspace_id,transaction_id);
create index workflow_deadline_evidence_materialized_by_fk_idx
  on public.workflow_deadline_evidence(materialized_by);
create index renewal_occurrences_materialized_by_fk_idx
  on public.renewal_occurrences(materialized_by);
create index renewal_occurrences_completed_by_fk_idx
  on public.renewal_occurrences(completed_by) where completed_by is not null;
create index deadline_miss_reviews_transaction_fk_idx
  on public.deadline_miss_reviews(workspace_id,transaction_id) where transaction_id is not null;
create index deadline_miss_reviews_reviewed_by_fk_idx
  on public.deadline_miss_reviews(reviewed_by);

-- Replace the first-pass review command with a receipt-backed retry-safe command.
drop function public.record_deadline_miss_review_v1(uuid,text,uuid,text,text);
drop function private.record_deadline_miss_review_v1_impl(uuid,text,uuid,text,text);

create or replace function private.record_deadline_miss_review_v1_impl(
  p_workspace_id uuid,
  p_source_kind text,
  p_source_id uuid,
  p_operation_id uuid,
  p_root_cause text,
  p_corrective_action text default null
) returns jsonb
language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actor uuid;
  v_due date;
  v_cutoff timestamptz;
  v_transaction uuid;
  v_root text:=btrim(coalesce(p_root_cause,''));
  v_corrective text:=nullif(btrim(coalesce(p_corrective_action,'')),'');
  v_completed_at timestamptz;
  v public.deadline_miss_reviews%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_source_id is null or p_operation_id is null or p_source_kind not in ('workflow_deadline','renewal_occurrence') then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_SOURCE_INVALID';
  end if;
  if char_length(v_root) not between 3 and 2000
     or (v_corrective is not null and char_length(v_corrective) not between 3 and 2000) then
    raise invalid_parameter_value using message='ENJAZ_SCHEDULING_MISS_REVIEW_TEXT_INVALID';
  end if;

  v_payload:=jsonb_build_object(
    'sourceKind',p_source_kind,'sourceId',p_source_id,
    'rootCause',v_root,'correctiveAction',v_corrective
  );
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0));
  select * into v_receipt
  from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'deadline_miss_review'
       or v_receipt.entity_id<>p_source_id
       or v_receipt.actor_user_id<>v_actor
       or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_SCHEDULING_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;

  if p_source_kind='workflow_deadline' then
    select d.due_date,d.cutoff_at,d.transaction_id,ws.completed_at
      into v_due,v_cutoff,v_transaction,v_completed_at
    from public.workflow_deadline_evidence d
    join public.workflow_stage_states ws
      on ws.workspace_id=d.workspace_id and ws.id=d.workflow_stage_state_id
    where d.workspace_id=p_workspace_id and d.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_DEADLINE_NOT_FOUND'; end if;
  else
    select o.due_date,private.m10_deadline_cutoff_v1(o.due_date,w.timezone),r.transaction_id,o.completed_at
      into v_due,v_cutoff,v_transaction,v_completed_at
    from public.renewal_occurrences o
    join public.renewals r on r.workspace_id=o.workspace_id and r.id=o.renewal_id
    join public.workspaces w on w.id=o.workspace_id
    where o.workspace_id=p_workspace_id and o.id=p_source_id;
    if not found then raise no_data_found using message='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND'; end if;
  end if;

  if now()<v_cutoff or (v_completed_at is not null and v_completed_at<=v_cutoff) then
    raise object_not_in_prerequisite_state using message='ENJAZ_SCHEDULING_DEADLINE_NOT_MISSED';
  end if;

  insert into public.deadline_miss_reviews(
    workspace_id,source_kind,source_id,transaction_id,due_date,cutoff_at,
    root_cause,corrective_action,reviewed_by
  ) values (
    p_workspace_id,p_source_kind,p_source_id,v_transaction,v_due,v_cutoff,
    v_root,v_corrective,v_actor
  )
  on conflict(workspace_id,source_kind,source_id) do nothing;

  select * into v
  from public.deadline_miss_reviews r
  where r.workspace_id=p_workspace_id and r.source_kind=p_source_kind and r.source_id=p_source_id;
  if v.reviewed_by<>v_actor or v.root_cause<>v_root or v.corrective_action is distinct from v_corrective then
    raise unique_violation using message='ENJAZ_SCHEDULING_MISS_REVIEW_ALREADY_RECORDED';
  end if;

  v_response:=jsonb_build_object(
    'schema','enjaz.scheduling-deadline-miss-review.v1',
    'id',v.id,'workspaceId',v.workspace_id,
    'sourceKind',v.source_kind,'sourceId',v.source_id,
    'transactionId',v.transaction_id,'dueDate',v.due_date,'cutoffAt',v.cutoff_at,
    'rootCause',v.root_cause,'correctiveAction',v.corrective_action,
    'reviewedAt',v.reviewed_at,'wasDuplicate',false
  );

  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,request_payload,response_payload
  ) values (
    p_workspace_id,p_operation_id,'deadline_miss_review',p_source_id,v_actor,v_payload,v_response
  );

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'scheduling.deadline_miss.reviewed','deadline_miss_review',v.id,
    'Missed deadline root cause explicitly reviewed',
    jsonb_build_object('operationId',p_operation_id,'sourceKind',p_source_kind,'sourceId',p_source_id,
      'dueDate',v_due,'cutoffAt',v_cutoff,'transactionId',v_transaction)
  );

  return v_response;
end;
$$;

create or replace function public.record_deadline_miss_review_v1(
  p_workspace_id uuid,
  p_source_kind text,
  p_source_id uuid,
  p_operation_id uuid,
  p_root_cause text,
  p_corrective_action text default null
) returns jsonb
language sql volatile security invoker set search_path=''
as $$
  select private.record_deadline_miss_review_v1_impl($1,$2,$3,$4,$5,$6);
$$;

revoke all on function private.record_deadline_miss_review_v1_impl(uuid,text,uuid,uuid,text,text) from public,anon;
grant execute on function private.record_deadline_miss_review_v1_impl(uuid,text,uuid,uuid,text,text) to authenticated,service_role;
revoke all on function public.record_deadline_miss_review_v1(uuid,text,uuid,uuid,text,text) from public,anon,service_role;
grant execute on function public.record_deadline_miss_review_v1(uuid,text,uuid,uuid,text,text) to authenticated;

commit;
