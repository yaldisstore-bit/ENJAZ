# Phase 9.5 — Business Intelligence & Forecasting Center — M13

Status: **IN PROGRESS — foundation contract first**

## Entry authority

Phase 9.5 starts only from the formally closed and exact-main recertified Phase 9.4 closure merge:

- predecessor: **Phase 9.4 — CLOSED**.
- canonical base: `799873b5c7778c7665c934931af9dd3338bcef47`.
- predecessor exact-main closure recertification: **23/23 SUCCESS**, zero failures/pending.
- Phase 9.4 explicitly authorizes `phase9_5Allowed=true`, `nextPhase=9.5`, `successorStatus=AUTHORIZED`.

Phase 9.6 remains **LOCKED**.

## Product mission

Build one Arabic-first Business Intelligence & Forecasting Center that turns authoritative ENJAZ operational and financial facts into explainable decision support without creating a competing source of truth.

The Phase 9.5 scope is:

1. operational KPI models;
2. financial KPI models that reuse the certified Phase 7.3 finance-intelligence anchor;
3. observed trend series;
4. workload/capacity indicators;
5. deterministic directional forecasts;
6. source provenance for every KPI, trend and forecast;
7. premium RTL/mobile-first surfaces after the foundation/data authority is stable.

## M13 law

**M13 — Business Intelligence & Forecasting Center** becomes `ACTIVE` in this phase.

M13 is a multi-anchor system with governing anchors **Phase 9 + Phase 15**. Phase 9.5 may certify the Phase 9 product slice, but it must **not** declare M13 globally CLOSED. Global M13 closure remains forbidden until the Phase 15 enterprise-hardening anchor and independent `ZERO_ESCAPE_V1` requirements are complete.

## Existing certified finance anchor

Phase 7.3 already owns explainable receivables aging, collection attention, company financial health, six-month collection/cash trends, directional run-rate inputs and deterministic finance signals derived from authoritative finance facts.

Phase 9.5 must reuse that authority. It may compose or extend BI models, but it may not:

- create a parallel ledger;
- create a shadow money store;
- infer a legal due date that does not exist in authoritative data;
- convert exact money into unsafe floating-point authority;
- treat reversed payments as effective collected money.

## Intelligence authority

All Phase 9.5 outputs are **read-only derived intelligence**.

- source provenance: **REQUIRED**.
- authoritative source facts: **SOURCE-OWNED ONLY**.
- KPI/Trend authority: **DERIVED / NON-MUTATING**.
- forecast authority: **DIRECTIONAL / NON-AUTHORITATIVE**.
- forecast confidence and method disclosure: **REQUIRED**.
- fabricated/backfilled history: **FORBIDDEN**.
- direct browser mutation of source domains: **FORBIDDEN**.
- cross-workspace aggregation: **FORBIDDEN** unless a later explicitly authorized enterprise contract owns it.
- silent substitution for missing/invalid facts: **FORBIDDEN**.

## Provenance minimum

Every derived observation must be traceable to:

- workspace identity;
- source domain;
- source snapshot/as-of time;
- source row/sample count;
- observed field or metric basis;
- derivation method/version.

A KPI, trend point or forecast with no valid provenance must fail closed.

## Forecast law

A forecast is never presented as an authoritative future fact.

Every forecast must expose:

- method;
- observed window;
- horizon;
- sample count;
- confidence (`insufficient` or `directional` at this stage);
- assumptions/disclosures;
- authoritative=false;
- source provenance.

Insufficient samples must stay `insufficient`; the UI may not upgrade confidence for visual polish.

## Capacity law

Capacity is derived from actual authoritative work assignment/queue facts. It must not infer staff availability, working hours, skill, legal deadline capacity or productivity targets that the source model does not contain.

## Quality constitution

Closure still requires all four independent tracks:

**Product → UI/UX → Engineering → Certification**

No feature cut, source weakening, provenance removal or confidence inflation is allowed to satisfy a bundle budget. The production startup JavaScript ceiling remains **670000 bytes**.

## Foundation exit gate

The foundation cannot pass until automated destructive tests prove at minimum:

- provenance is mandatory;
- workspace lineage cannot drift;
- exact money semantics remain exact;
- forecasts cannot claim authority;
- invalid time windows/horizons fail closed;
- insufficient samples cannot claim directional confidence;
- deterministic inputs produce deterministic outputs;
- zero-denominator math is explicit and safe;
- no fabricated historical point is accepted;
- Phase 9.6 remains locked.

After foundation PASS, Phase 9.5 may proceed to authoritative source loading, runtime, UI/UX, Real Cloud, Real Browser, Pages and deployed-live certification.
