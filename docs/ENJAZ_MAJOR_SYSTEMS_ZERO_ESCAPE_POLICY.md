# ENJAZ Major Systems — Zero-Escape Closure Policy

> **Status:** MANDATORY GOVERNANCE CONTRACT
>
> Applies to every major product system `M1` through `M18` and to any future major system added to ENJAZ.
>
> Purpose: a system must not be called CLOSED because its code compiles, unit tests pass, or a preview looks correct. Closure requires proof that the real deployed system works for real authenticated users against the intended cloud data model and survives destructive conditions.

## 1. Non-negotiable rule

A major system is **NOT CLOSED** until all closure layers below are green on the exact candidate commit and the exact merged/deployed commit.

No owner, maintainer, assistant, CI summary, roadmap text, or UI screenshot may override a failed or missing gate.

A green mock/preview test is evidence only for the surface it tests. It can never substitute for real-cloud evidence.

## 2. Four closure layers

### Layer A — Pre-merge deterministic integrity
Required on the exact PR head:
- TypeScript/build passes.
- Domain/unit/integration tests pass.
- Database schema + RLS audit passes.
- Migration drift audit passes.
- Secrets/security audit passes.
- Destructive selftests prove the tests fail when the protected capability is removed.
- Production bundle/budget gate passes.
- No Critical/High defect and no known functional blocker remains.

### Layer B — Real Cloud / Real Auth / Real Data
Required before closure for every system that reads or writes business data:
- Test against the **intended ENJAZ Supabase project**, not an in-memory repository.
- Authenticate as a non-service-role test principal through the same public client boundary used by the browser.
- Fresh-user or fresh-workspace bootstrap must succeed from zero state.
- Perform real create → read → update/state-transition → reload → verify → safe cleanup/reversal where the model permits.
- Verify RLS/permissions using unauthorized and lower-privilege principals where applicable.
- Verify the created row is visible after a fresh query/session boundary, not only optimistic local state.
- Verify relational children and totals/reconciliation from authoritative database facts.
- No `service_role` key is allowed in browser code or as a substitute for user-level acceptance.

### Layer C — Real Browser / Real Mobile behavior
Required on the candidate:
- Chromium journey at 1280, 430, 390, 360 and 320 widths where the system has UI.
- Android/mobile keyboard, back navigation and safe-area behavior for write flows.
- Empty/first-run state.
- Long Arabic + Latin mixed content.
- Large values / dense lists / long histories where applicable.
- Deep link + refresh + session expiry/recovery.
- Network failure/retry and stale/conflict behavior where the operation can be interrupted.
- No hidden form, unreachable CTA, clipped action, horizontal overflow or success message before durable persistence.

### Layer D — Post-merge deployed recertification
After merge, closure remains **PENDING** until the merged SHA itself is proven on the deployed runtime:
- Canonical Quality/Governance gates green.
- Pages/deployment green for the exact merged SHA.
- Live external browser opens the published production runtime, not only a preview harness.
- At least one authenticated live critical-path journey for the system succeeds against real cloud data.
- Fresh-load verification confirms durable persistence.
- 0 failure, 0 queued, 0 in-progress required closure workflows.
- Closure evidence records the exact merge SHA and run IDs.

Only after Layer D may machine state change from `CLOSURE_CANDIDATE` to `CLOSED`.

## 3. Mandatory reality scenarios for every major system

Each implemented system must explicitly cover, where applicable:
1. fresh account / fresh workspace / no seed data;
2. existing account with realistic data;
3. create/read/update or domain-equivalent full write round trip;
4. duplicate submission / double tap / replay protection;
5. unauthorized access;
6. lower-privilege access;
7. cross-workspace isolation;
8. invalid and boundary inputs;
9. stale state / concurrent mutation conflict;
10. network interruption and retry;
11. reload/deep-link after successful write;
12. mobile narrow viewport and keyboard;
13. long RTL/mixed-language content;
14. dense/high-volume data;
15. audit evidence for sensitive writes;
16. authoritative totals/relations reconciliation;
17. migration/rollback safety;
18. no mock/demo repository in the production critical path.

A scenario may be marked `NOT_APPLICABLE` only with a written reason in closure evidence.

## 4. Permission-matrix rule

Any system with multiple roles must test its actual permission matrix. Naming roles in documentation is not evidence.

At minimum, test all roles that can exist for that system plus an unauthorized principal. Expected denies must be asserted as denies; unexpected privilege escalation is a release blocker.

Client Portal and external-link systems additionally require explicit proof that internal notes, staff-only finance, unrelated companies/transactions, risk signals and other workspace data cannot leak.

## 5. Write-integrity rule

For every user-visible write:
- UI success is forbidden before durable persistence is confirmed.
- A refresh/new query must reproduce the saved fact.
- Duplicate taps must not create duplicate authoritative records.
- Partial failures must not leave a silently inconsistent graph.
- Financial/ownership/compliance history uses reversal/correction/event semantics where destructive overwrite would destroy evidence.
- Sensitive writes must have attributable audit evidence.

## 6. Error-quality rule

A swallowed exception with a generic toast is not an acceptable implementation.

Every critical operation must have normalized, diagnosable failure classes sufficient to distinguish at least authentication/session, permission/RLS, validation, connectivity/provider, conflict/stale state, missing relation/configuration and unexpected server/database failure.

User-facing copy may be concise, but logs/test evidence must preserve the actionable class without leaking secrets.

## 7. Defect-escape rule

If a real user discovers a reproducible defect in a system previously considered closed:
1. the defect is treated as a **gate escape**, not merely a UI annoyance;
2. reproduce it against the real boundary when safe;
3. add a regression test that fails before the fix;
4. fix the root cause, not only the symptom;
5. rerun the affected system gate plus cumulative regression and deployed recertification;
6. record the escaped-defect ID and the missing scenario that allowed it through;
7. strengthen the reusable gate so the same class cannot escape in another system.

Critical/High escaped defects temporarily invalidate closure of the affected system until recertification completes.

## 8. Zero-defect meaning

ENJAZ cannot mathematically guarantee that software will never contain a bug. `Zero-Escape` therefore means:
- zero known Critical/High defects at closure;
- zero known functional blockers;
- no skipped mandatory reality gate;
- no closure based only on mocks/previews;
- every discovered real defect becomes permanent regression coverage;
- the deployed merged SHA, not merely the PR branch, is the final authority.

## 9. Required machine closure evidence

Every future major-system closure state must include:
- `systemId`
- `status`
- `candidateHead`
- `mergeCommit`
- `unresolvedCriticalCount`
- `unresolvedHighCount`
- `unresolvedFunctionalBlockerCount`
- `preMergeDeterministic`
- `realCloudAuthenticated`
- `freshWorkspaceBootstrap`
- `durableWriteRoundTrip`
- `permissionMatrix`
- `realBrowserMobile`
- `failureConflictRecovery`
- `auditReconciliation`
- `deployedLiveCriticalPath`
- `postMergeRecertification`
- `escapedDefects`

For `status: CLOSED`, every required gate must be `COMPLETE/PASS`, all unresolved counts must equal `0`, a merge SHA must exist, and deployed post-merge evidence must be present.

## 10. Governance consequence

From this policy onward, **24/24 or 25/25 green CI alone does not mean a major system is closed** unless those workflows include and prove the real-cloud/deployed-live requirements relevant to that system.

The closure claim itself is a tested artifact.