-- ENJAZ Phase 10.3 — official render proof authority
-- Finalization may consume only a service-completed render job bound to the exact approved draft.
begin;

alter table public.pdf_jobs add column if not exists source_draft_id uuid;
alter table public.pdf_jobs add column if not exists source_template_version_id uuid;
alter table public.pdf_jobs add column if not exists source_content_checksum text;
alter table public.pdf_jobs add column if not exists source_fact_snapshot_checksum text;
alter table public.pdf_jobs add column if not exists request_id uuid;
alter table public.pdf_jobs add column if not exists requested_by uuid references auth.users(id) on delete set null;
alter table public.pdf_jobs add column if not exists output_document_version_id uuid;
alter table public.pdf_jobs add column if not exists service_run_id text;
alter table public.pdf_jobs add column if not exists failure_code text;

alter table public.pdf_jobs add constraint pdf_jobs_source_draft_fk
  foreign key(workspace_id,source_draft_id)
  references public.document_drafts(workspace_id,id) on delete restrict;
alter table public.pdf_jobs add constraint pdf_jobs_source_template_version_fk
  foreign key(workspace_id,source_template_version_id)
  references public.document_template_versions(workspace_id,id) on delete restrict;
alter table public.pdf_jobs add constraint pdf_jobs_output_document_version_fk
  foreign key(workspace_id,output_document_id,output_document_version_id)
  references public.document_versions(workspace_id,document_id,id) on delete restrict;
alter table public.pdf_jobs add constraint pdf_jobs_source_content_checksum_check
  check(source_content_checksum is null or source_content_checksum ~ '^[0-9a-f]{64}$');
alter table public.pdf_jobs add constraint pdf_jobs_source_fact_checksum_check
  check(source_fact_snapshot_checksum is null or source_fact_snapshot_checksum ~ '^[0-9a-f]{64}$');
alter table public.pdf_jobs add constraint pdf_jobs_service_run_id_check
  check(service_run_id is null or char_length(btrim(service_run_id)) between 1 and 240);
alter table public.pdf_jobs add constraint pdf_jobs_failure_code_check
  check(failure_code is null or char_length(btrim(failure_code)) between 1 and 160);
alter table public.pdf_jobs add constraint pdf_jobs_official_render_consistency_check
  check(
    coalesce(plan->>'schema','')<>'enjaz.document-render.v1'
    or (
      source_draft_id is not null
      and source_template_version_id is not null
      and source_content_checksum is not null
      and source_fact_snapshot_checksum is not null
      and request_id is not null
      and (
        (status='succeeded' and output_document_id is not null and output_document_version_id is not null and service_run_id is not null and failure_code is null)
        or (status in ('queued','running') and output_document_id is null and output_document_version_id is null and completed_at is null and failure_code is null)
        or (status in ('failed','cancelled') and output_document_id is null and output_document_version_id is null and completed_at is not null)
      )
    )
  );

create unique index if not exists pdf_jobs_official_render_request_unique
  on public.pdf_jobs(workspace_id,request_id) where request_id is not null;
create index if not exists pdf_jobs_source_draft_idx
  on public.pdf_jobs(workspace_id,source_draft_id,created_at desc) where source_draft_id is not null;
create index if not exists pdf_jobs_source_template_version_idx
  on public.pdf_jobs(workspace_id,source_template_version_id) where source_template_version_id is not null;
create index if not exists pdf_jobs_output_document_version_idx
  on public.pdf_jobs(workspace_id,output_document_id,output_document_version_id) where output_document_version_id is not null;
create index if not exists pdf_jobs_requested_by_idx
  on public.pdf_jobs(requested_by) where requested_by is not null;

-- Browser may observe its workspace render jobs but cannot forge queue/service state.
drop policy if exists pdf_jobs_insert_workspace on public.pdf_jobs;
drop policy if exists pdf_jobs_update_workspace on public.pdf_jobs;
revoke insert,update,delete on table public.pdf_jobs from public,anon,authenticated;
grant select on table public.pdf_jobs to authenticated;

create or replace function private.require_document_render_service_v1()
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then
    raise insufficient_privilege using message='ENJAZ_DOCUMENT_RENDER_SERVICE_REQUIRED';
  end if;
end;$$;
revoke all on function private.require_document_render_service_v1() from public,anon,authenticated;
grant execute on function private.require_document_render_service_v1() to service_role;

create or replace function public.request_document_render_v1(
  p_workspace_id uuid,
  p_request_id uuid,
  p_draft_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_draft public.document_drafts%rowtype;
  v_existing public.pdf_jobs%rowtype;
  v_content_checksum text;
  v_fact_checksum text;
  v_job_id uuid:=gen_random_uuid();
  v_plan jsonb;
begin
  v_actor:=private.require_document_factory_member_v1(p_workspace_id);
  if p_request_id is null or p_draft_id is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_REQUEST_INVALID'; end if;

  select * into v_existing from public.pdf_jobs j where j.workspace_id=p_workspace_id and j.request_id=p_request_id;
  if found then
    if v_existing.source_draft_id is distinct from p_draft_id or v_existing.plan->>'schema'<>'enjaz.document-render.v1' then
      raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_REQUEST_DRIFT';
    end if;
    return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v_existing.id,'draftId',v_existing.source_draft_id,'status',v_existing.status,'wasDuplicate',true);
  end if;

  select * into v_draft from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=p_draft_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_FOUND'; end if;
  if v_draft.status<>'approved' or v_draft.template_version_id is null or v_draft.approved_at is null then
    raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_APPROVED_DRAFT_REQUIRED';
  end if;
  perform private.assert_document_factory_provenance_current_v1(p_workspace_id,v_draft.template_version_id,v_draft.provenance);
  v_content_checksum:=encode(extensions.digest(convert_to(v_draft.compiled_content,'UTF8'),'sha256'),'hex');
  v_fact_checksum:=encode(extensions.digest(convert_to(v_draft.fact_snapshot::text,'UTF8'),'sha256'),'hex');
  if v_draft.content_checksum is distinct from v_content_checksum or v_draft.fact_snapshot_checksum is distinct from v_fact_checksum then
    raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT';
  end if;

  v_plan:=jsonb_build_object(
    'schema','enjaz.document-render.v1',
    'draftId',v_draft.id,
    'templateVersionId',v_draft.template_version_id,
    'contentChecksum',v_content_checksum,
    'factSnapshotChecksum',v_fact_checksum,
    'format','pdf',
    'direction','rtl',
    'language','ar'
  );
  insert into public.pdf_jobs(
    id,workspace_id,source_document_id,job_type,plan,status,output_document_id,
    source_draft_id,source_template_version_id,source_content_checksum,source_fact_snapshot_checksum,
    request_id,requested_by,output_document_version_id,service_run_id,failure_code
  ) values(
    v_job_id,p_workspace_id,null,'export',v_plan,'queued',null,
    v_draft.id,v_draft.template_version_id,v_content_checksum,v_fact_checksum,
    p_request_id,v_actor,null,null,null
  );

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.render.requested','document_draft',v_draft.id,'Approved official draft queued for governed PDF rendering',jsonb_build_object('renderJobId',v_job_id,'requestId',p_request_id,'contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum));
  return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v_job_id,'draftId',v_draft.id,'status','queued','wasDuplicate',false);
end;$$;

create or replace function public.mark_document_render_running_v1(p_job_id uuid,p_service_run_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.pdf_jobs%rowtype;v_run text:=btrim(coalesce(p_service_run_id,''));
begin
  perform private.require_document_render_service_v1();
  if p_job_id is null or char_length(v_run) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_SERVICE_INPUT_INVALID'; end if;
  select * into v from public.pdf_jobs j where j.id=p_job_id for update;
  if not found or v.plan->>'schema'<>'enjaz.document-render.v1' then raise no_data_found using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_FOUND'; end if;
  if v.status='running' and v.service_run_id=v_run then return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','running','wasDuplicate',true); end if;
  if v.status<>'queued' then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_QUEUED'; end if;
  update public.pdf_jobs set status='running',service_run_id=v_run where id=v.id;
  return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','running','wasDuplicate',false);
end;$$;

create or replace function public.complete_document_render_v1(
  p_job_id uuid,p_service_run_id text,p_document_id uuid,p_document_version_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v public.pdf_jobs%rowtype;
  v_draft public.document_drafts%rowtype;
  v_doc public.documents%rowtype;
  v_ver public.document_versions%rowtype;
  v_latest public.document_versions%rowtype;
  v_run text:=btrim(coalesce(p_service_run_id,''));
  v_content_checksum text;
  v_fact_checksum text;
begin
  perform private.require_document_render_service_v1();
  select * into v from public.pdf_jobs j where j.id=p_job_id for update;
  if not found or v.plan->>'schema'<>'enjaz.document-render.v1' then raise no_data_found using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_FOUND'; end if;
  if v.status='succeeded' then
    if v.service_run_id=v_run and v.output_document_id=p_document_id and v.output_document_version_id=p_document_version_id then
      return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','succeeded','documentId',v.output_document_id,'documentVersionId',v.output_document_version_id,'wasDuplicate',true);
    end if;
    raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_COMPLETION_DRIFT';
  end if;
  if v.status not in ('queued','running') or char_length(v_run) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_COMPLETABLE'; end if;
  if v.status='running' and v.service_run_id is distinct from v_run then raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_SERVICE_RUN_DRIFT'; end if;

  select * into v_draft from public.document_drafts d where d.workspace_id=v.workspace_id and d.id=v.source_draft_id for update;
  if not found or v_draft.status<>'approved' or v_draft.template_version_id is distinct from v.source_template_version_id then
    raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_SOURCE_DRAFT_CHANGED';
  end if;
  perform private.assert_document_factory_provenance_current_v1(v.workspace_id,v_draft.template_version_id,v_draft.provenance);
  v_content_checksum:=encode(extensions.digest(convert_to(v_draft.compiled_content,'UTF8'),'sha256'),'hex');
  v_fact_checksum:=encode(extensions.digest(convert_to(v_draft.fact_snapshot::text,'UTF8'),'sha256'),'hex');
  if v.source_content_checksum is distinct from v_content_checksum
     or v.source_fact_snapshot_checksum is distinct from v_fact_checksum
     or v_draft.content_checksum is distinct from v_content_checksum
     or v_draft.fact_snapshot_checksum is distinct from v_fact_checksum then
    raise data_exception using message='ENJAZ_DOCUMENT_RENDER_SOURCE_CHECKSUM_DRIFT';
  end if;

  select * into v_doc from public.documents d where d.workspace_id=v.workspace_id and d.id=p_document_id and d.status='ready';
  if not found or v_doc.document_type is distinct from 'generated-official' then raise no_data_found using message='ENJAZ_DOCUMENT_RENDER_OUTPUT_NOT_READY'; end if;
  select * into v_ver from public.document_versions dv where dv.workspace_id=v.workspace_id and dv.document_id=p_document_id and dv.id=p_document_version_id;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_RENDER_OUTPUT_VERSION_NOT_FOUND'; end if;
  select * into v_latest from public.document_versions dv where dv.workspace_id=v.workspace_id and dv.document_id=p_document_id order by dv.version_number desc limit 1;
  if not found or v_latest.id<>p_document_version_id then raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_OUTPUT_VERSION_STALE'; end if;
  if v_draft.company_id is not null and v_doc.company_id is distinct from v_draft.company_id then raise foreign_key_violation using message='ENJAZ_DOCUMENT_RENDER_OUTPUT_COMPANY_MISMATCH'; end if;
  if v_draft.transaction_id is not null and v_doc.transaction_id is distinct from v_draft.transaction_id then raise foreign_key_violation using message='ENJAZ_DOCUMENT_RENDER_OUTPUT_TRANSACTION_MISMATCH'; end if;

  update public.pdf_jobs set status='succeeded',service_run_id=v_run,output_document_id=p_document_id,output_document_version_id=p_document_version_id,completed_at=now(),failure_code=null where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,null,'document.factory.render.succeeded','document_draft',v_draft.id,'Official PDF render completed through service-only authority',jsonb_build_object('renderJobId',v.id,'serviceRunId',v_run,'documentId',p_document_id,'documentVersionId',p_document_version_id,'contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum));
  return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','succeeded','documentId',p_document_id,'documentVersionId',p_document_version_id,'wasDuplicate',false);
end;$$;

create or replace function public.fail_document_render_v1(p_job_id uuid,p_service_run_id text,p_failure_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.pdf_jobs%rowtype;v_run text:=btrim(coalesce(p_service_run_id,''));v_code text:=upper(btrim(coalesce(p_failure_code,'')));
begin
  perform private.require_document_render_service_v1();
  if char_length(v_run) not between 1 and 240 or char_length(v_code) not between 1 and 160 then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_FAILURE_INPUT_INVALID'; end if;
  select * into v from public.pdf_jobs j where j.id=p_job_id for update;
  if not found or v.plan->>'schema'<>'enjaz.document-render.v1' then raise no_data_found using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_FOUND'; end if;
  if v.status='failed' and v.service_run_id=v_run and v.failure_code=v_code then return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','failed','wasDuplicate',true); end if;
  if v.status not in ('queued','running') then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_RENDER_JOB_NOT_FAILABLE'; end if;
  if v.status='running' and v.service_run_id is distinct from v_run then raise serialization_failure using message='ENJAZ_DOCUMENT_RENDER_SERVICE_RUN_DRIFT'; end if;
  update public.pdf_jobs set status='failed',service_run_id=v_run,failure_code=v_code,completed_at=now(),output_document_id=null,output_document_version_id=null where id=v.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(v.workspace_id,null,'document.factory.render.failed','document_draft',v.source_draft_id,'Official PDF render failed without finalizing the draft',jsonb_build_object('renderJobId',v.id,'serviceRunId',v_run,'failureCode',v_code));
  return jsonb_build_object('schema','enjaz.document-render-job.v1','jobId',v.id,'status','failed','wasDuplicate',false);
end;$$;

-- Remove the provisional arbitrary-output finalizer from the runtime foundation.
revoke all on function public.finalize_document_draft_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
drop function public.finalize_document_draft_v1(uuid,uuid,uuid,uuid);

create or replace function public.finalize_document_draft_v1(
  p_workspace_id uuid,p_draft_id uuid,p_render_job_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid;
  v_draft public.document_drafts%rowtype;
  v_job public.pdf_jobs%rowtype;
  v_content_checksum text;
  v_fact_checksum text;
begin
  v_actor:=private.require_document_factory_owner_v1(p_workspace_id);
  select * into v_draft from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=p_draft_id for update;
  if not found then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_NOT_FOUND'; end if;
  if v_draft.status='final' then
    select * into v_job from public.pdf_jobs j where j.workspace_id=p_workspace_id and j.id=p_render_job_id;
    if found and v_job.status='succeeded' and v_job.source_draft_id=v_draft.id and v_job.output_document_id=v_draft.final_document_id and v_job.output_document_version_id=v_draft.final_document_version_id then
      return jsonb_build_object('schema','enjaz.document-finalization.v1','draftId',v_draft.id,'status','final','renderJobId',v_job.id,'documentId',v_draft.final_document_id,'documentVersionId',v_draft.final_document_version_id,'wasDuplicate',true);
    end if;
    raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_FINALIZATION_DRIFT';
  end if;
  if v_draft.status<>'approved' or v_draft.template_version_id is null or v_draft.approved_at is null then raise invalid_parameter_value using message='ENJAZ_DOCUMENT_FACTORY_APPROVAL_REQUIRED'; end if;
  perform private.assert_document_factory_provenance_current_v1(p_workspace_id,v_draft.template_version_id,v_draft.provenance);
  v_content_checksum:=encode(extensions.digest(convert_to(v_draft.compiled_content,'UTF8'),'sha256'),'hex');
  v_fact_checksum:=encode(extensions.digest(convert_to(v_draft.fact_snapshot::text,'UTF8'),'sha256'),'hex');
  if v_draft.content_checksum is distinct from v_content_checksum or v_draft.fact_snapshot_checksum is distinct from v_fact_checksum then raise data_exception using message='ENJAZ_DOCUMENT_FACTORY_DRAFT_CHECKSUM_DRIFT'; end if;

  select * into v_job from public.pdf_jobs j where j.workspace_id=p_workspace_id and j.id=p_render_job_id for update;
  if not found or v_job.plan->>'schema'<>'enjaz.document-render.v1' or v_job.status<>'succeeded' then raise no_data_found using message='ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED'; end if;
  if v_job.source_draft_id<>v_draft.id
     or v_job.source_template_version_id<>v_draft.template_version_id
     or v_job.source_content_checksum<>v_content_checksum
     or v_job.source_fact_snapshot_checksum<>v_fact_checksum
     or v_job.output_document_id is null
     or v_job.output_document_version_id is null then
    raise serialization_failure using message='ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_DRIFT';
  end if;

  update public.document_drafts set status='final',final_document_id=v_job.output_document_id,final_document_version_id=v_job.output_document_version_id,finalized_by=v_actor,finalized_at=now(),updated_at=now() where id=v_draft.id;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(p_workspace_id,v_actor,'document.factory.finalized','document_draft',v_draft.id,'Approved document finalized from exact service-completed render proof',jsonb_build_object('renderJobId',v_job.id,'documentId',v_job.output_document_id,'documentVersionId',v_job.output_document_version_id,'contentChecksum',v_content_checksum,'factSnapshotChecksum',v_fact_checksum));
  return jsonb_build_object('schema','enjaz.document-finalization.v1','draftId',v_draft.id,'status','final','renderJobId',v_job.id,'documentId',v_job.output_document_id,'documentVersionId',v_job.output_document_version_id,'wasDuplicate',false);
end;$$;

revoke all on function public.request_document_render_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.mark_document_render_running_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.complete_document_render_v1(uuid,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.fail_document_render_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.finalize_document_draft_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.request_document_render_v1(uuid,uuid,uuid) to authenticated;
grant execute on function public.finalize_document_draft_v1(uuid,uuid,uuid) to authenticated;
grant execute on function public.mark_document_render_running_v1(uuid,text) to service_role;
grant execute on function public.complete_document_render_v1(uuid,text,uuid,uuid) to service_role;
grant execute on function public.fail_document_render_v1(uuid,text,text) to service_role;

commit;
