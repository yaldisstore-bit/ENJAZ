# Phase 5.3 — Transaction Details / 360°

Status: **IN PROGRESS**

Canonical base: `main` at `b2468dcd5f7600486d26a46ede8851e84c0e773f` after Phase 5.2 post-merge re-certification and live external gate.

## Objective
Build one authoritative, workspace-scoped transaction 360° read surface that composes existing sources of truth instead of duplicating them.

## Required context
- Core transaction identity, company/contact context, status, priority, fee and activity timestamps.
- Unified timeline/activity from authoritative append-only sources.
- Notes and follow-ups.
- Financial relation for the transaction without replacing Phase 7 Finance.
- Related documents.
- Workflow indicator.
- Risk/blocker indicator.

## Boundaries
- Phase 5.3 is primarily contextual read/composition. Existing Phase 5.2 editor remains the authoritative create/edit path.
- Archive, restore, reactivation and lifecycle mutation remain strictly Phase 5.4.
- Full Finance operations remain Phase 7.
- Full workflow management remains Phase 8.
- Smart intelligence and automation remain their later roadmap phases.
- No direct Supabase client inside the feature; all live reads go through the typed workspace Data Layer.
- No legacy R4/R6/V7/V8 UI or 360° implementation may be revived.
- Public/CI preview data must stay isolated from authenticated live data and secrets.

## First implementation slice
1. Define a fail-safe Transaction 360 read model.
2. Load transaction, company/contact, routes, activity, notes, follow-ups, payments, fee changes, documents, workflow instance and blockers from the existing Data Layer.
3. Normalize them into bounded sections with explicit missing/unsafe states.
4. Add dedicated model/service tests and architecture guards before wiring the visual surface.
5. Wire Transaction List cards into the 360° surface only after the read model is green.

## Quality requirements
- Missing related records are explicit, never silently fabricated.
- Unsafe money precision is hidden as unsafe, not rendered as exact.
- Timeline ordering is deterministic and bounded.
- Deleted transaction records fail closed.
- A single failed required core source must not be disguised as a complete 360° snapshot.
- Optional contextual sections may expose partial/unavailable state without corrupting core identity.
- Every discovered defect receives a regression guard.

## Exit gate
Phase 5.3 may close only after architecture, dedicated model/service tests, cumulative functional regression, TypeScript, production build, responsive real Chromium, keyboard/RTL/accessibility checks and canonical-main re-certification are green. Phase 5.4 remains locked until then.
