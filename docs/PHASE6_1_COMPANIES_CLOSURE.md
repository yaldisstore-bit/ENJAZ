# Phase 6.1 — Companies Closure

Status: **CLOSED — post-merge recertification pending**

Phase 6.1 closes the Companies scope only. Phase 6.2 remains locked until the merged `main` commit is independently recertified.

## Certified implementation head

`9397131afab3688749d57bcaa721e6eb858aef30`

This head completed **20/20 pull-request workflows SUCCESS with zero failures**.

Key evidence:

- Phase 6.1 — Companies Gate: run `34027280571` — SUCCESS.
  - Phase 6.1 contract — PASS
  - company model/service tests — PASS
  - full functional regression — PASS
  - database integrity — PASS
  - roadmap integrity — PASS
  - TypeScript — PASS
  - production build + asset budget — PASS
  - isolated Phase 6.1 preview + size budget — PASS
  - Real Chromium Companies acceptance — PASS
- Quality Gate: run `34027280503` — SUCCESS.
- Governance Gates: run `34027280555` — SUCCESS.
- WCAG Hardening Gate: run `34027280565` — SUCCESS.
- R2.0-9 Destruction & Reality QA: run `34027280467` — SUCCESS.
- Real Browser Acceptance: run `34027280543` — SUCCESS through Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, Destruction Wave 1, Destruction Wave 2 and Production Bridge.

## Product scope closed

- company list/search/filter/sort/pagination
- company create and edit
- stable create UUID / replay protection
- stale edit rejection
- merged-company read-only protection
- company details composed from authoritative workspace repositories
- related transactions and documents
- finance context without opening Phase 7
- contact context without opening Phase 6.2 relationship management
- activity and blocker/risk context
- explicit truncation truthfulness for bounded relationship reads
- Arabic-first search and Arabic/Persian digit capital parsing
- responsive/touch acceptance at 1280 / 430 / 390 / 360 / 320

## Defects closed during the stage

- Phase 6.1 was isolated from the frozen R2.0-6 preview instead of expanding historical bundle budgets.
- Live Companies is mounted only through the canonical production runtime.
- save-result navigation no longer races against a reload that detaches the return control.
- mobile company sort control satisfies the 44px touch contract.
- ambiguous Playwright selectors were scoped instead of changing the product to satisfy a test.

## Architecture preserved

- frozen R2 Records preview remains isolated from live Phase 6.1 implementation
- Legacy-Zero remains intact
- no direct Supabase client, ad-hoc fetch, localStorage or sessionStorage channel was introduced inside the Companies feature
- workspace-scoped Enjaz Data Layer remains the source of truth

## Locked boundaries

The following are **not** unlocked by this closure commit:

- Phase 6.2 — Lawyers / Contacts CRUD and relationship management
- Phase 6.3 — Company / Lawyer 360°
- Phase 7 — full Finance
- Phase 10 — document operations

## Transition rule

`exitGatePassed=true` and `unresolvedDefectCount=0` certify Phase 6.1 itself. `phase6_2Allowed` remains `false` until PR #81 is merged and the resulting canonical `main` commit passes post-merge Quality/Governance/Real Browser/deployment checks. Only a separate recertification record may set `phase6_2Allowed=true`.
