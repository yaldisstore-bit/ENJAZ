-- ENJAZ Phase 11.3-C — governed client actions foundation
-- Portal-native messages, appointment responses and request read receipts are external interaction facts.
-- They never mutate transaction notes, staff calendars, workflow state, finance state or staff memberships.
-- Requested-document upload and document approval are wired to their canonical domain authorities in later C slices.

begin;

-- Strengthen request scope so child action facts can prove principal + transaction binding by FK.
alter table public.client_portal_requests
  add constraint client_portal_requests_action_scope_unique
  unique(workspace_id,principal_id,id,transaction_id);

create table public.client_portal_messages (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  transaction_id uuid not null,
  request_id uuid,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint client_portal_messages_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_messages_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_messages_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint client_portal_messages_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict
);

create table public.client_portal_appointment_responses (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  request_id uuid not null,
  transaction_id uuid not null,
  decision text not null check (decision in ('confirmed','declined')),
  comment text check (comment is null or char_length(btrim(comment)) between 1 and 1200),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  responded_at timestamptz not null default now(),
  constraint client_portal_appointment_responses_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_appointment_responses_request_unique unique(workspace_id,principal_id,request_id),
  constraint client_portal_appointment_responses_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_appointment_responses_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict
);

create table public.client_portal_request_read_receipts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  request_id uuid not null,
  transaction_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  first_read_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  constraint client_portal_request_read_receipts_workspace_id_id_key unique(workspace_id,id),
  constraint client_portal_request_read_receipts_request_unique unique(workspace_id,principal_id,request_id),
  constraint client_portal_request_read_receipts_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_request_read_receipts_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict,
  constraint client_portal_request_read_receipts_time_check check (last_read_at>=first_read_at)
);

create index client_portal_messages_principal_transaction_idx
  on public.client_portal_messages(workspace_id,principal_id,transaction_id,created_at,id);
create index client_portal_messages_request_idx
  on public.client_portal_messages(workspace_id,principal_id,request_id,created_at)
  where request_id is not null;
create index client_portal_appointment_responses_transaction_idx
  on public.client_portal_appointment_responses(workspace_id,principal_id,transaction_id,responded_at desc);
create index client_portal_request_read_receipts_transaction_idx
  on public.client_portal_request_read_receipts(workspace_id,principal_id,transaction_id,last_read_at desc);

alter table public.client_portal_messages enable row level security;
alter table public.client_portal_appointment_responses enable row level security;
alter table public.client_portal_request_read_receipts enable row level security;

revoke all on table public.client_portal_messages,public.client_portal_appointment_responses,public.client_portal_request_read_receipts
from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Exact client authority helpers.
-- -----------------------------------------------------------------------------

create or replace function private.require_client_portal_transaction_action_v1(
  p_workspace_id uuid,p_transaction_id uuid,p_permission text
)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_principal uuid;
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  if p_transaction_id is null or not exists(
    select 1 from public.transactions t
    where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null
  ) then
    raise no_data_found using message='ENJAZ_PORTAL_ACTION_TRANSACTION_NOT_FOUND';
  end if;
  if not private.client_portal_grant_allows_v1(p_workspace_id,'transaction',p_transaction_id,p_permission) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_ACTION_PERMISSION_REQUIRED';
  end if;
  return v_principal;
end;
$$;

create or replace function private.require_client_portal_visible_request_v1(
  p_workspace_id uuid,p_request_id uuid
)
returns public.client_portal_requests language plpgsql stable security definer set search_path='' as $$
declare
  v_principal uuid;
  v_request public.client_portal_requests%rowtype;
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  select * into v_request from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id and r.principal_id=v_principal
    and r.revoked_at is null and r.valid_from<=now()
    and (r.valid_until is null or r.valid_until>now());
  if not found then raise no_data_found using message='ENJAZ_PORTAL_ACTION_REQUEST_NOT_FOUND'; end if;
  if not private.client_portal_grant_allows_v1(
    p_workspace_id,'transaction',v_request.transaction_id,v_request.required_permission
  ) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_ACTION_REQUEST_PERMISSION_REQUIRED';
  end if;
  return v_request;
end;
$$;

create or replace function private.record_client_portal_action_audit_v1(
  p_workspace_id uuid,p_actor uuid,p_action text,p_entity_type text,p_entity_id uuid,
  p_principal_id uuid,p_transaction_id uuid,p_request_id uuid,p_details jsonb
)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,p_actor,p_action,p_entity_type,p_entity_id,'Client portal governed action',
    jsonb_build_object(
      'principalId',p_principal_id,'transactionId',p_transaction_id,'requestId',p_request_id
    ) || coalesce(p_details,'{}'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Client message. Exact transaction grant with `message` is mandatory.
-- Optional request linkage must resolve to this principal + transaction.
-- -----------------------------------------------------------------------------

create or replace function private.send_client_portal_message_v1_impl(
  p_workspace_id uuid,p_transaction_id uuid,p_request_id uuid,p_message_id uuid,p_body text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_principal uuid;
  v_request public.client_portal_requests%rowtype;
  v_existing public.client_portal_messages%rowtype;
  v_body text:=btrim(coalesce(p_body,''));
  v_created boolean:=false;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_message_id is null or char_length(v_body) not between 1 and 4000 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_MESSAGE_INVALID';
  end if;
  v_principal:=private.require_client_portal_transaction_action_v1(p_workspace_id,p_transaction_id,'message');

  if p_request_id is not null then
    v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id);
    if v_request.transaction_id<>p_transaction_id then
      raise invalid_parameter_value using message='ENJAZ_PORTAL_MESSAGE_REQUEST_TRANSACTION_MISMATCH';
    end if;
  end if;

  select * into v_existing from public.client_portal_messages m
  where m.workspace_id=p_workspace_id and m.id=p_message_id;
  if found then
    if v_existing.principal_id<>v_principal
       or v_existing.transaction_id<>p_transaction_id
       or v_existing.request_id is distinct from p_request_id
       or v_existing.body<>v_body then
      raise unique_violation using message='ENJAZ_PORTAL_MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'messageId',v_existing.id,'transactionId',v_existing.transaction_id,'requestId',v_existing.request_id,
      'body',v_existing.body,'createdAt',v_existing.created_at,'wasDuplicate',true
    );
  end if;

  insert into public.client_portal_messages(id,workspace_id,principal_id,transaction_id,request_id,body,actor_user_id)
  values(p_message_id,p_workspace_id,v_principal,p_transaction_id,p_request_id,v_body,v_actor)
  returning * into v_existing;
  v_created:=true;

  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.message.sent','client_portal_message',v_existing.id,
    v_principal,p_transaction_id,p_request_id,jsonb_build_object('bodyLength',char_length(v_body))
  );

  if p_request_id is not null and v_request.request_type='information' and v_request.status='open' then
    update public.client_portal_requests
      set status='fulfilled',version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_request_id and status='open'
    returning * into v_request;
    if found then
      perform private.record_client_portal_request_audit_v1(
        p_workspace_id,v_actor,v_request,'client_portal.request.fulfilled','client_message_response'
      );
    end if;
  end if;

  return jsonb_build_object(
    'messageId',v_existing.id,'transactionId',v_existing.transaction_id,'requestId',v_existing.request_id,
    'body',v_existing.body,'createdAt',v_existing.created_at,'wasDuplicate',not v_created
  );
end;
$$;

create or replace function public.send_client_portal_message_v1(
  p_workspace_id uuid,p_transaction_id uuid,p_request_id uuid,p_message_id uuid,p_body text
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.send_client_portal_message_v1_impl(p_workspace_id,p_transaction_id,p_request_id,p_message_id,p_body);
$$;

-- -----------------------------------------------------------------------------
-- Appointment response. This confirms/declines the portal request only; it does
-- not mutate a staff calendar or M10 scheduling truth.
-- -----------------------------------------------------------------------------

create or replace function private.respond_client_portal_appointment_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_response_id uuid,p_decision text,p_comment text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
  v_existing public.client_portal_appointment_responses%rowtype;
  v_comment text:=nullif(btrim(coalesce(p_comment,'')),'');
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_response_id is null or p_decision not in ('confirmed','declined') then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPOINTMENT_RESPONSE_INVALID';
  end if;
  if v_comment is not null and char_length(v_comment)>1200 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPOINTMENT_COMMENT_INVALID';
  end if;

  v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id);
  if v_request.request_type<>'appointment' or v_request.required_permission<>'confirm_appointment' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPOINTMENT_REQUEST_INVALID';
  end if;

  select * into v_existing from public.client_portal_appointment_responses a
  where a.workspace_id=p_workspace_id and a.id=p_response_id;
  if found then
    if v_existing.principal_id<>v_request.principal_id
       or v_existing.request_id<>p_request_id
       or v_existing.transaction_id<>v_request.transaction_id
       or v_existing.decision<>p_decision
       or v_existing.comment is distinct from v_comment then
      raise unique_violation using message='ENJAZ_PORTAL_APPOINTMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'responseId',v_existing.id,'requestId',v_existing.request_id,'transactionId',v_existing.transaction_id,
      'decision',v_existing.decision,'comment',v_existing.comment,'respondedAt',v_existing.responded_at,'wasDuplicate',true
    );
  end if;

  if exists(
    select 1 from public.client_portal_appointment_responses a
    where a.workspace_id=p_workspace_id and a.principal_id=v_request.principal_id and a.request_id=p_request_id
  ) then
    raise unique_violation using message='ENJAZ_PORTAL_APPOINTMENT_ALREADY_RESPONDED';
  end if;
  if v_request.status<>'open' then
    raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_APPOINTMENT_REQUEST_NOT_OPEN';
  end if;

  insert into public.client_portal_appointment_responses(
    id,workspace_id,principal_id,request_id,transaction_id,decision,comment,actor_user_id
  ) values(
    p_response_id,p_workspace_id,v_request.principal_id,p_request_id,v_request.transaction_id,p_decision,v_comment,v_actor
  ) returning * into v_existing;

  update public.client_portal_requests
    set status='fulfilled',version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=p_request_id and status='open'
  returning * into v_request;
  if not found then raise serialization_failure using message='ENJAZ_PORTAL_APPOINTMENT_REQUEST_CHANGED'; end if;

  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.appointment.responded','client_portal_appointment_response',v_existing.id,
    v_existing.principal_id,v_existing.transaction_id,v_existing.request_id,
    jsonb_build_object('decision',v_existing.decision,'comment',v_existing.comment)
  );
  perform private.record_client_portal_request_audit_v1(
    p_workspace_id,v_actor,v_request,'client_portal.request.fulfilled','appointment_response'
  );

  return jsonb_build_object(
    'responseId',v_existing.id,'requestId',v_existing.request_id,'transactionId',v_existing.transaction_id,
    'decision',v_existing.decision,'comment',v_existing.comment,'respondedAt',v_existing.responded_at,'wasDuplicate',false
  );
end;
$$;

create or replace function public.respond_client_portal_appointment_v1(
  p_workspace_id uuid,p_request_id uuid,p_response_id uuid,p_decision text,p_comment text default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.respond_client_portal_appointment_v1_impl(p_workspace_id,p_request_id,p_response_id,p_decision,p_comment);
$$;

-- -----------------------------------------------------------------------------
-- Critical request read receipt. Replaying the same receipt ID refreshes only
-- last_read_at and does not create duplicate audit evidence.
-- -----------------------------------------------------------------------------

create or replace function private.mark_client_portal_request_read_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_receipt_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
  v_receipt public.client_portal_request_read_receipts%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_receipt_id is null then raise invalid_parameter_value using message='ENJAZ_PORTAL_READ_RECEIPT_ID_REQUIRED'; end if;
  v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id);

  select * into v_receipt from public.client_portal_request_read_receipts r
  where r.workspace_id=p_workspace_id and r.principal_id=v_request.principal_id and r.request_id=p_request_id;
  if found then
    if v_receipt.id<>p_receipt_id then
      raise unique_violation using message='ENJAZ_PORTAL_READ_RECEIPT_IDEMPOTENCY_CONFLICT';
    end if;
    update public.client_portal_request_read_receipts
      set last_read_at=greatest(last_read_at,now())
    where workspace_id=p_workspace_id and id=p_receipt_id
    returning * into v_receipt;
    return jsonb_build_object(
      'receiptId',v_receipt.id,'requestId',v_receipt.request_id,'transactionId',v_receipt.transaction_id,
      'firstReadAt',v_receipt.first_read_at,'lastReadAt',v_receipt.last_read_at,'wasDuplicate',true
    );
  end if;

  if exists(select 1 from public.client_portal_request_read_receipts r where r.id=p_receipt_id) then
    raise unique_violation using message='ENJAZ_PORTAL_READ_RECEIPT_ID_CONFLICT';
  end if;

  insert into public.client_portal_request_read_receipts(
    id,workspace_id,principal_id,request_id,transaction_id,actor_user_id
  ) values(
    p_receipt_id,p_workspace_id,v_request.principal_id,p_request_id,v_request.transaction_id,v_actor
  ) returning * into v_receipt;

  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.request.read','client_portal_request_read_receipt',v_receipt.id,
    v_receipt.principal_id,v_receipt.transaction_id,v_receipt.request_id,
    jsonb_build_object('firstReadAt',v_receipt.first_read_at)
  );

  return jsonb_build_object(
    'receiptId',v_receipt.id,'requestId',v_receipt.request_id,'transactionId',v_receipt.transaction_id,
    'firstReadAt',v_receipt.first_read_at,'lastReadAt',v_receipt.last_read_at,'wasDuplicate',false
  );
end;
$$;

create or replace function public.mark_client_portal_request_read_v1(
  p_workspace_id uuid,p_request_id uuid,p_receipt_id uuid
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.mark_client_portal_request_read_v1_impl(p_workspace_id,p_request_id,p_receipt_id);
$$;

-- -----------------------------------------------------------------------------
-- Extend the safe read model with only the calling principal's own action facts.
-- -----------------------------------------------------------------------------

create or replace function private.get_client_portal_read_model_v3_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_principal uuid;
  v_base jsonb;
  v_messages jsonb;
  v_appointments jsonb;
  v_receipts jsonb;
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  v_base:=private.get_client_portal_read_model_v2_impl(p_workspace_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'transactionId',m.transaction_id,'requestId',m.request_id,'body',m.body,'createdAt',m.created_at
  ) order by m.created_at,m.id),'[]'::jsonb)
  into v_messages
  from public.client_portal_messages m
  where m.workspace_id=p_workspace_id and m.principal_id=v_principal
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',m.transaction_id,'message');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'requestId',a.request_id,'transactionId',a.transaction_id,
    'decision',a.decision,'comment',a.comment,'respondedAt',a.responded_at
  ) order by a.responded_at,a.id),'[]'::jsonb)
  into v_appointments
  from public.client_portal_appointment_responses a
  where a.workspace_id=p_workspace_id and a.principal_id=v_principal
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'confirm_appointment');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'requestId',r.request_id,'transactionId',r.transaction_id,
    'firstReadAt',r.first_read_at,'lastReadAt',r.last_read_at
  ) order by r.first_read_at,r.id),'[]'::jsonb)
  into v_receipts
  from public.client_portal_request_read_receipts r
  join public.client_portal_requests q
    on q.workspace_id=r.workspace_id and q.id=r.request_id and q.principal_id=r.principal_id and q.transaction_id=r.transaction_id
  where r.workspace_id=p_workspace_id and r.principal_id=v_principal
    and q.revoked_at is null and q.valid_from<=now() and (q.valid_until is null or q.valid_until>now())
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',r.transaction_id,q.required_permission);

  return jsonb_set(
    jsonb_set(
      jsonb_set(v_base,'{messages}',v_messages,true),
      '{appointmentResponses}',v_appointments,true
    ),
    '{readReceipts}',v_receipts,true
  );
end;
$$;

create or replace function public.get_client_portal_read_model_v1(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_client_portal_read_model_v3_impl(p_workspace_id);
$$;

-- -----------------------------------------------------------------------------
-- Function privileges. Internal authorization/audit helpers are never directly callable.
-- -----------------------------------------------------------------------------

revoke all on function private.require_client_portal_transaction_action_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.require_client_portal_visible_request_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function private.record_client_portal_action_audit_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.send_client_portal_message_v1_impl(uuid,uuid,uuid,uuid,text) from public,anon;
revoke all on function private.respond_client_portal_appointment_v1_impl(uuid,uuid,uuid,text,text) from public,anon;
revoke all on function private.mark_client_portal_request_read_v1_impl(uuid,uuid,uuid) from public,anon;
revoke all on function private.get_client_portal_read_model_v3_impl(uuid) from public,anon;

grant execute on function private.send_client_portal_message_v1_impl(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function private.respond_client_portal_appointment_v1_impl(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function private.mark_client_portal_request_read_v1_impl(uuid,uuid,uuid) to authenticated;
grant execute on function private.get_client_portal_read_model_v3_impl(uuid) to authenticated;

revoke all on function public.send_client_portal_message_v1(uuid,uuid,uuid,uuid,text) from public,anon;
revoke all on function public.respond_client_portal_appointment_v1(uuid,uuid,uuid,text,text) from public,anon;
revoke all on function public.mark_client_portal_request_read_v1(uuid,uuid,uuid) from public,anon;
revoke all on function public.get_client_portal_read_model_v1(uuid) from public,anon;

grant execute on function public.send_client_portal_message_v1(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.respond_client_portal_appointment_v1(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.mark_client_portal_request_read_v1(uuid,uuid,uuid) to authenticated;
grant execute on function public.get_client_portal_read_model_v1(uuid) to authenticated;

commit;
