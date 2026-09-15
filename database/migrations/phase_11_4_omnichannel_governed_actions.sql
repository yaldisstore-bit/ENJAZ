-- ENJAZ Phase 11.4-C — Omnichannel Communications Hub M4
-- Governed provider ingress/egress commands, template/approval authority,
-- canonical Document Vault attachment links, audited relinking/conversions.
-- `communications` remains the single business-message truth.

begin;

create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp','sms')),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  subject_template text check (subject_template is null or char_length(subject_template) between 1 and 998),
  body_template text not null check (char_length(body_template) between 1 and 200000),
  sensitivity text not null default 'standard' check (sensitivity in ('standard','sensitive')),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_templates_workspace_id_id_key unique(workspace_id,id),
  constraint communication_templates_name_key unique(workspace_id,channel,name)
);

create table public.communication_outbound_commands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  communication_id uuid not null,
  provider_account_id uuid not null,
  endpoint_fingerprint text not null check (endpoint_fingerprint ~ '^[a-f0-9]{64}$'),
  fingerprint_scheme text not null default 'hmac-sha256-v1' check (fingerprint_scheme='hmac-sha256-v1'),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 300),
  template_id uuid,
  template_version integer,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  approval_status text not null check (approval_status in ('not_required','pending','approved','rejected')),
  status text not null check (status in ('awaiting_approval','queued','dispatching','dispatched','rejected','failed','reconciliation_required')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(btrim(decision_reason)) between 1 and 800),
  dispatch_claimed_at timestamptz,
  dispatch_token uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_outbound_commands_workspace_id_id_key unique(workspace_id,id),
  constraint communication_outbound_commands_communication_fk foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint communication_outbound_commands_provider_fk foreign key(workspace_id,provider_account_id)
    references public.communication_provider_accounts(workspace_id,id) on delete restrict,
  constraint communication_outbound_commands_template_fk foreign key(workspace_id,template_id)
    references public.communication_templates(workspace_id,id) on delete restrict,
  constraint communication_outbound_commands_idempotency_key unique(workspace_id,provider_account_id,idempotency_key),
  constraint communication_outbound_commands_one_per_communication unique(workspace_id,communication_id),
  constraint communication_outbound_commands_template_version_check check (
    (template_id is null and template_version is null)
    or (template_id is not null and template_version is not null and template_version > 0)
  ),
  constraint communication_outbound_commands_approval_state_check check (
    (approval_status='pending' and status='awaiting_approval' and decided_by is null and decided_at is null)
    or (approval_status='rejected' and status='rejected' and decided_by is not null and decided_at is not null)
    or (approval_status in ('not_required','approved') and status in ('queued','dispatching','dispatched','failed','reconciliation_required'))
  ),
  constraint communication_outbound_commands_dispatch_claim_check check (
    (status='dispatching' and dispatch_claimed_at is not null and dispatch_token is not null)
    or (status<>'dispatching')
  )
);

create table public.communication_document_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  communication_id uuid not null,
  document_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint communication_document_links_workspace_id_id_key unique(workspace_id,id),
  constraint communication_document_links_communication_fk foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint communication_document_links_document_fk foreign key(workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint communication_document_links_unique unique(workspace_id,communication_id,document_id)
);

create table public.communication_conversion_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  communication_id uuid not null,
  conversion_type text not null check (conversion_type in ('followup','document_request')),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 300),
  target_entity_type text not null check (target_entity_type in ('transaction_followup','client_portal_request')),
  target_entity_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint communication_conversion_receipts_workspace_id_id_key unique(workspace_id,id),
  constraint communication_conversion_receipts_communication_fk foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint communication_conversion_receipts_idempotency_key
    unique(workspace_id,communication_id,conversion_type,idempotency_key)
);

create index communication_templates_active_idx on public.communication_templates(workspace_id,channel,active,name);
create index communication_outbound_commands_status_idx on public.communication_outbound_commands(workspace_id,status,updated_at desc);
create index communication_outbound_commands_communication_idx on public.communication_outbound_commands(workspace_id,communication_id);
create index communication_document_links_communication_idx on public.communication_document_links(workspace_id,communication_id,created_at);
create index communication_document_links_document_idx on public.communication_document_links(workspace_id,document_id);
create index communication_conversion_receipts_source_idx on public.communication_conversion_receipts(workspace_id,communication_id,created_at desc);

create trigger communication_templates_set_updated_at before update on public.communication_templates for each row execute function private.set_updated_at();
create trigger communication_outbound_commands_set_updated_at before update on public.communication_outbound_commands for each row execute function private.set_updated_at();

create or replace function private.guard_communication_prepared_content_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists (select 1 from public.communication_outbound_commands oc where oc.workspace_id=old.workspace_id and oc.communication_id=old.id limit 1)
     and (new.channel is distinct from old.channel or new.direction is distinct from old.direction or new.summary is distinct from old.summary
       or new.subject is distinct from old.subject or new.body_text is distinct from old.body_text or new.occurred_at is distinct from old.occurred_at
       or new.metadata is distinct from old.metadata) then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RENDERED_CONTENT_IMMUTABLE';
  end if;
  return new;
end; $$;

create trigger communications_prepared_content_guard before update of channel,direction,summary,subject,body_text,occurred_at,metadata on public.communications for each row execute function private.guard_communication_prepared_content_v1();

create or replace function private.require_communication_owner_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_COMMUNICATION_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor and wm.role='owner') then
    raise insufficient_privilege using message='ENJAZ_COMMUNICATION_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end; $$;

create or replace function private.communication_content_sha256_v1(p_channel text,p_direction text,p_subject text,p_body_text text,p_summary text)
returns text language sql immutable security invoker set search_path='' as $$
  select encode(extensions.digest(convert_to(coalesce(p_channel,'')||chr(31)||coalesce(p_direction,'')||chr(31)||coalesce(p_subject,'')||chr(31)||coalesce(p_body_text,'')||chr(31)||coalesce(p_summary,''),'utf8'),'sha256'),'hex');
$$;

create or replace function private.record_communication_audit_v1(p_workspace_id uuid,p_actor uuid,p_action text,p_entity_type text,p_entity_id uuid,p_summary text,p_details jsonb)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,p_actor,p_action,p_entity_type,p_entity_id,p_summary,coalesce(p_details,'{}'::jsonb));
end; $$;

create or replace function public.save_communication_template_v1(p_workspace_id uuid,p_template_id uuid,p_expected_version integer,p_channel text,p_name text,p_subject_template text,p_body_template text,p_sensitivity text default 'standard',p_active boolean default true)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v public.communication_templates%rowtype; v_created boolean:=false; begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if p_template_id is null then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_ID_REQUIRED'; end if;
  if p_channel not in ('email','whatsapp','sms') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_CHANNEL_INVALID'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 160 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_NAME_INVALID'; end if;
  if p_subject_template is not null and char_length(p_subject_template) not between 1 and 998 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_SUBJECT_INVALID'; end if;
  if char_length(coalesce(p_body_template,'')) not between 1 and 200000 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_BODY_INVALID'; end if;
  if p_sensitivity not in ('standard','sensitive') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_SENSITIVITY_INVALID'; end if;
  select * into v from public.communication_templates t where t.workspace_id=p_workspace_id and t.id=p_template_id for update;
  if found then
    if p_expected_version is null or p_expected_version<>v.version then raise serialization_failure using message='ENJAZ_COMMUNICATION_TEMPLATE_STALE'; end if;
    update public.communication_templates set channel=p_channel,name=btrim(p_name),subject_template=p_subject_template,body_template=p_body_template,sensitivity=p_sensitivity,active=p_active,version=version+1,updated_by=v_actor where workspace_id=p_workspace_id and id=p_template_id returning * into v;
  else
    if p_expected_version is not null then raise serialization_failure using message='ENJAZ_COMMUNICATION_TEMPLATE_CREATE_VERSION_INVALID'; end if;
    insert into public.communication_templates(id,workspace_id,channel,name,subject_template,body_template,sensitivity,active,created_by,updated_by) values(p_template_id,p_workspace_id,p_channel,btrim(p_name),p_subject_template,p_body_template,p_sensitivity,p_active,v_actor,v_actor) returning * into v; v_created:=true;
  end if;
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,case when v_created then 'communication.template.created' else 'communication.template.updated' end,'communication_template',v.id,'Communication template changed',jsonb_build_object('channel',v.channel,'sensitivity',v.sensitivity,'active',v.active,'version',v.version));
  return jsonb_build_object('templateId',v.id,'channel',v.channel,'name',v.name,'sensitivity',v.sensitivity,'active',v.active,'version',v.version,'wasCreated',v_created);
end; $$;

create or replace function public.prepare_communication_outbound_v1(p_workspace_id uuid,p_provider_account_id uuid,p_idempotency_key text,p_endpoint_fingerprint text,p_contact_id uuid,p_transaction_id uuid,p_conversation_id uuid,p_template_id uuid,p_template_version integer,p_subject text,p_body_text text,p_summary text,p_document_ids uuid[] default '{}'::uuid[])
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid; v_provider public.communication_provider_accounts%rowtype; v_template public.communication_templates%rowtype; v_conversation public.communication_conversations%rowtype; v_command public.communication_outbound_commands%rowtype; v_communication public.communications%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_company_id uuid; v_content_sha text; v_approval text:='not_required'; v_status text:='queued'; v_doc uuid;
begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 300 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_IDEMPOTENCY_INVALID'; end if;
  if coalesce(p_endpoint_fingerprint,'') !~ '^[a-f0-9]{64}$' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ENDPOINT_FINGERPRINT_INVALID'; end if;
  if p_contact_id is null then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONTACT_REQUIRED'; end if;
  if char_length(coalesce(p_body_text,'')) not between 1 and 200000 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_BODY_INVALID'; end if;
  if char_length(btrim(coalesce(p_summary,''))) not between 1 and 1200 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_SUMMARY_INVALID'; end if;
  if p_subject is not null and char_length(btrim(p_subject)) not between 1 and 998 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_SUBJECT_INVALID'; end if;
  select * into v_provider from public.communication_provider_accounts pa where pa.workspace_id=p_workspace_id and pa.id=p_provider_account_id for share;
  if not found or not v_provider.enabled or not ('send'=any(v_provider.capabilities)) then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_PROVIDER_SEND_UNAVAILABLE'; end if;
  if not exists(select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id and c.deleted_at is null and c.status='active') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONTACT_INVALID'; end if;
  if p_transaction_id is not null then select t.company_id into v_company_id from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null; if not found then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TRANSACTION_INVALID'; end if; end if;
  if not exists(select 1 from public.communication_channel_consents cc where cc.workspace_id=p_workspace_id and cc.channel=v_provider.channel and cc.endpoint_fingerprint=p_endpoint_fingerprint and (cc.contact_id is null or cc.contact_id=p_contact_id) and cc.status in ('granted','not_required') and cc.effective_at<=now() and (cc.expires_at is null or cc.expires_at>now())) then raise insufficient_privilege using message='ENJAZ_COMMUNICATION_CONSENT_REQUIRED'; end if;
  if p_template_id is not null then
    select * into v_template from public.communication_templates t where t.workspace_id=p_workspace_id and t.id=p_template_id for share;
    if not found or not v_template.active or v_template.channel<>v_provider.channel then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_INVALID'; end if;
    if p_template_version is null or p_template_version<>v_template.version then raise serialization_failure using message='ENJAZ_COMMUNICATION_TEMPLATE_VERSION_STALE'; end if;
    if v_template.sensitivity='sensitive' then v_approval:='pending'; v_status:='awaiting_approval'; end if;
  elsif p_template_version is not null then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_VERSION_WITHOUT_TEMPLATE'; end if;
  v_content_sha:=private.communication_content_sha256_v1(v_provider.channel,'outgoing',p_subject,p_body_text,p_summary);
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'|'||p_provider_account_id::text||'|'||btrim(p_idempotency_key),0));
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.provider_account_id=p_provider_account_id and oc.idempotency_key=btrim(p_idempotency_key) for update;
  if found then
    select * into v_communication from public.communications c where c.workspace_id=p_workspace_id and c.id=v_command.communication_id;
    if v_command.endpoint_fingerprint<>p_endpoint_fingerprint or v_command.content_sha256<>v_content_sha or v_communication.contact_id is distinct from p_contact_id or v_communication.transaction_id is distinct from p_transaction_id or v_command.template_id is distinct from p_template_id or v_command.template_version is distinct from p_template_version then raise unique_violation using message='ENJAZ_COMMUNICATION_IDEMPOTENCY_CONFLICT'; end if;
    select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.provider_account_id=p_provider_account_id and a.idempotency_key=btrim(p_idempotency_key);
    return jsonb_build_object('commandId',v_command.id,'communicationId',v_command.communication_id,'attemptId',v_attempt.id,'channel',v_provider.channel,'approvalStatus',v_command.approval_status,'status',v_command.status,'version',v_command.version,'wasDuplicate',true);
  end if;
  if p_conversation_id is not null then
    select * into v_conversation from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.id=p_conversation_id for share;
    if not found or v_conversation.status<>'open' or (v_conversation.contact_id is not null and v_conversation.contact_id<>p_contact_id) or (p_transaction_id is not null and v_conversation.transaction_id is not null and v_conversation.transaction_id<>p_transaction_id) then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONVERSATION_SCOPE_INVALID'; end if;
  else
    select * into v_conversation from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.status='open' and cv.contact_id is not distinct from p_contact_id and cv.transaction_id is not distinct from p_transaction_id and cv.company_id is not distinct from v_company_id order by cv.updated_at desc limit 1;
    if not found then insert into public.communication_conversations(workspace_id,company_id,contact_id,transaction_id,subject,status,created_by) values(p_workspace_id,v_company_id,p_contact_id,p_transaction_id,p_subject,'open',v_actor) returning * into v_conversation; end if;
  end if;
  insert into public.communications(workspace_id,company_id,contact_id,transaction_id,channel,direction,summary,subject,body_text,occurred_at,metadata,conversation_id,link_status) values(p_workspace_id,v_company_id,p_contact_id,p_transaction_id,v_provider.channel,'outgoing',btrim(p_summary),p_subject,p_body_text,now(),jsonb_build_object('source','governed_outbound'),v_conversation.id,'linked') returning * into v_communication;
  insert into public.communication_outbound_commands(workspace_id,communication_id,provider_account_id,endpoint_fingerprint,idempotency_key,template_id,template_version,content_sha256,approval_status,status,requested_by) values(p_workspace_id,v_communication.id,p_provider_account_id,p_endpoint_fingerprint,btrim(p_idempotency_key),p_template_id,p_template_version,v_content_sha,v_approval,v_status,v_actor) returning * into v_command;
  foreach v_doc in array coalesce(p_document_ids,'{}'::uuid[]) loop
    if not exists(select 1 from public.documents d where d.workspace_id=p_workspace_id and d.id=v_doc and d.status='ready' and d.archived_at is null and (p_transaction_id is null or d.transaction_id is null or d.transaction_id=p_transaction_id) and (v_company_id is null or d.company_id is null or d.company_id=v_company_id)) then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_DOCUMENT_NOT_READY_OR_SCOPE_INVALID'; end if;
    insert into public.communication_document_links(workspace_id,communication_id,document_id,created_by) values(p_workspace_id,v_communication.id,v_doc,v_actor);
  end loop;
  if v_status='queued' then insert into public.communication_transport_attempts(workspace_id,communication_id,provider_account_id,direction,idempotency_key,status,attempt_no,requested_at) values(p_workspace_id,v_communication.id,p_provider_account_id,'outgoing',btrim(p_idempotency_key),'queued',1,now()) returning * into v_attempt; end if;
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,'communication.outbound.prepared','communication',v_communication.id,'Outbound communication prepared',jsonb_build_object('commandId',v_command.id,'providerAccountId',p_provider_account_id,'channel',v_provider.channel,'approvalStatus',v_command.approval_status,'status',v_command.status,'attachmentCount',coalesce(cardinality(p_document_ids),0)));
  return jsonb_build_object('commandId',v_command.id,'communicationId',v_communication.id,'attemptId',v_attempt.id,'channel',v_provider.channel,'approvalStatus',v_command.approval_status,'status',v_command.status,'version',v_command.version,'wasDuplicate',false);
end; $$;

create or replace function public.decide_communication_outbound_v1(p_workspace_id uuid,p_command_id uuid,p_expected_version integer,p_decision text,p_reason text default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_command public.communication_outbound_commands%rowtype; v_communication public.communications%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_sha text; begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if p_decision not in ('approve','reject') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_APPROVAL_DECISION_INVALID'; end if;
  if p_reason is not null and char_length(btrim(p_reason)) not between 1 and 800 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_APPROVAL_REASON_INVALID'; end if;
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.id=p_command_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_OUTBOUND_COMMAND_NOT_FOUND'; end if;
  if v_command.approval_status<>'pending' or v_command.status<>'awaiting_approval' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_APPROVAL_NOT_PENDING'; end if;
  if p_expected_version is null or p_expected_version<>v_command.version then raise serialization_failure using message='ENJAZ_COMMUNICATION_APPROVAL_STALE'; end if;
  select * into v_communication from public.communications c where c.workspace_id=p_workspace_id and c.id=v_command.communication_id for share;
  v_sha:=private.communication_content_sha256_v1(v_communication.channel,v_communication.direction,v_communication.subject,v_communication.body_text,v_communication.summary);
  if v_sha<>v_command.content_sha256 then raise data_exception using message='ENJAZ_COMMUNICATION_APPROVAL_CONTENT_DRIFT'; end if;
  if p_decision='reject' then update public.communication_outbound_commands set approval_status='rejected',status='rejected',decided_by=v_actor,decided_at=now(),decision_reason=nullif(btrim(coalesce(p_reason,'')),''),version=version+1 where workspace_id=p_workspace_id and id=p_command_id returning * into v_command;
  else insert into public.communication_transport_attempts(workspace_id,communication_id,provider_account_id,direction,idempotency_key,status,attempt_no,requested_at) values(p_workspace_id,v_command.communication_id,v_command.provider_account_id,'outgoing',v_command.idempotency_key,'queued',1,now()) returning * into v_attempt; update public.communication_outbound_commands set approval_status='approved',status='queued',decided_by=v_actor,decided_at=now(),decision_reason=nullif(btrim(coalesce(p_reason,'')),''),version=version+1 where workspace_id=p_workspace_id and id=p_command_id returning * into v_command; end if;
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,case when p_decision='approve' then 'communication.outbound.approved' else 'communication.outbound.rejected' end,'communication',v_command.communication_id,'Outbound communication approval decided',jsonb_build_object('commandId',v_command.id,'decision',p_decision,'version',v_command.version));
  return jsonb_build_object('commandId',v_command.id,'communicationId',v_command.communication_id,'attemptId',v_attempt.id,'approvalStatus',v_command.approval_status,'status',v_command.status,'version',v_command.version);
end; $$;

create or replace function public.claim_communication_outbound_dispatch_v1(p_workspace_id uuid,p_command_id uuid)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_command public.communication_outbound_commands%rowtype; v_communication public.communications%rowtype; v_provider public.communication_provider_accounts%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_token uuid:=gen_random_uuid(); begin
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.id=p_command_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_OUTBOUND_COMMAND_NOT_FOUND'; end if;
  if v_command.status='dispatching' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_DISPATCH_ALREADY_CLAIMED'; end if;
  if v_command.status<>'queued' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_DISPATCH_NOT_READY'; end if;
  select * into v_communication from public.communications c where c.workspace_id=p_workspace_id and c.id=v_command.communication_id;
  select * into v_provider from public.communication_provider_accounts pa where pa.workspace_id=p_workspace_id and pa.id=v_command.provider_account_id;
  if not found or not v_provider.enabled or not ('send'=any(v_provider.capabilities)) then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_PROVIDER_SEND_UNAVAILABLE'; end if;
  if private.communication_content_sha256_v1(v_communication.channel,v_communication.direction,v_communication.subject,v_communication.body_text,v_communication.summary)<>v_command.content_sha256 then raise data_exception using message='ENJAZ_COMMUNICATION_DISPATCH_CONTENT_DRIFT'; end if;
  select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.provider_account_id=v_command.provider_account_id and a.idempotency_key=v_command.idempotency_key and a.communication_id=v_command.communication_id;
  if not found or v_attempt.status<>'queued' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_TRANSPORT_ATTEMPT_NOT_QUEUED'; end if;
  update public.communication_outbound_commands set status='dispatching',dispatch_claimed_at=now(),dispatch_token=v_token,version=version+1 where workspace_id=p_workspace_id and id=p_command_id returning * into v_command;
  return jsonb_build_object('commandId',v_command.id,'communicationId',v_command.communication_id,'attemptId',v_attempt.id,'providerAccountId',v_provider.id,'provider',v_provider.provider,'externalAccountRef',v_provider.external_account_ref,'channel',v_provider.channel,'contactId',v_communication.contact_id,'transactionId',v_communication.transaction_id,'subject',v_communication.subject,'bodyText',v_communication.body_text,'summary',v_communication.summary,'dispatchToken',v_token,'idempotencyKey',v_command.idempotency_key);
end; $$;

create or replace function public.complete_communication_outbound_dispatch_v1(p_workspace_id uuid,p_command_id uuid,p_dispatch_token uuid,p_provider_message_id text,p_provider_event_id text,p_provider_status text default 'accepted',p_occurred_at timestamptz default now())
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_command public.communication_outbound_commands%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_event_id uuid; begin
  if p_provider_status not in ('accepted','sent') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_DISPATCH_STATUS_INVALID'; end if;
  if char_length(btrim(coalesce(p_provider_message_id,''))) not between 1 and 500 or char_length(btrim(coalesce(p_provider_event_id,''))) not between 1 and 500 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_ID_INVALID'; end if;
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.id=p_command_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_OUTBOUND_COMMAND_NOT_FOUND'; end if;
  if v_command.status='dispatched' then select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.communication_id=v_command.communication_id and a.provider_account_id=v_command.provider_account_id and a.idempotency_key=v_command.idempotency_key; if v_attempt.provider_message_id=btrim(p_provider_message_id) then return jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'status',v_command.status,'wasDuplicate',true); end if; raise unique_violation using message='ENJAZ_COMMUNICATION_DISPATCH_COMPLETION_CONFLICT'; end if;
  if v_command.status<>'dispatching' or v_command.dispatch_token is distinct from p_dispatch_token then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_DISPATCH_TOKEN_INVALID'; end if;
  select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.communication_id=v_command.communication_id and a.provider_account_id=v_command.provider_account_id and a.idempotency_key=v_command.idempotency_key for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_TRANSPORT_ATTEMPT_NOT_FOUND'; end if;
  update public.communication_transport_attempts set provider_message_id=btrim(p_provider_message_id),status=p_provider_status,last_event_at=greatest(coalesce(last_event_at,p_occurred_at),p_occurred_at),error_code=null where workspace_id=p_workspace_id and id=v_attempt.id returning * into v_attempt;
  insert into public.communication_transport_events(workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,occurred_at) values(p_workspace_id,v_attempt.id,v_command.provider_account_id,btrim(p_provider_event_id),p_provider_status,p_occurred_at) on conflict (workspace_id,provider_account_id,provider_event_id) do nothing returning id into v_event_id;
  update public.communication_outbound_commands set status='dispatched',dispatch_claimed_at=null,dispatch_token=null,version=version+1 where workspace_id=p_workspace_id and id=p_command_id returning * into v_command;
  perform private.record_communication_audit_v1(p_workspace_id,null,'communication.outbound.dispatched','communication',v_command.communication_id,'Provider accepted outbound communication',jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'providerAccountId',v_command.provider_account_id,'status',p_provider_status));
  return jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'status',v_command.status,'transportStatus',v_attempt.status,'wasDuplicate',false);
end; $$;

create or replace function public.fail_communication_outbound_dispatch_v1(p_workspace_id uuid,p_command_id uuid,p_dispatch_token uuid,p_failure_code text,p_outcome_ambiguous boolean default false)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_command public.communication_outbound_commands%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_status text; begin
  if char_length(btrim(coalesce(p_failure_code,''))) not between 1 and 120 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_FAILURE_CODE_INVALID'; end if;
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.id=p_command_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_OUTBOUND_COMMAND_NOT_FOUND'; end if;
  if v_command.status<>'dispatching' or v_command.dispatch_token is distinct from p_dispatch_token then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_DISPATCH_TOKEN_INVALID'; end if;
  select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.communication_id=v_command.communication_id and a.provider_account_id=v_command.provider_account_id and a.idempotency_key=v_command.idempotency_key for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_TRANSPORT_ATTEMPT_NOT_FOUND'; end if;
  v_status:=case when p_outcome_ambiguous then 'reconciliation_required' else 'failed' end;
  update public.communication_transport_attempts set status='failed',error_code=btrim(p_failure_code),last_event_at=now() where workspace_id=p_workspace_id and id=v_attempt.id returning * into v_attempt;
  update public.communication_outbound_commands set status=v_status,dispatch_claimed_at=null,dispatch_token=null,version=version+1 where workspace_id=p_workspace_id and id=p_command_id returning * into v_command;
  perform private.record_communication_audit_v1(p_workspace_id,null,case when p_outcome_ambiguous then 'communication.outbound.reconciliation_required' else 'communication.outbound.failed' end,'communication',v_command.communication_id,'Outbound provider dispatch did not complete',jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'providerAccountId',v_command.provider_account_id,'failureCode',btrim(p_failure_code),'ambiguous',p_outcome_ambiguous));
  return jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'status',v_command.status,'transportStatus',v_attempt.status);
end; $$;

create or replace function public.ingest_communication_provider_message_v1(p_workspace_id uuid,p_provider_account_id uuid,p_provider_message_id text,p_provider_event_id text,p_endpoint_fingerprint text,p_subject text,p_body_text text,p_summary text,p_occurred_at timestamptz)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_provider public.communication_provider_accounts%rowtype; v_attempt public.communication_transport_attempts%rowtype; v_communication public.communications%rowtype; v_conversation public.communication_conversations%rowtype; v_company_id uuid; v_contact_id uuid; v_transaction_id uuid; v_candidate_count integer:=0; v_link_status text; v_event_id uuid; begin
  if char_length(btrim(coalesce(p_provider_message_id,''))) not between 1 and 500 or char_length(btrim(coalesce(p_provider_event_id,''))) not between 1 and 500 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_ID_INVALID'; end if;
  if coalesce(p_endpoint_fingerprint,'') !~ '^[a-f0-9]{64}$' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ENDPOINT_FINGERPRINT_INVALID'; end if;
  if char_length(coalesce(p_body_text,'')) not between 1 and 200000 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_BODY_INVALID'; end if;
  if char_length(btrim(coalesce(p_summary,''))) not between 1 and 1200 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_SUMMARY_INVALID'; end if;
  if p_subject is not null and char_length(btrim(p_subject)) not between 1 and 998 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_SUBJECT_INVALID'; end if;
  if p_occurred_at is null or p_occurred_at>now()+interval '10 minutes' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_OCCURRED_AT_INVALID'; end if;
  select * into v_provider from public.communication_provider_accounts pa where pa.workspace_id=p_workspace_id and pa.id=p_provider_account_id for share;
  if not found or not v_provider.enabled or not ('receive'=any(v_provider.capabilities)) then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_PROVIDER_RECEIVE_UNAVAILABLE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'|'||p_provider_account_id::text||'|'||btrim(p_provider_message_id),0));
  select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.provider_account_id=p_provider_account_id and a.provider_message_id=btrim(p_provider_message_id) for update;
  if found then insert into public.communication_transport_events(workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,occurred_at) values(p_workspace_id,v_attempt.id,p_provider_account_id,btrim(p_provider_event_id),'received',p_occurred_at) on conflict (workspace_id,provider_account_id,provider_event_id) do nothing; return jsonb_build_object('communicationId',v_attempt.communication_id,'attemptId',v_attempt.id,'status','duplicate','wasDuplicate',true); end if;
  select count(*) into v_candidate_count from (select distinct eb.company_id,eb.contact_id,eb.transaction_id from public.communication_endpoint_bindings eb where eb.workspace_id=p_workspace_id and eb.provider_account_id=p_provider_account_id and eb.endpoint_fingerprint=p_endpoint_fingerprint and eb.active) q;
  if v_candidate_count=1 then select eb.company_id,eb.contact_id,eb.transaction_id into v_company_id,v_contact_id,v_transaction_id from public.communication_endpoint_bindings eb where eb.workspace_id=p_workspace_id and eb.provider_account_id=p_provider_account_id and eb.endpoint_fingerprint=p_endpoint_fingerprint and eb.active order by eb.updated_at desc limit 1; v_link_status:='linked'; elsif v_candidate_count>1 then v_link_status:='review_required'; else v_link_status:='unmatched'; end if;
  if v_link_status='linked' then select * into v_conversation from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.status='open' and cv.company_id is not distinct from v_company_id and cv.contact_id is not distinct from v_contact_id and cv.transaction_id is not distinct from v_transaction_id order by cv.updated_at desc limit 1; if not found then insert into public.communication_conversations(workspace_id,company_id,contact_id,transaction_id,subject,status,created_by) values(p_workspace_id,v_company_id,v_contact_id,v_transaction_id,p_subject,'open',null) returning * into v_conversation; end if; else insert into public.communication_conversations(workspace_id,subject,status,created_by) values(p_workspace_id,p_subject,'open',null) returning * into v_conversation; end if;
  insert into public.communications(workspace_id,company_id,contact_id,transaction_id,channel,direction,summary,subject,body_text,occurred_at,metadata,conversation_id,link_status) values(p_workspace_id,v_company_id,v_contact_id,v_transaction_id,v_provider.channel,'incoming',btrim(p_summary),p_subject,p_body_text,p_occurred_at,jsonb_build_object('source','provider_ingress'),v_conversation.id,v_link_status) returning * into v_communication;
  insert into public.communication_transport_attempts(workspace_id,communication_id,provider_account_id,direction,provider_message_id,status,attempt_no,requested_at,last_event_at) values(p_workspace_id,v_communication.id,p_provider_account_id,'incoming',btrim(p_provider_message_id),'received',1,p_occurred_at,p_occurred_at) returning * into v_attempt;
  insert into public.communication_transport_events(workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,occurred_at) values(p_workspace_id,v_attempt.id,p_provider_account_id,btrim(p_provider_event_id),'received',p_occurred_at) returning id into v_event_id;
  perform private.record_communication_audit_v1(p_workspace_id,null,'communication.provider.received','communication',v_communication.id,'Inbound provider communication received',jsonb_build_object('providerAccountId',p_provider_account_id,'attemptId',v_attempt.id,'linkStatus',v_link_status,'candidateCount',v_candidate_count));
  return jsonb_build_object('communicationId',v_communication.id,'attemptId',v_attempt.id,'conversationId',v_conversation.id,'linkStatus',v_link_status,'candidateCount',v_candidate_count,'wasDuplicate',false);
end; $$;

create or replace function public.record_communication_provider_event_v1(p_workspace_id uuid,p_provider_account_id uuid,p_provider_message_id text,p_provider_event_id text,p_event_type text,p_error_code text,p_occurred_at timestamptz)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_attempt public.communication_transport_attempts%rowtype; v_event_id uuid; v_next_status text; v_current_rank integer; v_event_rank integer; begin
  if p_event_type not in ('received','accepted','sent','delivered','read','failed','cancelled') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_EVENT_TYPE_INVALID'; end if;
  if char_length(btrim(coalesce(p_provider_message_id,''))) not between 1 and 500 or char_length(btrim(coalesce(p_provider_event_id,''))) not between 1 and 500 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_ID_INVALID'; end if;
  if p_error_code is not null and char_length(btrim(p_error_code)) not between 1 and 120 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_PROVIDER_ERROR_CODE_INVALID'; end if;
  if p_occurred_at is null or p_occurred_at>now()+interval '10 minutes' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_OCCURRED_AT_INVALID'; end if;
  select * into v_attempt from public.communication_transport_attempts a where a.workspace_id=p_workspace_id and a.provider_account_id=p_provider_account_id and a.provider_message_id=btrim(p_provider_message_id) for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_TRANSPORT_ATTEMPT_NOT_FOUND'; end if;
  insert into public.communication_transport_events(workspace_id,attempt_id,provider_account_id,provider_event_id,event_type,error_code,occurred_at) values(p_workspace_id,v_attempt.id,p_provider_account_id,btrim(p_provider_event_id),p_event_type,nullif(btrim(coalesce(p_error_code,'')),''),p_occurred_at) on conflict (workspace_id,provider_account_id,provider_event_id) do nothing returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('attemptId',v_attempt.id,'status',v_attempt.status,'wasDuplicate',true); end if;
  v_current_rank:=case v_attempt.status when 'received' then 0 when 'queued' then 0 when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else -1 end;
  v_event_rank:=case p_event_type when 'received' then 0 when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else -1 end;
  v_next_status:=v_attempt.status;
  if p_event_type in ('failed','cancelled') then if v_attempt.status not in ('delivered','read','failed','cancelled') then v_next_status:=p_event_type; end if; elsif v_attempt.status not in ('failed','cancelled') and v_event_rank>v_current_rank then v_next_status:=p_event_type; end if;
  update public.communication_transport_attempts set status=v_next_status,error_code=case when v_next_status='failed' then nullif(btrim(coalesce(p_error_code,'')),'') else error_code end,last_event_at=greatest(coalesce(last_event_at,p_occurred_at),p_occurred_at) where workspace_id=p_workspace_id and id=v_attempt.id returning * into v_attempt;
  perform private.record_communication_audit_v1(p_workspace_id,null,'communication.transport.event','communication',v_attempt.communication_id,'Provider transport event recorded',jsonb_build_object('providerAccountId',p_provider_account_id,'attemptId',v_attempt.id,'eventType',p_event_type,'transportStatus',v_attempt.status));
  return jsonb_build_object('attemptId',v_attempt.id,'status',v_attempt.status,'wasDuplicate',false);
end; $$;

create or replace function public.relink_communication_v1(p_workspace_id uuid,p_communication_id uuid,p_expected_version integer,p_conversation_id uuid,p_company_id uuid,p_contact_id uuid,p_transaction_id uuid,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_old public.communications%rowtype; v_new public.communications%rowtype; v_conversation public.communication_conversations%rowtype; begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if p_expected_version is null or p_expected_version<1 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_VERSION_INVALID'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 3 and 800 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_REASON_INVALID'; end if;
  select * into v_old from public.communications c where c.workspace_id=p_workspace_id and c.id=p_communication_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_NOT_FOUND'; end if;
  if v_old.link_version<>p_expected_version then raise serialization_failure using message='ENJAZ_COMMUNICATION_RELINK_STALE'; end if;
  if p_company_id is not null and not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=p_company_id and c.deleted_at is null) then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_COMPANY_INVALID'; end if;
  if p_contact_id is not null and not exists(select 1 from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id and c.deleted_at is null) then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_CONTACT_INVALID'; end if;
  if p_transaction_id is not null and not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_TRANSACTION_INVALID'; end if;
  if p_conversation_id is null then insert into public.communication_conversations(workspace_id,company_id,contact_id,transaction_id,subject,status,created_by) values(p_workspace_id,p_company_id,p_contact_id,p_transaction_id,v_old.subject,'open',v_actor) returning * into v_conversation; else select * into v_conversation from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.id=p_conversation_id and cv.status='open' for update; if not found then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_CONVERSATION_INVALID'; end if; if v_conversation.company_id is distinct from p_company_id or v_conversation.contact_id is distinct from p_contact_id or v_conversation.transaction_id is distinct from p_transaction_id then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_RELINK_CONVERSATION_SCOPE_MISMATCH'; end if; end if;
  update public.communications set conversation_id=v_conversation.id,company_id=p_company_id,contact_id=p_contact_id,transaction_id=p_transaction_id,link_status=case when p_company_id is not null or p_contact_id is not null or p_transaction_id is not null then 'linked' else 'unmatched' end,link_version=link_version+1 where workspace_id=p_workspace_id and id=p_communication_id returning * into v_new;
  insert into public.communication_relink_events(workspace_id,communication_id,actor_user_id,old_conversation_id,new_conversation_id,old_company_id,new_company_id,old_contact_id,new_contact_id,old_transaction_id,new_transaction_id,reason,expected_version,resulting_version) values(p_workspace_id,p_communication_id,v_actor,v_old.conversation_id,v_new.conversation_id,v_old.company_id,v_new.company_id,v_old.contact_id,v_new.contact_id,v_old.transaction_id,v_new.transaction_id,btrim(p_reason),p_expected_version,v_new.link_version);
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,'communication.relinked','communication',p_communication_id,'Communication manually relinked',jsonb_build_object('oldConversationId',v_old.conversation_id,'newConversationId',v_new.conversation_id,'oldCompanyId',v_old.company_id,'newCompanyId',v_new.company_id,'oldContactId',v_old.contact_id,'newContactId',v_new.contact_id,'oldTransactionId',v_old.transaction_id,'newTransactionId',v_new.transaction_id,'expectedVersion',p_expected_version,'resultingVersion',v_new.link_version));
  return jsonb_build_object('communicationId',v_new.id,'conversationId',v_new.conversation_id,'linkStatus',v_new.link_status,'linkVersion',v_new.link_version);
end; $$;

create or replace function public.create_transaction_followup_v1(p_workspace_id uuid,p_transaction_id uuid,p_followup_id uuid,p_title text,p_due_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v public.transaction_followups%rowtype; begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if p_followup_id is null then raise invalid_parameter_value using message='ENJAZ_FOLLOWUP_ID_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_FOLLOWUP_TITLE_INVALID'; end if;
  if p_due_at is null then raise invalid_parameter_value using message='ENJAZ_FOLLOWUP_DUE_AT_REQUIRED'; end if;
  if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then raise invalid_parameter_value using message='ENJAZ_FOLLOWUP_TRANSACTION_INVALID'; end if;
  insert into public.transaction_followups(id,workspace_id,transaction_id,title,due_at,status) values(p_followup_id,p_workspace_id,p_transaction_id,btrim(p_title),p_due_at,'open') on conflict (id) do nothing;
  select * into v from public.transaction_followups f where f.workspace_id=p_workspace_id and f.id=p_followup_id;
  if not found or v.transaction_id<>p_transaction_id or v.title<>btrim(p_title) or v.due_at<>p_due_at then raise unique_violation using message='ENJAZ_FOLLOWUP_IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('followupId',v.id,'transactionId',v.transaction_id,'status',v.status);
end; $$;

create or replace function public.convert_communication_to_followup_v1(p_workspace_id uuid,p_communication_id uuid,p_idempotency_key text,p_followup_id uuid,p_title text,p_due_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_communication public.communications%rowtype; v_receipt public.communication_conversion_receipts%rowtype; v_followup jsonb; begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 300 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_INVALID'; end if;
  select * into v_communication from public.communications c where c.workspace_id=p_workspace_id and c.id=p_communication_id for share;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_NOT_FOUND'; end if;
  if v_communication.transaction_id is null then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_TRANSACTION_LINK_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'|'||p_communication_id::text||'|followup|'||btrim(p_idempotency_key),0));
  select * into v_receipt from public.communication_conversion_receipts r where r.workspace_id=p_workspace_id and r.communication_id=p_communication_id and r.conversion_type='followup' and r.idempotency_key=btrim(p_idempotency_key);
  if found then if v_receipt.target_entity_id<>p_followup_id then raise unique_violation using message='ENJAZ_COMMUNICATION_CONVERSION_IDEMPOTENCY_CONFLICT'; end if; return jsonb_build_object('receiptId',v_receipt.id,'followupId',v_receipt.target_entity_id,'wasDuplicate',true); end if;
  v_followup:=public.create_transaction_followup_v1(p_workspace_id,v_communication.transaction_id,p_followup_id,p_title,p_due_at);
  insert into public.communication_conversion_receipts(workspace_id,communication_id,conversion_type,idempotency_key,target_entity_type,target_entity_id,actor_user_id) values(p_workspace_id,p_communication_id,'followup',btrim(p_idempotency_key),'transaction_followup',p_followup_id,v_actor) returning * into v_receipt;
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,'communication.converted.followup','communication',p_communication_id,'Communication converted to follow-up',jsonb_build_object('receiptId',v_receipt.id,'followupId',p_followup_id,'transactionId',v_communication.transaction_id));
  return jsonb_build_object('receiptId',v_receipt.id,'followupId',p_followup_id,'wasDuplicate',false);
end; $$;

alter table public.communication_templates enable row level security;
alter table public.communication_outbound_commands enable row level security;
alter table public.communication_document_links enable row level security;
alter table public.communication_conversion_receipts enable row level security;
revoke all on table public.communication_templates,public.communication_outbound_commands,public.communication_document_links,public.communication_conversion_receipts from public,anon,authenticated;
grant select,insert,update,delete on table public.communication_templates to service_role;
grant select,insert,update on table public.communication_outbound_commands to service_role;
grant select,insert on table public.communication_document_links,public.communication_conversion_receipts to service_role;

revoke all on function public.save_communication_template_v1(uuid,uuid,integer,text,text,text,text,text,boolean) from public,anon,service_role; grant execute on function public.save_communication_template_v1(uuid,uuid,integer,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) from public,anon,service_role; grant execute on function public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) to authenticated;
revoke all on function public.decide_communication_outbound_v1(uuid,uuid,integer,text,text) from public,anon,service_role; grant execute on function public.decide_communication_outbound_v1(uuid,uuid,integer,text,text) to authenticated;
revoke all on function public.relink_communication_v1(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) from public,anon,service_role; grant execute on function public.relink_communication_v1(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) to authenticated;
revoke all on function public.create_transaction_followup_v1(uuid,uuid,uuid,text,timestamptz) from public,anon,service_role; grant execute on function public.create_transaction_followup_v1(uuid,uuid,uuid,text,timestamptz) to authenticated;
revoke all on function public.convert_communication_to_followup_v1(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role; grant execute on function public.convert_communication_to_followup_v1(uuid,uuid,text,uuid,text,timestamptz) to authenticated;
revoke all on function public.claim_communication_outbound_dispatch_v1(uuid,uuid) from public,anon,authenticated; grant execute on function public.claim_communication_outbound_dispatch_v1(uuid,uuid) to service_role;
revoke all on function public.complete_communication_outbound_dispatch_v1(uuid,uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated; grant execute on function public.complete_communication_outbound_dispatch_v1(uuid,uuid,uuid,text,text,text,timestamptz) to service_role;
revoke all on function public.fail_communication_outbound_dispatch_v1(uuid,uuid,uuid,text,boolean) from public,anon,authenticated; grant execute on function public.fail_communication_outbound_dispatch_v1(uuid,uuid,uuid,text,boolean) to service_role;
revoke all on function public.ingest_communication_provider_message_v1(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated; grant execute on function public.ingest_communication_provider_message_v1(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;
revoke all on function public.record_communication_provider_event_v1(uuid,uuid,text,text,text,text,timestamptz) from public,anon,authenticated; grant execute on function public.record_communication_provider_event_v1(uuid,uuid,text,text,text,text,timestamptz) to service_role;
revoke all on function private.guard_communication_prepared_content_v1() from public,anon,authenticated;
revoke all on function private.require_communication_owner_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function private.communication_content_sha256_v1(text,text,text,text,text) from public,anon,authenticated;
revoke all on function private.record_communication_audit_v1(uuid,uuid,text,text,uuid,text,jsonb) from public,anon,authenticated,service_role;

commit;
