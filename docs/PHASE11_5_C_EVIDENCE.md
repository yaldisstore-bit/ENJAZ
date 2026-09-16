# Phase 11.5-C — Deadline, Recurrence, Reminder & Escalation Engine — Evidence

**Status:** CLOSED / merged, repaired where the canonical QA contract required it, and exact-main post-merge recertified  
**Certified predecessor:** Phase 11.5-B at main SHA `c74803ed0ebdf5218052f446540c0f8a422430b1`  
**Implementation PR:** #185  
**Implementation PR head:** `b47b5bfa4e0bc84a0f89dc7b657b5156e8450db3`  
**Implementation merge SHA:** `e3913b44df6aae2b59dba903ea2f58056951ac0d`  
**Post-merge QA repair PR:** #186  
**QA repair head:** `bec711db15c716442870c140c7295b7e0f662e8b`  
**Final certified main SHA:** `928142cf11fd41075c6d4ad8c6ec5cc517913861`  
**Major system:** M10 — Scheduling, Appointments & Deadline Engine  
**Authorized next slice:** 11.5-D — Unified calendar experience & certification  
**Successor:** Phase 11.6 remains LOCKED

## Authority result

Phase 11.5-C keeps workflow, renewal, notification and follow-up ownership separated. Workflow deadline evidence is derived from canonical workflow snapshot/stage state plus `workspaces.timezone`; `renewals` remains recurrence truth; reminders and escalations reuse Phase 11.1 `in_app_notifications` and `transaction_followups`; explicit missed-deadline review is human-authored evidence rather than an inferred cause.

No shadow renewal, workflow-rule, reminder-delivery, or scheduling authority was introduced.

## Delivered and verified

The C slice delivered and verified:

- workflow-derived deadline materialization with source fingerprint, stage anchor, workspace timezone and fail-closed missing/ambiguous rule handling;
- anchored recurring renewal occurrences from canonical `renewals` facts;
- month-end recurrence preservation, including `31 Jan → 28 Feb → 31 Mar` and leap-year behavior;
- SLA states for upcoming, due-today, overdue, completed-on-time and completed-late;
- reminder/escalation projection through existing notification/follow-up authorities;
- terminal-source and premature-escalation denial;
- explicit missed-deadline root-cause review with retry-safe idempotency receipts;
- authenticated direct-write denial for deadline/occurrence evidence;
- covering indexes for all newly introduced foreign keys;
- authenticated Real Cloud destruction probe with zero residue.

## Real Cloud proof

The production Supabase probe verified authenticated deadline derivation, recurrence anchoring, unsupported-rule rejection, direct evidence-write denial, reminder replay, early escalation denial, terminal-source denial, overdue escalation, root-cause review replay, authority reuse and cleanup with zero residue.

Advisor delta remained clean for this slice:

- new C security-advisor findings: **0**;
- new C unindexed foreign keys after hardening: **0**.

## Source certification

The source candidate was certified before merge with the Phase 11.5 M10 gate, Project Quality Constitution and Roadmap lifecycle gates. The recorded source basis remains `5d4296ac882c714bfc73cff0097ff96c8888c660`; the final PR head was `b47b5bfa4e0bc84a0f89dc7b657b5156e8450db3`.

PR #185 then merged to `e3913b44df6aae2b59dba903ea2f58056951ac0d`.

## Post-merge QA repair — PR #186

Exact-main recertification after PR #185 exposed one repository-governance defect: the canonical `audit:qa:stage-delta` gate correctly requires a recognized functional test under `tests/` whenever database behavior changes. C already had its authenticated Real Cloud destruction probe and C-specific audit, but the stage-delta classifier did not count those as the required functional-test expansion.

The gate was **not weakened or bypassed**. PR #186 added `tests/schedulingDeadlineRecurrence.test.ts` and wired it into the M10 workflow. That executable contract covers the same C invariants at repository QA level: provenance, timezone authority, anchored recurrence, no shadow reminder store, terminal/premature escalation guards, explicit root cause, idempotency, direct-write denial markers, zero-residue probe contract and FK index coverage.

This repair changed no production schema or production scheduling behavior.

## Exact-main final recertification

PR #186 merged to the final certified main SHA `928142cf11fd41075c6d4ad8c6ec5cc517913861`.

On that exact SHA:

- Phase 11.5 M10 run `35138845544` — **PASS**, including the new C functional contract test, database baseline audit/selftest, TypeScript, production build, frozen budgets and dependency audit;
- canonical Quality Gate run `35138845535` — **PASS**, including `Stage-specific test expansion gate`;
- Real Chromium / canonical promotion / external public URL gates — **PASS**;
- GitHub Pages build/deployment — **PASS**;
- observed exact-SHA check set: **38 checks, 0 failure, 0 queued, 0 in-progress**.

Therefore the QA gap discovered after PR #185 is closed on exact `main`, not merely on a feature branch.

## What C does not claim

C does not claim the final unified calendar UX or Phase 11.5 system closure. The remaining final-slice responsibilities are intentionally assigned to 11.5-D:

- day/week/month/agenda experiences scoped by staff/company/transaction/authority;
- conflict, overdue, upcoming, attendance and reschedule UX;
- real offline/failure/stale/concurrent states;
- calendar export boundary;
- Real Chromium at 1280/430/390/360/320;
- fresh-workspace and durable-write Real Cloud certification;
- final permission/conflict/recovery/zero-residue proof;
- exact merged/deployed SHA plus final post-merge recertification.

## Exit condition

Phase 11.5-C is **CLOSED**. Its production authority, Real Cloud evidence, implementation merge, post-merge QA repair, recognized functional contract, and final exact-main recertification are recorded.

The only authorized progression is **11.5-D — Unified calendar experience & certification**. Phase 11.5 remains overall **IN_PROGRESS**, and **Phase 11.6 remains LOCKED**.
