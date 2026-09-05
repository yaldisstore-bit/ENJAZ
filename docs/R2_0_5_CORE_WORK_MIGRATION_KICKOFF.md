# ENJAZ R2.0-5 — Core Work Migration Kickoff

Status: **ACTIVE / NOT YET CLOSED**

Branch: `r2-0-5-core-work-migration`

Prerequisite: **R2.0-4 Golden Experience explicitly user-approved and merged to main.**

## Authoritative scope

Per `docs/UI_UX_REBIRTH_2_0_MASTER_PLAN.md`, R2.0-5 migrates the core work surfaces only:

- Transactions — fully
- Today
- Follow-ups
- Related documents
- Create / Edit presentation
- Lifecycle presentation

## Hard preservation rules

R2.0-5 must preserve the authoritative business and data semantics already closed through Phase 5.4. It may change presentation and interaction composition inside `src/ui-r2`, but it must not rewrite approved Supabase/RLS/Data Layer/service semantics merely to fit the new UI.

The approved R2.0-4 Golden visual contract remains global and locked:

- preserve the approved Rebirth 2.0 identity
- hierarchy + depth + layer separation
- soft integrated corners
- coherent pages rather than flat single surfaces
- restrained effects
- no equal-weight card wall
- no palette drift
- no legacy presentation DNA reintroduction

## Runtime boundary

The canonical runtime remains `ui-v2` during R2.0-5. `src/main.tsx` must not boot `UiR2Root` before R2.0-11 promotion.

Phase 5.5 remains locked while Rebirth 2.0 is active.

## Stage opening condition

R2.0-5 is opened only because the Golden approval barrier is now satisfied:

- approved Golden evidence commit: `96da5a33560326e85caea623e8c750c4a0f6c6df`
- approval record: `docs/R2_0_4_GOLDEN_APPROVAL.md`
- R2.0-4 merge commit on main: `26bca0edf05f69e67e4410cad13d47d7abeb922a`

This kickoff does not claim R2.0-5 completion. Migration evidence and parity updates must be produced by the implementation work that follows.
