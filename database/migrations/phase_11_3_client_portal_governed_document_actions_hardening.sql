-- ENJAZ Phase 11.3-C2 hardening — close the Vault acknowledgement race.
-- The service-owned Document Vault acknowledgement remains canonical, but when
-- the upload originated from a portal request the authoritative document-version
-- insert re-proves the portal request and grant inside the same database transaction.

begin;

create or replace function private.enforce_client_portal_vault_ack_authority_v1()
returns trigger language plpgsql volatile security definer set search_path='' as $$
declare
  v_upload public.client_portal_requested_document_uploads%rowtype;
  v_session public.document_upload_sessions%rowtype;
  v_request public.client_portal_requests%rowtype;
begin
  select u.* into v_upload
  from public.client_portal_requested_document_uploads u
  where u.workspace_id=new.workspace_id and u.document_id=new.document_id
    and u.status='prepared'
  order by u.created_at desc
  limit 1;

  -- Ordinary staff/Vault document versions are unaffected.
  if not found then return new; end if;

  select * into v_session from public.document_upload_sessions s
  where s.id=v_upload.operation_id and s.workspace_id=v_upload.workspace_id
    and s.document_id=v_upload.document_id and s.version_number=new.version_number;
  if not found or v_session.state<>'prepared' or v_session.created_by<>v_upload.actor_user_id
     or new.uploaded_by<>v_upload.actor_user_id then
    raise insufficient_privilege using message='ENJAZ_PORTAL_VAULT_ACK_SESSION_INVALID';
  end if;

  select * into v_request from public.client_portal_requests r
  where r.workspace_id=v_upload.workspace_id and r.id=v_upload.request_id
    and r.principal_id=v_upload.principal_id and r.transaction_id=v_upload.transaction_id;
  if not found
     or v_request.request_type<>'document'
     or v_request.required_permission<>'upload_requested_document'
     or v_request.status<>'open'
     or v_request.revoked_at is not null
     or v_request.valid_from>now()
     or (v_request.valid_until is not null and v_request.valid_until<=now()) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_VAULT_ACK_REQUEST_INVALID';
  end if;

  if not private.client_portal_principal_has_grant_v1(
    v_upload.workspace_id,v_upload.principal_id,v_upload.transaction_id,'upload_requested_document'
  ) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_VAULT_ACK_PERMISSION_REVOKED';
  end if;

  if not exists(
    select 1 from public.client_portal_principals p
    where p.workspace_id=v_upload.workspace_id and p.id=v_upload.principal_id
      and p.user_id=v_upload.actor_user_id and p.status='active' and p.revoked_at is null
      and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p.workspace_id and wm.user_id=p.user_id)
      and not exists(select 1 from public.organization_members om where om.workspace_id=p.workspace_id and om.user_id=p.user_id)
  ) then
    raise insufficient_privilege using message='ENJAZ_PORTAL_VAULT_ACK_PRINCIPAL_INVALID';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_client_portal_vault_ack_authority_v1() from public,anon,authenticated;

drop trigger if exists client_portal_vault_ack_authority on public.document_versions;
create trigger client_portal_vault_ack_authority
before insert on public.document_versions
for each row execute function private.enforce_client_portal_vault_ack_authority_v1();

commit;
