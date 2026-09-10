# ENJAZ Phase 9.3 — Corporate Governance & Ownership Engine — M2

**Status: IN PROGRESS**

Branch: `phase9-3-corporate-governance-ownership-engine`  
Base: `1d98a57566a5bc55ceda773f02de17dacddaecb0` — formal Phase 9.2 closure merge, independently recertified on canonical `main`.

## Authorization

Phase 9.2 is formally `CLOSED`, its exit gate passed, and `phase9_3Allowed=true`. Its exact merged SHA completed canonical gates with zero failure/queued/in-progress runs, including Real Chromium and the published `/live/` external attack. Phase 9.3 is therefore the sole authorized implementation stage. **Phase 9.4 remains LOCKED** until Phase 9.3 completes its own Zero-Escape evidence and formal closure.

## Project quality constitution

Phase 9.3 is explicitly governed by the repository-level [`ENJAZ_NON_NEGOTIABLE_RULES.md`](../ENJAZ_NON_NEGOTIABLE_RULES.md). The phase is not complete because persistence works, because the UI looks good, or because CI is green in isolation. Closure requires the four mandatory quality tracks to pass together:

**Product / UI/UX / Engineering / Certification**

- Product must deliver the complete M2 business outcome end-to-end with no decorative or shadow implementation.
- UI/UX must meet the premium ENJAZ bar across real current/history/governance states, RTL/mobile, keyboard/back, error/loading/empty/conflict and dense data.
- Engineering must remain typed, modular, source-of-truth safe, RLS-backed, history-safe, idempotent/concurrency-aware and maintainable; no legacy DNA or patchwork architecture may be introduced.
- Certification must prove the implementation through deterministic/destructive regression, Real Cloud, Real Chromium, exact-head CI, deployed-live verification and post-merge recertification.

Phase 9.3 cannot transition to `CLOSED` and cannot authorize Phase 9.4 unless all four tracks are recorded as `PASS` in its phase state. Performance/bundle pressure may trigger refactor, code splitting, lazy loading, dependency control and deduplication, but it may not silently remove approved M2 capability or degrade the premium UX merely to satisfy a byte ceiling.

## Product contract

Phase 9.3 builds **M2 — Corporate Governance & Ownership Engine** as a full corporate register above the existing authoritative company core. It must answer current and historical governance questions from effective-dated authoritative facts, not from overwritten display fields or a second company store.

Required capability:

1. Shareholders/partners and ownership percentages.
2. Capital structure and capital increase/decrease history with effective dates.
3. Beneficial-owner register and missing/invalid beneficial-owner risk signals.
4. Directors/managers and representation authority.
5. Powers/authorizations with grant, revocation and expiry context.
6. Company resolutions/decisions register.
7. Partner/share transfer transactions with durable history.
8. Director appointment/removal history.
9. One corporate-event timeline linking ownership, capital, authority and resolution changes.
10. Current and historical ownership/control snapshots derived from authoritative history.
11. Queries such as “who legally controlled this company on date X?” and “what changed between two dates?”.
12. Governance risk alerts for expired authorization, missing beneficial-owner context, ownership inconsistency and unresolved director/authority conflict.

## Non-negotiable consistency rules

- Ownership reconciles to **100% where the applicable company/legal structure requires it**.
- Negative ownership and ownership above 100% are invalid.
- Conflicting effective periods fail closed.
- A transfer may not silently erase the previous owner/history.
- Historical snapshots are generated from authoritative effective-dated facts/events, never from mutating one “current owner” field backward in time.
- Governance mutations require explicit existing workspace authority; presentation code cannot grant itself write permission.
- Cross-workspace company, person or governance references are rejected.
- Missing authority/evidence never falls back to fabricated governance facts.
- Existing company/person records are referenced; M2 may not create a shadow company/party truth store merely to satisfy governance UI.

## Authority boundaries

- Governance persistence: **database-backed + RLS required**.
- Sensitive governance writes: **authorized command/RPC boundary only**; direct browser DML is forbidden for those writes.
- Existing company core: **referenced, not duplicated**.
- Governance parties: **references to existing authorized company/person records**, not hidden shadow identities.
- Historical truth: **versioned/effective-dated and non-destructively auditable**.
- Cross-workspace access: **FORBIDDEN**.
- Destructive history overwrite: **FORBIDDEN**.
- UI-derived permissions or client-only trust: **FORBIDDEN**.

## Mandatory budget-headroom gate before runtime expansion

Phase 9.2 closed with the hard JavaScript ceiling unchanged at **670000 bytes**. The certified root build is `669987` bytes and the certified Pages `/live/` build is `669998` bytes — only **2 bytes** of live headroom.

Therefore Phase 9.3 begins under an explicit safety lock:

- `budgetIncreaseAllowed=false` remains immutable for this phase unless a separate governing decision explicitly changes it;
- no new M2 runtime surface may be imported into the production bundle while the live build is sitting at the 2-byte margin;
- contract, tests, audits and database design may proceed without runtime imports;
- deliberate JavaScript headroom must be recovered and proven by the normal root + `/ENJAZ/live/` budget gates **before runtime expansion is unlocked**;
- headroom recovery must preserve behavior and may not delete approved product capability simply to make the number smaller.

This is a gate, not a Phase 9.3 scope reduction.

## Foundation gate

Before database persistence is called implementation-ready:

- freeze a transport-safe ownership percentage representation that never relies on unsafe floating-point summation;
- freeze effective-date semantics and overlap behavior;
- define company/person reference boundaries without shadow identities;
- define ownership snapshot/reconciliation semantics;
- define beneficial-owner and governance-authority references;
- attack malformed percentages, impossible totals, conflicting periods, invalid dates, duplicate/ambiguous authority and cross-company leakage at the contract layer;
- preserve Phase 9.2 closure and all earlier regressions.

## Persistence / RLS gate

Before M2 is called live:

- create one authoritative governance model bound to workspace + existing company identity;
- use effective-dated immutable/history-safe rows or events for ownership/capital/authority changes;
- enforce company/workspace reference integrity in the database, not only in UI;
- enforce legal ownership reconciliation where applicable;
- use explicit authorized commands/RPCs for sensitive governance mutations;
- record actor/idempotency/audit context for ownership, capital, authority and director changes;
- prevent unauthorized direct writes, stale-version overwrite, duplicate transfer replay and cross-workspace reference injection;
- Real Cloud must exercise positive and negative RLS/permission matrices and leave zero probe residue.

## Runtime / UX gate

After budget headroom is deliberately restored:

- company governance/ownership is exposed through the existing premium records/company experience rather than a detached legacy screen;
- current ownership, historical ownership, director/authority status, beneficial-owner context, resolutions and event timeline remain clearly separated layers;
- “current” versus “historical as-of date” context must always be explicit;
- mutation flows must make effective date, before/after ownership and authority consequences visible before confirmation;
- mobile/RTL/keyboard/back/safe-area behavior remains first-class;
- no flat placeholder UI or demo-only governance state may stand in for authoritative data.

## Verification requirements

Phase 9.3 cannot close without all of the following:

- deterministic contract/foundation destruction tests;
- authoritative persistence + service destruction tests;
- full functional regression;
- database audit + database audit self-test;
- roadmap + major-system governance + secret + TypeScript checks;
- unchanged hard production JavaScript ceiling: **670000 bytes** (`budgetIncreaseAllowed=false`);
- authenticated **Real Cloud** ownership/governance RLS destruction with zero residue;
- **Real Chromium** at 1280/430/390/360/320 covering current ownership, as-of history, governance authority and guarded mutation journeys;
- exact-head pull-request workflow matrix with zero failures;
- exact merged-SHA post-merge recertification;
- Pages/deployed-live verification and Live External attack of the actual published application;
- zero critical/high/functional blockers.

## Successor lock

**Phase 9.4 — Regulatory / Knowledge Base Engine — M8 foundation remains LOCKED.** No Phase 9.4+ implementation is authorized by this kickoff.
