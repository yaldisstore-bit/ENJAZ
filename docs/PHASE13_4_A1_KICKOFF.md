# Phase 13.4 — Reconciliation — A1 Read-only Expectation Plan

**Status:** IN_PROGRESS / A1 implementation.
**Exact predecessor:** final Phase 13.3 formal closure merged as `ee14330d5aa5d4da51b7e5d5c7fe7b4d64dae584` with 43/43 exact-main workflows SUCCESS (including cumulative Real Browser, Pages, Live External and Published Portal).
**Successor:** Phase 13.5 — Import Destruction Gate — LOCKED.

## Practical purpose

A successful SQL import alone is not proof that every mapped source record is present in the right workspace with the right identity and relationships. Reconciliation will compare a certified 13.3 import manifest and its durable import ledger with an independently authenticated, workspace-scoped readback of actual target rows. No mismatch may be silently fixed.

## A1 boundary — expectations, not an attestation

A1 consumes **only** the strictly parsed, explicit Phase 13.3 execution manifest. It constructs a deterministic, bounded, read-only expectation list for the three certified target tables in `contacts → companies → transactions` order.

Each expectation carries the original source key, caller-supplied target UUID, exact workspace/batch context, `legacy_source = phase13.3`, mapped normalized fields, and the explicitly declared target UUIDs for its relationships. The plan reports expected counts and number of relationships. It reuses all Phase 13.3 manifest validation (duplicate IDs, malformed or undeclared fields, tampered stage/ordinal, unauthorized relations, unsafe numeric precision) and additionally denies multiple claims for one FK field.

A1 **does not read Supabase**, accept unverified client readback as fact, attest that import occurred, persist plans, alter imported source/target records, create tables/RPCs, issue secrets, add UI, repair mismatches, or open a new import capability. A1's `eligibleForA2Readback` means only that the expectation plan is structurally usable by the next slice. A1 is not Phase 13.4 certification.

## Required next slices

- **A2 authenticated evidence acquisition:** use the caller's own permission and workspace scope to read the exact import job and target rows; bind result to workspace, batch, idempotency and source lineage; reject incomplete/partial pagination or inconsistent snapshots. Source-proof and permission checks must live on the server/DB boundary, never a caller-provided verified flag.
- **A3 exact comparison and fail-closed reporting:** compare expected and observed counts, source identity, UUIDs, company/contact foreign keys, monetary values with exact cent-safe precision, important lifecycle/status values and duplicate/replay ledger behavior. Unknown concepts, unavailable source facts and non-mapped M1–M18 fields remain explicitly outside equivalence claims. Differences require human review; no automatic update/delete/reimport.
- **Destruction and closure:** malformed/duplicate/orphan/cross-workspace/missing-row/partial-read/failure/replay scenarios, authenticated Real Cloud and zero test residue, full regressions, exact-head CI, exact-main plus deployed-live checks. Only after all Product, UI/UX, Engineering and Certification tracks PASS may 13.4 close and 13.5 unlock.

## Frozen budgets and preservation

Initial JS 670000 bytes, total JS 760000 bytes, CSS 180000 bytes. No cap increase, approved feature removal, old UI DNA or new client surface in A1. Preserve Phase 13.1 intake, 13.2 mapping and 13.3 owner-authenticated atomic import without loosening their authority or replay laws.
