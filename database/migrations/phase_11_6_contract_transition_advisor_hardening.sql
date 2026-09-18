-- ENJAZ Phase 11.6-C1 — advisor hardening
-- Cover the only FK introduced by C1 that is not already covered.
begin;

create index if not exists engagement_contract_transition_receipts_actor_fk_idx
  on private.engagement_contract_transition_receipts(actor_user_id);

commit;
