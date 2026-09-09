# Phase 9.1 — Smart Risk Engine Kickoff

**Status: CLOSED — POST-MERGE RECERTIFIED**

Canonical base: `main` @ `3e877ec957bedb647ef86287affe84b97ede3356`, the formally closed and deployed Phase 8 successor authorization.

## Purpose

Phase 9.1 replaces the historical R2.0-7 risk demo with a production-safe, explainable Smart Risk Engine over authoritative ENJAZ facts.

The engine must answer four questions for every signal:

1. **What is at risk?** — the authoritative object and scope.
2. **Why did the signal appear?** — explicit deterministic components, never an opaque score.
3. **Which facts prove it?** — source references and observed values/timestamps.
4. **What may the user do next?** — a navigation/review recommendation only; the risk engine itself owns no mutation authority.

## Scope

Phase 9.1 may derive risk from authoritative facts already owned by existing systems, including:

- transaction status, priority, blockers and last activity;
- workflow stage/SLA/deadline state where authoritative workflow facts exist;
- due/overdue follow-up or deadline facts where authoritative dates exist;
- company compliance/renewal facts only when an authoritative source date/status exists;
- finance anomaly facts already derived from the authoritative Finance service, such as unusual reversal/collection conditions where evidence exists;
- operational concentration/ownership pressure only when the source assignment/workload facts are authoritative.

Missing evidence must produce **no fabricated signal**. Absence of a date or source fact is not permission to infer one.

## Hard authority boundary

Phase 9.1 is **read-only intelligence**.

- risk-owned database tables: **NONE**;
- risk-owned write RPCs: **NONE**;
- transaction write authority: **none**;
- workflow write authority: **none**;
- finance write authority: **none**;
- company/compliance write authority: **none**;
- automation write authority: **none**.

A signal may link the user to the authoritative domain that owns the corrective action, but it may not execute that action.

No shadow risk truth store may be introduced merely to cache a derived risk result. Any later persistence proposal requires a separate explicit authority review.

## Explainability law

Every production signal must carry:

- stable signal code;
- severity and urgency class;
- affected entity type/id;
- deterministic component list;
- human-readable explanation generated from those components, not an LLM-only assertion;
- evidence references with source domain, source object id, observed value and observed timestamp when available;
- `evaluatedAt`;
- recommended destination/review action that is non-mutating.

A single numeric risk score may be shown only as an optional derived presentation if its components and thresholds remain visible. The authoritative contract is the component/evidence set, not the number.

## Initial signal families

The first implementation slice is limited to deterministic families that can be proved from existing facts:

1. `transaction_stalled` — stalled/blocked transaction with source evidence;
2. `transaction_inactive` — active work with authoritative last activity older than a configured threshold;
3. `open_critical_blocker` — open high/critical blocker;
4. `deadline_overdue` / `deadline_near` — only when an authoritative due timestamp exists;
5. `workflow_sla_pressure` — only when workflow SLA/deadline evidence exists;
6. `finance_anomaly` — only from an existing authoritative finance anomaly/reconciliation fact;
7. `workload_concentration` — only from authoritative assignment/workload counts;
8. `company_compliance_due` — only from an authoritative compliance/renewal fact.

Families with unavailable authoritative facts remain absent rather than simulated.

## Historical R2 risk demo boundary

`src/ui-r2/operational-intelligence/OperationalIntelligenceExperience.tsx` contains a historical R2.0-7 risk sample explicitly labelled as demo/non-production data.

Phase 9.1 preserves it as frozen historical evidence. Canonical production Risk uses authoritative operational evidence only; unavailable broader evidence remains fail-closed.

## Closure certification

The required gates were completed without raising the JavaScript hard ceiling of **670000 bytes** and without adding Risk-owned database/write authority.

- implementation PR #124 final head `0932a33d8b28b15509bfe3da456d09c51ce344fa`: **37/37 SUCCESS**;
- implementation Real Chromium run `34379210721`: **SUCCESS**;
- final published-contract repair PR #127 head `549ea2205fbe9cba91a9d71631f22433afff4eaf`: **39/39 SUCCESS**;
- repair Real Browser run `34411043254`: **SUCCESS**;
- canonical runtime `main` SHA `9b116d39ad3cebc62e6c4f15d4fb72fef1b25fde`:
  - **19/19 exact-main push workflows SUCCESS**;
  - **22/22 cumulative exact-SHA workflow runs SUCCESS**;
  - Phase 9.1 gate `34411497055`: SUCCESS;
  - Real Browser `34411497023`: SUCCESS;
  - Pages build/deployment `34411495854`: SUCCESS;
  - Pages Preview `34411566669`: SUCCESS;
  - Live External `34411616353`: SUCCESS, including the actual published `/live` Smart Risk deployment contract.

The production projection intentionally splits the static risk contract into `template#enjaz-risk-template` and the live read-only bridge into `LiveFinanceProductionPortal.tsx`; this is a budget-safe deployment architecture, not a claim that the full risk service is directly mounted as one component.

See `docs/PHASE9_1_CLOSURE.md` and `docs/PHASE9_1_POSTMERGE_RECERTIFICATION.md`.

## Successor authorization

**Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence is AUTHORIZED.**

This authorization is limited to Phase 9.2. It does not pre-authorize Phase 9.3 or weaken the persistence/RLS/permission requirements that 9.2 must establish for saved views and cross-domain search.
