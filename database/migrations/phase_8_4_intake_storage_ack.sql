-- ENJAZ Phase 8.4 — secure intake Storage acknowledgement boundary
-- Browser/anon never writes storage_path or upload_status directly.
-- Only the backend service role may prepare/acknowledge an upload after validating the live intake token.
begin;

create or replace function public.prepare_intake_file_upload_v1(p_token text,p_file_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_link public.intake_links%rowtype;
  v_submission public.intake_submissions%rowtype;
  v_file public.intake_submission_files%rowtype;
  v_path text;
begin
  v_link:=private.require_live_intake_link_v1(p_token);
  select * into v_submission
  from public.intake_submissions s
  where s.workspace_id=v_link.workspace_id and s.link_id=v_link.id;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_SUBMISSION_NOT_FOUND'; end if;
  if v_submission.status not in ('draft','submitted','under_review') then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_UPLOAD_SUBMISSION_STATE_INVALID';
  end if;

  select * into v_file
  from public.intake_submission_files f
  where f.workspace_id=v_link.workspace_id and f.submission_id=v_submission.id and f.id=p_file_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FILE_NOT_FOUND'; end if;
  if v_file.upload_status<>'pending_upload' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_STATE_INVALID';
  end if;

  -- Path contains only server-generated UUIDs. The original file name is never exposed in the object key.
  v_path:=format('%s/%s/%s',v_link.workspace_id,v_submission.id,v_file.id);
  if v_file.storage_path is not null and v_file.storage_path<>v_path then
    raise serialization_failure using message='ENJAZ_INTAKE_STORAGE_PATH_DRIFT';
  end if;

  update public.intake_submission_files
  set storage_path=v_path
  where workspace_id=v_link.workspace_id and id=v_file.id;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v_link.workspace_id,null,'intake.file.upload_prepared','intake_submission_file',v_file.id,'Secure intake upload prepared',jsonb_build_object('submissionId',v_submission.id,'fieldKey',v_file.field_key,'byteSize',v_file.byte_size,'mimeType',v_file.mime_type));

  return jsonb_build_object(
    'fileId',v_file.id,
    'submissionId',v_submission.id,
    'bucket','enjaz-intake-private',
    'path',v_path,
    'byteSize',v_file.byte_size,
    'mimeType',v_file.mime_type,
    'uploadStatus','pending_upload',
    'authoritative',false
  );
end;
$$;

create or replace function public.acknowledge_intake_file_upload_v1(
  p_token text,
  p_file_id uuid,
  p_storage_path text,
  p_actual_byte_size bigint,
  p_actual_mime_type text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_link public.intake_links%rowtype;
  v_submission public.intake_submissions%rowtype;
  v_file public.intake_submission_files%rowtype;
begin
  v_link:=private.require_live_intake_link_v1(p_token);
  select * into v_submission
  from public.intake_submissions s
  where s.workspace_id=v_link.workspace_id and s.link_id=v_link.id;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_SUBMISSION_NOT_FOUND'; end if;
  if v_submission.status not in ('draft','submitted','under_review') then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_UPLOAD_SUBMISSION_STATE_INVALID';
  end if;

  select * into v_file
  from public.intake_submission_files f
  where f.workspace_id=v_link.workspace_id and f.submission_id=v_submission.id and f.id=p_file_id
  for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FILE_NOT_FOUND'; end if;

  if v_file.upload_status='acknowledged' then
    if v_file.storage_path=p_storage_path and v_file.byte_size=p_actual_byte_size and lower(v_file.mime_type)=lower(p_actual_mime_type) then
      return jsonb_build_object('fileId',v_file.id,'uploadStatus','acknowledged','authoritative',false,'wasDuplicate',true);
    end if;
    raise serialization_failure using message='ENJAZ_INTAKE_ACK_METADATA_DRIFT';
  end if;
  if v_file.upload_status<>'pending_upload' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_STATE_INVALID';
  end if;
  if v_file.storage_path is null or v_file.storage_path<>p_storage_path then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_STORAGE_PATH_INVALID';
  end if;
  if p_actual_byte_size is null or p_actual_byte_size<>v_file.byte_size then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_STORAGE_SIZE_MISMATCH';
  end if;
  if p_actual_mime_type is null or lower(btrim(p_actual_mime_type))<>lower(v_file.mime_type) then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_STORAGE_MIME_MISMATCH';
  end if;

  update public.intake_submission_files
  set upload_status='acknowledged',acknowledged_at=now()
  where workspace_id=v_link.workspace_id and id=v_file.id
  returning * into v_file;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v_link.workspace_id,null,'intake.file.upload_acknowledged','intake_submission_file',v_file.id,'Secure intake upload acknowledged after Storage verification',jsonb_build_object('submissionId',v_submission.id,'storagePath',v_file.storage_path,'byteSize',v_file.byte_size,'mimeType',v_file.mime_type));

  return jsonb_build_object('fileId',v_file.id,'uploadStatus',v_file.upload_status,'acknowledgedAt',v_file.acknowledged_at,'authoritative',false,'wasDuplicate',false);
end;
$$;

revoke all on function public.prepare_intake_file_upload_v1(text,uuid) from public,anon,authenticated;
revoke all on function public.acknowledge_intake_file_upload_v1(text,uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.prepare_intake_file_upload_v1(text,uuid) to service_role;
grant execute on function public.acknowledge_intake_file_upload_v1(text,uuid,text,bigint,text) to service_role;

commit;
