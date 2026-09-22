# Phase 14.2 — Integration Platform / API / Webhooks — A1 kickoff

**Status:** IN PROGRESS — A1 SOURCE CONTRACT ONLY

**Canonical base:** `7ac65672cc3845ec755d8326c60173e6c73f0264` — Phase 14.1 formal closure

**Successor:** Phase 14.3 remains LOCKED

## Business outcome

ENJAZ needs a governed integration boundary so approved external systems can perform narrowly scoped workspace operations without direct database access. Phase 14.2 covers a versioned API, scoped service credentials, outbound webhook subscriptions, signing/replay protection, idempotency, delivery history, retries/dead letters and the approved legacy-import boundary.

A1 freezes the first source contract. It does **not** install database objects, issue credentials, expose an Internet API, send a webhook, add a production route or certify Real Cloud behavior.

## Four-track contract

### Product — IN PROGRESS

- Versioned `v1` operation registry with an explicit scope per operation.
- Workspace-bound service-account claims with revocation and expiry semantics.
- Approved webhook event names, endpoint safety, deterministic signing material, retry and dead-letter decisions.
- External mutation requests require a stable idempotency key.
- Import operations remain limited to explicit dry-run/execute boundaries; A1 grants no import authority by itself.

### UI/UX — PENDING / NOT IN A1

Later slices must deliver a premium Arabic/RTL integration-management surface covering credentials, scope review, one-time secret display, webhook subscriptions, delivery history, retry/dead-letter states, loading/error/offline/empty states and mobile behavior. A1 adds no client route or visual surface and does not reintroduce legacy UI DNA.

### Engineering — A1 SOURCE FOUNDATION

- Canonical contract: `src/features/integrations/integrationPlatformContract.ts`.
- Exact operation-to-scope mapping; unknown operations and unknown scopes fail closed.
- Credentials are bound to one workspace and one service-account identity.
- Revoked, expired, not-yet-valid, malformed and cross-workspace credentials are rejected.
- Webhook endpoints require public HTTPS and reject embedded credentials plus obvious local/private targets.
- Signing material binds the exact raw body, event ID and timestamp; A1 does not claim cryptographic key custody or delivery verification.
- Browser clients may never hold raw integration tokens, token digests, signing secrets or service-role material.
- Integration credentials never grant direct database access.

### Certification — A1 SOURCE TESTED / PHASE PENDING

`tests/phase14-2-integration-platform-contract.test.ts` covers:

1. version and operation allowlists;
2. strict request envelope and UUID validation;
3. mandatory mutation idempotency;
4. exact workspace/scope authorization;
5. revoked/future/expired token rejection;
6. duplicate and invented scope rejection;
7. HTTPS/private-target endpoint rejection;
8. deterministic webhook signing input;
9. UTF-8 byte-accurate webhook body ceiling;
10. bounded retries and dead-letter termination;
11. client-secret projection denial.

The independent A1 workflow runs these tests plus typecheck, production build, frozen bundle budget and secret audit. Passing A1 remains source evidence only.

## Explicit non-authority

A1 does not authorize or claim:

- direct third-party table/RPC/database access;
- service-role material in a browser or external client;
- generic company, transaction, finance, document or workflow writes;
- credential persistence, token issuance or key rotation;
- live webhook delivery, DNS-resolution SSRF protection or cryptographic key custody;
- a public API deployment, Real Cloud, Real Browser, Android or deployed-live certificate;
- production destructive testing;
- Phase 14.2 closure or Phase 14.3 authorization.

## Next slice

A2 must design and verify the authoritative PostgreSQL/RLS model for service accounts, hashed credentials, webhook subscriptions, immutable delivery attempts and idempotency receipts. It must preserve existing workspace membership and command/RPC authority, add no generic write escape and run destructive verification only on an independently isolated target.
