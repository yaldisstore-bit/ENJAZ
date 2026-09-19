# Phase 13.4 — Isolated Supabase Real Cloud Certification Plan

**Status:** READY FOR ISOLATED EXECUTION / NOT YET CERTIFIED  
**Production project ref:** `juzxriirhkuzviwnhkbd` — MUST NOT be used by the destructive harness.  
**Successor:** Phase 13.5 remains **LOCKED** until this plan produces successful authenticated hosted evidence and formal closure.

## What is already verified

- A1 read-only expectation plan is certified and merged.
- A2 authenticated readback and A3 trusted comparison source proposals are present.
- Exact verified source head `8e2bb1e6ebe9e9fad43ac7384427f54a4ca53ef2` completed 78/78 workflows = 77 SUCCESS + 1 expected SKIPPED.
- Disposable PostgreSQL 17 evidence: **16 A2 PASS + 17 A3 PASS**.
- Production remains unmodified by Phase 13.4: A2/A3 functions are not installed there.
- Read-only production inventory confirmed RLS is enabled on `import_jobs`, `contacts`, `companies`, and `transactions`; authenticated SELECT exists while anon SELECT is denied.
- Authenticated has the schema/function privileges required by the proposed SECURITY INVOKER SQL boundary.

## Cost gate

Creating a Supabase development branch is a billable action. The organization cost lookup on 2026-09-19 returned **USD 0.01344/hour**. Re-check the cost immediately before creation and require explicit user approval before provisioning. Source/CI success never authorizes a paid branch.

## Execution-path constraint

The committed GitHub `workflow_dispatch` file is a **post-merge/re-certification convenience**, because GitHub manual-dispatch workflows must be available from the repository default branch before the UI/API can dispatch them reliably. It must not be treated as the pre-merge certification mechanism for this draft PR.

Pre-merge Real Cloud certification therefore uses the same reviewed `scripts/phase13-4-a2-real-cloud-e2e.mjs` harness with branch-only URL/publishable/secret credentials supplied by an explicitly authorized isolated Supabase development branch. No production credential may substitute for the branch secret. If branch credentials cannot be supplied securely, Phase 13.4 stays open rather than downgrading the certification requirement.

## Hard isolation prerequisites

1. Create a dedicated development branch from project `juzxriirhkuzviwnhkbd` only after explicit cost approval.
2. Record the returned branch project ref. It must differ from `juzxriirhkuzviwnhkbd`.
3. Obtain branch-local API URL, publishable key and secret/service credential. Never reuse production credentials.
4. Keep both harness confirmations explicit:
   - `ENJAZ_REAL_CLOUD_CONFIRM=YES`
   - `ENJAZ_A2_ISOLATED_BRANCH_CONFIRM=YES`
5. The URL must equal `https://<branch-ref>.supabase.co`; the harness fails closed otherwise.
6. Install only the reviewed A2/A3 SQL proposals on the disposable branch. Do not install them on production as a shortcut.
7. Preserve the branch as disposable test infrastructure; do not attach client traffic to it.

## Required authenticated hosted checks

The branch-only harness must execute the real Phase 13.3 import RPC and then prove:

- missing import job fails closed;
- anonymous execution is denied;
- outsider and foreign-workspace access are denied;
- a same-workspace non-owner cannot bypass canonical owner reconciliation;
- exact successful ledger binding by workspace, batch, idempotency key and payload hash;
- exact ordered three-stage readback for contacts → companies → transactions;
- lossless decimal money;
- exact company/contact relationship IDs;
- clean A3 snapshot equality never grants `reconciled`, `closureAuthorized`, or mutation authority;
- field, money, relationship, source-lineage and lifecycle drift are detected;
- a single row carrying identity + lifecycle + field + money + relationship drift preserves every difference code;
- restored synthetic rows return to equality without granting closure;
- corrupt durable totals, per-stage counts, non-atomic result and unfinished/incoherent ledger states fail closed;
- exact import replay is deterministic and does not create duplicate truth;
- forged manifest, wrong idempotency and wrong batch fail closed;
- missing transaction, company and contact targets remain explicit and are never silently recreated or repaired.

## Zero-residue exit gate

Regardless of test success or failure, cleanup must run in `finally` and prove:

- every synthetic workspace created by the harness is absent;
- related `import_jobs`, `contacts`, `companies`, and `transactions` rows are zero;
- every synthetic auth user is deleted and absent;
- a final Auth admin marker sweep finds no user carrying the Phase 13.4 test marker;
- cleanup evidence has `cleanupPassed=true`;
- the evidence artifact records the branch ref, start/end timestamps, every named check, cleanup checks, and final pass/failure.

If cleanup is incomplete, Phase 13.4 remains open even if all functional assertions passed.

## Certification decision

Only after authenticated hosted checks and zero-residue cleanup pass may A2/A3 be labeled Real Cloud certified. That still does not authorize automatic repair. Formal Phase 13.4 closure must then update the canonical state, produce closure evidence, merge to main, and complete exact-main/deployed-live recertification before Phase 13.5 is unlocked.

**Until then:** production unchanged, PR remains draft, Phase 13.4 remains IN_PROGRESS, Phase 13.5 remains LOCKED.
