-- ENJAZ Phase 10.2 — cover actor foreign keys reported by Supabase advisor.
begin;
create index if not exists document_analysis_requested_by_idx on public.document_analysis(requested_by) where requested_by is not null;
create index if not exists document_analysis_reviewed_by_idx on public.document_analysis(reviewed_by) where reviewed_by is not null;
create index if not exists document_analysis_verified_by_idx on public.document_analysis(verified_by) where verified_by is not null;
commit;
