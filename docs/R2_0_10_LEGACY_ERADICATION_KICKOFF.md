# ENJAZ Rebirth 2.0 — R2.0-10 Legacy Eradication

Status: **ACTIVE PREFLIGHT**

Branch: `r2-0-10-legacy-eradication`

R2.0-10 removes obsolete presentation generations only after R2.0-9 reality proof. It is not a redesign stage and it may not change approved business/data semantics.

## Mandatory scope

- delete the old shell and old navigation presentation,
- delete old search presentation,
- delete obsolete CSS, presentation components and presentation assets,
- physically remove `src/ui-rebirth`,
- physically remove `src/ui-v2`,
- preserve `src/core`, `src/data`, `src/features`, `src/shared`, Supabase/RLS, repositories/services and authoritative business logic,
- preserve `src/ui-r2` as the only Rebirth 2.0 presentation generation.

## Preflight finding — parity must be resolved before destructive deletion

The current Feature Parity inventory is 27 / 35 migrated and tested. Eight capabilities remain unresolved for legacy deletion:

1. `auth.session_access` — live authoritative.
2. `auth.protected_workspace` — live authoritative.
3. `home.workspace` — live authoritative.
4. `home.executive_briefing` — live authoritative.
5. `global.create.review_only` — review-only presentation.
6. `global.notifications` — static presentation.
7. `global.account` — shell presentation.
8. `followups.workspace` — presentation-domain contract.

No physical deletion of the live `src/ui-v2` runtime is allowed while any live-authoritative capability above remains unresolved.

Presentation-only capabilities must be either migrated truthfully or explicitly retired without inventing persistence, notification state, account actions, or domain behavior.

## Deletion order

1. Dependency inventory and hard protection of shared business/data boundaries.
2. Eradicate `src/ui-rebirth` first if no live dependency exists.
3. Resolve all eight parity blockers.
4. Prove R2.0 feature parity = 35 / 35 migrated and 35 / 35 tested.
5. Remove old shell/navigation/search/styles/assets from `src/ui-v2` and physically remove the directory.
6. Produce Legacy-Zero evidence: `src/ui-rebirth = absent`, `src/ui-v2 = absent`, legacy presentation imports = 0.

## Canonical-runtime safety

`src/main.tsx` may **not** boot `UiR2Root` during R2.0-10. Canonical promotion belongs only to R2.0-11.

Because physical deletion of `src/ui-v2` and canonical promotion are adjacent hard-gated operations, the Legacy-Zero candidate is prepared on the R2.0-10 branch and becomes the direct base for R2.0-11. A broken intermediate canonical `main` must never be merged.

## Exit gate

R2.0-10 may close only when:

- parity is 35 / 35 migrated and 35 / 35 tested,
- unresolved capabilities = 0,
- `src/ui-rebirth` is physically absent,
- `src/ui-v2` is physically absent,
- protected business/data boundaries remain intact,
- R2.0-4 through R2.0-9 cumulative gates remain preserved,
- Legacy-Zero audit passes,
- promotion remains blocked until R2.0-11.
