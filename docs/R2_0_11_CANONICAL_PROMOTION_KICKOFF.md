# R2.0-11 — Canonical Promotion Kickoff

Status: **ACTIVE_PROMOTION / FAIL-CLOSED**

Base commit: `609c4d524cffd00da872d3c44e988d33e971ebec`

## Purpose

R2.0-11 does not redesign ENJAZ and does not introduce new product/domain scope. It promotes the already-proven Rebirth 2.0 production candidate into the canonical UI only after the complete promotion contract is re-certified as one atomic decision.

The production candidate already boots through `src/main.tsx` → `UiR2ProductionRoot`, but this alone is not promotion. Canonical ownership is governed by the machine-readable R2 state and remains blocked while `promotion.allowed=false`.

## Preserved boundaries

- Phase 5.5 remains locked.
- No Supabase schema, RLS, Auth, Data Layer, repository/service or business-rule rewrite.
- No new palette color.
- No legacy presentation restoration.
- `src/ui-v2` and `src/ui-rebirth` remain physically absent.
- Feature Parity remains 35/35 migrated, 35/35 tested, 0 unresolved.
- Golden approval, Beauty evidence, No-Maze evidence and the frozen Design System remain authoritative.

## Fail-closed promotion model

### Step A — ACTIVE_PROMOTION

The branch enters `R2.0-11` with:

- `promotion.requested=true`
- `promotion.allowed=false`
- `runtime=ui-r2-candidate`
- post-merge recertification flags false
- `exitGatePassed=false`

This state is allowed only when all static promotion preconditions remain true. It is intentionally not canonical closure.

### Step B — Canonical recertification

The ACTIVE promotion candidate must pass together:

1. explicit Golden approval / Beauty Gate,
2. Professional UX / No-Maze,
3. Feature Parity 35/35 migrated + 35/35 tested + 0 unresolved,
4. Legacy-Zero,
5. five-color palette purity,
6. TypeScript,
7. production build,
8. strict asset budget,
9. cumulative business/data gates,
10. WCAG hardening,
11. full Real Browser Acceptance including destruction waves and Production Bridge.

The ACTIVE promotion PR may be merged only after those candidate gates are green.

After merge, the resulting `main` must then be re-certified again through:

- canonical Quality/Governance/Promotion gates,
- Real Browser Acceptance on `main`,
- GitHub Pages publication for the same canonical commit,
- Live External Gate against the actually published application.

### Step C — CLOSED

Only after the post-merge `main`, Pages and Live External recertifications succeed may a closure transition set:

- `runtime=ui-r2`
- `promotion.status=CLOSED`
- `promotion.allowed=true`
- `canonicalMainRecertified=true`
- `pagesRecertified=true`
- `liveExternalRecertified=true`
- `exitGatePassed=true`

Until that transition is independently gated and merged, Canonical Promotion remains active and fail-closed.

## Exit

R2.0-11 is CLOSED only when Rebirth 2.0 is the machine-declared canonical UI and all promotion evidence is persisted. Only after closure may project governance explicitly decide whether Phase 5.5 is allowed to resume; R2.0-11 itself does not unlock Phase 5.5 automatically.
