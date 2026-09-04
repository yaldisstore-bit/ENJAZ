# UI-1 — Total Legacy UI Purge

Status: **CLOSED ✅**

## Purpose

Create a new ENJAZ presentation runtime that does not depend on the current `ui-rebirth` visual generation or any earlier visual DNA.

UI-1 is not a visual redesign stage. It establishes the clean room in which UI-2 and later stages will rebuild the product.

## Quarantined presentation layer

The following is non-authoritative for UI V2 and may not be imported by `src/ui-v2/`:

- `src/ui-rebirth/`
- previous shell/Home CSS and DOM-class contracts
- previous visual tokens, identity/polish/depth implementations
- legacy visual helpers reached indirectly through adapters

These files remain temporarily in the repository only because older feature/runtime code still has compatibility references. Their physical presence does not make them approved dependencies.

## New authoritative boundary

- `src/ui-v2/BOUNDARY.md`
- `src/ui-v2/runtime/`
- `src/ui-v2/styles/`

`src/main.tsx` mounts UI V2 directly.

## KEEP

UI V2 may reuse authoritative product contracts and non-visual implementation from:

- core runtime/config/auth/routing/mobile contracts
- data contracts, repositories, Supabase adapters and typed access
- domain services/models/hooks that are not visual wrappers
- shared session contracts
- database schema/migrations/RLS contracts

## REBUILD

All presentation composition is rebuilt later inside UI V2:

- application shell
- navigation presentation
- Home presentation
- cards/rows/timelines/charts/forms/sheets/dialogs
- search/notifications/create presentation
- domain screen layouts
- typography, palette, geometry, depth and motion

## Current compatibility debt discovered

`src/features/auth/pages/AuthRouteGuards.tsx` still imports `RebirthSessionChecking` from `src/ui-rebirth/`. This proves `ui-rebirth` cannot yet be deleted physically without a controlled migration. UI-1 therefore quarantines it instead of performing a destructive delete that would break TypeScript compilation.

This debt must never be imported into UI V2. It will be migrated when the corresponding UI V2 auth/session surface is rebuilt.

## Exit verification

UI-1 passed with the following evidence:

1. `src/ui-v2/` exists as a clean authoritative visual boundary.
2. `src/ui-v2/` contains no dependency on `ui-rebirth` or legacy visual markers checked by `scripts/ui-v2-boundary-audit.mjs`.
3. `src/main.tsx` mounts `UiV2Root` and `src/ui-v2/styles/foundation.css`; it no longer imports `RebirthRoot` or `ui-rebirth` styles.
4. The previous visual runtime remains quarantined only for compatibility; it is not a permitted UI V2 dependency.
5. Git diff from `uiux-rebirth-v2` shows no changes to `database/`, `src/core/`, `src/data/`, `src/features/` or `src/shared/`.
6. GitHub Actions run `33872283891`, job `ui1-gate`, completed successfully with:
   - UI V2 boundary audit ✅
   - functional regression tests ✅
   - TypeScript check ✅
   - production build ✅

**UI-1 Exit: GREEN ✅**

Next stage: **UI-2 — ENJAZ Visual DNA 2.0**.
