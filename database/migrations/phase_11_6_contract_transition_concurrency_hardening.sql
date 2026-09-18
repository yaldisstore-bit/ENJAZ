-- ENJAZ Phase 11.6-C1 — M16 contract transition concurrency/idempotency hardening
-- Adds versioned optimistic concurrency and retry receipts around the existing
-- canonical Phase 10.5 transition logic. No shadow contract state is introduced.

begin;

alter table public.engagement_contract_revisions
  add column version integer not null default 1 check (version > 0);

create table private.engagement_contract_transition_receipts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  operation_id uuid not null,
  revision_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  expected_version integer not null check (expected_version > 0),
  request_payload jsonb not null check (jsonb_typeof(request_payload)='object'),
  response_payload jsonb not null check (jsonb_typeof(response_payload)='object'),
  created_at timestamptz not null default now(),
  primary key(workspace_id,operation_id),
  constraint engagement_contract_transition_receipts_revision_fk
    foreign key(workspace_id,revision_id)
    references public.engagement_contract_revisions(workspace_id,id) on delete restrict
);
create index engagement_contract_transition_receipts_revision_idx
  on private.engagement_contract_transition_receipts(workspace_id,revision_id,created_at desc);
revoke all on table private.engagement_contract_transition_receipts
  from public,anon,authenticated,service_role;

create or replace function private.bump_engagement_contract_revision_version_v1()
returns trigger
language plpgsql
volatile
security definer
set search_path=''
as $$
begin
  new.version:=old.version+1;
  return new;
end;
$$;

drop trigger if exists engagement_contract_revisions_bump_version
  on public.engagement_contract_revisions;
create trigger engagement_contract_revisions_bump_version
before update on public.engagement_contract_revisions
for each row execute function private.bump_engagement_contract_revision_version_v1();

revoke all on function private.bump_engagement_contract_revision_version_v1()
  from public,anon,authenticated,service_role;

create or replace function private.transition_engagement_contract_revision_v2_impl(
  p_workspace_id uuid,
  p_revision_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_to_status text,
  p_document_id uuid,
  p_document_version_id uuid,
  p_effective_on date,
  p_expires_on date,
  p_signature_provenance jsonb,
  p_note text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_row public.engagement_contract_revisions%rowtype;
  v_receipt private.engagement_contract_transition_receipts%rowtype;
  v_payload jsonb;
  v_base jsonb;
  v_response jsonb;
  v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_CONTRACT_AUTH_REQUIRED';
  end if;
  if not exists(
    select 1 from public.workspace_memberships wm
    where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  ) then
    raise insufficient_privilege using message='ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN';
  end if;
  if p_revision_id is null or p_operation_id is null
     or p_expected_version is null or p_expected_version<1 then
    raise invalid_parameter_value using message='ENJAZ_CONTRACT_TRANSITION_COMMAND_INVALID';
  end if;

  v_payload:=jsonb_build_object(
    'revisionId',p_revision_id,
    'expectedVersion',p_expected_version,
    'toStatus',p_to_status,
    'documentId',p_document_id,
    'documentVersionId',p_document_version_id,
    'effectiveOn',p_effective_on,
    'expiresOn',p_expires_on,
    'signatureProvenance',p_signature_provenance,
    'note',v_note
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text||':'||p_operation_id::text,0)
  );

  select * into v_receipt
  from private.engagement_contract_transition_receipts r
  where r.workspace_id=p_workspace_id and r.operation_id=p_operation_id;
  if found then
    if v_receipt.revision_id<>p_revision_id
       or v_receipt.actor_user_id<>v_actor
       or v_receipt.expected_version<>p_expected_version
       or v_receipt.request_payload<>v_payload then
      raise unique_violation using message='ENJAZ_CONTRACT_TRANSITION_IDEMPOTENCY_CONFLICT';
    end if;
    return v_receipt.response_payload || jsonb_build_object('wasDuplicate',true);
  end if;

  select * into v_row
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=p_revision_id
  for update;
  if not found then
    raise no_data_found using message='ENJAZ_CONTRACT_REVISION_NOT_FOUND';
  end if;
  if v_row.version<>p_expected_version then
    raise serialization_failure using message='ENJAZ_CONTRACT_TRANSITION_STALE';
  end if;

  v_base:=public.transition_engagement_contract_revision_v1(
    p_workspace_id,p_revision_id,p_to_status,p_document_id,p_document_version_id,
    p_effective_on,p_expires_on,p_signature_provenance,v_note
  );

  select * into v_row
  from public.engagement_contract_revisions r
  where r.workspace_id=p_workspace_id and r.id=p_revision_id;
  if not found or v_row.version<>p_expected_version+1 then
    raise serialization_failure using message='ENJAZ_CONTRACT_TRANSITION_VERSION_DRIFT';
  end if;

  v_response:=coalesce(v_base,'{}'::jsonb) || jsonb_build_object(
    'operationId',p_operation_id,
    'version',v_row.version,
    'wasDuplicate',false
  );

  insert into private.engagement_contract_transition_receipts(
    workspace_id,operation_id,revision_id,actor_user_id,expected_version,
    request_payload,response_payload
  ) values(
    p_workspace_id,p_operation_id,p_revision_id,v_actor,p_expected_version,
    v_payload,v_response
  );

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'engagement.contract.transition.receipted',
    'engagement_contract_revision',p_revision_id,
    'Recorded idempotent governed M16 transition command',
    jsonb_build_object(
      'operationId',p_operation_id,
      'expectedVersion',p_expected_version,
      'newVersion',v_row.version,
      'toStatus',p_to_status
    )
  );

  return v_response;
end;
$$;

create or replace function public.transition_engagement_contract_revision_v2(
  p_workspace_id uuid,
  p_revision_id uuid,
  p_operation_id uuid,
  p_expected_version integer,
  p_to_status text,
  p_document_id uuid default null,
  p_document_version_id uuid default null,
  p_effective_on date default null,
  p_expires_on date default null,
  p_signature_provenance jsonb default null,
  p_note text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.transition_engagement_contract_revision_v2_impl(
    p_workspace_id,p_revision_id,p_operation_id,p_expected_version,p_to_status,
    p_document_id,p_document_version_id,p_effective_on,p_expires_on,
    p_signature_provenance,p_note
  );
$$;

revoke all on function private.transition_engagement_contract_revision_v2_impl(
  uuid,uuid,uuid,integer,text,uuid,uuid,date,date,jsonb,text
) from public,anon;
grant execute on function private.transition_engagement_contract_revision_v2_impl(
  uuid,uuid,uuid,integer,text,uuid,uuid,date,date,jsonb,text
) to authenticated,service_role;

revoke all on function public.transition_engagement_contract_revision_v2(
  uuid,uuid,uuid,integer,text,uuid,uuid,date,date,jsonb,text
) from public,anon,service_role;
grant execute on function public.transition_engagement_contract_revision_v2(
  uuid,uuid,uuid,integer,text,uuid,uuid,date,date,jsonb,text
) to authenticated;

-- The unversioned transition remains as the internal canonical transition logic
-- but is no longer a browser/API entry point.
revoke all on function public.transition_engagement_contract_revision_v1(
  uuid,uuid,text,uuid,uuid,date,date,jsonb,text
) from public,anon,authenticated,service_role;

commit;
