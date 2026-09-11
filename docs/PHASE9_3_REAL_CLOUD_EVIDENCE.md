# ENJAZ Phase 9.3 — Real Cloud Full M2 Evidence

**Result: PASS_ZERO_RESIDUE**

Project: Supabase `juzxriirhkuzviwnhkbd`  
Database verified: PostgreSQL 17.6  
Phase: **9.3 — Corporate Governance & Ownership Engine — M2**

## Applied migrations

1. `20260910182755` — `phase_9_3_corporate_ownership_persistence`
2. `20260910183131` — `phase_9_3_live_authenticated_ownership_probe`
3. `20260910183216` — `phase_9_3_corporate_ownership_fk_index_hardening`
4. `20260910215942` — `phase_9_3_full_governance_registry`
5. `20260910220431` — `phase_9_3_capital_command_authority_hardening`
6. `20260911042403` — `phase_9_3_live_authenticated_full_governance_probe_v2`

The probe migrations are evidence-only. They attack authenticated/anonymous authority, optimistic concurrency, replay behavior, history and cross-workspace boundaries, then remove their fixtures/helpers. The final full-M2 probe commits only after its zero-residue assertions pass.

## Authoritative schema

Phase 9.3 now covers the complete M2 persistence surface:

- `public.corporate_ownership_states`
- `public.corporate_ownership_stakes`
- `public.corporate_governance_events`
- `public.corporate_registry_states`
- `public.corporate_beneficial_owners`
- `public.corporate_authority_grants`
- `public.corporate_resolutions`
- `public.corporate_capital_events`

All Phase-9.3 public tables have RLS enabled. Existing `companies` and `contacts` remain the business identity truth; M2 does not create shadow company/person identities.

Browser/Data API authority is intentionally asymmetric:

- authenticated actors receive SELECT-only access to governance tables under workspace RLS;
- direct browser INSERT/UPDATE/DELETE for sensitive governance facts is forbidden;
- anonymous access to private governance context is forbidden;
- mutations use guarded public `SECURITY INVOKER` command wrappers over private implementations that enforce authenticated organization-owner authority;
- historical/current reads derive from authoritative effective-dated history rather than mutable display fields.

This explicit table grant model is deliberate: current Supabase Data API behavior treats SQL privileges and RLS as separate authorization layers, so Phase 9.3 grants only the browser capability that is actually needed.

## Guarded command surface

Certified commands/readers include:

- `replace_company_ownership_snapshot_v1`
- `get_company_ownership_snapshot_v1`
- `replace_company_beneficial_owners_v1`
- `grant_company_authority_v1`
- `revoke_company_authority_v1`
- `record_company_resolution_v1`
- `record_company_capital_event_v1`
- `get_company_governance_context_v1`

The unified context exposes version counters, as-of ownership, beneficial owners, authorities, resolutions, capital history, the corporate event timeline and derived governance-risk alerts from authoritative facts.

## Full M2 destruction matrix

Real Cloud certification proved, among other cases:

1. A real authenticated workspace owner resolves through JWT-backed `auth.uid()`.
2. Governance tables remain browser SELECT-only; direct sensitive DML is denied.
3. Ownership snapshots require exact canonical percentages and exact 100% reconciliation.
4. Ownership replay with the same operation id is idempotent; changed-payload reuse is rejected.
5. Stale expected versions fail closed rather than overwriting newer governance state.
6. Cross-workspace company/person references fail closed.
7. Ownership history closes old half-open intervals and preserves historical as-of reconstruction.
8. Beneficial-owner snapshots are effective-dated, optimistic, replay-safe and can explicitly record an empty active set.
9. Beneficial-owner identity must resolve to an active existing same-workspace person/contact.
10. Authority grants preserve person role, scope, powers and effective dates; revocation closes history rather than deleting it.
11. Conflicting authority periods for the same person/role are rejected.
12. Company resolutions are append-only governance evidence with operation replay and stale-version protection.
13. Capital changes are recorded as authoritative governance events and synchronize the company’s current capital through the governed command only.
14. Direct capital bypass is rejected as `ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND`.
15. A non-owner authenticated actor cannot execute owner-only governance mutation.
16. An unauthorized/foreign workspace actor cannot read the company governance context.
17. An anonymous actor cannot read private governance context.
18. Historical context before a later beneficial-owner/authority/capital change reconstructs the earlier truth.
19. Current context after closure/revocation reflects the later state and emits `BENEFICIAL_OWNER_MISSING` / `REPRESENTATION_AUTHORITY_MISSING` where applicable.
20. Successful governed mutations append audit/governance evidence; destructive history overwrite remains forbidden.

## Concurrency and history integrity

Ownership mutation remains serialized per `(workspace, company)` with a transaction-scoped advisory lock plus optimistic versioning, operation-id replay protection, effective-date ordering and half-open date intervals `[from,to)`. The broader M2 registry uses the same fail-closed principles: stale commands cannot silently win, history is append/close rather than destructive rewrite, and authoritative snapshots are derived from history.

## Supabase Advisor result

The ownership foundation originally exposed two Phase-9.3-owned missing foreign-key indexes:

- `corporate_ownership_stakes.created_by`
- `corporate_governance_events.actor_user_id`

`phase_9_3_corporate_ownership_fk_index_hardening` fixed both. Full-M2 registry migrations also include covering actor/contact indexes for their governance tables.

A fresh Advisor review on 2026-09-11 reported **zero remaining Phase-9.3-owned unindexed foreign keys** and **zero Phase-9.3-owned RLS/function warnings**. Current advisor findings belong to older CRM/intake/workflow/auth surfaces and were neither introduced nor widened by Phase 9.3. Phase-9.3 indexes may appear under “unused index” on this low-traffic project; that is not a missing-index finding.

## Full M2 zero residue

A fresh elevated post-probe verification on 2026-09-11 checked the fixed Phase-9.3 probe identities and returned zero rows for every category:

- probe workspace: `0`
- probe company: `0`
- probe contacts: `0`
- ownership state/stakes: `0`
- beneficial owners: `0`
- authority grants: `0`
- resolutions: `0`
- capital events: `0`
- governance events: `0`
- registry state: `0`
- governance audit events: `0`

The earlier ownership-only probe also remains residue-free.

**Final Real Cloud verdict: PASS_ZERO_RESIDUE.**
