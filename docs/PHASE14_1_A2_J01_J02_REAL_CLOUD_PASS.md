# Phase 14.1 A2 — real Auth company → transaction journey (J01/J02)

**Date:** 2026-09-20. **Scope:** first **two** of the eleven required Phase 14.1 business domains, with independent real JWT and durable reload; **NOT** full Phase 14.1 A2 or A3 certification.

## Verified hosted evidence

- [GitHub Actions run 35531543838](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35531543838) on exact code SHA `26c4195bf9e6bb4d16d84793279c1f9d6df861f2`: **SUCCESS**. Preflight, dependencies, real cloud runner, evidence check, artifact upload and cleanup step all succeeded.
- The separately isolated runner `scripts/phase14-1-a2-company-transaction-real-cloud.mjs` recorded **14 passing named checks** for J01/J02, against protected lab `nqhgaukutkyvfumbtbtg`. Its artifact is `phase141-a2-j01-j02-real-cloud`.
- Independently authenticated owner and outsider accounts had distinct fresh workspaces. The owner **created** a company and linked transaction with authenticated (non-admin) clients. A separate, fresh owner session then reloaded their durable ID/workspace/company linkage and exact two-decimal fee.
- The outsider saw neither owner's company nor transaction, could not create either record in the owner's workspace, and the owner's attempt to bind its transaction to the outsider's company was rejected by the workspace-bound FK. An anonymous client could not read either owner record.
- An authorized owner company edit did not orphan the linked transaction.
- Both auth-user and workspace fixtures were removed. A **separate read-only SQL check after the completed run** confirmed `auth.users=0`, `auth.sessions=0`, `workspaces=0`, `companies=0`, `transactions=0`, `storage.objects=0` in the lab.

## Safety and remaining scope

All fixtures were synthetic, created only after the disposable lab's empty-state check, and restricted to exact approved lab URL/ref. The production reference `juzxriirhkuzviwnhkbd` was never used as a write target. The test does not grant new data privileges or relax RLS. Its cleanup only targets fresh test users and their owned workspaces; an unexpected pre-existing auth/business population blocks the test before mutation.

This slice does **not** certify same-workspace denied role, client-portal grants, procedure stages, field operations, follow-up, payments/reversals, documents, governance, engagements, archive/restore, offline replay, published portal or Android recovery. All remaining nine business domains and the cross-domain journey still require their **own** actual authenticated/negative/durable evidence. Neither this check nor the earlier 58-pass Auth/import smoke permits Phase 14.1 closure, PR #225 merge or Phase 14.2.

The referenced positive cloud run certifies its exact source SHA. This evidence-document commit is **not** a new authenticated rerun.
