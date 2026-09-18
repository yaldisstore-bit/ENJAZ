# ENJAZ Phase 12.3 — A3-D Governed Document Request Real Cloud Evidence

**Decision:** PASS  
**Scope:** fourth low-risk action-specific adapter only — `document.request`, create-only through existing M3 authority.

## Certified lineage

- Certification source head: `f9be4f42619b2c2c2f05232fbea7e98532c72397`.
- A3-D source gate: run `35371537671` / Gate #45 — **SUCCESS**.
- A3-D Real Cloud: run `35371537794` / #1 — **SUCCESS**.
- Real Cloud checks: **44/44 PASS**, zero reported failures.
- Action migration: `20260918164302 phase_12_3_agentic_action_document_request`.
- Edge Function: `enjaz-copilot-agent` version **9**, `verify_jwt=true`.
- Edge source head: `49db4fbc28e76c82f2843a567c2c16d27f0f4652`.
- Edge deployment digest: `2009edbe8331cbada408a412d1c61e513e9da0f0e1571ec8148e21ddc09e1aab`.
- Cross-language document-request hash probe: `160ab86b520d994579e2158c5c763befec77f84c431c2f5a6f575f639f1f80ff`.

## Real Cloud guarantees proven

The fresh authenticated probe proved:

- an invited client principal is valid for a governed document request when not revoked.
- prepare requires a transaction grant containing both `view` and `upload_requested_document`.
- payment/request-type injection is denied.
- resource-share injection is denied.
- existing-request update injection through `expectedVersion` is denied.
- caller-controlled `validFrom` is denied.
- authenticated/browser clients cannot register privileged action proposals directly.
- PostgreSQL independently recomputes the exact document-request SHA-256.
- prepare binds principal, transaction, pre-generated portal request ID, title, instructions, due timestamp and validity timestamp.
- request type is hard-locked to `document` and resource share is hard-locked to null.
- prepare remains explicit-approval gated and has no execution authority.
- exact prepare replay is idempotent.
- execution before approval creates zero business mutation.
- cross-workspace prepare is denied.
- tampered proposal hashes are denied.
- execution cannot carry business-field overrides.
- approved execution delegates to existing M3 `save_client_portal_request_v1`.
- exactly one canonical client portal document request is created.
- canonical request permission is `upload_requested_document`.
- exact content, scope and timing match the approved proposal.
- execution replay creates no duplicate request.
- single-use execution keys are enforced.
- revoking the grant after approval causes domain execution to fail closed.
- domain failure creates zero request mutation and proposal consumption rolls back atomically.
- the foreign workspace receives zero document-request mutation.

## Live zero-residue verification

Direct post-run Supabase verification returned:

- test auth users: **0**
- test companies: **0**
- test transactions: **0**
- test client portal requests: **0**
- recent A3-D document-request proposals: **0**

## Authority and advisor posture

- proposal registration remains service-only.
- action execution remains authenticated-only; service role cannot execute it.
- private hash helper is not executable by anon, authenticated or service role.
- business execution remains caller-JWT M3 authority, not service-role mutation.
- request creation is create-only: `expectedVersion`, `resourceShareId` and `validFrom` are not exposed.
- Security Advisor total remains **65**, with **0 Copilot-related security findings**.
- unindexed foreign keys remain **28**, equal to the established baseline.
- no new Copilot performance WARN was introduced; fresh Copilot indexes remain expected INFO until production traffic.
- only `followup.snooze`, `followup.create`, self `reminder.schedule`, and `document.request` are authorized.
- finance, ownership, workflow-transition, payment, generic portal and other mutation paths remain locked.
- Phase 12.4 remains **LOCKED**.
