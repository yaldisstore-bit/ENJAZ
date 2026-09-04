# UI-9 — Motion, Touch & Mobile Polish

## Status

**CLOSED ✅**

UI-9 is the motion, physical interaction and mobile-hardening stage of ENJAZ UI/UX Rebirth V2. It does not introduce new domain scope and does not advance the frozen Master Roadmap beyond Phase 4.1. Phase 4.2 remains on HOLD until UI/UX Rebirth V2 is frozen after UI-10.

## What changed

### Unified motion language

- Added one UI V2 motion/touch/mobile stylesheet loaded after the existing visual layers.
- Added a shared screen motion surface for core and domain navigation.
- Added real overlay presence states so sheets and dialogs animate out before DOM detach instead of disappearing instantly.
- Search, sheets, dialogs and route/content transitions now use one restrained motion language.
- Entry transitions use opacity + translation only; they do **not** scale interactive geometry.

### Physical touch feedback

- Interactive controls share a consistent press response and `touch-action: manipulation`.
- Coarse-pointer controls preserve minimum physical targets.
- Compact critical controls use a safety margin above the 44px floor where subpixel rendering could otherwise dip below the contract.
- `EzButton` now defaults to `type="button"`; submit behavior must be explicit.

### Android/mobile runtime contract

- AppShell tracks Visual Viewport width, height and offsets.
- Runtime tracks keyboard-open state, orientation and coarse/fine pointer state.
- Overlays are tied to the visual viewport rather than assuming the layout viewport.
- Safe-area left/right protection is enforced for top bar, content and bottom dock.
- Short landscape phones keep usable touch targets and viewport-bounded sheets instead of shrinking controls.
- Browser/Android Back behavior remains part of the real-browser journey.

### Reduced motion

- `prefers-reduced-motion: reduce` reduces animation and transition durations to effectively immediate state changes.
- Reduced motion preserves layout, state and interaction semantics; it removes decorative movement only.

## Destruction findings fixed during UI-9

### 1. Keyboard/rotation race in the first UI-9 Reality Gate

The first Chromium cycle exposed a race between a synthetic keyboard-open condition and delayed `visualViewport.resize` events emitted after rotation. The test was corrected to wait for viewport/orientation stability before applying the keyboard condition. The production viewport contract itself was not weakened.

### 2. Hidden form submission from reusable buttons

The cumulative UI-8 gate found a real interaction defect after exit-presence was added: a reusable `EzButton` inside Quick Create could inherit the browser default `type="submit"`. Pressing the destructive-confirmation **Cancel** action could therefore submit the surrounding form and move the flow into review.

Fix:
- `EzButton` defaults to `type="button"`.
- Actual submit actions remain explicit.
- UI-8 architecture audit now permanently rejects regression to implicit submit behavior.

### 3. Touch targets shrinking during entry animation

UI-7 and UI-8 independently caught controls measuring below 44px during active entry frames:

- domain back control: approximately `43.87px` while the stage used `scale(.997)`;
- search close control: approximately `43.74px` while search used `scale(.99)`.

Fix:
- removed scale from stage/search **entry** animations;
- entry motion is now translation + opacity only;
- UI-9 architecture audit rejects future scale usage inside those entry keyframes.

This keeps the physical hit area stable from the first rendered frame.

### 4. Final subpixel floor violation

After scale removal, the 320px UI-8 run measured the search close target at `43.999992px`. The gate was deliberately **not** relaxed. Critical compact close controls were raised to a real 46px safety target so the 44px contract remains strict.

## Final implementation evidence

Implementation head before closure documentation:

`b681ddcbcd4c5e516401092dede46312300e31d8`

Cumulative GitHub Actions on that exact head:

- UI-1 Gate — run `33895898508` — PASS
- UI-3 Reality Gate — run `33895898479` — PASS
- UI-4 App Shell Reality Gate — run `33895898581` — PASS
- UI-5 Composition Reality Gate — run `33895898184` — PASS
- UI-6 Core Screens Reality Gate — run `33895898489` — PASS
- UI-7 Domain Reality Gate — run `33895898480` — PASS
- UI-8 States Forms Reality Gate — run `33895898653` — PASS
- UI-9 Motion Touch Mobile Reality Gate — run `33895898514` — PASS

UI-9 evidence artifact:

`9945721644`

Artifact result contract:

- desktop-1280 profile — PASS
- phone-390 profile — PASS
- phone-320 profile — PASS
- rotation — PASS
- reduced motion — PASS
- exit presence — PASS
- 44px touch floor — PASS
- Back behavior — PASS

## Manual screenshot review

Reviewed from the same UI-9 artifact/head:

- 320px portrait Home: no dock/center-action deformation, clipping or horizontal overflow.
- 390px portrait Home: identity, hierarchy and dock geometry remain coherent.
- 320px and 390px landscape Quick Create: sheet remains usable and viewport-bounded without shrinking touch targets.
- Reduced-motion screenshot: layout/identity remain identical while motion is suppressed.
- Desktop 1280: responsive composition remains intentional rather than a stretched mobile layout.

## Preservation check

Comparison against `uiux-rebirth-v2` before closure showed no UI-9 modifications in:

- `database/`
- `src/core/`
- `src/data/`
- `src/features/`
- `src/shared/`
- `tests/`
- `tests-external/`
- `docs/ENJAZ_MASTER_ROADMAP.md`

UI-9 changes remain confined to UI V2 presentation/runtime integration, regression gates and this stage documentation.

## Exit decision

UI-9 exit criteria are satisfied:

- motion feels intentional rather than decorative;
- entry animations never shrink interactive geometry;
- touch feedback and minimum targets are protected;
- Android keyboard/back/rotation/safe-area contracts are exercised in real Chromium journeys;
- reduced motion preserves product behavior;
- cumulative UI-1 through UI-9 regressions are green on the final implementation head;
- manual visual evidence is accepted.

**UI-9 — Motion, Touch & Mobile Polish ✅ CLOSED**

Next stage: **UI-10 — Full Visual Destruction & UI Freeze**.
