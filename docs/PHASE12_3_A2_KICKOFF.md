# ENJAZ Phase 12.3 — A2 Approval Binding Contract

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Predecessor slice:** A1 Plan / Proposal Contract — certified by Phase 12.3 Gate run `35360006582` on `a03379be95d702f1f8613f054d2e77d1c67a26b1`.

## Purpose

A2 adds explicit, tamper-evident approval evidence for agent proposals without authorizing any business mutation.

## Authority contract

- Proposal identity is bound to a SHA-256 digest of the exact grounded plan payload.
- Approval is bound to the same workspace, authenticated actor, proposal ID and proposal digest.
- Approval expires; registration accepts only a short bounded expiry window.
- A decision key is unique and replay-safe.
- The schema reserves a single-use `consumed` state and unique execution key for A3, but **A2 exposes no consume/execute RPC**.
- Raw goal text, raw plan JSON and model output are never persisted in approval evidence.
- Proposal and approval evidence lives only in the private schema.
- Direct table access is revoked from `public`, `anon`, `authenticated` and `service_role`; service role may only invoke tightly-scoped RPC wrappers.
- The service RPC revalidates workspace membership and actor binding.
- No canonical business table is written by A2.
- No generic SQL/RPC execution tool is introduced.
- No client UI is added; frozen JavaScript/CSS budgets remain unchanged.
- Phase 12.4 remains LOCKED.

## A2 database objects

- `private.copilot_agent_proposals`
- `private.copilot_agent_approval_events`
- `private.copilot_begin_request_v3_impl`
- `private.copilot_register_agent_proposal_v1_impl`
- `private.copilot_decide_agent_proposal_v1_impl`
- service-only public wrappers for the three functions above.

## Explicit non-authority

A2 does **not** execute a proposed action, mutate money, workflow state, ownership, documents, follow-ups, reminders or permissions. Business execution remains a later, action-specific A3 concern and must still pass domain validation, RLS/permission checks, freshness checks and single-use approval consumption.
