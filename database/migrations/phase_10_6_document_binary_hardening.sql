-- ENJAZ Phase 10.6 — checksum-bound document acknowledgement + replay recovery
begin;

create or replace function public.get_document_upload_claim_v2(p_operation_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v public.document_upload_sessions%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_VAULT_AUTH_REQUIRED'; end if;
  select * into v from public.document_upload_sessions s where s.id=p_operation_id and s.created_by=v_actor;
  if not found then raise no_data_found using message='ENJAZ_VAULT_UPLOAD_NOT_FOUND'; end if;
  perform private.require_document_vault_member_v1(v.workspace_id);
  if v.state not in ('prepared','acknowledged') then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_RECOVERABLE'; end if;
  return jsonb_build_object(
    'schema','enjaz.document-upload-claim.v2',
    'operationId',v.id,
    'documentId',v.document_id,
    'versionNumber',v.version_number,
    'bucket','enjaz-documents-private',
    'path',v.storage_path,
    'title',v.title,
    'fileName',v.original_file_name,
    'mimeType',v.mime_type,
    'byteSize',v.byte_size,
    'checksum',v.checksum,
    'state',v.state,
    'binaryAuthoritative',v.state='acknowledged'
  );
end;$$;

revoke all on function public.get_document_upload_claim_v2(uuid) from public,anon;
grant execute on function public.get_document_upload_claim_v2(uuid) to authenticated;

create or replace function public.acknowledge_document_upload_v2(
  p_operation_id uuid,
  p_storage_path text,
  p_actual_byte_size bigint,
  p_actual_mime_type text,
  p_actual_checksum text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v public.document_upload_sessions%rowtype;
  v_version_id uuid;
  v_checksum text:=lower(btrim(coalesce(p_actual_checksum,'')));
begin
  if v_checksum !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_CHECKSUM_INVALID'; end if;
  select * into v from public.document_upload_sessions s where s.id=p_operation_id for update;
  if not found then raise no_data_found using message='ENJAZ_VAULT_UPLOAD_NOT_FOUND'; end if;

  if v.state='acknowledged' then
    if v.storage_path=p_storage_path
      and v.byte_size=p_actual_byte_size
      and lower(v.mime_type)=lower(btrim(coalesce(p_actual_mime_type,'')))
      and coalesce(v.checksum,v_checksum)=v_checksum then
      return jsonb_build_object('schema','enjaz.document-upload-ack.v1','operationId',v.id,'documentId',v.document_id,'versionId',v.document_version_id,'versionNumber',v.version_number,'status','ready','wasDuplicate',true,'checksum',v_checksum);
    end if;
    raise serialization_failure using message='ENJAZ_VAULT_ACK_DRIFT';
  end if;

  if v.state<>'prepared' then raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_PREPARED'; end if;
  if v.expires_at<now() then raise invalid_parameter_value using message='ENJAZ_VAULT_UPLOAD_EXPIRED'; end if;
  if v.storage_path<>p_storage_path then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_PATH_INVALID'; end if;
  if v.byte_size<>p_actual_byte_size then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_SIZE_MISMATCH'; end if;
  if lower(v.mime_type)<>lower(btrim(coalesce(p_actual_mime_type,''))) then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_MIME_MISMATCH'; end if;
  if v.checksum is not null and lower(v.checksum)<>v_checksum then raise invalid_parameter_value using message='ENJAZ_VAULT_STORAGE_CHECKSUM_MISMATCH'; end if;

  v_version_id:=gen_random_uuid();
  insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum,original_file_name,uploaded_by)
  values(v_version_id,v.workspace_id,v.document_id,v.version_number,v.storage_path,v.mime_type,v.byte_size,v_checksum,v.original_file_name,v.created_by);

  update public.documents d set
    company_id=v.company_id,
    transaction_id=v.transaction_id,
    title=v.title,
    document_type=v.document_type,
    mime_type=v.mime_type,
    storage_path=v.storage_path,
    size_bytes=v.byte_size,
    original_size_bytes=coalesce(d.original_size_bytes,v.byte_size),
    checksum=v_checksum,
    status='ready',
    original_file_name=v.original_file_name,
    uploaded_by=v.created_by,
    captured_at=coalesce(d.captured_at,now()),
    archived_at=null,
    updated_at=now()
  where d.workspace_id=v.workspace_id and d.id=v.document_id;

  update public.document_upload_sessions set
    state='acknowledged',
    checksum=v_checksum,
    document_version_id=v_version_id,
    acknowledged_at=now()
  where id=v.id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,v.created_by,'document.upload.acknowledged','document',v.document_id,'Document binary verified, checksum-bound and version acknowledged',jsonb_build_object('operationId',v.id,'versionId',v_version_id,'versionNumber',v.version_number,'storagePath',v.storage_path,'byteSize',v.byte_size,'mimeType',v.mime_type,'checksum',v_checksum,'binarySafety','phase10.6'));

  return jsonb_build_object('schema','enjaz.document-upload-ack.v1','operationId',v.id,'documentId',v.document_id,'versionId',v_version_id,'versionNumber',v.version_number,'status','ready','wasDuplicate',false,'checksum',v_checksum);
end;$$;

revoke all on function public.acknowledge_document_upload_v2(uuid,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.acknowledge_document_upload_v2(uuid,text,bigint,text,text) to service_role;

commit;
