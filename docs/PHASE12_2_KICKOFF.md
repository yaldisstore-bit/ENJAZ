# Phase 12.2 — Contextual Assistance — Kickoff

**Status:** IN PROGRESS  
**Base:** `47ac47ce131dec324f3a34f450a2e6bafd025b29` — final merged Phase 12.1 closure  
**Predecessor:** Phase 12.1 — CLOSED / certified  
**Successor:** Phase 12.3 — Agentic ENJAZ Copilot — LOCKED

## Objective

Deliver permission-scoped contextual assistance over authoritative ENJAZ information without granting the Copilot business-write authority.

Phase 12.2 owns:

- contextual search over existing authoritative ENJAZ read models;
- summarize, compare, draft and explain operations;
- structured citations/provenance for every surfaced source reference;
- fail-closed behavior when authoritative context is absent or unavailable;
- reuse of the Phase 12.1 authentication, workspace, idempotency, rate-limit and private trace boundary;
- server-side execution only.

Phase 12.2 does **not** own agentic business mutations. Those remain locked to Phase 12.3.

## Authority law

Copilot remains non-authoritative.

- Existing domain sources remain canonical.
- Context acquisition must reuse an existing permission-scoped authoritative read contract where one exists.
- Phase 12.2 must not create a shadow business store.
- Phase 12.2 must not directly insert/update/delete canonical business rows.
- A generated/drafted explanation is assistance, never source truth.
- Missing data must remain missing; no invented company, transaction, document, procedure, person, status or amount.
- Cross-workspace and unauthorized context must fail closed.

## Context source

The first contextual source is the already-certified `global_search_v1` read model from Phase 9.2.

It provides permission-scoped references for:

- transactions;
- companies;
- people;
- procedures;
- documents.

Each returned reference keeps its canonical internal destination and source schema `enjaz.global-search-result.v1`.

Phase 12.2 must call this read model with the authenticated user's boundary. The service role may manage Copilot trace evidence, but it must not be used to widen contextual business reads.

## Operations

The Phase 12.2 server contract exposes five read-only assistance operations:

1. `search` — return authoritative contextual references.
2. `summarize` — produce a concise grounded summary from returned references.
3. `compare` — compare two separately searched authoritative contexts.
4. `draft` — produce a clearly non-authoritative draft grounded in cited references.
5. `explain` — explain the retrieved context and cite every supporting reference.

All operations use schema `enjaz.copilot.context.v1`.

## Grounding and provenance

Every response must include:

- whether authoritative context was found;
- the grounding mode;
- citations containing source schema, domain, entity id, title and internal destination;
- a clear indication that the response is assistance rather than canonical truth.

No raw prompt, raw query, raw draft body or answer body may be persisted in Copilot trace tables.

## Provider rule

Phase 12.2 may operate in deterministic grounded mode without an external model.

- Browser provider calls remain forbidden.
- Provider secrets remain server-only.
- No external provider is required for the first 12.2 implementation.
- If a provider is introduced later in this phase, it must consume only permission-scoped context, preserve citations, fail closed on provider outage and pass the same no-write/no-leakage gates.

## Replay semantics

Request idempotency continues to protect quota/tracing.

Because contextual reads are authoritative and freshness-sensitive, a replay may perform a fresh read and may therefore reflect newer canonical data. The response explicitly exposes `readSemantics: fresh_on_replay`; no stale AI response cache becomes a shadow source of truth.

## Client budget

The canonical client ceilings remain frozen:

- initial JavaScript: 670000 bytes;
- total JavaScript: 760000 bytes;
- CSS: 180000 bytes;
- budget increase: forbidden.

The opening 12.2 slice is server-first and adds no new client CSS. Existing Copilot presentation UI is not promoted to production intelligence until a bounded integration can be proven inside the frozen budgets.

## Required certification before closure

- deterministic request/response contract tests;
- destructive source tests proving direct business writes and service-role context reads are rejected by the gate;
- authenticated workspace/cross-workspace checks;
- permission-scoped `global_search_v1` reuse;
- search/summarize/compare/draft/explain coverage;
- missing-context fail-closed behavior;
- no raw prompt/answer persistence;
- no browser/provider secret exposure;
- Real Cloud authenticated source journey;
- zero test residue;
- TypeScript/build/frozen budgets;
- exact-main post-merge recertification plus Pages/Live External where required by the project closure law.

## Successor lock

**Phase 12.3 — Agentic ENJAZ Copilot remains LOCKED.**
