# Phase 13.1-A2 — Quarantine Review Manifest — Kickoff

**Status:** IN PROGRESS  
**Base A1 certificate:** Gate #3 / `35393731218` — PASS on `c3d6a12fdb2ce227568f0fbcb8ff79844368cc77`  
**Successor:** Phase 13.2 — Normalize & Map — LOCKED

## Objective

Turn the A1 structural inventory into a deterministic **review manifest** without creating any source→ENJAZ mapping authority.

## Exact-label law

A legacy type is recognized for review only when its exact string appears in a caller-supplied allowlist for the current snapshot.

A2 forbids:
- case folding;
- whitespace normalization;
- alias inference;
- Arabic/English synonym guessing;
- target-system assignment;
- target-entity assignment.

A recognized legacy type is still only `RECOGNIZED_FOR_REVIEW`. It receives `targetSystem=null`, `targetEntity=null`, and `mappingPerformed=false`.

Any observed type not explicitly declared is `QUARANTINED_UNKNOWN`.

## Review issues

A2 emits only:
- `UNKNOWN_LEGACY_TYPE`;
- `DUPLICATE_RECORD_KEY`;
- `DANGLING_LINK`.

These are review evidence only. A2 cannot repair, merge, normalize, persist, import, or generate a write plan.

## A1 certificate preserved

- Phase 13.1 Gate #3 / `35393731218`: PASS.
- A1 tests: **10/10 PASS**.
- functional regression: **219/219 PASS**.
- DB self-test: **25/25 PASS**.
- frozen build: **431032 / 670000 initial JS; 759568 / 760000 total JS; 179989 / 180000 CSS**.

## Successor lock

**Phase 13.2 remains LOCKED.**
