# UI-2 — ENJAZ Visual DNA 2.0

Status: implementation stage for the independent `ENJAZ UI/UX REBIRTH V2` roadmap.

## Purpose

Define the visual grammar that every UI V2 component and screen must inherit before the component system and application shell are built.

This stage does not recreate product screens. It creates the identity primitives and a live proof surface that UI-3 can compose from.

## Identity anchors

- Global identity: warm gold/yellow + charcoal/black.
- Canvas: warm light neutral, never a cold wall of pure white.
- Gold is used for focus, action and positive energy; it is not sprayed across every surface.
- Charcoal is used for authority, decision, command and contrast.
- White/paper surfaces are supporting layers rather than the default visual structure.

## Typography

- Arabic is the first-class reading direction and spacing target.
- Display/title text is strong and compact without sacrificing legibility.
- Operational labels and values are never miniaturized to create artificial elegance.
- System Arabic-capable fallbacks are required; UI V2 must not depend on a remote font to remain usable.

## Geometry

- Compact controls: 10–14px radius.
- Standard content surfaces: 18px radius.
- Focal zones: 24–32px radius.
- Pills are reserved for chips, filters and status semantics.
- Repeated identical rounded rectangles are not the default layout primitive.

## Depth

Depth is hierarchical, not decorative:

1. warm canvas
2. paper/soft supporting surfaces
3. focal gold surfaces
4. authoritative charcoal surfaces
5. domain accent surfaces when the domain needs its own information character

Shadows stay warm and restrained. Neon glow is forbidden.

## Density

Data-rich screens favor compact rows, timelines, chips, progress and charts. Large cards are reserved for focal information, not used as generic wrappers around every field.

## Domain accents

The app remains one family while domains may carry a secondary accent:

- Finance: cobalt/deep blue.
- Analytics: violet.
- Operations: teal.
- Documents: copper/brown.
- Risk: red-earth.

Gold + charcoal remain global anchors across all domains.

## Iconography

- Rounded linear icons.
- Nominal stroke: 1.8.
- Icons communicate function; decorative glyph noise is forbidden.
- Icon size and touch target are separate: visible icon may be compact while interactive target remains at least 44px.

## Motion

- Motion explains hierarchy, state or action.
- Spring-like easing is preferred for surface transitions.
- Reduced-motion support is mandatory through semantic duration tokens.

## Accessibility contract

Core contrast pairs must remain at least 4.5:1:

- primary ink on warm canvas
- gold ink on gold action/focus surface
- light ink on charcoal
- muted text on paper surface

UI-2 audit calculates these from the token file rather than trusting visual inspection alone.

## Approved reference translation

The existing `docs/UI_REBIRTH_REFERENCE_MAP.md` remains the composition reference library. UI-2 translates those references into reusable identity rules; it does not copy old ENJAZ visuals.

## Live proof

`src/ui-v2/runtime/VisualDnaProof.tsx` demonstrates:

- gold focal zone
- charcoal decision surface
- warm supporting surfaces
- Arabic type hierarchy
- domain accent discipline
- compact operational density

This proof is temporary infrastructure for design validation, not the final Home screen or App Shell.

## Exit gate

UI-2 passes only when:

1. semantic tokens exist for color, surface, typography, geometry, depth, density, state, domain accents and motion;
2. UI V2 still has zero visual dependency on quarantined generations;
3. core contrast pairs pass 4.5:1;
4. a live Visual DNA proof renders from the new tokens and typed DNA contract;
5. TypeScript, functional regression tests and production build remain green;
6. the visual grammar is strong enough for UI-3 to build components without inventing a second identity.
