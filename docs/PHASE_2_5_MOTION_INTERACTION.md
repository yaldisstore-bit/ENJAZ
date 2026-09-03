# Phase 2.5 — Motion & Interaction System

Status: **COMPLETE**

## Objective

Build a bounded, purposeful motion layer for ENJAZ that improves comprehension and touch feedback without turning animation into decoration or weakening accessibility.

## Canonical motion contract

Durations are centralized and bounded:

- Instant: 90ms
- Fast: 140ms
- Standard: 220ms
- Deliberate: 320ms
- Slow: 420ms

No product CSS may invent raw millisecond durations or local cubic-bezier curves outside the motion-token layer.

## Interaction rules

- `transition: all` is forbidden.
- Fine-pointer hover transforms are capability-scoped with `(hover: hover) and (pointer: fine)`.
- Touch/press feedback must not change layout geometry.
- Decorative infinite loops are forbidden.
- Persistent `will-change` is forbidden.
- Reveal presets are deliberately limited to `fade`, `rise`, and `scale`.
- Dialog and Bottom Sheet use real presence states so exit motion completes before unmount.
- Bottom Sheet uses the deliberate duration budget; Dialog uses the standard duration budget.

## Reduced motion

`prefers-reduced-motion` is part of the design contract, not a later patch.

When reduced motion is requested:

- reveal animations are disabled;
- overlay/panel animations are disabled;
- skeleton/spinner loops are disabled;
- non-essential control transitions are disabled;
- presence exit waiting is skipped.

The shared reduced-motion reader uses `globalThis` through a narrow typed runtime contract. Direct `window` dependency is forbidden in the shared motion contract so strict TypeScript and non-DOM validation remain valid.

## Proof surface

Canonical route:

`/foundation/motion`

The Motion Lab demonstrates:

- touch/press feedback;
- Fade / Rise / Scale reveals;
- controlled stagger delays;
- Dialog presence;
- Bottom Sheet presence;
- reduced-motion status and behavior.

## Permanent quality gate

`verify:phase2.5` extends the full Phase 2.4 verification and adds:

- Phase 2.5 Motion Audit;
- Phase 2.5 destructive self-test.

GitHub Actions then also runs:

1. locked dependency install with `npm ci`;
2. full Phase 2.5 verification;
3. real TypeScript `tsc -b`;
4. Vite production build;
5. `dist/index.html` assertion.

## Final verified evidence

Latest green GitHub Runner verification before merge:

- 85/85 behavior tests passed;
- 127/127 motion/interaction/presence/reduced-motion invariants passed;
- 16/16 deliberate motion regressions rejected;
- 41/41 component/accessibility/RTL/gate invariants passed;
- 17/17 deliberate component regressions rejected;
- token system: 264 total / 220 public typed / 77 component contracts;
- strict TypeScript `tsc -b` passed;
- Vite 8.2.2 production build passed;
- 169 modules transformed;
- production `dist/index.html` exists.

## Real defects found during Phase 2.5

The phase gate exposed and forced fixes for genuine defects instead of masking them:

1. CSS audit false-positive caused by a forbidden phrase inside a comment.
2. Offline React shim incompatibility with a functional state updater in the Motion Lab.
3. Literal TypeScript inference narrowed the presence duration to 220ms and rejected the 320ms sheet duration.
4. Reduced-motion token overrides duplicated token definitions and violated the Phase 2.2 single-definition contract.
5. Phase 2.4's older audit incorrectly required the GitHub workflow to remain frozen at `verify:phase2.4`; it was hardened to accept future higher gates while rejecting downgrade below Phase 2.4.
6. Shared motion runtime used direct `window.matchMedia`, which failed real strict TypeScript. It was replaced with a narrow `globalThis` runtime contract and a destructive regression probe.

## Exit criteria

Phase 2.5 may be considered complete only when the final PR revision and the merged `main` revision both pass the permanent GitHub Quality Gate.

Next phase: **Phase 2.6 — Mobile / Android Hardening**.
