# ENJAZ UI Rebirth — DNA Contract

This directory is the only visual source of truth for the new ENJAZ interface generation.

## Hard boundary

Files under `src/ui-rebirth/` MUST NOT import or depend on the previous visual layer under:

- `src/styles/`
- legacy `AppShellFrame` visual classes
- legacy Home visual classes
- Identity 2 / Identity 3 / productivity polish or depth CSS
- reserved-boundary visual implementations

Business logic, routing contracts, typed data services, auth/session contracts and domain repositories may be reused. Visual structure may not.

## Approved visual reference mapping

- Home: warm gold + charcoal, asymmetric premium dashboard composition.
- Finance: ice/cobalt/deep-blue finance composition with actionable summaries, ledger items and charts.
- Analytics: gold + violet + deep navy, KPI blocks, progress and chart-led composition.
- Daily Work: timeline/date-strip/task-flow references; compact operational density.
- Transactions: structured list/search/create references with clean category chips and forms.
- Workflow/Automation: staged progress, timeline and completion-state references.
- Companies/People: search/profile/progress references.
- Operations/Command: project/schedule/control-surface references.
- Documents/Vault: category/detail/content references.

The reference image controls composition, geometry, density, hierarchy, interaction style and motion language. ENJAZ business facts control labels, data, actions and domain behavior.

## Core visual grammar

1. Light premium canvas, not a wall of white cards.
2. Gold/charcoal are the global identity anchors.
3. Domain palettes may be distinct but must remain in the same family.
4. Card geometry varies by importance; repeated equal rectangles are not the default.
5. Every screen has a deliberate focal zone.
6. Dense information uses compact rows, chips, timelines, progress or charts rather than oversized containers.
7. Bottom navigation and central action are designed as one composition.
8. Motion is subtle, spring-like and functional; reduced-motion is mandatory.
9. RTL and Android phone behavior are first-class.
10. No developer or phase terminology is user-visible.

## Stage 0 rule

The previous visual runtime remains untouched only as a temporary compatibility island while the new runtime is built and proven. No new UI work may be added to it. New screen construction must happen only inside this rebirth boundary.
