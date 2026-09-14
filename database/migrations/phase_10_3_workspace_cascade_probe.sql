-- ENJAZ Phase 10.3 — workspace cascade + direct immutability proof
begin;

create or replace function private.enjaz_p103_workspace_assert(p_ok boolean,p_message text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_ok,false) then raise exception 'ENJAZ_P103_WORKSPACE_FAILED: %',p_message; end if;
end;$$;

select set_config('p103w.owner',(select owner_user_id::text from public.workspaces order by created_at limit 1),true);
select set_config('p103w.ws','10330000-0000-4000-8000-000000000101',true);
select private.enjaz_p103_workspace_assert(nullif(current_setting('p103w.owner',true),'') is not null,'owner fixture unavailable');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.workspaces where id=current_setting('p103w.ws')::uuid),'workspace residue exists');

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
values(current_setting('p103w.ws')::uuid,current_setting('p103w.owner')::uuid,'__ENJAZ_P103_WORKSPACE_CASCADE__','Asia/Baghdad','ar-IQ','IQD');

insert into public.document_templates(id,workspace_id,name,kind,body_source,token_schema,active)
values('10330000-0000-4000-8000-000000000102',current_setting('p103w.ws')::uuid,'Probe template','official-letter','probe','{}',true);

insert into public.document_template_versions(id,workspace_id,template_id,version_number,body_source,token_schema,status,content_checksum,created_by,published_by,published_at)
values('10330000-0000-4000-8000-000000000103',current_setting('p103w.ws')::uuid,'10330000-0000-4000-8000-000000000102',1,'probe','{}','published',repeat('a',64),current_setting('p103w.owner')::uuid,current_setting('p103w.owner')::uuid,clock_timestamp());

insert into public.documents(id,workspace_id,title,document_type,mime_type,storage_path,size_bytes,original_size_bytes,checksum,status)
values('10330000-0000-4000-8000-000000000104',current_setting('p103w.ws')::uuid,'Probe output','generated-official','application/pdf','__p103_workspace__/probe.pdf',1234,1234,repeat('c',64),'ready');
insert into public.document_versions(id,workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum)
values('10330000-0000-4000-8000-000000000105',current_setting('p103w.ws')::uuid,'10330000-0000-4000-8000-000000000104',1,'__p103_workspace__/probe.pdf','application/pdf',1234,repeat('c',64));

insert into public.document_drafts(id,workspace_id,template_id,title,compiled_content,status,template_version_id,fact_snapshot,provenance,content_checksum,fact_snapshot_checksum,approved_at,final_document_id,final_document_version_id,finalized_at)
values('10330000-0000-4000-8000-000000000106',current_setting('p103w.ws')::uuid,'10330000-0000-4000-8000-000000000102','Probe final','probe','final','10330000-0000-4000-8000-000000000103','{}','{}',repeat('d',64),repeat('e',64),clock_timestamp(),'10330000-0000-4000-8000-000000000104','10330000-0000-4000-8000-000000000105',clock_timestamp());

do $$
begin
  begin
    delete from public.document_template_versions where id='10330000-0000-4000-8000-000000000103';
    raise exception 'published template direct delete accepted';
  exception when check_violation then
    if sqlerrm<>'ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE' then raise; end if;
  end;
  begin
    delete from public.document_drafts where id='10330000-0000-4000-8000-000000000106';
    raise exception 'final draft direct delete accepted';
  exception when check_violation then
    if sqlerrm<>'ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE' then raise; end if;
  end;
end $$;

-- The parent lifecycle must be able to cascade without disabling immutable triggers.
delete from public.workspaces where id=current_setting('p103w.ws')::uuid;

select private.enjaz_p103_workspace_assert(not exists(select 1 from public.workspaces where id=current_setting('p103w.ws')::uuid),'workspace remains');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.document_templates where workspace_id=current_setting('p103w.ws')::uuid),'template remains');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.document_template_versions where workspace_id=current_setting('p103w.ws')::uuid),'template version remains');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.document_drafts where workspace_id=current_setting('p103w.ws')::uuid),'draft remains');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.documents where workspace_id=current_setting('p103w.ws')::uuid),'document remains');
select private.enjaz_p103_workspace_assert(not exists(select 1 from public.document_versions where workspace_id=current_setting('p103w.ws')::uuid),'document version remains');

drop function private.enjaz_p103_workspace_assert(boolean,text);
commit;
