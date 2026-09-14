-- ENJAZ Phase 10.3 — governed transaction submission packs
begin;

create table if not exists public.document_submission_packs(
 id uuid primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 transaction_id uuid not null references public.transactions(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 320),
 status text not null default 'queued' check(status in('queued','running','succeeded','failed')),
 requested_by uuid not null references auth.users(id) on delete restrict,
 service_run_id text,
 manifest_checksum text not null check(manifest_checksum~'^[0-9a-f]{64}$'),
 output_document_id uuid references public.documents(id) on delete restrict,
 output_document_version_id uuid references public.document_versions(id) on delete restrict,
 failure_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint document_submission_packs_output_consistency check((status='succeeded' and output_document_id is not null and output_document_version_id is not null and failure_code is null) or (status<>'succeeded' and output_document_id is null and output_document_version_id is null))
);
create index if not exists document_submission_packs_workspace_tx_idx on public.document_submission_packs(workspace_id,transaction_id,created_at desc);
create index if not exists document_submission_packs_requested_by_idx on public.document_submission_packs(requested_by);

create table if not exists public.document_submission_pack_items(
 pack_id uuid not null references public.document_submission_packs(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 position integer not null check(position between 1 and 20),
 draft_id uuid not null references public.document_drafts(id) on delete restrict,
 document_id uuid not null references public.documents(id) on delete restrict,
 document_version_id uuid not null references public.document_versions(id) on delete restrict,
 source_content_checksum text not null check(source_content_checksum~'^[0-9a-f]{64}$'),
 source_fact_snapshot_checksum text not null check(source_fact_snapshot_checksum~'^[0-9a-f]{64}$'),
 primary key(pack_id,position),unique(pack_id,draft_id)
);
create index if not exists document_submission_pack_items_workspace_idx on public.document_submission_pack_items(workspace_id,pack_id,position);
create index if not exists document_submission_pack_items_draft_idx on public.document_submission_pack_items(draft_id);
create index if not exists document_submission_pack_items_document_idx on public.document_submission_pack_items(document_id,document_version_id);
alter table public.document_submission_packs enable row level security;
alter table public.document_submission_pack_items enable row level security;
revoke all on table public.document_submission_packs from public,anon,authenticated;
revoke all on table public.document_submission_pack_items from public,anon,authenticated;
grant select,insert,update,delete on table public.document_submission_packs to service_role;
grant select,insert,update,delete on table public.document_submission_pack_items to service_role;

create or replace function public.request_document_submission_pack_v1(p_workspace_id uuid,p_request_id uuid,p_transaction_id uuid,p_title text,p_draft_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid;v_title text:=btrim(coalesce(p_title,''));v_existing public.document_submission_packs%rowtype;v_draft public.document_drafts%rowtype;
 v_id uuid;v_position integer:=0;v_manifest text;v_existing_ids uuid[];v_items jsonb:='[]'::jsonb;v_item jsonb;
begin
 v_actor:=private.require_document_factory_member_v1(p_workspace_id);
 if p_request_id is null or p_transaction_id is null then raise invalid_parameter_value using message='ENJAZ_SUBMISSION_PACK_REQUEST_INVALID'; end if;
 if char_length(v_title) not between 1 and 320 then raise invalid_parameter_value using message='ENJAZ_SUBMISSION_PACK_TITLE_INVALID'; end if;
 if p_draft_ids is null or array_length(p_draft_ids,1) not between 2 and 20 then raise invalid_parameter_value using message='ENJAZ_SUBMISSION_PACK_ITEMS_INVALID'; end if;
 if(select count(distinct x) from unnest(p_draft_ids)x)<>array_length(p_draft_ids,1) then raise invalid_parameter_value using message='ENJAZ_SUBMISSION_PACK_DUPLICATE_ITEM'; end if;
 if not exists(select 1 from public.transactions t where t.workspace_id=p_workspace_id and t.id=p_transaction_id and t.deleted_at is null) then raise no_data_found using message='ENJAZ_SUBMISSION_PACK_TRANSACTION_NOT_FOUND'; end if;
 select * into v_existing from public.document_submission_packs p where p.id=p_request_id;
 if found then
  select array_agg(i.draft_id order by i.position) into v_existing_ids from public.document_submission_pack_items i where i.pack_id=v_existing.id;
  if v_existing.workspace_id<>p_workspace_id or v_existing.transaction_id<>p_transaction_id or v_existing.title<>v_title or v_existing_ids is distinct from p_draft_ids then raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_REQUEST_DRIFT'; end if;
  return jsonb_build_object('schema','enjaz.document-submission-pack.v1','packId',v_existing.id,'status',v_existing.status,'manifestChecksum',v_existing.manifest_checksum,'outputDocumentId',v_existing.output_document_id,'outputDocumentVersionId',v_existing.output_document_version_id,'wasDuplicate',true);
 end if;
 foreach v_id in array p_draft_ids loop
  v_position:=v_position+1;
  select * into v_draft from public.document_drafts d where d.workspace_id=p_workspace_id and d.id=v_id;
  if not found or v_draft.status<>'final' or v_draft.transaction_id is distinct from p_transaction_id or v_draft.final_document_id is null or v_draft.final_document_version_id is null then raise check_violation using message='ENJAZ_SUBMISSION_PACK_FINAL_TRANSACTION_DRAFT_REQUIRED'; end if;
  if not exists(select 1 from public.document_versions dv where dv.workspace_id=p_workspace_id and dv.id=v_draft.final_document_version_id and dv.document_id=v_draft.final_document_id and lower(dv.mime_type)='application/pdf') then raise check_violation using message='ENJAZ_SUBMISSION_PACK_PDF_VERSION_REQUIRED'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('position',v_position,'draftId',v_draft.id,'documentId',v_draft.final_document_id,'documentVersionId',v_draft.final_document_version_id,'contentChecksum',v_draft.content_checksum,'factSnapshotChecksum',v_draft.fact_snapshot_checksum));
 end loop;
 v_manifest:=encode(extensions.digest(convert_to(v_items::text,'UTF8'),'sha256'),'hex');
 insert into public.document_submission_packs(id,workspace_id,transaction_id,title,status,requested_by,manifest_checksum) values(p_request_id,p_workspace_id,p_transaction_id,v_title,'queued',v_actor,v_manifest);
 for v_item in select value from jsonb_array_elements(v_items) loop
  insert into public.document_submission_pack_items(pack_id,workspace_id,position,draft_id,document_id,document_version_id,source_content_checksum,source_fact_snapshot_checksum)
  values(p_request_id,p_workspace_id,(v_item->>'position')::integer,(v_item->>'draftId')::uuid,(v_item->>'documentId')::uuid,(v_item->>'documentVersionId')::uuid,v_item->>'contentChecksum',v_item->>'factSnapshotChecksum');
 end loop;
 insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'document.submission_pack.requested','document_submission_pack',p_request_id,'Submission pack requested from finalized transaction documents',jsonb_build_object('transactionId',p_transaction_id,'itemCount',array_length(p_draft_ids,1),'manifestChecksum',v_manifest));
 return jsonb_build_object('schema','enjaz.document-submission-pack.v1','packId',p_request_id,'status','queued','manifestChecksum',v_manifest,'wasDuplicate',false);
end;$$;
revoke all on function public.request_document_submission_pack_v1(uuid,uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.request_document_submission_pack_v1(uuid,uuid,uuid,text,uuid[]) to authenticated;

create or replace function public.get_document_submission_pack_v1(p_workspace_id uuid,p_pack_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_pack public.document_submission_packs%rowtype;
begin
 perform private.require_document_factory_member_v1(p_workspace_id);
 select * into v_pack from public.document_submission_packs p where p.workspace_id=p_workspace_id and p.id=p_pack_id;
 if not found then raise no_data_found using message='ENJAZ_SUBMISSION_PACK_NOT_FOUND'; end if;
 return jsonb_build_object('schema','enjaz.document-submission-pack.v1','packId',v_pack.id,'transactionId',v_pack.transaction_id,'title',v_pack.title,'status',v_pack.status,'requestedBy',v_pack.requested_by,'manifestChecksum',v_pack.manifest_checksum,'outputDocumentId',v_pack.output_document_id,'outputDocumentVersionId',v_pack.output_document_version_id,'failureCode',v_pack.failure_code,'createdAt',v_pack.created_at,'updatedAt',v_pack.updated_at,'items',coalesce((select jsonb_agg(jsonb_build_object('position',i.position,'draftId',i.draft_id,'documentId',i.document_id,'documentVersionId',i.document_version_id,'contentChecksum',i.source_content_checksum,'factSnapshotChecksum',i.source_fact_snapshot_checksum) order by i.position) from public.document_submission_pack_items i where i.pack_id=v_pack.id),'[]'::jsonb));
end;$$;
revoke all on function public.get_document_submission_pack_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_document_submission_pack_v1(uuid,uuid) to authenticated;

create or replace function public.list_document_submission_packs_v1(p_workspace_id uuid,p_transaction_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_document_factory_member_v1(p_workspace_id);
 return coalesce((select jsonb_agg(jsonb_build_object('packId',p.id,'transactionId',p.transaction_id,'title',p.title,'status',p.status,'manifestChecksum',p.manifest_checksum,'outputDocumentId',p.output_document_id,'outputDocumentVersionId',p.output_document_version_id,'failureCode',p.failure_code,'createdAt',p.created_at,'updatedAt',p.updated_at,'itemCount',(select count(*) from public.document_submission_pack_items i where i.pack_id=p.id)) order by p.created_at desc) from public.document_submission_packs p where p.workspace_id=p_workspace_id and(p_transaction_id is null or p.transaction_id=p_transaction_id)),'[]'::jsonb);
end;$$;
revoke all on function public.list_document_submission_packs_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_document_submission_packs_v1(uuid,uuid) to authenticated;

create or replace function public.mark_document_submission_pack_running_v1(p_pack_id uuid,p_service_run_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pack public.document_submission_packs%rowtype;v_run text:=btrim(coalesce(p_service_run_id,''));
begin
 perform private.require_document_render_service_v1();if char_length(v_run) not between 1 and 200 then raise invalid_parameter_value using message='ENJAZ_SUBMISSION_PACK_SERVICE_RUN_INVALID';end if;
 select * into v_pack from public.document_submission_packs p where p.id=p_pack_id for update;if not found then raise no_data_found using message='ENJAZ_SUBMISSION_PACK_NOT_FOUND';end if;
 if v_pack.status='running' and v_pack.service_run_id=v_run then return jsonb_build_object('packId',v_pack.id,'status','running','wasDuplicate',true);end if;
 if v_pack.status<>'queued' then raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_STATE_DRIFT';end if;
 update public.document_submission_packs set status='running',service_run_id=v_run,updated_at=now() where id=v_pack.id;return jsonb_build_object('packId',v_pack.id,'status','running','wasDuplicate',false);
end;$$;
revoke all on function public.mark_document_submission_pack_running_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.mark_document_submission_pack_running_v1(uuid,text) to service_role;

create or replace function public.complete_document_submission_pack_v1(p_pack_id uuid,p_service_run_id text,p_document_id uuid,p_document_version_id uuid,p_manifest_checksum text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pack public.document_submission_packs%rowtype;
begin
 perform private.require_document_render_service_v1();select * into v_pack from public.document_submission_packs p where p.id=p_pack_id for update;if not found then raise no_data_found using message='ENJAZ_SUBMISSION_PACK_NOT_FOUND';end if;
 if v_pack.status='succeeded' then if v_pack.output_document_id=p_document_id and v_pack.output_document_version_id=p_document_version_id and v_pack.manifest_checksum=p_manifest_checksum then return jsonb_build_object('packId',v_pack.id,'status','succeeded','wasDuplicate',true);end if;raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_COMPLETION_DRIFT';end if;
 if v_pack.status<>'running' or v_pack.service_run_id is distinct from p_service_run_id or v_pack.manifest_checksum is distinct from p_manifest_checksum then raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_RENDER_PROOF_DRIFT';end if;
 if not exists(select 1 from public.document_versions dv where dv.workspace_id=v_pack.workspace_id and dv.id=p_document_version_id and dv.document_id=p_document_id and lower(dv.mime_type)='application/pdf') then raise foreign_key_violation using message='ENJAZ_SUBMISSION_PACK_OUTPUT_VERSION_INVALID';end if;
 update public.document_submission_packs set status='succeeded',output_document_id=p_document_id,output_document_version_id=p_document_version_id,failure_code=null,updated_at=now() where id=v_pack.id;
 insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(v_pack.workspace_id,v_pack.requested_by,'document.submission_pack.completed','document_submission_pack',v_pack.id,'Submission pack rendered into Document Vault',jsonb_build_object('documentId',p_document_id,'documentVersionId',p_document_version_id,'manifestChecksum',p_manifest_checksum));
 return jsonb_build_object('packId',v_pack.id,'status','succeeded','documentId',p_document_id,'documentVersionId',p_document_version_id,'wasDuplicate',false);
end;$$;
revoke all on function public.complete_document_submission_pack_v1(uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_document_submission_pack_v1(uuid,text,uuid,uuid,text) to service_role;

create or replace function public.fail_document_submission_pack_v1(p_pack_id uuid,p_service_run_id text,p_failure_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pack public.document_submission_packs%rowtype;v_code text:=upper(btrim(coalesce(p_failure_code,'')));
begin
 perform private.require_document_render_service_v1();if char_length(v_code) not between 1 and 160 then v_code:='SUBMISSION_PACK_FAILED';end if;
 select * into v_pack from public.document_submission_packs p where p.id=p_pack_id for update;if not found then raise no_data_found using message='ENJAZ_SUBMISSION_PACK_NOT_FOUND';end if;
 if v_pack.status='succeeded' then raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_ALREADY_SUCCEEDED';end if;if v_pack.status='failed' then return jsonb_build_object('packId',v_pack.id,'status','failed','wasDuplicate',true);end if;
 if v_pack.status='running' and v_pack.service_run_id is distinct from p_service_run_id then raise serialization_failure using message='ENJAZ_SUBMISSION_PACK_SERVICE_RUN_DRIFT';end if;
 update public.document_submission_packs set status='failed',failure_code=v_code,updated_at=now() where id=v_pack.id;return jsonb_build_object('packId',v_pack.id,'status','failed','wasDuplicate',false);
end;$$;
revoke all on function public.fail_document_submission_pack_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.fail_document_submission_pack_v1(uuid,text,text) to service_role;
commit;
