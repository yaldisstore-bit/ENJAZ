-- ENJAZ Phase 9.3 — M2 FK/index hardening after Supabase Performance Advisor.
-- Covers the two phase-owned auth.users foreign keys without changing ownership semantics.

begin;

create index corporate_ownership_stakes_created_by_fk_idx
  on public.corporate_ownership_stakes(created_by);

create index corporate_governance_events_actor_user_id_fk_idx
  on public.corporate_governance_events(actor_user_id);

commit;
