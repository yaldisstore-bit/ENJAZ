# ENJAZ Rebirth 2.0 — R2.0-2 New Design System

Status: **ACTIVE / NOT CLOSED**

Canonical base: `980ef236395aa7056960cdb07d15b3483b07edf5`

Phase 5.5 remains **PAUSED / LOCKED**. Canonical runtime remains `ui-v2`. This stage builds a parallel visual grammar under `src/ui-r2` and does not start the application shell or Golden Experience.

## Purpose

R2.0-2 creates the visual DNA of ENJAZ Rebirth 2.0 from zero. It does not recolor or wrap legacy presentation.

The system must satisfy both non-negotiable product pillars:
- **Beauty:** premium, distinctive, composed, spatial and alive.
- **Professional UX:** legible, predictable, accessible, touch-safe and structurally clear.

Neither pillar may compensate for failure of the other.

## Locked palette

Presentation may use only the user-approved five-color palette through centralized tokens:
- `#F2F3F4`
- `#DED1C6`
- `#A77693`
- `#174871`
- `#0F2D4D`

No foreign literal or functional color syntax is allowed in `src/ui-r2`.

## Visual direction

The visual language is intentionally independent from the current interface and old reference screenshots.

Core principles:
- hierarchy before decoration,
- generous spatial rhythm rather than card-wall density,
- deep structural surfaces used selectively,
- restrained identity accent,
- typography carries importance,
- primary actions are unmistakable,
- secondary actions remain quiet,
- meaningful motion, never ornamental motion,
- one visual identity with task-appropriate composition,
- status must remain understandable without relying on hue alone.

## Required system families

R2.0-2 must provide and freeze:
- typography,
- spacing,
- radii,
- depth/elevation,
- icon rules,
- buttons,
- fields,
- sheets/dialogs,
- list/table rows,
- headers,
- navigation primitives,
- feedback/loading/empty/error states,
- motion and reduced-motion behavior,
- responsive composition primitives,
- minimum 44px touch geometry,
- RTL and mixed Arabic/Latin-safe defaults.

## Presentation isolation

`src/ui-r2` may use React and shared non-presentation business/data contracts, but it may not import presentation from:
- `src/ui-v2`,
- `src/ui-rebirth`.

No legacy shell class, domain rail, hidden-brand navigation or old component may be copied into the new Design System.

## R2.0-2 hard exit gate

R2.0-2 closes only when:
- machine-readable Design System manifest exists and is `FROZEN`,
- all required system families are present,
- centralized foundation tokens exist,
- real reusable React primitives exist,
- palette purity passes,
- legacy presentation isolation passes,
- minimum touch geometry is encoded,
- reduced-motion behavior is encoded,
- RTL/mixed-direction defaults are encoded,
- TypeScript passes,
- production build passes,
- strict asset budget remains green,
- cumulative Quality and Browser gates remain green,
- Design System CI audit passes.

R2.0-3 must not start automatically. The canonical runtime remains `ui-v2` after this stage closes.
