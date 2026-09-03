# Phase 3.4 — Shell Destruction Gate

## Status

Phase 3.4 is the final destruction gate for Phase 3. It does not add business screens. It attacks the authenticated App Shell, navigation architecture, global interaction surfaces, session boundary, mobile viewport behavior, and GitHub Pages deep-link delivery before ENJAZ may enter Phase 4.

## Frozen torture scope

The governing roadmap requires exactly these classes of pressure:

1. Keyboard torture.
2. Back/navigation torture.
3. Rotation torture.
4. Route refresh and deep-link tests.
5. Session expiry during navigation.
6. Offline shell behavior.
7. Small-screen stress.
8. Long-label stress.

The executable source-of-truth is `src/core/shell/shellDestructionContract.ts`.

## Deterministic fixtures

The Phase 3.4 contract freezes:

- narrow viewport width: **320px**;
- portrait fixture: **320×640**;
- landscape fixture: **640×320**;
- keyboard occlusion threshold: **120px**;
- long-label torture: **200 characters**;
- canonical deep link: `/app/transactions`;
- expired-session fallback: `/auth/login`.

These numbers are parsed exactly by the audit and deliberately mutated by the destructive selftest.

## Keyboard and visual viewport

The mobile foundation already freezes `interactive-widget=resizes-content`, `viewport-fit=cover`, dynamic viewport support, Safe Areas, and a 44px touch floor. Phase 3.4 does not create a second mobile implementation.

Instead, the destruction contract adds deterministic keyboard-occlusion classification and the gate verifies that:

- `100dvh` remains in the App Shell;
- bottom navigation reserves `safe-area-inset-bottom`;
- the main content reserves bottom navigation plus the Safe Area;
- the narrow fixture remains usable at 320px;
- the lab exposes a simulated keyboard occlusion greater than the 120px threshold.

## Back and navigation

The Shell must not call browser history directly for product-level back navigation. `AppShellFrame` must continue to resolve back destinations through the centralized Navigation Contract.

The gate verifies:

- normalized current path;
- centralized active-navigation resolution;
- centralized deterministic back destination;
- canonical React Router `Link` for the back action;
- no `history.back()`, `history.go()`, or ad-hoc history mutation in the frame;
- five primary navigation slots remain unchanged.

## Rotation

The proof lab explicitly classifies portrait, landscape, and narrow viewports. Its CSS includes a short-height landscape contract so the sticky header cannot consume the useful viewport during rotation torture.

No orientation-specific business layout is introduced in Phase 3.4.

## Route refresh / deep-link

`/foundation/shell-destruction` is available in both the real router and the GitHub Pages preview router.

The gate also protects:

- `basename: import.meta.env.BASE_URL` in the preview router;
- the Pages SPA `404.html` fallback;
- canonical product routes remaining centrally registered;
- the `/app/transactions` deep-link fixture.

## Session expiry during navigation

`AuthProvider` already owns the live Supabase auth-state subscription. `ProtectedRoute` fails closed: when the live session becomes anonymous, protected content is replaced with a redirect to `/auth/login`.

Phase 3.4 verifies this behavior without putting auth logic inside the Shell or duplicating the Auth service.

## Offline shell behavior

Offline transition must not destroy the App Shell. The Shell continues to render its workspace and navigation while showing an accessible status banner.

The gate verifies:

- browser `online` and `offline` listeners;
- listener cleanup;
- `data-network-state` exposure;
- accessible offline live-region messaging;
- offline banner appearing before, not instead of, the workspace;
- no domain database access in the shell destruction layer.

## Small screens and long labels

The destruction lab mounts a real `AppShellFrame` inside a **320px** fixture with:

- offline state;
- a **200-character Arabic account label**;
- a long error message;
- `999` notification count to stress badge containment;
- the transactions deep link;
- long Arabic content.

The lab CSS requires logical properties, token-only visuals, wrapping, narrow-phone layout, reduced-motion support, and landscape short-height behavior.

## Proof surface

Auth-free structural proof:

`/foundation/shell-destruction`

The proof surface is intentionally deterministic and contains no production records, Supabase access, or business writes.

## Quality Gate

`verify:phase3.4` must extend the immutable 3.3 gate:

`verify:phase3.3 → shell-destruction audit → shell-destruction destructive selftest → roadmap audit`

The Phase 3.4 audit checks the eight required torture families plus architecture, auth/session fail-closed behavior, deep links, Pages fallback, mobile viewport contracts, Safe Areas, token-only visuals, narrow/landscape CSS, versioning, documentation, CI wiring, TypeScript/build preservation, and Phase 3 boundaries.

The destructive selftest deliberately corrupts those facts and requires the audits to reject every mutation, including 320→360, 120→20, 200→20, removed session redirect, removed offline listeners, removed back resolution, removed Safe Area, raw colors, unknown tokens, `!important`, numeric z-index, route removal, deep-link fallback removal, version downgrade, gate downgrade, and roadmap/documentation drift.

## Exit criteria

Phase 3.4 is complete only when:

- behavior/contract tests pass;
- Phase 3.4 audit is fully green;
- every deliberate 3.4 regression is rejected;
- Phase 3.3 and all older gates remain green;
- real TypeScript `tsc -b` passes;
- Vite production build passes;
- `dist/index.html` is asserted;
- GitHub Actions is green on the PR;
- merged `main` passes the same gate;
- GitHub Pages successfully publishes the same merged `main` SHA.

Only then is **Phase 3 — Application Shell & Navigation** complete and ENJAZ may enter **Phase 4 — Home, Daily Work & Executive Overview**.
