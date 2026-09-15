-- ENJAZ Phase 11.3-B hardening
-- A revoked transaction grant permanently revokes its published child resources.
-- Removing view_finance also revokes published receipts, preventing stale child
-- publications from silently resurrecting if authority is later re-granted.

begin;

create or replace function private.client_portal_revoke_child_shares_on_grant_change_v1()
returns trigger language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=(select auth.uid());
  v_revoke_all boolean:=false;
  v_revoke_receipts boolean:=false;
begin
  if new.target_type<>'transaction' or new.transaction_id is null then return new; end if;

  v_revoke_all:=old.revoked_at is null and new.revoked_at is not null;
  v_revoke_receipts:=old.permissions @> array['view_finance']::text[]
    and not (new.permissions @> array['view_finance']::text[]);

  if not v_revoke_all and not v_revoke_receipts then return new; end if;

  with revoked as (
    update public.client_portal_resource_shares s
    set revoked_at=coalesce(s.revoked_at,now()),
        revoked_by=coalesce(s.revoked_by,v_actor),
        version=case when s.revoked_at is null then s.version+1 else s.version end,
        updated_at=now()
    where s.workspace_id=new.workspace_id
      and s.principal_id=new.principal_id
      and s.transaction_id=new.transaction_id
      and s.revoked_at is null
      and (v_revoke_all or (v_revoke_receipts and s.resource_type='receipt'))
    returning s.*
  )
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  select r.workspace_id,v_actor,'client_portal.resource.auto_unshared','client_portal_resource_share',r.id,
    'Client portal resource automatically unshared after grant authority changed',
    jsonb_build_object(
      'principalId',r.principal_id,'shareId',r.id,'transactionId',r.transaction_id,
      'resourceType',r.resource_type,'resourceId',coalesce(r.document_id,r.payment_id),
      'grantId',new.id,'grantRevoked',v_revoke_all,'financePermissionRemoved',v_revoke_receipts,'version',r.version
    )
  from revoked r;

  return new;
end;
$$;

revoke all on function private.client_portal_revoke_child_shares_on_grant_change_v1()
from public,anon,authenticated;

drop trigger if exists client_portal_grants_revoke_child_shares on public.client_portal_grants;
create trigger client_portal_grants_revoke_child_shares
after update of revoked_at,permissions on public.client_portal_grants
for each row execute function private.client_portal_revoke_child_shares_on_grant_change_v1();

commit;
