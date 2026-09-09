-- ENJAZ Phase 8.5 — owner-only transaction catalog for initial organizational assignment.
-- Workforce users never receive an unscoped workspace transaction catalog.

begin;

grant usage on schema private to authenticated;

create or replace function private.organization_assignable_transactions_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  perform private.require_organization_owner_v1(p_workspace_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'transactionId',t.id,
      'companyId',t.company_id,
      'companyName',coalesce(c.display_name,c.legal_name),
      'type',t.type,
      'status',t.status,
      'priority',t.priority,
      'updatedAt',t.updated_at,
      'ownershipId',o.id,
      'ownershipVersion',o.version,
      'scopeType',o.scope_type,
      'branchId',o.branch_id,
      'departmentId',o.department_id,
      'teamId',o.team_id
    ) order by t.updated_at desc)
    from public.transactions t
    join public.companies c on c.workspace_id=t.workspace_id and c.id=t.company_id
    left join public.transaction_organization_ownership o on o.workspace_id=t.workspace_id and o.transaction_id=t.id
    where t.workspace_id=p_workspace_id and t.deleted_at is null and t.archived_at is null and t.status<>'completed'
  ),'[]'::jsonb);
end;
$$;

create or replace function public.list_organization_assignable_transactions_v1(p_workspace_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.organization_assignable_transactions_v1(p_workspace_id);
$$;

revoke all on function private.organization_assignable_transactions_v1(uuid) from public,anon;
grant execute on function private.organization_assignable_transactions_v1(uuid) to authenticated;
revoke all on function public.list_organization_assignable_transactions_v1(uuid) from public,anon;
grant execute on function public.list_organization_assignable_transactions_v1(uuid) to authenticated;

commit;
