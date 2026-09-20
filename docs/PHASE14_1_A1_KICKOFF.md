# Phase 14.1 — Cross-domain Journeys — A1 kickoff

**Status:** IN_PROGRESS / A1 SOURCE INVENTORY ONLY. The A1 contract is not a Real Cloud, Real Browser or product-delivery certificate.
**Exact certified predecessor main:** `0df2dd9d8c8ec232c7dd49a516da7a436224871a` (Phase 13.5 formal closure PR #223).
**Predecessor post-merge:** 43/43 successful Actions, including Phase 13.5 destructive gate, cumulative Real Browser, Pages Preview, published /live and published authenticated Client Portal. `docs/PHASE13_5_POSTMERGE_RECERTIFICATION.md`.
**Successor:** Phase 14.2 LOCKED until Phase 14.1 is separately implemented, fully certified, merged, and formally closed.

## Scope

Connect already existing authoritative domain services into *one permission-consistent end-to-end user journey*, without manufacturing a second source of truth. The target route is:

company → transaction → government procedure / workflow → assigned field and office work → follow-up → payment / receipt → document / report → explicitly authorized client visibility → archive / restore. Where the business case requires it, add ownership/representation governance and engagement/retainer contract.

The canonical **11 existing source entry points** and **14 adversarial checks** are recorded in `docs/PHASE14_1_JOURNEY_MATRIX.json`. A1 verifies that those files and their actual symbols exist and fail-closed source coverage cannot silently disappear. The gateway inventory is *not* an assertion that these services already constitute an integrated, authenticated, durable multi-domain journey.

## A1 source deliverables

- A machine-readable exact-source inventory, with source path, existing entry point, and two distinct intended behavioral evidence obligations per journey node.
- Permanent A1 audit and negative tests for missing/renamed source, incomplete journey, duplicate IDs, removed adversarial checks, weakened permission guards, and premature phase/successor certification.
- An independent 13.5 exact-main post-merge certificate accepted by historical tests only when exact SHA, 43/43 result, deployed-live run IDs, immutable source evidence and production safety checks agree.
- No new database migration, new edge function, new write RPC, browser UI feature, imported business record, or change to production data in this slice.

## Later gates (not yet passed)

A2 must execute the actual integrated journey with **real authenticated users** in isolated Supabase, checking positive and negative workspace/member/client permission, durable create → read → refresh, money/reversal, duplicate retries, field offline and cleanup with zero residue. A3 must verify the same integrated journey in real Chromium at 1280/430/390/360/320 and Android keyboard/back/network recovery, including the published Client Portal and source provenance. No mock-only or source-only A1 result may close 14.1 or unlock 14.2.

Phase 14.1 may be marked CLOSED only after complete four-track certification, the complete exact-head source and real-user cloud/browser matrix, successful merge, exact-main Pages/Live External recertification and a separate formal closure decision. Production must never be a destructive test target.
