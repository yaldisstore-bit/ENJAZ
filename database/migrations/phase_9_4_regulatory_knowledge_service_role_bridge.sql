begin;

-- The public official-ingestion API is SECURITY INVOKER and delegates to exactly one
-- private implementation whose EXECUTE privilege is service_role-only. PostgreSQL
-- also requires schema USAGE for that delegated call. No table DML grants are added.
grant usage on schema private to service_role;

commit;
