-- ENJAZ Phase 8.4 — intake validator shadowing hardening
begin;
create or replace function private.validate_intake_payload_v1(p_workspace_id uuid,p_form_id uuid,p_answers jsonb,p_files jsonb,p_finalize boolean)
returns void language plpgsql stable security definer set search_path='' as $$
declare v_field record; v_value jsonb; v_file jsonb; v_count integer; v_allowed jsonb; v_max bigint;
begin
  if jsonb_typeof(p_answers)<>'object' or jsonb_typeof(p_files)<>'array' then raise invalid_parameter_value using message='ENJAZ_INTAKE_PAYLOAD_INVALID'; end if;
  for v_field in select * from public.intake_form_fields x where x.workspace_id=p_workspace_id and x.form_id=p_form_id order by x.position loop
    v_value:=p_answers->v_field.field_key;
    if p_finalize and v_field.required and v_field.field_type<>'file' and (v_value is null or jsonb_typeof(v_value)<>'string' or char_length(btrim(v_value#>>'{}'))=0) then raise invalid_parameter_value using message='ENJAZ_INTAKE_REQUIRED_FIELD_MISSING'; end if;
    if v_value is not null and v_field.field_type<>'file' then
      if jsonb_typeof(v_value)<>'string' or char_length(v_value#>>'{}')>4000 then raise invalid_parameter_value using message='ENJAZ_INTAKE_FIELD_INVALID'; end if;
      if v_field.field_type='email' and (v_value#>>'{}') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise invalid_parameter_value using message='ENJAZ_INTAKE_EMAIL_INVALID'; end if;
      if v_field.field_type='phone' and char_length(regexp_replace(v_value#>>'{}','[^0-9+]','','g'))<6 then raise invalid_parameter_value using message='ENJAZ_INTAKE_PHONE_INVALID'; end if;
      if v_field.field_type='select' and jsonb_typeof(v_field.config->'options')='array' and not (v_field.config->'options' ? (v_value#>>'{}')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_SELECT_INVALID'; end if;
    end if;
    if v_field.field_type='file' then
      select count(*) into v_count from jsonb_array_elements(p_files) q where q->>'fieldKey'=v_field.field_key;
      if p_finalize and v_field.required and v_count=0 then raise invalid_parameter_value using message='ENJAZ_INTAKE_REQUIRED_FILE_MISSING'; end if;
      v_allowed:=coalesce(v_field.config->'allowedMimeTypes','["application/pdf","image/jpeg","image/png"]'::jsonb);
      v_max:=coalesce((v_field.config->>'maxBytes')::bigint,10485760);
      for v_file in select value from jsonb_array_elements(p_files) loop
        if v_file->>'fieldKey'=v_field.field_key then
          if jsonb_typeof(v_file)<>'object' or char_length(btrim(coalesce(v_file->>'fileName','')))=0 or coalesce((v_file->>'byteSize')::bigint,0)<1 or (v_file->>'byteSize')::bigint>least(v_max,52428800) then raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_INVALID'; end if;
          if jsonb_typeof(v_allowed)<>'array' or not (v_allowed ? coalesce(v_file->>'mimeType','')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_MIME_FORBIDDEN'; end if;
        end if;
      end loop;
    end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from public.intake_form_fields fld where fld.workspace_id=p_workspace_id and fld.form_id=p_form_id and fld.field_key=k)) then raise invalid_parameter_value using message='ENJAZ_INTAKE_UNKNOWN_FIELD'; end if;
  if exists(select 1 from jsonb_array_elements(p_files) q where not exists(select 1 from public.intake_form_fields fld where fld.workspace_id=p_workspace_id and fld.form_id=p_form_id and fld.field_type='file' and fld.field_key=q->>'fieldKey')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_UNKNOWN_FILE_FIELD'; end if;
end; $$;
revoke all on function private.validate_intake_payload_v1(uuid,uuid,jsonb,jsonb,boolean) from public,anon;
commit;
