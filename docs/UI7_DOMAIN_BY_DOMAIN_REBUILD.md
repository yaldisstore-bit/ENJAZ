# UI-7 — Domain-by-Domain Rebuild

Status: closure evidence for the independent `ENJAZ UI/UX REBIRTH V2` roadmap.

## Purpose

UI-7 rebuilds the presentation language of ENJAZ domain surfaces without advancing or rewriting the original product roadmap. The original `ENJAZ_MASTER_ROADMAP.md` remains frozen at **Phase 4.2 — Daily Work / Universal Inbox** while UI/UX Rebirth V2 is active.

This stage changes presentation and interaction composition only. Authoritative database, domain, data, auth/session, Supabase, repository and business-rule boundaries are preserved.

## Domain architecture delivered

UI-7 registers 12 typed presentation destinations:

1. Transactions — pipeline + dense operational queue.
2. Companies — entity profile + relationship map.
3. People/Lawyers — people directory + activity.
4. Finance — ledger + aging/collection hierarchy.
5. Workflow — stage lanes + transitions.
6. Automation — rule stack + execution health.
7. Operations Center — operational pulse + ownership.
8. Command Center — executive focus + cross-domain decisions.
9. Risk / Saved Views / Insights — risk map + saved operational views.
10. Documents / Vault / Reports — category + list + detail.
11. Follow-ups / Notifications — attention inbox + timeline.
12. Copilot — context-bound assistant surface.

The composition signatures remain internal metadata/test contracts. They are not rendered as user-facing terminology.

## Core-to-domain navigation contract

The first UI-7 implementation placed the complete Domain Rail above Home/Today. Real browser regression tests proved that this consumed critical vertical space on narrow phones and pushed core actions toward or under the fixed Bottom Dock.

The final architecture deliberately removes that rail from Core surfaces:

- Home, Today, Operations and Finance core views remain rail-free.
- The ENJAZ brand in the Top Bar is the single **Domain Explorer** trigger.
- Domain Explorer groups all 12 destinations into a viewport-safe Sheet.
- After entering a domain, the horizontal Domain Rail becomes available inside domain runtime for fast switching.
- Returning to Core removes the Domain Rail again.
- Search, Notifications and Account remain the three top-bar action controls; Domain Explorer does not add a fourth crowded icon.

This preserves the premium Core hierarchy instead of sacrificing it for permanent navigation chrome.

## Domain Explorer viewport contract

The Explorer uses a dedicated scoped Sheet contract:

- maximum height is tied to the visual viewport;
- Sheet padding is included inside the maximum height via `border-box`;
- title/close chrome remains stable;
- only the Sheet body scrolls;
- overscroll is contained;
- all 12 destinations remain available;
- narrow-phone controls remain at least 44px.

The first geometry test initially measured the Sheet during its entrance translation. The final test waits for the normal entrance motion to settle and then applies the same strict viewport-bound assertion with no extra overflow allowance.

## Real browser Reality Gate

`scripts/ui7-reality-test.mjs` runs against a real Vite runtime and Chromium at:

- 1280×900
- 390×844
- 320×700

For every profile it verifies:

1. Core Home loads without Domain Rail.
2. ENJAZ brand exposes the Domain Explorer trigger.
3. Domain Explorer opens and exposes all 12 destinations.
4. Explorer Sheet settles entirely inside the viewport.
5. Transactions opens from the Explorer.
6. In-domain Domain Rail appears only after entering a domain.
7. All 12 domains are visited in the browser.
8. Every domain exposes its expected composition signature.
9. Documents category interaction works.
10. Command Center preserves its dark executive treatment.
11. Companies preserve focal hierarchy on desktop.
12. Mobile buttons remain at least 44×44px.
13. There is no horizontal page overflow.
14. Returning to Core removes the Domain Rail and preserves the Bottom Dock.
15. Explorer can be reopened and closed after returning.
16. Console and page errors remain zero.

Screenshots are captured for Core, Explorer, Transactions, Workflow, Command, Documents and Copilot on all three profiles.

## Defects caught and fixed during UI-7

### 1. TypeScript defect in People directory

The first implementation failed TypeScript before browser testing.

**Fix:** corrected the People-directory typing and reran the full gate rather than bypassing the compiler failure.

### 2. UI-4 regression test ambiguity after domain vocabulary expanded

Adding domain labels introduced another visible `الإشعارات` target and an older UI-4 selector became ambiguous.

**Fix:** scoped the existing shell test to the Top Bar notification control. The user interaction requirement was not weakened.

### 3. Undersized `العودة للأساسية` touch target

Chromium measured the first domain-return control at roughly 32px on mobile.

**Fix:** promoted the return action to the 44px mobile touch contract and kept that rule in regression coverage.

### 4. Domain Rail damaged Home/Today vertical geometry

The initial always-visible rail caused real dock-clearance failures, including Home `فتح المعاملة` and Today `بدء المهمة` on narrow phones.

**Fix:** rejected repeated spacing reductions as a patching strategy. Reworked navigation structurally so Core surfaces are rail-free and domains are entered through Domain Explorer.

### 5. Explorer Sheet escaped the desktop viewport

The first Explorer browser pass exposed a Sheet that could visually extend beyond the viewport because generic Sheet max-height and padding/animation geometry were not sufficient for this unusually dense surface.

**Fix:** added an Explorer-specific viewport-bounded Sheet contract with internal body scrolling and a structural audit for that contract.

### 6. Geometry test sampled the entrance animation

After the viewport fix, one run still reported the Sheet 40px low. The measured offset exactly matched the Sheet entrance `translateY(40px)` and occurred before motion settled.

**Fix:** geometry is now measured after the normal entrance transition settles. The post-motion viewport rule remains strict.

### 7. Technical composition metadata leaked into Desktop UI

Automated gates were green, but manual screenshot review caught `pipeline+dense-queue` and `Core` rendered as user-facing copy.

**Fix:** composition signatures remain internal only; the marker now uses the Arabic domain description and the rail uses `مساحة العمل`. The structural audit permanently rejects `{domain.signature}` and `<small>Core</small>` in the user runtime.

## Protected-boundary verification

A GitHub compare from `uiux-rebirth-v2` to the UI-7 working branch confirmed UI-7 changes are confined to UI V2 presentation/integration and stage-specific audit/workflow files.

No UI-7 product changes were made in:

- `database/`
- `src/core/`
- `src/data/`
- `src/features/`
- `src/shared/`

The original Master Roadmap remains untouched.

## Closure evidence

Implementation head reviewed manually: `5329448dfc44f162f1fc1639558d524f35c6cf67`.

On that head all cumulative gates passed together:

- UI-1 Boundary Gate: PASS — run `33888685393`
- UI-3 Component Reality Gate: PASS — run `33888685269`
- UI-4 App Shell Reality Gate: PASS — run `33888685290`
- UI-5 Composition Reality Gate: PASS — run `33888687337`
- UI-6 Core Screens Reality Gate: PASS — run `33888685302`
- UI-7 Domain Reality Gate: PASS — run `33888685265`
- 46 functional regression tests: PASS
- TypeScript: PASS
- production build: PASS
- real Chromium domain journey at 1280×900, 390×844 and 320×700: PASS

The final UI-7 artifact result reports `passed: true` for all three profiles, with 12 domains visited, Domain Explorer enabled and Core confirmed rail-free.

## Manual visual evidence review

The final screenshots were manually reviewed after the green browser run.

Verified:

- Domain Explorer is compact, grouped, scrollable and viewport-safe on 320px while preserving all 12 destinations.
- Core Home remains visually clean with no permanent domain-chip wall above the hero.
- Transactions uses a dense queue/pipeline hierarchy rather than a generic list-only screen.
- Workflow uses staged lanes and a dark transition/action zone.
- Command Center remains visually distinct, dark and executive.
- Documents uses category/list/preview/detail composition rather than equal cards.
- Copilot is context-bound to the current record rather than a detached generic chat surface.
- no visible legacy UI DNA was accepted in reviewed evidence.
- no technical composition labels remain visible in the final runtime evidence.

## Exit

UI-7 is eligible to close after this documentation/roadmap-only closure head passes the same cumulative gates without product regressions.

Next independent stage: **UI-8 — States, Forms & Interaction Layer**.

The original `ENJAZ_MASTER_ROADMAP.md` remains untouched and **Phase 4.2 stays on HOLD** until UI/UX Rebirth V2 is fully frozen.
