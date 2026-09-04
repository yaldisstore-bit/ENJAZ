# ENJAZ UI V2 Boundary

`src/ui-v2/` is the only authoritative presentation boundary for ENJAZ UI/UX Rebirth V2.

## Allowed dependencies

UI V2 may depend on authoritative non-visual contracts from:

- `src/core/`
- `src/data/`
- `src/features/` domain/service/model/hooks that do not import legacy visual components
- `src/shared/`

## Forbidden dependencies

UI V2 must not import, copy, extend, or depend on:

- `src/ui-rebirth/`
- any previous/legacy visual generation
- legacy CSS, DOM classes, shell classes, Home classes, visual tokens, or visual helper classes
- visual code reached indirectly through an adapter that simply re-exports legacy UI

## Quarantine rule

`src/ui-rebirth/` remains temporarily in the repository only as a compatibility island while old references are migrated. It is not a design source, not a component library, and not a permitted dependency for UI V2.

## Runtime rule

`src/main.tsx` must mount UI V2 directly. Re-enabling `ui-rebirth` from the application entry point is a UI-1 gate failure.

## Stage ownership

UI-1 establishes separation only. Visual identity, premium components and screen design belong to UI-2 and later. The bootstrap surface in UI-1 must stay deliberately neutral and disposable.
