# Phase 12.3 — Agentic ENJAZ Copilot — Kickoff

**Status:** IN PROGRESS  
**Base:** `00470d129693fdf1362becbc7d95f54560f79481` — final merged Phase 12.2 formal closure  
**Predecessor:** Phase 12.2 — CLOSED / certified  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Successor:** Phase 12.4 — Regulatory Knowledge Assistance — M8 — LOCKED

## Objective

Enable ENJAZ Copilot to plan multi-step work and propose governed actions without bypassing any authoritative domain boundary.

Phase 12.3 starts deliberately in **PLAN / PROPOSE ONLY** mode. No mutation execution is authorized in the opening slice.

## Non-negotiable agent law

The agent is not a business authority.

- Existing domain services remain the only mutation authority.
- RLS remains mandatory and cannot be bypassed by service credentials.
- Sensitive actions require explicit user approval bound to the exact proposal.
- Approval must be scoped, expiring, replay-protected and actor/workspace bound before execution can exist.
- Domain validation must run again immediately before any future write.
- Workflow/legal transitions, finance rules and document approval state remain authoritative.
- The agent must never write canonical business tables directly.
- The service role must never be used to widen business reads.
- Missing context or missing approval fails closed.

## 12.3-A1 — opening slice

A1 freezes the agent plan contract only.

Allowed operations:

1. `plan` — build a deterministic multi-step plan from permission-scoped authoritative references.
2. `propose` — return a non-executable proposal envelope describing what would need approval/validation.

Explicitly forbidden in A1:

- `execute`;
- `approve_and_execute`;
- direct business writes;
- browser tool execution;
- hidden auto-approval;
- persistent raw goal/prompt/plan bodies;
- service-role business reads;
- provider-backed autonomous action selection.

## Context authority

A1 inherits the certified Phase 12.2 source boundary:

- underlying authority: `global_search_v1`;
- source schema: `enjaz.global-search-result.v1`;
- only authenticated permission-scoped references are accepted;
- destinations must remain internal `/app/` destinations;
- no client-supplied object becomes canonical context merely because it was included in a request.

## Plan schema

Schema: `enjaz.copilot.agent.plan.v1`.

Every plan exposes:

- a bounded normalized goal;
- ordered plan steps;
- source citations/provenance;
- whether sufficient authoritative context was found;
- execution status;
- explicit approval requirement;
- domain validation requirement;
- RLS requirement;
- a clear non-authoritative proposal flag.

Opening execution status is always `locked_proposal_only`.

## Approval boundary reserved for later 12.3 slices

Before any mutation execution can be introduced, later 12.3 work must add and certify:

- immutable proposal identity/digest;
- actor + workspace binding;
- explicit user approval event;
- approval scope;
- expiration;
- single-use/replay protection;
- action-specific domain adapter;
- pre-write revalidation;
- post-write reconciliation/audit evidence;
- stale proposal rejection;
- conflict and network-uncertainty handling.

No “generic execute SQL/RPC” tool is allowed.

## Provider rule

A1 is deterministic and provider-free.

An external model is not required to plan the opening bounded workflow. If a provider is introduced later, it may only operate on permission-scoped context and may not gain write authority.

## Client / performance rule

A1 adds no production UI and no client CSS.

Frozen ceilings remain:

- initial JavaScript: 670000 bytes;
- total JavaScript: 760000 bytes;
- CSS: 180000 bytes;
- cap increase: forbidden.

## Required A1 gate

- exact Phase 12.2 closure lineage;
- lifecycle lock on 12.4;
- schema and bounded-field tests;
- destruction test proving `execute` is rejected;
- canonical source/provenance validation;
- fail-closed missing-context plan;
- zero mutation/tool/provider path in A1 source;
- preserve Phase 12.2 audit/tests;
- database/roadmap/secrets/typecheck/build/budget regression.

## Successor lock

**Phase 12.4 — Regulatory Knowledge Assistance — M8 remains LOCKED.**
