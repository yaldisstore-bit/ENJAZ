# UI Rebirth Stage 0 — Hard Purge Scope

This branch removes the previous ENJAZ visual runtime from `src/` before any new product screen is built.

## Deleted visual runtime
- `src/styles/`
- `src/design-system/`
- previous `src/app/` visual/router runtime
- previous foundation/navigation visual labs
- previous Home page components (business model/service/hooks remain)
- previous shared shell/global interaction UI
- previous auth visual pages/shell (auth domain/service/state remain)
- previous shared visual error surface

## Preserved product core
- database and Supabase schema/types
- auth gateway/domain/service/state
- data layer/repositories/contracts
- routing contracts and route constants
- Home business model/service/hooks
- logging, errors, configuration, versioning and session/data contexts

## Enforcement
`ui-rebirth-hard-purge-audit.mjs` fails if CSS or visual DOM exists outside `src/ui-rebirth/`, or if any previous visual runtime path returns.

Historical documentation may remain for engineering provenance only; it is not a visual source of truth. The only visual source of truth is `docs/UI_REBIRTH_REFERENCE_MAP.md` plus `src/ui-rebirth/DNA_CONTRACT.md`.
