-- ENJAZ Phase 11.4-C — communication conversion hardening.
-- ENJAZ has no independent canonical task table today. A communication "task"
-- conversion therefore becomes the existing canonical transaction follow-up work item;
-- document requests must go through the existing Client Portal owning command.

begin;

alter table public.communication_conversion_receipts
  drop constraint communication_conversion_receipts_conversion_type_check;
alter table public.communication_conversion_receipts
  add constraint communication_conversion_receipts_conversion_type_check
  check (conversion_type in ('followup','task','document_request'));

create or replace function public.convert_communication_to_task_v1(
  p_workspace_id uuid,
  p_communication_id uuid,
  p_idempotency_key text,
  p_task_id uuid,
  p_title text,
  p_due_at timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_communication public.communications%rowtype;
  v_receipt public.communication_conversion_receipts%rowtype;
  v_task jsonb;
begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 300 then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_INVALID';
  end if;
  select * into v_communication from public.communications c
  where c.workspace_id=p_workspace_id and c.id=p_communication_id
  for share;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_NOT_FOUND'; end if;
  if v_communication.transaction_id is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_TRANSACTION_LINK_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_workspace_id::text||'|'||p_communication_id::text||'|task|'||btrim(p_idempotency_key),0
  ));
  select * into v_receipt from public.communication_conversion_receipts r
  where r.workspace_id=p_workspace_id and r.communication_id=p_communication_id
    and r.conversion_type='task' and r.idempotency_key=btrim(p_idempotency_key);
  if found then
    if v_receipt.target_entity_id<>p_task_id then
      raise unique_violation using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('receiptId',v_receipt.id,'taskId',v_receipt.target_entity_id,'canonicalAuthority','transaction_followup','wasDuplicate',true);
  end if;

  v_task:=public.create_transaction_followup_v1(
    p_workspace_id,v_communication.transaction_id,p_task_id,p_title,p_due_at
  );

  insert into public.communication_conversion_receipts(
    workspace_id,communication_id,conversion_type,idempotency_key,target_entity_type,target_entity_id,actor_user_id
  ) values(
    p_workspace_id,p_communication_id,'task',btrim(p_idempotency_key),'transaction_followup',p_task_id,v_actor
  ) returning * into v_receipt;

  perform private.record_communication_audit_v1(
    p_workspace_id,v_actor,'communication.converted.task','communication',p_communication_id,
    'Communication converted to canonical follow-up work item',
    jsonb_build_object('receiptId',v_receipt.id,'taskId',p_task_id,'canonicalAuthority','transaction_followup','transactionId',v_communication.transaction_id)
  );

  return jsonb_build_object('receiptId',v_receipt.id,'taskId',p_task_id,'canonicalAuthority','transaction_followup','wasDuplicate',false);
end;
$$;

create or replace function public.convert_communication_to_document_request_v1(
  p_workspace_id uuid,
  p_communication_id uuid,
  p_idempotency_key text,
  p_principal_id uuid,
  p_request_id uuid,
  p_title text,
  p_instructions text default null,
  p_due_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_communication public.communications%rowtype;
  v_receipt public.communication_conversion_receipts%rowtype;
  v_request jsonb;
begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 300 then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_INVALID';
  end if;
  select * into v_communication from public.communications c
  where c.workspace_id=p_workspace_id and c.id=p_communication_id
  for share;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_NOT_FOUND'; end if;
  if v_communication.transaction_id is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_TRANSACTION_LINK_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_workspace_id::text||'|'||p_communication_id::text||'|document_request|'||btrim(p_idempotency_key),0
  ));
  select * into v_receipt from public.communication_conversion_receipts r
  where r.workspace_id=p_workspace_id and r.communication_id=p_communication_id
    and r.conversion_type='document_request' and r.idempotency_key=btrim(p_idempotency_key);
  if found then
    if v_receipt.target_entity_id<>p_request_id then
      raise unique_violation using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('receiptId',v_receipt.id,'requestId',v_receipt.target_entity_id,'wasDuplicate',true);
  end if;

  -- Existing M3 owning command performs principal/grant/transaction authorization.
  v_request:=public.save_client_portal_request_v1(
    p_workspace_id,p_principal_id,p_request_id,null,v_communication.transaction_id,
    'document',p_title,p_instructions,p_due_at,null,null,null
  );

  insert into public.communication_conversion_receipts(
    workspace_id,communication_id,conversion_type,idempotency_key,target_entity_type,target_entity_id,actor_user_id
  ) values(
    p_workspace_id,p_communication_id,'document_request',btrim(p_idempotency_key),'client_portal_request',p_request_id,v_actor
  ) returning * into v_receipt;

  perform private.record_communication_audit_v1(
    p_workspace_id,v_actor,'communication.converted.document_request','communication',p_communication_id,
    'Communication converted to Client Portal document request',
    jsonb_build_object('receiptId',v_receipt.id,'requestId',p_request_id,'principalId',p_principal_id,'transactionId',v_communication.transaction_id)
  );

  return jsonb_build_object('receiptId',v_receipt.id,'requestId',p_request_id,'wasDuplicate',false);
end;
$$;

revoke all on function public.convert_communication_to_task_v1(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function public.convert_communication_to_task_v1(uuid,uuid,text,uuid,text,timestamptz) to authenticated;

revoke all on function public.convert_communication_to_document_request_v1(uuid,uuid,text,uuid,uuid,text,text,timestamptz) from public,anon,service_role;
grant execute on function public.convert_communication_to_document_request_v1(uuid,uuid,text,uuid,uuid,text,text,timestamptz) to authenticated;

commit;
