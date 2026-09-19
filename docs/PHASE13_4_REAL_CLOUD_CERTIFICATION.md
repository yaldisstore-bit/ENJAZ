# Phase 13.4 — Isolated Supabase Real Cloud Certification Plan

**Status:** REAL CLOUD IMPLEMENTATION CERTIFIED / FORMAL CLOSURE PENDING  
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

Creating a Supabase development branch was cost-checked and explicitly approved at **USD 0.01344/hour**, but Supabase rejected creation because the ENJAZ organization is on the Free plan and Branching requires Pro or above. No development branch was created and no hourly branch cost began. A separate isolated project was then cost-checked and explicitly confirmed at **USD 0/month**; project `nqhgaukutkyvfumbtbtg` in `eu-central-1` is the current disposable hosted DB/RLS lab. Source/CI or hosted-DB success never authorizes production deployment.

## Execution-path constraint

The committed GitHub `workflow_dispatch` file is a **post-merge/re-certification convenience**, because GitHub manual-dispatch workflows must be available from the repository default branch before the UI/API can dispatch them reliably. It must not be treated as the pre-merge certification mechanism for this draft PR.

The Free-plan fallback isolated project completed both hosted DB/RLS certification and real Auth-token transport certification. The Auth certificate used a temporary `@supabase/server` publishable-authenticated Edge Function, with the service credential remaining inside Supabase-managed runtime secrets. Its HTTP certificate returned `passed=true`, `functionalPassed=true`, and `cleanupPassed=true`; the Function was then replaced with a fixed 410/verify-JWT implementation and final zero-residue was re-verified. Phase 13.4 remains open only for exact PR-head, merge and exact-main/deployed-live formal closure gates.

## Hard isolation prerequisites

0. The guarded manual workflow is already bootstrapped on GitHub's default branch; do **not** merge the A2/A3 implementation PR as a shortcut.
1. Use an isolated Supabase environment whose project ref differs from `juzxriirhkuzviwnhkbd`. Preferred: development branch on Pro+. Current Free-plan fallback: disposable project `nqhgaukutkyvfumbtbtg`.
2. The isolated environment must have its own URL, publishable key and secret/service credential. Never reuse production credentials.
3. Keep both harness confirmations explicit:
   - `ENJAZ_REAL_CLOUD_CONFIRM=YES`
   - `ENJAZ_A2_ISOLATED_BRANCH_CONFIRM=YES`
4. The URL must equal `https://<isolated-ref>.supabase.co`; the harness fails closed for the production ref.
5. Before Auth-API dispatch, install only the reviewed Phase 13.3 hardening and Phase 13.4 A2/A3 SQL on the isolated environment through connected Supabase migrations. The GitHub workflow deliberately has no database URL/psql authority.
6. Preserve the isolated environment as disposable test infrastructure; do not attach production/client traffic to it.
7. If a safe protected invocation path cannot be supplied, keep Auth-API certification pending rather than embedding credentials into SQL, disabling JWT verification, using a production secret, or weakening the harness.

## Hosted DB/RLS evidence already completed

The disposable project `nqhgaukutkyvfumbtbtg` has already passed the database/RLS portion of this plan. Evidence is recorded in [`PHASE13_4_HOSTED_DB_RLS_EVIDENCE.md`](PHASE13_4_HOSTED_DB_RLS_EVIDENCE.md), including owner/member/outsider/anon boundaries, real Phase 13.3 import, destructive drift/tamper cases, zero residue, 5000-item hosted comparison after A3 rowset alignment, 5001 fail-closed, and zero Supabase security-advisor lints.

The separate Auth-API transport certificate has also passed; together these artifacts form the Real Cloud implementation certificate.

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

Authenticated hosted checks and zero-residue cleanup have passed, so A2/A3 are now labeled Real Cloud implementation-certified. That still does not authorize automatic repair. Formal Phase 13.4 closure must then update the canonical state, produce closure evidence, merge to main, and complete exact-main/deployed-live recertification before Phase 13.5 is unlocked.

**Current gate:** production unchanged, Phase 13.4 remains IN_PROGRESS until exact-head/merge/exact-main formal closure, and Phase 13.5 remains LOCKED.
