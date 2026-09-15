# Phase 11.5 — Scheduling, Appointments & Deadline Engine — M10 — Kickoff

**Status:** IN PROGRESS  
**Opened on:** 2026-09-15  
**Base:** `0850de9e274a18ddb49d319677890a4e59ea7226`  
**Predecessor:** Phase 11.4 — Omnichannel Communications Hub — CLOSED / certified  
**Major system:** M10 — Scheduling, Appointments & Deadline Engine — ACTIVE  
**Successor:** Phase 11.6 — Smart Intake & Contract Communication — M17 + M16 — LOCKED

## Governing objective

Turn the existing ENJAZ due-date and calendar facts into one governed scheduling system tied to actual case state. Phase 11.5 is not a generic date picker and may not create a second calendar, renewal, workflow-deadline or staff-authority truth.

Appointments, government visits, deadlines, recurring renewals, staff conflicts, confirmations, attendance, reschedules, SLA countdown and escalation must be derived from or written through explicit authorities, with timezone-safe behavior and complete audit evidence.

## Existing authorities that remain authoritative

- `calendar_events` remains the canonical appointment / calendar-event fact. M10 evolves and governs it rather than creating a shadow appointment table.
- `renewals` remains the canonical recurring renewal/compliance due-date source.
- `workflow_template_stages.due_offset_days`, the workflow instance snapshot, and authoritative workflow stage state remain the source facts for workflow-generated deadline rules. M10 may materialize governed deadline evidence, but may not rewrite workflow truth.
- `transaction_followups` remains follow-up/task authority. A deadline or reminder may project attention into that system only through its owning command boundary.
- `in_app_notifications` remains notification attention/lifecycle authority; `notification_deliveries` remains transport evidence. Neither becomes scheduling truth.
- `workspaces.timezone` is the workspace scheduling timezone authority. User/device timezone may affect presentation only when explicitly permitted; it cannot silently redefine business dates.
- `notification_preferences.timezone` remains notification-delivery preference context and does not replace workspace scheduling timezone.
- `organization_members` remains workforce identity authority. Organizational ownership/scope is not equivalent to assigning a specific employee to an appointment.
- `field_assignments` remains M5 field-operation assignment authority. It may link to a scheduling fact where appropriate but is not a replacement calendar.
- `client_portal_appointment_responses` remains an M3 confirmation/decline response to a portal request. It is an input to M10 commands only and cannot itself mutate staff scheduling truth.
- `companies`, `contacts`, `transactions`, government procedure/workflow authorities and `audit_events` retain their existing ownership.

## Real-cloud facts observed at opening

On the certified production Supabase project at Phase 11.5 opening:

- `calendar_events`: 0 rows.
- `renewals`: 0 rows.
- `transaction_followups`: 0 rows.
- `organization_members`: 0 rows.
- `workflow_instances`: 0 rows.
- all 15 current workspaces use `Asia/Baghdad` as `workspaces.timezone`.
- legacy authenticated Data API grants still permit direct `INSERT`/`UPDATE` on `calendar_events` and `renewals` for a workspace member under the old baseline policies.

That direct lifecycle-write boundary is an opening defect to remove in 11.5-A before production scheduling data accumulates. Read access may remain governed by RLS, but lifecycle mutation must move behind domain commands with authorization, validation, optimistic concurrency and audit.

## Required authority laws

1. One appointment/calendar fact has one canonical `calendar_events` identity. UI copies, reminders, portal responses and transport events may not create duplicate appointment truth.
2. One recurring compliance/renewal fact has one canonical `renewals` identity. Recurrence expansion is a projection unless and until a governed occurrence is materialized with provenance.
3. Workflow deadlines require authoritative workflow rule + instance/stage facts. Missing rule, missing stage anchor or ambiguous time basis fails closed; no synthetic deadline is guessed.
4. `workspaces.timezone` governs business scheduling interpretation. Storage remains absolute/timezone-safe; presentation conversions cannot mutate source truth.
5. Device/browser timezone cannot silently become workspace authority.
6. Client Portal appointment confirmation/decline is response evidence only. Any schedule creation/reschedule must call the M10 owning command.
7. Field assignment evidence is not appointment truth. Linking field work to a calendar event must preserve both authorities without copying one into the other.
8. Team/branch/department ownership cannot be promoted into a specific staff assignment. Conflict detection requires an explicit assigned workforce identity.
9. Staff assignment must reference active `organization_members` / authorized workspace identity at the relevant time.
10. Appointment conflict detection must be deterministic, workspace-scoped and based on overlapping effective time ranges for explicitly assigned staff/resources. Unknown assignment means conflict state is unknown, not conflict-free.
11. Reschedule must preserve prior timing evidence and reason/actor provenance. Destructive overwrite without history is forbidden.
12. Attendance outcome must be explicit (`attended`, `missed`, `cancelled` or another governed state); elapsed time alone cannot invent attendance.
13. Missed-deadline root cause is explicit review evidence. The system may detect a miss from authoritative times but cannot invent a human/business cause.
14. SLA countdown/escalation is derived from source deadlines and current time. Escalation may create governed attention/actions but may not rewrite the deadline origin.
15. Reminder scheduling reuses Phase 11.1 notification authority. M10 does not create a parallel reminder-delivery store.
16. Calendar export/integration is an outbound projection boundary. External calendar/provider state does not become canonical scheduling truth unless a later governed integration contract explicitly reconciles it.
17. Direct browser lifecycle `INSERT`/`UPDATE` on canonical schedule/renewal truth is forbidden after 11.5-A hardening. Browser writes must use explicit RPC/domain commands.
18. Commands must be idempotent where retries are possible, workspace scoped, attributable, concurrency guarded and auditable.
19. Cross-workspace company/contact/transaction/staff/calendar references fail closed.
20. Completed/cancelled/terminal facts cannot be silently resurrected or rewritten.
21. Existing M3/M4/M5/M15 authorities remain separate; M10 composes them without shadow stores.
22. Phase 11.6 remains locked until the deployed-live Phase 11.5 exit gate passes.

## Delivery slices

### 11.5-A — Scheduling authority & temporal invariants
- freeze canonical scheduling/renewal/workflow-deadline authority;
- document timezone and date/time semantics;
- close legacy direct browser lifecycle writes to `calendar_events` / `renewals`;
- introduce governed command boundary, optimistic versioning/idempotency and audit requirements;
- destructive authority tests for portal-response, field-assignment, ownership, timezone and cross-workspace confusion.

### 11.5-B — Appointments, staff assignment, conflicts & history
- governed create/update/cancel/reschedule commands over `calendar_events`;
- explicit staff assignment relation using workforce authority;
- deterministic overlap/conflict detection;
- confirmation/attendance outcome and reschedule history;
- government visit context without copying government/workflow authority.

### 11.5-C — Deadline, recurrence, reminder & escalation engine
- workflow-derived deadline materialization/evidence with source provenance;
- recurring renewal occurrence handling from canonical `renewals` facts;
- SLA countdown, overdue state and escalation;
- reuse Phase 11.1 notifications/follow-ups for attention/reminders;
- explicit missed-deadline root-cause review record.

### 11.5-D — Unified calendar experience & certification
- day/week/month/agenda views scoped by staff/company/transaction/authority;
- conflict, overdue, upcoming, attendance and reschedule UX;
- real offline/failure/stale/concurrent states;
- calendar export boundary;
- Real Chromium 1280/430/390/360/320;
- Real Cloud fresh-workspace, durable-write, permission, conflict/recovery and zero-residue probes;
- exact merged/deployed SHA + post-merge recertification.

## Explicit non-goals / deferrals

- Phase 11.5 does not build Google/Microsoft calendar synchronization credentials or claim a configured external calendar integration when none exists.
- It does not replace M5 field operations, M15 organizational ownership/workforce identity, M3 client portal or M1 workflow/procedure authority.
- It does not treat a portal appointment response as an appointment record.
- It does not infer staff assignment from branch/team ownership.
- It does not infer missed-deadline causes from correlation alone.
- It does not create a second notification/reminder transport subsystem.
- It does not activate Phase 11.6 before formal Phase 11.5 closure.

## Exit requirements

Phase 11.5 / M10 cannot close until all of the following are proven:

- canonical appointment/renewal/deadline authority with no shadow truth;
- direct browser lifecycle writes closed and governed commands verified;
- workspace/timezone/cross-workspace negative permission matrix;
- deterministic staff conflict detection from explicit assignment only;
- reschedule and attendance history with audit provenance;
- workflow-derived deadline provenance and recurrence correctness;
- reminders/escalations reuse existing attention authorities;
- explicit missed-deadline root-cause review contract;
- authenticated Real Cloud durable write/read round trip and fresh-workspace bootstrap;
- retry/idempotency/stale/concurrent/failure recovery evidence;
- Real Chromium/mobile acceptance at 1280/430/390/360/320;
- frozen production budgets remain within governed caps unless separately authorized;
- zero known Critical/High/functional blockers;
- exact merged/deployed SHA + Live External + post-merge recertification.

## Successor lock

**Phase 11.6 — Smart Intake & Contract Communication — M17 + M16 remains LOCKED.**
