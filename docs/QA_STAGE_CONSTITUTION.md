# ENJAZ — Extreme QA Stage Constitution

This is a release rule, not an optional checklist.

## Non-negotiable closure rule

No ENJAZ stage, feature phase, visual phase, data phase, refactor, or hotfix may be declared complete unless the exact candidate SHA survives the complete QA chain below. A failure means the stage remains open. The product is fixed; the gate is not weakened to obtain a green result.

### Before merge

1. **ENJAZ Quality Gate** must pass on the stage PR.
   - QA contract self-audit
   - previous-visual-runtime rejection
   - Shell structural gate
   - destructive Shell selftest
   - Extreme UI contract
   - deliberate-regression mutation gate
   - complete functional regression suite
   - secrets audit
   - database audit + database destructive selftest
   - roadmap integrity
   - strict TypeScript
   - production build
   - strict production asset budget
   - verified `dist/index.html`
2. **ENJAZ Real Browser Acceptance** must pass on the same PR SHA.
   - real pinned Chromium
   - mobile geometry and overflow
   - RTL and safe areas
   - touch-target integrity
   - keyboard navigation
   - modal focus trap and restoration
   - console/page failure detection
   - axe WCAG A/AA with zero accepted violations
   - production-size budget

### After merge to `main`

3. The same **Quality Gate** runs again on `main`.
4. The same **Real Browser Acceptance** runs again on `main` even if a direct push occurred.
5. **ENJAZ Pages Preview** may deploy only from a successful Quality Gate SHA on `main`.
6. **ENJAZ Live External Gate** must attack the actual public GitHub Pages deployment over HTTPS from a separate runner using real Chromium + axe. It must pass before the stage is officially closed.

## Every new stage must expand the tests

The existing gates are the minimum floor, never the ceiling. When a stage introduces new behavior, screen structure, route, data flow, form, dialog, report, animation, financial logic, workflow rule, or integration, that stage must add:

- positive functional coverage for the new behavior;
- negative/error-state coverage;
- destructive/mutation cases that deliberately break the new contract and prove the guard detects the regression;
- real-browser coverage when the change is user-visible;
- WCAG checks for every newly reachable UI state;
- responsive checks for relevant mobile widths;
- database/service integrity checks when data behavior changes;
- production-size/performance budget updates only when justified, never merely to make a failure disappear.

## Forbidden shortcuts

The following are prohibited for stage closure:

- `continue-on-error: true` on critical QA;
- lowering WCAG expectations because a screen fails;
- skipping browser tests for a visual change;
- deleting mutation cases because they expose a regression;
- increasing size/performance budgets without an explicit architectural reason;
- replacing real Chromium acceptance with source-only assertions;
- claiming a stage complete while any mandatory gate is pending, skipped unexpectedly, cancelled, or failed;
- merging a stage merely because TypeScript/build is green.

## Canonical command

For local/source certification, every stage uses:

```bash
npm run verify:stage
```

This aliases the full `verify:extreme` chain. GitHub then adds the real-browser and post-deployment external layers.

## Interpretation

A green stage means the application survived the tests. It does **not** mean the tests were relaxed until the stage became green.
