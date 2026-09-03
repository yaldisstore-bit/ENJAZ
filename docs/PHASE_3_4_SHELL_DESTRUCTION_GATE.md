# Phase 3.4 — Shell Destruction Gate

## Status

**COMPLETE ✅**

Phase 3.4 is the final destruction gate for Phase 3. It does not add business screens. It attacks the authenticated App Shell, navigation architecture, global interaction surfaces, session boundary, mobile viewport behavior, and GitHub Pages deep-link delivery before ENJAZ may enter Phase 4.

The feature implementation was merged to `main` as SHA `a2df0390858e93fb4d55cf9412f5f6b452a1ed18`. That exact feature SHA passed merged-main Quality Gate run **#184** and GitHub Pages Preview run **#144** before this documentation-only closure was prepared.

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

`verify:phase3.4` extends the immutable 3.3 gate:

`verify:phase3.3 → shell-destruction audit → shell-destruction destructive selftest → roadmap audit`

The Phase 3.4 audit checks the eight required torture families plus architecture, auth/session fail-closed behavior, deep links, Pages fallback, mobile viewport contracts, Safe Areas, token-only visuals, narrow/landscape CSS, versioning, documentation, CI wiring, TypeScript/build preservation, and Phase 3 boundaries.

The destructive selftest deliberately corrupts those facts and requires the audits to reject every mutation, including 320→360, 120→20, 200→20, removed session redirect, removed offline listeners, removed back resolution, removed Safe Area, raw colors, unknown tokens, `!important`, numeric z-index, route removal, deep-link fallback removal, version downgrade, gate downgrade, and roadmap/documentation drift.

## Verified closure evidence

The final implementation path produced real green evidence rather than a documentation-only claim:

- PR #14 merged successfully.
- PR Quality Gate run **#183**: success.
- **148/148** behavior/contract tests passed.
- Phase 3.4 audit: **143/143** invariants passed.
- Phase 3.4 destructive selftest: **37/37** deliberate regressions rejected.
- Phase 3.3 legacy audit: **151/151**, plus **7/7** forward-compatibility checks.
- Phase 3.3 legacy destructive suite: **41/41**, plus **5/5** forward downgrade/workflow/gate probes.
- Navigation 3.2: **137/137** audit + **31/31** destructive probes.
- App Shell 3.1: **79/79** audit + **15/15** destructive probes.
- Motion: **169/169** + **16/16** destructive probes.
- Mobile/Android: **50/50** + **10/10** destructive probes.
- Database: **45 tables / 118 policies / 42 indexes**, DB selftest **5/5**.
- Real TypeScript `tsc -b`: success.
- Vite 8.2.2 production build: success, **191 modules transformed**.
- `dist/index.html`: asserted.
- merged-main Quality Gate run **#184** on feature SHA `a2df0390858e93fb4d55cf9412f5f6b452a1ed18`: success.
- verified production artifact ID **9904038804**, digest `sha256:383e48b9090a6fa3196a50a6603330cf9d95e1112ce17bca71f77d5a3a595767`.
- GitHub Pages Preview run **#144** built and deployed successfully on the same feature SHA.

Real failures discovered while closing 3.4 were fixed rather than hidden: the historical 3.3 exact-version coupling was made forward-compatible while preserving all legacy checks, and destructive probes for auth subscription, offline plumbing, `100dvh`, Safe Areas, and documentation were strengthened when weak mutations were discovered.

## Exit criteria

Phase 3.4 is complete because:

- behavior/contract tests pass ✅
- Phase 3.4 audit is fully green ✅
- every deliberate 3.4 regression is rejected ✅
- Phase 3.3 and all older gates remain green ✅
- real TypeScript `tsc -b` passes ✅
- Vite production build passes ✅
- `dist/index.html` is asserted ✅
- GitHub Actions is green on the implementation PR ✅
- merged `main` passed the same gate ✅
- GitHub Pages successfully published the same merged feature SHA ✅

**Phase 3 — Application Shell & Navigation is complete ✅.**

The next permitted roadmap phase is **Phase 4 — Home, Daily Work & Executive Overview**. Phase 4 has **not started** as part of this closure.
