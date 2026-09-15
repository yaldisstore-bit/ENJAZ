-- ENJAZ Phase 11.3-C2 — governed requested-document upload + document/draft approval
-- Client writes are brokered into the canonical Document Vault and Document Factory authorities.
-- No client receives workspace membership, direct core-table DML, raw storage authority or staff trust.

begin;

-- -----------------------------------------------------------------------------
-- Requested-document upload action metadata. Canonical binary/document truth stays
-- in document_upload_sessions + documents + document_versions.
-- -----------------------------------------------------------------------------

create table public.client_portal_requested_document_uploads (
  operation_id uuid primary key references public.document_upload_sessions(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  request_id uuid not null,
  transaction_id uuid not null,
  document_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'prepared' check (status in ('prepared','acknowledged','failed')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  failed_at timestamptz,
  constraint client_portal_requested_document_uploads_principal_fk foreign key(workspace_id,principal_id)
    references public.client_portal_principals(workspace_id,id) on delete cascade,
  constraint client_portal_requested_document_uploads_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict,
  constraint client_portal_requested_document_uploads_document_fk foreign key(workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint client_portal_requested_document_uploads_terminal_check check (
    (status='prepared' and acknowledged_at is null and failed_at is null)
    or (status='acknowledged' and acknowledged_at is not null and failed_at is null)
    or (status='failed' and failed_at is not null and acknowledged_at is null)
  )
);

create unique index client_portal_requested_document_uploads_active_request_idx
  on public.client_portal_requested_document_uploads(workspace_id,principal_id,request_id)
  where status in ('prepared','acknowledged');
create index client_portal_requested_document_uploads_transaction_idx
  on public.client_portal_requested_document_uploads(workspace_id,principal_id,transaction_id,created_at desc);

alter table public.client_portal_requested_document_uploads enable row level security;
revoke all on table public.client_portal_requested_document_uploads from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Approval bindings and client approval/rejection facts. A request may approve a
-- published document only, or staff may bind it to a canonical Document Factory
-- draft so the same canonical review transition is executed.
-- -----------------------------------------------------------------------------

create table public.client_portal_document_approval_targets (
  request_id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  transaction_id uuid not null,
  resource_share_id uuid not null,
  document_id uuid not null,
  draft_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint client_portal_document_approval_targets_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict,
  constraint client_portal_document_approval_targets_share_fk foreign key(workspace_id,resource_share_id)
    references public.client_portal_resource_shares(workspace_id,id) on delete restrict,
  constraint client_portal_document_approval_targets_document_fk foreign key(workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint client_portal_document_approval_targets_draft_fk foreign key(workspace_id,draft_id)
    references public.document_drafts(workspace_id,id) on delete restrict
);

create index client_portal_document_approval_targets_transaction_idx
  on public.client_portal_document_approval_targets(workspace_id,principal_id,transaction_id,created_at desc);

alter table public.client_portal_document_approval_targets enable row level security;
revoke all on table public.client_portal_document_approval_targets from public,anon,authenticated;

create table public.client_portal_document_approval_responses (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  principal_id uuid not null,
  request_id uuid not null,
  transaction_id uuid not null,
  resource_share_id uuid not null,
  document_id uuid not null,
  draft_id uuid,
  decision text not null check (decision in ('approved','rejected')),
  comment text check (comment is null or char_length(btrim(comment)) between 1 and 1000),
  document_factory_applied boolean not null default false,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  responded_at timestamptz not null default now(),
  constraint client_portal_document_approval_responses_request_unique unique(workspace_id,principal_id,request_id),
  constraint client_portal_document_approval_responses_request_scope_fk foreign key(workspace_id,principal_id,request_id,transaction_id)
    references public.client_portal_requests(workspace_id,principal_id,id,transaction_id) on delete restrict,
  constraint client_portal_document_approval_responses_share_fk foreign key(workspace_id,resource_share_id)
    references public.client_portal_resource_shares(workspace_id,id) on delete restrict,
  constraint client_portal_document_approval_responses_document_fk foreign key(workspace_id,document_id)
    references public.documents(workspace_id,id) on delete restrict,
  constraint client_portal_document_approval_responses_draft_fk foreign key(workspace_id,draft_id)
    references public.document_drafts(workspace_id,id) on delete restrict,
  constraint client_portal_document_approval_responses_factory_check check (
    document_factory_applied=(draft_id is not null)
  )
);

create index client_portal_document_approval_responses_transaction_idx
  on public.client_portal_document_approval_responses(workspace_id,principal_id,transaction_id,responded_at desc);

alter table public.client_portal_document_approval_responses enable row level security;
revoke all on table public.client_portal_document_approval_responses from public,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Requested-document upload broker. It reproduces only Document Vault's prepare
-- contract while deriving case scope from the governed portal request. Storage
-- signing, stored-byte inspection and authoritative acknowledgement remain in
-- enjaz-document-vault + acknowledge_document_upload_v2.
-- -----------------------------------------------------------------------------

create or replace function private.prepare_client_portal_requested_document_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_operation_id uuid,p_title text,
  p_original_file_name text,p_mime_type text,p_byte_size bigint,
  p_document_type text,p_checksum text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
  v_tx public.transactions%rowtype;
  v_existing public.client_portal_requested_document_uploads%rowtype;
  v_session public.document_upload_sessions%rowtype;
  v_document_id uuid;
  v_path text;
  v_title text:=btrim(coalesce(p_title,''));
  v_file text:=btrim(coalesce(p_original_file_name,''));
  v_mime text:=lower(btrim(coalesce(p_mime_type,'')));
  v_type text:=nullif(btrim(coalesce(p_document_type,'')),'');
  v_checksum text:=nullif(lower(btrim(coalesce(p_checksum,''))),'');
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_operation_id is null then raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_OPERATION_REQUIRED'; end if;
  v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id);
  if v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_REQUEST_INVALID';
  end if;
  if v_request.status<>'open' then
    raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_REQUEST_NOT_OPEN';
  end if;
  if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_TITLE_INVALID'; end if;
  if char_length(v_file) not between 1 and 240 or v_file ~ '[\\/]' or v_file ~ '[[:cntrl:]]' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_FILE_NAME_INVALID';
  end if;
  if p_byte_size is null or p_byte_size<1 or p_byte_size>52428800 then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_SIZE_INVALID';
  end if;
  if v_mime not in (
    'application/pdf','image/jpeg','image/png','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) then raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_MIME_INVALID'; end if;
  if v_type is not null and char_length(v_type)>120 then raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_TYPE_INVALID'; end if;
  if v_checksum is not null and v_checksum !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_UPLOAD_CHECKSUM_INVALID';
  end if;

  select * into v_existing from public.client_portal_requested_document_uploads u
  where u.operation_id=p_operation_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.principal_id<>v_request.principal_id
       or v_existing.request_id<>p_request_id or v_existing.transaction_id<>v_request.transaction_id
       or v_existing.actor_user_id<>v_actor then
      raise unique_violation using message='ENJAZ_PORTAL_UPLOAD_OPERATION_CONFLICT';
    end if;
    select * into v_session from public.document_upload_sessions s where s.id=p_operation_id;
    if not found or v_session.state<>'prepared' or v_existing.status<>'prepared' then
      raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_OPERATION_NOT_PREPARED';
    end if;
    if v_session.title<>v_title or v_session.original_file_name<>v_file
       or lower(v_session.mime_type)<>v_mime or v_session.byte_size<>p_byte_size
       or v_session.document_type is distinct from v_type or v_session.checksum is distinct from v_checksum then
      raise serialization_failure using message='ENJAZ_PORTAL_UPLOAD_OPERATION_DRIFT';
    end if;
    return jsonb_build_object(
      'schema','enjaz.document-upload-claim.v2','operationId',v_session.id,'documentId',v_session.document_id,
      'versionNumber',v_session.version_number,'bucket','enjaz-documents-private','path',v_session.storage_path,
      'title',v_session.title,'fileName',v_session.original_file_name,'mimeType',v_session.mime_type,
      'byteSize',v_session.byte_size,'checksum',v_session.checksum,'state','prepared','binaryAuthoritative',false,
      'requestId',p_request_id,'wasDuplicate',true
    );
  end if;

  if exists(
    select 1 from public.client_portal_requested_document_uploads u
    where u.workspace_id=p_workspace_id and u.principal_id=v_request.principal_id
      and u.request_id=p_request_id and u.status in ('prepared','acknowledged')
  ) then raise unique_violation using message='ENJAZ_PORTAL_UPLOAD_REQUEST_ALREADY_HAS_ACTIVE_UPLOAD'; end if;

  select * into v_tx from public.transactions t
  where t.workspace_id=p_workspace_id and t.id=v_request.transaction_id and t.deleted_at is null;
  if not found then raise no_data_found using message='ENJAZ_PORTAL_UPLOAD_TRANSACTION_NOT_FOUND'; end if;

  v_document_id:=gen_random_uuid();
  v_path:=format('%s/%s/v1/%s',p_workspace_id,v_document_id,p_operation_id);

  insert into public.documents(
    id,workspace_id,company_id,transaction_id,title,document_type,mime_type,storage_path,
    size_bytes,original_size_bytes,checksum,status,original_file_name,uploaded_by
  ) values(
    v_document_id,p_workspace_id,v_tx.company_id,v_request.transaction_id,v_title,v_type,v_mime,v_path,
    p_byte_size,p_byte_size,v_checksum,'processing',v_file,v_actor
  );

  insert into public.document_upload_sessions(
    id,workspace_id,document_id,version_number,title,document_type,company_id,transaction_id,
    original_file_name,mime_type,byte_size,checksum,storage_path,created_by
  ) values(
    p_operation_id,p_workspace_id,v_document_id,1,v_title,v_type,v_tx.company_id,v_request.transaction_id,
    v_file,v_mime,p_byte_size,v_checksum,v_path,v_actor
  ) returning * into v_session;

  insert into public.client_portal_requested_document_uploads(
    operation_id,workspace_id,principal_id,request_id,transaction_id,document_id,actor_user_id,status
  ) values(
    p_operation_id,p_workspace_id,v_request.principal_id,p_request_id,v_request.transaction_id,v_document_id,v_actor,'prepared'
  );

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'document.upload.prepared','document',v_document_id,
    'Client requested-document binary upload prepared through Document Vault authority',
    jsonb_build_object('operationId',p_operation_id,'versionNumber',1,'byteSize',p_byte_size,'mimeType',v_mime,
      'companyId',v_tx.company_id,'transactionId',v_request.transaction_id,'portalRequestId',p_request_id,'source','client_portal')
  );
  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.document_upload.prepared','document',v_document_id,
    v_request.principal_id,v_request.transaction_id,p_request_id,
    jsonb_build_object('operationId',p_operation_id,'byteSize',p_byte_size,'mimeType',v_mime)
  );

  return jsonb_build_object(
    'schema','enjaz.document-upload-claim.v2','operationId',p_operation_id,'documentId',v_document_id,
    'versionNumber',1,'bucket','enjaz-documents-private','path',v_path,'title',v_title,'fileName',v_file,
    'mimeType',v_mime,'byteSize',p_byte_size,'checksum',v_checksum,'state','prepared','binaryAuthoritative',false,
    'requestId',p_request_id,'wasDuplicate',false
  );
end;
$$;

create or replace function public.prepare_client_portal_requested_document_v1(
  p_workspace_id uuid,p_request_id uuid,p_operation_id uuid,p_title text,
  p_original_file_name text,p_mime_type text,p_byte_size bigint,
  p_document_type text default null,p_checksum text default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.prepare_client_portal_requested_document_v1_impl(
    p_workspace_id,p_request_id,p_operation_id,p_title,p_original_file_name,p_mime_type,p_byte_size,p_document_type,p_checksum
  );
$$;

create or replace function private.get_client_portal_document_upload_claim_v1_impl(p_operation_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_upload public.client_portal_requested_document_uploads%rowtype;
  v_request public.client_portal_requests%rowtype;
  v_session public.document_upload_sessions%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  select * into v_upload from public.client_portal_requested_document_uploads u where u.operation_id=p_operation_id;
  if not found or v_upload.actor_user_id<>v_actor then raise no_data_found using message='ENJAZ_PORTAL_UPLOAD_NOT_FOUND'; end if;
  v_request:=private.require_client_portal_visible_request_v1(v_upload.workspace_id,v_upload.request_id);
  if v_request.principal_id<>v_upload.principal_id or v_request.transaction_id<>v_upload.transaction_id
     or v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document' then
    raise insufficient_privilege using message='ENJAZ_PORTAL_UPLOAD_SCOPE_CHANGED';
  end if;
  select * into v_session from public.document_upload_sessions s where s.id=p_operation_id and s.created_by=v_actor;
  if not found or v_session.document_id<>v_upload.document_id then raise no_data_found using message='ENJAZ_PORTAL_UPLOAD_SESSION_NOT_FOUND'; end if;
  if v_session.state not in ('prepared','acknowledged') then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_NOT_RECOVERABLE'; end if;
  return jsonb_build_object(
    'schema','enjaz.document-upload-claim.v2','operationId',v_session.id,'documentId',v_session.document_id,
    'versionNumber',v_session.version_number,'bucket','enjaz-documents-private','path',v_session.storage_path,
    'title',v_session.title,'fileName',v_session.original_file_name,'mimeType',v_session.mime_type,
    'byteSize',v_session.byte_size,'checksum',v_session.checksum,'state',v_session.state,
    'binaryAuthoritative',v_session.state='acknowledged','requestId',v_upload.request_id
  );
end;
$$;

create or replace function public.get_client_portal_document_upload_claim_v1(p_operation_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_client_portal_document_upload_claim_v1_impl(p_operation_id);
$$;

create or replace function private.sync_client_portal_upload_state_v1()
returns trigger language plpgsql volatile security definer set search_path='' as $$
begin
  if new.state='failed' and old.state is distinct from new.state then
    update public.client_portal_requested_document_uploads
      set status='failed',failed_at=coalesce(failed_at,now()),acknowledged_at=null
    where operation_id=new.id and status='prepared';
  elsif new.state='acknowledged' and old.state is distinct from new.state then
    update public.client_portal_requested_document_uploads
      set status='acknowledged',acknowledged_at=coalesce(acknowledged_at,now()),failed_at=null
    where operation_id=new.id and status='prepared';
  end if;
  return new;
end;
$$;

drop trigger if exists client_portal_upload_session_sync on public.document_upload_sessions;
create trigger client_portal_upload_session_sync
after update of state on public.document_upload_sessions
for each row execute function private.sync_client_portal_upload_state_v1();

create or replace function private.complete_client_portal_requested_document_v1_impl(
  p_workspace_id uuid,p_operation_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_upload public.client_portal_requested_document_uploads%rowtype;
  v_request public.client_portal_requests%rowtype;
  v_session public.document_upload_sessions%rowtype;
  v_duplicate boolean:=false;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  select * into v_upload from public.client_portal_requested_document_uploads u
  where u.operation_id=p_operation_id and u.workspace_id=p_workspace_id for update;
  if not found or v_upload.actor_user_id<>v_actor then raise no_data_found using message='ENJAZ_PORTAL_UPLOAD_NOT_FOUND'; end if;
  v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,v_upload.request_id);
  if v_request.principal_id<>v_upload.principal_id or v_request.transaction_id<>v_upload.transaction_id
     or v_request.request_type<>'document' or v_request.required_permission<>'upload_requested_document' then
    raise insufficient_privilege using message='ENJAZ_PORTAL_UPLOAD_SCOPE_CHANGED';
  end if;
  select * into v_session from public.document_upload_sessions s where s.id=p_operation_id and s.created_by=v_actor;
  if not found or v_session.document_id<>v_upload.document_id or v_session.state<>'acknowledged' then
    raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_NOT_ACKNOWLEDGED';
  end if;
  if not exists(
    select 1 from public.documents d where d.workspace_id=p_workspace_id and d.id=v_upload.document_id
      and d.transaction_id=v_upload.transaction_id and d.status='ready'
  ) then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_DOCUMENT_NOT_READY'; end if;

  update public.client_portal_requested_document_uploads
    set status='acknowledged',acknowledged_at=coalesce(acknowledged_at,now()),failed_at=null
  where operation_id=p_operation_id
  returning * into v_upload;

  if v_request.status='open' then
    update public.client_portal_requests
      set status='fulfilled',version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=v_request.id and status='open'
    returning * into v_request;
    if not found then raise serialization_failure using message='ENJAZ_PORTAL_UPLOAD_REQUEST_CHANGED'; end if;

    perform private.record_client_portal_action_audit_v1(
      p_workspace_id,v_actor,'client_portal.document_upload.acknowledged','document',v_upload.document_id,
      v_upload.principal_id,v_upload.transaction_id,v_upload.request_id,
      jsonb_build_object('operationId',p_operation_id,'versionNumber',v_session.version_number)
    );
    perform private.record_client_portal_request_audit_v1(
      p_workspace_id,v_actor,v_request,'client_portal.request.fulfilled','document_vault_acknowledgement'
    );
  elsif v_request.status='fulfilled' then
    v_duplicate:=true;
  else
    raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_UPLOAD_REQUEST_NOT_FULFILLABLE';
  end if;

  return jsonb_build_object(
    'operationId',p_operation_id,'requestId',v_upload.request_id,'transactionId',v_upload.transaction_id,
    'documentId',v_upload.document_id,'versionNumber',v_session.version_number,'status','acknowledged',
    'wasDuplicate',v_duplicate
  );
end;
$$;

create or replace function public.complete_client_portal_requested_document_v1(p_workspace_id uuid,p_operation_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.complete_client_portal_requested_document_v1_impl(p_workspace_id,p_operation_id);
$$;

-- -----------------------------------------------------------------------------
-- Canonical Document Factory review transition. Both the existing staff-owner
-- command and a validated portal approval binding enter this single transition.
-- -----------------------------------------------------------------------------

create or replace function private.review_document_draft_canonical_v1(
  p_workspace_id uuid,p_draft_id uuid,p_decision text,p_note text,p_actor uuid,p_actor_source text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v public.document_drafts%rowtype;
  v_decision text:=lower(btrim(coalesce(p_decision,'')));
  v_note text:=nullif(btrim(coalesce(p_note,'')),'');
  v_content_checksum text;
  v_fact_checksum text;
begin
  if p_actor is null then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_REVIEW_ACTOR_REQUIRED'; end if;
  if p_actor_source not in ('staff_owner','client_portal') then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_REVIEW_SOURCE_INVALID'; end if;
  if v_decision not in ('approve','return') then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_REVIEW_DECISION_INVALID'; end if;
  if v_note is not null and char_length(v_note)>1000 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_REVIEW_NOTE_TOO_LONG'; end if;
  select * into v from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=p_draft_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_FOUND'; end if;

  if v_decision='approve' then
    if v.status<>'review_required' or v.template_version_id is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_APPROVABLE'; end if;
    perform private.assert_document_factory_provenance_current_v1(p_workspace_id,v.template_version_id,v.provenance);
    v_content_checksum:=encode(extensions.digest(convert_to(v.compiled_content,'UTF8'),'sha256'),'hex');
    v_fact_checksum:=encode(extensions.digest(convert_to(v.fact_snapshot::text,'UTF8'),'sha256'),'hex');
    if v.content_checksum is distinct from v_content_checksum or v.fact_snapshot_checksum is distinct from v_fact_checksum then
      raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT';
    end if;
    update public.document_drafts
      set status='approved',approved_by=p_actor,approved_at=now(),approval_note=v_note,updated_at=now()
      where id=v.id;
    insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
    values(
      p_workspace_id,p_actor,'document.factory.approved','document_draft',v.id,'Official document draft approved',
      jsonb_build_object('contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum,'note',v_note,'actorSource',p_actor_source)
    );
    return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','approved','approvedBy',p_actor,'approved',true,'actorSource',p_actor_source);
  end if;

  if v.status not in ('review_required','approved') then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_RETURNABLE'; end if;
  update public.document_drafts
    set status='draft',approved_by=null,approved_at=null,approval_note=v_note,
        finalized_by=null,finalized_at=null,final_document_id=null,final_document_version_id=null,updated_at=now()
    where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,p_actor,'document.factory.returned','document_draft',v.id,'Document draft returned for correction',
    jsonb_build_object('note',v_note,'actorSource',p_actor_source)
  );
  return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','draft','approved',false,'actorSource',p_actor_source);
end;
$$;

create or replace function public.review_document_draft_v1(
  p_workspace_id uuid,p_draft_id uuid,p_decision text,p_note text default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  return private.review_document_draft_canonical_v1(p_workspace_id,p_draft_id,p_decision,p_note,v_actor,'staff_owner');
end;
$$;

-- Staff owner may explicitly bind an approval request to a canonical draft. The
-- client can never supply or retarget this binding.
create or replace function private.bind_client_portal_approval_draft_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_draft_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid;
  v_request public.client_portal_requests%rowtype;
  v_share public.client_portal_resource_shares%rowtype;
  v_draft public.document_drafts%rowtype;
  v_existing public.client_portal_document_approval_targets%rowtype;
begin
  v_actor:=private.require_client_portal_owner_v1(p_workspace_id);
  select * into v_request from public.client_portal_requests r
  where r.workspace_id=p_workspace_id and r.id=p_request_id for update;
  if not found then raise no_data_found using message='ENJAZ_PORTAL_APPROVAL_REQUEST_NOT_FOUND'; end if;
  if v_request.request_type<>'approval' or v_request.required_permission<>'approve_document'
     or v_request.resource_share_id is null or v_request.revoked_at is not null or v_request.status<>'open' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_REQUEST_INVALID';
  end if;
  select * into v_share from public.client_portal_resource_shares s
  where s.workspace_id=p_workspace_id and s.id=v_request.resource_share_id
    and s.principal_id=v_request.principal_id and s.transaction_id=v_request.transaction_id
    and s.resource_type='document' and s.document_id is not null
    and s.revoked_at is null and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now());
  if not found then raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_SHARE_INVALID'; end if;
  select * into v_draft from public.document_drafts d
  where d.workspace_id=p_workspace_id and d.id=p_draft_id;
  if not found or v_draft.transaction_id is distinct from v_request.transaction_id or v_draft.status<>'review_required' then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_DRAFT_INVALID';
  end if;

  select * into v_existing from public.client_portal_document_approval_targets t where t.request_id=p_request_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.principal_id<>v_request.principal_id
       or v_existing.transaction_id<>v_request.transaction_id or v_existing.resource_share_id<>v_share.id
       or v_existing.document_id<>v_share.document_id or v_existing.draft_id<>p_draft_id then
      raise unique_violation using message='ENJAZ_PORTAL_APPROVAL_TARGET_CONFLICT';
    end if;
    return jsonb_build_object('requestId',p_request_id,'documentId',v_existing.document_id,'draftId',v_existing.draft_id,'wasDuplicate',true);
  end if;

  insert into public.client_portal_document_approval_targets(
    request_id,workspace_id,principal_id,transaction_id,resource_share_id,document_id,draft_id,created_by
  ) values(
    p_request_id,p_workspace_id,v_request.principal_id,v_request.transaction_id,v_share.id,v_share.document_id,p_draft_id,v_actor
  );
  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.approval_draft.bound','document_draft',p_draft_id,
    v_request.principal_id,v_request.transaction_id,p_request_id,
    jsonb_build_object('documentId',v_share.document_id,'resourceShareId',v_share.id)
  );
  return jsonb_build_object('requestId',p_request_id,'documentId',v_share.document_id,'draftId',p_draft_id,'wasDuplicate',false);
end;
$$;

create or replace function public.bind_client_portal_approval_draft_v1(
  p_workspace_id uuid,p_request_id uuid,p_draft_id uuid
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.bind_client_portal_approval_draft_v1_impl(p_workspace_id,p_request_id,p_draft_id);
$$;

create or replace function private.respond_client_portal_document_approval_v1_impl(
  p_workspace_id uuid,p_request_id uuid,p_response_id uuid,p_decision text,p_comment text
)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_request public.client_portal_requests%rowtype;
  v_share public.client_portal_resource_shares%rowtype;
  v_target public.client_portal_document_approval_targets%rowtype;
  v_existing public.client_portal_document_approval_responses%rowtype;
  v_decision text:=lower(btrim(coalesce(p_decision,'')));
  v_comment text:=nullif(btrim(coalesce(p_comment,'')),'');
  v_factory_applied boolean:=false;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_PORTAL_AUTH_REQUIRED'; end if;
  if p_response_id is null or v_decision not in ('approved','rejected') then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_RESPONSE_INVALID';
  end if;
  if v_comment is not null and char_length(v_comment)>1000 then raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_COMMENT_INVALID'; end if;
  v_request:=private.require_client_portal_visible_request_v1(p_workspace_id,p_request_id);
  if v_request.request_type<>'approval' or v_request.required_permission<>'approve_document' or v_request.resource_share_id is null then
    raise invalid_parameter_value using message='ENJAZ_PORTAL_APPROVAL_REQUEST_INVALID';
  end if;

  select * into v_existing from public.client_portal_document_approval_responses a
  where a.workspace_id=p_workspace_id and a.id=p_response_id;
  if found then
    if v_existing.principal_id<>v_request.principal_id or v_existing.request_id<>p_request_id
       or v_existing.transaction_id<>v_request.transaction_id or v_existing.decision<>v_decision
       or v_existing.comment is distinct from v_comment then
      raise unique_violation using message='ENJAZ_PORTAL_APPROVAL_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'responseId',v_existing.id,'requestId',v_existing.request_id,'transactionId',v_existing.transaction_id,
      'documentId',v_existing.document_id,'decision',v_existing.decision,'comment',v_existing.comment,
      'documentFactoryApplied',v_existing.document_factory_applied,'respondedAt',v_existing.responded_at,'wasDuplicate',true
    );
  end if;
  if exists(
    select 1 from public.client_portal_document_approval_responses a
    where a.workspace_id=p_workspace_id and a.principal_id=v_request.principal_id and a.request_id=p_request_id
  ) then raise unique_violation using message='ENJAZ_PORTAL_APPROVAL_ALREADY_RESPONDED'; end if;
  if v_request.status<>'open' then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_APPROVAL_REQUEST_NOT_OPEN'; end if;

  select * into v_share from public.client_portal_resource_shares s
  where s.workspace_id=p_workspace_id and s.id=v_request.resource_share_id
    and s.principal_id=v_request.principal_id and s.transaction_id=v_request.transaction_id
    and s.resource_type='document' and s.document_id is not null
    and s.revoked_at is null and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now());
  if not found then raise insufficient_privilege using message='ENJAZ_PORTAL_APPROVAL_SHARE_NOT_ACTIVE'; end if;
  if not exists(
    select 1 from public.documents d where d.workspace_id=p_workspace_id and d.id=v_share.document_id
      and d.transaction_id=v_request.transaction_id and d.status='ready'
  ) then raise object_not_in_prerequisite_state using message='ENJAZ_PORTAL_APPROVAL_DOCUMENT_NOT_READY'; end if;

  select * into v_target from public.client_portal_document_approval_targets t
  where t.request_id=p_request_id and t.workspace_id=p_workspace_id;
  if found then
    if v_target.principal_id<>v_request.principal_id or v_target.transaction_id<>v_request.transaction_id
       or v_target.resource_share_id<>v_share.id or v_target.document_id<>v_share.document_id then
      raise serialization_failure using message='ENJAZ_PORTAL_APPROVAL_TARGET_DRIFT';
    end if;
    perform private.review_document_draft_canonical_v1(
      p_workspace_id,v_target.draft_id,
      case when v_decision='approved' then 'approve' else 'return' end,
      v_comment,v_actor,'client_portal'
    );
    v_factory_applied:=true;
  end if;

  insert into public.client_portal_document_approval_responses(
    id,workspace_id,principal_id,request_id,transaction_id,resource_share_id,document_id,draft_id,
    decision,comment,document_factory_applied,actor_user_id
  ) values(
    p_response_id,p_workspace_id,v_request.principal_id,p_request_id,v_request.transaction_id,v_share.id,v_share.document_id,
    case when v_factory_applied then v_target.draft_id else null end,
    v_decision,v_comment,v_factory_applied,v_actor
  ) returning * into v_existing;

  update public.client_portal_requests
    set status='fulfilled',version=version+1,updated_at=now()
  where workspace_id=p_workspace_id and id=p_request_id and status='open'
  returning * into v_request;
  if not found then raise serialization_failure using message='ENJAZ_PORTAL_APPROVAL_REQUEST_CHANGED'; end if;

  perform private.record_client_portal_action_audit_v1(
    p_workspace_id,v_actor,'client_portal.document_approval.responded','document',v_share.document_id,
    v_request.principal_id,v_request.transaction_id,p_request_id,
    jsonb_build_object('responseId',p_response_id,'decision',v_decision,'comment',v_comment,
      'documentFactoryApplied',v_factory_applied,'draftId',case when v_factory_applied then v_target.draft_id else null end)
  );
  perform private.record_client_portal_request_audit_v1(
    p_workspace_id,v_actor,v_request,'client_portal.request.fulfilled',
    case when v_decision='approved' then 'document_approved' else 'document_rejected' end
  );

  return jsonb_build_object(
    'responseId',v_existing.id,'requestId',v_existing.request_id,'transactionId',v_existing.transaction_id,
    'documentId',v_existing.document_id,'decision',v_existing.decision,'comment',v_existing.comment,
    'documentFactoryApplied',v_existing.document_factory_applied,'respondedAt',v_existing.responded_at,'wasDuplicate',false
  );
end;
$$;

create or replace function public.respond_client_portal_document_approval_v1(
  p_workspace_id uuid,p_request_id uuid,p_response_id uuid,p_decision text,p_comment text default null
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.respond_client_portal_document_approval_v1_impl(p_workspace_id,p_request_id,p_response_id,p_decision,p_comment);
$$;

-- -----------------------------------------------------------------------------
-- Safe read-model v4: expose only reload-safe client action facts. Storage path,
-- checksum, actor, draft id, staff binding and authority metadata remain hidden.
-- -----------------------------------------------------------------------------

create or replace function private.get_client_portal_read_model_v4_impl(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_principal uuid;
  v_base jsonb;
  v_uploads jsonb;
  v_approvals jsonb;
begin
  v_principal:=private.require_client_portal_principal_v1(p_workspace_id);
  v_base:=private.get_client_portal_read_model_v3_impl(p_workspace_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'requestId',u.request_id,'transactionId',u.transaction_id,'documentId',u.document_id,
    'status',u.status,'createdAt',u.created_at,'acknowledgedAt',u.acknowledged_at
  ) order by u.created_at,u.operation_id),'[]'::jsonb)
  into v_uploads
  from public.client_portal_requested_document_uploads u
  where u.workspace_id=p_workspace_id and u.principal_id=v_principal
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',u.transaction_id,'upload_requested_document');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'requestId',a.request_id,'transactionId',a.transaction_id,'documentId',a.document_id,
    'decision',a.decision,'comment',a.comment,'documentFactoryApplied',a.document_factory_applied,'respondedAt',a.responded_at
  ) order by a.responded_at,a.id),'[]'::jsonb)
  into v_approvals
  from public.client_portal_document_approval_responses a
  where a.workspace_id=p_workspace_id and a.principal_id=v_principal
    and private.client_portal_grant_allows_v1(p_workspace_id,'transaction',a.transaction_id,'approve_document');

  return jsonb_set(
    jsonb_set(v_base,'{documentUploads}',v_uploads,true),
    '{documentApprovalResponses}',v_approvals,true
  );
end;
$$;

create or replace function public.get_client_portal_read_model_v1(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_client_portal_read_model_v4_impl(p_workspace_id);
$$;

-- -----------------------------------------------------------------------------
-- Function privileges. Public browser commands are narrow authenticated entry
-- points; all privileged implementations remain private and fixed-search-path.
-- -----------------------------------------------------------------------------

revoke all on function private.prepare_client_portal_requested_document_v1_impl(uuid,uuid,uuid,text,text,text,bigint,text,text) from public,anon,authenticated;
revoke all on function private.get_client_portal_document_upload_claim_v1_impl(uuid) from public,anon,authenticated;
revoke all on function private.sync_client_portal_upload_state_v1() from public,anon,authenticated;
revoke all on function private.complete_client_portal_requested_document_v1_impl(uuid,uuid) from public,anon,authenticated;
revoke all on function private.review_document_draft_canonical_v1(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
revoke all on function private.bind_client_portal_approval_draft_v1_impl(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.respond_client_portal_document_approval_v1_impl(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function private.get_client_portal_read_model_v4_impl(uuid) from public,anon,authenticated;

grant execute on function private.prepare_client_portal_requested_document_v1_impl(uuid,uuid,uuid,text,text,text,bigint,text,text) to authenticated;
grant execute on function private.get_client_portal_document_upload_claim_v1_impl(uuid) to authenticated;
grant execute on function private.complete_client_portal_requested_document_v1_impl(uuid,uuid) to authenticated;
grant execute on function private.bind_client_portal_approval_draft_v1_impl(uuid,uuid,uuid) to authenticated;
grant execute on function private.respond_client_portal_document_approval_v1_impl(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function private.get_client_portal_read_model_v4_impl(uuid) to authenticated;

revoke all on function public.prepare_client_portal_requested_document_v1(uuid,uuid,uuid,text,text,text,bigint,text,text) from public,anon,authenticated;
revoke all on function public.get_client_portal_document_upload_claim_v1(uuid) from public,anon,authenticated;
revoke all on function public.complete_client_portal_requested_document_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bind_client_portal_approval_draft_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.respond_client_portal_document_approval_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.review_document_draft_v1(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_client_portal_read_model_v1(uuid) from public,anon,authenticated;

grant execute on function public.prepare_client_portal_requested_document_v1(uuid,uuid,uuid,text,text,text,bigint,text,text) to authenticated;
grant execute on function public.get_client_portal_document_upload_claim_v1(uuid) to authenticated;
grant execute on function public.complete_client_portal_requested_document_v1(uuid,uuid) to authenticated;
grant execute on function public.bind_client_portal_approval_draft_v1(uuid,uuid,uuid) to authenticated;
grant execute on function public.respond_client_portal_document_approval_v1(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.review_document_draft_v1(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_client_portal_read_model_v1(uuid) to authenticated;

commit;
