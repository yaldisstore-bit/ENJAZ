# Phase 5.2 — Transaction Create/Edit ✅

Status: **CLOSED**. This document certifies Phase 5.2 only. **Phase 5.3 — Transaction Details / 360° remains not started until this closure is merged and canonical `main` is re-certified.**

## Closed scope

Phase 5.2 adds the authoritative create/edit path for transactions without opening Phase 5.3, Phase 5.4, Phase 5.5, full company/contact management, full finance, or workflow authoring.

Delivered and frozen behavior:

- Create and edit use one authoritative transaction editor contract through the authenticated workspace-scoped Data Layer.
- Public/CI preview behavior remains deterministic and isolated from production credentials and records.
- Company selection is mandatory and workspace-owned; a selected primary contact must be current, available, and related to that company.
- Transaction type is required; department, state, priority, current fee, completion date, station assignment, assignee, notes, and fee-change reason obey explicit validation rules.
- Status is limited to `active`, `stalled`, or `completed`; priority is limited to `low`, `normal`, `high`, or `urgent`.
- Monetary input accepts normalized Arabic/Persian digits while rejecting non-positive, imprecise, or JavaScript-unsafe values.
- Completed transactions require a valid non-future completion time; station history requires a valid non-future occurrence time.
- Archived/deleted transactions and completed reactivation are not mutated by Phase 5.2; lifecycle work remains Phase 5.4.
- Editing re-reads the authoritative transaction and rejects stale sources instead of overwriting a newer update.
- Station changes and notes are append-only facts. Historical routes/notes are not silently overwritten.
- A changed fee requires an explicit reason and appends a fee-change fact rather than silently erasing the prior financial fact.
- Companion-write failures or unknown outcomes are surfaced as warnings; the UI never claims an unproven all-or-nothing success.
- Global Create and the transaction-list edit path both enter the same authoritative editor.
- Loading, validation, saving, success, conflict, partial-write/outcome-unknown, and retry-safe states are explicit.
- Mobile/RTL presentation is retained inside the frozen UI V2 system with 44px-or-larger interactive controls and 16px form text to avoid mobile zoom/target failures.

## Real defect found and fixed before closure

The first full browser destruction pass exposed a genuine mobile interaction defect in the global-create editor: several controls rendered at only 40–42px high while the frozen contract requires at least 44px.

Affected controls included transaction type, department, current fee, current station, assignee, and station time.

The defect was fixed at the editor style contract using the existing design tokens (`--ez-control-h` / `--ez-touch-min`) rather than by weakening the test or adding arbitrary per-field dimensions.

Certified fix head: `74339f319e1e4b6a7a21079f15434733025c88b8`.

## Destructive and regression evidence

Dedicated **ENJAZ Phase 5.2 — Transaction Create/Edit Gate** run `33946358543` completed successfully on the certified fix line and proved:

- Phase 5.2 architecture audit ✅
- dedicated transaction-editor model/service tests **12/12** ✅
- complete functional regression suite **91/91** ✅
- frozen UI V2 boundary, visual DNA, and UI-4 → UI-10 cumulative gates ✅
- Phase 4.2 / 4.3 / 4.4 and Phase 5.1 cumulative guards ✅
- secrets audit and roadmap integrity ✅
- database audit and destructive DB selftests ✅
- TypeScript and production build ✅
- strict production asset budget ✅
- real Chromium create/edit destruction ✅
- desktop and narrow Android-sized viewport validation ✅
- global-create and transaction-list edit entry validation ✅
- mobile touch geometry with no sub-44px editor controls ✅
- no horizontal overflow, console errors, or page errors in the Phase 5.2 reality scenarios ✅
- evidence artifact `9963457065` uploaded; digest `sha256:0cbea0e11c94da1dd7e0119613543fb47d96a8d53d9d640f4e6f8c7bd5b3c645` ✅

The same certified line also passed the cumulative repository gates:

- `ENJAZ Quality Gate` run `33946358585` ✅
- `ENJAZ Real Browser Acceptance` run `33946358556` ✅
- `ENJAZ Phase 5.1 — Transaction List & Search Gate` run `33946358530` ✅
- `ENJAZ Phase 4.4 — Home Destruction Gate` run `33946358529` ✅
- `ENJAZ Phase 4.3 — Executive Briefing Reality Gate` run `33946358547` ✅

## Permanent regression protection added for closure

The closure line additionally makes Phase 5.2 cumulative rather than disposable:

- canonical `ENJAZ Quality Gate` now requires the Phase 5.2 architecture audit and dedicated model/service tests;
- canonical `ENJAZ Real Browser Acceptance` now retains the Phase 5.2 architecture guard and the transaction-editor real-browser reality test;
- `verify:extreme` now explicitly retains `test:phase5-2`;
- the QA stage contract self-audits the Phase 5.2 workflow, cumulative quality/browser tokens, dedicated tests, and evidence paths so a later phase cannot silently weaken them.

These closure-hardening changes must themselves pass the same cumulative gates before merge.

## Closure rule

Phase 5.2 is not considered landed in the product until this PR is mergeable, all final closure-head checks are green, the PR is merged into canonical `main`, and the resulting `main` commit is re-certified by the cumulative gates.

Only after that canonical re-certification may **Phase 5.3 — Transaction Details / 360°** begin. Phase 5.4 lifecycle actions and Phase 5.5 transaction destruction remain locked behind their own roadmap order.
