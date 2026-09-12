-- ENJAZ Phase 10.1 — Document Vault authority + secure binary acknowledgement boundary
-- documents = current authoritative metadata; document_versions = acknowledged immutable-ish history.
-- Browser cannot choose storage paths or promote an upload to ready.
begin;

alter table public.documents add column if not exists original_file_name text;
alter table public.documents add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.documents add column if not exists archived_at timestamptz;
alter table public.document_versions add column if not exists original_file_name text;
alter table public.document_versions add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='documents_original_file_name_check') then
    alter table public.documents add constraint documents_original_file_name_check check(original_file_name is null or char_length(btrim(original_file_name)) between 1 and 240);
  end if;
  if not exists(select 1 from pg_constraint where conname='document_versions_original_file_name_check') then
    alter table public.document_versions add constraint document_versions_original_file_name_check check(original_file_name is null or char_length(btrim(original_file_name)) between 1 and 240);
  end if;
end $$;

create table if not exists public.document_upload_sessions (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null,
  version_number integer not null check(version_number>0),
  title text not null check(char_length(btrim(title)) between 1 and 320),
  document_type text,
  company_id uuid,
  transaction_id uuid,
  original_file_name text not null check(char_length(btrim(original_file_name)) between 1 and 240),
  mime_type text not null check(char_length(btrim(mime_type)) between 1 and 160),
  byte_size bigint not null check(byte_size between 1 and 52428800),
  checksum text check(checksum is null or checksum ~ '^[0-9a-f]{64}$'),
  storage_path text not null check(char_length(btrim(storage_path)) between 1 and 1200),
  state text not null default 'prepared' check(state in ('prepared','acknowledged','failed','cancelled')),
  document_version_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 hours'),
  acknowledged_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  constraint document_upload_sessions_document_fk foreign key(workspace_id,document_id) references public.documents(workspace_id,id) on delete cascade,
  constraint document_upload_sessions_company_fk foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete restrict,
  constraint document_upload_sessions_transaction_fk foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id) on delete restrict,
  constraint document_upload_sessions_version_fk foreign key(workspace_id,document_version_id) references public.document_versions(workspace_id,id) on delete set null,
  constraint document_upload_sessions_path_unique unique(workspace_id,storage_path),
  constraint document_upload_sessions_ack_consistency check((state='acknowledged' and acknowledged_at is not null and document_version_id is not null) or state<>'acknowledged')
);
create unique index if not exists document_upload_sessions_one_prepared_version_idx on public.document_upload_sessions(workspace_id,document_id,version_number) where state='prepared';
create index if not exists document_upload_sessions_actor_state_idx on public.document_upload_sessions(workspace_id,created_by,state,created_at desc);

alter table public.document_upload_sessions enable row level security;
revoke all on table public.document_upload_sessions from public,anon,authenticated;

-- Remove the legacy generic browser mutation lane. Phase 10.1 owns document mutation via guarded RPCs.
drop policy if exists documents_insert_workspace on public.documents;
drop policy if exists documents_update_workspace on public.documents;
drop policy if exists document_versions_insert_workspace on public.document_versions;
drop policy if exists document_versions_update_workspace on public.document_versions;
revoke insert,update,delete on table public.documents from anon,authenticated;
revoke insert,update,delete on table public.document_versions from anon,authenticated;

create or replace function private.require_document_vault_member_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_VAULT_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then
    raise insufficient_privilege using message='ENJAZ_VAULT_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;$$;
revoke all on function private.require_document_vault_member_v1(uuid) from public,anon,authenticated;

create or replace function public.prepare_document_upload_v1(
  p_workspace_id uuid,
  p_operation_id uuid,
  p_title text,
  p_original_file_name text,
  p_mime_type text,
  p_byte_size bigint,
  p_document_id uuid default null,
  p_document_type text default null,
  p_company_id uuid default null,
  p_transaction_id uuid default null,
  p_checksum text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_session public.document_upload_sessions%rowtype;
  v_doc public.documents%rowtype;
  v_document_id uuid;
  v_version integer;
  v_path text;
  v_company_id uuid:=p_company_id;
  v_transaction_company uuid;
  v_mime text:=lower(btrim(coalesce(p_mime_type,'')));
  v_file text:=btrim(coalesce(p_original_file_name,''));
  v_title text:=btrim(coalesce(p_title,''));
  v_type text:=nullif(btrim(coalesce(p_document_type,'')),'');
  v_checksum text:=nullif(lower(btrim(coalesce(p_checksum,''))),'');
begin
  v_actor:=private.require_document_vault_member_v1(p_workspace_id);
  if p_operation_id is null then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_REQUIRED'; end if;
  if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_VAULT_TITLE_INVALID'; end if;
  if char_length(v_file) not between 1 and 240 or v_file ~ '[\\/]' or v_file ~ '[[:cntrl:]]' then raise invalid_parameter_value using message='ENJAZ_VAULT_FILE_NAME_INVALID'; end if;
  if p_byte_size is null or p_byte_size<1 or p_byte_size>52428800 then raise invalid_parameter_value using message='ENJAZ_VAULT_SIZE_INVALID'; end if;
  if v_mime not in ('application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise invalid_parameter_value using message='ENJAZ_VAULT_MIME_INVALID'; end if;
  if v_type is not null and char_length(v_type)>120 then raise invalid_parameter_value using message='ENJAZ_VAULT_TYPE_INVALID'; end if;
  if v_checksum is not null and v_checksum !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_VAULT_CHECKSUM_INVALID'; end if;

  select * into v_session from public.document_upload_sessions s where s.id=p_operation_id for update;
  if found then
    if v_session.workspace_id<>p_workspace_id or v_session.created_by<>v_actor or v_session.title<>v_title or v_session.original_file_name<>v_file or lower(v_session.mime_type)<>v_mime or v_session.byte_size<>p_byte_size or (p_document_id is not null and v_session.document_id<>p_document_id) then
      raise serialization_failure using message='ENJAZ_VAULT_OPERATION_DRIFT';
    end if;
    if v_session.state<>'prepared' then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_PREPARED'; end if;
    return jsonb_build_object('schema','enjaz.document-upload-claim.v1','operationId',v_session.id,'documentId',v_session.document_id,'versionNumber',v_session.version_number,'bucket','enjaz-documents-private','path',v_session.storage_path,'title',v_session.title,'fileName',v_session.original_file_name,'mimeType',v_session.mime_type,'byteSize',v_session.byte_size,'checksum',v_session.checksum,'state',v_session.state,'binaryAuthoritative',false,'wasDuplicate',true);
  end if;

  if p_transaction_id is not null then
    select t.company_id into v_transaction_company from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id;
    if not found then raise foreign_key_violation using message='ENJAZ_VAULT_TRANSACTION_NOT_FOUND'; end if;
    if v_company_id is null then v_company_id:=v_transaction_company;
    elsif v_company_id<>v_transaction_company then raise foreign_key_violation using message='ENJAZ_VAULT_TRANSACTION_COMPANY_MISMATCH'; end if;
  end if;
  if v_company_id is not null and not exists(select 1 from public.companies c where c.workspace_id=p_workspace_id and c.id=v_company_id) then
    raise foreign_key_violation using message='ENJAZ_VAULT_COMPANY_NOT_FOUND';
  end if;

  if p_document_id is null then
    v_document_id:=gen_random_uuid();v_version:=1;
    v_path:=format('%s/%s/v%s/%s',p_workspace_id,v_document_id,v_version,p_operation_id);
    insert into public.documents(id,workspace_id,company_id,transaction_id,title,document_type,mime_type,storage_path,size_bytes,original_size_bytes,checksum,status,original_file_name,uploaded_by)
    values(v_document_id,p_workspace_id,v_company_id,p_transaction_id,v_title,v_type,v_mime,v_path,p_byte_size,p_byte_size,v_checksum,'processing',v_file,v_actor)
    returning * into v_doc;
  else
    select * into v_doc from public.documents d where d.workspace_id=p_workspace_id and d.id=p_document_id for update;
    if not found then raise no_data_found using message='ENJAZ_VAULT_DOCUMENT_NOT_FOUND'; end if;
    if v_doc.status='archived' then raise invalid_parameter_value using message='ENJAZ_VAULT_DOCUMENT_ARCHIVED'; end if;
    if exists(select 1 from public.document_upload_sessions s where s.workspace_id=p_workspace_id and s.document_id=p_document_id and s.state='prepared') then
      raise serialization_failure using message='ENJAZ_VAULT_UPLOAD_ALREADY_PENDING';
    end if;
    v_document_id:=v_doc.id;
    select coalesce(max(v.version_number),0)+1 into v_version from public.document_versions v where v.workspace_id=p_workspace_id and v.document_id=v_document_id;
    v_path:=format('%s/%s/v%s/%s',p_workspace_id,v_document_id,v_version,p_operation_id);
  end if;

  insert into public.document_upload_sessions(id,workspace_id,document_id,version_number,title,document_type,company_id,transaction_id,original_file_name,mime_type,byte_size,checksum,storage_path,created_by)
  values(p_operation_id,p_workspace_id,v_document_id,v_version,v_title,v_type,v_company_id,p_transaction_id,v_file,v_mime,p_byte_size,v_checksum,v_path,v_actor)
  returning * into v_session;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.upload.prepared','document',v_document_id,'Document binary upload prepared',jsonb_build_object('operationId',p_operation_id,'versionNumber',v_version,'byteSize',p_byte_size,'mimeType',v_mime,'companyId',v_company_id,'transactionId',p_transaction_id));

  return jsonb_build_object('schema','enjaz.document-upload-claim.v1','operationId',v_session.id,'documentId',v_document_id,'versionNumber',v_version,'bucket','enjaz-documents-private','path',v_path,'title',v_title,'fileName',v_file,'mimeType',v_mime,'byteSize',p_byte_size,'checksum',v_checksum,'state','prepared','binaryAuthoritative',false,'wasDuplicate',false);
end;$$;

create or replace function public.get_document_upload_claim_v1(p_operation_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v public.document_upload_sessions%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_VAULT_AUTH_REQUIRED'; end if;
  select * into v from public.document_upload_sessions s where s.id=p_operation_id and s.created_by=v_actor;
  if not found then raise no_data_found using message='ENJAZ_VAULT_UPLOAD_NOT_FOUND'; end if;
  perform private.require_document_vault_member_v1(v.workspace_id);
  if v.state<>'prepared' then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_PREPARED'; end if;
  return jsonb_build_object('schema','enjaz.document-upload-claim.v1','operationId',v.id,'documentId',v.document_id,'versionNumber',v.version_number,'bucket','enjaz-documents-private','path',v.storage_path,'title',v.title,'fileName',v.original_file_name,'mimeType',v.mime_type,'byteSize',v.byte_size,'checksum',v.checksum,'state',v.state,'binaryAuthoritative',false);
end;$$;

create or replace function public.acknowledge_document_upload_v1(p_operation_id uuid,p_storage_path text,p_actual_byte_size bigint,p_actual_mime_type text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.document_upload_sessions%rowtype;v_version_id uuid;
begin
  select * into v from public.document_upload_sessions s where s.id=p_operation_id for update;
  if not found then raise no_data_found using message='ENJAZ_VAULT_UPLOAD_NOT_FOUND'; end if;
  if v.state='acknowledged' then
    if v.storage_path=p_storage_path and v.byte_size=p_actual_byte_size and lower(v.mime_type)=lower(btrim(p_actual_mime_type)) then
      return jsonb_build_object('schema','enjaz.document-upload-ack.v1','operationId',v.id,'documentId',v.document_id,'versionId',v.document_version_id,'versionNumber',v.version_number,'status','ready','wasDuplicate',true);
    end if;
    raise serialization_failure using message='ENJAZ_VAULT_ACK_DRIFT';
  end if;
  if v.state<>'prepared' then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_PREPARED'; end if;
  if v.expires_at<now() then raise invalid_parameter_value using message='ENJAZ_VAULT_UPLOAD_EXPIRED'; end if;
  if v.storage_path<>p_storage_path then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_PATH_INVALID'; end if;
  if v.byte_size<>p_actual_byte_size then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_SIZE_MISMATCH'; end if;
  if lower(v.mime_type)<>lower(btrim(coalesce(p_actual_mime_type,''))) then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_MIME_MISMATCH'; end if;

  v_version_id:=gen_random_uuid();
  insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum,original_file_name,uploaded_by)
  values(v_version_id,v.workspace_id,v.document_id,v.version_number,v.storage_path,v.mime_type,v.byte_size,v.checksum,v.original_file_name,v.created_by);

  update public.documents d set company_id=v.company_id,transaction_id=v.transaction_id,title=v.title,document_type=v.document_type,mime_type=v.mime_type,storage_path=v.storage_path,size_bytes=v.byte_size,original_size_bytes=coalesce(d.original_size_bytes,v.byte_size),checksum=v.checksum,status='ready',original_file_name=v.original_file_name,uploaded_by=v.created_by,captured_at=coalesce(d.captured_at,now()),archived_at=null,updated_at=now()
  where d.workspace_id=v.workspace_id and d.id=v.document_id;

  update public.document_upload_sessions set state='acknowledged',document_version_id=v_version_id,acknowledged_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,v.created_by,'document.upload.acknowledged','document',v.document_id,'Document binary verified and version acknowledged',jsonb_build_object('operationId',v.id,'versionId',v_version_id,'versionNumber',v.version_number,'storagePath',v.storage_path,'byteSize',v.byte_size,'mimeType',v.mime_type));
  return jsonb_build_object('schema','enjaz.document-upload-ack.v1','operationId',v.id,'documentId',v.document_id,'versionId',v_version_id,'versionNumber',v.version_number,'status','ready','wasDuplicate',false);
end;$$;

create or replace function public.fail_document_upload_v1(p_operation_id uuid,p_failure_code text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.document_upload_sessions%rowtype;v_code text:=left(btrim(coalesce(p_failure_code,'UNKNOWN')),120);
begin
  select * into v from public.document_upload_sessions s where s.id=p_operation_id for update;
  if not found or v.state<>'prepared' then return; end if;
  update public.document_upload_sessions set state='failed',failed_at=now(),failure_code=v_code where id=v.id;
  if not exists(select 1 from public.document_versions dv where dv.workspace_id=v.workspace_id and dv.document_id=v.document_id) then
    update public.documents set status='failed',updated_at=now() where workspace_id=v.workspace_id and id=v.document_id and status='processing';
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,v.created_by,'document.upload.failed','document',v.document_id,'Document upload failed before acknowledgement',jsonb_build_object('operationId',v.id,'versionNumber',v.version_number,'failureCode',v_code));
end;$$;

create or replace function public.get_document_vault_v1(p_workspace_id uuid,p_query text default null,p_include_archived boolean default false,p_limit integer default 50,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_query text:=nullif(btrim(coalesce(p_query,'')),'');v_rows jsonb;v_total bigint;
begin
  perform private.require_document_vault_member_v1(p_workspace_id);
  if p_limit not between 1 and 100 or p_offset<0 then raise invalid_parameter_value using message='ENJAZ_VAULT_WINDOW_INVALID'; end if;
  if v_query is not null and char_length(v_query)>120 then raise invalid_parameter_value using message='ENJAZ_VAULT_QUERY_INVALID'; end if;
  select count(*) into v_total from public.documents d where d.workspace_id=p_workspace_id and (p_include_archived or d.status<>'archived') and (v_query is null or lower(d.title) like '%'||lower(v_query)||'%' or lower(coalesce(d.original_file_name,'')) like '%'||lower(v_query)||'%' or lower(coalesce(d.document_type,'')) like '%'||lower(v_query)||'%');
  select coalesce(jsonb_agg(x.obj order by x.updated_at desc),'[]'::jsonb) into v_rows from (
    select d.updated_at,jsonb_build_object('id',d.id,'title',d.title,'documentType',d.document_type,'fileName',d.original_file_name,'mimeType',d.mime_type,'sizeBytes',d.size_bytes,'status',d.status,'companyId',d.company_id,'companyName',c.legal_name,'transactionId',d.transaction_id,'transactionLabel',t.type,'createdAt',d.created_at,'updatedAt',d.updated_at,'capturedAt',d.captured_at,'archivedAt',d.archived_at,'currentVersion',coalesce((select max(v.version_number) from public.document_versions v where v.workspace_id=d.workspace_id and v.document_id=d.id),0),'versionCount',(select count(*) from public.document_versions v where v.workspace_id=d.workspace_id and v.document_id=d.id)) obj
    from public.documents d left join public.companies c on c.workspace_id=d.workspace_id and c.id=d.company_id left join public.transactions t on t.workspace_id=d.workspace_id and t.id=d.transaction_id
    where d.workspace_id=p_workspace_id and (p_include_archived or d.status<>'archived') and (v_query is null or lower(d.title) like '%'||lower(v_query)||'%' or lower(coalesce(d.original_file_name,'')) like '%'||lower(v_query)||'%' or lower(coalesce(d.document_type,'')) like '%'||lower(v_query)||'%')
    order by d.updated_at desc limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('schema','enjaz.document-vault.v1','workspaceId',p_workspace_id,'total',v_total,'offset',p_offset,'limit',p_limit,'documents',v_rows);
end;$$;

create or replace function public.get_document_detail_v1(p_workspace_id uuid,p_document_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.documents%rowtype;v_versions jsonb;
begin
  perform private.require_document_vault_member_v1(p_workspace_id);
  select * into d from public.documents x where x.workspace_id=p_workspace_id and x.id=p_document_id;
  if not found then raise no_data_found using message='ENJAZ_VAULT_DOCUMENT_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'versionNumber',v.version_number,'fileName',v.original_file_name,'mimeType',v.mime_type,'sizeBytes',v.size_bytes,'checksum',v.checksum,'createdAt',v.created_at,'uploadedBy',v.uploaded_by) order by v.version_number desc),'[]'::jsonb) into v_versions from public.document_versions v where v.workspace_id=p_workspace_id and v.document_id=p_document_id;
  return jsonb_build_object('schema','enjaz.document-detail.v1','document',jsonb_build_object('id',d.id,'title',d.title,'documentType',d.document_type,'fileName',d.original_file_name,'mimeType',d.mime_type,'sizeBytes',d.size_bytes,'status',d.status,'companyId',d.company_id,'transactionId',d.transaction_id,'createdAt',d.created_at,'updatedAt',d.updated_at,'capturedAt',d.captured_at,'archivedAt',d.archived_at),'versions',v_versions);
end;$$;

create or replace function public.get_document_download_claim_v1(p_workspace_id uuid,p_document_id uuid,p_version_number integer default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.documents%rowtype;v public.document_versions%rowtype;
begin
  perform private.require_document_vault_member_v1(p_workspace_id);
  select * into d from public.documents x where x.workspace_id=p_workspace_id and x.id=p_document_id;
  if not found then raise no_data_found using message='ENJAZ_VAULT_DOCUMENT_NOT_FOUND'; end if;
  select * into v from public.document_versions x where x.workspace_id=p_workspace_id and x.document_id=p_document_id and (p_version_number is null or x.version_number=p_version_number) order by x.version_number desc limit 1;
  if not found then raise no_data_found using message='ENJAZ_VAULT_VERSION_NOT_FOUND'; end if;
  return jsonb_build_object('schema','enjaz.document-download-claim.v1','documentId',d.id,'versionId',v.id,'versionNumber',v.version_number,'bucket','enjaz-documents-private','path',v.storage_path,'fileName',coalesce(v.original_file_name,d.original_file_name,d.title),'mimeType',v.mime_type,'sizeBytes',v.size_bytes);
end;$$;

create or replace function public.archive_document_v1(p_workspace_id uuid,p_document_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;d public.documents%rowtype;
begin
  v_actor:=private.require_document_vault_member_v1(p_workspace_id);
  select * into d from public.documents x where x.workspace_id=p_workspace_id and x.id=p_document_id for update;
  if not found then raise no_data_found using message='ENJAZ_VAULT_DOCUMENT_NOT_FOUND'; end if;
  if d.status='processing' then raise invalid_parameter_value using message='ENJAZ_VAULT_UPLOAD_PENDING'; end if;
  if d.status='archived' then return jsonb_build_object('schema','enjaz.document-archive.v1','documentId',d.id,'status','archived','wasDuplicate',true); end if;
  update public.documents set status='archived',archived_at=now(),updated_at=now() where workspace_id=p_workspace_id and id=p_document_id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'document.archived','document',p_document_id,'Document archived without deleting binary history','{}'::jsonb);
  return jsonb_build_object('schema','enjaz.document-archive.v1','documentId',d.id,'status','archived','wasDuplicate',false);
end;$$;

revoke all on function public.prepare_document_upload_v1(uuid,uuid,text,text,text,bigint,uuid,text,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.get_document_upload_claim_v1(uuid) from public,anon,authenticated;
revoke all on function public.acknowledge_document_upload_v1(uuid,text,bigint,text) from public,anon,authenticated;
revoke all on function public.fail_document_upload_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.get_document_vault_v1(uuid,text,boolean,integer,integer) from public,anon,authenticated;
revoke all on function public.get_document_detail_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_document_download_claim_v1(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.archive_document_v1(uuid,uuid) from public,anon,authenticated;

grant execute on function public.prepare_document_upload_v1(uuid,uuid,text,text,text,bigint,uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.get_document_upload_claim_v1(uuid) to authenticated;
grant execute on function public.get_document_vault_v1(uuid,text,boolean,integer,integer) to authenticated;
grant execute on function public.get_document_detail_v1(uuid,uuid) to authenticated;
grant execute on function public.get_document_download_claim_v1(uuid,uuid,integer) to authenticated;
grant execute on function public.archive_document_v1(uuid,uuid) to authenticated;
grant execute on function public.acknowledge_document_upload_v1(uuid,text,bigint,text) to service_role;
grant execute on function public.fail_document_upload_v1(uuid,text) to service_role;

commit;
