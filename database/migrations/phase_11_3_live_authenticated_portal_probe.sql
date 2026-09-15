-- ENJAZ Phase 11.3-D — authenticated Real Cloud Client Portal destruction probe
-- Exercises the exact authenticated RPC boundary against existing canonical workspace facts.
-- No auth user, workspace, company, transaction, existing document or staff membership is created or mutated.
-- All phase-owned probe rows are deleted before commit; only the migration evidence remains.

begin;

create or replace function private.enjaz_phase113_probe_assert(p_condition boolean,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$ begin if not coalesce(p_condition,false) then raise exception 'ENJAZ_PHASE113_PROBE_FAILED: %',p_message; end if; end $$;
revoke all on function private.enjaz_phase113_probe_assert(boolean,text) from public,anon;
grant execute on function private.enjaz_phase113_probe_assert(boolean,text) to authenticated;

create or replace function private.enjaz_phase113_probe_expect(p_case text)
returns void language plpgsql security invoker set search_path=''
as $$
declare v_session public.document_upload_sessions%rowtype;
begin
  if p_case='direct_table_select' then
    begin
      perform 1 from public.client_portal_principals limit 1;
      raise exception 'ENJAZ_PHASE113_EXPECTED_DIRECT_TABLE_DENIAL';
    exception when insufficient_privilege then null;
    end;
  elsif p_case='stale_activation' then
    begin
      perform public.activate_client_portal_invitation_v1(current_setting('p113.ws')::uuid,999999);
      raise exception 'ENJAZ_PHASE113_EXPECTED_STALE_ACTIVATION';
    exception when serialization_failure then
      if sqlerrm<>'ENJAZ_PORTAL_INVITATION_STALE' then raise; end if;
    end;
  elsif p_case='foreign_authority' then
    begin
      perform public.get_client_portal_authority_v1(current_setting('p113.ws')::uuid);
      raise exception 'ENJAZ_PHASE113_EXPECTED_FOREIGN_AUTHORITY_DENIAL';
    exception when insufficient_privilege then
      if sqlerrm<>'ENJAZ_PORTAL_WORKSPACE_FORBIDDEN' then raise; end if;
    end;
  elsif p_case='vault_ack_after_permission_revoke' then
    select * into v_session from public.document_upload_sessions s
    where s.id=current_setting('p113.operation')::uuid;
    begin
      insert into public.document_versions(
        workspace_id,document_id,version_number,storage_path,mime_type,size_bytes,checksum,original_file_name,uploaded_by
      ) values(
        v_session.workspace_id,v_session.document_id,v_session.version_number,v_session.storage_path,
        v_session.mime_type,v_session.byte_size,coalesce(v_session.checksum,repeat('0',64)),
        v_session.original_file_name,current_setting('p113.client1')::uuid
      );
      raise exception 'ENJAZ_PHASE113_EXPECTED_VAULT_ACK_DENIAL';
    exception when insufficient_privilege then
      if sqlerrm not in ('ENJAZ_PORTAL_VAULT_ACK_REQUEST_INVALID','ENJAZ_PORTAL_VAULT_ACK_PERMISSION_REVOKED','ENJAZ_PORTAL_VAULT_ACK_PRINCIPAL_INVALID') then raise; end if;
    end;
  else
    raise exception 'ENJAZ_PHASE113_UNKNOWN_PROBE_CASE: %',p_case;
  end if;
end $$;
revoke all on function private.enjaz_phase113_probe_expect(text) from public,anon;
grant execute on function private.enjaz_phase113_probe_expect(text) to authenticated;

-- Pick a real workspace/transaction/document that has an owner membership and two
-- unrelated auth identities. Existing canonical rows are read-only probe anchors.
select set_config('p113.ws',(
  select w.id::text
  from public.workspaces w
  join public.workspace_memberships own on own.workspace_id=w.id and own.user_id=w.owner_user_id
  where exists(
    select 1 from public.transactions t
    join public.documents d on d.workspace_id=t.workspace_id and d.transaction_id=t.id and d.status='ready'
    where t.workspace_id=w.id and t.deleted_at is null and t.company_id is not null
  )
  and 2 <= (
    select count(*) from auth.users u
    where u.id<>w.owner_user_id
      and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=w.id and wm.user_id=u.id)
      and not exists(select 1 from public.organization_members om where om.workspace_id=w.id and om.user_id=u.id)
  )
  order by w.created_at,w.id limit 1
),true);
select private.enjaz_phase113_probe_assert(nullif(current_setting('p113.ws',true),'') is not null,'no usable workspace');
select set_config('p113.owner',(select owner_user_id::text from public.workspaces where id=current_setting('p113.ws')::uuid),true);
select set_config('p113.tx',(
  select t.id::text from public.transactions t
  join public.documents d on d.workspace_id=t.workspace_id and d.transaction_id=t.id and d.status='ready'
  where t.workspace_id=current_setting('p113.ws')::uuid and t.deleted_at is null and t.company_id is not null
  order by t.created_at,t.id,d.created_at,d.id limit 1
),true);
select set_config('p113.company',(select company_id::text from public.transactions where id=current_setting('p113.tx')::uuid),true);
select set_config('p113.doc',(
  select d.id::text from public.documents d
  where d.workspace_id=current_setting('p113.ws')::uuid and d.transaction_id=current_setting('p113.tx')::uuid and d.status='ready'
  order by d.created_at,d.id limit 1
),true);
select set_config('p113.client1',(
  select u.id::text from auth.users u
  where u.id<>current_setting('p113.owner')::uuid
    and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=current_setting('p113.ws')::uuid and wm.user_id=u.id)
    and not exists(select 1 from public.organization_members om where om.workspace_id=current_setting('p113.ws')::uuid and om.user_id=u.id)
  order by u.created_at,u.id limit 1
),true);
select set_config('p113.client2',(
  select u.id::text from auth.users u
  where u.id<>current_setting('p113.owner')::uuid
    and u.id<>current_setting('p113.client1')::uuid
    and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=current_setting('p113.ws')::uuid and wm.user_id=u.id)
    and not exists(select 1 from public.organization_members om where om.workspace_id=current_setting('p113.ws')::uuid and om.user_id=u.id)
  order by u.created_at,u.id limit 1
),true);
select private.enjaz_phase113_probe_assert(
  nullif(current_setting('p113.owner',true),'') is not null
  and nullif(current_setting('p113.tx',true),'') is not null
  and nullif(current_setting('p113.company',true),'') is not null
  and nullif(current_setting('p113.doc',true),'') is not null
  and nullif(current_setting('p113.client1',true),'') is not null
  and nullif(current_setting('p113.client2',true),'') is not null,
  'probe anchors incomplete'
);

select set_config('p113.req_info',gen_random_uuid()::text,true);
select set_config('p113.req_appointment',gen_random_uuid()::text,true);
select set_config('p113.req_document',gen_random_uuid()::text,true);
select set_config('p113.req_approval',gen_random_uuid()::text,true);
select set_config('p113.msg',gen_random_uuid()::text,true);
select set_config('p113.appointment_response',gen_random_uuid()::text,true);
select set_config('p113.read_receipt',gen_random_uuid()::text,true);
select set_config('p113.approval_response',gen_random_uuid()::text,true);
select set_config('p113.operation',gen_random_uuid()::text,true);

-- Owner establishes an invited external principal and company-only visibility.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.owner'),true);
set local role authenticated;
select private.enjaz_phase113_probe_assert(auth.uid()=current_setting('p113.owner')::uuid,'owner auth.uid mismatch');
with x as (
  select public.save_client_portal_principal_v1(
    current_setting('p113.ws')::uuid,current_setting('p113.client1')::uuid,null,'invited',null
  ) body
) select set_config('p113.principal',body->>'principalId',true) from x;
select private.enjaz_phase113_probe_assert(nullif(current_setting('p113.principal',true),'') is not null,'principal create failed');
with x as (
  select public.save_client_portal_grant_v1(
    current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,null,null,
    'company',current_setting('p113.company')::uuid,array['view']::text[],null,null
  ) body
) select set_config('p113.company_grant',body->>'grantId',true) from x;

-- Exact invited identity sees its invitation, stale activation fails, then self-activation succeeds.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.client1'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.client1'),true);
select private.enjaz_phase113_probe_assert(auth.uid()=current_setting('p113.client1')::uuid,'client1 auth.uid mismatch');
select private.enjaz_phase113_probe_assert(jsonb_array_length(public.list_client_portal_invitations_v1())=1,'invitation discovery failed');
select private.enjaz_phase113_probe_expect('stale_activation');
select public.activate_client_portal_invitation_v1(current_setting('p113.ws')::uuid,1);
select private.enjaz_phase113_probe_assert(jsonb_array_length(public.list_client_portal_invitations_v1())=0,'activated invitation still visible');
select private.enjaz_phase113_probe_assert(jsonb_array_length(public.list_client_portal_workspaces_v1())=1,'active workspace discovery failed');
select private.enjaz_phase113_probe_expect('direct_table_select');
select private.enjaz_phase113_probe_assert(
  not has_table_privilege('authenticated','public.client_portal_principals','SELECT')
  and not has_table_privilege('authenticated','public.client_portal_grants','SELECT')
  and not has_table_privilege('authenticated','public.client_portal_requests','SELECT')
  and not has_table_privilege('authenticated','public.client_portal_messages','INSERT'),
  'direct portal table privilege leak'
);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'companies')=1,
  'company-only grant did not expose exact company'
);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'transactions')=0,
  'company grant silently implied transaction access'
);

-- A second unrelated authenticated identity sees neither invitation nor workspace and cannot query authority.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.client2'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.client2'),true);
select private.enjaz_phase113_probe_assert(jsonb_array_length(public.list_client_portal_invitations_v1())=0,'cross-client invitation leak');
select private.enjaz_phase113_probe_assert(jsonb_array_length(public.list_client_portal_workspaces_v1())=0,'cross-client workspace leak');
select private.enjaz_phase113_probe_expect('foreign_authority');

-- Owner grants the exact transaction permissions and publishes one existing ready document.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.owner'),true);
with x as (
  select public.save_client_portal_grant_v1(
    current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,null,null,
    'transaction',current_setting('p113.tx')::uuid,
    array['view','upload_requested_document','approve_document','message','confirm_appointment','view_finance']::text[],null,null
  ) body
) select set_config('p113.tx_grant',body->>'grantId',true) from x;
with x as (
  select public.save_client_portal_resource_share_v1(
    current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,null,null,
    'document',current_setting('p113.doc')::uuid,null,null
  ) body
) select set_config('p113.share',body->>'shareId',true) from x;

select public.save_client_portal_request_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,current_setting('p113.req_info')::uuid,null,
  current_setting('p113.tx')::uuid,'information','__ENJAZ_PHASE113_INFO__','Real Cloud information probe',null,null,null,null
);
select public.save_client_portal_request_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,current_setting('p113.req_appointment')::uuid,null,
  current_setting('p113.tx')::uuid,'appointment','__ENJAZ_PHASE113_APPOINTMENT__','Real Cloud appointment probe',now()+interval '1 day',null,null,null
);
select public.save_client_portal_request_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,current_setting('p113.req_document')::uuid,null,
  current_setting('p113.tx')::uuid,'document','__ENJAZ_PHASE113_DOCUMENT__','Real Cloud requested-document probe',null,null,null,null
);
select public.save_client_portal_request_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,current_setting('p113.req_approval')::uuid,null,
  current_setting('p113.tx')::uuid,'approval','__ENJAZ_PHASE113_APPROVAL__','Real Cloud approval probe',null,null,null,current_setting('p113.share')::uuid
);

-- The client can now see only the exact transaction/request facts and execute only governed actions.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.client1'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.client1'),true);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'transactions')=1,
  'exact transaction grant not visible'
);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'requests')=4,
  'governed request queue projection mismatch'
);
select public.send_client_portal_message_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.tx')::uuid,current_setting('p113.req_info')::uuid,
  current_setting('p113.msg')::uuid,'__ENJAZ_PHASE113_CLIENT_MESSAGE__'
);
select private.enjaz_phase113_probe_assert(
  (select status='fulfilled' from public.client_portal_requests where id=current_setting('p113.req_info')::uuid),
  'information request was not fulfilled by governed message'
);
select public.respond_client_portal_appointment_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.req_appointment')::uuid,
  current_setting('p113.appointment_response')::uuid,'confirmed','__ENJAZ_PHASE113_CONFIRM__'
);
select private.enjaz_phase113_probe_assert(
  (select status='fulfilled' from public.client_portal_requests where id=current_setting('p113.req_appointment')::uuid),
  'appointment request was not fulfilled'
);
select public.mark_client_portal_request_read_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.req_document')::uuid,current_setting('p113.read_receipt')::uuid
);
select public.respond_client_portal_document_approval_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.req_approval')::uuid,
  current_setting('p113.approval_response')::uuid,'approved','__ENJAZ_PHASE113_APPROVE__'
);
select private.enjaz_phase113_probe_assert(
  (select status='fulfilled' from public.client_portal_requests where id=current_setting('p113.req_approval')::uuid),
  'document approval request was not fulfilled'
);

-- Prepare a requested-document upload through the canonical Vault database authority.
with x as (
  select public.prepare_client_portal_requested_document_v1(
    current_setting('p113.ws')::uuid,current_setting('p113.req_document')::uuid,current_setting('p113.operation')::uuid,
    '__ENJAZ_PHASE113_UPLOAD__','phase113-probe.pdf','application/pdf',128,'probe',repeat('0',64)
  ) body
) select set_config('p113.upload_doc',body->>'documentId',true) from x;
select private.enjaz_phase113_probe_assert(
  (select state='prepared' from public.document_upload_sessions where id=current_setting('p113.operation')::uuid),
  'Vault prepare did not create canonical prepared session'
);

-- Remove upload permission while the Vault operation is prepared. This must permanently retire
-- the request and make a later canonical document-version acknowledgement fail closed.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.owner'),true);
select public.save_client_portal_grant_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.principal')::uuid,current_setting('p113.tx_grant')::uuid,1,
  'transaction',current_setting('p113.tx')::uuid,
  array['view','approve_document','message','confirm_appointment','view_finance']::text[],null,null
);
select private.enjaz_phase113_probe_assert(
  (select revoked_at is not null from public.client_portal_requests where id=current_setting('p113.req_document')::uuid),
  'permission removal did not auto-revoke requested-document request'
);
reset role;
select private.enjaz_phase113_probe_expect('vault_ack_after_permission_revoke');
select private.enjaz_phase113_probe_assert(
  not exists(select 1 from public.document_versions where document_id=current_setting('p113.upload_doc')::uuid),
  'revoked portal upload produced a document version'
);

-- Revoke the transaction grant entirely; all transaction-scoped facts must disappear from client projection.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.owner'),true);
set local role authenticated;
select public.revoke_client_portal_grant_v1(
  current_setting('p113.ws')::uuid,current_setting('p113.tx_grant')::uuid,2,'phase113_real_cloud_probe'
);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113.client1'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113.client1'),true);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'transactions')=0,
  'revoked transaction grant still exposed transaction'
);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'documents')=0,
  'revoked transaction grant still exposed published document'
);
select private.enjaz_phase113_probe_assert(
  jsonb_array_length(public.get_client_portal_read_model_v1(current_setting('p113.ws')::uuid)->'requests')=0,
  'revoked transaction grant still exposed requests'
);
select private.enjaz_phase113_probe_assert(
  not exists(select 1 from public.workspace_memberships where workspace_id=current_setting('p113.ws')::uuid and user_id=current_setting('p113.client1')::uuid)
  and not exists(select 1 from public.organization_members where workspace_id=current_setting('p113.ws')::uuid and user_id=current_setting('p113.client1')::uuid),
  'portal activation minted staff/workforce trust'
);

reset role;
select private.enjaz_phase113_probe_assert(
  (select count(*)>=8 from public.audit_events where workspace_id=current_setting('p113.ws')::uuid and details->>'principalId'=current_setting('p113.principal')),
  'governed portal audit evidence incomplete'
);

-- Zero-residue cleanup. Existing canonical workspace/company/transaction/document rows are untouched.
delete from public.client_portal_document_approval_responses where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_document_approval_targets where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_requested_document_uploads where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_request_read_receipts where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_appointment_responses where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_messages where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_requests where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_resource_shares where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_authority_events where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_grants where principal_id=current_setting('p113.principal')::uuid;
delete from public.client_portal_principals where id=current_setting('p113.principal')::uuid;
delete from public.document_upload_sessions where id=current_setting('p113.operation')::uuid;
delete from public.documents where id=current_setting('p113.upload_doc')::uuid;
delete from public.audit_events
where workspace_id=current_setting('p113.ws')::uuid
  and (
    details->>'principalId'=current_setting('p113.principal')
    or details->>'portalRequestId' in (
      current_setting('p113.req_info'),current_setting('p113.req_appointment'),current_setting('p113.req_document'),current_setting('p113.req_approval')
    )
    or entity_id in (
      current_setting('p113.req_info')::uuid,current_setting('p113.req_appointment')::uuid,
      current_setting('p113.req_document')::uuid,current_setting('p113.req_approval')::uuid,
      current_setting('p113.msg')::uuid,current_setting('p113.appointment_response')::uuid,
      current_setting('p113.read_receipt')::uuid,current_setting('p113.approval_response')::uuid,
      current_setting('p113.upload_doc')::uuid
    )
  );

select private.enjaz_phase113_probe_assert(
  not exists(select 1 from public.client_portal_principals where id=current_setting('p113.principal')::uuid)
  and not exists(select 1 from public.client_portal_grants where principal_id=current_setting('p113.principal')::uuid)
  and not exists(select 1 from public.client_portal_requests where principal_id=current_setting('p113.principal')::uuid)
  and not exists(select 1 from public.client_portal_messages where principal_id=current_setting('p113.principal')::uuid)
  and not exists(select 1 from public.client_portal_requested_document_uploads where principal_id=current_setting('p113.principal')::uuid)
  and not exists(select 1 from public.document_upload_sessions where id=current_setting('p113.operation')::uuid)
  and not exists(select 1 from public.documents where id=current_setting('p113.upload_doc')::uuid),
  'Phase 11.3 probe residue remains'
);

drop function private.enjaz_phase113_probe_expect(text);
drop function private.enjaz_phase113_probe_assert(boolean,text);
commit;
