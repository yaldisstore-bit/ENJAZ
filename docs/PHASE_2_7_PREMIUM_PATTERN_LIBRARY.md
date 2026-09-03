# Phase 2.7 — Premium Pattern Library

Status: implementation target for the current branch.

Phase 2.7 is the first domain-aware visual layer of ENJAZ. It composes the generic tokens, typography, core components, motion system and mobile hardening from 2.1–2.6 into reusable operational patterns.

These patterns are **not complete product screens**. Their job is to prevent every future screen from inventing its own card hierarchy, status language, financial presentation, error state or mobile behavior.

## Required families

### Transaction
- Transaction card with reference, company, lifecycle state, stage, risk, progress and follow-up context.
- Active, stalled, completed and archived states.
- Comfortable and compact density.

### Company
- Company identity and legal form.
- Active/stalled transaction counts.
- Financial relationship summary.
- Long-name containment.

### Contact / Lawyer
- Contact identity, role, company relationship, phone and open-item context.
- Active, attention and inactive states.

### Finance
- Total, paid, outstanding and overdue values.
- Collection progress.
- Huge-money containment without scientific notation or overflow.

### Risk
- Low, medium, high and critical levels.
- Reason, entity context and proposed next action.
- Visual urgency without uncontrolled glow or raw colors.

### Timeline
- Ordered semantic activity history.
- Neutral, brand, success, warning and danger event tones.
- Long descriptions remain contained.

### Follow-up
- Upcoming, overdue and completed states.
- Date/time, owner, entity and note context.
- Touch-safe action surface.

### Workflow
- Completed, current, upcoming and blocked steps.
- Progress is derived from the supplied step state.
- Ordered semantics and compact phone layout.

### Automation
- Human-readable trigger → outcome flow.
- Active, paused and error states.
- Last-run context without duplicating the automation engine.

### Command Center
- Reusable command module showing operational metrics and one clear entry action.
- Does not contain independent business logic.

### Search
- Unified result pattern for Transaction, Company, Contact and Document results.
- Reference, metadata, status and accessible open action.

### Contextual Action Menu
- Native button semantics.
- Default and destructive actions.
- 44px touch floor on coarse pointers.

### System states
The library explicitly supports:
- empty
- loading
- success
- warning
- error
- conflict
- offline
- recovery

Error and conflict states announce with alert semantics. Other states use polite status announcements.

### Skeleton
- Stable structural loading placeholder.
- Comfortable and compact variants.

## Pattern Lab

Route: `/foundation/patterns`

The Pattern Lab must prove the full library with realistic ENJAZ content, including:
- a very long Arabic company name,
- a billion-scale IQD amount,
- stalled and critical transaction state,
- timeline activity,
- overdue follow-up,
- blocked workflow,
- automation error,
- Command Center modules,
- Transaction / Company / Document search results,
- all system recovery states,
- compact mobile variants.

## Visual and architecture rules

- Token-only visuals. No raw color literals.
- No inline style escape.
- No `!important`.
- No arbitrary z-index ladder.
- Logical RTL properties only for horizontal layout.
- Motion only from the established 2.5 token contract.
- Hover behavior must be capability-scoped to fine pointers.
- `prefers-reduced-motion` remains respected.
- Coarse-pointer controls preserve the 44px floor.
- 48rem mobile and 22.5rem narrow-phone layouts are explicitly handled.
- Safe areas and dynamic viewport behavior from 2.6 are preserved in the lab.

## Quality gate

Phase 2.7 adds:
- `tests/patternLibrary.test.ts`
- `scripts/phase2-7-pattern-audit.mjs`
- `scripts/phase2-7-pattern-selftest.mjs`
- `npm run verify:phase2.7`

`verify:phase2.7` extends the immutable `verify:phase2.6` gate and then runs the pattern audit, deliberate destructive selftest and roadmap audit.

## Exit criteria

Phase 2.7 is complete only when:
1. every required family above is implemented and exported,
2. Pattern Lab proves every family and state,
3. token / RTL / motion / mobile contracts remain intact,
4. deliberate regressions are rejected by the selftest,
5. TypeScript succeeds,
6. production build succeeds,
7. Pull Request Quality Gate is green,
8. the merged `main` Quality Gate is green.

After that, the next phase is **2.8 — Visual Destruction & Quality Gate**. Phase 3 App Shell remains forbidden until 2.8 passes.
