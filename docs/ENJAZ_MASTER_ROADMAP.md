# ENJAZ Master Roadmap — Reconciled Governing Delivery Plan

> **Status:** Governing roadmap for ENJAZ from foundation through `ENJAZ 1.0 — Delivered`.
>
> **Rule:** No phase may be skipped, silently renamed, reordered, or declared complete from preview/mock evidence alone.
>
> **Source-of-truth hierarchy:**
> 1. `ENJAZ_NON_NEGOTIABLE_RULES.md`
> 2. `ENJAZ_PHASE0_MASTER_SPEC.md` and Phase 0 contracts
> 3. This roadmap
> 4. `docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`
> 5. `docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`
> 6. Phase/system-specific state, closure, and post-merge evidence
>
> **Scope amendments now incorporated:**
> - `docs/ENJAZ_CAPABILITY_EXPANSION_2026.json`
> - `docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json` — 18 major end-to-end systems M1–M18
> - Zero-Escape closure governance merged on canonical `main`

---

## 0. Delivery principles that never change

- ENJAZ is a clean rebuild with no R4/R6/V7/V8 UI/runtime DNA.
- PostgreSQL + Supabase RLS is the authoritative persistent boundary.
- Mobile-first, RTL-first, Android keyboard/back/safe-area behavior are first-class requirements.
- No critical business fact may be fabricated from partial/mock state.
- Every real bug fixed receives a permanent regression guard.
- Stability, data integrity, permissions, and reproducibility outrank delivery speed.
- Feature parity protects approved business capability, not legacy implementation.
- A phase cannot unlock its successor before its own closure and required post-merge recertification are complete.
- A major product system M1–M18 cannot be marked `CLOSED` merely because branch CI is green.

## 0.1 — Zero-Escape closure law for M1–M18

Every major system must remain `PLANNED`, `IN_PROGRESS`, or `CLOSURE_CANDIDATE` until all required evidence is complete:

1. authoritative schema/data contract;
2. authenticated ENJAZ cloud boundary;
3. fresh-user/fresh-workspace bootstrap where applicable;
4. real durable write → read → refresh round trip;
5. positive and negative RLS/permission matrix;
6. service/domain-layer ownership with no duplicate shadow implementation;
7. real Chromium/mobile journey on 1280/430/390/360/320;
8. keyboard/back/reload/deep-link/long Arabic/dense-state stress;
9. failure, offline, duplicate-submit, stale-state and conflict recovery;
10. audit/reconciliation evidence for sensitive writes;
11. zero known Critical, High, or functional blocker defects;
12. exact merged SHA deployed;
13. critical path verified against the deployed application;
14. post-merge recertification COMPLETE.

Any defect that escapes after closure is a **Gate Escape**: the affected system/phase must regain an open certification state, receive a regression test and stronger gate, then repeat the applicable Real Cloud + Real Browser + deployed-live evidence before being re-certified.

---

# Phase 0 — Product Freeze & Migration Contract ✅

## 0A — Product & Feature Extraction ✅
- Extract approved product capabilities and separate them from implementation baggage.

## 0B — Domain Consolidation ✅
- Freeze authoritative domain ownership across transactions, companies/people, finance, workflow/automation, documents, risk/intelligence, communication, reporting and integrations.

## 0C — Field-Level Contract & Freeze ✅
- Freeze field/use-case contracts, permission direction, migration mapping and non-negotiable architecture rules.

**Phase 0 exit:** verified and closed.

---

# Phase 1 — Engineering Foundation ✅

## 1.1 — Project Foundation ✅
- React + TypeScript + Vite foundation and strict project boundaries.

## 1.2 — Database Architecture ✅
- Supabase/Postgres schema, migrations, indexes and owner-safe relational model.

## 1.3 — Auth & Security ✅
- Registration/login/recovery/session/protected-route contracts.

## 1.4 — Data Layer ✅
- Typed repository/service boundaries and normalized failures.

## 1.5 — Foundation Destruction ✅
- Architecture/auth/data/security fail-safe validation.

**Phase 1 exit:** verified and closed.

---

# Phase 2 — ENJAZ Design System 1.0 ✅

## 2.1 — Visual Identity Foundation ✅
## 2.2 — Design Tokens ✅
## 2.3 — Typography & RTL System ✅
## 2.4 — Core Component System ✅
## 2.5 — Motion & Interaction System ✅
## 2.6 — Mobile & Android Hardening ✅
## 2.7 — Premium Pattern Library ✅
## 2.8 — Visual Destruction & Quality Gate ✅

The frozen design system covers tokens, typography, responsive/mobile behavior, interaction geometry, composite domain patterns, accessibility, reduced motion, long-content stress, dense states, layering and visual destruction.

**Phase 2 exit:** `ENJAZ Design System 1.0` frozen and green.

---

# Phase 3 — Application Shell & Navigation ✅

## 3.1 — App Shell ✅
## 3.2 — Navigation Architecture ✅
## 3.3 — Global Interaction Surfaces ✅
## 3.4 — Shell Destruction Gate ✅

Authenticated shell, top/bottom navigation, deep links, global surfaces, mobile safe areas, back/keyboard/rotation behavior and shell destruction are closed.

**Phase 3 exit:** verified and closed.

---

# Phase 4 — Home, Daily Work & Executive Overview ✅

## 4.1 — Home / Dashboard ✅
## 4.2 — Daily Work / Universal Inbox ✅
## 4.3 — Executive Briefing ✅
## 4.4 — Home Destruction Gate ✅

Authoritative home signals, daily work queue, executive briefing and destructive validation are closed with their dedicated evidence files.

**Phase 4 exit:** verified and closed.

---

# Phase 5 — Transactions Core ✅

## 5.1 — Transaction List & Search ✅
## 5.2 — Transaction Create/Edit ✅
## 5.3 — Transaction Details / 360° ✅
## 5.4 — Archive/Restore/Lifecycle ✅
## 5.5 — Transaction Destruction Gate ✅

Transaction search/list, validated create/edit, authoritative 360°, lifecycle, idempotency/conflict protection and destruction are closed and post-merge recertified.

**Phase 5 exit:** verified and closed.

---

# Phase 6 — Companies & People ✅

## 6.1 — Companies ✅
- Authoritative company CRUD/search/detail and relationships.

## 6.2 — Lawyers / Contacts ✅
- Authoritative people/contact/lawyer profiles and relations.

## 6.3 — Company / Lawyer 360° ✅
- Unified contextual read model without duplicate sources of truth.

## 6.4 — Companies & People Destruction Gate ✅
- Missing/invalid relations, duplicates, long names, mixed-language data, graph pressure and date corruption.

**Phase 6 exit:** closed and canonically recertified before Phase 7 began.

---

# Phase 7 — Finance

Phase 7 now owns both the original finance roadmap and the finance/commercial portions of the expanded major systems. No finance write path may bypass authoritative ledger/payment/reversal contracts.

## 7.1 — Financial Ledger & Summary ✅
- Authoritative read-only financial overview from transactions, payments, reversals, ledger entries, cashboxes and companies.
- Bigint-cents money boundary and fail-closed unsafe precision.
- Receivables, credit, balances, opening balance, ledger movement and integrity warnings.
- Certified implementation: 24/24 pre-merge workflows SUCCESS.
- Canonical merge `3d4043c8e5d6784f327ff8ac9879402b7d933422` independently recertified 9/9 on `main`, including deployed-application validation.

## 7.2 — Payments & Receipts ✅
- Real posted-payment creation with idempotency and duplicate-submit protection.
- Stable human/audit receipt references and immutable receipt snapshots.
- Safe reversal/correction; no destructive silent mutation.
- Exact reconciliation between payment, reversal, ledger and transaction/company balances.
- Real authenticated cloud payment → receipt → idempotent replay → reverse → reconcile journey passed.
- Controlled cashboxes and guarded finance command boundaries are active.
- **M16 — Engagements, Contracts & Retainers:** finance/commercial anchor completed without creating a second finance store; later M16 document, communication and reporting slices remain open in their assigned phases.
- Certified implementation head `da4800ddf4df2ecca49b01d1b40db0546fd70a13`: 26/26 pre-merge workflows SUCCESS, including Real Chromium at 1280/430/390/360/320.
- Canonical merge `192711cfcc36bf041ab0e576f8ab3899dc63b7a6`: 11/11 post-merge workflows SUCCESS with zero failure/queued/in-progress/cancelled.
- Pages run `34084227883` build/deploy SUCCESS; Live External run `34084261408` passed public deployment, HTTPS/HTML and **Attack the actual published application**.
- **Phase 7.2 — Payments & Receipts ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.

## 7.3 — Financial Intelligence
- Aging/receivables analysis, collection trends, cash movement, overpayment/credit visibility and anomaly signals.
- No shadow calculations outside authoritative finance services.
- **M13 — Business Intelligence & Forecasting Center:** finance forecasting inputs begin here and remain reconciled to source facts.

## 7.4 — Financial Reports
- Period/company/transaction/cashbox financial reports.
- Deterministic export/print/PDF totals and drill-down provenance.
- Contract/retainer reporting hooks for M16.

## 7.5 — Finance Destruction & Reconciliation Gate
- Huge values, sub-cent/unsafe inputs, reversals, repeated submit, network uncertainty, stale state, partial history and source-capacity pressure.
- Authoritative reconciliation proves no lost/duplicated money event.
- Real Cloud + Real Browser + deployed-live finance critical path required.

**Phase 7 exit:** only after 7.3–7.5 are green and all anchored finance/commercial capabilities have Zero-Escape evidence. Phase 8 remains locked until then.

---

# Phase 8 — Workflow, Automation & Operations

Phase 8 expands from workflow UI into the main operational operating system of ENJAZ.

## 8.1 — Workflow Engine & Government Procedure OS — M1
- Visual/stateful workflow templates, instances, stages, requirements and allowed transitions.
- **M1 Government Procedure Operating System:** authoritative procedure catalog, government entities/branches, required documents, fees, prerequisites, stage SLA and state history.
- Procedure instances attach to real transactions; no duplicated transaction state.

## 8.2 — Automation Engine
- Human-readable trigger/condition/action rules.
- Idempotency, replay protection, activation/deactivation and explicit failure state.
- Human approval gates for sensitive actions.

## 8.3 — Operations Center + Field Operations — M5
- Queues, workloads, blocked items, workflow/automation actions and operational health.
- **M5 ENJAZ Field Operations / Runner Mode:** field assignments, visits, check-in/out evidence, captured receipts/documents, offline-safe work and handoff to office staff.

## 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17
- **M6 Service Catalog, CRM & Commercial Intake:** leads/clients, service requests, quotations/intake, conversion into authoritative company/transaction work.
- **M17 Smart Intake Forms & Secure Submission Links:** external forms, scoped secure links, upload validation, expiry/revocation and reviewed conversion into internal records.

## 8.5 — Multi-Branch / Departments / Teams — M15 foundation
- Organization structure, branch/department/team membership and scoped operational ownership.
- Permission inheritance must remain explicit and RLS-verifiable.

## 8.6 — Global Command Center
- Cross-domain command surface for authorized operational actions.
- No hidden business logic in presentation components.

## 8.7 — Operations Zero-Escape Destruction Gate
- Repeated triggers, stale transitions, conflicting actors, large histories, field offline recovery, intake abuse, branch/team permission boundaries and automation failure isolation.
- M1/M5/M6/M17 and Phase-8 portion of M15 cannot close without their individual Zero-Escape evidence.

---

# Phase 9 — Risk, Governance & Intelligence

## 9.1 — Smart Risk Engine
- Explainable risk signals, urgency, anomaly and prioritization.

## 9.2 — Smart Saved Views & Cross-domain Search Intelligence
- Stable reusable query definitions and high-value cross-domain discovery.

## 9.3 — Corporate Governance & Ownership Engine — M2
- Shareholders/partners, ownership percentages, directors/authorized persons, beneficial-owner context, ownership transfers and historical control timeline.
- Validation prevents impossible ownership states and unauthorized governance changes.

## 9.4 — Regulatory / Knowledge Base Engine — M8 foundation
- Structured laws, regulations, circulars, procedural knowledge and source/version metadata.
- Knowledge facts remain distinct from AI-generated interpretation.

## 9.5 — Business Intelligence & Forecasting Center — M13
- Operational/financial KPI models, trends, capacity and forecast surfaces with source provenance.

## 9.6 — Process Mining & Predictive Operations — M18
- Derive actual process paths from authoritative histories.
- Detect bottlenecks, rework and delay patterns; prediction must expose confidence and evidence.

## 9.7 — Intelligence Zero-Escape Gate
- Conflicting/stale signals, no-data states, high-volume datasets, invalid ownership, model drift and prediction uncertainty.
- M2/M8/M13/M18 require individual closure evidence.

---

# Phase 10 — Documents, Vault, OCR & Reports

## 10.1 — Document Vault
- Metadata-first document model, safe binary handling, ownership and entity relationships.

## 10.2 — Document Intelligence / OCR
- Explicit extraction/review/verification flow; source file remains authoritative.

## 10.3 — Document Factory & Official Form Engine — M7
- Template/version management, approved merge fields and deterministic generation of official requests, letters, decisions and submission packs.
- Generated documents retain provenance to source entities/data and template version.

## 10.4 — Reports & PDF
- Professional reports, deterministic pagination/footer/signature/QR/barcode handling and no blank/overflow-corrupt output.

## 10.5 — Engagement/Contract Document Layer — M16
- Contract/retainer documents, revisions, signatures/status/effective dates and links to clients/services/finance.

## 10.6 — Documents Zero-Escape Gate
- Missing/oversized/corrupt files, broken metadata, OCR failure, malicious uploads, long reports, multi-page overflow, offline upload/retry and unauthorized access.
- M7 and document portion of M16 require deployed-live evidence.

---

# Phase 11 — Notifications, Follow-ups, Client & Communications

## 11.1 — Notifications & Follow-ups
- Authoritative event-driven notifications, read/unread, scheduling, completion, snooze/cancel and lifecycle integrity.

## 11.2 — Universal Inbox Integration
- Consolidated actionable work without duplicating underlying records.

## 11.3 — Client Portal — M3
- External client authentication/secure access to permitted companies, transactions, statuses, requests, documents, approvals and financial/receipt facts.
- Strict tenant/object scope; no internal-only data leakage.

## 11.4 — Omnichannel Communications Hub — M4
- Conversation/event model for supported email/SMS/WhatsApp-style integrations where configured.
- Link communication to authoritative entities, preserve consent/audit/delivery state and avoid duplicate message facts.

## 11.5 — Scheduling, Appointments & Deadline Engine — M10
- Appointments, deadlines, reminders, calendar views, conflicts, escalation and timezone-safe behavior.

## 11.6 — Smart Intake & Contract Communication — M17 + M16
- Secure submission follow-up, client approvals, contract/retainer renewal reminders and communication evidence.

## 11.7 — Communication Zero-Escape Gate
- Large counts, stale targets, duplicate events, revoked links, unauthorized portal access, delivery failure, timezone boundaries and archived relations.
- M3/M4/M10 and Phase-11 portions of M16/M17 require individual evidence.

---

# Phase 12 — ENJAZ AI & Knowledge Agent

AI is allowed only after authoritative business domains and permission boundaries are stable.

## 12.1 — Copilot Foundation
- Tool/data boundaries, workspace/permission enforcement, structured outputs, rate limiting, tracing and provider failure isolation.

## 12.2 — Contextual Assistance
- Search, summarize, compare, draft and explain authoritative ENJAZ information with citations/provenance where applicable.

## 12.3 — Agentic ENJAZ Copilot — M9
- Plan multi-step work and propose actions across ENJAZ tools.
- Sensitive mutations require explicit user approval and domain-service validation.
- Agent cannot bypass RLS, workflow/legal transitions, finance rules or document approval state.

## 12.4 — Regulatory Knowledge Assistance — M8
- Retrieve/version regulatory sources and distinguish source text, structured facts and AI interpretation.

## 12.5 — AI Zero-Escape & Safety Gate
- Hallucination/missing-data resistance, prompt injection, permission attacks, malicious documents, structured-output regression, tool approval and provider outage recovery.
- M9/M8 AI portions require real authorized/unauthorized journeys.

---

# Phase 13 — Legacy Import & Reconciliation

## 13.1 — Read-only Legacy Snapshot Intake
## 13.2 — Normalize & Map
## 13.3 — Ordered Import
## 13.4 — Reconciliation
## 13.5 — Import Destruction Gate

Import may target the expanded model only where explicit mappings exist. Unknown legacy concepts remain quarantined/reviewable instead of being guessed into M1–M18 structures. Counts, orphan relations, money, workflow state, ownership, documents and duplicate/idempotency behavior must reconcile.

---

# Phase 14 — Full-system Integration, API & Real E2E

## 14.1 — Cross-domain Journeys
- Company → transaction → procedure/workflow → field/office work → follow-up → payment/receipt → document/report → client visibility → archive/restore.
- Ownership/governance and contract/retainer journeys where applicable.

## 14.2 — Integration Platform / API / Webhooks — M11
- Versioned integration API, scoped credentials/tokens, webhook subscriptions, signing/replay protection, idempotency, delivery history and retry/dead-letter behavior.

## 14.3 — Auth/Session/Cloud Failure Journeys
- Expiry, offline/online recovery, failed/unknown writes, stale conflict and recovery.

## 14.4 — Mobile Real-device Journeys
- Android keyboard/back/rotation/safe-area/long forms/overlays/navigation.

## 14.5 — Integration Exit Gate
- No critical path depends only on mocks.
- M11 API/webhook contract receives positive/negative permission and replay/destruction evidence.

---

# Phase 15 — Performance, Security, Reliability & Enterprise Controls

## 15.1 — Performance
- Bundle/code splitting, large-list/data performance, interaction/render latency and expensive cross-domain queries.

## 15.2 — Security
- RLS/session/XSS/CSP/file ownership/sensitive-action review across all implemented systems.

## 15.3 — Reliability
- Network/Supabase/integration failures, conflicts, repeated actions and recovery.

## 15.4 — Compliance, Audit & Evidence Center — M12
- Immutable/append-safe audit evidence, actor/action/object/result provenance, sensitive-operation review and exportable evidence packages.

## 15.5 — Backup, Restore & Workspace Portability — M14
- Verified export/backup, restore into controlled target, integrity checks, schema/version compatibility and disaster-recovery drills.

## 15.6 — Multi-Branch Enterprise Hardening — M15
- Branch/department/team boundaries, cross-branch roles, reporting scope and RLS matrices under real multi-user conditions.

## 15.7 — BI / Process Intelligence Hardening — M13 + M18
- Performance, explainability, source reconciliation and model/forecast drift protections.

## 15.8 — Integration Platform Hardening — M11
- Rate limits, credential rotation, webhook replay/ordering/retry and external dependency isolation.

## 15.9 — Enterprise Zero-Escape Hardening Gate
- Real TypeScript/build/tests/destruction/security/performance plus deployed critical paths.
- M11/M12/M13/M14/M15/M18 cannot be declared closed without their system closure evidence.

---

# Phase 16 — Final Visual & UX Destruction

This is a product-wide torture pass over **every implemented screen and all M1–M18 surfaces**:

- 1280/430/390/360/320 and representative real Android device behavior;
- long Arabic/Latin content, huge values, empty/dense states;
- keyboard/back/rotation/safe areas;
- offline/error/conflict/loading/recovery;
- reduced motion, focus/accessibility, touch targets;
- hierarchy, typography, contrast, layering and no legacy DNA;
- client portal, field mode, documents, AI, finance, command center and enterprise surfaces receive equal scrutiny.

**Exit:** UI/UX freeze for Release Candidate only after no Critical/High UX blocker remains.

---

# Phase 17 — Release Candidate & Production Validation

## 17.1 — RC Build
- Clean reproducible production build from exact RC commit.

## 17.2 — Fresh-install / Fresh-session Validation
- New and existing users, password recovery, fresh workspace bootstrap, cloud retrieval and clean-cache/device scenarios.

## 17.3 — Production Validation
- Intended Supabase project/config, routing/deployment, PWA/mobile behavior and exact deployed SHA.
- Execute representative critical paths across Finance, Operations, Documents, Communication, AI and enterprise controls.

## 17.4 — Major Systems Closure Matrix
- Every M1–M18 status must be explicit.
- Any system required for v1.0 must have Zero-Escape closure evidence and post-merge/deployed-live recertification.

## 17.5 — RC Gate
- Full automated + real E2E + real-device critical-path matrix green.
- Zero Critical/High/functional blockers.

---

# Phase 18 — Final Delivery & Handoff

## 18.1 — Final Release Freeze
- Tag/freeze exact approved commit, schema/migration state and build hash.

## 18.2 — Final Deliverables
- Source, production artifact, migrations/schema docs, configuration guide, operational notes, test/gate report and accepted limitations only.

## 18.3 — Backup / Restore / Portability Acceptance — M14
- Final disaster-recovery and workspace portability proof is part of handoff, not optional documentation.

## 18.4 — Deployment Verification
- Deployed application must match frozen release and pass login/core data/transaction/company/finance/procedure/document/client/integration critical paths.

## 18.5 — Final Acceptance
The project is delivered only when:
- all v1.0 roadmap phases are complete;
- all required M1–M18 systems are closed under Zero-Escape evidence;
- final production deployment is verified;
- no Critical/High known defect remains;
- data integrity/reconciliation and backup/restore are proven;
- build and documentation are reproducible;
- no dependency on legacy UI/runtime architecture exists.

**Final state:** `ENJAZ 1.0 — Delivered`.

---

# Current position — canonical reconciled state

- Phase 0 ✅
- Phase 1 ✅
- Phase 2.1–2.8 ✅
- **Phase 2 — ENJAZ Design System 1.0 ✅**
- Phase 3.1–3.4 ✅
- **Phase 3 — Application Shell & Navigation ✅**
- Phase 4.1–4.4 ✅
- **Phase 4 — Home, Daily Work & Executive Overview ✅**
- Phase 5.1–5.5 ✅
- **Phase 5 — Transactions Core ✅**
- Phase 6.1 ✅
- Phase 6.2 ✅
- Phase 6.3 ✅
- Phase 6.4 ✅
- **Phase 6 — Companies & People ✅**
- **Phase 7.1 — Financial Ledger & Summary ✅ CLOSED + post-merge recertified**
- **Phase 7.2 — Payments & Receipts ✅ CLOSED + post-merge recertified**
- **M16 finance/commercial anchor ✅ COMPLETE; M16 overall remains open for later assigned slices**
- **18 major systems M1–M18: GOVERNING SCOPE; overall system closure still requires each system's full Zero-Escape evidence**
- **Next: Phase 7.3 — Financial Intelligence**

Phase 7.3 is the only newly authorized implementation stage. Adding the 18 systems expanded delivery scope but did **not** silently reorder phases or retroactively reopen closed phases. Phase 8 remains locked until Phase 7 completes.

---

# Major-system anchor matrix

| System | Name | Governing anchor phases |
| --- | --- | --- |
| M1 | Government Procedure Operating System | 8 |
| M2 | Corporate Governance & Ownership Engine | 9 |
| M3 | Client Portal | 11 |
| M4 | Omnichannel Communications Hub | 11 |
| M5 | ENJAZ Field Operations / Runner Mode | 8 |
| M6 | Service Catalog, CRM & Commercial Intake | 8 |
| M7 | Document Factory & Official Form Engine | 10 |
| M8 | Regulatory / Knowledge Base Engine | 9, 12 |
| M9 | Agentic ENJAZ Copilot | 12 |
| M10 | Scheduling, Appointments & Deadline Engine | 11 |
| M11 | Integration Platform / API / Webhooks | 14, 15 |
| M12 | Compliance, Audit & Evidence Center | 15 |
| M13 | Business Intelligence & Forecasting Center | 7, 9, 15 |
| M14 | Backup, Restore & Workspace Portability | 15, 18 |
| M15 | Multi-Branch, Departments & Team Operating Model | 8, 15 |
| M16 | Engagements, Contracts & Retainers | 7, 10, 11 |
| M17 | Smart Intake Forms & Secure Submission Links | 8, 11 |
| M18 | Process Mining & Predictive Operations | 9, 15 |

The machine-readable authority remains `docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`; this table makes that scope visible inside the Master Roadmap.

---

# Change-control rule

This file is intentionally difficult to change by accident.

This reconciliation makes five explicit changes:

1. preserves the already-proven Phase 7.1 canonical post-merge recertification and its historical authorization of 7.2;
2. records Phase 7.2 canonical closure/post-merge recertification and advances the next pointer to 7.3;
3. incorporates the 18 major product systems M1–M18 into their governing future phases rather than leaving them as detached amendments;
4. makes Zero-Escape closure mandatory across every major system and future phase exit where that system is anchored;
5. preserves the prior correction that replaced the stale Current Position which incorrectly pointed to Phase 6.1.

It does **not** silently reopen Phases 0–6, falsely mark M16 fully closed from its Phase-7 finance anchor, mark any other M1–M18 system implemented, or authorize work beyond Phase 7.3.

Any future roadmap change must state:
1. what changes;
2. why it changes;
3. which phase/system contract is affected;
4. whether delivery scope changes;
5. which tests/gates must change;
6. migration/compatibility/security risk;
7. whether Zero-Escape closure evidence requirements change (default: they may only become stricter, never weaker).

Silently skipping a phase, weakening a gate, marking a planned system complete without evidence, or starting a later phase before predecessor recertification is a roadmap violation.
