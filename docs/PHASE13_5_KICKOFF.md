# Phase 13.5 — Import Destruction Gate — Kickoff

**Status:** IN_PROGRESS — A1 DESTRUCTION CONTRACT  
**Base:** `64b78767ebd3b0112e752f979d5448f78bdfd2cf` — canonical Phase 13.4 closure/correction; exact-main **42/42 SUCCESS**.  
**Predecessor:** Phase 13.4 ✅ CLOSED / Real Cloud + production read-only reconciliation certified.  
**Successor:** Phase 14.1 — Cross-domain Journeys — **LOCKED**.

## Mission

Phase 13.5 does not add a new import feature. It is the destructive Zero-Escape gate for the complete Phase 13.1 → 13.4 legacy-import pipeline.

The gate must deliberately attack intake, mapping, binding, ordered execution, durable ledger/idempotency, reconciliation, RLS/owner authority, lifecycle drift and scale. A green source branch alone can never close this phase.

## Permanent authority boundary

Only explicitly mapped records may target:
1. `contacts`
2. `companies`
3. `transactions`

The fixed import order remains `contacts → companies → transactions`. Caller-supplied UUID bindings remain mandatory. Unknown or unmapped legacy concepts — including workflow/procedure, ownership/governance and documents where no explicit mapping exists — remain quarantined/reviewable and may not be guessed into M1–M18 authority.

Phase 13.5 may not introduce a new table, generic write RPC, Edge write authority, automatic repair, generated target IDs, inferred mapping, silent orphan repair, client UI or budget increase.

## Destruction dimensions

The machine-readable contract is `docs/PHASE13_5_DESTRUCTION_MATRIX.json`. It covers at minimum:

- counts and durable ledger coherence;
- duplicate source keys, target IDs and idempotency replay;
- orphan/dangling/missing relationships;
- exact money precision and money drift;
- workflow-like/unmapped concepts remaining quarantined;
- ownership/permission boundaries and non-owner denial;
- document-like/unmapped concepts remaining quarantined;
- forged manifests, wrong batch/idempotency and changed replay;
- stage/order/relationship authority tampering;
- late-write atomic rollback with zero partial rows;
- missing/soft-deleted target visibility without repair;
- 5000 accepted / 5001 fail-closed.

## Certification slices

### A1 — Destruction contract and source matrix
Machine-readable threat matrix, fail-closed audit, and preservation of Phase 13.1–13.4 source contracts. No destructive database execution yet.

### A2 — Disposable PostgreSQL destruction
A synthetic PostgreSQL 17 fixture must execute the actual Phase 13.3 write RPC plus Phase 13.4 A2/A3 SQL, deliberately induce the destructive matrix cases, prove rollback/idempotency/reconciliation behavior and leave no fixture residue.

### A3 — Isolated Supabase Real Cloud destruction
Run destructive Auth/RLS tests only against an isolated environment. Production may be inspected read-only but is forbidden as a destructive target. Real users/JWTs, owner/member/outsider/anonymous boundaries, replay/conflict, missing/corrupt/lifecycle cases, 5000/5001 and cleanup must be certified with zero residue.

## Exit gate

Formal closure requires all four quality tracks PASS, zero Critical/High/functional blockers, exact PR-head gates, Real Cloud zero-residue, cumulative Real Browser, implementation merge, exact-main recertification, Pages and Live External evidence. Only then may Phase 14.1 be authorized.
