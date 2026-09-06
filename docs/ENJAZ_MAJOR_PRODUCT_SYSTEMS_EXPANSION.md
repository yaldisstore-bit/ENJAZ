# ENJAZ Major Product Systems Expansion — 2026

> Governing amendment for **major product systems**, not cosmetic capabilities. This document supplements the Master Roadmap and supersedes any interpretation of the 2026 capability expansion as the complete future product scope.
>
> Closed phases remain closed. New major systems are anchored only to future/open phases so no verified phase is reopened or bypassed.

## Definition: what counts as a major ENJAZ feature

A major feature must create a new end-to-end user capability with its own data model, permissions, workflows, failure modes, UI surfaces, destructive tests and measurable business outcome. Filters, badges, themes, small widgets, extra exports and similar refinements do **not** count as major systems.

---

## M1 — Government Procedure Operating System
**Roadmap anchor: Phase 8**

Turn ENJAZ from a transaction tracker into a configurable operating system for real administrative/government procedures.

Core capabilities:
- Procedure catalog by authority/department/service.
- Versioned procedure definitions: required documents, fees, stages, SLA, prerequisites and allowed transitions.
- Dynamic requirement engine: requirements change based on company type, transaction type, capital, governorate or other facts.
- Procedure packs that can instantiate an entire transaction/workflow/checklist in one action.
- Mandatory-step enforcement: a case cannot be advanced if required evidence is missing.
- Official-fee schedule with effective dates and historical versions.
- Appointment/visit requirements tied to stages.
- Procedure change impact detection: identify open cases affected by a newly published requirement/version.
- Real status model: waiting for client / ready for submission / submitted / under review / correction required / completed / rejected.
- Government-stage audit trail and evidence attachments.

Exit requires complete scenario: choose service → requirements generated → evidence collected → stage progression → fees → submission/visit → completion/rejection → audit.

---

## M2 — Corporate Governance & Ownership Engine
**Roadmap anchor: Phase 9**

A full corporate register above the existing company core.

Core capabilities:
- Shareholders/partners and ownership percentages.
- Capital structure and ownership history with effective dates.
- Beneficial-owner register.
- Directors/managers and representation authority.
- Powers/authorizations and expiry dates.
- Company resolutions/decisions register.
- Capital increase/decrease history.
- Partner/share transfer transactions.
- Director appointment/removal history.
- Corporate-event timeline.
- Consistency engine: ownership must reconcile to 100% where applicable; conflicting effective periods fail closed.
- Governance risk alerts: expired authorization, missing beneficial owner, ownership inconsistency, unresolved director conflict.
- Generate current and historical ownership snapshots from authoritative events, not overwritten fields.

This system must support queries such as “who legally controlled this company on date X?” and “what changed between two dates?”.

---

## M3 — Client Portal
**Roadmap anchor: Phase 11**

A secure external-facing portal for clients, separate from staff UI and permissions.

Core capabilities:
- Invite a client to a restricted portal account.
- Client sees only explicitly shared companies/transactions.
- Live transaction status timeline.
- “What we need from you” document/action queue.
- Secure document upload directly into the correct case.
- Draft/letter/document approval or rejection with comment.
- Payment request/invoice visibility and receipt access.
- Client questions/messages linked to the exact transaction.
- Appointment/visit confirmations.
- Read receipts for critical requests.
- Client-visible completion package.
- Revoke access instantly without affecting internal staff records.
- Full audit of every externally shared item.

The portal cannot expose internal notes, risk signals, staff-only finance or unrelated workspace data.

---

## M4 — Omnichannel Communications Hub
**Roadmap anchor: Phase 11**

One conversation history per client/company/transaction instead of scattered messaging.

Core capabilities:
- Email ingestion/sending.
- WhatsApp Business integration when configured.
- SMS provider integration when configured.
- Message templates with merge fields.
- Inbound message matching to company/contact/transaction.
- Manual re-linking with audit when automatic matching is uncertain.
- Attachments stored in the document vault.
- Convert a message into follow-up/task/document request.
- Conversation-level unread/awaiting-reply state.
- SLA for unanswered client communication.
- Outbound approval requirement for sensitive templates where configured.
- Search across authorized conversations.

No provider credentials may live in browser code.

---

## M5 — ENJAZ Field Operations / Runner Mode
**Roadmap anchor: Phase 8**

A mobile-first mode for employees/representatives who physically visit departments.

Core capabilities:
- Daily visit route/queue.
- Check-in/check-out at a visit with optional location evidence under explicit workspace policy.
- Capture photo/document/receipt directly into the case.
- Record official fee paid, reference number and counter/department visited.
- “Could not complete” reason taxonomy with evidence.
- Offline draft queue for notes/evidence with guarded synchronization.
- Handoff between office and field employee.
- One-tap “next required action” after visit.
- Visit history and productivity metrics without invasive tracking.
- Emergency re-assignment of visits.

The feature must still work safely with intermittent mobile connectivity.

---

## M6 — Service Catalog, CRM & Commercial Intake
**Roadmap anchor: Phase 8**

Create a true front door for new work before it becomes a transaction.

Core capabilities:
- Service catalog with pricing/rules/expected duration/required inputs.
- Lead/prospect records.
- Inquiry → qualification → quotation → acceptance → client/company → transaction conversion.
- Reusable quotation templates and line items.
- Optional discounts with approval rules.
- Client onboarding checklist.
- Source/referral tracking.
- Won/lost reasons.
- Service profitability after execution using authoritative finance.
- Prevent duplicate clients/companies during conversion.
- Conversion audit preserving the original commercial request.

---

## M7 — Document Factory & Official Form Engine
**Roadmap anchor: Phase 10**

Move beyond “store PDFs” into producing operational documents.

Core capabilities:
- Versioned document templates.
- Merge fields from company/contact/transaction/finance/governance data.
- Conditional sections based on data.
- Repeating tables/rows.
- Arabic/RTL-safe professional pagination.
- Generate official requests, authorizations, letters, resolutions, receipts and reports.
- Form-filling layer for structured government templates/PDFs where technically supported.
- Document version history and compare.
- Approval workflow before finalization.
- Signature placeholders / approved e-signature integration boundary.
- QR/barcode carrying stable document/reference identity.
- “Regenerate from same facts” reproducibility contract.
- Package builder: generate a complete submission bundle from a transaction.

---

## M8 — Regulatory / Knowledge Base Engine
**Roadmap anchor: Phase 9 + Phase 12**

A workspace-controlled knowledge system for laws, circulars, procedures and internal know-how.

Core capabilities:
- Store regulations/circulars/guidance with source, date and version.
- Effective-from/effective-to history.
- Link a rule to services/procedures/company types.
- Full-text search with Arabic normalization.
- Show which active procedures depend on a changed rule.
- Internal SOP/checklist articles.
- Citations from Copilot back to the exact workspace knowledge source.
- Never treat AI-generated text as a regulation/source.

---

## M9 — Agentic ENJAZ Copilot
**Roadmap anchor: Phase 12**

Not a chat box. A permission-aware operating agent over ENJAZ.

Core capabilities:
- Read an authorized company/transaction and produce a grounded action plan.
- Detect missing prerequisites/documents.
- Propose next steps based on procedure/workflow state.
- Draft letters, follow-ups, document requests and client updates.
- Create a multi-step action bundle only after explicit user approval.
- Allowed tools: create follow-up, prepare draft, create document request, schedule reminder, prepare workflow transition, prepare payment request, prepare client message.
- High-impact actions require confirmation and remain attributable to the approving user.
- Agent cannot silently alter money, ownership, completed records or permissions.
- “Why?” trace explaining which ENJAZ facts and knowledge sources caused a recommendation.
- Detect contradictions between documents and structured data and request review rather than choosing a side.
- Daily autonomous briefing: what changed, what is blocked, what needs attention.

---

## M10 — Scheduling, Appointments & Deadline Engine
**Roadmap anchor: Phase 11**

A real calendar tied to case state, not a generic date picker.

Core capabilities:
- Internal appointments and government visits.
- Deadline rules generated from procedure/workflow facts.
- Repeating renewal/compliance deadlines.
- Conflict detection for assigned staff.
- Appointment confirmation and attendance outcome.
- Reschedule history.
- Calendar views by staff/company/transaction/authority.
- SLA countdown and escalation.
- Calendar export/integration boundary.
- Missed-deadline root-cause record.

---

## M11 — Integration Platform / API / Webhooks
**Roadmap anchor: Phase 14–15**

Make ENJAZ extensible without direct database access.

Core capabilities:
- Versioned authenticated API for approved workspace operations.
- Scoped API tokens/service accounts with revocation and audit.
- Outbound webhooks for approved events.
- Signed webhook payloads and replay protection.
- Idempotency keys for external writes.
- Integration event log and retry/dead-letter handling.
- Import endpoints with validation and dry-run mode.
- Provider adapters for messaging/payment/calendar/document signing where configured.
- No service-role key exposed to third-party clients.

---

## M12 — Compliance, Audit & Evidence Center
**Roadmap anchor: Phase 15**

A dedicated control center for proving what happened, not just a generic activity log.

Core capabilities:
- Immutable-style business audit stream for sensitive actions.
- Before/after evidence for permitted mutations.
- Access/permission change history.
- Financial correction/reversal evidence.
- Ownership/governance change evidence.
- Document sharing/download audit where technically available.
- Search/filter/export audit evidence under permission controls.
- Suspicious activity signals: repeated failed access, unusual mass exports, rapid permission changes.
- Retention policies and legal hold boundary.
- Data-export package for a company/transaction with manifest and checksums.

---

## M13 — Business Intelligence & Forecasting Center
**Roadmap anchor: Phase 9 + Phase 15**

Decision support derived from authoritative ENJAZ facts.

Core capabilities:
- Revenue, receivables, cash collection and service profitability.
- Work-in-progress value.
- Average cycle time by service/authority/stage/employee.
- Bottleneck detection.
- Deadline/SLA breach trends.
- Client concentration and aging risk.
- Capacity forecast from current queue and historic durations.
- Scenario estimates clearly labeled as estimates, never facts.
- Drill-down from every metric to source records.

---

## M14 — Backup, Restore & Workspace Portability
**Roadmap anchor: Phase 15 + Phase 18**

Core capabilities:
- Workspace-level logical export with manifest.
- Encrypted backup artifact boundary.
- Dry-run restore validation.
- Restore into isolated target before cutover.
- Referential and financial reconciliation after restore.
- Portable export of documents + metadata + business records.
- Disaster-recovery runbook tested before release.

---

# Product-system release rule

A system is not “implemented” merely because a screen exists. Each M-system requires:
1. authoritative schema/data contract;
2. workspace/RLS/permission contract;
3. domain service layer;
4. complete live user journey;
5. real error/offline/conflict states;
6. destructive automated tests;
7. Real Chromium/mobile acceptance;
8. audit evidence for sensitive writes;
9. post-merge recertification;
10. no demo-only substitute in the production runtime.

The earlier Capability Expansion 2026 items remain useful supporting capabilities, but they do **not** substitute for these major systems.
