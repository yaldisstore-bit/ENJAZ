# Phase 5.4 — Archive / Restore / Lifecycle ✅

Status: **CLOSED**. This document certifies Phase 5.4 only. **Phase 5.5 — Transaction Destruction Gate remains locked until this closure is merged and canonical `main` is re-certified.**

## Closed scope

Phase 5.4 delivers safe transaction lifecycle mutation without opening delete/purge, Finance authority, Workflow mutation, or the final Phase 5.5 destruction gate.

Delivered and frozen behavior:

- Archive uses the existing `archived_at` field and never invents an illegal `status = archived` value.
- Restore clears `archived_at` while preserving the transaction's underlying `active` / `stalled` / `completed` state.
- Reactivate is a separate explicit action that returns a completed transaction to `active`, clears `completed_at`, and clears `archived_at` when present.
- Deleted transactions fail closed and cannot enter lifecycle mutation.
- Lifecycle mutation re-reads the authoritative transaction and rejects stale contexts instead of overwriting newer state.
- Open follow-ups are counted and preserved; archive suppresses them through the authoritative inactive-parent rules rather than deleting or bulk-rewriting history.
- Notes, routes, payments, fee history, follow-ups, and prior activity remain intact across lifecycle transitions.
- Lifecycle evidence is appended through `transaction_activity`; company/contact `entity_lifecycle_events` is not misused for transactions.
- If the core lifecycle mutation succeeds but the activity write outcome cannot be confirmed, the UI reports an explicit warning instead of claiming a false clean success.
- The live lifecycle surface resolves the current authoritative record before showing legal actions.
- Archive / Restore / Reactivate have separate confirmation copy and state-specific availability.
- The transaction 360° surface remains read-only; lifecycle mutation lives in the separate Phase 5.4 management surface.
- Full Finance operations remain Phase 7 and full Workflow management remains Phase 8.
- Public/CI lifecycle fixtures remain deterministic and isolated from live authenticated records and secrets.
- Mobile/RTL/reduced-motion behavior remains inside frozen UI V2 and preserves 44px-or-larger interactive geometry.

## Real defects found and fixed before closure

### Stale Phase 5.3 lifecycle copy

The cumulative Phase 5.3 guard still expected the historical message that restore was unavailable. Phase 5.4 correctly makes lifecycle mutation available outside the read-only 360° sheet, so the guard was corrected to preserve the real boundary: 360° stays read-only while the separate lifecycle surface owns mutation.

### Exact optional TypeScript contract

The lifecycle confirmation dialog passed an optional property as explicit `undefined` under `exactOptionalPropertyTypes`. The dialog call was corrected to satisfy the strict type contract without weakening TypeScript settings or tests.

### Production JavaScript budget boundary

Phase 5.4 increased measured production JavaScript to 664,251 bytes, exceeding the previous 650,000-byte raw JS cap while all gzip, total-dist, CSS, file-count, source-map, and single-asset limits remained green. The raw JS ceiling was adjusted narrowly to 670,000 bytes rather than broadly relaxing production limits; all other production budget guards remain unchanged.

### Confirmation exit-animation ghost

Manual inspection of successful Chromium evidence found a visible exit-state flash: after a successful lifecycle action the confirmation dialog began its 180ms exit animation after `confirmAction` had already been cleared, so its title could momentarily fall back to generic confirmation copy.

The lifecycle surface now retains the confirmed action identity during the exit state, and the Chromium evidence gate waits for the confirmation overlay to leave before capturing the final screenshot. The corrected evidence was re-run and manually inspected before closure.

## Destructive and regression evidence

Certified pre-closure head: `b49927d6d3a037fbb78eb5bd0ea639535c71e5e8`.

Dedicated **ENJAZ Phase 5.4 — Archive / Restore / Lifecycle Gate** run `33955819739` completed successfully and proved:

- Phase 5.4 architecture audit ✅
- dedicated lifecycle model/service tests **16/16** ✅
- complete functional regression suite **118/118** ✅
- frozen UI V2 boundary, visual DNA, and cumulative UI gates ✅
- cumulative Phase 4.2 / 4.3 / 4.4 and Phase 5.1 / 5.2 / 5.3 guards ✅
- secrets audit and roadmap integrity ✅
- database audit and destructive DB selftests ✅
- strict TypeScript and production build ✅
- strict production asset budget ✅
- real Chromium Archive / Restore / Reactivate destruction ✅
- responsive coverage at **1280 / 430 / 390 / 360 / 320px** ✅
- long mixed Arabic/Latin text and narrow-phone geometry ✅
- 44px touch-target, horizontal-overflow, console-error, and page-error guards ✅
- modal-layer ownership above fixed Top Bar / Bottom Dock ✅
- settled post-confirmation screenshot evidence after animations ✅

Evidence artifact: `9966337167` with digest `sha256:43e16a763e7e43a63c3e8dbace1a950c2d1732e6f796d2a1faf8e677096d5ac4` ✅.

The same certified head also passed the cumulative repository gates:

- `ENJAZ Quality Gate` run `33955819741` ✅
- `ENJAZ Real Browser Acceptance` run `33955819735` ✅
- `ENJAZ Phase 5.3 — Transaction Details / 360° Gate` run `33955819740` ✅
- `ENJAZ Phase 5.2 — Transaction Create/Edit Gate` run `33955819802` ✅
- `ENJAZ Phase 5.1 — Transaction List & Search Gate` run `33955819734` ✅
- `ENJAZ Phase 4.4 — Home Destruction Gate` run `33955819788` ✅
- `ENJAZ Phase 4.3 — Executive Briefing Reality Gate` run `33955819738` ✅

## Permanent regression protection added for closure

Phase 5.4 is cumulative rather than disposable:

- canonical `ENJAZ Quality Gate` requires the Phase 5.4 architecture audit and dedicated model/service tests;
- canonical Phase 5.4 workflow retains full cumulative UI, Phase 4, Phase 5.1/5.2/5.3, database, TypeScript, production-build, budget, and real-Chromium gates;
- canonical browser acceptance continues to protect frozen UI V2 and the cumulative transaction stack;
- functional regression includes the lifecycle model/service tests permanently;
- Daily Work inactive-parent suppression remains guarded at the authoritative repository-query layer;
- the lifecycle architecture audit locks legal archive/restore/reactivate semantics, stale/deleted safeguards, UI confirmation, 44px geometry, long-text wrapping, and Phase 5.5 / Finance / Workflow boundaries.

These closure-hardening changes must themselves pass the same cumulative gates before merge.

## Closure rule

Phase 5.4 is not considered landed in the product until PR #54 is mergeable, all final closure-head checks are green, the PR is merged into canonical `main`, and the resulting `main` commit is re-certified by the cumulative gates.

Only after that canonical re-certification may **Phase 5.5 — Transaction Destruction Gate** begin. Phase 6 remains locked behind completion of Phase 5 as a whole.
