-- ENJAZ Phase 10.3 — authenticated Real Cloud runtime + render authority probe
-- Evidence migration. Exercises governed template/generation/review/render/finalization lanes and removes all fixtures.
begin;

create or replace function private.enjaz_phase103_runtime_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ENJAZ_PHASE103_RUNTIME_PROBE_FAILED: %',p_message;
  end if;
end;$$;
revoke all on function private.enjaz_phase103_runtime_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase103_runtime_probe_assert(boolean,text) to authenticated,service_role;

select private.enjaz_phase103_runtime_probe_assert(
  not exists(select 1 from auth.users where id in ('10310000-0000-4000-8000-000000000001'::uuid,'10310000-0000-4000-8000-000000000002'::uuid)
    or email in ('__enjaz_p103_runtime_owner__@example.invalid','__enjaz_p103_runtime_outsider__@example.invalid'))
  and not exists(select 1 from public.document_templates where id='10310000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.pdf_jobs where request_id in ('10310000-0000-4000-8000-000000000050'::uuid,'10310000-0000-4000-8000-000000000051'::uuid)),
  'probe residue exists before execution'
);

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('10310000-0000-4000-8000-000000000001','authenticated','authenticated','__enjaz_p103_runtime_owner__@example.invalid',now(),jsonb_build_object('provider','email','providers',jsonb_build_array('email')),jsonb_build_object('display_name','P103 Runtime Owner'),now(),now()),
('10310000-0000-4000-8000-000000000002','authenticated','authenticated','__enjaz_p103_runtime_outsider__@example.invalid',now(),jsonb_build_object('provider','email','providers',jsonb_build_array('email')),jsonb_build_object('display_name','P103 Runtime Outsider'),now(),now());

select set_config('p103r.owner_user','10310000-0000-4000-8000-000000000001',true);
select set_config('p103r.outsider_user','10310000-0000-4000-8000-000000000002',true);
select set_config('p103r.owner_ws',(select workspace_id::text from public.workspace_memberships where user_id='10310000-0000-4000-8000-000000000001'::uuid and role='owner' order by created_at limit 1),true);
select set_config('p103r.outsider_ws',(select workspace_id::text from public.workspace_memberships where user_id='10310000-0000-4000-8000-000000000002'::uuid and role='owner' order by created_at limit 1),true);
select private.enjaz_phase103_runtime_probe_assert(nullif(current_setting('p103r.owner_ws',true),'') is not null,'owner bootstrap workspace missing');
select private.enjaz_phase103_runtime_probe_assert(nullif(current_setting('p103r.outsider_ws',true),'') is not null,'outsider bootstrap workspace missing');
select private.enjaz_phase103_runtime_probe_assert(current_setting('p103r.owner_ws')<>current_setting('p103r.outsider_ws'),'workspace isolation failed');

insert into public.companies(id,workspace_id,legal_name,display_name,capital,address,registration_number,legal_status) values
('10310000-0000-4000-8000-000000000030',current_setting('p103r.owner_ws')::uuid,'شركة إنجاز التجريبية','إنجاز التجريبية',100000000,'بغداد','P103-001','محدودة المسؤولية'),
('10310000-0000-4000-8000-000000000031',current_setting('p103r.owner_ws')::uuid,'شركة أخرى','شركة أخرى',2000000,'بغداد','P103-002','محدودة المسؤولية');

-- Disposable OCR authority fixture: v2 is current; analysis 90 is unverified, 91 is stale, 92 is verified/current.
insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,status,company_id) values
('10310000-0000-4000-8000-000000000080',current_setting('p103r.owner_ws')::uuid,'OCR source','source','application/pdf','__p103runtime__/ocr-source.pdf',100,'ready','10310000-0000-4000-8000-000000000030');
insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum) values
('10310000-0000-4000-8000-000000000081',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000080',1,'__p103runtime__/ocr-source-v1.pdf','application/pdf',100,repeat('a',64)),
('10310000-0000-4000-8000-000000000082',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000080',2,'__p103runtime__/ocr-source-v2.pdf','application/pdf',101,repeat('b',64));
insert into public.document_analysis(id,workspace_id,document_id,analysis_version,extracted_fields,review_status,provider,document_version_id,source_version_number,source_checksum,verification_state,page_results,provenance,verified_by,verified_at) values
('10310000-0000-4000-8000-000000000090',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000080',1,jsonb_build_object('number',jsonb_build_object('value','UNVERIFIED')),'approved','probe','10310000-0000-4000-8000-000000000082',2,repeat('b',64),'reviewed','[]','{}',null,null),
('10310000-0000-4000-8000-000000000091',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000080',2,jsonb_build_object('number',jsonb_build_object('value','STALE')),'approved','probe','10310000-0000-4000-8000-000000000081',1,repeat('a',64),'verified','[]','{}','10310000-0000-4000-8000-000000000001',now()),
('10310000-0000-4000-8000-000000000092',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000080',3,jsonb_build_object('number',jsonb_build_object('value','2026/55')),'approved','probe','10310000-0000-4000-8000-000000000082',2,repeat('b',64),'verified','[]','{}','10310000-0000-4000-8000-000000000001',now());

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r.owner_user'),true);
set local role authenticated;

select private.enjaz_phase103_runtime_probe_assert(auth.uid()=current_setting('p103r.owner_user')::uuid,'owner auth.uid mismatch');
select private.enjaz_phase103_runtime_probe_assert(
  not has_table_privilege('public.document_templates','INSERT')
  and not has_table_privilege('public.document_drafts','INSERT')
  and not has_table_privilege('public.pdf_jobs','INSERT')
  and not has_function_privilege('public.complete_document_render_v1(uuid,text,uuid,uuid)','EXECUTE'),
  'browser sensitive-write boundary leaked'
);

do $$ begin
  begin
    perform public.save_document_template_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000010','Bad template','official-letter','{{missing}}','{}'::jsonb,true);
    raise exception 'malformed token accepted';
  exception when invalid_parameter_value then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_UNDECLARED_TOKEN' then raise; end if;
  end;
end $$;

select public.save_document_template_v1(
  current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000010','Official company letter','official-letter',
  'الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true)),true
);
select public.create_document_template_version_v1(
  current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000020','10310000-0000-4000-8000-000000000010',
  'الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true))
);
select private.enjaz_phase103_runtime_probe_assert(
  (public.create_document_template_version_v1(
    current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000020','10310000-0000-4000-8000-000000000010',
    'الشركة / {{company_name}}',jsonb_build_object('company_name',jsonb_build_object('source','company','field','legal_name','required',true))
  )->>'wasDuplicate')::boolean,
  'template-version idempotent replay failed'
);
select public.publish_document_template_version_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000020');
select private.enjaz_phase103_runtime_probe_assert(
  (public.publish_document_template_version_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000020')->>'wasDuplicate')::boolean,
  'publish replay failed'
);

select set_config('p103r.main_draft',(
  public.generate_document_draft_v1(
    current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000040','10310000-0000-4000-8000-000000000020',
    'كتاب شركة إنجاز','10310000-0000-4000-8000-000000000030',null,null,null
  )->>'draftId'
),true);
select private.enjaz_phase103_runtime_probe_assert(
  (public.generate_document_draft_v1(
    current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000040','10310000-0000-4000-8000-000000000020',
    'كتاب شركة إنجاز','10310000-0000-4000-8000-000000000030',null,null,null
  )->>'wasDuplicate')::boolean,
  'generation idempotent replay failed'
);
select private.enjaz_phase103_runtime_probe_assert(
  exists(select 1 from public.document_drafts where id=current_setting('p103r.main_draft')::uuid and status='review_required' and compiled_content like '%شركة إنجاز التجريبية%'),
  'server-resolved company fact was not compiled'
);
select private.enjaz_phase103_runtime_probe_assert(
  (select count(*)=1 from public.documents where workspace_id=current_setting('p103r.owner_ws')::uuid),
  'logical generation mutated Vault document authority before render'
);

do $$ begin
  begin
    perform public.generate_document_draft_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000040','10310000-0000-4000-8000-000000000020','DRIFTED TITLE','10310000-0000-4000-8000-000000000030',null,null,null);
    raise exception 'generation request drift accepted';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_GENERATION_REQUEST_DRIFT' then raise; end if;
  end;
end $$;

select public.review_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,'return','تصحيح');
select public.update_document_draft_content_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,'الشركة / شركة إنجاز التجريبية - مصحح');
select public.submit_document_draft_for_review_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid);
select public.review_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,'approve','موافق');

select set_config('p103r.render_job',(
  public.request_document_render_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000050',current_setting('p103r.main_draft')::uuid)->>'jobId'
),true);
select private.enjaz_phase103_runtime_probe_assert(
  (public.request_document_render_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000050',current_setting('p103r.main_draft')::uuid)->>'wasDuplicate')::boolean,
  'render request replay failed'
);
do $$ begin
  begin
    perform public.request_document_render_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000099'::uuid);
    raise exception 'render request drift accepted';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_REQUEST_DRIFT' then raise; end if;
  end;
end $$;

-- Switch working template to OCR facts and publish a second immutable version.
select public.save_document_template_v1(
  current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000010','Official OCR letter','official-letter',
  'الرقم / {{ocr_number}}',jsonb_build_object('ocr_number',jsonb_build_object('source','ocr','field','number','required',true)),true
);
select public.create_document_template_version_v1(
  current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000021','10310000-0000-4000-8000-000000000010',
  'الرقم / {{ocr_number}}',jsonb_build_object('ocr_number',jsonb_build_object('source','ocr','field','number','required',true))
);
select public.publish_document_template_version_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000021');

do $$ begin
  begin
    perform public.generate_document_draft_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000043','10310000-0000-4000-8000-000000000021','OCR unverified',null,null,null,'10310000-0000-4000-8000-000000000090');
    raise exception 'unverified OCR accepted';
  exception when check_violation then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_OCR_NOT_VERIFIED' then raise; end if;
  end;
  begin
    perform public.generate_document_draft_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000044','10310000-0000-4000-8000-000000000021','OCR stale',null,null,null,'10310000-0000-4000-8000-000000000091');
    raise exception 'stale OCR accepted';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_OCR_STALE' then raise; end if;
  end;
end $$;
select set_config('p103r.ocr_draft',(
  public.generate_document_draft_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000045','10310000-0000-4000-8000-000000000021','OCR current',null,null,null,'10310000-0000-4000-8000-000000000092')->>'draftId'
),true);
select private.enjaz_phase103_runtime_probe_assert(
  exists(select 1 from public.document_drafts where id=current_setting('p103r.ocr_draft')::uuid and compiled_content like '%2026/55%'),
  'verified/current OCR was not compiled'
);
select public.review_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.ocr_draft')::uuid,'approve','OCR current approved');
select set_config('p103r.failed_render_job',(
  public.request_document_render_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000051',current_setting('p103r.ocr_draft')::uuid)->>'jobId'
),true);

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r.outsider_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r.outsider_user'),true);
set local role authenticated;
do $$ begin
  begin
    perform public.get_document_factory_v1(current_setting('p103r.owner_ws')::uuid);
    raise exception 'cross-workspace factory read accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.save_document_template_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000012','Outsider','official-letter','x','{}'::jsonb,true);
    raise exception 'outsider template write accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_WORKSPACE_FORBIDDEN' then raise; end if;
  end;
end $$;

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select private.enjaz_phase103_runtime_probe_assert(has_function_privilege('public.complete_document_render_v1(uuid,text,uuid,uuid)','EXECUTE'),'service render completion privilege missing');
select public.mark_document_render_running_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1');
select private.enjaz_phase103_runtime_probe_assert(
  (public.mark_document_render_running_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1')->>'wasDuplicate')::boolean,
  'render running replay failed'
);
select public.fail_document_render_v1(current_setting('p103r.failed_render_job')::uuid,'probe-service-fail-1','PROBE_FAILURE');
select private.enjaz_phase103_runtime_probe_assert(
  (select status='failed' and failure_code='PROBE_FAILURE' from public.pdf_jobs where id=current_setting('p103r.failed_render_job')::uuid),
  'service render failure lane did not persist expected failure state'
);

insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,status,company_id) values
('10310000-0000-4000-8000-000000000060',current_setting('p103r.owner_ws')::uuid,'Wrong type','ordinary','application/pdf','__p103runtime__/wrong-type.pdf',20,'ready','10310000-0000-4000-8000-000000000030'),
('10310000-0000-4000-8000-000000000061',current_setting('p103r.owner_ws')::uuid,'Wrong company','generated-official','application/pdf','__p103runtime__/wrong-company.pdf',20,'ready','10310000-0000-4000-8000-000000000031'),
('10310000-0000-4000-8000-000000000062',current_setting('p103r.owner_ws')::uuid,'Correct output','generated-official','application/pdf','__p103runtime__/correct.pdf',30,'ready','10310000-0000-4000-8000-000000000030');
insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum) values
('10310000-0000-4000-8000-000000000070',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000060',1,'__p103runtime__/wrong-type-v1.pdf','application/pdf',20,repeat('c',64)),
('10310000-0000-4000-8000-000000000071',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000061',1,'__p103runtime__/wrong-company-v1.pdf','application/pdf',20,repeat('d',64)),
('10310000-0000-4000-8000-000000000072',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000062',1,'__p103runtime__/correct-v1.pdf','application/pdf',29,repeat('e',64)),
('10310000-0000-4000-8000-000000000073',current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000062',2,'__p103runtime__/correct-v2.pdf','application/pdf',30,repeat('f',64));

do $$ begin
  begin
    perform public.complete_document_render_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1','10310000-0000-4000-8000-000000000060','10310000-0000-4000-8000-000000000070');
    raise exception 'wrong output type accepted';
  exception when no_data_found then
    if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_NOT_READY' then raise; end if;
  end;
  begin
    perform public.complete_document_render_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1','10310000-0000-4000-8000-000000000061','10310000-0000-4000-8000-000000000071');
    raise exception 'wrong company output accepted';
  exception when foreign_key_violation then
    if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_COMPANY_MISMATCH' then raise; end if;
  end;
  begin
    perform public.complete_document_render_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1','10310000-0000-4000-8000-000000000062','10310000-0000-4000-8000-000000000072');
    raise exception 'stale output version accepted';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_DOCUMENT_RENDER_OUTPUT_VERSION_STALE' then raise; end if;
  end;
end $$;
select public.complete_document_render_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1','10310000-0000-4000-8000-000000000062','10310000-0000-4000-8000-000000000073');
select private.enjaz_phase103_runtime_probe_assert(
  (public.complete_document_render_v1(current_setting('p103r.render_job')::uuid,'probe-service-run-1','10310000-0000-4000-8000-000000000062','10310000-0000-4000-8000-000000000073')->>'wasDuplicate')::boolean,
  'render completion replay failed'
);

reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r.owner_user'),true);
set local role authenticated;
do $$ begin
  begin
    perform public.finalize_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,'00000000-0000-4000-8000-000000000099'::uuid);
    raise exception 'arbitrary finalization accepted';
  exception when no_data_found then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED' then raise; end if;
  end;
  begin
    perform public.finalize_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.ocr_draft')::uuid,current_setting('p103r.failed_render_job')::uuid);
    raise exception 'failed render job finalized';
  exception when no_data_found then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED' then raise; end if;
  end;
end $$;
select public.finalize_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,current_setting('p103r.render_job')::uuid);
select private.enjaz_phase103_runtime_probe_assert(
  (public.finalize_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.main_draft')::uuid,current_setting('p103r.render_job')::uuid)->>'wasDuplicate')::boolean,
  'finalization replay failed'
);
select private.enjaz_phase103_runtime_probe_assert(
  exists(select 1 from public.document_drafts where id=current_setting('p103r.main_draft')::uuid and status='final' and final_document_id='10310000-0000-4000-8000-000000000062'::uuid and final_document_version_id='10310000-0000-4000-8000-000000000073'::uuid),
  'finalization did not bind exact render output version'
);

-- Generate another company-backed draft then mutate the source and prove approval fails closed.
select set_config('p103r.stale_draft',(
  public.generate_document_draft_v1(current_setting('p103r.owner_ws')::uuid,'10310000-0000-4000-8000-000000000041','10310000-0000-4000-8000-000000000020','Stale source draft','10310000-0000-4000-8000-000000000030',null,null,null)->>'draftId'
),true);
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
update public.companies set updated_at=updated_at+interval '1 second' where id='10310000-0000-4000-8000-000000000030';
do $$ begin
  begin
    update public.document_drafts set title='illegal final mutation' where id=current_setting('p103r.main_draft')::uuid;
    raise exception 'final draft was mutable';
  exception when check_violation then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p103r.owner_user'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p103r.owner_user'),true);
set local role authenticated;
do $$ begin
  begin
    perform public.review_document_draft_v1(current_setting('p103r.owner_ws')::uuid,current_setting('p103r.stale_draft')::uuid,'approve','stale must fail');
    raise exception 'stale authoritative source was approved';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_SOURCE_STALE' then raise; end if;
  end;
end $$;
select private.enjaz_phase103_runtime_probe_assert(
  (select count(*) from public.audit_events where workspace_id=current_setting('p103r.owner_ws')::uuid and action in (
    'document.template.created','document.template.updated','document.template.version.created','document.template.version.published',
    'document.factory.generated','document.factory.returned','document.factory.draft.edited','document.factory.review.requested',
    'document.factory.approved','document.factory.render.requested','document.factory.render.succeeded','document.factory.render.failed','document.factory.finalized'
  ))>=12,
  'runtime/render audit evidence incomplete'
);

-- Zero-residue cleanup. Disable only immutable DELETE triggers while fixtures are removed, then restore before PASS.
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
delete from public.pdf_jobs where workspace_id=current_setting('p103r.owner_ws')::uuid;
alter table public.document_drafts disable trigger document_drafts_final_immutable_v1;
delete from public.document_drafts where workspace_id=current_setting('p103r.owner_ws')::uuid;
alter table public.document_drafts enable trigger document_drafts_final_immutable_v1;
alter table public.document_template_versions disable trigger document_template_versions_immutable_v1;
delete from public.document_template_versions where workspace_id=current_setting('p103r.owner_ws')::uuid;
alter table public.document_template_versions enable trigger document_template_versions_immutable_v1;
delete from public.document_templates where workspace_id=current_setting('p103r.owner_ws')::uuid;
delete from public.document_analysis where workspace_id=current_setting('p103r.owner_ws')::uuid;
delete from public.document_versions where workspace_id=current_setting('p103r.owner_ws')::uuid;
delete from public.documents where workspace_id=current_setting('p103r.owner_ws')::uuid;
delete from public.companies where workspace_id=current_setting('p103r.owner_ws')::uuid;
delete from public.workspaces where id in (current_setting('p103r.owner_ws')::uuid,current_setting('p103r.outsider_ws')::uuid);
delete from auth.users where id in (current_setting('p103r.owner_user')::uuid,current_setting('p103r.outsider_user')::uuid);

select private.enjaz_phase103_runtime_probe_assert(
  not exists(select 1 from auth.users where id in ('10310000-0000-4000-8000-000000000001'::uuid,'10310000-0000-4000-8000-000000000002'::uuid))
  and not exists(select 1 from public.document_templates where id='10310000-0000-4000-8000-000000000010'::uuid)
  and not exists(select 1 from public.companies where id in ('10310000-0000-4000-8000-000000000030'::uuid,'10310000-0000-4000-8000-000000000031'::uuid))
  and not exists(select 1 from public.documents where id in ('10310000-0000-4000-8000-000000000060'::uuid,'10310000-0000-4000-8000-000000000061'::uuid,'10310000-0000-4000-8000-000000000062'::uuid,'10310000-0000-4000-8000-000000000080'::uuid))
  and not exists(select 1 from public.pdf_jobs where request_id in ('10310000-0000-4000-8000-000000000050'::uuid,'10310000-0000-4000-8000-000000000051'::uuid)),
  'probe residue remains after cleanup'
);
select private.enjaz_phase103_runtime_probe_assert(
  exists(select 1 from pg_trigger g join pg_class t on t.oid=g.tgrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='document_drafts' and g.tgname='document_drafts_final_immutable_v1' and g.tgenabled<>'D')
  and exists(select 1 from pg_trigger g join pg_class t on t.oid=g.tgrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='document_template_versions' and g.tgname='document_template_versions_immutable_v1' and g.tgenabled<>'D'),
  'immutable trigger was not restored'
);
select private.enjaz_phase103_runtime_probe_assert(
  to_regprocedure('public.finalize_document_draft_v1(uuid,uuid,uuid,uuid)') is null
  and to_regprocedure('public.finalize_document_draft_v1(uuid,uuid,uuid)') is not null,
  'finalizer authority signature drifted'
);

drop function private.enjaz_phase103_runtime_probe_assert(boolean,text);
commit;