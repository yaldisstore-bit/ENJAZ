# Phase 12.1 — Copilot Foundation — Kickoff

**Status:** IN PROGRESS  
**Base:** `8b8d8a678ce98e12b1c6ab170e571bf8f0185e04` — final merged Phase 11.7 closure  
**Predecessor:** Phase 11.7 — CLOSED / Zero-Escape certified  
**Successor:** Phase 12.2 — Contextual Assistance — LOCKED

## Objective

Establish the server-side Copilot foundation before any contextual assistance or agentic behavior exists.

Phase 12.1 owns only:

- Copilot request/tool/data boundaries;
- workspace and actor permission enforcement;
- structured request/response envelopes;
- request idempotency;
- bounded rate limiting;
- private trace evidence;
- provider configuration/failure isolation;
- fail-closed transport and error mapping.

Phase 12.1 does **not** ship contextual search/summarize/draft behavior. That belongs to 12.2. It does **not** ship agentic writes. That belongs to 12.3.

## Authority law

Copilot is not a business authority.

- Existing M1–M18 tables/services remain canonical.
- Copilot may never directly mutate canonical business tables.
- No browser role receives service/secret credentials.
- Any future read tool must be explicitly registered and workspace-scoped.
- Any future mutation must route through the existing governed domain command and explicit user approval; 12.1 has no mutation tool.
- Provider output can never become authoritative truth by itself.
- Missing/ambiguous data must remain missing/ambiguous.
- Provider outage/unconfigured state must return a structured failure; no fabricated fallback answer.

## Data minimization

Foundation traces may store:

- request/trace ids;
- workspace and actor ids;
- operation id;
- payload hash;
- provider/model identifiers when configured;
- status/error code;
- timestamps/latency;
- bounded structural metadata.

Foundation traces must **not** store:

- raw prompts;
- raw user-entered free text;
- model responses;
- document bodies;
- API keys, bearer tokens or provider secrets.

## Foundation operations

Only two non-business operations are allowed in 12.1:

1. `capabilities` — authenticated workspace-scoped description of the current Copilot foundation contract.
2. `provider_probe` — exercises provider isolation. Until a provider is explicitly configured, it must return structured `PROVIDER_NOT_CONFIGURED` with no generated content.

No tool execution is enabled in 12.1.

## Structured envelope

All responses use schema `enjaz.copilot.foundation.v1` and include:

- `ok`;
- `requestId`;
- `traceId` when a request entered the governed boundary;
- `operation`;
- exactly one of `result` or `error`;
- `error.code`, `error.retryable` and safe message for failures.

Unknown fields or operations fail closed.

## Rate limit and idempotency

- Rate limit is enforced per actor + workspace in the database.
- Initial opening limit: 20 new requests per rolling minute bucket.
- Exact replay of the same `requestId + operation + payloadHash` returns the existing trace and does not consume a second quota slot.
- Reusing a request id with a different operation/payload hash fails `ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT`.

## Provider boundary

- No AI provider package is added to the browser bundle.
- No provider is called from the browser.
- Provider secrets exist only in server-controlled runtime configuration.
- Provider timeout/error/unconfigured state is isolated from business authorities and recorded only as trace evidence.
- 12.1 may define the adapter contract, but provider-backed contextual assistance remains locked to 12.2.

## Frozen client budget

Phase 12.1 is server-first. Client budgets remain frozen:

- initial JS: 670000 bytes;
- total JS: 760000 bytes;
- CSS: 180000 bytes;
- budget increase: forbidden;
- new 12.1 client UI/CSS: forbidden.

## Required certification

Before 12.1 may close:

- static authority/destruction tests;
- private trace/rate-limit tables inaccessible to browser roles;
- service-only trace RPC boundaries;
- authenticated workspace membership proof;
- cross-workspace denial;
- exact replay without quota duplication;
- changed-payload replay conflict;
- rate-limit denial and next-window recovery;
- provider-unconfigured structured failure;
- provider failure isolation without business writes;
- zero raw-prompt/secret persistence;
- trace completion/replay reconciliation;
- zero test residue;
- advisor comparison with no 12.1-caused security/performance regression;
- TypeScript/build/frozen client budgets unchanged;
- exact-main post-merge certification before 12.2 unlock.

## Successor lock

**Phase 12.2 — Contextual Assistance remains LOCKED.**
