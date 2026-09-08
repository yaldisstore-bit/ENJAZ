-- ENJAZ Phase 8.3 — Operations / Field FK index hardening
-- Covers foreign keys introduced by Phase 8.3 without changing runtime authority.
begin;

create index if not exists field_assignments_created_by_idx
  on public.field_assignments(created_by);
create index if not exists field_assignments_handoff_by_idx
  on public.field_assignments(handoff_by);
create index if not exists field_assignments_transaction_fk_idx
  on public.field_assignments(workspace_id, transaction_id);

create index if not exists field_visits_started_by_idx
  on public.field_visits(started_by);
create index if not exists field_visits_completed_by_idx
  on public.field_visits(completed_by);
create index if not exists field_visits_transaction_fk_idx
  on public.field_visits(workspace_id, transaction_id);

create index if not exists field_visit_evidence_captured_by_idx
  on public.field_visit_evidence(captured_by);
create index if not exists field_visit_evidence_document_fk_idx
  on public.field_visit_evidence(workspace_id, document_id);
create index if not exists field_visit_evidence_transaction_fk_idx
  on public.field_visit_evidence(workspace_id, transaction_id);

create index if not exists field_sync_receipts_created_by_fk_idx
  on public.field_sync_receipts(created_by);

commit;
