# ENJAZ Master Roadmap — Frozen Delivery Plan

> **Status:** Governing roadmap for ENJAZ from foundation through final handoff.
>
> **Rule:** No phase may be skipped, silently renamed, or reordered. Any future change to this roadmap must be explicit, documented, and reviewed before implementation.
>
> **Source-of-truth hierarchy:**
> 1. `ENJAZ_NON_NEGOTIABLE_RULES.md`
> 2. `ENJAZ_PHASE0_MASTER_SPEC.md` and Phase 0 contracts
> 3. This roadmap
> 4. Phase-specific implementation documents

---

## 0. Delivery principles that never change

ENJAZ is a clean rebuild, not a continuation of the legacy UI generations.

- No R4/R6/V7/V8 UI/CSS/DOM contracts or legacy visual DNA.
- One design system and one architecture.
- PostgreSQL + Supabase RLS is the primary persistent data model; local state is not the database.
- Mobile-first, RTL-first, Android keyboard/back/safe-area behavior are first-class requirements.
- No structural fixes based on `!important`, arbitrary z-index escalation, or duplicated global state.
- No phase passes on smoke tests alone. Behavior, integration, destructive/regression, and production-build gates are mandatory where applicable.
- Every real bug fixed must receive a regression test.
- Stability and data integrity outrank speed of feature delivery.
- Feature parity means preserving approved capabilities and business facts, not copying legacy implementation or visual structure.
- No transition to the next phase before the current phase Release Gate is green.

---

# Phase 0 — Product Freeze & Migration Contract ✅

## 0A — Product & Feature Extraction ✅
- Extract the real product capabilities from MOAQIB.
- Separate essential business capabilities from historical implementation baggage.
- Establish ENJAZ as an independent product.

## 0B — Domain Consolidation ✅
- Define authoritative domains and eliminate duplicated implementations.
- Consolidate transactions, companies, contacts/lawyers, finance, workflows, automation, documents, risk, intelligence, and reporting boundaries.

## 0C — Field-Level Contract & Freeze ✅
- Freeze field-level contracts.
- Freeze use-case contracts.
- Freeze permission/RLS direction.
- Freeze selective legacy import mapping and reconciliation rules.
- Establish non-negotiable architecture and UI rules.

**Phase 0 exit:** a stable specification exists before application construction begins.

---

# Phase 1 — Engineering Foundation ✅

## 1.1 — Project Foundation ✅
- React + TypeScript + Vite application foundation.
- Strict project structure and routing baseline.
- Core error boundaries and configuration boundaries.

## 1.2 — Database Architecture ✅
- Relational Supabase/Postgres schema foundation.
- Core entity relations and migration discipline.
- Owner-safe data model ready for RLS.

## 1.3 — Auth & Security ✅
- Registration, login, password recovery/update, protected routes, session handling.
- Security contracts and owner-only access baseline.

## 1.4 — Data Layer ✅
- Repository/service boundaries.
- Typed data access.
- Error normalization and durable data contracts.

## 1.5 — Foundation Destruction ✅
- Destructive checks of the engineering foundation.
- Validate that architecture, auth, data, and security fail safely.
- No hidden dependency on legacy runtime assumptions.

**Phase 1 exit:** the application can safely authenticate, persist, retrieve, and protect data before visual product construction begins.

---

# Phase 2 — ENJAZ Design System 1.0 ✅

## 2.1 — Visual Identity Foundation ✅
- Establish the new ENJAZ visual identity with no legacy DNA.
- Premium, modern, high-clarity direction inspired by the precision/elegance targets agreed for the product.
- Define the visual grammar before screens.

## 2.2 — Design Tokens ✅
- Color, surface, border, radius, spacing, shadow, elevation, sizing, focus, state, and semantic token systems.
- Components must consume tokens instead of arbitrary visual literals.

## 2.3 — Typography & RTL System ✅
- Premium Arabic typography hierarchy.
- RTL layout contracts.
- Numeric/Latin handling and readable information density.

## 2.4 — Core Component System ✅
- Buttons, fields, cards, badges, status elements, overlays, sheets, menus, navigation primitives, feedback primitives, and accessibility contracts.
- Components remain domain-neutral at this phase.

## 2.5 — Motion & Interaction System ✅
- Motion language, transitions, press/hover/focus feedback, skeleton/success feedback.
- `prefers-reduced-motion` respected.
- The app must feel alive without ornamental or distracting animation.

## 2.6 — Mobile & Android Hardening ✅
- Safe Areas.
- Dynamic/visual viewport behavior.
- Android keyboard behavior.
- Rotation and back-gesture resilience.
- Touch targets at or above the agreed minimum.
- Prevent keyboard obstruction of fields/actions.
- Test across different phone viewport sizes.

## 2.7 — Premium Pattern Library ✅

Build reusable **ENJAZ-specific composite patterns** before building full screens.

Required pattern families include:
- Transaction cards and transaction-state summaries.
- Company cards and relationship summaries.
- Lawyer/contact cards where applicable.
- Financial summary and payment/receivable patterns.
- Risk-state and urgency patterns.
- Timeline/activity history.
- Follow-up patterns.
- Command Center cards/modules.
- Workflow and automation summaries.
- Search result patterns.
- Action menus and contextual actions.
- Empty states.
- Loading/skeleton states.
- Success, warning, error, conflict, offline, and recovery messages.
- Dense and compact mobile variants where required.

**Constraint:** these are composable patterns, **not complete product screens**.

**2.7 exit:** ENJAZ has a domain-aware pattern library that can build real screens without inventing UI ad hoc.

## 2.8 — Visual Destruction & Quality Gate ✅

Deliberately break the design system and pattern library before screen construction.

Required torture scenarios include:
- Extremely long text, including company names around 200 characters.
- Very large financial values and unusual number lengths.
- High notification counts.
- Keyboard open over constrained mobile layouts.
- Narrow phone screens.
- Rotation.
- Browser/app zoom stress where relevant.
- Dark/light contrast behavior if both modes are supported at that point.
- Offline/error/conflict states.
- Long timelines and dense lists.
- Overflow and wrapping abuse.
- Long Arabic + Latin mixed text.
- Reduced-motion behavior.
- Accessibility/focus traversal.
- Token-only visual contract checks.
- Audits preventing arbitrary colors, tiny fonts, uncontrolled z-index, `!important`, and visual values outside tokens.

**Phase 2 exit:** `ENJAZ Design System 1.0` is frozen and green. Product shell/screens may now begin under Phase 3 while continuing to obey the frozen system.

---

# Phase 3 — Application Shell & Navigation ⏭ CURRENT NEXT PHASE

Phase 3 begins only after 2.8 is green. **That prerequisite is now satisfied.**

## 3.1 — App Shell
- Build the authenticated application frame.
- Top Bar.
- Bottom Navigation optimized for mobile.
- Page container and safe-area integration.
- Global loading/offline/error surfaces.
- App-level responsive structure.

## 3.2 — Navigation Architecture
- Final route map for product domains.
- Section transitions and back behavior.
- Deep-link-safe routing.
- Active navigation state.
- Navigation permissions/availability contracts.

## 3.3 — Global Interaction Surfaces
- Global search entry point.
- Notification/inbox entry point.
- Global create/quick-action entry point where justified.
- Command/operations entry point without duplicating domain logic.

## 3.4 — Shell Destruction Gate
- Keyboard/back/rotation/navigation torture.
- Route refresh/deep-link tests.
- Session expiry during navigation.
- Offline shell behavior.
- Small-screen and long-label stress.

**Phase 3 exit:** a production-grade shell exists, but business screens are still built domain-by-domain afterward.

---

# Phase 4 — Home, Daily Work & Executive Overview

## 4.1 — Home / Dashboard
- Build the actual ENJAZ home screen using Phase 2 patterns.
- Priorities, pending work, urgent items, financial snapshot, and meaningful operational signals.
- No decorative metrics without business value.

## 4.2 — Daily Work / Universal Inbox
- Consolidated work queue.
- Follow-ups, overdue work, approvals/action-needed items, and task-like operational signals.
- Clear ownership and state.

## 4.3 — Executive Briefing
- Concise operational summary.
- Risks, blockers, important financial changes, and workload signals.

## 4.4 — Home Destruction Gate
- Empty/huge/dense datasets.
- Conflicting urgency states.
- Slow/offline backend behavior.
- Responsive and interaction torture.

---

# Phase 5 — Transactions Core

## 5.1 — Transaction List & Search
- Current, stalled/delayed, archived/closed views according to the frozen business contract.
- Filters, sorting, search, saved views integration points.

## 5.2 — Transaction Create/Edit
- Validated forms.
- Company/contact relations.
- Dates, state, workflow/station assignment, notes, and required business fields.

## 5.3 — Transaction Details / 360°
- Full transaction context.
- Timeline/activity.
- Notes/follow-ups.
- Financial relation.
- Documents.
- Workflow and risk indicators.

## 5.4 — Archive/Restore/Lifecycle
- Safe lifecycle actions.
- Archived items must not continue producing active follow-ups unless explicitly restored/reactivated by business rules.

## 5.5 — Transaction Destruction Gate
- Large lists, malformed relations, conflicting edits, offline failures, repeated actions, destructive regression tests.

---

# Phase 6 — Companies & People

## 6.1 — Companies
- Company list, search, filters, create/edit, and full details.
- Related transactions, documents, finance, contacts, activity, and risk.

## 6.2 — Lawyers / Contacts
- Contact/lawyer list and profiles.
- Relationship to companies/transactions.
- Relevant operational and financial context.

## 6.3 — Company / Lawyer 360°
- Unified contextual view without duplicating source-of-truth data.

## 6.4 — Companies & People Destruction Gate
- Missing relations, duplicates, huge names, mixed-language data, large relation graphs, invalid legacy mappings.

---

# Phase 7 — Finance

## 7.1 — Financial Ledger & Summary
- Authoritative financial overview.
- Payments, receivables, balances, and transaction/company associations.

## 7.2 — Payments & Receipts
- Stable receipt references.
- Safe reversal/correction model rather than destructive silent mutation.
- Correct exclusion of reversed payments from totals.

## 7.3 — Financial Intelligence
- Useful trends and summaries without creating a second finance implementation.

## 7.4 — Financial Reports
- Accurate totals and period views.
- Export/print contracts connected to the reporting phase.

## 7.5 — Finance Destruction & Reconciliation Gate
- Large money values.
- Decimal/rounding cases.
- Reversals.
- Duplicate submission protection.
- Reconciliation against source facts.

---

# Phase 8 — Workflow, Automation & Operations

## 8.1 — Workflow Engine UI
- Workflow templates and execution state.
- Stage progression.
- Clear active/completed/upcoming states.

## 8.2 — Automation Engine UI
- Rule/template management around the frozen automation engine contract.
- Human-readable trigger/action presentation.
- Safe activation/deactivation.

## 8.3 — Operations Center
- Operational control surface that composes workflow, automation, queues, risk, and action modules.

## 8.4 — Global Command Center
- High-level command surface for cross-domain actions and visibility.
- No duplicate business logic hidden in the UI.

## 8.5 — Operations Destruction Gate
- Repeated triggers, stale state, conflicting transitions, long workflow histories, failure isolation.

---

# Phase 9 — Risk, Saved Views & Intelligence

## 9.1 — Smart Risk Engine UI
- Risk signals and explanations.
- Prioritization without opaque visual noise.

## 9.2 — Smart Saved Views
- Reusable filtered views across supported domains.
- Stable query definitions.

## 9.3 — Cross-domain Insights
- Compose authoritative data from transactions, companies, finance, workflows, and follow-ups.
- No shadow database and no duplicated calculations.

## 9.4 — Intelligence Destruction Gate
- Conflicting signals, stale data, no-data states, high-volume datasets, deterministic regression checks.

---

# Phase 10 — Documents, Vault, OCR & Reports

## 10.1 — Document Vault
- Metadata-first document model.
- Safe binary handling and ownership checks.
- Entity relationships.

## 10.2 — Document Intelligence / OCR
- OCR/intelligence only through explicit, reviewable flows.
- Source document remains authoritative.
- Extracted information must be distinguishable from verified information.

## 10.3 — Reports & PDF
- Professional reports for the approved domains.
- Page-break, overflow, signature/footer, and barcode/QR handling must be deterministic.
- No blank PDFs or last-page layout corruption.

## 10.4 — Documents/Reports Destruction Gate
- Missing files, oversized files, broken metadata, long reports, multi-page overflow, unavailable OCR, offline states.

---

# Phase 11 — Notifications, Follow-ups & Communication Surfaces

## 11.1 — Notifications
- Meaningful product notifications tied to authoritative events.
- Read/unread state and navigation target integrity.

## 11.2 — Follow-ups
- Create, schedule/state, complete, dismiss/cancel according to frozen business rules.
- Archived/closed objects must respect lifecycle rules.

## 11.3 — Universal Inbox Integration
- Merge notifications/follow-ups/action-needed items without duplicating records.

## 11.4 — Notification/Follow-up Destruction Gate
- Large counts, stale targets, duplicate events, archived relations, offline delivery/read-state issues.

---

# Phase 12 — ENJAZ AI Copilot

AI is integrated only after authoritative business screens and data flows are stable.

## 12.1 — Copilot Foundation
- Explicit tool/data boundaries.
- Owner-checked data access.
- Structured output contracts.
- Rate limiting and failure isolation.

## 12.2 — Contextual Assistance
- Assist with finding, summarizing, drafting, and explaining ENJAZ data/actions.
- Never silently mutate critical business/financial data.

## 12.3 — AI Destruction & Safety Gate
- Hallucination resistance around missing data.
- Permission tests.
- Prompt-injection/data-boundary tests where applicable.
- Structured-output regression tests.
- Graceful degradation when an AI provider is unavailable.

---

# Phase 13 — Legacy Import & Reconciliation

Legacy import occurs only into the stable ENJAZ model.

## 13.1 — Read-only Legacy Snapshot Intake
- Parse old backup/snapshot without executing old UI/runtime code.

## 13.2 — Normalize & Map
- Normalize legacy identifiers, dates, money, and relations.
- Create `legacy_id -> enjaz_uuid` mapping.

## 13.3 — Ordered Import
- Contacts/people.
- Companies.
- Transactions.
- Stations/notes/follow-ups/activity.
- Payments while preserving status, receipt references, and reversals.
- Document metadata before binaries.
- Selectively map approved R6/V7 extensions only.

## 13.4 — Reconciliation
- Counts.
- Missing/skipped/recalculated items.
- Orphan relations.
- Financial totals.
- Workflow state reconciliation.
- Audit event for imported groups.

## 13.5 — Import Destruction Gate
- Corrupt snapshots.
- Partial data.
- Duplicate legacy IDs.
- Referential breaks.
- Money mismatch.
- Repeat/import-idempotency behavior.

---

# Phase 14 — Full-system Integration & Real E2E

## 14.1 — Cross-domain Journeys
Examples:
- Create company → create transaction → attach workflow → add follow-up → receive payment → generate report → archive/restore.
- Search → open 360° → execute allowed action → verify timeline/audit.

## 14.2 — Auth/Session/Cloud Failure Journeys
- Expired sessions.
- Offline/online recovery.
- Failed writes.
- Conflicts.
- Retry behavior.

## 14.3 — Mobile Real-device Journeys
- Android keyboard.
- Back gesture/button.
- Rotation.
- Safe areas.
- Long forms.
- Bottom navigation.
- Overlays and sheets.

## 14.4 — Integration Exit Gate
- No critical path relies only on mocked behavior.
- Every discovered real defect gets a regression test.

---

# Phase 15 — Performance, Security & Reliability Hardening

## 15.1 — Performance
- Bundle analysis.
- Route/component loading discipline.
- Large-list performance.
- Rendering and interaction latency.

## 15.2 — Security
- RLS verification.
- Auth/session boundaries.
- Injection/XSS/CSP review.
- File access ownership.
- Sensitive operation checks.

## 15.3 — Reliability
- Network failures.
- Supabase errors.
- Conflict handling.
- repeated/duplicate actions.
- Recovery paths.

## 15.4 — Hardening Gate
- Real TypeScript check.
- Production build.
- Automated test suites.
- Destructive regression suite.
- No known critical/high-severity defect accepted into release candidate.

---

# Phase 16 — Final Visual & UX Destruction

This is not a cosmetic review. It is a product-wide torture pass.

- Every screen on narrow and typical phone sizes.
- Long Arabic content.
- Huge monetary values.
- Empty and extremely dense states.
- 20+ notification/action counts.
- Open keyboard.
- Rotation.
- Offline/error/conflict.
- Reduced motion.
- Focus/accessibility.
- Visual hierarchy and contrast.
- Typography consistency.
- Icon size/clarity.
- No cheap flat rectangles, uncontrolled glare, clipped bars, hidden labels, or legacy styling remnants.
- No screen or component may bypass ENJAZ Design System 1.0 without an explicit documented exception.

**Exit:** UI/UX freeze for Release Candidate.

---

# Phase 17 — Release Candidate & Production Validation

## 17.1 — RC Build
- Clean production build from the release candidate commit.
- No dev/test-only payload in production output beyond intentionally retained diagnostics.

## 17.2 — Fresh-install / Fresh-session Validation
- New user flow.
- Existing user flow.
- Password recovery.
- Cloud data retrieval.
- Clean cache/device scenario.

## 17.3 — Production-like Validation
- Verify environment configuration.
- Verify Supabase integration against intended production project/configuration.
- Verify routing/deployment fallback.
- Verify PWA/mobile web behavior if enabled.

## 17.4 — RC Gate
- Full automated gate green.
- Full E2E gate green.
- Manual/real-device critical-path checklist green.
- No critical/high unresolved defect.

---

# Phase 18 — Final Delivery & Handoff

## 18.1 — Final Release Freeze
- Tag/freeze the final approved commit.
- Record app version, schema version, migration state, and build hash.

## 18.2 — Final Deliverables
- Production-ready source repository.
- Production build artifact.
- Database migrations/schema documentation.
- Environment/configuration guide without exposing secrets.
- Backup/export/import guide.
- User-critical operational notes.
- Test/quality-gate report.
- Known limitations only if explicitly accepted before release.

## 18.3 — Deployment Verification
- Verify the deployed application matches the frozen release commit/build.
- Verify login, core data access, critical transaction/company/finance flows, reports, navigation, and mobile behavior on the deployed target.

## 18.4 — Final Acceptance
The project is considered delivered only when:
- All roadmap phases required for v1.0 are complete.
- The final Release Gate is green.
- The production deployment is verified.
- No critical/high-severity known defect remains.
- Core approved feature inventory is present.
- Data integrity/reconciliation is proven.
- ENJAZ has no dependency on legacy UI/runtime architecture.
- The final build and documentation are reproducible from the repository.

**Final state:** `ENJAZ 1.0 — Delivered`.

---

# Current position

- Phase 0 ✅
- Phase 1 ✅
- Phase 2.1 ✅
- Phase 2.2 ✅
- Phase 2.3 ✅
- Phase 2.4 ✅
- Phase 2.5 ✅
- Phase 2.6 ✅
- Phase 2.7 ✅
- Phase 2.8 ✅
- **Next: Phase 3 — Application Shell & Navigation**

---

# Change-control rule

This file is intentionally difficult to change by accident.

A roadmap change must state:
1. what changes,
2. why it changes,
3. which existing phase/contract is affected,
4. whether feature parity or delivery scope changes,
5. which tests/gates must change,
6. whether the change creates migration or compatibility risk.

Silently skipping a phase, renaming it in conversation, or starting a later phase before its predecessor passes is a roadmap violation.
