# Phase 13.4 — A2 Authenticated Readback — Source Proposal

**Status:** SOURCE + DISPOSABLE POSTGRES VERIFIED / NOT DEPLOYED / REAL CLOUD NOT CERTIFIED.
**Base:** A1 PR #213 merged into main as 03934f9a07746096eee9784b8832f5f302ffd58a.
**Whole phase:** 13.4 IN_PROGRESS; 13.5 LOCKED.

## Intended behavior

The readback query must use the real caller JWT, existing workspace-owner authority and table RLS. It binds the existing Phase 13.3 import_jobs record to the exact batch, workspace, idempotency key and SHA-256 of the original execution manifest, then reads each expected target in one SQL statement and one MVCC statement snapshot. Missing rows stay explicit. Monetary fields are returned as decimal strings.

This is source code only. No new Supabase function has been deployed, and no actual imported-data equivalence has been asserted.

## Files and permission boundary

- src/features/import/legacyReconciliationReadback.ts prepares a validated caller-JWT RPC request; no execution or attestation.
- database/migrations/phase_13_4_reconciliation_readback.sql proposes an existing-table, SECURITY INVOKER, STABLE, owner-scoped, RLS-protected read-only function. Anonymous EXECUTE denied; no DML, new tables, service-role business read, automatic repair or Edge/client UI.
- tests/phase13-4-reconciliation-readback.test.ts and tests/phase13-4-reconciliation-db-source.test.mjs are source-only checks and are not Real Cloud evidence.

## A1 exact merged-main verification (independent of A2)

- Exact A1 main merge: `03934f9a07746096eee9784b8832f5f302ffd58a`.
- GitHub Actions inventory for that SHA: **40/40 completed successful push workflows**, plus **3/3 successful downstream workflow_run checks** (Pages Preview #1603, Live External #1276, Published Client Portal #210); no failed items in that 43-check inventory. The distinct dynamic Pages deployment #207 also succeeded. Later repeated downstream runs marked skipped are not counted as failures or as new certifications.
- [A1 source gate #3](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430187281), [Quality #1787](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430187290), [Real Browser #1703](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430187298), [Pages deploy #207](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430186692), [Pages Preview #1603](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430229662), [Live External #1276](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430281349), [Published Client Portal #210](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35430281354): SUCCESS on that exact SHA.
- This establishes A1 **merged-main/deployed-live verification only**. It does NOT certify A2, prove real imported-data reconciliation, authorize the proposed SQL migration, close Phase 13.4 or unlock Phase 13.5.

## Expanded isolated A2 test coverage

The draft Real Cloud harness now checks contact source-lineage and field drift followed by exact restoration, and independently reports disappearing transactions, companies and contacts across all three stages. These are committed **test cases, not executed Real Cloud evidence**; source CI syntax does not establish database behavior.

## SQL-level testing without touching production

- CI now provisions a disposable PostgreSQL 17 service and runs `tests/fixtures/phase13-4-a2-postgres.sql` against the exact proposed SQL file. The fixture creates synthetic-only tables, JWT identity shims and RLS, and exercises owner/outsider/anonymous boundaries, a same-workspace member that can read the base ledger but cannot pass the canonical owner-only RPC, exact decimal fields, lineage/FK reads, damaged ledger rejection and missing-target visibility. No Supabase credentials or production data are used by this job.
- A successful disposable-Postgres run establishes SQL compilation and representative local behavior **only**. Supabase Real Cloud JWT/role and policy behavior, actual Phase 13.3 imports, cleanup, and consistency still require independent authenticated isolation evidence. No existing hosted Supabase test branch is available; do not install the migration into production as a shortcut.
- The readback proposal additionally binds the completed Phase 13.3 atomic outcome, persisted-result schema, final-result payload hash and exact durable `result.counts = import_jobs.counts - contract` consistency. The expanded Real Cloud harness contains disposable-ledger corruption/restoration tests and the same-workspace-member-vs-canonical-owner boundary, but those have not been executed on hosted Supabase.

## Cloud destructive-test isolation and current SQL evidence

- The A2 Real Cloud harness is now **branch-only**. It requires an explicit `ENJAZ_A2_BRANCH_REF` obtained from this project's `list_branches` response, exactly matching `https://<branch-ref>.supabase.co`, branch-specific publishable/secret credentials, and both `ENJAZ_REAL_CLOUD_CONFIRM=YES` and `ENJAZ_A2_ISOLATED_BRANCH_CONFIRM=YES`. It rejects the connected production ref `juzxriirhkuzviwnhkbd` even when both confirmations are set. Never supply the production API URL or production secret.
- `tests/phase13-4-a2-cloud-preflight.test.mjs` deliberately runs **only rejected configurations** with inert placeholders and asserts fail-closed exits before any API client is constructed. CI does not run the destructive cloud test.
- There is no existing hosted Supabase development branch for this project in the last verified branch listing; provisioning one is a separate cost-gated operation, not authorized by source-test success alone. Confirm project lineage/branch state and branch-local credentials before any isolated Real Cloud execution.
- Earlier head `ce94101734d7b6a3747f5047a5fbf38227215772` established the first disposable PostgreSQL evidence with **11 PASS groups**. It is retained only as historical evidence.
- The exact source-only head `8e2bb1e6ebe9e9fad43ac7384427f54a4ca53ef2` supersedes that evidence. [Phase 13.4 run #35437033495](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35437033495) completed **SUCCESS** in both jobs and the actual PostgreSQL 17 logs contain **16 A2 PASS notices + 17 A3 PASS notices**. The A2 set includes dual-corrupt total/per-stage ledger rejection, incomplete-job rejection, exact 5000-item readback and fail-closed 5001-item binding. The A3 set includes exact clean comparison, owner/outsider/member/anonymous boundaries, field/money/FK/source/lifecycle drift, missing targets, forged manifest/idempotency, mutually corrupted counts, five-axis same-row drift, restoration to equality without closure, and the 5000/5001 boundary.
- On that same exact head, the repository-wide inventory completed **78/78 workflows = 77 SUCCESS + 1 expected SKIPPED, 0 FAILED, 0 PENDING**. Quality Gate and cumulative Real Browser Acceptance both completed SUCCESS. This certifies source and disposable-PostgreSQL behavior only; it is not hosted Supabase Auth/RLS certification.

## Required certifications before deployment / closure

1. Preserve the exact merged-main A1 certification above and independently verify all A2 PR-head regressions; PR-head PASS alone cannot certify A2's cloud readback.
2. Independently review SQL, owner/RLS privileges, ledger hash binding, partial reads, decimal semantics and the 5000-item bound.
3. Run authenticated isolated Real Cloud permission and adversarial tests: same-workspace, anonymous, outsider, changed manifest, changed idempotency, missing/replayed job, missing/mismatched/FK-orphan row, concurrent mutation, cleanup and zero residue.
4. Preserve the implemented A3 trusted DB comparison boundary: it invokes authenticated A2 evidence inside the database, rejects caller-supplied readback/attestation, and never auto-repairs, deletes, reimports or grants closure authority. Hosted branch certification remains required.
5. Close 13.4 and unlock 13.5 only with independent full Product / UI-UX / Engineering / Certification gates and formal closure evidence.

**Authorization today:** source review and CI only. Do not deploy the proposed migration to production before live safety verification.
