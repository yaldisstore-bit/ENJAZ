# Phase 9.1 — Smart Risk Engine Kickoff

**Status: IN PROGRESS**

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

Phase 9.1 may preserve it as frozen historical evidence, but canonical `/app/risk` must not claim those fixture values as live risk. Production promotion requires the new risk engine and a live data adapter.

## Required gates before closure

- predecessor Phase 8 closure audit remains PASS;
- deterministic risk-engine unit/destruction tests;
- no write-authority regression;
- full functional regression;
- database/roadmap/secrets/TypeScript gates;
- unchanged production JavaScript hard ceiling: **670000 bytes**;
- Real Chromium at 1280 / 430 / 390 / 360 / 320 for the production risk surface;
- exact-head PR matrix;
- merge to `main`;
- exact merged-SHA recertification;
- Pages/deployed-live and Live External critical path;
- zero Critical/High/functional blockers.

## Successor lock

**Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence remains LOCKED.**

Phase 9.2 is not authorized until Phase 9.1 is formally closed under the same exact-head / exact-main / deployed-live discipline.
