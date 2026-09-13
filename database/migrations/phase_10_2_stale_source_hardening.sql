-- ENJAZ Phase 10.2 — stale source hardening
-- A newly acknowledged authoritative document version invalidates active/verified
-- intelligence derived from older versions. Verified intelligence remains derived.
begin;

create or replace function private.supersede_document_intelligence_on_new_version_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.document_analysis a
  set verification_state='superseded',
      failure_code='SOURCE_VERSION_STALE',
      failure_message='A newer authoritative document version was acknowledged.',
      updated_at=now()
  where a.workspace_id=new.workspace_id
    and a.document_id=new.document_id
    and a.document_version_id is distinct from new.id
    and a.verification_state in ('queued','extracting','review_required','reviewed','verified');
  return new;
end;
$$;
revoke all on function private.supersede_document_intelligence_on_new_version_v1() from public,anon,authenticated;

drop trigger if exists document_versions_supersede_intelligence_v1 on public.document_versions;
create trigger document_versions_supersede_intelligence_v1
after insert on public.document_versions
for each row execute function private.supersede_document_intelligence_on_new_version_v1();

create or replace function public.verify_document_extraction_v1(p_workspace_id uuid,p_analysis_id uuid,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid;v public.document_analysis%rowtype;v_latest public.document_versions%rowtype;v_stale boolean;
begin
  v_actor:=private.require_document_intelligence_member_v1(p_workspace_id);
  if p_note is not null and char_length(p_note)>1000 then raise invalid_parameter_value using message='ENJAZ_OCR_VERIFY_NOTE_INVALID'; end if;
  select * into v from public.document_analysis a where a.workspace_id=p_workspace_id and a.id=p_analysis_id for update;
  if not found then raise no_data_found using message='ENJAZ_OCR_ANALYSIS_NOT_FOUND'; end if;

  select * into v_latest from public.document_versions d
  where d.workspace_id=v.workspace_id and d.document_id=v.document_id
  order by d.version_number desc limit 1;
  v_stale:=not found or v.document_version_id is null or v_latest.id<>v.document_version_id;

  if v_stale then
    if v.verification_state in ('queued','extracting','review_required','reviewed','verified') then
      update public.document_analysis
      set verification_state='superseded',failure_code='SOURCE_VERSION_STALE',failure_message='A newer authoritative document version exists.',updated_at=now()
      where id=v.id;
    end if;
    return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','superseded','verified',false,'reason','SOURCE_VERSION_CHANGED','sourceAuthoritative',true);
  end if;

  if v.verification_state='verified' then
    return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','verified','verified',true,'wasDuplicate',true,'sourceAuthoritative',true,'promotedToSource',false);
  end if;
  if v.verification_state<>'reviewed' then raise serialization_failure using message='ENJAZ_OCR_VERIFY_TRANSITION_INVALID'; end if;

  update public.document_analysis
  set verification_state='verified',verified_by=v_actor,verified_at=now(),review_note=case when p_note is null then review_note else concat_ws(E'\n',review_note,p_note) end,failure_code=null,failure_message=null,updated_at=now()
  where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,v_actor,'document.ocr.verified','document',v.document_id,'Document extraction explicitly verified',jsonb_build_object('analysisId',v.id,'documentVersionId',v.document_version_id,'sourceVersionNumber',v.source_version_number,'sourceAuthority','SOURCE_FILE_REMAINS_AUTHORITATIVE'));
  return jsonb_build_object('schema','enjaz.document-extraction-state.v1','analysisId',v.id,'state','verified','verified',true,'sourceAuthoritative',true,'promotedToSource',false);
end;$$;

revoke all on function public.verify_document_extraction_v1(uuid,uuid,text) from public,anon;
grant execute on function public.verify_document_extraction_v1(uuid,uuid,text) to authenticated;

commit;
