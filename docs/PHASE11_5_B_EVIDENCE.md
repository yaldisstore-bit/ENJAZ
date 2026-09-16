# Phase 11.5-B — Appointments, Staff Assignment, Conflicts & History — Evidence

**Status:** SOURCE CANDIDATE CERTIFIED / PR merge and exact-main post-merge recertification pending  
**Certified predecessor:** Phase 11.5-A at main SHA `2e85c9f8fa9066ab75bae3dbf6ecdcef02917530`  
**Major system:** M10 — Scheduling, Appointments & Deadline Engine  
**Successor:** Phase 11.6 remains LOCKED

## Authority result

Phase 11.5-B keeps `calendar_events` as the single canonical appointment/calendar fact. It does not add a shadow appointment store.

Explicit appointment staffing is modeled by `calendar_event_staff_assignments`, whose staff identity references canonical `organization_members`. `field_assignments` remains M5 field-operation authority and is not reused as appointment truth.

Government-visit context is linked through `calendar_events.workflow_instance_id` to canonical `workflow_instances`; government entity/procedure/branch names or lifecycle truth are not copied into an M10 shadow store.

Client Portal appointment responses remain evidence/input only. They do not mutate `calendar_events` directly; a governed M10 confirmation command validates and records the portal response when it is intentionally consumed.

## Real Cloud migrations

Applied on the certified production Supabase project:

- `20260915203436` — `phase_11_5_appointments_conflict_authority`
  - calendar workflow/confirmation/attendance fields;
  - explicit organization-member appointment assignments;
  - append-only reschedule evidence;
  - deterministic staff conflict snapshot;
  - fail-closed `unknown_assignment` / `unknown_range` states;
  - authenticated read-only access to assignment/history evidence.
- `20260915203954` — `phase_11_5_appointment_governed_commands`
  - governed appointment create;
  - metadata update without timing mutation;
  - reschedule with reason/history;
  - staff replacement with assignment history;
  - confirmation with optional portal response provenance;
  - explicit attendance outcome;
  - existing M10 idempotency receipts, membership authority, optimistic versioning and audit authority reused.
- `20260915204630` — `phase_11_5_live_appointments_conflict_probe`
  - destructive authenticated Real Cloud verification followed by cleanup and zero-residue assertions.

## Conflict law verified in Real Cloud

The live probe verified all of the following:

- empty explicit staff assignment produces `unknown_assignment`, never a false clear state;
- a staff-scoped event without a bounded end produces `unknown_range` and governed writes fail closed;
- same-staff overlapping appointments are rejected;
- adjacent same-staff appointments are accepted;
- overlapping appointments assigned to different staff are accepted;
- inactive staff is rejected;
- cross-workspace staff is rejected;
- workflow-instance / transaction mismatch is rejected;
- optimistic stale reschedule is rejected;
- reschedule into a conflict is rejected;
- staff reassignment retains previous assignment evidence instead of destructive overwrite.

The write path locks the explicit staff set with transaction advisory locks before conflict assertion to prevent two governed concurrent writes from both treating the same staff interval as free.

## Confirmation, attendance and history verified

The live probe verified:

- an existing Client Portal response does not directly change schedule truth;
- portal response decision mismatch is rejected;
- governed portal confirmation records source/response provenance;
- reschedule resets stale confirmation evidence and appends `calendar_event_reschedule_history` with old/new timing, actor, operation, reason and version transition;
- attendance is explicit (`attended` / `missed`) rather than inferred from elapsed time;
- future attendance recording is rejected;
- terminal appointment reschedule is rejected;
- all governed changes emit `audit_events` evidence.

## Direct browser boundary

Authenticated browser lifecycle writes remain closed:

- direct `calendar_events` lifecycle INSERT/UPDATE remains locked by 11.5-A;
- direct INSERT/UPDATE/DELETE to `calendar_event_staff_assignments` is not granted;
- direct INSERT/UPDATE/DELETE to `calendar_event_reschedule_history` is not granted;
- authenticated users receive governed SELECT only for the new evidence relations;
- public RPC façades are `SECURITY INVOKER`; privileged implementations remain under the private-schema command boundary.

## Runtime gateway

`src/features/scheduling/schedulingCommands.ts` now exposes and strictly validates:

- `checkCalendarEventStaffConflicts`;
- `createCalendarEvent`;
- `updateCalendarEventMetadata`;
- `rescheduleCalendarEvent`;
- `setCalendarEventStaff`;
- `setCalendarEventConfirmation`;
- `recordCalendarEventAttendance`;
- the existing 11.5-A calendar/renewal lifecycle commands.

The gateway accepts only the governed response schemas `enjaz.scheduling-calendar-event.v2` and `enjaz.scheduling-conflict.v1`; malformed/shadow responses fail closed. Staff IDs are UUID-validated, deduplicated and sorted before RPC dispatch.

`tests/schedulingCommands.test.ts` contains B-specific RPC/payload/parser/fail-closed coverage. On exact source SHA `276e2deb0106d32d64bdcade9fd0fe13ecd6a59d`, M10 run `35070167273` passed all 13 gateway tests together with the A preservation tests, Daily Work composition, database audit/selftest, secrets audit, TypeScript, build, frozen budgets and dependency audit.

## Source CI certification

The exact source SHA `276e2deb0106d32d64bdcade9fd0fe13ecd6a59d` was certified before this evidence-only update:

- M10 run `35070167273` — PASS;
- Project Quality Constitution run `35070167107` — PASS;
- Roadmap Amendment run `35070167228` — PASS;
- failed workflow count on the exact SHA — **0** across these required source gates;
- scheduling gateway tests — **13/13 PASS**;
- frozen production total JavaScript — **757,790 / 760,000 bytes**;
- budget margin — **2,210 bytes**;
- initial JavaScript — **430,513 / 670,000 bytes**;
- largest lazy JavaScript chunk — **65,463 / 140,000 bytes**;
- budget cap was **not increased**;
- npm high-severity audit — **0 vulnerabilities**.

The current branch head after State/Evidence recording must still pass the same source gates before the PR is opened. The recorded source SHA is therefore evidence basis, not a substitute for final-head CI.

## Advisor result

After B1 DDL, Supabase Security and Performance Advisors were checked.

- new Phase 11.5-B security findings: **0**;
- new Phase 11.5-B unindexed foreign keys: **0**.

Inherited advisor findings from older systems remain outside the scope of this slice and were not disguised as B defects. Newly created B indexes may appear as unused immediately after creation, which is expected before production usage and is not evidence that they should be removed.

## Zero-residue result

After the authenticated destructive probe, explicit residue verification returned zero for:

- temporary workspaces;
- calendar events;
- staff assignments;
- reschedule history;
- scheduling command receipts;
- audit fixtures.

## What this evidence does NOT claim

This slice does **not** yet claim:

- a fresh-workspace bootstrap certificate for all of Phase 11.5;
- durable cross-session write/read certification;
- final day/week/month/agenda Real Chromium UX certification;
- external Google/Microsoft calendar integration;
- Phase 11.5 overall closure;
- Phase 11.6 authorization.

Those final-system requirements remain assigned to Phase 11.5-D unless a later governed slice explicitly certifies them sooner.

## Current exit condition

11.5-B remains open until the final branch head passes all B source gates, the PR is merged, and the exact merged `main` SHA passes post-merge M10/Quality/Real Browser/Pages recertification with zero critical/high/functional blockers.

**Phase 11.6 remains LOCKED.**