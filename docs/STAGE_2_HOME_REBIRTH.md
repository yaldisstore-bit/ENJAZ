# ENJAZ Stage 2 — Home / Dashboard Rebirth

Stage 2 is the first full product screen built on the clean UI Rebirth runtime.

## Approved reference translation

The Home screen follows the approved warm gold / charcoal / cream reference as a composition contract, not merely a palette:

- dominant warm-gold hero zone;
- compact light summary capsule embedded into the hero;
- intentionally asymmetric priority composition with unequal visual weights;
- deep-charcoal financial block;
- compact operational signal rows instead of a uniform card wall;
- integrated bottom navigation and central action inherited from the Rebirth Shell.

ENJAZ supplies the business meaning: active/urgent/stalled transactions, follow-ups, blockers, collection, outstanding value and ranked priorities.

## Data integrity

`RebirthHomeDashboard` consumes the typed `HomeDashboardLoadState` and `HomeDashboardSnapshot` contracts. `RebirthConnectedHomeDashboard` connects the new presentation to the preserved `useHomeDashboard()` hook. GitHub Pages uses a deterministic preview state so browser and external visual QA never depend on live workspace data.

The Home error state deliberately refuses to display guessed or partial metrics.

## Mandatory Stage 2 QA

Stage 2 extends — never replaces — the permanent Extreme QA chain with:

- `audit:ui-rebirth:home` — reference composition, semantics, state, route and real-data-adapter audit;
- `audit:ui-rebirth:home:selftest` — deliberate Home regressions that must all be rejected;
- real Chromium Home geometry on 360 / 390 / 412px Android-class viewports;
- dominant-priority asymmetry check;
- fixed-dock obstruction check at the bottom of Home;
- Home navigation behavior;
- zero WCAG A/AA violations through axe on each required viewport;
- the complete pre-existing Extreme QA, TypeScript, database, production build and asset-budget gates;
- post-merge GitHub Pages deployment followed by the Live External Gate against the public HTTPS application.

Stage 2 is not complete while any mandatory gate is pending or failed.
