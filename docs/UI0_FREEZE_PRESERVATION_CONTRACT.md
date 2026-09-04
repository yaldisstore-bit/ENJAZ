# UI-0 — Freeze & Preservation Contract

Status: ACTIVE

## 1. Frozen baseline

- Repository: `yaldisstore-bit/ENJAZ`
- Frozen baseline commit: `cb217b460d433d221fcecbe2b2ff994a0c16916d`
- Recovery branch: `freeze/pre-uiux-rebirth-2026-09-04`
- UI/UX V2 integration branch: `uiux-rebirth-v2`
- UI-0 working branch: `uiux-rebirth-v2-ui0`

The recovery branch is a no-touch reference. If the UI rebuild causes feature loss, runtime breakage or contract drift, this baseline is the comparison source.

## 2. Relationship to the original roadmap

This UI/UX roadmap is independent from `ENJAZ_MASTER_ROADMAP.md`.

- Original Phase 4.1 remains closed.
- Original Phase 4.2 remains on HOLD while UI/UX Rebirth V2 is active.
- UI/UX Rebirth V2 does not authorize product-scope expansion.
- After UI-10 passes, resume the original roadmap at Phase 4.2.

## 3. Product truth vs visual truth

### Product truth — preserve

The following are authoritative and must survive the rebuild unless a later original-roadmap phase explicitly changes them:

- `database/` schema, migrations and RLS direction.
- `src/core/auth/` auth/session contracts.
- `src/core/config/` configuration contracts.
- `src/core/errors/` normalized error contracts.
- `src/core/logging/` logging contracts.
- `src/core/mobile/` mobile/runtime behavior contracts where they are not visual implementations.
- `src/core/routing/routes.ts` route identifiers and domain destinations.
- `src/core/supabase/` Supabase client/integration.
- `src/core/version/` version contracts.
- `src/data/` contracts, ports, repositories, React data bindings and Supabase gateways.
- `src/features/auth/` domain/services/state logic.
- `src/features/home/` Home model, data loading and business calculation logic.
- `src/shared/session/` session behavior.
- tests that protect the above behavior.

### Visual truth — rebuild

The following are not authoritative design sources and may be replaced completely:

- `src/ui-rebirth/runtime/` presentation structure.
- `src/ui-rebirth/styles/` visual implementation.
- `src/ui-rebirth/preview/` preview fixtures and preview-only composition.
- current App Shell geometry and chrome.
- current Home composition.
- current bottom navigation geometry.
- current top bar/search/notification/avatar presentation.
- current quick-action sheet presentation.
- any legacy/current CSS whose purpose is only visual styling.

### Reference truth — preserve as reference, not code

- `docs/UI_REBIRTH_REFERENCE_MAP.md` remains the approved visual-reference map until the user explicitly replaces it.
- Approved external screens define quality, hierarchy, density, composition and interaction inspiration.
- They do not override ENJAZ domain facts, permissions, labels or business behavior.

## 4. Critical runtime observation captured during UI-0

At the frozen baseline, `src/main.tsx` mounts `RebirthRoot`, and `RebirthRoot` currently injects `REBIRTH_HOME_PREVIEW_STATE` directly into the shell. The real connected Home adapter (`RebirthConnectedHomeDashboard` -> `useHomeDashboard`) exists but is not the active root path.

Therefore:

1. Current rendered Home data is **not** sufficient evidence of the real product data path.
2. Preview data/components are REBUILD/REFERENCE material, not product truth.
3. `useHomeDashboard` and its model/contracts are KEEP material.
4. UI/UX V2 must reconnect to authoritative data rather than preserve preview wiring.

## 5. KEEP / ADAPT / REBUILD decision rule

### KEEP
Code stays behaviorally unchanged unless required to expose an existing contract cleanly to the new UI.

### ADAPT
Thin integration adapters may be added when new UI needs to consume existing routing/data/auth/domain contracts. Adapters must not duplicate business logic.

### REBUILD
Presentation structure, CSS, visual components, layout, hierarchy, animations and interaction presentation are rebuilt from zero.

## 6. Forbidden during UI/UX V2

- Rewriting domain rules to make a screen easier to design.
- Duplicating repository/data calculations inside components.
- Replacing Supabase data with local mock data in production runtime.
- Removing routes/actions because the new design has no place for them yet.
- Carrying old CSS selectors or DOM geometry into V2 as hidden dependencies.
- Restoring a broken screen by adding arbitrary `!important` or z-index escalation.
- Declaring a UI stage complete when a preserved capability has no mapped destination.

## 7. UI-0 exit conditions

UI-0 may close only when all are true:

- Frozen recovery branch exists.
- Independent UI/UX roadmap is committed.
- KEEP/ADAPT/REBUILD boundaries are recorded.
- Screen/route/action inventory is recorded.
- Feature Preservation Matrix is recorded.
- Current runtime anomalies are documented.
- One preservation audit exists to detect accidental changes to protected boundaries during early rebuild work.

No visual component needs to be redesigned in UI-0.
