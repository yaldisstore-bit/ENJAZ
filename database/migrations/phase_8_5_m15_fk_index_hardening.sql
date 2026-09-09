-- ENJAZ Phase 8.5 — M15 Real Cloud FK index hardening
-- Covers every Phase 8.5 foreign key flagged by the Supabase performance advisor.
-- No authorization or data semantics change.

begin;

create index if not exists organization_branches_created_by_idx
  on public.organization_branches(created_by);
create index if not exists organization_departments_created_by_idx
  on public.organization_departments(created_by);
create index if not exists organization_members_created_by_idx
  on public.organization_members(created_by);
create index if not exists organization_teams_created_by_idx
  on public.organization_teams(created_by);

create index if not exists organization_scope_memberships_branch_fk_idx
  on public.organization_scope_memberships(workspace_id,branch_id);
create index if not exists organization_scope_memberships_department_fk_idx
  on public.organization_scope_memberships(workspace_id,department_id);
create index if not exists organization_scope_memberships_team_fk_idx
  on public.organization_scope_memberships(workspace_id,team_id);
create index if not exists organization_scope_memberships_created_by_idx
  on public.organization_scope_memberships(created_by);

create index if not exists transaction_organization_ownership_branch_fk_idx
  on public.transaction_organization_ownership(workspace_id,branch_id);
create index if not exists transaction_organization_ownership_department_fk_idx
  on public.transaction_organization_ownership(workspace_id,department_id);
create index if not exists transaction_organization_ownership_team_fk_idx
  on public.transaction_organization_ownership(workspace_id,team_id);
create index if not exists transaction_organization_ownership_assigned_by_idx
  on public.transaction_organization_ownership(assigned_by);

create index if not exists transaction_org_ownership_events_ownership_fk_idx
  on public.transaction_organization_ownership_events(workspace_id,ownership_id);
create index if not exists transaction_org_ownership_events_actor_user_id_idx
  on public.transaction_organization_ownership_events(actor_user_id);

commit;
