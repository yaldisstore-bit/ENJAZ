# UI-1 — Total Legacy UI Purge

Status: in progress until the UI-1 exit gate is verified.

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

`src/main.tsx` must mount UI V2 directly.

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

## Exit gate

UI-1 passes only when:

1. `src/ui-v2/` exists as a clean visual boundary.
2. UI V2 contains no import or visual dependency on `ui-rebirth` or legacy visual layers.
3. `src/main.tsx` mounts `UiV2Root` and UI V2 foundation styles only.
4. The old visual runtime is explicitly quarantined rather than treated as a library.
5. Existing domain/data/database contracts are not deleted or rewritten by the purge.
6. The project remains structurally buildable; no legacy file is deleted merely to make an audit look clean.

The single decisive static gate is `scripts/ui-v2-boundary-audit.mjs`.
