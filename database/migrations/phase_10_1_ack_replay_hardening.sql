-- ENJAZ Phase 10.1 — acknowledgement replay hardening
-- Allows the authenticated uploader to recover the immutable upload claim after
-- successful acknowledgement so the Edge broker can route replay to the
-- already duplicate-safe service acknowledgement RPC.
begin;

create or replace function public.get_document_upload_claim_v1(p_operation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v public.document_upload_sessions%rowtype;
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_VAULT_AUTH_REQUIRED';
  end if;

  select * into v
  from public.document_upload_sessions s
  where s.id=p_operation_id and s.created_by=v_actor;

  if not found then
    raise no_data_found using message='ENJAZ_VAULT_UPLOAD_NOT_FOUND';
  end if;

  perform private.require_document_vault_member_v1(v.workspace_id);

  if v.state not in ('prepared','acknowledged') then
    raise invalid_parameter_value using message='ENJAZ_VAULT_OPERATION_NOT_REPLAYABLE';
  end if;

  return jsonb_build_object(
    'schema','enjaz.document-upload-claim.v1',
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
    'binaryAuthoritative',(v.state='acknowledged')
  );
end;
$$;

revoke all on function public.get_document_upload_claim_v1(uuid) from public,anon;
grant execute on function public.get_document_upload_claim_v1(uuid) to authenticated,service_role;

commit;
