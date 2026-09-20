# Phase 14.1 A2 — isolated hosted Auth/import smoke passed (2026-09-20)

**Certified scope: the existing Phase 13.4 A2 Auth/import smoke only; this is NOT complete Phase 14.1 A2 eleven-domain acceptance.**

## Independent live evidence

- GitHub Actions [run 35530804118](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35530804118), on **exact source SHA `e4245daa6c193db553e79442555446d24c0c899f`**, completed **SUCCESS**. Its isolated-auth preflight, dependency installation, marked-residue recovery, real Auth/import smoke, evidence/zero-residue verification and artifact upload all passed.
- The real smoke printed **58 distinct `PASS 13.4 A2` checks**. They include independent owner/outsider sign-in, fresh workspace separation, anonymous/foreign-workspace rejection, durable three-stage contact/company/transaction import, ledger/readback comparison and idempotent replay, data drift, forged-manifest/batch denial, and governed rejection of direct company-capital updates.
- The generated `phase141-a2-isolated-auth-smoke` evidence artifact is attached to run 35530804118. The verification step required both `e.passed === true` and `e.cleanupPassed === true` against exact isolated project `nqhgaukutkyvfumbtbtg`, distinct from production `juzxriirhkuzviwnhkbd`.
- An additional **direct read-only lab SQL count after completion** confirmed zero `auth.users`, `auth.sessions`, `public.profiles`, `public.workspaces`, `public.workspace_memberships`, `public.contacts`, `public.companies`, `public.transactions`, `public.import_jobs`, and `storage.objects`; zero marked test Auth users.
- This is a **test-only isolated lab**. No production data was written, and no production destructive probe was needed.

## Diagnosed blockers resolved without weakening authorization

1. Three GitHub protected environment secrets were initially unavailable. After owner configuration, exact-lab preflight and actual live Auth progressed.
2. The disposable lab was missing `service_role` table grants present in production. Narrow grants on the isolated six legacy-import smoke tables were restored, without granting `anon` or `authenticated` additional privileges and without disabling RLS.
3. The hosted test originally attempted to bypass the company's capital-governance restriction. The fixture now **asserts direct capital tampering is rejected**, instead of weakening the production-aligned guard.
4. The transaction soft-delete fixture was updated to supply the required nonempty `deletion_reason` and reset it on restoration, respecting the live schema constraint.
5. Interrupted, test-marked Auth/workspace residue is checked and narrowly removed **only in the approved isolated lab**, before fresh test fixtures.

## Certification boundary and next work

This passing smoke is **not** the Phase 14.1 eleven-domain authenticated owner/permitted member/denied-role/outsider/client journey. It does not certify complete business writes, document/report/client-grant behavior, physical Android keyboard/back/network recovery, published client portal, or 14.1 formal closure. The source-only A2/A3 checks are different evidence. The isolated lab still has recorded function-catalog drift that requires deliberate, reviewable analysis; do not blindly copy production functions or relax business guards.

Next: author and run the **separate** authenticated eleven-domain A2 integration matrix on this full-schema lab, with explicit role/JWT and RLS negatives; payment/reversal and offline/duplicate checks; marked fixture cleanup; then complete A3 device/published verification, exact-head and exact-main/live gates. Keep PR #225 DRAFT, Phase 14.1 IN_PROGRESS and Phase 14.2 LOCKED until those independent results exist.

The above passing evidence belongs to the stated exact code SHA. **A later documentation-only commit does not itself represent a new Auth rerun or a whole-repository exact-head regression.**
