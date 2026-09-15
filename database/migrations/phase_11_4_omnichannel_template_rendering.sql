-- ENJAZ Phase 11.4-C — governed template + merge-field rendering.
-- Merge fields are generation inputs only. Rendered subject/body flow into the existing
-- immutable outbound command authority and approval gate; merge-field payload is not stored
-- as provider metadata or a second content authority.

begin;

create or replace function private.render_communication_template_text_v1(
  p_template text,
  p_fields jsonb,
  p_max_length integer
)
returns text
language plpgsql
immutable
security invoker
set search_path=''
as $$
declare
  v_result text:=coalesce(p_template,'');
  v_match text[];
  v_key text;
  v_value jsonb;
  v_scalar text;
begin
  if jsonb_typeof(coalesce(p_fields,'{}'::jsonb))<>'object' then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_MERGE_FIELDS_OBJECT_REQUIRED';
  end if;
  if p_max_length is null or p_max_length<1 then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_RENDER_LIMIT_INVALID';
  end if;

  for v_match in
    select regexp_matches(v_result,'({{[[:space:]]*([A-Za-z0-9_.-]+)[[:space:]]*}})','g')
  loop
    v_key:=v_match[2];
    if not (p_fields ? v_key) then
      raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_MERGE_FIELD_MISSING:'||v_key;
    end if;
    v_value:=p_fields->v_key;
    if jsonb_typeof(v_value) not in ('string','number','boolean') then
      raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_MERGE_FIELD_SCALAR_REQUIRED:'||v_key;
    end if;
    v_scalar:=case when jsonb_typeof(v_value)='string' then v_value#>>'{}' else v_value::text end;
    v_result:=replace(v_result,v_match[1],v_scalar);
  end loop;

  if v_result ~ '{{[[:space:]]*[A-Za-z0-9_.-]+[[:space:]]*}}' then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_UNRESOLVED_FIELD';
  end if;
  if char_length(v_result)>p_max_length then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_RENDER_TOO_LONG';
  end if;
  return v_result;
end;
$$;

create or replace function private.prepare_communication_outbound_from_template_v1_impl(
  p_workspace_id uuid,
  p_provider_account_id uuid,
  p_idempotency_key text,
  p_endpoint_fingerprint text,
  p_contact_id uuid,
  p_transaction_id uuid,
  p_conversation_id uuid,
  p_template_id uuid,
  p_template_version integer,
  p_merge_fields jsonb,
  p_summary text,
  p_document_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_template public.communication_templates%rowtype;
  v_subject text;
  v_body text;
begin
  if p_template_id is null or p_template_version is null then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_REQUIRED';
  end if;

  select * into v_template
  from public.communication_templates t
  where t.workspace_id=p_workspace_id and t.id=p_template_id;
  if not found or not v_template.active then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TEMPLATE_INVALID';
  end if;
  if v_template.version<>p_template_version then
    raise serialization_failure using message='ENJAZ_COMMUNICATION_TEMPLATE_VERSION_STALE';
  end if;

  v_subject:=case
    when v_template.subject_template is null then null
    else private.render_communication_template_text_v1(v_template.subject_template,p_merge_fields,998)
  end;
  v_body:=private.render_communication_template_text_v1(v_template.body_template,p_merge_fields,200000);

  return private.prepare_communication_outbound_v1_impl(
    p_workspace_id,p_provider_account_id,p_idempotency_key,p_endpoint_fingerprint,
    p_contact_id,p_transaction_id,p_conversation_id,p_template_id,p_template_version,
    v_subject,v_body,p_summary,p_document_ids
  );
end;
$$;

create or replace function public.prepare_communication_outbound_from_template_v1(
  p_workspace_id uuid,
  p_provider_account_id uuid,
  p_idempotency_key text,
  p_endpoint_fingerprint text,
  p_contact_id uuid,
  p_transaction_id uuid,
  p_conversation_id uuid,
  p_template_id uuid,
  p_template_version integer,
  p_merge_fields jsonb,
  p_summary text,
  p_document_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.prepare_communication_outbound_from_template_v1_impl(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
  );
$$;

revoke all on function private.render_communication_template_text_v1(text,jsonb,integer) from public,anon,authenticated,service_role;
revoke all on function private.prepare_communication_outbound_from_template_v1_impl(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,jsonb,text,uuid[]) from public,anon,service_role;
grant execute on function private.prepare_communication_outbound_from_template_v1_impl(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,jsonb,text,uuid[]) to authenticated;
revoke all on function public.prepare_communication_outbound_from_template_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,jsonb,text,uuid[]) from public,anon,service_role;
grant execute on function public.prepare_communication_outbound_from_template_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,jsonb,text,uuid[]) to authenticated;

commit;
