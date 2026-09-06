# Phase 5.5 — Transaction Destruction Gate Kickoff

Status: **ACTIVE / NOT CLOSED**

Base commit: `defc0bf964b4446f92f6e96931f5643f586d9cfd`

Unlock decision: `docs/PHASE5_5_UNLOCK_DECISION.md`

## Purpose

Phase 5.5 is the final destructive gate for Phase 5 — Transactions Core. It attacks the already-closed transaction capabilities from Phase 5.1 through Phase 5.4 as one integrated product surface instead of treating each prior closure as sufficient in isolation.

## Required attack families

1. **Large lists and capacity boundaries**
   - dense transaction datasets,
   - pagination ceilings,
   - 5,000-row source safety boundary,
   - no partial workspace results after capacity failure.

2. **Malformed and missing relations**
   - missing company/contact relations,
   - malformed timestamps and mixed Arabic/Latin identity fields,
   - deleted rows never leaking through counts/search/related context,
   - unsafe monetary precision remains explicit.

3. **Conflicting edits**
   - stale editor snapshots,
   - lifecycle change racing an editor save,
   - stale lifecycle contexts,
   - no mutation after conflict detection.

4. **Offline and unknown-outcome failures**
   - authoritative reads fail closed,
   - core write failure must not be reported as success,
   - unknown companion-write outcomes remain warnings requiring refresh/review,
   - no hidden fallback to fabricated local persistence.

5. **Repeated actions**
   - duplicate lifecycle intent cannot silently apply twice,
   - stale repeated actions must be rejected before duplicate history writes,
   - archive / restore / reactivate semantics remain distinct.

6. **Destructive regression**
   - Phase 5.1 list/search,
   - Phase 5.2 create/edit,
   - Phase 5.3 360°,
   - Phase 5.4 lifecycle,
   - full functional regression,
   - database audit,
   - TypeScript,
   - production build and strict asset budget,
   - cumulative R2 Legacy-Zero / WCAG / Real Browser preservation.

## Initial machine state

- `status=ACTIVE`
- `exitGatePassed=false`
- `phase6Allowed=false`
- R2.0-11 remains `CLOSED`
- canonical runtime remains `ui-r2`
- Legacy-Zero remains mandatory

## Closure conditions

Phase 5.5 may close only when:

- the dedicated destruction test suite is green,
- the dedicated Phase 5.5 audit is green,
- every prior Phase 5 transaction suite remains green,
- full functional regression remains green,
- data/security/database integrity remains green,
- TypeScript/build/budget remain green,
- cumulative R2 governance and browser acceptance remain green,
- real defects found during 5.5 receive regression coverage,
- final evidence is persisted,
- closure PR is merged and canonical `main` is re-certified.

Until all closure conditions pass, **Phase 6 must not start**.
