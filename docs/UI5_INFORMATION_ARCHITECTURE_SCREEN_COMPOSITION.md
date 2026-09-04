# UI-5 — Information Architecture & Screen Composition

Status: closure evidence for the independent `ENJAZ UI/UX REBIRTH V2` roadmap.

## Purpose

UI-5 defines how ENJAZ information is composed before UI-6 turns the core surfaces into product screens. It changes presentation hierarchy only; it does not change domain facts, repositories, Supabase behavior, auth/session contracts, permissions or business rules.

The approved reference library in `docs/UI_REBIRTH_REFERENCE_MAP.md` remains the visual-composition source of truth. UI-5 converts those references into typed, testable ENJAZ composition rules instead of relying on ad-hoc screen styling.

## Information architecture contract

`src/ui-v2/architecture/compositionContract.ts` maps 12 information kinds to 12 intentional presentation patterns:

| Information kind | Required presentation pattern |
|---|---|
| decision | focal-zone |
| metric | metric-cluster |
| money | ledger |
| work-item | dense-row |
| timeline-event | timeline |
| relationship | relationship-cluster |
| workflow-step | step-progression |
| document | document-browser |
| trend | trend-panel |
| activity | activity-stream |
| form | focused-form |
| state | editorial-state |

Each rule also contains `must` and `never` clauses. Explicitly rejected anti-patterns include equal KPI grids, stacked generic white-card walls, one oversized card per transaction, file-card walls, charts without an operational conclusion and making Command Center use the same composition as Home.

## Screen family map

The contract maps 12 ENJAZ screen families to the approved reference families:

1. Home — warm yellow + charcoal asymmetric dashboard.
2. Daily Work — date strip + operational timeline + next-task emphasis.
3. Transaction List — search/filter + dense scan-friendly records.
4. Transaction 360 — status/progression + activity + relationships.
5. Companies/People — search/profile/relationship composition.
6. Finance — cobalt balance/trend + ledger movements.
7. Analytics — gold/violet/deep-navy interpretive trend composition.
8. Workflow — ordered step progression with one current stage.
9. Operations — dense workload/schedule/ownership composition.
10. Command Center — dark executive intervention composition, intentionally distinct from Home.
11. Documents — category/list/detail document browser.
12. Notifications/Follow-ups — time/priority grouping with dense action rows.

## Live composition atlas

`src/ui-v2/runtime/CompositionAtlas.tsx` renders 10 interactive proof compositions inside the real UI V2 AppShell:

- Home
- Daily Work
- Transaction List
- Transaction 360
- Finance
- Analytics
- Workflow
- Operations
- Command Center
- Documents

The atlas is not the final UI-6 product implementation. Its role is to prove that each information family has a deliberate composition language before the core screens are wired as final product surfaces.

## Responsive composition grammar

`src/ui-v2/styles/composition.css` defines desktop and phone behavior without flattening every family into the same mobile card stack. It includes dedicated rules for asymmetric Home, timeline-driven Daily Work, dense transaction rows, ledger finance, analytics trends, workflow steps, operations board/schedule, executive Command Center and category/list/detail documents.

Target reality sizes:

- 1280×900
- 430×932
- 390×844
- 360×740
- 320×700

Mobile touch targets remain at least 44px.

## Real Reality Gate

`src/ui-v2` is tested through a real Vite runtime and Playwright Chromium, not by static file inspection alone.

`scripts/ui5-reality-test.mjs` performs the following on all five target sizes:

- navigates through all 10 live composition families;
- requires at least 7 distinct composition signatures so the atlas cannot silently collapse into one template;
- verifies persistent AppShell bottom navigation;
- rejects horizontal overflow;
- rejects console and page errors;
- rejects user-facing developer/audit terminology;
- verifies mobile touch targets;
- verifies compact transaction rows do not regress into oversized cards;
- verifies Finance contains ledger movements and a trend panel;
- verifies Command Center retains its dark executive focal composition;
- verifies Workflow has exactly one current stage.

Desktop geometry additionally verifies:

- Home lead zones are deliberately asymmetric;
- Daily Work does not collapse into equal panels;
- Documents preserve category/list/detail hierarchy.

Mobile geometry additionally verifies that critical focal actions remain above the fixed dock in the initial viewport:

- Home: `فتح المعاملة`
- Daily Work: `بدء المهمة`

## Defects caught during UI-5

### 1. UI-4 structural regression gate was tied to a temporary preview name

The inherited UI-4 audit required the literal `ShellPreview` string in `UiV2Root`. When UI-5 advanced the active runtime to `CompositionAtlas`, UI-4 failed even though the AppShell itself was preserved.

**Fix:** UI-4 audit now checks whether the active runtime is AppShell-backed rather than requiring a specific temporary preview component. The previous stage gate therefore remains cumulative and meaningful.

### 2. Manual screenshot review found fixed-dock occlusion missed by the first green UI-5 gate

The first UI-5 Chromium run passed automated checks, but manual review of the 320px evidence showed a real visual defect:

- Home: the fixed dock covered the focal action area.
- Daily Work: `بدء المهمة` was almost completely hidden behind the dock.

This was treated as a stage failure despite the green automated result.

**Fix:** mobile composition order was changed so the critical action appears earlier in the focal zone and remains visibly above the fixed dock. The Reality Gate was strengthened with geometric dock-occlusion checks so this defect cannot return silently.

### 3. UI-4 navigation regression test became ambiguous after UI-5 added the workspace switcher

UI-5 introduced legitimate screen-switch buttons with labels such as `الرئيسية`, `اليوم`, `العمليات` and `المالية`. The inherited UI-4 browser test used page-global button lookup, which could confuse the new switcher with Bottom Dock navigation.

**Fix:** UI-4 regression interaction is now scoped explicitly to `[data-shell-part="bottom-dock"]`. This makes the older gate more precise rather than weakening it.

## Closure evidence

Final implementation head before documentation closure: `b2f3f358dd3c448a87c157ec10ec33ebed7e9177`.

On that head:

- UI-1 boundary gate: PASS (`33879623884`)
- UI-3 component Reality Gate: PASS (`33879623902`)
- UI-4 App Shell Reality Gate: PASS (`33879623885`)
- UI-5 Composition Reality Gate: PASS (`33879624029`)
- 46 functional regression tests: PASS
- TypeScript: PASS
- production build: PASS
- real Chromium at 1280/430/390/360/320: PASS
- manual review of the final screenshot evidence: PASS after the critical CTA occlusion correction

The final documentation/roadmap closure commit must pass the same cumulative gates before merge.

## Exit

UI-5 is eligible to close only after the documentation/roadmap closure head passes UI-1, UI-3, UI-4 and UI-5 gates together. After merge, the next independent UI/UX stage is **UI-6 — Core Screens Rebirth**. The original Master Roadmap remains untouched and **Phase 4.2 stays on HOLD** until UI/UX Rebirth V2 is fully frozen.
