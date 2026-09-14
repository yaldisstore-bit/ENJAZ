-- ENJAZ Phase 10.3 — Document Factory governed runtime
-- Server-owned template authoring, authoritative fact resolution, deterministic compilation,
-- review/approval lifecycle. Finalization authority is added only by the render-proof migration.
begin;

create or replace function private.validate_document_factory_template_v1(
  p_body_source text,
  p_token_schema jsonb
) returns void language plpgsql immutable set search_path='' as $$
declare
  v_key text;
  v_desc jsonb;
  v_source text;
  v_field text;
  v_match text[];
begin
  if p_body_source is null or char_length(p_body_source) not between 1 and 1000000 then
    raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_BODY_INVALID';
  end if;
  if p_token_schema is null or jsonb_typeof(p_token_schema)<>'object' then
    raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_SCHEMA_INVALID';
  end if;

  for v_key,v_desc in select key,value from jsonb_each(p_token_schema) loop
    if v_key !~ '^[A-Za-z][A-Za-z0-9_.-]{0,127}$' then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_NAME_INVALID';
    end if;
    if jsonb_typeof(v_desc)<>'object' then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_DESCRIPTOR_INVALID';
    end if;
    v_source:=lower(btrim(coalesce(v_desc->>'source','')));
    v_field:=lower(btrim(coalesce(v_desc->>'field','')));
    if v_source not in ('company','transaction','contact','ocr') then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_SOURCE_INVALID';
    end if;
    if v_field !~ '^[a-z][a-z0-9_]{0,63}$' then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_FIELD_INVALID';
    end if;
    if v_desc ? 'required' and jsonb_typeof(v_desc->'required')<>'boolean' then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_REQUIRED_INVALID';
    end if;
    if v_source='company' and v_field not in ('legal_name','display_name','capital','address','registration_number','legal_status') then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_COMPANY_FIELD_INVALID';
    end if;
    if v_source='transaction' and v_field not in ('type','department','status','priority','current_fee') then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TRANSACTION_FIELD_INVALID';
    end if;
    if v_source='contact' and v_field not in ('display_name','phone','email') then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_CONTACT_FIELD_INVALID';
    end if;
  end loop;

  for v_match in select regexp_matches(p_body_source,'\{\{([A-Za-z][A-Za-z0-9_.-]{0,127})\}\}','g') loop
    if not (p_token_schema ? v_match[1]) then
      raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_UNDECLARED_TOKEN';
    end if;
  end loop;
  if regexp_replace(p_body_source,'\{\{[A-Za-z][A-Za-z0-9_.-]{0,127}\}\}','','g') ~ '\{\{|\}\}' then
    raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TOKEN_SYNTAX_INVALID';
  end if;
end;$$;
revoke all on function private.validate_document_factory_template_v1(text,jsonb) from public,anon,authenticated;

-- Logical templates are now owner-governed too; browser table writes are closed.
drop policy if exists document_templates_insert_workspace on public.document_templates;
drop policy if exists document_templates_update_workspace on public.document_templates;
revoke insert,update,delete on table public.document_templates from public,anon,authenticated;
grant select on table public.document_templates to authenticated;

create or replace function public.save_document_template_v1(
  p_workspace_id uuid,
  p_template_id uuid,
  p_name text,
  p_kind text,
  p_body_source text,
  p_token_schema jsonb,
  p_active boolean default true
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_existing_workspace uuid;
  v_name text:=btrim(coalesce(p_name,''));
  v_kind text:=btrim(coalesce(p_kind,''));
  v_existing boolean:=false;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  if p_template_id is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_ID_REQUIRED'; end if;
  if char_length(v_name) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_NAME_INVALID'; end if;
  if char_length(v_kind) not between 1 and 120 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_KIND_INVALID'; end if;
  perform private.validate_document_factory_template_v1(p_body_source,p_token_schema);

  select t.workspace_id into v_existing_workspace from public.document_templates t where t.id=p_template_id for update;
  if found then
    v_existing:=true;
    if v_existing_workspace<>p_workspace_id then raise insufficient_privilege using message='ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN'; end if;
    update public.document_templates
      set name=v_name,kind=v_kind,body_source=p_body_source,token_schema=p_token_schema,active=coalesce(p_active,true),updated_at=now()
      where id=p_template_id;
  else
    insert into public.document_templates(id,workspace_id,name,kind,body_source,token_schema,active)
    values(p_template_id,p_workspace_id,v_name,v_kind,p_body_source,p_token_schema,coalesce(p_active,true));
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,
    case when v_existing then 'document.template.updated' else 'document.template.created' end,
    'document_template',p_template_id,
    case when v_existing then 'Document template working copy updated' else 'Document template created' end,
    jsonb_build_object('kind',v_kind,'active',coalesce(p_active,true)));

  return jsonb_build_object('schema','enjaz.document-template.v1','templateId',p_template_id,'name',v_name,'kind',v_kind,'active',coalesce(p_active,true),'wasUpdate',v_existing);
end;$$;
revoke all on function public.save_document_template_v1(uuid,uuid,text,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_document_template_v1(uuid,uuid,text,text,text,jsonb,boolean) to authenticated;

-- Upgrade the existing immutable-version RPCs with the runtime token contract.
create or replace function public.create_document_template_version_v1(
  p_workspace_id uuid,p_request_id uuid,p_template_id uuid,p_body_source text,p_token_schema jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v_template public.document_templates%rowtype;v_existing public.document_template_versions%rowtype;v_version integer;v_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  if p_request_id is null or p_template_id is null then raise invalid_parameter_value using message='ENJAZ_TEMPLATE_VERSION_REQUEST_INVALID'; end if;
  perform private.validate_document_factory_template_v1(p_body_source,p_token_schema);
  v_checksum:=private.document_template_version_checksum_v1(p_body_source,p_token_schema);
  select * into v_existing from public.document_template_versions v where v.id=p_request_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.template_id<>p_template_id or v_existing.content_checksum<>v_checksum then
      raise serialization_failure using message='ENJAZ_TEMPLATE_VERSION_REQUEST_DRIFT';
    end if;
    return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v_existing.id,'templateId',v_existing.template_id,'versionNumber',v_existing.version_number,'state',v_existing.status,'contentChecksum',v_existing.content_checksum,'wasDuplicate',true);
  end if;
  select * into v_template from public.document_templates t where t.workspace_id=p_workspace_id and t.id=p_template_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_TEMPLATE_NOT_FOUND'; end if;
  select coalesce(max(v.version_number),0)+1 into v_version from public.document_template_versions v where v.workspace_id=p_workspace_id and v.template_id=p_template_id;
  insert into public.document_template_versions(id,workspace_id,template_id,version_number,body_source,token_schema,status,content_checksum,created_by)
  values(p_request_id,p_workspace_id,p_template_id,v_version,p_body_source,p_token_schema,'draft',v_checksum,v_actor)
  returning * into v_existing;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.template.version.created','document_template',p_template_id,'Document template version created',jsonb_build_object('templateVersionId',p_request_id,'versionNumber',v_version,'contentChecksum',v_checksum));
  return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v_existing.id,'templateId',v_existing.template_id,'versionNumber',v_existing.version_number,'state',v_existing.status,'contentChecksum',v_existing.content_checksum,'wasDuplicate',false);
end;$$;

create or replace function public.publish_document_template_version_v1(p_workspace_id uuid,p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_template_versions%rowtype;v_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  select * into v from public.document_template_versions x where x.workspace_id=p_workspace_id and x.id=p_version_id for update;
  if not found then raise no_data_found using message='ENJAZ_TEMPLATE_VERSION_NOT_FOUND'; end if;
  if v.status='published' then
    return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v.id,'templateId',v.template_id,'versionNumber',v.version_number,'state','published','contentChecksum',v.content_checksum,'wasDuplicate',true);
  end if;
  perform private.validate_document_factory_template_v1(v.body_source,v.token_schema);
  v_checksum:=private.document_template_version_checksum_v1(v.body_source,v.token_schema);
  if v_checksum<>v.content_checksum then raise data_exception using message='ENJAZ_TEMPLATE_VERSION_CHECKSUM_DRIFT'; end if;
  update public.document_template_versions set status='published',published_by=v_actor,published_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.template.version.published','document_template',v.template_id,'Document template version published',jsonb_build_object('templateVersionId',v.id,'versionNumber',v.version_number,'contentChecksum',v.content_checksum));
  return jsonb_build_object('schema','enjaz.document-template-version.v1','versionId',v.id,'templateId',v.template_id,'versionNumber',v.version_number,'state','published','contentChecksum',v.content_checksum,'wasDuplicate',false);
end;$$;

create or replace function private.assert_document_factory_provenance_current_v1(
  p_workspace_id uuid,
  p_template_version_id uuid,
  p_provenance jsonb
) returns void language plpgsql stable security definer set search_path='' as $$
declare
  v_version public.document_template_versions%rowtype;
  v_source jsonb;
  v_kind text;
  v_id uuid;
  v_updated timestamptz;
  v_analysis public.document_analysis%rowtype;
  v_latest public.document_versions%rowtype;
begin
  if p_provenance is null or jsonb_typeof(p_provenance)<>'object' or p_provenance->>'schema'<>'enjaz.document-factory-provenance.v1' then
    raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_PROVENANCE_INVALID';
  end if;
  select * into v_version from public.document_template_versions v
  where v.workspace_id=p_workspace_id and v.id=p_template_version_id;
  if not found or v_version.status<>'published' or v_version.content_checksum is distinct from p_provenance->>'templateChecksum' then
    raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_STALE';
  end if;

  for v_source in select value from jsonb_array_elements(coalesce(p_provenance->'sources','[]'::jsonb)) loop
    v_kind:=v_source->>'kind';
    begin v_id:=(v_source->>'entityId')::uuid; exception when others then raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_PROVENANCE_INVALID'; end;
    if v_kind='company' then
      select c.updated_at into v_updated from public.companies c where c.workspace_id=p_workspace_id and c.id=v_id and c.deleted_at is null;
      if not found or to_jsonb(v_updated) is distinct from v_source->'updatedAt' then raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_SOURCE_STALE'; end if;
    elsif v_kind='transaction' then
      select t.updated_at into v_updated from public.transactions t where t.workspace_id=p_workspace_id and t.id=v_id and t.deleted_at is null;
      if not found or to_jsonb(v_updated) is distinct from v_source->'updatedAt' then raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_SOURCE_STALE'; end if;
    elsif v_kind='contact' then
      select c.updated_at into v_updated from public.contacts c where c.workspace_id=p_workspace_id and c.id=v_id and c.deleted_at is null;
      if not found or to_jsonb(v_updated) is distinct from v_source->'updatedAt' then raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_SOURCE_STALE'; end if;
    elsif v_kind='ocr' then
      select * into v_analysis from public.document_analysis a where a.workspace_id=p_workspace_id and a.id=v_id;
      if not found or v_analysis.verification_state<>'verified' or v_analysis.verified_at is null or v_analysis.document_version_id is null then
        raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_OCR_NOT_CURRENT';
      end if;
      select * into v_latest from public.document_versions dv
      where dv.workspace_id=p_workspace_id and dv.document_id=v_analysis.document_id
      order by dv.version_number desc limit 1;
      if not found
         or v_latest.id<>v_analysis.document_version_id
         or v_latest.version_number<>v_analysis.source_version_number
         or v_source->>'documentVersionId'<>v_analysis.document_version_id::text
         or (v_source->>'sourceVersionNumber')::integer<>v_analysis.source_version_number
         or to_jsonb(v_analysis.verified_at) is distinct from v_source->'verifiedAt' then
        raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_OCR_NOT_CURRENT';
      end if;
    else
      raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_PROVENANCE_SOURCE_INVALID';
    end if;
  end loop;
end;$$;
revoke all on function private.assert_document_factory_provenance_current_v1(uuid,uuid,jsonb) from public,anon,authenticated;

-- Generated drafts are no longer browser-table writable once the governed command lane exists.
drop policy if exists document_drafts_direct_insert_workspace on public.document_drafts;
drop policy if exists document_drafts_direct_update_workspace on public.document_drafts;
revoke insert,update,delete on table public.document_drafts from public,anon,authenticated;
grant select on table public.document_drafts to authenticated;

create or replace function public.generate_document_draft_v1(
  p_workspace_id uuid,
  p_request_id uuid,
  p_template_version_id uuid,
  p_title text,
  p_company_id uuid default null,
  p_transaction_id uuid default null,
  p_contact_id uuid default null,
  p_ocr_analysis_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_title text:=btrim(coalesce(p_title,''));
  v_version public.document_template_versions%rowtype;
  v_template public.document_templates%rowtype;
  v_existing public.document_drafts%rowtype;
  v_company public.companies%rowtype;
  v_tx public.transactions%rowtype;
  v_contact public.contacts%rowtype;
  v_analysis public.document_analysis%rowtype;
  v_latest public.document_versions%rowtype;
  v_company_id uuid:=p_company_id;
  v_contact_id uuid:=p_contact_id;
  v_key text;
  v_desc jsonb;
  v_source text;
  v_field text;
  v_required boolean;
  v_value text;
  v_vars jsonb:='{}'::jsonb;
  v_sources jsonb:='[]'::jsonb;
  v_provenance jsonb;
  v_compiled text;
  v_content_checksum text;
  v_fact_checksum text;
  v_draft_id uuid:=gen_random_uuid();
begin
  v_actor:=private.require_document_factory_member_v1(p_workspace_id);
  if p_request_id is null or p_template_version_id is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_GENERATION_REQUEST_INVALID'; end if;
  if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_TITLE_INVALID'; end if;

  select * into v_existing from public.document_drafts d where d.workspace_id=p_workspace_id and d.generation_request_id=p_request_id;
  if found then
    if v_existing.template_version_id is distinct from p_template_version_id
       or v_existing.title<>v_title
       or (v_existing.provenance->'input'->>'requestedCompanyId') is distinct from p_company_id::text
       or (v_existing.provenance->'input'->>'transactionId') is distinct from p_transaction_id::text
       or (v_existing.provenance->'input'->>'requestedContactId') is distinct from p_contact_id::text
       or (v_existing.provenance->'input'->>'ocrAnalysisId') is distinct from p_ocr_analysis_id::text then
      raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_GENERATION_REQUEST_DRIFT';
    end if;
    return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v_existing.id,'status',v_existing.status,'templateVersionId',v_existing.template_version_id,'contentChecksum',v_existing.content_checksum,'factSnapshotChecksum',v_existing.fact_snapshot_checksum,'wasDuplicate',true);
  end if;

  select * into v_version from public.document_template_versions v
  where v.workspace_id=p_workspace_id and v.id=p_template_version_id and v.status='published';
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_PUBLISHED_TEMPLATE_VERSION_REQUIRED'; end if;
  perform private.validate_document_factory_template_v1(v_version.body_source,v_version.token_schema);
  select * into v_template from public.document_templates t where t.workspace_id=p_workspace_id and t.id=v_version.template_id and t.active=true;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_INACTIVE'; end if;

  if p_transaction_id is not null then
    select * into v_tx from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null;
    if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_TRANSACTION_NOT_FOUND'; end if;
    if v_company_id is null then v_company_id:=v_tx.company_id;
    elsif v_tx.company_id is not null and v_company_id<>v_tx.company_id then raise foreign_key_violation using message='ENJAZ_DOCUMENT_FACTORY_TRANSACTION_COMPANY_MISMATCH'; end if;
    if v_contact_id is null then v_contact_id:=v_tx.primary_contact_id; end if;
    v_sources:=v_sources||jsonb_build_array(jsonb_build_object('kind','transaction','entityId',v_tx.id,'updatedAt',v_tx.updated_at));
  end if;

  if v_company_id is not null then
    select * into v_company from public.companies c where c.workspace_id=p_workspace_id and c.id=v_company_id and c.deleted_at is null;
    if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_COMPANY_NOT_FOUND'; end if;
    v_sources:=v_sources||jsonb_build_array(jsonb_build_object('kind','company','entityId',v_company.id,'updatedAt',v_company.updated_at));
  end if;

  if v_contact_id is not null then
    select * into v_contact from public.contacts c where c.workspace_id=p_workspace_id and c.id=v_contact_id and c.deleted_at is null;
    if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_CONTACT_NOT_FOUND'; end if;
    v_sources:=v_sources||jsonb_build_array(jsonb_build_object('kind','contact','entityId',v_contact.id,'updatedAt',v_contact.updated_at));
  end if;

  if p_ocr_analysis_id is not null then
    select * into v_analysis from public.document_analysis a where a.workspace_id=p_workspace_id and a.id=p_ocr_analysis_id;
    if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_OCR_NOT_FOUND'; end if;
    if v_analysis.verification_state<>'verified' or v_analysis.verified_at is null or v_analysis.document_version_id is null or v_analysis.source_version_number is null then
      raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_OCR_NOT_VERIFIED';
    end if;
    select * into v_latest from public.document_versions dv
      where dv.workspace_id=p_workspace_id and dv.document_id=v_analysis.document_id
      order by dv.version_number desc limit 1;
    if not found or v_latest.id<>v_analysis.document_version_id or v_latest.version_number<>v_analysis.source_version_number then
      raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_OCR_STALE';
    end if;
    v_sources:=v_sources||jsonb_build_array(jsonb_build_object(
      'kind','ocr','entityId',v_analysis.id,'documentId',v_analysis.document_id,
      'documentVersionId',v_analysis.document_version_id,'sourceVersionNumber',v_analysis.source_version_number,
      'verifiedAt',v_analysis.verified_at
    ));
  end if;

  for v_key,v_desc in select key,value from jsonb_each(v_version.token_schema) loop
    v_source:=lower(v_desc->>'source');
    v_field:=lower(v_desc->>'field');
    v_required:=coalesce((v_desc->>'required')::boolean,false);
    v_value:=null;
    if v_source='company' then
      if v_company_id is null then
        if v_required then raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_REQUIRED_COMPANY_MISSING'; end if;
      else
        v_value:=case v_field
          when 'legal_name' then v_company.legal_name
          when 'display_name' then v_company.display_name
          when 'capital' then v_company.capital::text
          when 'address' then v_company.address
          when 'registration_number' then v_company.registration_number
          when 'legal_status' then v_company.legal_status
          else null end;
      end if;
    elsif v_source='transaction' then
      if p_transaction_id is null then
        if v_required then raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_REQUIRED_TRANSACTION_MISSING'; end if;
      else
        v_value:=case v_field
          when 'type' then v_tx.type
          when 'department' then v_tx.department
          when 'status' then v_tx.status
          when 'priority' then v_tx.priority
          when 'current_fee' then v_tx.current_fee::text
          else null end;
      end if;
    elsif v_source='contact' then
      if v_contact_id is null then
        if v_required then raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_REQUIRED_CONTACT_MISSING'; end if;
      else
        v_value:=case v_field
          when 'display_name' then v_contact.display_name
          when 'phone' then v_contact.phone
          when 'email' then v_contact.email
          else null end;
      end if;
    elsif v_source='ocr' then
      if p_ocr_analysis_id is null then
        if v_required then raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_REQUIRED_OCR_MISSING'; end if;
      else
        v_value:=coalesce(v_analysis.extracted_fields #>> array[v_field,'value'],v_analysis.extracted_fields->>v_field);
      end if;
    end if;
    if v_required and nullif(btrim(coalesce(v_value,'')),'') is null then
      raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_REQUIRED_FACT_MISSING';
    end if;
    v_vars:=v_vars||jsonb_build_object(v_key,coalesce(v_value,''));
  end loop;

  v_compiled:=v_version.body_source;
  for v_key,v_value in select key,value from jsonb_each_text(v_vars) loop
    v_compiled:=replace(v_compiled,'{{'||v_key||'}}',v_value);
  end loop;
  if v_compiled ~ '\{\{|\}\}' then raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_UNRESOLVED_TOKEN'; end if;

  v_content_checksum:=encode(extensions.digest(convert_to(v_compiled,'UTF8'),'sha256'),'hex');
  v_fact_checksum:=encode(extensions.digest(convert_to(v_vars::text,'UTF8'),'sha256'),'hex');
  v_provenance:=jsonb_build_object(
    'schema','enjaz.document-factory-provenance.v1',
    'templateVersionId',v_version.id,
    'templateChecksum',v_version.content_checksum,
    'input',jsonb_build_object(
      'requestedCompanyId',p_company_id,
      'resolvedCompanyId',v_company_id,
      'transactionId',p_transaction_id,
      'requestedContactId',p_contact_id,
      'resolvedContactId',v_contact_id,
      'ocrAnalysisId',p_ocr_analysis_id
    ),
    'sources',v_sources
  );

  insert into public.document_drafts(
    id,workspace_id,template_id,transaction_id,company_id,title,compiled_content,variables,status,
    template_version_id,fact_snapshot,provenance,generation_request_id,content_checksum,fact_snapshot_checksum
  ) values(
    v_draft_id,p_workspace_id,v_template.id,p_transaction_id,v_company_id,v_title,v_compiled,v_vars,'review_required',
    v_version.id,v_vars,v_provenance,p_request_id,v_content_checksum,v_fact_checksum
  );

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.generated','document_draft',v_draft_id,'Official document draft generated from authoritative facts',jsonb_build_object(
    'templateVersionId',v_version.id,'templateChecksum',v_version.content_checksum,'contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum,'generationRequestId',p_request_id
  ));

  return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v_draft_id,'status','review_required','templateVersionId',v_version.id,'contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum,'compiledContent',v_compiled,'facts',v_vars,'wasDuplicate',false);
end;$$;

create or replace function public.update_document_draft_content_v1(
  p_workspace_id uuid,p_draft_id uuid,p_compiled_content text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_drafts%rowtype;v_content text:=coalesce(p_compiled_content,'');v_checksum text;
begin
  v_actor:=private.require_document_factory_member_v1(p_workspace_id);
  if char_length(v_content) not between 1 and 1000000 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_CONTENT_INVALID'; end if;
  select * into v from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=p_draft_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_FOUND'; end if;
  if v.status<>'draft' then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_EDITABLE'; end if;
  v_checksum:=encode(extensions.digest(convert_to(v_content,'UTF8'),'sha256'),'hex');
  update public.document_drafts set compiled_content=v_content,content_checksum=v_checksum,updated_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.draft.edited','document_draft',v.id,'Document draft content edited through governed command',jsonb_build_object('contentChecksum',v_checksum));
  return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','draft','contentChecksum',v_checksum);
end;$$;

create or replace function public.submit_document_draft_for_review_v1(
  p_workspace_id uuid,p_draft_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_drafts%rowtype;v_content_checksum text;v_fact_checksum text;
begin
  v_actor:=private.require_document_factory_member_v1(p_workspace_id);
  select * into v from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=p_draft_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_FOUND'; end if;
  if v.status<>'draft' or v.template_version_id is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_SUBMITTABLE'; end if;
  perform private.assert_document_factory_provenance_current_v1(p_workspace_id,v.template_version_id,v.provenance);
  v_content_checksum:=encode(extensions.digest(convert_to(v.compiled_content,'UTF8'),'sha256'),'hex');
  v_fact_checksum:=encode(extensions.digest(convert_to(v.fact_snapshot::text,'UTF8'),'sha256'),'hex');
  update public.document_drafts set status='review_required',content_checksum=v_content_checksum,fact_snapshot_checksum=v_fact_checksum,updated_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.review.requested','document_draft',v.id,'Document draft submitted for approval review',jsonb_build_object('contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum));
  return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','review_required','contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum);
end;$$;

create or replace function public.review_document_draft_v1(
  p_workspace_id uuid,p_draft_id uuid,p_decision text,p_note text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_drafts%rowtype;v_decision text:=lower(btrim(coalesce(p_decision,'')));v_note text:=nullif(btrim(coalesce(p_note,'')),'');v_content_checksum text;v_fact_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
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
    update public.document_drafts set status='approved',approved_by=v_actor,approved_at=now(),approval_note=v_note,updated_at=now() where id=v.id;
    insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
    values(p_workspace_id,v_actor,'document.factory.approved','document_draft',v.id,'Official document draft approved',jsonb_build_object('contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum,'note',v_note));
    return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','approved','approvedBy',v_actor,'approved',true);
  end if;

  if v.status not in ('review_required','approved') then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_RETURNABLE'; end if;
  update public.document_drafts set status='draft',approved_by=null,approved_at=null,approval_note=v_note,finalized_by=null,finalized_at=null,final_document_id=null,final_document_version_id=null,updated_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.returned','document_draft',v.id,'Document draft returned for correction',jsonb_build_object('note',v_note));
  return jsonb_build_object('schema','enjaz.document-draft.v1','draftId',v.id,'status','draft','approved',false);
end;$$;

create or replace function public.get_document_factory_v1(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_document_factory_member_v1(p_workspace_id);
  return jsonb_build_object(
    'schema','enjaz.document-factory.v1',
    'templates',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,'name',t.name,'kind',t.kind,'bodySource',t.body_source,'tokenSchema',t.token_schema,'active',t.active,
        'versions',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'versionNumber',v.version_number,'status',v.status,'contentChecksum',v.content_checksum,'publishedAt',v.published_at) order by v.version_number desc) from public.document_template_versions v where v.workspace_id=p_workspace_id and v.template_id=t.id),'[]'::jsonb)
      ) order by t.updated_at desc)
      from public.document_templates t where t.workspace_id=p_workspace_id
    ),'[]'::jsonb),
    'drafts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',d.id,'templateId',d.template_id,'templateVersionId',d.template_version_id,'title',d.title,'status',d.status,
        'compiledContent',d.compiled_content,'facts',d.fact_snapshot,'provenance',d.provenance,'contentChecksum',d.content_checksum,
        'factSnapshotChecksum',d.fact_snapshot_checksum,'companyId',d.company_id,'transactionId',d.transaction_id,
        'approvedAt',d.approved_at,'approvalNote',d.approval_note,'finalDocumentId',d.final_document_id,
        'finalDocumentVersionId',d.final_document_version_id,'finalizedAt',d.finalized_at,'updatedAt',d.updated_at
      ) order by d.updated_at desc)
      from (select * from public.document_drafts x where x.workspace_id=p_workspace_id order by x.updated_at desc limit 100) d
    ),'[]'::jsonb)
  );
end;$$;

revoke all on function public.generate_document_draft_v1(uuid,uuid,uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.update_document_draft_content_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.submit_document_draft_for_review_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.review_document_draft_v1(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_document_factory_v1(uuid) from public,anon,authenticated;
grant execute on function public.generate_document_draft_v1(uuid,uuid,uuid,text,uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.update_document_draft_content_v1(uuid,uuid,text) to authenticated;
grant execute on function public.submit_document_draft_for_review_v1(uuid,uuid) to authenticated;
grant execute on function public.review_document_draft_v1(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_document_factory_v1(uuid) to authenticated;

commit;
