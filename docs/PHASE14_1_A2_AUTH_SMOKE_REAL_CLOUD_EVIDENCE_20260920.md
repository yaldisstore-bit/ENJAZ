# Phase 14.1 A2 — isolated real Auth/import smoke: PASS (2026-09-20)

**Scope:** A *limited real hosted Auth/import smoke* on the disposable Supabase lab `nqhgaukutkyvfumbtbtg`. This is **not** full Phase 14.1 A2 eleven-domain, multi-role independently authenticated acceptance or A3/published-app/mobile certification.

## Exact executable evidence

- GitHub isolated Auth/import smoke **[run #35530804118](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35530804118)**: **SUCCESS**, source SHA `e4245daa6c193db553e79442555446d24c0c899f`.
- Preflight, locked dependencies, guarded cleanup, real hosted smoke, isolation/cleanup assertion and artifact upload all completed successfully.
- Live job logs show **58 successful real-hosted Auth/import/permission/source-lineage/replay/readback test checks**. The authenticated flow uses fresh, independent owner and outsider users, tests a same-workspace member without canonical-owner authority, and denies anonymous access.
- Real-hosted smoke verifies safe import, exact money readback, negative access, observed drift, rejection of forged/replayed ledger differences, company-capital governance guard and five-axis drift on a *transaction* that has an authorized `current_fee` source. It does **not** certify the standalone eleven-domain product journey.
- Workflow [artifact](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35530804118) `phase141-a2-isolated-auth-smoke` is uploaded. The workflow checked `passed === true`, `cleanupPassed === true` and exact approved lab ref before reporting success.
- Independent post-run **read-only** lab counts: **0** `auth.users`, **0** `auth.sessions`, **0** `public.workspaces`, **0** `public.workspace_memberships`, **0** `public.contacts`, **0** `public.companies`, **0** `public.transactions`, **0** `public.import_jobs` and **0** `storage.objects`.

## Root-cause corrections verified by this run

1. The three protected GitHub environment secrets for **this lab only** are present; the networked smoke now passes the exact-project safety preflight. Never publish their values.
2. The *isolated lab's* missing `service_role` table privileges were corrected; production already had them. Scope of the tracked lab-only fix is in `docs/lab-only/phase14_1_a2_service_role_smoke_grants.sql`. No production privileges were changed.
3. A previous interrupted smoke left exactly two *marked* Auth users and their disposable empty workspaces; the separately guarded residue cleanup recovered only those fixtures before the passing run. No unrelated records were swept.
4. A company-capital fixture attempted a direct privileged mutation and met the existing `ENJAZ_CAPITAL_REQUIRES_GOVERNANCE_COMMAND` guard. The test now *requires that direct mutation to be denied* and exercises the five independent drift axes on a transaction with a valid, separate money source. No governance guard was disabled.
5. The transaction five-axis fixture now supplies and subsequently clears `deletion_reason` when changing `deleted_at`, honoring the existing transaction integrity constraint.

## Remaining Phase 14.1 gates — **NOT CERTIFIED**

- Real **independently signed-in owner/member/denied-role/outsider/client** JWT and row policies across all 11 business domains, full create → read → reload + reversals/replay/offline/unknown outcome, then **marked** Auth/data zero-residue cleanup.
- Formal A3 browser at five widths, physical Android keyboard/back/offline and deployed authenticated client portal.
- Exact-HEAD comprehensive CI of the final candidate, controlled PR merge, exact-main production/Pages/live verification and independent formal closure.
- A narrow public/private function-definition drift between lab and production is recorded in `docs/PHASE14_1_A2_LAB_READONLY_RECHECK_20260920.md` and must be reviewed for each feature before any new functional gate; do not replay unknown production routines just to force hash equality.

**Release state:** PR #225 remains **DRAFT**; Phase 14.1 remains **IN_PROGRESS**, Phase 14.2 **LOCKED**. Production remains unchanged. Never treat this historical passing smoke as fresh exact-head CI after subsequent changes.
