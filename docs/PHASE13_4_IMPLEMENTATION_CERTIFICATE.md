# Phase 13.4 — Reconciliation — Implementation Certificate

**Decision:** IMPLEMENTATION PASS / FORMAL PHASE CLOSURE PENDING  
**Production project:** `juzxriirhkuzviwnhkbd` — unchanged by Phase 13.4.  
**Isolated hosted lab:** `nqhgaukutkyvfumbtbtg` / `eu-central-1` / USD 0 per month.  
**Successor:** Phase 13.5 remains **LOCKED** until implementation merge and exact-main formal closure.

## Source and disposable PostgreSQL

- A1 expectation-plan contract is already merged on main.
- A2 owner/RLS-bound readback and A3 trusted comparison remain read-only `SECURITY INVOKER` proposals.
- Disposable PostgreSQL 17: **16 A2 PASS + 17 A3 PASS**.
- A3's original repeated JSON-array indexing exhausted hosted temp space at 5000 items; rowset alignment fixed the defect and has a source regression test.
- Hosted 5000 A2/A3: PASS. Hosted 5001 A2/A3: fail-closed PASS.

## Hosted DB/RLS and adversarial evidence

The isolated Supabase project passed real hosted PostgreSQL/RLS checks for owner, outsider, same-workspace non-owner and anonymous authority, exact Phase 13.3 import, exact decimals and relationships, clean comparison without closure authority, identity/lifecycle/field/money/relationship drift, missing targets, forged manifests, bad idempotency/batch, unfinished/corrupt ledger state, deterministic replay and zero residue.

Full evidence: `docs/PHASE13_4_HOSTED_DB_RLS_EVIDENCE.md`.

## Real Auth-token transport certificate

A temporary isolated-project Edge Function used Supabase's official publishable-auth boundary while retaining admin credentials only inside Supabase runtime secrets. Its `pg_net` invocation returned HTTP **200** with:

- schema: `enjaz.phase13-4.auth-api-edge-certificate.v2`
- `passed=true`
- `functionalPassed=true`
- `cleanupPassed=true`
- checks: **10/10 PASS**

The checks created and signed in real Auth users, proved owner/outsider/member/anonymous boundaries with real JWTs, executed the real Phase 13.3 import, verified A2 and clean A3, proved forged-manifest fail-closed and exact replay idempotency.

After certification the function was replaced with version 4 returning fixed **410 Gone** with `verify_jwt=true`, the invocation table was dropped, and final residue/advisor checks returned zero users, zero fixture rows, zero security lints and zero performance lints.

## Scope and safety

This certificate does **not** deploy A2/A3 to production, mutate production data, grant repair authority, certify that a user's historical import has been reconciled, or unlock Phase 13.5.

Formal Phase 13.4 closure requires:

1. exact PR-head gates on the final implementation candidate;
2. merge of the certified implementation;
3. exact-main / Real Browser / Pages / live-external recertification as applicable;
4. separate formal closure evidence/state transition.

Until those gates pass, Phase 13.4 remains `IN_PROGRESS` and Phase 13.5 remains `LOCKED`.
