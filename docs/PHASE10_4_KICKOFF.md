# Phase 10.4 — Reports & PDF — Kickoff

**Status:** IN PROGRESS  
**Base:** `94cbec8143aaf95664da091781e82936357ff9ae`  
**Predecessor:** Phase 10.3 — CLOSED  
**Successor:** Phase 10.5 — LOCKED until Phase 10.4 closure

## Objective

Phase 10.4 turns ENJAZ reporting and PDF output into one deterministic, professional and testable rendering contract. Existing authoritative report facts stay authoritative; this phase owns layout planning and output safety, not a new shadow data source.

## Non-negotiable output rules

1. Screen/export/print/PDF must derive from the same authoritative report snapshot.
2. Pagination must be deterministic for the same snapshot and layout profile.
3. A page may never be emitted blank merely because a block did not fit.
4. Body content may never enter reserved footer, signature or identity zones.
5. Oversized content must either split according to an explicit rule or fail closed; silent clipping is forbidden.
6. Arabic/RTL text, long names and dense tables must remain printable without horizontal escape.
7. Footer and page-number geometry must be reserved before body pagination.
8. Signature areas must remain intact and cannot be split across pages.
9. QR/barcode identity must be stable, bounded and derived from canonical report/document identity rather than mutable presentation text.
10. Existing Phase 7.4 Financial Reports and Phase 10.3 official document rendering are inputs to consolidation, not parallel permanent PDF engines.
11. Source records may never be mutated by rendering.
12. Frozen JavaScript/CSS budgets remain unchanged.

## Foundation stage

The first implementation stage adds a shared `reportPdfContract` with deterministic page planning, reserved-zone safety and stable report identity. Destruction tests cover blank-page prevention, footer/signature overlap, oversized blocks, long tables, deterministic replay and unsafe identity input.

## Exit evidence required later

- contract/destruction tests;
- integration with existing financial reports;
- integration/reconciliation with official document rendering;
- real Arabic/RTL multi-page PDF evidence;
- signatures + footer + QR/barcode verified on real output;
- Real Browser/mobile print-preview journey;
- exact-main quality/build budgets;
- Pages + Live External certification;
- zero Critical, High and functional blockers.
