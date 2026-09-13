-- ENJAZ Phase 10.2 — Document Intelligence / OCR
-- Source document + immutable document version remain authoritative.
-- OCR/extraction is derived data and follows EXTRACT -> REVIEW -> VERIFY.
begin;

alter table public.document_analysis add column if not exists document_version_id uuid;
alter table public.document_analysis add column if not exists source_version_number integer;
alter table public.document_analysis add column if not exists source_checksum text;
alter table public.document_analysis add column if not exists verification_state text not null default 'legacy_unverified';
alter table public.document_analysis add column if not exists page_results jsonb not null default '[]'::jsonb;
alter table public.document_analysis add column if not exists provenance jsonb not null default '{}'::jsonb;
alter table public.document_analysis add column if not exists requested_by uuid references auth.users(id) on delete set null;
alter table public.document_analysis add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.document_analysis add column if not exists reviewed_at timestamptz;
alter table public.document_analysis add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.document_analysis add column if not exists verified_at timestamptz;
alter table public.document_analysis add column if not exists review_note text;
alter table public.document_analysis add column if not exists failure_code text;
alter table public.document_analysis add column if not exists failure_message text;
alter table public.document_analysis add column if not exists provider_run_id text;
alter table public.document_analysis add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists(select 1 from pg_constraint where conname='document_analysis_version_fk') then
    alter table public.document_analysis add constraint document_analysis_version_fk
      foreign key(workspace_id,document_version_id) references public.document_versions(workspace_id,id) on delete restrict;
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_source_version_check') then
    alter table public.document_analysis add constraint document_analysis_source_version_check
      check(source_version_number is null or source_version_number>0);
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_source_checksum_check') then
    alter table public.document_analysis add constraint document_analysis_source_checksum_check
      check(source_checksum is null or source_checksum ~ '^[0-9a-f]{64}$');
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_verification_state_check') then
    alter table public.document_analysis add constraint document_analysis_verification_state_check
      check(verification_state in ('queued','extracting','review_required','reviewed','verified','rejected','failed','superseded','legacy_unverified'));
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_pages_array_check') then
    alter table public.document_analysis add constraint document_analysis_pages_array_check
      check(jsonb_typeof(page_results)='array');
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_provenance_object_check') then
    alter table public.document_analysis add constraint document_analysis_provenance_object_check
      check(jsonb_typeof(provenance)='object');
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_review_note_check') then
    alter table public.document_analysis add constraint document_analysis_review_note_check
      check(review_note is null or char_length(review_note)<=1000);
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_failure_code_check') then
    alter table public.document_analysis add constraint document_analysis_failure_code_check
      check(failure_code is null or char_length(btrim(failure_code)) between 1 and 160);
  end if;
  if not exists(select 1 from pg_constraint where conname='document_analysis_provider_run_id_check') then
    alter table public.document_analysis add constraint document_analysis_provider_run_id_check
      check(provider_run_id is null or char_length(provider_run_id)<=320);
  end if;
end $$;

-- Legacy analysis rows predate immutable-version provenance. Backfill when a version exists,
-- but never pretend legacy rows were explicitly verified under the Phase 10.2 law.
with latest as (
  select distinct on(v.workspace_id,v.document_id)
    v.workspace_id,v.document_id,v.id as version_id,v.version_number,v.checksum
  from public.document_versions v
  order by v.workspace_id,v.document_id,v.version_number desc
)
update public.document_analysis a
set document_version_id=coalesce(a.document_version_id,l.version_id),
    source_version_number=coalesce(a.source_version_number,l.version_number),
    source_checksum=coalesce(a.source_checksum,l.checksum),
    provenance=case when a.provenance='{}'::jsonb then jsonb_build_object(
      'documentId',a.document_id,'documentVersionId',l.version_id,'sourceVersionNumber',l.version_number,
      'sourceChecksum',l.checksum,'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE','legacyBackfill',true
    ) else a.provenance end,
    verification_state='legacy_unverified',updated_at=now()
from latest l
where a.workspace_id=l.workspace_id and a.document_id=l.document_id;

create index if not exists document_analysis_source_version_idx on public.document_analysis(workspace_id,document_id,source_version_number desc,analysis_version desc);
create index if not exists document_analysis_verification_queue_idx on public.document_analysis(workspace_id,verification_state,analyzed_at desc);
create index if not exists document_analysis_document_version_idx on public.document_analysis(workspace_id,document_version_id);

-- Phase 10.2 removes generic browser mutation authority. Select remains workspace-scoped.
drop policy if exists document_analysis_insert_workspace on public.document_analysis;
drop policy if exists document_analysis_update_workspace on public.document_analysis;
revoke insert,update,delete on table public.document_analysis from public,anon,authenticated;

create or replace function private.require_document_intelligence_member_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_DOCUMENT_INTELLIGENCE_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then
    raise insufficient_privilege using message='ENJAZ_DOCUMENT_INTELLIGENCE_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;$$;
revoke all on function private.require_document_intelligence_member_v1(uuid) from public,anon,authenticated;

create or replace function private.require_document_intelligence_service_v1()
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then
    raise insufficient_privilege using message='ENJAZ_DOCUMENT_INTELLIGENCE_SERVICE_REQUIRED';
  end if;
end;$$;
revoke all on function private.require_document_intelligence_service_v1() from public,anon,authenticated;

do $$ begin
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='validate_document_extracted_fields_v1') then
    execute $fn$
      create function private.validate_document_extracted_fields_v1(p_fields jsonb)
      returns void language plpgsql immutable set search_path='' as $body$
      declare v jsonb; v_page numeric; v_conf numeric;
      begin
        if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise invalid_parameter_value using message='ENJAZ_OCR_FIELDS_OBJECT_REQUIRED'; end if;
        for v in select value from jsonb_each(p_fields) loop
          if jsonb_typeof(v)<>'object' then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_OBJECT_REQUIRED'; end if;
          if not(v ? 'pageNumber') or jsonb_typeof(v->'pageNumber')<>'number' then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_PAGE_REQUIRED'; end if;
          if not(v ? 'confidence') or jsonb_typeof(v->'confidence')<>'number' then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_CONFIDENCE_REQUIRED'; end if;
          v_page:=(v->>'pageNumber')::numeric;v_conf:=(v->>'confidence')::numeric;
          if v_page<1 or trunc(v_page)<>v_page then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_PAGE_INVALID'; end if;
          if v_conf<0 or v_conf>1 then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_CONFIDENCE_INVALID'; end if;
          if v ? 'value' and jsonb_typeof(v->'value') not in ('string','null') then raise invalid_parameter_value using message='ENJAZ_OCR_FIELD_VALUE_INVALID'; end if;
        end loop;
      end;$body$;
    $fn$;
  end if;
end $$;
revoke all on function private.validate_document_extracted_fields_v1(jsonb) from public,anon,authenticated;

do $$ begin
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='validate_document_pages_v1') then
    execute $fn$
      create function private.validate_document_pages_v1(p_pages jsonb)
      returns void language plpgsql immutable set search_path='' as $body$
      declare v jsonb;v_page numeric;v_conf numeric;
      begin
        if p_pages is null or jsonb_typeof(p_pages)<>'array' or jsonb_array_length(p_pages)<1 then raise invalid_parameter_value using message='ENJAZ_OCR_PAGES_REQUIRED'; end if;
        for v in select value from jsonb_array_elements(p_pages) loop
          if jsonb_typeof(v)<>'object' then raise invalid_parameter_value using message='ENJAZ_OCR_PAGE_OBJECT_REQUIRED'; end if;
          if jsonb_typeof(v->'pageNumber')<>'number' or jsonb_typeof(v->'confidence')<>'number' or jsonb_typeof(v->'text')<>'string' then raise invalid_parameter_value using message='ENJAZ_OCR_PAGE_PROVENANCE_REQUIRED'; end if;
          v_page:=(v->>'pageNumber')::numeric;v_conf:=(v->>'confidence')::numeric;
          if v_page<1 or trunc(v_page)<>v_page then raise invalid_parameter_value using message='ENJAZ_OCR_PAGE_NUMBER_INVALID'; end if;
          if v_conf<0 or v_conf>1 then raise invalid_parameter_value using message='ENJAZ_OCR_PAGE_CONFIDENCE_INVALID'; end if;
        end loop;
        if (select count(*) from jsonb_array_elements(p_pages))<>(select count(distinct (value->>'pageNumber')::integer) from jsonb_array_elements(p_pages)) then
          raise invalid_parameter_value using message='ENJAZ_OCR_PAGE_DUPLICATE';
        end if;
      end;$body$;
    $fn$;
  end if;
end $$;
revoke all on function private.validate_document_pages_v1(jsonb) from public,anon,authenticated;

create or replace function public.request_document_extraction_v1(
  p_workspace_id uuid,p_request_id uuid,p_document_id uuid,p_version_number integer default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;v_doc public.documents%rowtype;v_ver public.document_versions%rowtype;v_existing public.document_analysis%rowtype;v_analysis_version integer;
begin
  v_actor:=private.require_document_intelligence_member_v1(p_workspace_id);
  if p_request_id is null or p_document_id is null then raise invalid_parameter_value using message='ENJAZ_OCR_REQUEST_INVALID'; end if;
  if p_version_number is not null and p_version_number<1 then raise invalid_parameter_value using message='ENJAZ_OCR_VERSION_INVALID'; end if;

  select * into v_existing from public.document_analysis a where a.id=p_request_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.document_id<>p_document_id or v_existing.requested_by is distinct from v_actor then raise serialization_failure using message='ENJAZ_OCR_REQUEST_DRIFT'; end if;
    return jsonb_build_object('schema','enjaz.document-extraction-request.v1','analysisId',v_existing.id,'documentId',v_existing.document_id,'documentVersionId',v_existing.document_version_id,'sourceVersionNumber',v_existing.source_version_number,'analysisVersion',v_existing.analysis_version,'state',v_existing.verification_state,'wasDuplicate',true);
  end if;

  select * into v_doc from public.documents d where d.workspace_id=p_workspace_id and d.id=p_document_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_DOCUMENT_NOT_FOUND'; end if;
  if v_doc.status in ('processing','failed') then raise invalid_parameter_value using message='ENJAZ_OCR_SOURCE_NOT_READY'; end if;

  if p_version_number is null then
    select * into v_ver from public.document_versions v where v.workspace_id=p_workspace_id and v.document_id=p_document_id order by v.version_number desc limit 1;
  else
    select * into v_ver from public.document_versions v where v.workspace_id=p_workspace_id and v.document_id=p_document_id and v.version_number=p_version_number;
  end if;
  if not found then raise no_data_found using message='ENJAZ_OCR_SOURCE_VERSION_NOT_FOUND'; end if;

  select coalesce(max(a.analysis_version),0)+1 into v_analysis_version from public.document_analysis a where a.workspace_id=p_workspace_id and a.document_id=p_document_id;
  insert into public.document_analysis(id,workspace_id,document_id,document_version_id,source_version_number,source_checksum,analysis_version,ocr_text,extracted_fields,classification,confidence,review_status,verification_state,page_results,provenance,requested_by,provider,analyzed_at,updated_at)
  values(p_request_id,p_workspace_id,p_document_id,v_ver.id,v_ver.version_number,v_ver.checksum,v_analysis_version,null,'{}'::jsonb,null,null,'unreviewed','queued','[]'::jsonb,
    jsonb_build_object('documentId',p_document_id,'documentVersionId',v_ver.id,'sourceVersionNumber',v_ver.version_number,'sourceChecksum',v_ver.checksum,'mimeType',v_ver.mime_type,'sizeBytes',v_ver.size_bytes,'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE','extractedContentMayReplaceSource',false),v_actor,null,now(),now());

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.ocr.requested','document',p_document_id,'Document extraction requested',jsonb_build_object('analysisId',p_request_id,'documentVersionId',v_ver.id,'sourceVersionNumber',v_ver.version_number,'analysisVersion',v_analysis_version));

  return jsonb_build_object('schema','enjaz.document-extraction-request.v1','analysisId',p_request_id,'documentId',p_document_id,'documentVersionId',v_ver.id,'sourceVersionNumber',v_ver.version_number,'analysisVersion',v_analysis_version,'state','queued','wasDuplicate',false);
end;$$;

create or replace function public.get_document_extraction_claim_v1(p_analysis_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v public.document_analysis%rowtype;d public.documents%rowtype;ver public.document_versions%rowtype;
begin
  perform private.require_document_intelligence_service_v1();
  select * into v from public.document_analysis a where a.id=p_analysis_id;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state not in ('queued','extracting') then raise invalid_parameter_value using message='ENJAZ_OCR_ANALYSIS_NOT_EXTRACTABLE'; end if;
  select * into d from public.documents x where x.workspace_id=v.workspace_id and x.id=v.document_id;
  select * into ver from public.document_versions x where x.workspace_id=v.workspace_id and x.id=v.document_version_id;
  if not found then raise no_data_found using message='ENJAZ_OCR_SOURCE_VERSION_NOT_FOUND'; end if;
  return jsonb_build_object('schema','enjaz.document-extraction-claim.v1','analysisId',v.id,'workspaceId',v.workspace_id,'documentId',v.document_id,'documentVersionId',ver.id,'sourceVersionNumber',ver.version_number,'sourceChecksum',ver.checksum,'bucket','enjaz-documents-private','path',ver.storage_path,'mimeType',ver.mime_type,'byteSize',ver.size_bytes,'fileName',coalesce(ver.original_file_name,d.original_file_name,d.title),'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE');
end;$$;

create or replace function public.mark_document_extraction_started_v1(p_analysis_id uuid,p_provider text,p_provider_run_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.document_analysis%rowtype;v_provider text:=btrim(coalesce(p_provider,''));
begin
  perform private.require_document_intelligence_service_v1();
  if char_length(v_provider) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_OCR_PROVIDER_INVALID'; end if;
  select * into v from public.document_analysis a where a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state='extracting' and v.provider=v_provider then return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','extracting','wasDuplicate',true); end if;
  if v.verification_state<>'queued' then raise serialization_failure using message='ENJAZ_OCR_TRANSITION_INVALID'; end if;
  update public.document_analysis set verification_state='extracting',provider=v_provider,provider_run_id=nullif(btrim(coalesce(p_provider_run_id,'')),''),updated_at=now() where id=v.id;
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','extracting','wasDuplicate',false);
end;$$;

create or replace function public.complete_document_extraction_v1(
  p_analysis_id uuid,p_ocr_text text,p_extracted_fields jsonb,p_page_results jsonb,p_classification text,p_confidence numeric,p_provider text,p_provider_run_id text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.document_analysis%rowtype;v_provider text:=btrim(coalesce(p_provider,''));
begin
  perform private.require_document_intelligence_service_v1();
  perform private.validate_document_extracted_fields_v1(coalesce(p_extracted_fields,'{}'::jsonb));
  perform private.validate_document_pages_v1(p_page_results);
  if p_confidence is null or p_confidence<0 or p_confidence>1 then raise invalid_parameter_value using message='ENJAZ_OCR_CONFIDENCE_REQUIRED'; end if;
  if char_length(v_provider) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_OCR_PROVIDER_INVALID'; end if;
  if p_ocr_text is null then raise invalid_parameter_value using message='ENJAZ_OCR_TEXT_REQUIRED'; end if;
  select * into v from public.document_analysis a where a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state='review_required' then return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','review_required','wasDuplicate',true); end if;
  if v.verification_state<>'extracting' then raise serialization_failure using message='ENJAZ_OCR_TRANSITION_INVALID'; end if;
  update public.document_analysis set ocr_text=p_ocr_text,extracted_fields=coalesce(p_extracted_fields,'{}'::jsonb),page_results=p_page_results,classification=nullif(btrim(coalesce(p_classification,'')),''),confidence=p_confidence,provider=v_provider,provider_run_id=coalesce(nullif(btrim(coalesce(p_provider_run_id,'')),''),provider_run_id),verification_state='review_required',review_status='unreviewed',failure_code=null,failure_message=null,analyzed_at=now(),updated_at=now() where id=v.id;
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','review_required','wasDuplicate',false);
end;$$;

create or replace function public.fail_document_extraction_v1(p_analysis_id uuid,p_failure_code text,p_failure_message text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.document_analysis%rowtype;v_code text:=upper(btrim(coalesce(p_failure_code,'')));
begin
  perform private.require_document_intelligence_service_v1();
  if char_length(v_code) not between 1 and 160 then raise invalid_parameter_value using message='ENJAZ_OCR_FAILURE_CODE_REQUIRED'; end if;
  select * into v from public.document_analysis a where a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state='failed' then return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','failed','wasDuplicate',true); end if;
  if v.verification_state not in ('queued','extracting','review_required') then raise serialization_failure using message='ENJAZ_OCR_TRANSITION_INVALID'; end if;
  update public.document_analysis set verification_state='failed',failure_code=v_code,failure_message=left(p_failure_message,1000),updated_at=now() where id=v.id;
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','failed','wasDuplicate',false);
end;$$;

create or replace function public.review_document_extraction_v1(
  p_workspace_id uuid,p_analysis_id uuid,p_decision text,p_corrected_fields jsonb default null,p_note text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_analysis%rowtype;v_decision text:=lower(btrim(coalesce(p_decision,'')));
begin
  v_actor:=private.require_document_intelligence_member_v1(p_workspace_id);
  if v_decision not in ('accept','reject') then raise invalid_parameter_value using message='ENJAZ_OCR_REVIEW_DECISION_INVALID'; end if;
  if p_note is not null and char_length(p_note)>1000 then raise invalid_parameter_value using message='ENJAZ_OCR_REVIEW_NOTE_INVALID'; end if;
  if p_corrected_fields is not null then perform private.validate_document_extracted_fields_v1(p_corrected_fields); end if;
  if v_decision='reject' and p_corrected_fields is not null then raise invalid_parameter_value using message='ENJAZ_OCR_REJECT_CORRECTION_FORBIDDEN'; end if;
  select * into v from public.document_analysis a where a.workspace_id=p_workspace_id and a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state not in ('review_required','legacy_unverified') then raise serialization_failure using message='ENJAZ_OCR_REVIEW_TRANSITION_INVALID'; end if;
  if v_decision='reject' then
    update public.document_analysis set verification_state='rejected',review_status='rejected',reviewed_by=v_actor,reviewed_at=now(),review_note=p_note,updated_at=now() where id=v.id;
  else
    if v.verification_state='legacy_unverified' then raise invalid_parameter_value using message='ENJAZ_OCR_LEGACY_CANNOT_BE_VERIFIED'; end if;
    update public.document_analysis set verification_state='reviewed',review_status='approved',extracted_fields=coalesce(p_corrected_fields,extracted_fields),reviewed_by=v_actor,reviewed_at=now(),review_note=p_note,updated_at=now() where id=v.id;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,case when v_decision='accept' then 'document.ocr.reviewed' else 'document.ocr.rejected' end,'document',v.document_id,'Document extraction review recorded',jsonb_build_object('analysisId',v.id,'decision',v_decision,'sourceVersionNumber',v.source_version_number));
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state',case when v_decision='accept' then 'reviewed' else 'rejected' end,'sourceAuthoritative',true);
end;$$;

create or replace function public.verify_document_extraction_v1(p_workspace_id uuid,p_analysis_id uuid,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_analysis%rowtype;v_latest public.document_versions%rowtype;
begin
  v_actor:=private.require_document_intelligence_member_v1(p_workspace_id);
  if p_note is not null and char_length(p_note)>1000 then raise invalid_parameter_value using message='ENJAZ_OCR_VERIFY_NOTE_INVALID'; end if;
  select * into v from public.document_analysis a where a.workspace_id=p_workspace_id and a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;
  if v.verification_state='verified' then return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','verified','wasDuplicate',true,'sourceAuthoritative',true); end if;
  if v.verification_state<>'reviewed' then raise serialization_failure using message='ENJAZ_OCR_VERIFY_TRANSITION_INVALID'; end if;
  select * into v_latest from public.document_versions x where x.workspace_id=p_workspace_id and x.document_id=v.document_id order by x.version_number desc limit 1;
  if not found or v_latest.id is distinct from v.document_version_id then
    update public.document_analysis set verification_state='superseded',failure_code='SOURCE_VERSION_STALE',failure_message='A newer authoritative document version exists.',updated_at=now() where id=v.id;
    insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
    values(p_workspace_id,v_actor,'document.ocr.superseded','document',v.document_id,'Document extraction superseded by a newer source version',jsonb_build_object('analysisId',v.id,'sourceVersionNumber',v.source_version_number,'currentVersionNumber',v_latest.version_number));
    return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','superseded','verified',false,'reason','SOURCE_VERSION_STALE','sourceAuthoritative',true);
  end if;
  update public.document_analysis set verification_state='verified',verified_by=v_actor,verified_at=now(),review_note=coalesce(p_note,review_note),failure_code=null,failure_message=null,updated_at=now() where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.ocr.verified','document',v.document_id,'Document extraction explicitly verified',jsonb_build_object('analysisId',v.id,'documentVersionId',v.document_version_id,'sourceVersionNumber',v.source_version_number,'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE'));
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','verified','verified',true,'sourceAuthoritative',true,'promotedToSource',false);
end;$$;

create or replace function public.get_document_intelligence_v1(p_workspace_id uuid,p_document_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid;v_current public.document_versions%rowtype;v_doc public.documents%rowtype;v_rows jsonb;
begin
  v_actor:=private.require_document_intelligence_member_v1(p_workspace_id);
  select * into v_doc from public.documents d where d.workspace_id=p_workspace_id and d.id=p_document_id;
  if not found then raise no_data_found using message='ENJAZ_OCR_DOCUMENT_NOT_FOUND'; end if;
  select * into v_current from public.document_versions x where x.workspace_id=p_workspace_id and x.document_id=p_document_id order by x.version_number desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'documentId',a.document_id,'documentVersionId',a.document_version_id,'sourceVersionNumber',a.source_version_number,'analysisVersion',a.analysis_version,
    'state',a.verification_state,'reviewStatus',a.review_status,'ocrText',a.ocr_text,'extractedFields',a.extracted_fields,'pages',a.page_results,
    'classification',a.classification,'confidence',a.confidence,'provider',a.provider,'stale',(v_current.id is null or a.document_version_id is distinct from v_current.id),
    'analyzedAt',a.analyzed_at,'reviewedAt',a.reviewed_at,'verifiedAt',a.verified_at,'failureCode',a.failure_code
  ) order by a.analysis_version desc),'[]'::jsonb) into v_rows
  from public.document_analysis a where a.workspace_id=p_workspace_id and a.document_id=p_document_id;
  return jsonb_build_object('schema','enjaz.document-intelligence.v1','documentId',p_document_id,'currentVersionId',v_current.id,'currentVersionNumber',v_current.version_number,'analyses',v_rows,'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE');
end;$$;

revoke all on function public.request_document_extraction_v1(uuid,uuid,uuid,integer) from public,anon;
revoke all on function public.get_document_extraction_claim_v1(uuid) from public,anon,authenticated;
revoke all on function public.mark_document_extraction_started_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_document_extraction_v1(uuid,text,jsonb,jsonb,text,numeric,text,text) from public,anon,authenticated;
revoke all on function public.fail_document_extraction_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.review_document_extraction_v1(uuid,uuid,text,jsonb,text) from public,anon;
revoke all on function public.verify_document_extraction_v1(uuid,uuid,text) from public,anon;
revoke all on function public.get_document_intelligence_v1(uuid,uuid) from public,anon;

grant execute on function public.request_document_extraction_v1(uuid,uuid,uuid,integer) to authenticated;
grant execute on function public.review_document_extraction_v1(uuid,uuid,text,jsonb,text) to authenticated;
grant execute on function public.verify_document_extraction_v1(uuid,uuid,text) to authenticated;
grant execute on function public.get_document_intelligence_v1(uuid,uuid) to authenticated;
grant execute on function public.get_document_extraction_claim_v1(uuid) to service_role;
grant execute on function public.mark_document_extraction_started_v1(uuid,text,text) to service_role;
grant execute on function public.complete_document_extraction_v1(uuid,text,jsonb,jsonb,text,numeric,text,text) to service_role;
grant execute on function public.fail_document_extraction_v1(uuid,text,text) to service_role;

commit;
