# Phase 2.6 — Mobile / Android Hardening

Status: **QUALITY-GATED**

## Objective

Harden ENJAZ for real phone use, especially Android browser/WebView behavior, before feature screens are expanded. This phase treats the visible viewport, virtual keyboard, safe areas and coarse touch input as runtime contracts rather than late CSS patches.

## Viewport contract

The canonical viewport keeps user zoom available while enabling full-screen safe-area layout and Android interactive-widget resizing:

`width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`

The phase explicitly forbids `user-scalable=no` and forced `maximum-scale=1`.

## Dynamic viewport and keyboard

- `100vh` remains the compatibility fallback.
- `100dvh` is used behind `@supports (height: 100dvh)`.
- Form controls receive keyboard-aware scroll margins.
- Input text remains at the product body-size floor.
- Overlay panels are bounded against both `100vh` and `100dvh`.
- Overlay bodies use contained overscroll and momentum touch scrolling.

## Safe Area contract

All four logical device edges are accounted for through `env(safe-area-inset-*)`:

- top;
- bottom;
- left;
- right.

Bottom Sheet actions receive an explicit bottom Safe Area buffer so Android/iOS system UI cannot cover them.

## Touch contract

- Minimum coarse-pointer target: **44px**.
- Coarse pointer detection is capability-based with `(pointer: coarse)`.
- Interactive controls use `touch-action: manipulation`.
- Horizontal viewport leakage is contained.
- The mobile runtime contract avoids direct `window` dependency and reads capabilities through a narrow `globalThis` boundary.

## Proof surface

Canonical route:

`/foundation/mobile`

The Mobile Lab proves:

- Viewport & Safe Area behavior;
- dynamic viewport capability;
- Touch / Pointer capability;
- Android keyboard field behavior;
- keyboard behavior inside Bottom Sheet;
- bounded mobile overlays and long-content scrolling.

## Permanent quality gate

`verify:phase2.6` extends the complete Phase 2.5 verification and adds:

1. Phase 2.6 Mobile / Android Audit;
2. Phase 2.6 destructive mobile self-test.

GitHub Actions also performs locked dependency installation, strict TypeScript validation, a production Vite build and a `dist/index.html` assertion.

## Exit criteria

Phase 2.6 is complete only when:

- the feature branch passes the full GitHub Quality Gate;
- deliberate viewport/touch/safe-area/gate regressions are rejected;
- TypeScript and the production build pass;
- the merged `main` revision passes the same gate again.
