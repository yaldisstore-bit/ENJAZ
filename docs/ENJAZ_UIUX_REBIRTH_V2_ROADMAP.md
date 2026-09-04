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

# UI-3 — Design System & Premium Components ⏭ CURRENT NEXT STAGE

- Rebuild buttons, fields, chips, badges, navigation primitives, sheets, dialogs, menus and feedback states.
- Build ENJAZ composite patterns for transactions, companies, finance, follow-ups, workflow, risk, documents and command/operations surfaces.
- Remove the repeated equal-card layout as a default primitive.

**Exit:** full screens can be composed without ad-hoc styling.

---

# UI-4 — New App Shell

- Rebuild top bar.
- Rebuild bottom navigation.
- Engineer centered yellow/orange primary action as one dock composition.
- Rebuild safe-area, viewport, keyboard and back behavior.
- Rebuild global search, notifications and contextual/global actions entry points.

**Exit:** any screen can mount inside the shell without overlap, clipping, hidden navigation or visual collision.

---

# UI-5 — Information Architecture & Screen Composition

- Rework information hierarchy without changing domain facts.
- Define when ENJAZ uses cards, dense rows, timelines, charts, progress, sheets and full pages.
- Map approved reference screen families to ENJAZ domains.

**Exit:** every information type has an intentional presentation pattern.

---

# UI-6 — Core Screens Rebirth

- Home.
- Daily Work shell/surface contract.
- Search.
- Notifications entry.
- Global create/quick actions.
- Profile/workspace entry.
- Command/operations entry surfaces.

**Exit:** core experience contains no visible previous-generation UI.

---

# UI-7 — Domain-by-Domain Rebuild

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

**Exit:** every domain belongs to one coherent ENJAZ family while preserving its own information character.

---

# UI-8 — States, Forms & Interaction Layer

- Loading, empty, error, offline, retry, conflict, permission, archive and success states.
- Form layout and validation presentation.
- Destructive confirmations.
- Long text and large-number behavior.
- Keyboard-open and constrained viewport states.

**Exit:** exceptional states are as polished as the happy path.

---

# UI-9 — Motion, Touch & Mobile Polish

- Functional motion and transition language.
- Touch feedback.
- Android keyboard/back/rotation/safe-area hardening.
- Reduced-motion behavior.
- Interaction latency and perceived responsiveness polish.

**Exit:** the product feels native-quality and intentional on target phones.

---

# UI-10 — Full Visual Destruction & UI Freeze

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
