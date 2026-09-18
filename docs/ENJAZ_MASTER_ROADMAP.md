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
> - Phase 9.4 M8, Phase 9.5 M13 and Phase 9.6 M18 Phase-9 anchors are formally closed with exact-main, Real Browser, Real Cloud where applicable, Pages and deployed-live certification
> - Phase 9.7 Intelligence Zero-Escape is formally closed against merged implementation `e8992650afb7bd3bd5c47770d0b2d752cdd0488e`; M2 is globally `CLOSED` under `ZERO_ESCAPE_V1`, while M8/M13/M18 remain `ACTIVE` for later governing anchors
> - **Phase 12.5 — AI Zero-Escape & Safety Gate is CLOSED; M8 + M9 are CLOSED under ZERO_ESCAPE_V1; Phase 13.1 is AUTHORIZED_NEXT.**

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
- Regulatory or knowledge AI output cannot be promoted into authoritative legal truth without a verified official source/version/provenance boundary.

## 0.1 — Zero-Escape closure law for M1–M18

Every major system must remain `PLANNED`, `ACTIVE`, `IN_PROGRESS`, or `CLOSURE_CANDIDATE` until all required evidence is complete:

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

# Phase 7 — Finance ✅

Phase 7 owns the authoritative finance roadmap and finance/commercial portions of expanded major systems. No finance write path may bypass authoritative ledger/payment/reversal contracts.

## 7.1 — Financial Ledger & Summary ✅
- Authoritative read-only financial overview from transactions, payments, reversals, ledger entries, cashboxes and companies.
- Bigint-cents money boundary and fail-closed unsafe precision.
- Receivables, credit, balances, opening balance, ledger movement and integrity warnings.
- Certified implementation and canonical post-merge recertification are preserved by phase-specific evidence.

## 7.2 — Payments & Receipts ✅
- Real posted-payment creation with idempotency and duplicate-submit protection.
- Stable human/audit receipt references and immutable receipt snapshots.
- Safe reversal/correction; no destructive silent mutation.
- Exact reconciliation between payment, reversal, ledger and transaction/company balances.
- **Phase 7.2 — Payments & Receipts ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.

## 7.3 — Financial Intelligence ✅
- Aging/receivables analysis, collection trends, cash movement, overpayment/credit visibility and anomaly signals.
- No shadow calculations outside authoritative finance services.
- **M13 — Business Intelligence & Forecasting Center:** finance forecasting inputs begin here and remain reconciled to source facts.
- **Phase 7.3 — Financial Intelligence ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.

## 7.4 — Financial Reports ✅
- Period/company/transaction/cashbox financial reports over authoritative finance facts.
- Deterministic export/print/PDF totals and direct drill-down provenance from the same report snapshot.
- Reversed movements remain visible but contribute zero effective movement; unsafe money/date shapes fail closed.
- **Phase 7.4 — Financial Reports ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.

## 7.5 — Finance Destruction & Reconciliation Gate ✅
- Huge values, reversals, repeated submit, network uncertainty, stale state, partial history and source-capacity pressure are destructively exercised.
- Authoritative reconciliation proves no lost/duplicated money event.
- **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + post-merge recertified** under Zero-Escape evidence.

**Phase 7 exit:** satisfied under Zero-Escape. Historical transition to Phase 8 is closed and preserved in phase evidence.

---

# Phase 8 — Workflow, Automation & Operations

Phase 8 expands workflow UI into the main operational operating system of ENJAZ.

## 8.1 — Workflow Engine & Government Procedure OS — M1 ✅
- Visual/stateful workflow templates, instances, stages, requirements and allowed transitions.
- **M1 Government Procedure Operating System:** authoritative procedure catalog, government entities/branches, required documents, fees, prerequisites, stage SLA and state history.
- **Phase 8.1 ✅ CLOSED + post-merge recertified. M1 implementation anchor is complete. Phase 8.7 supplied the required Phase-8 individual destruction evidence; M1 remains `CLOSURE_CANDIDATE` until the separate major-system `ZERO_ESCAPE_V1` closure evidence file satisfies every global M-system requirement (including fresh-workspace coverage where applicable).**

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

## 9.1 — Smart Risk Engine ✅
- Explainable risk signals, urgency, anomaly and prioritization.
- **Phase 9.1 — Smart Risk Engine ✅ CLOSED + post-merge recertified** under a read-only derived-intelligence authority boundary.
- Canonical runtime SHA `9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde`: **19/19 exact-main push workflows SUCCESS** and **22/22 cumulative exact-SHA workflow runs SUCCESS**.
- Phase 9.1 gate `34411497055`, Real Browser `34411497023`, Pages build/deployment `34411495854`, Pages Preview `34411566669`, and Live External `34411616353` all succeeded.
- Risk-owned tables/write RPCs remain **NONE**; missing evidence remains fail-closed.
- Certified Phase 9.1 build: **669992/670000 PASS** under the unchanged 670000-byte startup ceiling.
- Formal evidence: `docs/PHASE9_1_STATE.json`, `docs/PHASE9_1_CLOSURE.md`, `docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md`.

## 9.2 — Smart Saved Views & Cross-domain Search Intelligence ✅
- Stable reusable query definitions and high-value cross-domain discovery.
- Saved Views persist under explicit RLS/permission authority; Global Search groups authoritative results by domain and never leaks unauthorized entities.
- Existing filters/finders are reused rather than duplicated and deep links return to authoritative destinations.
- **Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence ✅ CLOSED + post-merge recertified** under exact-main Real Browser, Pages, Live External and Real Cloud zero-residue evidence.
- Canonical closure SHA: `1d98a57566a5bc55ceda773f02de17dacddaecb0`.
- Formal evidence: `docs/PHASE9_2_STATE.json`, `docs/PHASE9_2_CLOSURE.md`, `docs/PHASE9_2_POSTMERGE_RECERTIFICATION.md`.

## 9.3 — Corporate Governance & Ownership Engine — M2 ✅
- Shareholders/partners, exact ownership percentages, beneficial owners, directors/managers, authorized representation, powers/authorizations, resolutions, capital history, ownership transfers, corporate events and historical control timeline.
- Validation prevents impossible ownership states, conflicting effective periods, cross-workspace references and unauthorized governance changes.
- Existing company/person records remain authoritative; governance creates no shadow company/party truth store.
- **Phase 9.3 — Corporate Governance & Ownership Engine — M2 ✅ CLOSED + post-merge recertified**.
- Canonical runtime SHA `1c38e388285b1c566d202258d78aadb1b85b9342`.
- Phase 9.3 exact-main gate `34571138932`, Real Browser `34571138982`, Pages build/deployment `34571138262`, Pages Preview `34571185394`, and Live External `34571241122` all succeeded.
- Real Browser covered 1280/430/390/360/320; Real Cloud persistence and authenticated destructive verification ended with zero residue and zero phase-owned advisor/index warnings.
- The hard startup JavaScript ceiling remains 670000 bytes; final Pages initial runtime is **563529/670000 PASS**, achieved through lazy domain portals rather than feature cuts.
- Formal evidence: `docs/PHASE9_3_STATE.json`, `docs/PHASE9_3_CLOSURE.md`, `docs/PHASE9_3_POSTMERGE_RECERTIFICATION.md`.
- **M2 is now globally `CLOSED` under `ZERO_ESCAPE_V1` after Phase 9.7 exact-head, Real Cloud inheritance/reverification, Real Browser, exact-main Pages and Live External closeout. Machine evidence: `docs/M2_ZERO_ESCAPE_CLOSURE.json`.**

## 9.4 — Regulatory / Knowledge Base Engine — M8 foundation
- Structured laws, regulations, instructions, circulars, official notices, procedural knowledge and source/version metadata.
- Source provenance, jurisdiction, issuer, publication/effective/supersession dates and deterministic version lineage are first-class authority fields.
- Official source truth remains distinct from workspace-curated knowledge, editorial interpretation and AI-generated summaries.
- Missing provenance/version/effective-date authority fails closed; historical source truth is append/versioned rather than destructively overwritten.
- Arabic-first retrieval is a derived search representation and may not mutate the authoritative source record.
- Citation output requires an actual matching source/version/provenance tuple; fabricated legal citations are forbidden.
- AI summaries and editorial interpretations remain `authoritative=false` by contract.
- Foundation contract: `src/features/regulatory/regulatoryKnowledgeContract.ts`.
- Persistence schema/RLS/RPC boundary is **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE** on Supabase project `juzxriirhkuzviwnhkbd`.
- Applied regulatory migrations: `20260911072927`, `20260911073147`, `20260911073533`, `20260911141327`, `20260911141412`.
- Phase-owned security-advisor warnings: **0**; phase-owned unindexed foreign keys: **0**.
- **Phase 9.4 — Regulatory / Knowledge Base Engine — M8 ✅ CLOSED + post-merge / published-live recertified**.
- Certified implementation merge `b72dbff8bb1dfb1afbce82ececd265bf2d5544ed`; exact-main **23/23 SUCCESS**.
- Phase gate `34677681118`, Real Browser `34677681129`, Pages `34677705458`, Live External `34677729775`: **SUCCESS**.
- **M8 — Regulatory / Knowledge Base Engine: `ACTIVE`** because Phase 12 remains its second governing anchor; Phase 9.4 closure does not fabricate global M8 closure.
- Formal evidence: `docs/PHASE9_4_STATE.json`, `docs/PHASE9_4_CLOSURE.md`, `docs/PHASE9_4_POSTMERGE_RECERTIFICATION.md`.

## 9.5 — Business Intelligence & Forecasting Center — M13
- Operational/financial KPI models, trends, capacity and forecast surfaces with source provenance.
- BI remains `READ_ONLY_DERIVED`; source provenance is required and finance reuses Phase 7.3 authoritative intelligence with exact bigint-cents semantics.
- Forecasts are directional/non-authoritative and disclose method, confidence, sample count, horizon and assumptions; trailing run-rate scales additive `count`/`cents` only.
- Fabricated historical observations, silent missing data substitution, cross-workspace aggregation and shadow BI persistence are forbidden.
- Canonical Arabic-first destination: `/app/insights`.
- Real Cloud authenticated source-composition verification: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**.
- **Phase 9.5 — Business Intelligence & Forecasting Center — M13 ✅ CLOSED + exact-main + post-merge / published-live recertified**.
- Implementation lineage: PR #139 → `ee62353621701c788b3c96ae8172a59b6f95022d`; deep-link hotfix PR #140 → `ce1a4566f48ebcacfde8a8c5b7dd680b6b23a672`; final certification-semantics PR #141 → `8d9f1bd4403656f7b8d061b843178708b3899044`.
- Runtime-certified main: `8d9f1bd4403656f7b8d061b843178708b3899044`; exact-main **25/25 SUCCESS**.
- Phase gate `34686304068`, Phase 9.5 Real Browser `34686304110`, cumulative Real Browser `34686304122`, Pages `34686334396`, Live External `34686380088`: **SUCCESS**.
- deployed `/ENJAZ/live/app/insights` direct-load/reload matrix: **7/7 PASS** across 1280/430/390/360/320.
- four quality tracks: **PASS / PASS / PASS / PASS**; unresolved/critical/high/functional blockers: **0 / 0 / 0 / 0**.
- **M13 remains `ACTIVE`** with governing anchors `9, 15`; Phase 15 remains open, so global M13 closure is forbidden here.
- Formal evidence: `docs/PHASE9_5_STATE.json`, `docs/PHASE9_5_CLOSURE.md`, `docs/PHASE9_5_POSTMERGE_RECERTIFICATION.md`.
- Formal closure main `295ad9dd308e391e7d92b1e27de74c859b0a20b1`: **25/25 SUCCESS**, Phase 9.5 gate `34687292217`, dedicated Real Browser `34687292129`, cumulative Real Browser `34687292148`, Pages `34687328191`, Live External `34687368229`: **SUCCESS**.
- Phase 9.6 successor has since completed and closed; this line is retained as transition history only.

## 9.6 — Process Mining & Predictive Operations — M18
- Derive actual process paths from authoritative histories.
- Detect bottlenecks, rework and delay patterns; prediction must expose confidence and evidence.
- **Status: CLOSED + EXACT-MAIN / REAL-BROWSER / PAGES / LIVE-EXTERNAL CERTIFIED.**
- Canonical base: Phase 9.5 formal closure main `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.
- Certified implementation/deployment main: `d92059530275ff70e02a05c4f4c1ef930cb1750a`; formal closure main: `bcb8e697fa7457e216036ae321b8eddac2050b1b`.
- M18 remains `ACTIVE` with anchors `9, 15`; global M18 closure remains forbidden while Phase 15 is open.
- Source-owned process authority uses append-only `workflow_transition_events`, append-only `transaction_activity`, and certified field-operation authority (`field_assignments`, `field_visits`, `field_visit_evidence`); `field_sync_receipts` is integrity-only and never a path input.
- No shadow process-event store, fabricated timestamps, fabricated strict sequence, browser-owned process persistence or cross-workspace composition is allowed.
- Equal-time events without authoritative sequencing remain explicit partial order; deterministic display sorting is not promoted into source truth.
- Rework requires repeated observed activity. Bottleneck classification requires governed threshold/cohort evidence. Missing duration remains unknown, never fabricated as zero.
- Prediction methods are `empirical_next_activity_frequency` and `empirical_wait_threshold_frequency`; output remains directional/non-authoritative with provenance/method/confidence/sample disclosure.
- foundation/source-service/runtime-parity/UI destruction: **20/20 + 12/12 + 3/3 + 12/12 PASS**; functional regression **218/218 PASS**.
- exact-main implementation baseline: **27/27 SUCCESS**; Phase gate `34705494680`, Real Browser `34705494809`, cumulative Real Browser `34705494731`, Pages Preview `34705526787`, Live External `34705561853`: **SUCCESS**.
- Formal evidence: `docs/PHASE9_6_STATE.json`, `docs/PHASE9_6_CLOSURE.md`, `docs/PHASE9_6_POSTMERGE_RECERTIFICATION.md`.

## 9.7 — Intelligence Zero-Escape Gate
- Conflicting/stale signals, no-data states, high-volume datasets, invalid ownership, regulatory version conflicts, model drift and prediction uncertainty.
- M2/M8/M13/M18 require individual closure evidence.
- **Status: CLOSED + EXACT-MAIN / REAL-BROWSER / PAGES / LIVE-EXTERNAL CERTIFIED.**
- implementation PR #149 exact head: `84331768024d1aef2eed83444a9c5aff8789e875`; merged implementation main: `e8992650afb7bd3bd5c47770d0b2d752cdd0488e`.
- Phase 9.7 destructive intelligence suite: **16/16 PASS**; closure-aware Phase 9.3–9.6 subsystem regression and full functional regression: **PASS**.
- exact-main aggregate: **31/31 SUCCESS** with **0 failure / 0 queued / 0 in-progress**.
- exact-main Phase 9.7 Gate `34708680263`, cumulative Real Browser Acceptance `34708680233`, Pages build/deployment `34708679838`, Pages Preview `34708710217`, Live External `34708764814`: **SUCCESS**.
- **M2 → CLOSED under `ZERO_ESCAPE_V1`** with machine evidence `docs/M2_ZERO_ESCAPE_CLOSURE.json`.
- **M8 remains ACTIVE** for Phase 12; **M13 and M18 remain ACTIVE** for Phase 15. No later anchor is fabricated as complete.
- Product / UI/UX / Engineering / Certification: **PASS / PASS / PASS / PASS**; unresolved/Critical/High/functional blockers: **0 / 0 / 0 / 0**.
- Formal evidence: `docs/PHASE9_7_STATE.json`, `docs/PHASE9_7_CLOSURE.md`, `docs/PHASE9_7_POSTMERGE_RECERTIFICATION.md`.
- Historical transition note: Phase 10.1 was authorized at Phase 9.7 closure; Phases 10.1–10.6 have since CLOSED with governed evidence. **Phase 11.1 — Notifications & Follow-ups is now AUTHORIZED NEXT.**

---

# Phase 10 — Documents, Vault, OCR & Reports

## 10.1 — Document Vault ✅ CLOSED
- Metadata-first document model, safe binary handling, ownership and entity relationships.

## 10.2 — Document Intelligence / OCR ✅ CLOSED
- Explicit extraction/review/verification flow; source file remains authoritative.

## 10.3 — Document Factory & Official Form Engine — M7 ✅ CLOSED
- Template/version management, approved merge fields and deterministic generation of official requests, letters, decisions and submission packs.
- Generated documents retain provenance to source entities/data and template version.

## 10.4 — Reports & PDF ✅ CLOSED
- Professional reports, deterministic pagination/footer/signature/QR/barcode handling and no blank/overflow-corrupt output.

## 10.5 — Engagement/Contract Document Layer — M16 ✅ CLOSED
- Contract/retainer documents, revisions, signatures/status/effective dates and links to clients/services/finance.

## 10.6 — Documents Zero-Escape Gate ✅ CLOSED
- Missing/oversized/corrupt files, broken metadata, OCR failure, malicious uploads, long reports, multi-page overflow, offline upload/retry and unauthorized access.
- M7 and the Phase-10 document portion of M16 received deployed-live evidence. Phase 10.6 closed with destructive Real Cloud, exact-main, Real Browser, Pages and Live External certification; formal evidence: `docs/PHASE10_6_CLOSURE.md`.

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

## 12.1 — Copilot Foundation ✅ CLOSED
- Tool/data boundaries, workspace/permission enforcement, structured outputs, rate limiting, tracing and provider failure isolation.
- Formal closure: `docs/PHASE12_1_CLOSURE.md`.

## 12.2 — Contextual Assistance ✅ CLOSED
- Search, summarize, compare, draft and explain authoritative ENJAZ information with citations/provenance where applicable.
- Certified read-only authority over `global_search_v1`; no business mutation tools, service-role business reads or raw prompt/query/answer persistence.
- Implementation PR #199 merged to `10592bbd0d91684970d5074719871039892d4667`.
- exact-main: **40/40 SUCCESS**; Phase Gate #81, dedicated/cumulative Real Browser, Pages #1567, Live External #1241 and Real Cloud #3: **PASS**.
- published `/live/` total JS **759985 / 760000**, CSS **179989 / 180000**; no cap increase / no feature cut.
- Formal closure: `docs/PHASE12_2_CLOSURE.md`.

## 12.3 — Agentic ENJAZ Copilot — M9 ✅ CLOSED
- Plan multi-step work and propose actions across ENJAZ tools.
- Sensitive mutations require explicit user approval and domain-service validation.
- Agent cannot bypass RLS, workflow/legal transitions, finance rules or document approval state.
- Opening slice **A1 — Plan / Proposal Contract** is source-gate certified on branch head `6b9d7fdd03584b11069f2e141f83a169f0c2a2b6`; Phase 12.3 Gate run `35358806445` is **PASS**.
- A1 remains deliberately proposal-only: no execute operation, no generic write tool, no direct business-table write, no service-role business read, no client UI delta and no new database/Edge deployment authority.
- **A2 — Approval Binding Contract: CERTIFIED** with final source Gate #12 + Real Cloud #2 PASS.
- **A3-A — Action-Specific Execution / `followup.snooze`: CERTIFIED** — source Gate #17 + destructive Real Cloud #2 (**32/32**) + zero residue; action digest is independently recomputed in PostgreSQL and execution atomically consumes the approved proposal while delegating to the existing follow-up domain RPC. No generic execution exists.
- **A3-B — `followup.create`: CERTIFIED** — source Gate #26 + Real Cloud 33/33 PASS + zero residue; governed creation remains bound to existing `create_transaction_followup_v1` with nested title SHA-256 and atomic approval consumption.
- **A3-C — self `reminder.schedule`: CERTIFIED** — Gate #35 + Real Cloud #3 PASS (39/39); self-recipient reminder scheduling uses existing `get_scheduling_deadline_snapshot_v1` + `dispatch_scheduling_attention_v1`, with named RPC hardening, explicit approval, atomic consumption/rollback, zero follow-up side effects and zero residue.
- **A3-D — `document.request`: CERTIFIED** — Gate #45 + Real Cloud #1 PASS (**44/44**) + zero residue; invited principals are supported when non-revoked, prepare requires `view` + `upload_requested_document`, and approved execution delegates to existing M3 `save_client_portal_request_v1` with create-only/document-only semantics and atomic rollback.
- **A3-E — `document.draft`: CERTIFIED** — source Gate #85 PASS after live-evidence enforcement; Real Cloud #1 **44/44 PASS** + zero residue; governed generation delegates only to existing M7 `get_document_factory_v1` + `generate_document_draft_v1`, output is hard-stopped at `review_required`, contact/OCR inputs are not exposed, no render/Vault side effect occurs, and review/render/finalization remain forbidden.
- Implementation PR #201 merged to `0353e15d0e8299ba5410d6fff5bf540b41b90443` after **78/78** PR workflows completed (77 success + 1 expected skipped; 0 failures).
- exact-main: **38/38 SUCCESS**; Phase Gate #89, cumulative Real Browser #1674, Intelligence Zero-Escape #658, Pages #1577, Live External #1250 and Published Client Portal #184: **PASS**.
- published `/live/` total JS **759985 / 760000**, CSS **179989 / 180000**; no cap increase / no feature cut / no Phase 12.3 client UI delta.
- Formal closure: `docs/PHASE12_3_CLOSURE.md`.

## 12.4 — Regulatory Knowledge Assistance — M8 ✅ CLOSED
- Retrieve/version regulatory sources and distinguish source text, structured facts and AI interpretation.
- Phase 12 must consume the authority contract established by Phase 9.4 rather than creating a second source of regulatory truth.
- **A1 — Grounded Regulatory Assistance Contract: CERTIFIED** — exact Phase 12.3 closure base `cc01d06be81be27e614d80c9edaa86bdf4e79634`; read-only `answer` contract with explicit `asOf`, exact source-version/hash/provenance citations, fail-closed ambiguity/missing-authority behavior, and hard separation of authoritative official text/structured facts from non-authoritative interpretation. No DB/Edge/UI/provider delta; source Gate #3 / `35379162122`: **PASS** (7/7 A1 tests), frozen build **431032 / 759568 JS + 179989 CSS**.
- **A2 — Authenticated M8 Retrieval Edge: CERTIFIED** — caller-JWT-only retrieval through existing `search_regulatory_knowledge_v1` + `get_regulatory_knowledge_entry_v1`; Edge v2 / `verify_jwt=true`; final Source Gate #7 PASS; Real Cloud #2 **18/18 PASS** with empty-store fail-closed/no-fabrication, cross-workspace denial, zero regulatory mutation and zero residue; no service role, no regulatory mutation and no new DB authority.
- **A3 — Search↔Entry Binding Hardening: CERTIFIED** — A3 Gate #3 PASS (8/8 adversarial binding tests + Phase 9.4 runtime/rollback-contract preservation); Edge v3 / `verify_jwt=true`; Real Cloud #1 **18/18 PASS** after redeploy with zero regulatory mutation and zero residue. Search↔entry is bound across workspace/asOf/sourceId/versionId/sourceHash/scope; no permanent fake regulatory truth was seeded and no populated live HTTP journey is claimed while M8 is empty.
- Implementation PR #203 merged to `974ff00abab45bfa6615b39cd4c31e0b20b7dfa0` after **86/86** PR workflows completed (85 success + 1 expected skipped; 0 failures).
- exact-main: **38/38 SUCCESS**; Phase 9.4 Regulatory Gate #787, cumulative Real Browser #1679, Intelligence Zero-Escape #663, Pages #1581, Live External #1254 and Published Client Portal #188: **PASS**.
- published `/live/` total JS **759985 / 760000**, CSS **179989 / 180000**; no cap increase / no feature cut / no Phase 12.4 client UI delta.
- Phase 12.4 closes the Phase-12 assistance anchor but **M8 remains ACTIVE** until Phase 12.5 supplies its independent AI Zero-Escape/safety evidence.
- Formal closure: `docs/PHASE12_4_CLOSURE.md`.

## 12.5 — AI Zero-Escape & Safety Gate ✅ CLOSED
- W1 **16/16 PASS**; W2 Real Cloud **71/71 PASS**.
- PR #205 **80/80 completed = 79 success + 1 skipped; 0 failures**.
- exact-main `980d450da3dc9664a964e168e8bff91b025a35cc`: **39/39 SUCCESS**.
- Real Browser #1683, Pages #199/#1585, Live External #1258, Published Portal #192: **PASS**.
- M8 and M9: **CLOSED / ZERO_ESCAPE_V1**.
- Formal closure: `docs/PHASE12_5_CLOSURE.md`.
- **Phase 13.1 — Read-only Legacy Snapshot Intake: AUTHORIZED_NEXT**.


---

# Phase 13 — Legacy Import & Reconciliation

## 13.1 — Read-only Legacy Snapshot Intake ✅ CLOSED
- exact base: `a7a17d6309e43cff68968be33deecbdac57ed4ed`; implementation merge: `1cbcb7930b010ea8505ae621db507583ae8268c4`.
- **A1: CERTIFIED** — Gate #3 / `35393731218`; **10/10 PASS**.
- **A2: CERTIFIED** — Gate #5 / `35395538307`; **10/10 PASS**; exact review vocabulary only; unknown types remain `QUARANTINED_UNKNOWN`.
- **A3: CERTIFIED** — Gate #10 / `35395953023`; **13/13 PASS**; UTF-8 byte ceilings + adversarial replay/mutation/duplicate/dangling boundaries certified.
- implementation PR #207: **81/81 completed = 80 success + 1 expected skipped; 0 failures**.
- exact-main `1cbcb7930b010ea8505ae621db507583ae8268c4`: **39/39 SUCCESS**.
- Phase 13.1 #14, cumulative Real Browser #1687, Pages #201/#1589, Live External #1262 and Published Portal #196: **PASS**.
- read-only law remains permanent for 13.1: no persistence, mapping, normalization, ordered import, target writes, DB migration, write RPC, Edge authority or client UI.
- Formal closure: `docs/PHASE13_1_CLOSURE.md`.
- Phase 13.2 — Normalize & Map: **AUTHORIZED_NEXT**.

## 13.2 — Normalize & Map — IN_PROGRESS / A1 EXPLICIT MAPPING CONTRACT
- exact base: `aa8e402eeb6ed03bee9fb446bc2c741da37df7dc` — final Phase 13.1 closure.
- A1 maps only explicit exact legacy types and explicit fields to a narrow preview scope: companies / contacts / transactions.
- deterministic rules only: `identity_scalar`, `trim_text`, `strict_number`.
- no fuzzy/alias/case inference; no silent field copy; unplanned types remain quarantined.
- A1 cannot map relationships, assign target authority, persist snapshots, write ENJAZ data or execute import.
- no DB migration / write RPC / Edge / UI delta / budget increase.
- **Phase 13.3 — Ordered Import remains LOCKED.**
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

# Historical current-position snapshot — after Phase 8.1 closure

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
- **Phase 7.3 — Financial Intelligence ✅ CLOSED + post-merge recertified**
- **Phase 7.4 — Financial Reports ✅ CLOSED + post-merge recertified**
- **Phase 7.5 — Finance Destruction & Reconciliation Gate ✅ CLOSED + post-merge recertified**
- **Phase 7 — Finance ✅ CLOSED + post-merge recertified**
- **Phase 8.1 — Workflow Engine & Government Procedure OS — M1 ✅ CLOSED + post-merge recertified**
- Historical satisfied marker: **M1 — Government Procedure Operating System 🟠 `CLOSURE_CANDIDATE`**
- Historical satisfied marker: **Next: Phase 8.2 — Automation Engine**

This snapshot is retained only as satisfied transition history. It no longer defines the canonical next stage.

---

# Current position — canonical reconciled state

- Phases 0–11.7 ✅ CLOSED / canonically recertified where required.
- **Phase 12.1 — Copilot Foundation ✅ CLOSED + Real Cloud + exact-main + Pages + Live External certified.**
- **Phase 12.2 — Contextual Assistance ✅ CLOSED + authenticated Real Cloud + dedicated/cumulative Real Browser + exact-main 40/40 + Pages + Live External certified.**
- Phase 12.2 formal implementation merge: `10592bbd0d91684970d5074719871039892d4667`.
- Phase 12.2 published `/live/` budget: **431246 / 670000 initial JS; 759985 / 760000 total JS; 179989 / 180000 CSS**.
- **Phase 12.3 — Agentic ENJAZ Copilot — M9 ✅ CLOSED + A1/A2/A3-A/A3-B/A3-C/A3-D/A3-E Real Cloud + PR 78/78 + exact-main 38/38 + Pages + Live External certified.**
- Phase 12.3 formal implementation merge: `0353e15d0e8299ba5410d6fff5bf540b41b90443`.
- Phase 12.3 published `/live/` budget: **431246 / 670000 initial JS; 759985 / 760000 total JS; 179989 / 180000 CSS**.
- **Phase 12.4 — Regulatory Knowledge Assistance — M8 ✅ CLOSED + A1/A2/A3 + authenticated Real Cloud + PR 86/86 + exact-main 38/38 + Phase 9.4 Regulatory + Real Browser + Pages + Live External certified.**
- Phase 12.4 formal implementation merge: `974ff00abab45bfa6615b39cd4c31e0b20b7dfa0`.
- Phase 12.4 published `/live/` budget: **431246 / 670000 initial JS; 759985 / 760000 total JS; 179989 / 180000 CSS**.
- **Phase 12.5 — AI Zero-Escape & Safety Gate ✅ CLOSED — W1 16/16 + W2 71/71 + PR 80/80 + exact-main 39/39 + deployed-live.**
- M8 and M9 are `CLOSED` under `ZERO_ESCAPE_V1`; M13/M18 remain `ACTIVE` for Phase 15.
- startup JavaScript hard ceiling remains **670000 bytes**; total JavaScript **760000 bytes**; CSS **180000 bytes**.

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
| M13 | Business Intelligence & Forecasting Center | 9, 15 |
| M14 | Backup, Restore & Workspace Portability | 15, 18 |
| M15 | Multi-Branch, Departments & Team Operating Model | 8, 15 |
| M16 | Engagements, Contracts & Retainers | 7, 10, 11 |
| M17 | Smart Intake Forms & Secure Submission Links | 8, 11 |
| M18 | Process Mining & Predictive Operations | 9, 15 |

The machine-readable authority remains `docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json`; Phase 7.3 remains a required finance source/reuse authority for M13 but is not an additional global M13 anchor.

---

# Change-control rule

This file is intentionally difficult to change by accident.

The current reconciliation preserves all historical closure authority while Phase 12.5 executes from the formally certified Phase 12.4 boundary:

1. closed phases 0–8 remain closed and are not reopened;
2. Phase 9.1 and 9.2 remain closed under their certified authority boundaries;
3. Phase 9.3 remains formally closed; M2 is now separately `CLOSED` under the global `ZERO_ESCAPE_V1` law with exact machine evidence;
4. Phase 9.4 remains formally closed; M8 stays `ACTIVE` because Phase 12 remains a governing anchor;
5. Phase 9.5 remains formally closed; M13 stays `ACTIVE` because Phase 15 remains a governing anchor;
6. Phase 9.6 remains formally closed; M18 stays `ACTIVE` because Phase 15 remains a governing anchor;
7. Phase 9.7 is `CLOSED` after 16/16 destruction, Real Cloud closeout, cumulative Real Browser, exact-main 31/31, Pages and Live External certification;
8. Phase 7.3 finance intelligence remains reused authority and no parallel ledger/shadow money store is permitted;
9. regulatory, BI and process provenance boundaries remain mandatory; forecast/prediction remain directional/non-authoritative;
10. the production budgets remain startup JS 670000, total JS 760000 and CSS 180000 bytes with no waiver or feature cut;
11. the 18 major product systems remain governed by independent `ZERO_ESCAPE_V1` closure law;
12. M8/M13/M18 are not falsely globally closed because their later anchors remain open;
13. current state documents, README, this roadmap and machine-readable system registry agree that Phases 10.1–10.6 are closed and certified;
14. Phase 12.1, Phase 12.2, Phase 12.3 and Phase 12.4 are formally CLOSED with their required Real Cloud, exact-main, Real Browser, Pages and Live External evidence;
15. **Phase 12.5 is CLOSED**; M8/M9 are CLOSED under independent `ZERO_ESCAPE_V1` evidence; **Phase 13.1 is AUTHORIZED_NEXT**.

It does **not** silently reopen prior phases, falsely close M8/M9 from branch CI or Real Cloud alone, weaken RLS/provenance/event-lineage/approval boundaries, raise performance ceilings, or authorize Phase 13.1 before Phase 12.5 closes.
