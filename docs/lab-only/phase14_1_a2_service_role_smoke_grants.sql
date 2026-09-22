-- LAB-ONLY recovery of a narrowly scoped service_role grant mismatch.
-- Target: disposable isolated ENJAZ lab nqhgaukutkyvfumbtbtg ONLY.
-- DO NOT replay this file as a generic production migration.
-- Observed 2026-09-20: production service_role already has SELECT/INSERT/UPDATE/DELETE
-- on these six tables; the disposable lab was missing all four privileges.
-- The 14.1 isolated Auth/import smoke requires admin access to these six tables.
-- No privilege is granted to anon/authenticated; no RLS/policy bypass is added.
BEGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.workspaces,
  public.workspace_memberships,
  public.contacts,
  public.companies,
  public.transactions,
  public.import_jobs
TO service_role;
COMMIT;
