-- ENJAZ Phase 11.4-C — provider attachment registration into canonical Document Vault.
-- Edge transport verifies binary bytes and stores them in the private vault bucket first.
-- This service-role-only RPC registers the verified binary as canonical document/version truth
-- and links it to the canonical communication without creating a shadow attachment store.

begin;

create or replace function public.register_communication_provider_attachment_v1(
  p_workspace_id uuid,
  p_communication_id uuid,
  p_document_id uuid,
  p_storage_path text,
  p_title text,
  p_file_name text,
  p_mime_type text,
  p_byte_size bigint,
  p_checksum text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path=''
as $$
declare
  v_comm public.communications%rowtype;
  v_mime text:=lower(btrim(coalesce(p_mime_type,'')));
  v_checksum text:=lower(btrim(coalesce(p_checksum,'')));
  v_title text:=btrim(coalesce(p_title,''));
  v_file text:=btrim(coalesce(p_file_name,''));
  v_version_id uuid:=gen_random_uuid();
begin
  if p_document_id is null then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_DOCUMENT_ID_REQUIRED'; end if;
  if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_TITLE_INVALID'; end if;
  if char_length(v_file) not between 1 and 240 or v_file ~ '[\\/]' or v_file ~ '[[:cntrl:]]' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_FILE_NAME_INVALID'; end if;
  if char_length(btrim(coalesce(p_storage_path,''))) not between 1 and 1200 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_STORAGE_PATH_INVALID'; end if;
  if p_storage_path not like p_workspace_id::text||'/communication-attachments/'||p_communication_id::text||'/%' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_STORAGE_SCOPE_INVALID'; end if;
  if p_byte_size is null or p_byte_size<1 or p_byte_size>52428800 then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_SIZE_INVALID'; end if;
  if v_mime not in ('application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_MIME_INVALID'; end if;
  if v_checksum !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_CHECKSUM_INVALID'; end if;

  select * into v_comm from public.communications c
  where c.workspace_id=p_workspace_id and c.id=p_communication_id;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_NOT_FOUND'; end if;
  if v_comm.direction<>'incoming' then raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_ATTACHMENT_INCOMING_ONLY'; end if;

  if exists(select 1 from public.documents d where d.workspace_id=p_workspace_id and d.id=p_document_id) then
    if exists(select 1 from public.communication_document_links l where l.workspace_id=p_workspace_id and l.communication_id=p_communication_id and l.document_id=p_document_id) then
      return jsonb_build_object('documentId',p_document_id,'communicationId',p_communication_id,'wasDuplicate',true);
    end if;
    raise unique_violation using message='ENJAZ_COMMUNICATION_ATTACHMENT_DOCUMENT_CONFLICT';
  end if;

  insert into public.documents(
    id,workspace_id,company_id,transaction_id,title,document_type,mime_type,storage_path,size_bytes,
    original_size_bytes,checksum,status,captured_at,original_file_name,uploaded_by
  ) values(
    p_document_id,p_workspace_id,v_comm.company_id,v_comm.transaction_id,v_title,'communication_attachment',v_mime,
    p_storage_path,p_byte_size,p_byte_size,v_checksum,'ready',now(),v_file,null
  );

  insert into public.document_versions(
    id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum,original_file_name,uploaded_by
  ) values(
    v_version_id,p_workspace_id,p_document_id,1,p_storage_path,v_mime,p_byte_size,v_checksum,v_file,null
  );

  insert into public.communication_document_links(workspace_id,communication_id,document_id,created_by)
  values(p_workspace_id,p_communication_id,p_document_id,null);

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,null,'communication.attachment.imported','document',p_document_id,
    'Inbound provider attachment imported into Document Vault',
    jsonb_build_object('communicationId',p_communication_id,'versionId',v_version_id,'storagePath',p_storage_path,'mimeType',v_mime,'byteSize',p_byte_size,'checksum',v_checksum)
  );

  return jsonb_build_object('documentId',p_document_id,'versionId',v_version_id,'communicationId',p_communication_id,'wasDuplicate',false);
end;
$$;

revoke all on function public.register_communication_provider_attachment_v1(uuid,uuid,uuid,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.register_communication_provider_attachment_v1(uuid,uuid,uuid,text,text,text,text,bigint,text) to service_role;

commit;
