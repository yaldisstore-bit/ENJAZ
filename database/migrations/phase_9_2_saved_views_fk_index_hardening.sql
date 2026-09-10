-- ENJAZ Phase 9.2 — Saved Views FK index hardening
-- Covers the auth.users owner FK independently of workspace-leading lookup indexes.

begin;

create index saved_views_owner_user_fk_idx
  on public.saved_views(owner_user_id);

commit;
