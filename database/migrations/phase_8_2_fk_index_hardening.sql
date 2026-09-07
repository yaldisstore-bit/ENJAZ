-- ENJAZ Phase 8.2 — Automation Engine FK index hardening
-- Covers foreign keys introduced by Phase 8.2 without changing runtime authority.
begin;

create index if not exists automation_rules_created_by_idx
  on public.automation_rules(created_by);
create index if not exists automation_rules_updated_by_idx
  on public.automation_rules(updated_by);
create index if not exists automation_runs_requested_by_idx
  on public.automation_runs(requested_by);
create index if not exists automation_approval_requests_run_idx
  on public.automation_approval_requests(workspace_id, automation_run_id);
create index if not exists automation_approval_requests_rule_idx
  on public.automation_approval_requests(workspace_id, rule_id);
create index if not exists automation_approval_requests_requested_by_idx
  on public.automation_approval_requests(requested_by);
create index if not exists automation_approval_requests_decided_by_idx
  on public.automation_approval_requests(decided_by);

commit;
