-- ENJAZ Phase 10.3 — isolated Real Cloud runtime/render authority probe v3
-- Reuses an existing authenticated owner identity only as JWT actor; all data lives in a disposable workspace and is removed before commit.
begin;

create or replace function private.enjaz_p103r3_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then raise exception 'ENJAZ_P103R3_FAILED: %',p_message; end if;
end;$$;
revoke all on function private.enjaz_p103r3_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_p103r3_assert(boolean,text) to authenticated,service_role;

select set_config('p103r3.owner_user',(select user_id::text from public.workspace_memberships where role='owner' order by created_at,user_id limit 1),true);
select set_config('p103r3.owner_ws','10330000-0000-4000-8000-000000000001',true);
select set_config('p103r3.outsider_user','10330000-0000-4000-8000-000000000002',true);
select private.enjaz_p103r3_assert(nullif(current_setting('p103r3.owner_user',true),'') is not null,'no existing owner identity available');
select private.enjaz_p103r3_assert(not exists(select 1 from public.workspaces where id=current_setting('p103r3.owner_ws')::uuid),'probe workspace residue exists');

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
values(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.owner_user')::uuid,'__ENJAZ_P103R3__','Asia/Baghdad','ar-IQ','IQD');
insert into public.workspace_memberships(workspace_id,user_id,role)
values(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.owner_user')::uuid,'owner');

insert into public.companies(id,workspace_id,legal_name,display_name,capital,address,registration_number,legal_status) values
('10330000-0000-4000-8000-000000000030',current_setting('p103r3.owner_ws')::uuid,'شركة إنجاز التجريبية','إنجاز التجريبية',100000000,'بغداد','P103R3-001','محدودة المسؤولية'),
('10330000-0000-4000-8000-000000000031',current_setting('p103r3.owner_ws')::uuid,'شركة أخرى','شركة أخرى',2000000,'بغداد','P103R3-002','محدودة المسؤولية');

-- OCR authority fixture: v2 current; 90 unverified, 91 verified but stale on v1, 92 verified/current on v2.
insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,status,company_id) values
('10330000-0000-4000-8000-000000000080',current_setting('p103r3.owner_ws')::uuid,'OCR source','source','application/pdf','__p103r3__/ocr.pdf',100,'ready','10330000-0000-4000-8000-000000000030');
insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum) values
('10330000-0000-4000-8000-000000000081',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000080',1,'__p103r3__/ocr-v1.pdf','application/pdf',100,repeat('a',64)),
('10330000-0000-4000-8000-000000000082',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000080',2,'__p103r3__/ocr-v2.pdf','application/pdf',101,repeat('b',64));
insert into public.document_analysis(id,workspace_id,document_id,analysis_version,extracted_fields,review_status,provider,document_version_id,source_version_number,source_checksum,verification_state,page_results,provenance,verified_by,verified_at) values
('10330000-0000-4000-8000-000000000090',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000080',1,jsonb_build_object('number',jsonb_build_object('value','UNVERIFIED')),'approved','probe','10330000-0000-4000-8000-000000000082',2,repeat('b',64),'reviewed','[]','{}',null,null),
('10330000-0000-4000-8000-000000000091',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000080',2,jsonb_build_object('number',jsonb_build_object('value','STALE')),'approved','probe','10330000-0000-4000-8000-000000000081',1,repeat('a',64),'verified','[]','{}',current_setting('p103r3.owner_user')::uuid,clock_timestamp()),
('10330000-0000-4000-8000-000000000092',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000080',3,jsonb_build_object('number',jsonb_build_object('value','2026/55')),'approved','probe','10330000-0000-4000-8000-000000000082',2,repeat('b',64),'verified','[]','{}',current_setting('p103r3.owner_user')::uuid,clock_timestamp());

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r3.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r3.owner_user'),true);
set local role authenticated;
select private.enjaz_p103r3_assert(auth.uid()=current_setting('p103r3.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_p103r3_assert(
  not has_table_privilege('public.document_templates','INSERT')
  and not has_table_privilege('public.document_drafts','INSERT')
  and not has_table_privilege('public.pdf_jobs','INSERT')
  and not has_function_privilege('public.complete_document_render_v1(uuid,text,uuid,uuid)','EXECUTE'),
  'browser/service authority boundary leaked'
);

do $$ begin
  begin
    perform public.save_document_template_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000010','Bad','official-letter','{{missing}}','{}'::jsonb,true);
    raise exception 'undeclared token accepted';
  exception when invalid_parameter_value then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_UNDECLARED_TOKEN' then raise; end if; end;
end $$;

select public.save_document_template_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000010','Company letter','official-letter','الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true)),true);
select public.create_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000020','10330000-0000-4000-8000-000000000010','الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true)));
select private.enjaz_p103r3_assert((public.create_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000020','10330000-0000-4000-8000-000000000010','الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true)))->>'wasDuplicate')::boolean,'version replay failed');
select public.publish_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000020');
select private.enjaz_p103r3_assert((public.publish_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000020')->>'wasDuplicate')::boolean,'publish replay failed');

select set_config('p103r3.main_draft',(public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000040','10330000-0000-4000-8000-000000000020','كتاب شركة إنجاز','10330000-0000-4000-8000-000000000030',null,null,null)->>'draftId'),true);
select private.enjaz_p103r3_assert((public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000040','10330000-0000-4000-8000-000000000020','كتاب شركة إنجاز','10330000-0000-4000-8000-000000000030',null,null,null)->>'wasDuplicate')::boolean,'generation replay failed');
select private.enjaz_p103r3_assert(exists(select 1 from public.document_drafts where id=current_setting('p103r3.main_draft')::uuid and status='review_required' and compiled_content like '%شركة إنجاز التجريبية%'),'server-resolved company fact not compiled');
select private.enjaz_p103r3_assert((select count(*)=1 from public.documents where workspace_id=current_setting('p103r3.owner_ws')::uuid),'logical generation mutated Vault before render');

do $$ begin
  begin
    perform public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000040','10330000-0000-4000-8000-000000000020','DRIFT','10330000-0000-4000-8000-000000000030',null,null,null);
    raise exception 'generation drift accepted';
  exception when serialization_failure then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_GENERATION_REQUEST_DRIFT' then raise; end if; end;
end $$;
select public.review_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid,'return','تصحيح');
select public.update_document_draft_content_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid,'الشركة / شركة إنجاز التجريبية - مصحح');
select public.submit_document_draft_for_review_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid);
select public.review_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid,'approve','موافق');
select set_config('p103r3.render_job',(public.request_document_render_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000050',current_setting('p103r3.main_draft')::uuid)->>'jobId'),true);
select private.enjaz_p103r3_assert((public.request_document_render_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000050',current_setting('p103r3.main_draft')::uuid)->>'wasDuplicate')::boolean,'render request replay failed');

-- OCR fail-closed/current path.
select public.save_document_template_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000010','OCR letter','official-letter','الرقم / {{ocr_number}}',jsonb_build_object('ocr_number',jsonb_build_object('source','ocr','field','number','required',true)),true);
select public.create_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000021','10330000-0000-4000-8000-000000000010','الرقم / {{ocr_number}}',jsonb_build_object('ocr_number',jsonb_build_object('source','ocr','field','number','required',true)));
select public.publish_document_template_version_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000021');
do $$ begin
  begin
    perform public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000043','10330000-0000-4000-8000-000000000021','OCR unverified',null,null,null,'10330000-0000-4000-8000-000000000090');
    raise exception 'unverified OCR accepted';
  exception when check_violation then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_OCR_NOT_VERIFIED' then raise; end if; end;
  begin
    perform public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000044','10330000-0000-4000-8000-000000000021','OCR stale',null,null,null,'10330000-0000-4000-8000-000000000091');
    raise exception 'stale OCR accepted';
  exception when serialization_failure then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_OCR_STALE' then raise; end if; end;
end $$;
select set_config('p103r3.ocr_draft',(public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000045','10330000-0000-4000-8000-000000000021','OCR current',null,null,null,'10330000-0000-4000-8000-000000000092')->>'draftId'),true);
select private.enjaz_p103r3_assert(exists(select 1 from public.document_drafts where id=current_setting('p103r3.ocr_draft')::uuid and compiled_content like '%2026/55%'),'current verified OCR not compiled');
select public.review_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.ocr_draft')::uuid,'approve','OCR approved');
select set_config('p103r3.failed_job',(public.request_document_render_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000051',current_setting('p103r3.ocr_draft')::uuid)->>'jobId'),true);

-- Unknown authenticated subject is not a member of the disposable workspace.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r3.outsider_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r3.outsider_user'),true);
set local role authenticated;
do $$ begin
  begin perform public.get_document_factory_v1(current_setting('p103r3.owner_ws')::uuid); raise exception 'cross-workspace read accepted'; exception when insufficient_privilege then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN' then raise; end if; end;
  begin perform public.save_document_template_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000012','Outsider','official-letter','x','{}'::jsonb,true); raise exception 'outsider save accepted'; exception when insufficient_privilege then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN' then raise; end if; end;
end $$;

-- Service-only render lifecycle.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select private.enjaz_p103r3_assert(has_function_privilege('public.complete_document_render_v1(uuid,text,uuid,uuid)','EXECUTE'),'service completion privilege missing');
select public.mark_document_render_running_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1');
select private.enjaz_p103r3_assert((public.mark_document_render_running_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1')->>'wasDuplicate')::boolean,'running replay failed');
select public.fail_document_render_v1(current_setting('p103r3.failed_job')::uuid,'p103r3-fail-1','PROBE_FAILURE');
select private.enjaz_p103r3_assert((select status='failed' and failure_code='PROBE_FAILURE' from public.pdf_jobs where id=current_setting('p103r3.failed_job')::uuid),'render failure lane failed');

insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,status,company_id) values
('10330000-0000-4000-8000-000000000060',current_setting('p103r3.owner_ws')::uuid,'Wrong type','ordinary','application/pdf','__p103r3__/wrong-type.pdf',20,'ready','10330000-0000-4000-8000-000000000030'),
('10330000-0000-4000-8000-000000000061',current_setting('p103r3.owner_ws')::uuid,'Wrong company','generated-official','application/pdf','__p103r3__/wrong-company.pdf',20,'ready','10330000-0000-4000-8000-000000000031'),
('10330000-0000-4000-8000-000000000062',current_setting('p103r3.owner_ws')::uuid,'Correct output','generated-official','application/pdf','__p103r3__/correct.pdf',30,'ready','10330000-0000-4000-8000-000000000030');
insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum) values
('10330000-0000-4000-8000-000000000070',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000060',1,'__p103r3__/wrong-type-v1.pdf','application/pdf',20,repeat('c',64)),
('10330000-0000-4000-8000-000000000071',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000061',1,'__p103r3__/wrong-company-v1.pdf','application/pdf',20,repeat('d',64)),
('10330000-0000-4000-8000-000000000072',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000062',1,'__p103r3__/correct-v1.pdf','application/pdf',29,repeat('e',64)),
('10330000-0000-4000-8000-000000000073',current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000062',2,'__p103r3__/correct-v2.pdf','application/pdf',30,repeat('f',64));
do $$ begin
  begin perform public.complete_document_render_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1','10330000-0000-4000-8000-000000000060','10330000-0000-4000-8000-000000000070'); raise exception 'wrong type accepted'; exception when no_data_found then if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_NOT_READY' then raise; end if; end;
  begin perform public.complete_document_render_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1','10330000-0000-4000-8000-000000000061','10330000-0000-4000-8000-000000000071'); raise exception 'wrong company accepted'; exception when foreign_key_violation then if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_COMPANY_MISMATCH' then raise; end if; end;
  begin perform public.complete_document_render_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1','10330000-0000-4000-8000-000000000062','10330000-0000-4000-8000-000000000072'); raise exception 'stale output accepted'; exception when serialization_failure then if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_VERSION_STALE' then raise; end if; end;
end $$;
select public.complete_document_render_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1','10330000-0000-4000-8000-000000000062','10330000-0000-4000-8000-000000000073');
select private.enjaz_p103r3_assert((public.complete_document_render_v1(current_setting('p103r3.render_job')::uuid,'p103r3-service-1','10330000-0000-4000-8000-000000000062','10330000-0000-4000-8000-000000000073')->>'wasDuplicate')::boolean,'completion replay failed');

-- Owner finalization must reject arbitrary/failed proof. Exact proof succeeds inside a subtransaction that is deliberately rolled back after assertions.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r3.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r3.owner_user'),true);
set local role authenticated;
do $$ begin
  begin perform public.finalize_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid,'00000000-0000-4000-8000-000000000099'::uuid); raise exception 'arbitrary finalization accepted'; exception when no_data_found then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED' then raise; end if; end;
  begin perform public.finalize_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.ocr_draft')::uuid,current_setting('p103r3.failed_job')::uuid); raise exception 'failed render finalized'; exception when no_data_found then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED' then raise; end if; end;
end $$;
do $$ declare r jsonb; begin
  begin
    r:=public.finalize_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.main_draft')::uuid,current_setting('p103r3.render_job')::uuid);
    if r->>'status'<>'final' or r->>'documentId'<>'10330000-0000-4000-8000-000000000062' or r->>'documentVersionId'<>'10330000-0000-4000-8000-000000000073' then raise exception 'finalization binding incorrect'; end if;
    if not exists(select 1 from public.document_drafts where id=current_setting('p103r3.main_draft')::uuid and status='final') then raise exception 'draft not final after exact proof'; end if;
    begin update public.document_drafts set title='illegal mutation' where id=current_setting('p103r3.main_draft')::uuid; raise exception 'final draft mutable'; exception when check_violation then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE' then raise; end if; end;
    raise exception 'ENJAZ_P103R3_ROLLBACK_FINALIZE';
  exception when raise_exception then
    if sqlerrm<>'ENJAZ_P103R3_ROLLBACK_FINALIZE' then raise; end if;
  end;
end $$;
select private.enjaz_p103r3_assert(exists(select 1 from public.document_drafts where id=current_setting('p103r3.main_draft')::uuid and status='approved' and final_document_id is null),'finalization subtransaction did not roll back cleanly');

-- Invalidate a company source after generation; approval must fail closed even without relying on transaction-stable now().
select set_config('p103r3.stale_draft',(public.generate_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,'10330000-0000-4000-8000-000000000041','10330000-0000-4000-8000-000000000020','Stale source draft','10330000-0000-4000-8000-000000000030',null,null,null)->>'draftId'),true);
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
update public.companies set deleted_at=clock_timestamp() where id='10330000-0000-4000-8000-000000000030';
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r3.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r3.owner_user'),true);
set local role authenticated;
do $$ begin
  begin perform public.review_document_draft_v1(current_setting('p103r3.owner_ws')::uuid,current_setting('p103r3.stale_draft')::uuid,'approve','must fail'); raise exception 'invalidated source approved'; exception when serialization_failure then if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_SOURCE_STALE' then raise; end if; end;
end $$;
select private.enjaz_p103r3_assert((select count(*) from public.audit_events where workspace_id=current_setting('p103r3.owner_ws')::uuid and action in ('document.template.created','document.template.updated','document.template.version.created','document.template.version.published','document.factory.generated','document.factory.returned','document.factory.draft.edited','document.factory.review.requested','document.factory.approved','document.factory.render.requested','document.factory.render.succeeded','document.factory.render.failed'))>=11,'audit evidence incomplete');

-- Zero-residue cleanup. Published versions are immutable by design, so disable only that DELETE trigger during controlled probe cleanup and restore it before certification.
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
delete from public.pdf_jobs where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.document_drafts where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.audit_events where workspace_id=current_setting('p103r3.owner_ws')::uuid;
alter table public.document_template_versions disable trigger document_template_versions_immutable_v1;
delete from public.document_template_versions where workspace_id=current_setting('p103r3.owner_ws')::uuid;
alter table public.document_template_versions enable trigger document_template_versions_immutable_v1;
delete from public.document_templates where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.document_analysis where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.document_versions where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.documents where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.companies where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.workspace_memberships where workspace_id=current_setting('p103r3.owner_ws')::uuid;
delete from public.workspaces where id=current_setting('p103r3.owner_ws')::uuid;

select private.enjaz_p103r3_assert(
  not exists(select 1 from public.workspaces where id='10330000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.document_templates where workspace_id='10330000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.document_drafts where workspace_id='10330000-0000-4000-8000-000000000001'::uuid)
  and not exists(select 1 from public.documents where storage_path like '__p103r3__/%')
  and not exists(select 1 from public.pdf_jobs where workspace_id='10330000-0000-4000-8000-000000000001'::uuid),
  'probe residue remains'
);
select private.enjaz_p103r3_assert(
  exists(select 1 from pg_trigger g join pg_class t on t.oid=g.tgrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='document_template_versions' and g.tgname='document_template_versions_immutable_v1' and g.tgenabled<>'D')
  and to_regprocedure('public.finalize_document_draft_v1(uuid,uuid,uuid,uuid)') is null
  and to_regprocedure('public.finalize_document_draft_v1(uuid,uuid,uuid)') is not null,
  'authority restoration/signature drift'
);
drop function private.enjaz_p103r3_assert(boolean,text);
commit;