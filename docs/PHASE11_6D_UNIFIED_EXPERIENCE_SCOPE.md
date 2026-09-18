# Phase 11.6-D — Unified Experience & Certification

**Status:** IN PROGRESS  
**Base:** `ea6d7bdedaa2a714c7ec34ebf444d06e0875b06b` — exact merged Phase 11.6-C closure  
**Predecessor:** 11.6-C — CLOSED / Real Cloud certified  
**Successor:** Phase 11.7 — LOCKED

## Product objective

Deliver one Arabic/RTL/mobile-first operational journey for pending intake follow-up, client contract decisions and contract/retainer renewal attention without creating a new source of truth or duplicating the owning command boundaries.

D is the final experience/certification slice of Phase 11.6. It composes existing authorities; it does not replace them.

## Canonical composition

- M17 intake truth remains `intake_forms`, `intake_links`, `intake_submissions` and the governed review mapping.
- Intake follow-up rows remain private bridge evidence only.
- M3 request/approval truth remains the Client Portal authorities.
- M16 contract truth remains `engagement_contract_revisions` and `commercial_engagements`.
- M10 renewal truth remains `renewals`.
- M4 communication truth remains `communications` plus governed outbound command evidence.
- Notifications remain attention/delivery evidence only.
- `audit_events` remains attributable cross-system evidence.

## Unified read experience

D may add a governed **projection-only read model** that composes the authorities above into one staff attention queue.

The projection must:

- expose only workspace-scoped, staff-safe fields;
- distinguish intake follow-up, client approval and contract renewal items;
- expose source authority, canonical entity identity, status, due/expiry time and attention state;
- represent stale, revoked, expired, responded/reconciled and conflict/failure evidence truthfully;
- never infer approval, signature, effectiveness, renewal completion or communication delivery;
- never persist its own business-state table;
- never mutate an owning authority;
- route any action back to the existing owning surface/command instead of reimplementing the command.

## UX contract

- Arabic-first and RTL.
- Mobile-first and usable at 1280 / 430 / 390 / 360 / 320.
- One coherent “attention” journey rather than three unrelated duplicate screens.
- Loading, empty, offline, failure, stale/conflict, revoked/expired and recovery states are explicit.
- Existing R2 components/classes are reused.
- **No new CSS file or CSS budget increase is allowed.**
- D must not add a new top-level navigation destination when the existing Documents/Contracts operational surface can host the journey.

## Frozen budget contract

Opening certified production envelope:

- initial JS cap: **670000 bytes**;
- total JS cap: **760000 bytes**;
- CSS cap: **180000 bytes**;
- certified C build: **759488 total JS / 179989 CSS**;
- opening margin: **512 JS bytes / 11 CSS bytes**.

Therefore D must reclaim bundle bytes through safe deduplication/lazy composition before adding material runtime code. Feature cuts and cap increases are forbidden.

## Failure contract

- stale source versions fail closed at owning commands;
- revoked/expired Portal or follow-up authority cannot be resurrected by the projection;
- cross-workspace rows never appear;
- unresolved/ambiguous communication evidence is not reported as delivered;
- offline mode cannot claim fresh authority;
- read-model failure must not block the existing owning screens;
- retries cannot duplicate authoritative writes;
- no browser role gains direct access to private bridge/evidence tables.

## Certification required to close D / Phase 11.6

- source/destruction tests for the unified projection;
- authenticated Real Cloud fresh-workspace and durable round-trip proof;
- permission matrix and direct-write denial;
- stale/revoked/conflict/failure/recovery proof;
- audit reconciliation and zero residue;
- advisor comparison with zero D-caused security/performance regressions;
- frozen JS/CSS budgets with no cap increase;
- dedicated Real Chromium at 1280 / 430 / 390 / 360 / 320;
- exact merged SHA recertification;
- Pages deployment;
- Live External critical-path verification;
- zero known Critical / High / functional blockers.

## Successor lock

**Phase 11.7 — Communication Zero-Escape Gate remains LOCKED** until the entire Phase 11.6 exit gate, including deployed-live/post-merge evidence, passes.
