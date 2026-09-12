# Phase 9.6 — Process Mining & Predictive Operations — M18

Status: **IN PROGRESS — foundation**

## Entry authority

Phase 9.6 starts only from the formally closed and exact-main recertified Phase 9.5 closure merge:

- predecessor: **Phase 9.5 — CLOSED**.
- canonical base / formal closure merge: `295ad9dd308e391e7d92b1e27de74c859b0a20b1`.
- formal-closure exact-main push matrix: **25/25 SUCCESS**, zero failure / queued / in-progress.
- Phase 9.5 gate `34687292217`: **SUCCESS**.
- Phase 9.5 Real Browser `34687292129`: **SUCCESS** on 1280 / 430 / 390 / 360 / 320.
- cumulative Real Browser `34687292148`: **SUCCESS** through Phase 9.4 authority separation.
- Pages Preview `34687328191`: **SUCCESS**.
- Live External `34687368229`: **SUCCESS**.
- Phase 9.5 explicitly authorizes `phase9_6Allowed=true`, `nextPhase=9.6`, `successorStatus=AUTHORIZED`.

Phase 9.7 remains **LOCKED**.

## Product mission

Build one Arabic-first Process Mining & Predictive Operations capability that reconstructs real operational paths from authoritative ENJAZ histories, exposes delay/rework evidence, and provides cautious non-authoritative predictive guidance without creating a competing event truth store.

The Phase 9.6 scope is:

1. authoritative process-case composition around transaction/workflow/field-operation history;
2. actual-path reconstruction from source-owned historical events;
3. elapsed-time and wait-time observations only where timestamps are authoritative;
4. rework detection from repeated observed activities;
5. bottleneck candidates only from explicit evidence and governed thresholds, never aesthetic heuristics;
6. empirical next-step / delay-direction predictions with evidence, method and confidence disclosure;
7. source provenance for every event, path, metric and prediction;
8. premium RTL/mobile-first surfaces only after the authority/service foundation is stable.

## M18 law

**M18 — Process Mining & Predictive Operations** becomes `ACTIVE` in this phase.

M18 is a multi-anchor system with governing anchors **Phase 9 + Phase 15**. Phase 9.6 may certify the Phase 9 product slice, but it must **not** declare M18 globally CLOSED. Global M18 closure remains forbidden until the Phase 15 enterprise-hardening anchor and independent `ZERO_ESCAPE_V1` requirements are complete.

## Existing authoritative event sources

Phase 9.6 must reuse existing source-domain history. The foundation recognizes these existing authorities:

- workflow: append-only `workflow_transition_events` linked to authoritative workflow instances/stages;
- transaction lifecycle: append-only `transaction_activity`; no invented transaction status-history store;
- field operations: `field_assignments`, `field_visits`, `field_visit_evidence`, `field_sync_receipts` under the certified M5 boundary.

Additional source domains may be composed later only after their event semantics and workspace lineage are explicitly verified.

Phase 9.6 may not:

- create a shadow process-event ledger;
- copy authoritative histories into a competing browser-owned persistence store;
- synthesize timestamps for missing events;
- invent stage order when source timestamps/sequence do not prove it;
- silently merge events across workspaces;
- reinterpret archived/deleted semantics contrary to the owning domain;
- convert a derived prediction into an authoritative future fact.

## Process-case authority

The default process case is the authoritative transaction/work item identity that owns or links the contributing workflow/field events. A composed case must retain:

- workspace identity;
- case identity;
- source-domain identity for every event;
- stable source event identity;
- observed timestamp from the source domain;
- source snapshot/as-of time;
- derivation method/version.

Cross-workspace case composition is forbidden.

## Event ordering law

Process mining may only claim sequence that the source evidence can support.

- event time must be a valid authoritative timestamp;
- future events relative to the snapshot/as-of time fail closed;
- duplicate source-event identity fails closed;
- decreasing time order after normalization fails closed;
- equal-time events with no authoritative source sequence are **ordering-ambiguous** and may not be presented as a proven strict order;
- UI sorting may be deterministic for display, but deterministic display order is not promoted into authoritative process sequence.

## Rework and bottleneck law

Rework is derived only from repeated observed activities within one authoritative case path.

Bottleneck classification requires an explicit governed duration threshold or comparison cohort. The foundation may expose raw observed waits/durations, but it may not label a step a bottleneck solely because a duration “looks long”. Missing start/end timestamps produce unknown duration, not zero.

## Prediction law

Every Phase 9.6 prediction is **DIRECTIONAL / NON-AUTHORITATIVE**.

A prediction must expose:

- target (`next_activity` or governed delay-direction target);
- method;
- historical observation window;
- case/sample count;
- evidence/provenance;
- confidence (`insufficient` or `directional` in the foundation);
- assumptions/disclosures;
- `authoritative=false`.

The initial next-step method is empirical frequency over eligible historical paths. Counts remain exact integers; probability is represented in integer basis points. Insufficient samples remain `insufficient`; ties or missing evidence must not be hidden by UI polish.

No generative model output is authoritative process evidence.

## Quality constitution

Closure still requires all four independent tracks:

**Product → UI/UX → Engineering → Certification**

No source weakening, fabricated event history, confidence inflation, feature cut, legacy DNA or patchwork release is allowed to satisfy a build budget. The production startup JavaScript ceiling remains **670000 bytes**.

## Foundation exit target

Before runtime/UI work, the foundation must prove:

- Phase 9.5 closure preserved;
- M18 registry state is `ACTIVE` with anchors `9` + `15` and no global closure;
- pure process-intelligence contract exists with no Supabase/fetch/localStorage dependency;
- workspace/event lineage fails closed;
- ambiguous ordering is explicit;
- rework derives only from observed repeated activity;
- raw duration never fabricates missing time;
- predictions are non-authoritative, provenance-bound and confidence-disclosed;
- Phase 9.7 remains locked;
- full regression, roadmap, M1–M18 Zero-Escape, typecheck and governed build budgets remain green.
