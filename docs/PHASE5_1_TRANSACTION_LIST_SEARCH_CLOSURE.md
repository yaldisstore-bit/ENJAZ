# Phase 5.1 — Transaction List & Search ✅

Status: **CLOSED**. This document certifies Phase 5.1 only. **Phase 5.2 — Transaction Create/Edit remains not started.**

## Closed scope

Phase 5.1 replaces the former static transaction showcase with the canonical transaction directory surface while preserving the frozen UI V2 and Data Layer boundaries.

- Live transaction data resolves the authenticated workspace through `EnjazDataLayerFactory` and workspace-scoped repositories.
- Public/CI preview data remains deterministic and isolated from production credentials and records.
- Three explicit views are supported: current, stalled/delayed, and archived/closed.
- Deleted transactions never enter list counts, search results, or visible pages.
- Search is normalized for common Arabic character and diacritic variants and covers transaction identity, legacy id, type, department, status, priority, and company label.
- Sorting is deterministic by latest activity, creation date, and fee ascending/descending.
- Client pages default to 20 rows and are hard-bounded to 50 rows.
- The authoritative source loader fails closed above 5,000 non-deleted transactions instead of silently presenting a partial workspace result.
- Missing company relations are surfaced explicitly as unavailable data rather than fabricated labels.
- Unsafe monetary values are never formatted as precision-safe exact facts.
- Loading, ready, error, retry, empty, long-text, narrow-screen, touch, and reduced-motion behavior remain explicit.
- A stable saved-view integration contract is frozen as `enjaz.transactions.list.v1`; it persists view/search/sort/page-size and intentionally excludes ephemeral page navigation. Full Smart Saved Views remain Phase 9.2.

## Destructive and regression evidence

Pre-closure certified head: `5cf81aac4e527fc34ca1a7a03a148f083bb4ce60`.

Dedicated **ENJAZ Phase 5.1 — Transaction List & Search Gate** run `33944168202` completed successfully and proved:

- Phase 5.1 architecture gate ✅
- dedicated transaction functional/destructive tests **15/15** ✅
- complete functional regression suite **79/79** ✅
- UI V2 boundary, visual DNA, UI-4 → UI-10 cumulative freeze ✅
- Phase 4.2 / 4.3 / 4.4 cumulative architecture regressions ✅
- secrets audit and roadmap integrity ✅
- TypeScript and production build ✅
- strict production asset budget ✅
- real Chromium transaction destruction on 1280 / 430 / 390 / 360 / 320 widths ✅
- pagination, Arabic/company search, stalled/archived switching, sorting, missing relation, unsafe-money and long-query behavior ✅
- evidence artifact `9962794607` uploaded ✅

The same head also passed:

- `ENJAZ Quality Gate` run `33944168233` ✅
- `ENJAZ Real Browser Acceptance` run `33944168217` ✅
- `ENJAZ Phase 4.4 — Home Destruction Gate` run `33944168249` ✅
- `ENJAZ Phase 4.3 — Executive Briefing Reality Gate` run `33944168195` ✅

## Closure rule

This closure does not start transaction creation/editing, 360° details, lifecycle actions, or the Phase 5.5 full transaction destruction gate. Those remain Phase 5.2, 5.3, 5.4, and 5.5 respectively.

The closure commit must be re-certified through the cumulative PR gates and then merged into canonical `main`. After that merge, **Phase 5.2 — Transaction Create/Edit** becomes the next permitted product subphase and remains not started until explicitly begun.
