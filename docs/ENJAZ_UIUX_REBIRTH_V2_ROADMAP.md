# ENJAZ UI/UX REBIRTH V2 — Independent Roadmap

> Status: Separate temporary roadmap dedicated only to rebuilding ENJAZ UI/UX from zero.
>
> This roadmap does **not** replace, renumber, reorder, or cancel `ENJAZ_MASTER_ROADMAP.md`.
>
> Master Roadmap state while this roadmap is active: **Phase 4.1 closed; Phase 4.2 on HOLD.**
>
> Return rule: when UI/UX Rebirth V2 is frozen and accepted, resume the original Master Roadmap from **Phase 4.2 — Daily Work / Universal Inbox**.

## Global rules

1. Rebuild the visual/presentation layer from zero; do not patch the current UI generation.
2. Preserve authoritative domain logic, data contracts, Supabase integration, auth/session/security contracts, repositories, migrations, and business rules.
3. Current UI output is a functional reference only; it is not a design source of truth.
4. The approved external reference screens remain the composition/quality reference library.
5. Yellow/gold + charcoal/black remains the ENJAZ global identity anchor, but implementation is rebuilt cleanly.
6. No legacy CSS/DOM/component dependency may be carried into the new visual runtime merely for convenience.
7. No feature may disappear because of the redesign. Every preserved capability must have a mapped destination.
8. New UI work must live behind a clean boundary until it is proven and deliberately switched into runtime.
9. No new product/domain scope is introduced by this roadmap. It is presentation/interaction reconstruction only.
10. One decisive gate per stage is preferred over multiplying overlapping gates.

---

# UI-0 — Freeze & Preservation Contract ✅

- Freeze a recoverable baseline commit/branch.
- Inventory current routes, screens, global surfaces, actions, states and feature contracts.
- Classify code/assets into KEEP, ADAPT and REBUILD boundaries.
- Create Feature Preservation Matrix.
- Record current runtime anomalies that must not be mistaken for product truth.
- Freeze approved visual reference map.

**Exit:** verified against frozen baseline `cb217b460d433d221fcecbe2b2ff994a0c16916d`: UI-0 introduced documentation plus one preservation audit only; no `database/`, `src/core/`, `src/data/`, `src/features/`, `src/shared/`, `tests/` or `tests-external/` changes.

---

# UI-1 — Total Legacy UI Purge ✅

- Establish clean `ui-v2` visual boundary.
- Quarantine previous UI generations and current `ui-rebirth` visuals as non-authoritative.
- Prevent visual imports from legacy/current presentation layers.
- Keep domain/data/auth/routing contracts available through explicit adapters only.

**Exit:** verified on GitHub Actions run `33872283891`: UI V2 boundary audit, functional regression tests, TypeScript and production build all passed. `src/main.tsx` now mounts `UiV2Root` and UI V2 foundation styles with no `ui-rebirth` entry dependency. No domain/data/database implementation was rewritten by the purge.

---

# UI-2 — ENJAZ Visual DNA 2.0 ✅

- Rebuild color system, surfaces, typography, geometry, depth, iconography and density.
- Formalize gold/yellow + charcoal/black global identity.
- Define domain accents without fragmenting the product family.
- Convert approved reference screens into enforceable composition rules.

**Exit:** verified on GitHub Actions run `33873067559`: UI V2 boundary audit, Visual DNA audit with calculated contrast checks, functional regression tests, TypeScript and production build all passed. Semantic tokens, typed DNA contract and live Visual DNA proof are now the authoritative UI V2 identity foundation.

---

# UI-3 — Design System & Premium Components ✅

- Rebuild buttons, fields, chips, badges, navigation primitives, sheets, dialogs, menus and feedback states.
- Build ENJAZ composite patterns for transactions, companies, finance, follow-ups, workflow, risk, documents and command/operations surfaces.
- Remove the repeated equal-card layout as a default primitive.

**Exit:** verified on final GitHub Actions run `33875027439` and manual screenshot review. The stage passed boundary audit, 46 functional regression tests, TypeScript, production build, real Vite runtime and real Chromium interaction at 1280×900, 390×844 and 360×740. The Reality Gate enforces 44px mobile touch targets, zero horizontal overflow, viewport-safe menu/sheet/dialog geometry, real clicks/typing and console/page-error rejection. Manual evidence review caught and forced correction of a clipped mobile action menu before closure. Full evidence and defect history are recorded in `docs/UI3_DESIGN_SYSTEM_PREMIUM_COMPONENTS.md`.

---

# UI-4 — New App Shell ✅

- Rebuild top bar.
- Rebuild bottom navigation.
- Engineer centered yellow/orange primary action as one dock composition.
- Rebuild safe-area, viewport, keyboard and back behavior.
- Rebuild global search, notifications and contextual/global actions entry points.

**Exit:** verified on GitHub Actions run `33877149814` plus manual screenshot review. The shell passed UI V2 boundary audit, UI-4 structural audit, 46 functional regression tests, TypeScript, production build and real Chromium interaction at 1280×900, 430×932, 390×844, 360×740 and 320×700. The Reality Gate enforces title visibility, dock persistence after navigation, geometric centering of the yellow/orange primary action, 44px mobile touch targets, safe search/notification/create overlays, browser Back/Escape behavior, keyboard-open dock hiding, zero horizontal overflow and console/page-error rejection. The first browser cycle caught the ENJAZ title disappearing at 320px; manual screenshot review later caught a low-contrast metric before closure. Evidence and defect history are recorded in `docs/UI4_NEW_APP_SHELL.md`.

---

# UI-5 — Information Architecture & Screen Composition ✅

- Rework information hierarchy without changing domain facts.
- Define when ENJAZ uses cards, dense rows, timelines, charts, progress, sheets and full pages.
- Map approved reference screen families to ENJAZ domains.

**Exit:** UI-5 establishes a typed contract mapping 12 information kinds to intentional presentation patterns and 12 screen families to approved reference families. Ten live compositions were verified in the real AppShell. On implementation head `b2f3f358dd3c448a87c157ec10ec33ebed7e9177`, UI-1, UI-3, UI-4 and UI-5 gates all passed together, including 46 functional tests, TypeScript, production build and Chromium at 1280×900, 430×932, 390×844, 360×740 and 320×700. Manual screenshot review rejected the first green browser result after finding Home/Daily critical actions obscured by the fixed dock at 320px; the layout was corrected and dock-occlusion geometry became a permanent Reality Gate. Evidence and defect history are recorded in `docs/UI5_INFORMATION_ARCHITECTURE_SCREEN_COMPOSITION.md`.

---

# UI-6 — Core Screens Rebirth ✅

- Home.
- Daily Work shell/surface contract.
- Search.
- Notifications entry.
- Global create/quick actions.
- Profile/workspace entry.
- Command/operations entry surfaces.

**Exit:** the default UI V2 runtime is now `CoreApp`, with real Home, Today, Operations/Command and Finance entry surfaces plus product-level Search, Notifications, Quick Create and Account/Workspace surfaces. On implementation head `9a4bb4a8fe5816a85d8ae784e7f5a1675081d910`, UI-1, UI-3, UI-4, UI-5 and UI-6 gates all passed together, including 46 functional tests, TypeScript, production build and a real Chromium core journey at 1280×900, 430×932, 390×844, 360×740 and 320×700. Manual screenshot review passed after verifying Home/Today critical CTA clearance, narrow Search geometry, visually distinct Command Center and cobalt Finance treatment. Previous UI-3 and UI-5 proof surfaces remain available only as regression harnesses. Evidence and defect history are recorded in `docs/UI6_CORE_SCREENS_REBIRTH.md`.

---

# UI-7 — Domain-by-Domain Rebuild ✅

Presentation rebuild only for:
- Transactions.
- Companies.
- People/Lawyers.
- Finance.
- Workflow.
- Automation.
- Operations Center.
- Command Center.
- Risk/Saved Views/Insights.
- Documents/Vault/Reports.
- Follow-ups/Notifications.
- AI surfaces where the original roadmap contract already defines them.

**Exit:** all 12 domain destinations now belong to one coherent ENJAZ family while preserving distinct information character. Core surfaces remain rail-free; the ENJAZ brand opens a viewport-safe Domain Explorer, and the Domain Rail appears only inside domain runtime. On implementation head `5329448dfc44f162f1fc1639558d524f35c6cf67`, UI-1, UI-3, UI-4, UI-5, UI-6 and UI-7 gates all passed together, including 46 functional tests, TypeScript, production build and a real Chromium domain journey at 1280×900, 390×844 and 320×700. Manual screenshot review caught and removed leaked technical composition labels after the automated gate was green. Full evidence and defect history are recorded in `docs/UI7_DOMAIN_BY_DOMAIN_REBUILD.md`.

---

# UI-8 — States, Forms & Interaction Layer ✅

- Loading, empty, error, offline, retry, conflict, permission, archive and success states.
- Form layout and validation presentation.
- Destructive confirmations.
- Long text and large-number behavior.
- Keyboard-open and constrained viewport states.

**Exit:** UI-8 now provides typed exceptional states, accessible validated Quick Create forms, destructive confirmation, real empty-search behavior and stress handling for long Arabic text, huge financial values and constrained phone viewports. On final implementation head `d8f402eea04ebea33e3e6287506e37db66d4bd66`, every cumulative UI gate from UI-1 through UI-8 passed together. UI-8 Actions run `33891880601` passed the boundary/domain/state audits, 46 functional tests, TypeScript, production build and Chromium at 1280×900, 390×844 and 320×700. Destruction found and fixed a real React deferred-event crash after the first edited field; manual screenshot review then caught and removed leaked stage/developer terminology after automation was green. Final evidence artifact is `9944188600`. Full evidence and defect history are recorded in `docs/UI8_STATES_FORMS_INTERACTION_LAYER.md`.

---

# UI-9 — Motion, Touch & Mobile Polish ✅

- Functional motion and transition language.
- Touch feedback.
- Android keyboard/back/rotation/safe-area hardening.
- Reduced-motion behavior.
- Interaction latency and perceived responsiveness polish.

**Exit:** closed on implementation head `b681ddcbcd4c5e516401092dede46312300e31d8`. Every cumulative gate from UI-1 through UI-9 passed on that exact head. UI-9 Actions run `33895898514` passed the UI V2 boundary audit, UI-8 regression audit, UI-9 motion/mobile audit, 46 functional tests, TypeScript, production build and real Chromium motion/touch/mobile journeys. Evidence artifact `9945721644` passed desktop-1280, phone-390 and phone-320 profiles with rotation, reduced-motion, exit-presence, 44px touch-floor and Back behavior all green. The destruction cycles found and fixed an implicit form-submit defect in reusable buttons, a keyboard/rotation timing race in the test journey, and entry-animation scale that temporarily shrank touch targets below 44px. The final 320px subpixel measurement (`43.999992px`) was not waived; critical compact controls were raised to 46px. Manual screenshot review passed portrait, landscape, reduced-motion and desktop evidence. Full evidence and defect history are recorded in `docs/UI9_MOTION_TOUCH_MOBILE_POLISH.md`.

---

# UI-10 — Full Visual Destruction & UI Freeze ⏭ CURRENT NEXT STAGE

One final product-wide gate covering:
- Legacy DNA leakage.
- Visual inconsistency.
- Layout breakage.
- Interaction breakage.
- Feature disappearance.
- Narrow/typical phone sizes.
- Long Arabic + mixed Latin content.
- Large financial values and dense data.
- Keyboard, rotation, safe areas, overlays and deep navigation.
- Visual comparison against approved reference quality level.

**Exit:** `ENJAZ UI/UX 2.0 — FROZEN`.

After this exit, resume `ENJAZ_MASTER_ROADMAP.md` at **Phase 4.2**.
