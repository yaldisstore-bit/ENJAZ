# Phase 10.5 — Engagement/Contract Document Layer — M16 — Kickoff

**Status:** IN PROGRESS  
**Base:** `7ebdc755fff42c497796b7f3d59c966cc3855393`  
**Predecessor:** Phase 10.4 — CLOSED / exact-main + Real Browser + Real Cloud + Pages + Live External certified  
**Successor:** Phase 10.6 — LOCKED until Phase 10.5 closure

## Objective

Build the Phase-10 document anchor of **M16 — Engagements, Contracts & Retainers** without creating a second commercial, financial or document source of truth.

Phase 7 already owns the finance/commercial anchor through `commercial_engagements`, `commercial_engagement_transactions`, authoritative payments/reversals and finance reconciliation. Phase 10.3 owns governed template/version generation and immutable issued artifacts. Phase 10.5 must connect those authorities into a governed contract-document lifecycle.

## In scope

- Engagement/contract/retainer document records bound to an existing authoritative `commercial_engagements` row.
- Contract revisions/amendments with explicit version lineage; no destructive overwrite of a signed/effective revision.
- Lifecycle state with explicit review/approval/signature/effective/expiry/termination semantics.
- Effective/start/end/renewal/notice dates with fail-closed date validation.
- Links to authoritative company, service/transaction context and finance engagement identity.
- Document Factory integration for deterministic contract generation.
- Vault binding through immutable `documents` + `document_versions` artifacts.
- Signature-ready and signed-artifact provenance; caller-selected arbitrary Vault files cannot be promoted silently.
- Arabic/RTL/mobile-first contract review surfaces in later implementation stages.
- Real Cloud authenticated authority tests, Real Browser/mobile acceptance, exact-main, Pages and Live External certification before closure.

## Authority rules

1. `commercial_engagements` remains the commercial engagement identity; Phase 10.5 does not create a shadow engagement table.
2. Payments, reversals, balances and retainer consumption remain Finance authority; contract documents cannot become a money ledger.
3. `documents` + immutable `document_versions` remain issued binary/document authority.
4. Document Factory template versions and render proofs remain the only governed route for generated official contract artifacts.
5. Signed/effective revisions are append/versioned and never overwritten in place.
6. Effective status cannot exist without a signed/approved immutable document version and valid date range.
7. Cross-workspace references, stale artifact versions and browser-direct authoritative mutation fail closed.
8. M16 is **not globally CLOSED** in Phase 10.5: its governing anchors are Phase 7 + Phase 10 + Phase 11. Phase 11 remains open.

## Initial implementation stage

`AUTHORITY_CONTRACT_AND_DESTRUCTION_TESTS`

The first stage establishes the TypeScript authority contract, lifecycle/date/version invariants, stable contract identity, destruction tests, phase audit/gate and M16 registry transition from `PLANNED` to `ACTIVE`. Database authority extension and live authenticated probes follow only after this foundation is green.

## Exit gate

Phase 10.5 may close only when Product / UI/UX / Engineering / Certification are all PASS, zero Critical/High/functional blockers remain, authenticated Real Cloud and Real Browser evidence pass, the exact merged SHA is deployed/certified, and Phase 10.6 is explicitly authorized. Global M16 closure remains forbidden until its Phase-11 anchor and independent Zero-Escape requirements are satisfied.