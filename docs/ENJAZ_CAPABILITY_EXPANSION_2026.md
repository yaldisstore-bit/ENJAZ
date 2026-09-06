# ENJAZ Capability Expansion 2026 — Roadmap Amendment

Status: **PROPOSED ROADMAP EXPANSION**

Base: `main@0fdf372c9c7c933c4e72b5a86d484c719989bec0`

This amendment expands ENJAZ while preserving the frozen delivery order, architecture, data integrity rules, UI/UX system, destructive gates, and post-merge recertification discipline.

It does **not** unlock Phase 7.2, skip any phase, or weaken any existing gate. Every capability below must be implemented inside its assigned future phase and inherit the same production, browser, database, accessibility, budget, security, and regression requirements as the rest of ENJAZ.

## Product direction

ENJAZ should evolve from a transaction/company tracker into a complete operational platform for legal and administrative work: finance, workflows, documents, communication, intelligence, compliance, teams, and AI assistance should compose the same authoritative data instead of creating parallel implementations.

## Phase 7 expansion — Finance

### Payments, receipts and cash operations
- Partial payments and multi-payment settlement for one transaction.
- Payment allocation across fees/receivables without losing source facts.
- Stable receipt numbering with duplicate prevention.
- QR/barcode identity on receipts and printable receipt view.
- Shareable receipt output suitable for mobile workflows.
- Safe reversal, correction and refund flows with immutable audit evidence.
- Explicit cash/bank/transfer payment channels.
- Cashbox-to-cashbox transfer with double-entry evidence.
- Daily cashbox opening/closing and counted-vs-system reconciliation.
- Expense/outflow records linked to a cashbox and optional company/transaction context.
- Installment schedules and due-date tracking.
- Recurring financial obligations and expected-payment schedules.
- Customer/company credit balance handling without silently netting unrelated facts.

### Financial intelligence and reporting
- Receivables aging buckets.
- Overdue payment queue.
- Company-level financial health summary.
- Transaction profitability/cost summary when authoritative cost facts exist.
- Cashflow trend and collection trend views.
- Daily/weekly/monthly finance summaries.
- Reconciliation dashboard exposing mismatches rather than hiding them.
- Export to CSV/XLSX-compatible data and professional PDF/print paths through the reporting contract.

## Phase 8 expansion — Workflow, Automation, Operations and Team Control

### Workflow builder
- Visual no-code workflow template builder.
- Reusable stages, checklists, required fields and completion conditions.
- Approval stages with explicit approver identity.
- SLA/deadline configuration per stage.
- Escalation rules for overdue stages.
- Stage delegation and reassignment.
- Workflow template versioning so active cases keep their historical definition.
- Bulk workflow actions guarded by preview + confirmation.

### Automation
- Human-readable trigger/action builder.
- Dry-run/test mode before activation.
- Automation execution history with success/failure reasons.
- Retry policy with idempotency protection.
- Schedule-based automations in addition to event-based triggers.
- Approval-required automations for sensitive actions.
- Reusable automation templates.

### Team and access management
- Invite users to a workspace.
- Owner/admin/member/viewer role baseline.
- Granular domain permissions for finance, documents, companies and operations.
- Delegation/temporary responsibility transfer.
- User activity/audit viewer.
- Login/session/access history where available without exposing secrets.
- Multi-workspace switching without cross-workspace leakage.

## Phase 9 expansion — Risk, Search, Saved Views and Intelligence

- Advanced global search across transactions, companies, people, documents and finance.
- Command palette with recent actions and keyboard/mobile search entry.
- Search history and recent records.
- Pinned/favorite records.
- User-defined tags and labels.
- Custom fields under governed typed definitions rather than arbitrary unvalidated blobs.
- Custom dashboard widgets backed only by authoritative services.
- Saved dashboard layouts per user.
- Workload heatmaps by lawyer/person/workflow stage.
- SLA breach risk and deadline risk.
- Company compliance/renewal risk signals.
- Financial anomaly signals such as unusual reversals or collection drops.
- Duplicate-record suggestions with review before merge.
- Explainable risk score components; no opaque single-number risk without evidence.
- "What changed?" cross-domain delta summaries.

## Phase 10 expansion — Documents, Vault, OCR and Reports

- Document template library for common administrative/legal outputs.
- Merge fields from company, transaction, contact and finance data.
- Template versioning and preview before generation.
- Document version history.
- Camera/scan upload flow optimized for mobile.
- Multi-file and batch upload.
- Document categories, tags and expiration dates.
- Expiry/renewal reminders tied to authoritative document metadata.
- OCR review queue: extracted text is never treated as verified until approved.
- Side-by-side OCR/source review.
- Document comparison/diff for supported text documents.
- Secure time-limited share links with explicit revocation.
- Barcode/QR support in generated reports where useful.
- Signature-status tracking and signer metadata without pretending to provide a legally qualified e-signature service unless explicitly integrated later.
- Full report template system with deterministic headers, footers, page breaks, signatures and multi-page overflow handling.

## Phase 11 expansion — Notifications, Follow-ups and Communication

- In-app notification center with categories and priorities.
- Daily/weekly digest mode.
- Quiet hours and notification preferences.
- Snooze with reason and wake-up time.
- Escalating reminders for overdue critical work.
- Assignment notifications and reassignment history.
- Notification deduplication and collapse for repeated events.
- Optional email/push delivery when a supported provider is deliberately integrated.
- Shared team inbox for action-needed items, without duplicating underlying records.
- Follow-up templates and recurring follow-ups.
- Calendar-style due-date and follow-up view.
- iCalendar-compatible export for selected deadlines/events where appropriate.

## Phase 12 expansion — ENJAZ AI Copilot

- Natural-language search over authorized ENJAZ data.
- "Summarize this company/transaction" with source-linked facts.
- Draft official letters from approved templates and authoritative record data.
- Draft follow-up messages and internal notes.
- Explain finance summaries and anomalies without inventing missing numbers.
- Extract structured candidate data from uploaded documents into a review screen.
- Suggest next actions based on workflow/risk state, never silently execute them.
- "What changed since yesterday/last week?" operational briefing.
- Compare two companies, transactions or periods when authorized data supports it.
- Conversational command preview: AI may prepare an action, but sensitive writes require explicit user confirmation.
- Per-answer source visibility inside ENJAZ for business facts used by the Copilot.
- Permission-aware retrieval and prompt-injection defenses around documents and user content.

## Phase 13 expansion — Legacy Import & Reconciliation

- Import preview before mutation.
- Mapping wizard for legacy fields/identifiers.
- Duplicate-resolution workbench.
- Orphan-relation review queue.
- Import batches with stable identifiers and idempotent retry.
- Per-batch reconciliation dashboard.
- Financial before/after totals comparison.
- Safe batch rollback where technically possible and explicitly proven.
- Downloadable import/reconciliation report.

## Phase 14 expansion — Full-system journeys

Add end-to-end journeys for:
- company -> contact -> transaction -> workflow -> follow-up -> payment -> receipt -> document -> report -> archive;
- company renewal/compliance deadline -> risk -> notification -> task completion;
- team reassignment/delegation with audit continuity;
- document upload -> OCR review -> approved data extraction -> report generation;
- payment reversal -> ledger update -> financial report reconciliation;
- expired session during a multi-step write and safe recovery without duplication.

## Phase 15 expansion — Performance, Security and Reliability

- PWA installability where supported.
- Safe offline read cache for explicitly approved screens.
- Offline write queue only where idempotency and conflict semantics are proven.
- Background refresh of non-sensitive summaries where platform support allows.
- Large-list virtualization where profiling proves it is required.
- Route/component code splitting without breaking the strict asset budget.
- CSP hardening and dependency vulnerability review.
- Rate limiting for sensitive server operations.
- Backup/export verification.
- Disaster-recovery runbook and restore test.
- Database migration drift detection between repository and production Supabase.
- Production health diagnostics that expose status without leaking secrets.

## Phase 16 expansion — Final UX destruction

In addition to the existing torture pass, validate:
- first-time user onboarding;
- empty-workspace education without fake data;
- bulk action confirmation clarity;
- multi-workspace switching;
- long finance receipts and dense ledgers;
- document upload/OCR review on narrow phones;
- AI response/source presentation;
- team/permission denied states;
- accessibility of charts, finance tables and command surfaces.

## Phase 17 expansion — Release Candidate validation

- Fresh account bootstrap creates a usable workspace automatically.
- Existing account migration/bootstrap is verified.
- Real create/edit flows for company, contact, transaction, payment and document.
- At least one complete cross-domain journey on the deployed production-like target.
- Multi-user permission checks when team features exist.
- Supabase migration parity check against repository history.
- Real backup/export sample and restore rehearsal before release approval.

## Phase 18 expansion — Delivery and operations handoff

Final deliverables additionally include:
- administrator guide;
- permission/role matrix;
- finance reconciliation guide;
- workflow/automation template guide;
- document/OCR operating guide;
- AI safety/limitations guide;
- backup and disaster-recovery guide;
- deployment health checklist;
- data retention/export notes.

## Cross-cutting non-negotiable rules for all added features

1. No feature may create a second source of truth for an existing domain.
2. Every write must remain workspace-scoped and permission-checked.
3. Money remains exact; unsafe precision fails closed.
4. Sensitive destructive actions require confirmation and audit evidence.
5. Every real bug discovered while adding these capabilities receives a regression test.
6. Preview/test fixtures remain isolated from the live runtime.
7. New UI must use the frozen ENJAZ design system and token contracts.
8. Mobile/RTL/keyboard/safe-area behavior is mandatory, not polish.
9. No phase is unlocked merely because this amendment exists.
10. Final acceptance still requires the original Phase 18 release criteria plus the capabilities implemented from this amendment.

## Change-control declaration

- **What changes:** ENJAZ future capability scope is expanded with finance, team, workflow, search, document, notification, AI, import, offline/reliability and operational features.
- **Why:** the product is still under active development and the goal is to use the remaining roadmap window to increase real product value rather than freeze too early.
- **Affected contracts:** future Phases 7.2 through 18 only; closed Phase 0-6 contracts are not reopened except for regression fixes.
- **Feature parity/scope:** delivery scope expands; existing approved capability is never removed.
- **Tests/gates:** every added capability inherits phase-specific unit/service tests, destructive tests, real-browser coverage and cumulative regression requirements.
- **Migration/compatibility risk:** additions that change schema, RLS or server functions require repository migrations plus production parity verification before release.

This amendment is intentionally additive. It does not authorize out-of-order implementation.