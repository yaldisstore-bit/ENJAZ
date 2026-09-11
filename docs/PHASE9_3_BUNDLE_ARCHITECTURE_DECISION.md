# Phase 9.3 — Runtime Bundle Architecture Decision

**Decision:** preserve the existing `670000`-byte JavaScript ceiling as the hard **initial application graph** budget and move domain portals behind real route-demanded code splitting. Add separate guards for total shipped JavaScript and individual lazy chunks.

## Why this is not a budget increase

The historical runtime had no meaningful dynamic feature boundary, so total JS and initial JS were effectively the same number. Phase 9.3 requires substantial M2 capability. Deleting approved product capability merely to keep all future features inside the startup graph would violate `ENJAZ_NON_NEGOTIABLE_RULES.md`.

The governing performance contract is therefore made explicit:

- initial application JS graph: **<= 670000 bytes** — unchanged ceiling;
- all shipped JS: **<= 760000 bytes** — new secondary whole-dist guard, not startup allowance;
- any one lazy JS chunk: **<= 140000 bytes**;
- existing raw-dist, CSS, gzip, file-count, single-asset and source-map guards remain active;
- no approved feature may be removed merely to satisfy a bundle number;
- code splitting may only defer code that is not required for the current destination; it may not defer authority/security checks that must run before access.

## First migration

The Companies, People and Finance production portals are loaded only when their live destination is active. Their feature behavior, Data Layer, RLS, command authority and existing public route semantics remain unchanged. A Vite manifest makes the initial graph machine-auditable rather than guessing by filename.

## Acceptance

This decision is accepted only if exact-head CI proves TypeScript, regressions, the Phase 9.3 gate and both root + `/ENJAZ/live/` budgets. If lazy loading causes a functional/visual regression, it is reverted or repaired; the budget model may not hide the regression.
