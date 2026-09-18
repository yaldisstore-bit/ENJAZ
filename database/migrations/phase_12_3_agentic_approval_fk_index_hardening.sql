-- ENJAZ Phase 12.3 A2 — approval evidence FK index hardening.
-- Covers auth.users foreign keys surfaced by Supabase Performance Advisor.
begin;

drop index if exists private.copilot_agent_proposals_actor_idx;

create index copilot_agent_proposals_actor_idx
  on private.copilot_agent_proposals(actor_user_id,workspace_id,requested_at desc);

create index copilot_agent_proposals_decided_by_idx
  on private.copilot_agent_proposals(decided_by,workspace_id);

create index copilot_agent_proposals_consumed_by_idx
  on private.copilot_agent_proposals(consumed_by,workspace_id);

create index copilot_agent_approval_events_actor_idx
  on private.copilot_agent_approval_events(actor_user_id,workspace_id,occurred_at desc);

commit;
