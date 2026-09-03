# ENJAZ Phase 2.4 — Core Component System

Phase 2.4 converts the visual identity, tokens, and Arabic typography foundation into reusable React components before application screens are built.

## Shipped component families

- `Button` with primary, secondary, danger, ghost, disabled and loading states.
- `IconButton` with a mandatory accessible label and a 44px minimum touch target.
- `Card`, `CardHeader`, `CardBody`, `CardFooter` with surface, muted, raised and prominent depth levels.
- `Badge` with neutral, brand, success, warning, danger and info states.
- `TextField`, `TextAreaField`, `SelectField` with required labels, hint/error relationships and `aria-invalid`.
- `Switch` and native `Checkbox` with accessible checked-state semantics.
- `Tabs` with tablist/tab roles, roving tab index and RTL-aware arrow/Home/End keyboard navigation.
- `Dialog` and `BottomSheet` with modal labelling, labelled close control and Escape dismissal.
- `ProgressBar`, `Skeleton`, and `EmptyState` for loading/progress/empty feedback.

## Non-negotiable rules

1. No clickable `div` cards. Interactive actions use semantic controls.
2. All icon-only controls require an accessible name.
3. All reusable controls preserve the 44px touch floor.
4. Fields always bind a visible label to their control and connect hint/error text through ARIA.
5. Component CSS uses design tokens and logical RTL properties; no raw colors, random shadows, or inline style escape.
6. Core overlays provide structural keyboard dismissal now; full mobile keyboard/back/focus hardening continues in Phase 2.6.
7. No external icon-font or runtime CDN dependency is introduced.

## Proof surface

`/foundation/components` renders buttons, cards, badges, tabs, fields, choices, Dialog, BottomSheet, progress, skeleton and empty-state examples with long Arabic names and mixed-direction data.

## Quality gate

`verify:phase2.4` runs all previous Phase 1.x/2.1/2.2/2.3 gates, the Phase 2.4 component audit, and deliberate component/accessibility destructive probes before TypeScript and the production Vite build run in GitHub Actions.
