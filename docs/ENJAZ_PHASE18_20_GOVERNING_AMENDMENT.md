# ENJAZ Phases 18–20 — Governing Roadmap Amendment

**Status:** GOVERNING_AMENDMENT  
**Effective scope:** Future delivery sequence only; Phases 0–17 and all certified historical evidence remain unchanged.  
**Authority:** This amendment supersedes the prior Phase 18 final-delivery section of `docs/ENJAZ_MASTER_ROADMAP.md` and extends the governing delivery sequence through Phase 20. It does not reopen, rename, weaken, or reorder any completed or currently authorized phase.

## Non-negotiable transition rule

- Phase 17 becomes the final production-baseline / release-rehearsal boundary, not final delivery.
- Phase 18 and Phase 19 add real user-facing capability and must satisfy the same authoritative-data, RLS, Real Cloud, Real Browser/mobile, failure/recovery, audit and Zero-Escape standards used elsewhere in ENJAZ.
- No feature work may be added after Phase 19 except fixes required by Phase 20 certification.
- Phase 20 owns the final release freeze, final production certification, final M1–M18 closure matrix, final backup/restore acceptance and `ENJAZ 1.0 — Delivered` state.
- Phase 20 may reopen an affected certification state when it finds a Gate Escape; every real escaped defect receives a permanent regression guard.

---

# Phase 18 — Advanced Office & Productivity Suite

Phase 18 turns ENJAZ into a faster daily operating workspace rather than merely a collection of domain screens. It must reuse authoritative services and may not create shadow truth stores.

## 18.1 — My Work Space
- Personal operational workspace for assigned, urgent, overdue, waiting-for-approval and recently touched work.
- User layout/preferences may be personalized, but business facts remain shared authoritative records.

## 18.2 — Command Palette & Universal Actions
- Keyboard/touch command surface for navigation, search and safe quick actions.
- Commands resolve to existing domain services; presentation code contains no hidden business mutation logic.

## 18.3 — Favorites, Pins & Recent Work
- Pin companies, transactions, people, documents, saved views and operational destinations.
- Recent-work history supports fast continuation without duplicating source records.

## 18.4 — Safe Bulk Operations
- Preview-first multi-record actions with permission checks, idempotency, partial-failure reporting, audit evidence and no silent destructive mutation.

## 18.5 — Work Recipes / Office Playbooks
- Reusable office-process recipes for recurring company/legal/admin work.
- Recipes may create/check tasks, requirements, document requests and workflow actions only through authorized domain boundaries.

## 18.6 — Advanced Checklists & Requirements
- Reusable checklists with required/optional items, completion evidence, missing-item visibility and relation to authoritative workflow/procedure requirements.

## 18.7 — Notes, Tags & Bookmarks
- Scoped internal notes, tags and bookmarks over authoritative entities with clear ownership/visibility rules.

## 18.8 — Delegation & Handoff
- Assign/handoff work between authorized users or teams with actor/time/reason evidence and unresolved-work visibility.

## 18.9 — Approval Center
- Consolidated approval queue for sensitive domain actions, documents, workflow decisions and AI-proposed mutations.
- Approval never bypasses the underlying domain validation or RLS boundary.

## 18.10 — Custom Workspace Layouts
- Per-user dashboard/workspace composition without changing shared business truth.

## 18.11 — Cross-record Compare
- Deterministic comparison for supported companies, transaction snapshots, document versions or structured records with provenance to both compared sources.

## 18.12 — Personal & Team Productivity
- Workload, throughput, aging and bottleneck surfaces derived from authoritative history.
- Metrics remain explainable and must not fabricate missing events or time.

## 18.13 — Smart Quick Create
- Context-aware safe creation of supported entities/tasks/notes/documents from anywhere in the application using existing validation/services.

## 18.14 — Safe Undo / Correction Patterns
- Where legally and technically allowed, reversible or compensating operations replace silent deletion/overwrite.
- Immutable financial/document/governance histories remain immutable.

## 18.15 — Productivity Zero-Escape Gate
- Multi-user conflicts, stale state, bulk partial failure, duplicate submit, permission boundaries, large queues, long Arabic text, keyboard/mobile interaction and audit reconciliation.

---

# Phase 19 — Digital Office, Correspondence & Mobile Capture

Phase 19 expands ENJAZ into a real paper/digital-office bridge for correspondence, scanning, submission packs, secure sharing and mobile field capture.

## 19.1 — Incoming / Outgoing Correspondence Registry
- Authoritative incoming/outgoing correspondence records with reference number, date, sender/recipient, subject, attachments, response state and links to companies/transactions/people.

## 19.2 — Mobile Document Scanner
- Camera capture flow with edge detection/crop, rotation/perspective correction, quality checks and safe upload into the Document Vault.

## 19.3 — Share to ENJAZ
- Mobile/PWA share-target flow for supported files/images into an explicit destination or reviewed intake queue.

## 19.4 — Smart Incoming Desk
- Unified inbox for unclassified incoming files, correspondence and capture items requiring classification, OCR, linkage, review or routing.

## 19.5 — Document Toolbox
- Governed PDF/image operations such as merge, split, reorder, rotate, compress and extract pages.
- Originals remain preserved; transformed output is a new attributable artifact/version.

## 19.6 — Annotation & Redaction
- Review annotations and controlled redaction copies with provenance and explicit non-destructive handling of source files.

## 19.7 — Document Version Visual Compare
- Human-readable comparison between supported versions with exact source/version identity.

## 19.8 — Signature & Stamp Library
- Permission-scoped signature/stamp assets and metadata.
- Application requires explicit authorization/approval before applying them to official generated output; no silent auto-signing.

## 19.9 — QR / Barcode Bridge
- Scan supported identifiers to resolve an authorized ENJAZ document, transaction, company or submission pack.

## 19.10 — Physical File Tracking
- Optional QR/barcode-backed physical-file custody/location tracking with actor/time handoff evidence.

## 19.11 — Submission Pack Builder
- Build deterministic ordered submission bundles from approved documents and generated forms while retaining component provenance.

## 19.12 — Print Center
- Paper-size, margin, header/footer, signature, pagination, QR/barcode and print-preview controls using deterministic document/report rendering.

## 19.13 — Secure Share Packages
- Expiring/revocable scoped packages or links for approved external recipients with access/audit evidence and no broad storage exposure.

## 19.14 — Offline Capture Queue
- Offline-safe capture/draft queue with explicit pending/failed/synced state, replay protection and duplicate-safe recovery.

## 19.15 — Mobile Office Mode
- Mobile-first operational workspace for real phone use, not merely a compressed desktop layout.

## 19.16 — Scan/OCR Preflight
- Quality gate before OCR: detect likely blur, missing page, orientation or unsupported input and require correction when confidence is insufficient.

## 19.17 — Digital Office Zero-Escape Gate
- Corrupt/oversized/malicious files, interrupted upload, duplicate share/capture, PDF edge cases, camera denial, Android lifecycle, offline recovery, tenant isolation and secure-package revocation.

---

# Phase 20 — Grand Final Zero-Escape & Reality Certification

Phase 20 is the largest certification phase in ENJAZ. It adds no discretionary feature scope. Its purpose is to challenge the complete connected product until no known Critical/High/functional/UX/security/data-integrity blocker remains.

## 20.1 — Architecture & Source-of-Truth Audit
- Re-prove domain ownership, no shadow implementation, no dead legacy authority and no forbidden UI/runtime DNA.

## 20.2 — Database & Migration Destruction
- Rebuild from ordered migrations; inspect tables, constraints, indexes, triggers, functions, grants, RLS, storage boundaries and migration parity.

## 20.3 — Authentication & Session Torture
- Registration/login/recovery/logout, token expiry, stale sessions, multi-session behavior, refresh/reload and failure recovery.

## 20.4 — RLS & Permission Red Team
- Positive/negative workspace/user/object access, guessed IDs, direct RPC/API attempts, cross-tenant storage/document access and sensitive-action abuse.

## 20.5 — Fresh User / Fresh Workspace Certification
- Bootstrap and execute critical journeys from a genuinely clean account/workspace without fixture dependence.

## 20.6 — Transactions Full Destruction
- Search/create/edit/360/lifecycle/archive/restore, duplicate submit, stale conflict, huge histories, invalid relations and recovery.

## 20.7 — Companies, People & Governance Full Destruction
- Company/person/lawyer/governance ownership, dates, relations, duplicates, dense history, permissions and reconciliation.

## 20.8 — Finance Full Reconciliation
- Payments, receipts, reversals, ledger, balances, credits, large values, reports, retries and exact reconciliation with zero lost/duplicated money events.

## 20.9 — Workflow, Automation & Operations Full Destruction
- Procedures, automation, command center, field work, branch/team scope, conflicts, offline/replay and approval boundaries.

## 20.10 — Documents Mega Test
- Vault, OCR, `فحص وتحليل الوثيقة`, review/verify, Document Factory, reports/PDF, contracts, signatures/stamps, QR/barcode, correspondence, capture and submission packs.

## 20.11 — Communications & Client Portal Destruction
- Notifications, follow-ups, deadlines, portal permissions, secure links, omnichannel delivery state, revocation and leakage attempts.

## 20.12 — Intelligence / BI / Process Truth Audit
- Risk, search, regulatory knowledge, forecasts and process mining under missing/stale/conflicting/large data while preserving provenance and non-authoritative boundaries.

## 20.13 — AI / Copilot Red Team
- Hallucination, missing-data resistance, prompt injection, malicious documents, unauthorized tool calls, sensitive-action approval, provider outage and provenance/citation checks.

## 20.14 — API / Webhooks / Integration Destruction
- Authentication, credentials, replay/signing, idempotency, ordering, retries, dead-letter recovery, rate limits and external dependency isolation.

## 20.15 — Backup / Restore / Portability Final Acceptance — M14
- Real export/backup plus controlled restore into a clean target with schema/version compatibility and data/relation/reconciliation proof.

## 20.16 — Performance / Load / Soak
- Large datasets, long sessions, repeated navigation/actions, expensive queries, bundle/runtime budgets, memory/resource leaks and sustained operation.

## 20.17 — Security Offensive Pass
- XSS/injection/content handling, CSP, secrets, privileged functions, storage URLs, malicious uploads, metadata attacks and dependency/configuration review.

## 20.18 — FINAL UI/UX DESTRUCTION
- Inspect **every implemented screen and every M1–M18 surface**, including Phase 18 and Phase 19 additions.
- Mandatory viewport/device matrix: 1280 / 430 / 390 / 360 / 320 plus representative real Android behavior.
- Keyboard, Back, rotation, safe areas, scroll, overlays, focus, touch targets, reduced motion and accessibility.
- Long Arabic/Latin, huge numbers, empty/dense/loading/error/offline/conflict states.
- Inspect hierarchy, typography, contrast, card depth/layering, spacing, alignment, icons, animation, top/bottom bars, forms, modals, PDFs, AI, finance, documents, command center, client portal and digital-office surfaces.
- Visual failure includes cheap/flat appearance, unclear hierarchy, inconsistent spacing, harsh glare, clipped content, legacy DNA, weak typography, malformed geometry or a screen materially below the approved ENJAZ quality bar even when functionally correct.
- Every Critical/High UX escape is fixed and receives regression/visual guard evidence before certification resumes.

## 20.19 — Exact Production Reality Test
- Freeze candidate SHA, deploy exactly that SHA/config/schema, then rerun representative critical paths on production/public deployment rather than trusting local/preview evidence.

## 20.20 — Final Zero-Escape Acceptance & Delivery
ENJAZ 1.0 may be declared delivered only when all of the following are true:
- required roadmap phases are closed in order;
- required M1–M18 systems are `CLOSED` under Zero-Escape evidence;
- Critical = 0;
- High = 0;
- functional blockers = 0;
- UX High = 0;
- Security High = 0;
- data/reconciliation errors = 0;
- final backup/restore/portability proof passes;
- build/migrations/config/documentation are reproducible;
- exact deployed SHA passes final production verification;
- every real escaped defect found during Phase 20 has a permanent regression guard.

**Final state:** `ENJAZ 1.0 — Delivered`.

---

## Change-control protection

1. This amendment changes only the future Phase 18+ delivery plan and the final Phase 17 role; it does not reopen Phases 0–16 or invalidate any existing closure certificate.
2. Phase 18 and 19 are capability phases, not filler and not substitutes for unfinished earlier requirements.
3. Phase 20 is mandatory and cannot be shortened to a smoke test or CI-only gate.
4. Phase 20.18 UI/UX destruction is mandatory even though Phase 16 already performs visual destruction; the final pass exists specifically to retest the fully connected product after Phases 18–19.
5. M14 final acceptance moves from the legacy Phase 18 handoff anchor to Phase 20.15. Its Phase 15 engineering/hardening anchor remains unchanged.
6. Until earlier phases close in order, this amendment authorizes no implementation work in Phases 18–20.
