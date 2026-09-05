# R2.0-4 — Golden Experience Kickoff

Status: **ACTIVE**

Branch: `r2-0-4-golden-experience`

Parent: R2.0-3 Application Shell closed on canonical `main`.

## Purpose

Build the approval specimen for ENJAZ Rebirth 2.0 without changing the approved identity from zero again. R2.0-4 is a polish-and-proof stage: the current visual language is preserved, then made deeper, clearer, softer and more premium before it may propagate to the rest of the product.

## User-locked visual conditions

These conditions are mandatory and global. The two reference screenshots that triggered them are examples only; the rules apply to the whole Rebirth 2.0 presentation as migration continues.

1. Preserve the current elegant Rebirth 2.0 identity. Do not perform another wholesale redesign.
2. Work must be refinement, not patching and not regression into old visual DNA.
3. Remove visually sharp, unintegrated inset panels. Important inset surfaces must use the approved radius system and feel integrated with the surrounding composition.
4. Increase real visual depth without ornamental noise. Use spacing, surface contrast, borders, restrained elevation, composition and hierarchy.
5. A page must remain one coherent composition but must not feel like one undifferentiated white sheet.
6. Identity/title, supporting body copy, status/information and actions must be visually distinguishable where the content hierarchy calls for it.
7. Section/page titles require a distinct premium treatment that still belongs to the same page.
8. Supporting content must receive its own intentional layer instead of floating as plain text under a title when that causes flatness.
9. Avoid card-wall proliferation. Separation must not become a stack of equal-weight boxes.
10. Do not introduce arbitrary colors, old generations, cheap glow, excessive shadows, excessive darkness or decorative effects that damage the approved identity.
11. Apply the rule first to the Golden specimen, then enforce it through R2.0-5 onward across the whole application.
12. A screen that is functionally correct but flat, visually undifferentiated, sharply inset or inconsistent with the approved identity **fails**.

Machine-readable source of truth:
`docs/UI_UX_REBIRTH_2_0_GLOBAL_VISUAL_POLISH_CONTRACT.json`

Machine guard:
`scripts/ui-rebirth-2-golden-visual-contract-audit.mjs`

## Golden specimen scope

R2.0-4 is limited to the approval specimen defined by the master plan:

- Home
- More
- Transactions
- one complete transaction journey
- Transaction 360°

No broad domain migration begins in this stage.

## First implementation pass

The first pass deliberately addresses the exact class of visual defects identified before broader Golden construction:

- round and integrate the Home priority inset;
- give page/section hero headers a distinct but restrained layer;
- add layered hierarchy to destination placeholders instead of one flat surface;
- strengthen list/group containment without turning the UI into a card wall;
- preserve all five locked colors and existing navigation/shell behavior.

## Hard barriers

- `src/main.tsx` remains on canonical `ui-v2` until R2.0-11.
- Phase 5.5 remains locked.
- Golden approval stays false until explicit user approval is pinned to a concrete commit with evidence.
- R2.0-5 may not begin while Golden approval is false.

## Exit target

R2.0-4 can close only after the Golden specimen is interactive and passes:

- Beauty Gate
- Professional UX / No-Maze evidence for the specimen
- real browser evidence at 1280 / 430 / 390 / 360 / 320
- locked visual-polish guard
- explicit user approval tied to a concrete commit
