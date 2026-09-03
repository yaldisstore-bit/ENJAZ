# Phase 3.1 — App Shell

Status: active implementation on the Phase 3.1 branch.

Phase 3.1 is the first production-facing structure built after **ENJAZ Design System 1.0** was frozen at the end of Phase 2. It creates the authenticated frame that every later business screen will inhabit. It does **not** build the Dashboard, Transactions, Companies, Finance, Workflow or other domain screens.

## Scope

Phase 3.1 owns:

- authenticated **App Shell** composition,
- premium **Top Bar**,
- mobile-first **Bottom Navigation** structure,
- desktop navigation rail adaptation,
- shared **Page Container**,
- Safe Area integration,
- Android/dynamic viewport inheritance,
- global **offline**, error and loading/busy surfaces,
- responsive application structure,
- accessible skip link and semantic landmarks,
- account context and safe sign-out location.

The shell is intentionally route-light. **Phase 3.2 — Navigation Architecture** owns the final product route map. In 3.1 only `/app` is active; the remaining Bottom Navigation slots are visibly reserved but disabled so the shell cannot silently invent business routes before the route contract is frozen.

## Architecture boundary

The first GitHub CI attempt correctly rejected a cross-feature implementation (`foundation → shell` and `shell → auth`). The guard was not weakened.

The corrected composition is:

- `src/shared/shell/shellContract.ts` — domain-neutral shell contract,
- `src/shared/shell/AppShellFrame.tsx` — presentational frame reusable by preview/product composition,
- `src/app/AppShell.tsx` — application composition root that is allowed to bind Auth state and the shared frame,
- `src/features/foundation/pages/ShellPreviewPage.tsx` — safe preview that imports only the shared frame, never Auth.

This keeps feature modules isolated and prevents the shell from becoming a new cross-feature dependency hub.

## Mobile and accessibility contract

The shell inherits all frozen Phase 2 requirements and adds application-level enforcement:

- minimum coarse-pointer target remains **44px**,
- `100vh` fallback plus `100dvh` dynamic viewport enhancement,
- top and bottom **Safe Area** consumption,
- fixed Bottom Navigation on phones without covering page content,
- desktop rail adaptation without duplicating navigation markup,
- visible `:focus-visible` treatment,
- skip link to `#main-content`,
- semantic `header`, `nav` and `main` landmarks,
- `aria-live` status for offline/loading states,
- `role="alert"` for shell-level failures,
- `prefers-reduced-motion` respected.

## Top Bar contract

The Top Bar contains only Phase 3.1 responsibilities:

- ENJAZ identity,
- account context,
- safe sign-out.

Global Search, Notifications, quick-create and Command/Operations entry points belong to **Phase 3.3 — Global Interaction Surfaces** and are intentionally not invented here.

## Navigation contract

The shell reserves five mobile navigation positions:

1. الرئيسية — ready at `/app`,
2. اليوم — planned,
3. المعاملات — planned,
4. الشركات — planned,
5. المزيد — planned.

The labels are structural placeholders for layout pressure and accessibility testing. Phase 3.2 may activate/refine the final route architecture according to the Master Roadmap, but 3.1 must not create hidden business screens or ad-hoc paths.

## Proof surface

`/foundation/shell` renders an auth-independent safe preview of the exact shell frame. It exists so GitHub Pages can display the shell without exposing or fabricating a production login session.

The proof page explicitly states that it is **not a business screen**.

## Automated quality gate

Phase 3.1 adds:

- `src/shared/shell/shellContract.ts`
- `src/shared/shell/AppShellFrame.tsx`
- `src/app/AppShell.tsx`
- `src/features/foundation/pages/ShellPreviewPage.tsx`
- `src/styles/app-shell.css`
- `tests/appShell.test.ts`
- `scripts/phase3-1-shell-audit.mjs`
- `scripts/phase3-1-shell-selftest.mjs`
- `npm run verify:phase3.1`

`verify:phase3.1` must extend the immutable `verify:phase2.8` chain. The existing Phase 2.8 destruction audit therefore continues scanning new product CSS for raw colors, `!important`, numeric z-index, tiny raw fonts and `transition: all` before the shell-specific audit even runs.

## Deliberate regression probes

The Phase 3.1 selftest intentionally corrupts the shell and requires the audit to reject the corruption, including:

- shrinking the 44px touch floor,
- shrinking the five-slot navigation contract,
- prematurely activating a future route,
- removing the skip link,
- removing offline detection,
- removing authenticated sign-out,
- injecting a raw color,
- injecting numeric z-index,
- removing bottom Safe Area handling,
- removing Reduced Motion handling,
- injecting `/app/transactions` before Phase 3.2,
- leaking an Auth feature dependency into the shared frame,
- removing the shell preview route,
- detaching the App Shell from the protected route,
- downgrading the Phase 3.1 verification command.

## GitHub Actions gate

A Phase 3.1 candidate is not complete because the page renders locally. GitHub Actions must run the full inherited chain, the shell audit, destructive selftest, Roadmap audit, real TypeScript `tsc -b`, Vite Production Build and `dist/index.html` assertion.

After a green Pull Request, the merge must be followed by the same Quality Gate on `main` before Phase 3.1 receives ✅.

## Exit criteria

Phase 3.1 is complete only when:

1. authenticated routes are physically nested inside `AppShell`,
2. Top Bar, Bottom Navigation and Page Container are present,
3. Safe Area, responsive, RTL and dynamic viewport contracts remain intact,
4. offline/error/loading shell surfaces are present,
5. future product routes remain locked for Phase 3.2,
6. `/foundation/shell` safely previews the structure,
7. feature boundaries remain intact,
8. all Phase 0–2.8 gates stay green,
9. all shell behavior/contract tests pass,
10. all Phase 3.1 audit invariants pass,
11. every deliberate shell regression is rejected,
12. TypeScript passes,
13. Production Build passes,
14. Pull Request Quality Gate passes,
15. merged `main` Quality Gate passes.

Only after these criteria are green does execution move to **Phase 3.2 — Navigation Architecture**.
