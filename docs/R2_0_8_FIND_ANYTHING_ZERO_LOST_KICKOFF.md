# ENJAZ Rebirth 2.0 — R2.0-8 Find Anything & Zero-Lost UX Kickoff

Status: **ACTIVE**

Branch: `r2-0-8-find-anything-zero-lost`

R2.0-8 starts only after the formal closure and merge of R2.0-7 Operational Intelligence.

## Goal

Make every major capability and discoverable record easy to find without memorizing where it lives, while preserving the approved Rebirth 2.0 identity and all previously closed stages.

## Hard scope

- feature aliases and Arabic-normalized discovery,
- record discovery through explicit bounded providers,
- one canonical destination for every result,
- search-result navigation and exact back restoration,
- proof that every major capability is reachable from Home in at most 3 deliberate actions,
- hidden primary navigation count = 0,
- duplicate canonical homes count = 0,
- back-path failures = 0.

## First implementation pass

1. Replace the shell-only search matcher with a reusable Find Anything search model.
2. Add robust Arabic normalization and deterministic scoring.
3. Add transaction-record discovery from the existing isolated preview source without claiming production data.
4. Keep feature results mapped only to the frozen canonical destination registry.
5. Add machine guards and real-browser tests before any closure claim.

## Truthfulness boundary

The parallel R2 preview may search its explicit preview record source for browser proof, but it must not claim that those records are production data. Production record discovery must later bind through the authoritative Data Layer without introducing an ad-hoc persistence or fetch channel.

## Frozen boundaries

- Golden Experience stays approved and frozen.
- R2.0-5 Core Work stays CLOSED.
- R2.0-6 Records & Relationships stays CLOSED.
- R2.0-7 Operational Intelligence stays CLOSED.
- Canonical runtime remains `ui-v2`.
- Phase 5.5 remains locked.
- No canonical promotion before R2.0-11.
- No legacy presentation imports into `src/ui-r2`.

## Exit gate

R2.0-8 may close only when feature aliases, record discovery, canonical navigation, <=3-action reachability, no-hidden-door proof, duplicate-home proof, and back restoration all pass in real browsers across 1280 / 430 / 390 / 360 / 320, with a concrete evidence manifest and zero unresolved Zero-Lost failures.
