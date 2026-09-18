# Phase 12.5 — AI Zero-Escape & Safety Gate

**Status: IN PROGRESS**  
**Mode:** DESTRUCTION_AND_CLOSURE_EVIDENCE_ONLY  
**Exact base:** `e3f38a28db5bc423e73551af79ce210c54dfda03` — formal Phase 12.4 closure merge.  
**Systems under gate:** **M8 + M9**  
**Successor:** Phase 13.1 — Read-only Legacy Snapshot Intake — **LOCKED**.

## Purpose

Phase 12.5 is not a feature-delivery phase. It is the independent AI safety / Zero-Escape gate required before the Phase-12 AI systems may receive global major-system closure evidence.

It must attack the already-certified M8/M9 surfaces without adding a new tool, truth store, database authority, provider authority, client UI, or write capability.

## Frozen authority

### M8 — Regulatory / Knowledge Base Engine

The only regulatory truth authority remains Phase 9.4 / M8.

- official truth is append/version/effective-dated and provenance-bound;
- official and workspace-curated truth remain distinct;
- explicit `asOf` is mandatory;
- ambiguous authority fails closed;
- missing authority fails closed with no fabrication;
- exact source version + source hash binding remains mandatory;
- AI/editorial/assistance interpretation is never authoritative;
- direct regulatory table mutation from assistance is forbidden;
- service-role regulatory reads from the assistant are forbidden.

### M9 — Agentic ENJAZ Copilot

The only execution authority remains the five action-specific adapters certified in Phase 12.3.

- plan/propose cannot execute;
- no generic execute/write tool exists;
- explicit approval is mandatory;
- approval is actor/workspace/digest/expiry/single-use bound;
- execution-time domain revalidation remains mandatory;
- service-role business reads/writes are forbidden;
- finance/ownership/workflow/legal bypass remains forbidden;
- document draft execution stops at `review_required`.

## Destruction dimensions

1. **hallucination / missing data** — empty or incomplete authoritative context must not become invented fact;
2. **prompt injection** — user/source text cannot change operation, tool, authority or output-authority flags;
3. **permission escape** — unauthorized, lower-privilege and cross-workspace principals remain denied;
4. **malicious regulatory content** — source text that contains instructions cannot become runtime/tool instructions;
5. **structured-output regression** — schemas, citations, source hashes, as-of binding and approval digests cannot silently drift;
6. **approval/tool bypass** — execution without exact approved proposal/digest/single-use key is denied;
7. **provider outage recovery** — no provider failure may weaken fail-closed behavior or fall back to fabricated/privileged execution.

## Wave 1 — Static + contract destruction

Opening Wave 1 must prove from source and executable contract tests that:

- prompt-like strings remain bounded data;
- extra `tool`, `sql`, `admin`, `providerPrompt`, mutation and authority-changing fields are rejected;
- M8 empty authority returns explicit no-fabrication output;
- M8 source/version/hash/scope/as-of bindings remain fail-closed;
- M9 plan/propose remains non-executing;
- M9 action preparation remains approval-gated;
- M9 execute requests cannot inject business fields;
- Edge source still separates service trace/proposal evidence from caller-JWT business authority;
- Phase 12.3 and 12.4 closure contracts remain preserved;
- M8 and M9 remain globally **ACTIVE**, not falsely CLOSED.

## Later required evidence

Branch CI alone can never close M8 or M9.

Before closure Phase 12.5 requires:

- authenticated Real Cloud authorized + unauthorized journeys;
- fresh workspace/no-data behavior;
- cross-workspace and lower-privilege attacks;
- action approval bypass/replay/tamper attacks;
- malicious regulatory-content/no-fabrication attacks;
- failure/retry/outage evidence;
- cumulative Real Browser;
- exact merged SHA;
- Pages / deployed-live recertification;
- separate machine closure evidence for M8 and M9 under `ZERO_ESCAPE_V1`;
- zero known Critical / High / functional blockers.

Until those conditions are satisfied, **Phase 13.1 remains LOCKED**.
