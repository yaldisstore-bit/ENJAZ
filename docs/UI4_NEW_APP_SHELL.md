# UI-4 — New App Shell

## Scope

UI-4 rebuilds ENJAZ global application chrome on the clean UI V2 boundary without changing product/domain scope.

Implemented surfaces:
- fixed premium top bar with ENJAZ title, global search, notifications and account entry;
- fixed bottom dock with four navigation destinations;
- centered yellow/orange primary action engineered as part of the dock composition;
- global search dialog;
- notifications sheet;
- quick-create sheet;
- safe-area handling for top and bottom edges;
- visualViewport tracking;
- keyboard-open dock hiding contract;
- Escape and browser-back overlay dismissal;
- 44px minimum mobile interaction targets.

## Runtime proof

Final visual/runtime proof was executed against commit `8c842a5a2018aebf020f4d7bcc2d6a9e04b0e009` on GitHub Actions run `33877149814`.

The gate passed:
- UI V2 boundary audit;
- UI-4 shell structural audit;
- 46 functional regression tests;
- TypeScript;
- production build;
- real Vite runtime;
- real Chromium interactions and geometry checks.

Browser profiles:
- 1280×900 desktop;
- 430×932 phone;
- 390×844 phone;
- 360×740 phone;
- 320×700 phone.

The browser gate verifies:
- top bar stays inside viewport;
- bottom dock stays inside viewport before and after scrolling;
- ENJAZ title remains visible;
- centered primary action is geometrically centered in the dock;
- navigation never makes the dock disappear;
- search typing accepts mixed Arabic/Latin/numeric content;
- search, notification and create overlays remain viewport-safe;
- browser Back closes overlays;
- Escape closes search;
- mobile targets remain at least 44px;
- keyboard-open state hides the dock rather than covering focused inputs;
- no horizontal overflow;
- no console or page errors.

## Defects caught before closure

### 1. ENJAZ title disappeared at 320px

The first real browser run failed because the compact breakpoint hid `.ez-app-shell__brand-copy` below 340px. This directly reproduced one of the historical UI failures: the app identity disappearing on narrow phones.

Resolution: the interaction contract now preserves the ENJAZ title at 320px and compresses typography/layout instead of deleting the title.

### 2. Low-contrast 78% metric escaped automated geometry checks

The browser gate became green after the 320px fix, but manual screenshot review caught a visually poor 78% metric whose dark-tone primitive expected a dark parent surface and therefore became almost invisible on the light shell preview.

Resolution: the preview now uses the correct high-contrast metric treatment. A fresh full Reality Gate passed on run `33877149814`, and manual review confirmed the corrected desktop and 320px screenshots.

## Closure rule

UI-4 is considered closed only after both conditions are true:
1. automated Reality Gate passes on all five viewport profiles;
2. manual screenshot review finds no obvious title, dock, central-action, overlay or contrast defect.

The original Master Roadmap remains unchanged: Phase 4.1 is closed and Phase 4.2 remains on HOLD until the temporary UI/UX Rebirth V2 roadmap is frozen and accepted.
