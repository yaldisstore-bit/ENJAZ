# Phase 2.8 — Visual Destruction & Quality Gate

Status: **complete ✅ — Pull Request and merged `main` Quality Gates passed. ENJAZ Design System 1.0 is frozen.**

Phase 2.8 exists to break the ENJAZ visual system **before** Phase 3 is allowed to build the real App Shell and product screens. It does not add business features. It tortures ENJAZ Design System 1.0, the Premium Pattern Library, RTL/mobile contracts and visual governance until failures are either caught automatically or made explicit.

## Required torture scenarios

The `/foundation/destruction` lab proves the following cases together:

- **200+ character company name** with real Arabic wrapping pressure.
- **20 notifications** in one dense storm.
- A **24-event timeline** with long descriptions.
- A **320px** narrow-phone simulation.
- A constrained **keyboard-open** viewport to stress Android/visual-viewport behavior.
- **Huge financial values** close to JavaScript's safe integer range, formatted without scientific notation.
- Mixed **RTL/LTR** content containing Arabic, English, references, phone numbers and IQD values.
- Simultaneous **offline**, error, **conflict** and recovery states.
- Explicit **reduced motion** behavior.
- Keyboard **focus** traversal across buttons, fields, action menus and links.
- User **zoom** remains enabled; the viewport never uses `user-scalable=no` or a restrictive maximum scale.
- Long content, overflow, density and wrapping stress.

Dark/light contrast is conditional in the governing roadmap. ENJAZ does not currently expose a dark theme in Phase 2.8, so this gate does not invent a fake dark mode. Existing token contrast contracts remain enforced; if a dark theme is introduced later it must enter the same destruction gate.

## Visual escape hatches forbidden

Phase 2.8 adds a cross-cutting audit over non-token styles. The gate rejects:

- `!important` structural fixes.
- Numeric/arbitrary **z-index** ladders.
- **raw colors** outside the token source.
- **tiny fonts** below the established product readability floor when hardcoded in CSS.
- `transition: all`.
- inline style escape inside the Premium Pattern Library or destruction lab.
- physical left/right spacing in the destruction layer where logical RTL properties are required.

Raw visual primitives remain legal only inside the Design Token primitive source. Product-facing CSS must consume semantic/component tokens.

## Mobile and accessibility contract

The destruction lab preserves:

- Safe Areas.
- `100vh` fallback plus `100dvh` enhancement.
- Android `interactive-widget=resizes-content`.
- keyboard-aware scroll margins.
- constrained scroll containers with overscroll containment.
- a 44px minimum touch target contract inherited from 2.4/2.6.
- visible `:focus-visible` treatment.
- reduced-motion handling.
- narrow breakpoints at 48rem and 22.5rem.

The static 320px/keyboard frames are deterministic torture fixtures, not claims that every physical Android model has already been manually exercised.

## Automated quality gate

Phase 2.8 adds:

- `src/core/quality/visualDestructionContract.ts`
- `src/features/foundation/pages/VisualDestructionLabPage.tsx`
- `src/styles/visual-destruction-lab.css`
- `tests/visualDestruction.test.ts`
- `scripts/phase2-8-visual-destruction-audit.mjs`
- `scripts/phase2-8-visual-destruction-selftest.mjs`
- `npm run verify:phase2.8`

`verify:phase2.8` extends the immutable `verify:phase2.7` gate. It then runs the Phase 2.8 audit, deliberate destructive selftest and roadmap audit.

## Real defects caught during implementation

The first Phase 2.8 CI pass was deliberately not bypassed when it failed. The existing Phase 2.2 Token Audit caught an invented token reference (`--color-surface-prominent`) inside the new destruction lab stylesheet. The implementation was corrected to consume the existing raised-surface token instead; the token gate itself was not weakened or allowlisted.

## Deliberate regression probes

The selftest intentionally injects bad states and requires the audit to reject them, including:

- lowering the 200-character requirement,
- reducing the 20-notification storm,
- removing the 320px fixture,
- removing the keyboard-open fixture,
- removing offline coverage,
- injecting a raw color,
- injecting `!important`,
- injecting `z-index: 999`,
- injecting a 10px font,
- injecting `transition: all`,
- adding inline styles,
- removing reduced motion,
- disabling zoom,
- removing the destruction route,
- downgrading the Phase 2.8 verification command,
- unlocking Phase 3 before the gate passes.

## Verified results

The complete Phase 2.8 chain passed on the Pull Request and again on merged `main` (main run #82):

- **106/106** behavior and contract tests passed.
- **90/90** Phase 2.8 torture/mobile/RTL/accessibility/gate invariants passed.
- **16/16** deliberate Phase 2.8 regressions were rejected.
- **115/115** Phase 2.7 pattern invariants remained green.
- **14/14** deliberate Phase 2.7 regressions remained rejected.
- **50/50** Mobile / Android invariants passed.
- **7/7** deliberate mobile regressions were rejected.
- **154/154** Motion / Interaction / Presence / Reduced-Motion invariants passed.
- **16/16** deliberate motion regressions were rejected.
- **41/41** component/accessibility/RTL/gate invariants passed.
- **17/17** deliberate component regressions were rejected.
- Design Tokens: **264 total / 220 public typed / 77 component contracts**.
- Database audit: **45 tables / 118 policies / 42 indexes**.
- TypeScript `tsc -b` passed.
- Vite 8.2.2 production build passed with **179 modules transformed**.
- `dist/index.html` assertion passed.

## Exit criteria

All Phase 2.8 exit criteria are satisfied:

1. all required torture fixtures exist in the destruction lab ✅
2. all existing Phase 0–2.7 gates remain green ✅
3. the Phase 2.8 visual audit is fully green ✅
4. every deliberate Phase 2.8 regression is rejected ✅
5. TypeScript succeeds ✅
6. the Vite production build succeeds ✅
7. the Pull Request Quality Gate is green ✅
8. the merged `main` Quality Gate is green ✅
9. **ENJAZ Design System 1.0 is frozen** ✅
10. **Phase 3 — Application Shell & Navigation is unlocked** ✅

No successful automated run is described as a real-device manual visual inspection. Phase 2.8 distinguishes deterministic automated destruction from later full-system real-device validation.
