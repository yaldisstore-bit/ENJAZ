-- ENJAZ Phase 11.6-C2 — Client Portal contract approval -> governed M16 reconciliation
-- M3 remains decision evidence. M16 remains canonical contract truth.
-- This migration adds only private bridge provenance and governed orchestration.

begin;

create table private.contract_approval_bridge_bindings (
  workspace_id uuid not null,
  request_id uuid not null,
  revision_id uuid not null,
  revision_version_at_issue integer not null check (revision_version_at_issue > 0),
  bound_by uuid not null,
  bound_at timestamptz not null default now(),
  reconciled_response_id uuid,
  reconcile_operation_id uuid,
  reconciled_revision_version integer check (reconciled_revision_version is null or reconciled_revision_version > 0),
  reconciled_by uuid,
  reconciled_at timestamptz,
  primary key(workspace_id,request_id),
  constraint contract_approval_bridge_request_fk
    foreign key(workspace_id,request_id)
    references public.client_portal_requests(workspace_id,id) on delete restrict,
  constraint contract_approval_bridge_revision_fk
    foreign key(workspace_id,revision_id)
    references public.engagement_contract_revisions(workspace_id,id) on delete restrict,
  constraint contract_approval_bridge_response_fk
    foreign key(reconciled_response_id)
    references public.client_portal_document_approval_responses(id) on delete restrict,
  constraint contract_approval_bridge_reconcile_shape_check check (
    (
      reconciled_response_id is null
      and reconcile_operation_id is null
      and reconciled_revision_version is null
      and reconciled_by is null
      and reconciled_at is null
    )
    or
    (
      reconciled_response_id is not null
      and reconcile_operation_id is not null
      and reconciled_revision_version is not null
      and reconciled_by is not null
      and reconciled_at is not null
    )
  )
);

create index contract_approval_bridge_revision_idx
  on private.contract_approval_bridge_bindings(workspace_id,revision_id,bound_at desc);
create index contract_approval_bridge_response_idx
  on private.contract_approval_bridge_bindings(reconciled_response_id)
  where reconciled_response_id is not null;
create unique index contract_approval_bridge_operation_unique
  on private.contract_approval_bridge_bindings(workspace_id,reconcile_operation_id)
  where reconcile_operation_id is not null;

revoke all on table private.contract_approval_bridge_bindings
  from public,anon,authenticated,service_role;

create or replace function private.bind_client_contract_approval_v1_impl(
  p_workspace_id uuid,
  p_request_id uuid,
  p_revision_id uuid,
  p_expected_revision_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_existing private.contract_approval_bridge_bindings%rowtype;
  v_request public.client_portal_requests%rowtype;
  v_target public.client_portal_document_approval_targets%rowtype;
  v_share public.client_portal_resource_shares%rowtype;
  v_revision public.engagement_contract_revisions%rowtype;
  v_draft public.document_drafts%rowtype;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  if p_request_id is null or p_revision_id is null
     or p_expected_revision_version is null or p_expected_revision_version<1 then
    raise invalid_parameter_value using message='ENJAZ_CONTRACT_APPROVAL_BINDING_INVALID';
  end if;

  select * into v_existing
  from private.contract_approval_bridge_bindings b
  where b.workspace_id=p_workspace_id and b.request_id=p_request_id
  for update;
  if found then
    if v_existing.revision_id=p_revision_id
       and v_existing.revision_version_at_issue=p_expected_revision_version then
      return jsonb_build_object(
        'requestId',v_existing.request_id,
        'revisionId',v_existing.revision_id,
        'revisionVersionAtIssue',v_existing.revision_version_at_issue,
        'reconciled',v_existing.reconciled_at is not null,
        'wasDuplicate',true
      );
    end if;
    raise unique_violation using message='ENJAZ_CONTRACT_APPROVAL_BINDING_CONFLICT';
  end if;

  select * into v_request
  from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_FOUND'; end if;
  if v_request.request_type<>'approval'
     or v_request.required_permission<>'approve_document'
     or v_request.resource_share_id is null
     or v_request.status<>'open'
     or v_request.revoked_at is not null
     or v_request.valid_from>now()
     or (v_request.valid_until is not null and v_request.valid_until<=now()) then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_ACTIVE';
  end if;

  select * into v_target
  from public.client_portal_document_approval_targets t
  where t.workspace_id=p_workspace_id and t.request_id=p_request_id;
  if not found
     or v_target.principal_id<>v_request.principal_id
     or v_target.transaction_id<>v_request.transaction_id
     or v_target.resource_share_id<>v_request.resource_share_id then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_TARGET_INVALID';
  end if;

  select * into v_share
  from public.client_portal_resource_shares s
  where s.workspace_id=p_workspace_id
    and s.id=v_request.resource_share_id
    and s.principal_id=v_request.principal_id
    and s.transaction_id=v_request.transaction_id
    and s.resource_type='document'
    and s.document_id=v_target.document_id
    and s.revoked_at is null
    and s.valid_from<=now()
    and (s.valid_until is null or s.valid_until>now());
  if not found then raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_SHARE_NOT_ACTIVE'; end if;

  select * into v_revision
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=p_revision_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_REVISION_NOT_FOUND'; end if;
  if v_revision.status<>'under_review' then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_REVISION_NOT_REVIEWABLE';
  end if;
  if v_revision.version<>p_expected_revision_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_APPROVAL_REVISION_STALE';
  end if;
  if v_revision.draft_id<>v_target.draft_id then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_APPROVAL_DRAFT_BINDING_MISMATCH';
  end if;

  select * into v_draft
  from public.document_drafts d
  where d.workspace_id=p_workspace_id and d.id=v_revision.draft_id;
  if not found
     or v_draft.status<>'review_required'
     or v_draft.transaction_id is distinct from v_request.transaction_id then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_DRAFT_NOT_REVIEWABLE';
  end if;

  if not exists(
    select 1 from public.commercial_engagement_transactions et
    where et.workspace_id=p_workspace_id
      and et.engagement_id=v_revision.engagement_id
      and et.transaction_id=v_request.transaction_id
  ) then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_APPROVAL_ENGAGEMENT_TRANSACTION_MISMATCH';
  end if;

  insert into private.contract_approval_bridge_bindings(
    workspace_id,request_id,revision_id,revision_version_at_issue,bound_by
  ) values(
    p_workspace_id,p_request_id,p_revision_id,p_expected_revision_version,v_actor
  ) returning * into v_existing;

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'engagement.contract.client_approval.bound',
    'engagement_contract_revision',p_revision_id,
    'Bound Client Portal approval request to canonical M16 revision',
    jsonb_build_object(
      'requestId',p_request_id,
      'revisionId',p_revision_id,
      'revisionVersionAtIssue',p_expected_revision_version,
      'engagementId',v_revision.engagement_id,
      'transactionId',v_request.transaction_id,
      'principalId',v_request.principal_id,
      'documentId',v_target.document_id,
      'draftId',v_target.draft_id
    )
  );

  return jsonb_build_object(
    'requestId',v_existing.request_id,
    'revisionId',v_existing.revision_id,
    'revisionVersionAtIssue',v_existing.revision_version_at_issue,
    'reconciled',false,
    'wasDuplicate',false
  );
end;
$$;

create or replace function public.bind_client_contract_approval_v1(
  p_workspace_id uuid,
  p_request_id uuid,
  p_revision_id uuid,
  p_expected_revision_version integer
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.bind_client_contract_approval_v1_impl(
    p_workspace_id,p_request_id,p_revision_id,p_expected_revision_version
  );
$$;

create or replace function private.reconcile_client_contract_approval_v1_impl(
  p_workspace_id uuid,
  p_request_id uuid,
  p_response_id uuid,
  p_operation_id uuid,
  p_expected_revision_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_binding private.contract_approval_bridge_bindings%rowtype;
  v_request public.client_portal_requests%rowtype;
  v_response public.client_portal_document_approval_responses%rowtype;
  v_target public.client_portal_document_approval_targets%rowtype;
  v_share public.client_portal_resource_shares%rowtype;
  v_revision public.engagement_contract_revisions%rowtype;
  v_draft public.document_drafts%rowtype;
  v_to_status text;
  v_transition jsonb;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  if p_request_id is null or p_response_id is null or p_operation_id is null
     or p_expected_revision_version is null or p_expected_revision_version<1 then
    raise invalid_parameter_value using message='ENJAZ_CONTRACT_APPROVAL_RECONCILE_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text||':'||p_request_id::text,0)
  );

  select * into v_binding
  from private.contract_approval_bridge_bindings b
  where b.workspace_id=p_workspace_id and b.request_id=p_request_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_BINDING_NOT_FOUND'; end if;

  if v_binding.reconciled_at is not null then
    if v_binding.reconciled_response_id=p_response_id
       and v_binding.reconcile_operation_id=p_operation_id
       and v_binding.revision_version_at_issue=p_expected_revision_version then
      select * into v_revision
      from public.engagement_contract_revisions r
      where r.workspace_id=p_workspace_id and r.id=v_binding.revision_id;
      if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_REVISION_NOT_FOUND'; end if;
      return jsonb_build_object(
        'requestId',p_request_id,
        'responseId',p_response_id,
        'revisionId',v_binding.revision_id,
        'status',v_revision.status,
        'version',v_binding.reconciled_revision_version,
        'wasDuplicate',true
      );
    end if;
    raise unique_violation using message='ENJAZ_CONTRACT_APPROVAL_RECONCILE_CONFLICT';
  end if;

  if v_binding.revision_version_at_issue<>p_expected_revision_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_APPROVAL_EXPECTED_VERSION_MISMATCH';
  end if;
  if exists(
    select 1 from private.contract_approval_bridge_bindings b
    where b.workspace_id=p_workspace_id
      and b.reconcile_operation_id=p_operation_id
      and b.request_id<>p_request_id
  ) then
    raise unique_violation using message='ENJAZ_CONTRACT_APPROVAL_OPERATION_CONFLICT';
  end if;

  select * into v_request
  from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_FOUND'; end if;
  if v_request.request_type<>'approval'
     or v_request.required_permission<>'approve_document'
     or v_request.status<>'fulfilled'
     or v_request.revoked_at is not null
     or v_request.valid_from>now()
     or (v_request.valid_until is not null and v_request.valid_until<=now()) then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_REQUEST_NOT_RECONCILABLE';
  end if;

  select * into v_response
  from public.client_portal_document_approval_responses a
  where a.id=p_response_id
    and a.workspace_id=p_workspace_id
    and a.request_id=p_request_id
    and a.principal_id=v_request.principal_id
    and a.transaction_id=v_request.transaction_id;
  if not found or v_response.decision not in ('approved','rejected') then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_RESPONSE_INVALID';
  end if;

  select * into v_target
  from public.client_portal_document_approval_targets t
  where t.workspace_id=p_workspace_id and t.request_id=p_request_id;
  if not found
     or v_target.principal_id<>v_request.principal_id
     or v_target.transaction_id<>v_request.transaction_id
     or v_target.resource_share_id<>v_request.resource_share_id
     or v_target.document_id<>v_response.document_id
     or v_target.draft_id is distinct from v_response.draft_id then
    raise serialization_failure using message='ENJAZ_CONTRACT_APPROVAL_TARGET_DRIFT';
  end if;

  select * into v_share
  from public.client_portal_resource_shares s
  where s.workspace_id=p_workspace_id
    and s.id=v_request.resource_share_id
    and s.principal_id=v_request.principal_id
    and s.transaction_id=v_request.transaction_id
    and s.resource_type='document'
    and s.document_id=v_target.document_id
    and s.revoked_at is null
    and s.valid_from<=now()
    and (s.valid_until is null or s.valid_until>now());
  if not found then raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_SHARE_NOT_ACTIVE'; end if;

  select * into v_revision
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=v_binding.revision_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_REVISION_NOT_FOUND'; end if;
  if v_revision.version<>p_expected_revision_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_APPROVAL_REVISION_STALE';
  end if;
  if v_revision.status<>'under_review' then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_REVISION_NOT_REVIEWABLE';
  end if;
  if v_revision.draft_id<>v_target.draft_id then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_APPROVAL_DRAFT_BINDING_MISMATCH';
  end if;
  if not exists(
    select 1 from public.commercial_engagement_transactions et
    where et.workspace_id=p_workspace_id
      and et.engagement_id=v_revision.engagement_id
      and et.transaction_id=v_request.transaction_id
  ) then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_APPROVAL_ENGAGEMENT_TRANSACTION_MISMATCH';
  end if;

  select * into v_draft
  from public.document_drafts d
  where d.workspace_id=p_workspace_id and d.id=v_revision.draft_id;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_APPROVAL_DRAFT_NOT_FOUND'; end if;
  if (v_response.decision='approved' and v_draft.status<>'approved')
     or (v_response.decision='rejected' and v_draft.status<>'draft') then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_APPROVAL_FACTORY_DECISION_NOT_APPLIED';
  end if;

  v_to_status:=case when v_response.decision='approved' then 'approved' else 'draft' end;
  v_transition:=public.transition_engagement_contract_revision_v2(
    p_workspace_id,v_revision.id,p_operation_id,p_expected_revision_version,v_to_status
  );

  if coalesce((v_transition->>'version')::integer,0)<>p_expected_revision_version+1 then
    raise serialization_failure using message='ENJAZ_CONTRACT_APPROVAL_TRANSITION_VERSION_DRIFT';
  end if;

  update private.contract_approval_bridge_bindings
  set reconciled_response_id=p_response_id,
      reconcile_operation_id=p_operation_id,
      reconciled_revision_version=(v_transition->>'version')::integer,
      reconciled_by=v_actor,
      reconciled_at=now()
  where workspace_id=p_workspace_id and request_id=p_request_id
  returning * into v_binding;

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'engagement.contract.client_decision.reconciled',
    'engagement_contract_revision',v_revision.id,
    'Reconciled Client Portal decision through governed M16 transition',
    jsonb_build_object(
      'requestId',p_request_id,
      'responseId',p_response_id,
      'operationId',p_operation_id,
      'decision',v_response.decision,
      'revisionId',v_revision.id,
      'revisionVersionAtIssue',p_expected_revision_version,
      'reconciledRevisionVersion',v_binding.reconciled_revision_version,
      'transactionId',v_request.transaction_id,
      'principalId',v_request.principal_id
    )
  );

  return jsonb_build_object(
    'requestId',p_request_id,
    'responseId',p_response_id,
    'revisionId',v_revision.id,
    'decision',v_response.decision,
    'status',v_to_status,
    'version',v_binding.reconciled_revision_version,
    'wasDuplicate',false
  );
end;
$$;

create or replace function public.reconcile_client_contract_approval_v1(
  p_workspace_id uuid,
  p_request_id uuid,
  p_response_id uuid,
  p_operation_id uuid,
  p_expected_revision_version integer
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.reconcile_client_contract_approval_v1_impl(
    p_workspace_id,p_request_id,p_response_id,p_operation_id,p_expected_revision_version
  );
$$;

revoke all on function private.bind_client_contract_approval_v1_impl(uuid,uuid,uuid,integer)
  from public,anon;
grant execute on function private.bind_client_contract_approval_v1_impl(uuid,uuid,uuid,integer)
  to authenticated,service_role;
revoke all on function public.bind_client_contract_approval_v1(uuid,uuid,uuid,integer)
  from public,anon,service_role;
grant execute on function public.bind_client_contract_approval_v1(uuid,uuid,uuid,integer)
  to authenticated;

revoke all on function private.reconcile_client_contract_approval_v1_impl(uuid,uuid,uuid,uuid,integer)
  from public,anon;
grant execute on function private.reconcile_client_contract_approval_v1_impl(uuid,uuid,uuid,uuid,integer)
  to authenticated,service_role;
revoke all on function public.reconcile_client_contract_approval_v1(uuid,uuid,uuid,uuid,integer)
  from public,anon,service_role;
grant execute on function public.reconcile_client_contract_approval_v1(uuid,uuid,uuid,uuid,integer)
  to authenticated;

commit;
