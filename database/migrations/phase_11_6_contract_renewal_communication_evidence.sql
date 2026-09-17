-- ENJAZ Phase 11.6-C3 — Canonical renewal provenance & M4 communication evidence
-- Renewal truth remains public.renewals. Communication truth remains public.communications.
-- This migration adds contract provenance to the canonical renewal row and private
-- cross-authority evidence only; no shadow renewal or communication store is created.

begin;

alter table public.renewals
  add column contract_revision_id uuid;

alter table public.renewals
  add constraint renewals_contract_revision_fk
  foreign key(workspace_id,contract_revision_id)
  references public.engagement_contract_revisions(workspace_id,id)
  on delete restrict;

create index renewals_contract_revision_fk_idx
  on public.renewals(workspace_id,contract_revision_id)
  where contract_revision_id is not null;

create or replace function private.bind_contract_renewal_provenance_v1_impl(
  p_workspace_id uuid,
  p_renewal_id uuid,
  p_contract_revision_id uuid,
  p_operation_id uuid,
  p_expected_renewal_version integer,
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
  v_renewal public.renewals%rowtype;
  v_revision public.engagement_contract_revisions%rowtype;
  v_engagement public.commercial_engagements%rowtype;
  v_receipt private.scheduling_command_receipts%rowtype;
  v_payload jsonb;
  v_response jsonb;
begin
  v_actor:=private.require_scheduling_workspace_member_v1(p_workspace_id);
  if p_renewal_id is null or p_contract_revision_id is null or p_operation_id is null
     or p_expected_renewal_version is null or p_expected_renewal_version<1
     or p_expected_revision_version is null or p_expected_revision_version<1 then
    raise invalid_parameter_value using message='ENJAZ_CONTRACT_RENEWAL_BINDING_INVALID';
  end if;

  v_payload:=jsonb_build_object(
    'renewalId',p_renewal_id,
    'contractRevisionId',p_contract_revision_id,
    'expectedRenewalVersion',p_expected_renewal_version,
    'expectedRevisionVersion',p_expected_revision_version
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0)
  );

  select * into v_receipt
  from private.scheduling_command_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.command_type<>'contract_renewal_binding'
       or v_receipt.entity_id<>p_renewal_id
       or v_receipt.actor_user_id<>v_actor
       or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_CONTRACT_RENEWAL_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload||jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_revision
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=p_contract_revision_id
  for share;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_RENEWAL_REVISION_NOT_FOUND'; end if;
  if v_revision.version<>p_expected_revision_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_RENEWAL_REVISION_STALE';
  end if;
  if v_revision.status<>'effective' or v_revision.effective_on is null or v_revision.expires_on is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_REVISION_NOT_ELIGIBLE';
  end if;
  if v_revision.expires_on<v_revision.effective_on then
    raise data_exception using message='ENJAZ_CONTRACT_RENEWAL_DATE_RANGE_INVALID';
  end if;

  select * into v_engagement
  from public.commercial_engagements e
  where e.workspace_id=p_workspace_id and e.id=v_revision.engagement_id
    and e.deleted_at is null
  for share;
  if not found then raise foreign_key_violation using message='ENJAZ_CONTRACT_RENEWAL_ENGAGEMENT_INVALID'; end if;

  select * into v_renewal
  from public.renewals r
  where r.workspace_id=p_workspace_id and r.id=p_renewal_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_RENEWAL_NOT_FOUND'; end if;
  if v_renewal.version<>p_expected_renewal_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_RENEWAL_STALE';
  end if;
  if v_renewal.status<>'active' then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_TERMINAL';
  end if;
  if v_renewal.company_id is distinct from v_engagement.company_id then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_RENEWAL_COMPANY_MISMATCH';
  end if;
  if v_renewal.transaction_id is not null and not exists(
    select 1 from public.commercial_engagement_transactions et
    where et.workspace_id=p_workspace_id
      and et.engagement_id=v_revision.engagement_id
      and et.transaction_id=v_renewal.transaction_id
  ) then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_RENEWAL_TRANSACTION_MISMATCH';
  end if;
  if v_renewal.contract_revision_id is not null
     and v_renewal.contract_revision_id<>p_contract_revision_id then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_ALREADY_BOUND';
  end if;

  update public.renewals
  set contract_revision_id=p_contract_revision_id,
      due_date=v_revision.expires_on,
      version=version+1,
      updated_at=now()
  where workspace_id=p_workspace_id and id=p_renewal_id
  returning * into v_renewal;

  v_response:=jsonb_build_object(
    'schema','enjaz.contract-renewal-provenance.v1',
    'renewalId',v_renewal.id,
    'contractRevisionId',v_renewal.contract_revision_id,
    'dueDate',v_renewal.due_date,
    'renewalVersion',v_renewal.version,
    'contractRevisionVersion',v_revision.version,
    'wasDuplicate',false
  );

  insert into private.scheduling_command_receipts(
    workspace_id,operation_id,command_type,entity_id,actor_user_id,
    request_payload,response_payload
  ) values(
    p_workspace_id,p_operation_id,'contract_renewal_binding',p_renewal_id,v_actor,
    v_payload,v_response
  );

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'scheduling.renewal.contract_provenance.bound',
    'renewal',p_renewal_id,
    'Bound canonical renewal to effective M16 contract revision',
    jsonb_build_object(
      'operationId',p_operation_id,
      'contractRevisionId',p_contract_revision_id,
      'engagementId',v_revision.engagement_id,
      'expectedRenewalVersion',p_expected_renewal_version,
      'renewalVersion',v_renewal.version,
      'contractRevisionVersion',v_revision.version,
      'dueDate',v_renewal.due_date
    )
  );

  return v_response;
end;
$$;

create or replace function public.bind_contract_renewal_provenance_v1(
  p_workspace_id uuid,
  p_renewal_id uuid,
  p_contract_revision_id uuid,
  p_operation_id uuid,
  p_expected_renewal_version integer,
  p_expected_revision_version integer
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.bind_contract_renewal_provenance_v1_impl(
    p_workspace_id,p_renewal_id,p_contract_revision_id,p_operation_id,
    p_expected_renewal_version,p_expected_revision_version
  );
$$;

revoke all on function private.bind_contract_renewal_provenance_v1_impl(uuid,uuid,uuid,uuid,integer,integer)
  from public,anon;
grant execute on function private.bind_contract_renewal_provenance_v1_impl(uuid,uuid,uuid,uuid,integer,integer)
  to authenticated,service_role;
revoke all on function public.bind_contract_renewal_provenance_v1(uuid,uuid,uuid,uuid,integer,integer)
  from public,anon,service_role;
grant execute on function public.bind_contract_renewal_provenance_v1(uuid,uuid,uuid,uuid,integer,integer)
  to authenticated;

create table private.contract_renewal_communication_evidence (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  operation_id uuid not null,
  renewal_id uuid not null,
  contract_revision_id uuid not null,
  communication_id uuid not null,
  outbound_command_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(workspace_id,operation_id),
  constraint contract_renewal_comm_evidence_renewal_fk
    foreign key(workspace_id,renewal_id)
    references public.renewals(workspace_id,id) on delete restrict,
  constraint contract_renewal_comm_evidence_revision_fk
    foreign key(workspace_id,contract_revision_id)
    references public.engagement_contract_revisions(workspace_id,id) on delete restrict,
  constraint contract_renewal_comm_evidence_communication_fk
    foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint contract_renewal_comm_evidence_command_fk
    foreign key(workspace_id,outbound_command_id)
    references public.communication_outbound_commands(workspace_id,id) on delete restrict,
  constraint contract_renewal_comm_evidence_communication_unique
    unique(workspace_id,communication_id)
);

create index contract_renewal_comm_evidence_renewal_idx
  on private.contract_renewal_communication_evidence(workspace_id,renewal_id,created_at desc);
create index contract_renewal_comm_evidence_revision_idx
  on private.contract_renewal_communication_evidence(workspace_id,contract_revision_id,created_at desc);
create index contract_renewal_comm_evidence_outbound_idx
  on private.contract_renewal_communication_evidence(workspace_id,outbound_command_id);
create index contract_renewal_comm_evidence_actor_idx
  on private.contract_renewal_communication_evidence(actor_user_id);

revoke all on table private.contract_renewal_communication_evidence
  from public,anon,authenticated,service_role;

create or replace function private.record_contract_renewal_communication_evidence_v1_impl(
  p_workspace_id uuid,
  p_operation_id uuid,
  p_renewal_id uuid,
  p_contract_revision_id uuid,
  p_communication_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_existing private.contract_renewal_communication_evidence%rowtype;
  v_renewal public.renewals%rowtype;
  v_revision public.engagement_contract_revisions%rowtype;
  v_engagement public.commercial_engagements%rowtype;
  v_communication public.communications%rowtype;
  v_command public.communication_outbound_commands%rowtype;
begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if p_operation_id is null or p_renewal_id is null
     or p_contract_revision_id is null or p_communication_id is null then
    raise invalid_parameter_value using message='ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0)
  );

  select * into v_existing
  from private.contract_renewal_communication_evidence e
  where e.workspace_id=p_workspace_id and e.operation_id=p_operation_id;
  if found then
    if v_existing.renewal_id<>p_renewal_id
       or v_existing.contract_revision_id<>p_contract_revision_id
       or v_existing.communication_id<>p_communication_id
       or v_existing.actor_user_id<>v_actor then
      raise unique_violation using message='ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'renewalId',v_existing.renewal_id,
      'contractRevisionId',v_existing.contract_revision_id,
      'communicationId',v_existing.communication_id,
      'outboundCommandId',v_existing.outbound_command_id,
      'wasDuplicate',true
    );
  end if;

  select * into v_renewal
  from public.renewals r
  where r.workspace_id=p_workspace_id and r.id=p_renewal_id;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_RENEWAL_NOT_FOUND'; end if;
  if v_renewal.status<>'active'
     or v_renewal.contract_revision_id is distinct from p_contract_revision_id then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_PROVENANCE_REQUIRED';
  end if;

  select * into v_revision
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=p_contract_revision_id;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_RENEWAL_REVISION_NOT_FOUND'; end if;
  if v_revision.status<>'effective'
     or v_revision.expires_on is null
     or v_renewal.due_date<>v_revision.expires_on then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_REVISION_DRIFT';
  end if;

  select * into v_engagement
  from public.commercial_engagements e
  where e.workspace_id=p_workspace_id and e.id=v_revision.engagement_id
    and e.deleted_at is null;
  if not found or v_renewal.company_id is distinct from v_engagement.company_id then
    raise foreign_key_violation using message='ENJAZ_CONTRACT_RENEWAL_ENGAGEMENT_INVALID';
  end if;

  select * into v_communication
  from public.communications c
  where c.workspace_id=p_workspace_id and c.id=p_communication_id;
  if not found then raise no_data_found using message='ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_NOT_FOUND'; end if;
  if v_communication.direction<>'outgoing'
     or v_communication.link_status<>'linked'
     or v_communication.metadata->>'source'<>'governed_outbound'
     or v_communication.company_id is distinct from v_engagement.company_id
     or (v_renewal.transaction_id is not null and v_communication.transaction_id is distinct from v_renewal.transaction_id) then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_COMMUNICATION_SCOPE_INVALID';
  end if;

  select * into v_command
  from public.communication_outbound_commands c
  where c.workspace_id=p_workspace_id and c.communication_id=p_communication_id;
  if not found then
    raise object_not_in_prerequisite_state using message='ENJAZ_CONTRACT_RENEWAL_M4_COMMAND_REQUIRED';
  end if;

  insert into private.contract_renewal_communication_evidence(
    workspace_id,operation_id,renewal_id,contract_revision_id,
    communication_id,outbound_command_id,actor_user_id
  ) values(
    p_workspace_id,p_operation_id,p_renewal_id,p_contract_revision_id,
    p_communication_id,v_command.id,v_actor
  ) returning * into v_existing;

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'scheduling.renewal.communication_evidence.recorded',
    'renewal',p_renewal_id,
    'Linked canonical M4 outbound communication as contract renewal evidence',
    jsonb_build_object(
      'operationId',p_operation_id,
      'contractRevisionId',p_contract_revision_id,
      'communicationId',p_communication_id,
      'outboundCommandId',v_command.id,
      'outboundStatus',v_command.status,
      'approvalStatus',v_command.approval_status
    )
  );

  return jsonb_build_object(
    'renewalId',v_existing.renewal_id,
    'contractRevisionId',v_existing.contract_revision_id,
    'communicationId',v_existing.communication_id,
    'outboundCommandId',v_existing.outbound_command_id,
    'outboundStatus',v_command.status,
    'approvalStatus',v_command.approval_status,
    'wasDuplicate',false
  );
end;
$$;

create or replace function public.record_contract_renewal_communication_evidence_v1(
  p_workspace_id uuid,
  p_operation_id uuid,
  p_renewal_id uuid,
  p_contract_revision_id uuid,
  p_communication_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.record_contract_renewal_communication_evidence_v1_impl(
    p_workspace_id,p_operation_id,p_renewal_id,p_contract_revision_id,p_communication_id
  );
$$;

revoke all on function private.record_contract_renewal_communication_evidence_v1_impl(uuid,uuid,uuid,uuid,uuid)
  from public,anon;
grant execute on function private.record_contract_renewal_communication_evidence_v1_impl(uuid,uuid,uuid,uuid,uuid)
  to authenticated,service_role;
revoke all on function public.record_contract_renewal_communication_evidence_v1(uuid,uuid,uuid,uuid,uuid)
  from public,anon,service_role;
grant execute on function public.record_contract_renewal_communication_evidence_v1(uuid,uuid,uuid,uuid,uuid)
  to authenticated;

commit;
