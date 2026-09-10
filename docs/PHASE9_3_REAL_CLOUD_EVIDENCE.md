# ENJAZ Phase 9.3 — Real Cloud Ownership Evidence

**Result: PASS_ZERO_RESIDUE**

Project: Supabase `juzxriirhkuzviwnhkbd`  
Database verified: PostgreSQL 17.6  
Phase: **9.3 — Corporate Governance & Ownership Engine — M2**

## Applied migrations

1. `20260910182755` — `phase_9_3_corporate_ownership_persistence`
2. `20260910183131` — `phase_9_3_live_authenticated_ownership_probe`
3. `20260910183216` — `phase_9_3_corporate_ownership_fk_index_hardening`

The probe migration is evidence-only. It created temporary identities/business rows, exercised the same authenticated JWT boundary consumed by `auth.uid()`, attacked the production RPC/RLS contract, removed all probe data/helpers, and committed only after the zero-residue assertion passed.

## Schema / authority proof

The live database contains the Phase 9.3 authoritative ownership foundation:

- `public.corporate_ownership_states`
- `public.corporate_ownership_stakes`
- `public.corporate_governance_events`

All three have RLS enabled.

Browser/Data API authority is intentionally asymmetric:

- `authenticated`: `SELECT` only on the three governance tables.
- `authenticated`: no direct `INSERT`, `UPDATE`, or `DELETE` on those tables.
- `anon`: no `SELECT` on those tables.
- sensitive ownership mutation goes through `public.replace_company_ownership_snapshot_v1(...)`, a `SECURITY INVOKER` public wrapper over the guarded private implementation.
- historical read goes through `public.get_company_ownership_snapshot_v1(...)`, also `SECURITY INVOKER`.
- private privileged helpers remain outside the exposed public API schema and are explicitly revoked/granted only as required by their invoker wrappers/RLS policies.

This explicit table grant model is deliberate: current Supabase Data API behavior treats SQL privileges and RLS as separate authorization layers, so Phase 9.3 grants only the read capability the browser actually needs while RLS filters rows by authenticated workspace authority.

## Real authenticated destruction matrix

The Real Cloud probe proved all of the following against the deployed database:

1. A real workspace owner resolves through JWT-backed `auth.uid()`.
2. Authenticated table privileges remain read-only.
3. Direct browser-style ownership `INSERT` is denied.
4. First ownership snapshot `60% / 40%` succeeds at version `1`.
5. Exact replay with the same operation id returns the original event (`replayed=true`) instead of duplicating history.
6. Reusing the operation id with changed payload fails closed as `ENJAZ_OWNERSHIP_OPERATION_REUSED`.
7. A stale expected version fails closed as `ENJAZ_OWNERSHIP_STALE`.
8. A `90%` aggregate fails closed as `ENJAZ_OWNERSHIP_TOTAL_MUST_EQUAL_100`.
9. A holder reference from another workspace fails closed as `ENJAZ_OWNERSHIP_PERSON_NOT_FOUND`.
10. A second authoritative snapshot `50% / 50%` succeeds at version `2` and closes the preceding half-open intervals rather than overwriting them.
11. An as-of query before the change reconstructs the original `60% / 40%` ownership at version `1`.
12. An as-of query after the change reconstructs `50% / 50%` at version `2`.
13. The authoritative history contains four stake rows (two historical + two current), two governance events and current ownership version `2` during the probe.
14. An authenticated outsider in a separate workspace receives zero ownership rows through RLS.
15. The outsider cannot read the owner's ownership RPC context (`ENJAZ_ORG_WORKSPACE_FORBIDDEN`).
16. The outsider cannot mutate ownership (`ENJAZ_ORG_OWNER_REQUIRED`).
17. Exactly two ownership audit events were emitted for the two successful non-replay mutations.

## Concurrency / history integrity

Phase 9.3 does not install `btree_gist`. Ownership mutation is serialized per `(workspace, company)` with a transaction-scoped advisory lock, then protected by optimistic versioning, operation-id replay protection, effective-date ordering and a half-open `daterange(..., '[)')` overlap trigger.

This allows one date to end an old ownership interval and start its successor without false overlap while preventing overlapping ownership periods for the same holder/role.

## Supabase Advisor result

Immediately after the persistence migration, the Performance Advisor reported two Phase-9.3-owned unindexed auth-user foreign keys:

- `corporate_ownership_stakes.created_by`
- `corporate_governance_events.actor_user_id`

`phase_9_3_corporate_ownership_fk_index_hardening` added covering indexes for both. A second advisor run reported **zero remaining Phase-9.3-owned unindexed foreign keys**.

The Security Advisor reported **zero Phase-9.3-owned RLS/function warnings**. Existing warnings belonging to older product surfaces (including legacy public-intake/CRM/workflow findings and account leaked-password configuration) were not created or widened by Phase 9.3 and are not treated as M2 evidence.

## Zero residue

A separate elevated post-probe verification confirmed all probe markers are absent:

- probe `auth.users`: absent
- probe company: absent
- probe contacts: absent
- probe ownership state: absent
- probe ownership stakes: absent
- probe governance events: absent
- probe ownership audit events: absent

**Final Real Cloud verdict: PASS_ZERO_RESIDUE.**
