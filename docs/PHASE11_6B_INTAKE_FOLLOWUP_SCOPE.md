# Phase 11.6-B — Intake follow-up & client information loop

**Status:** CLOSED / CERTIFIED  
**Base:** `d44b27411f3b994eb79f9e75ea0f8c15984c0412`  
**Predecessor slice:** 11.6-A — merged / exact-main recertified  
**Successor slice:** 11.6-C — AUTHORIZED_NEXT  
**Phase 11.7:** LOCKED

## Product objective

Allow staff to request missing intake information or client documents without creating a second intake submission, bypassing Client Portal authority, or converting external input directly into authoritative company/transaction/contract facts.

## Canonical composition

- `public.intake_submissions` remains canonical M17 submission/review truth.
- `private.intake_followup_requests` is bridge evidence only. It is not a second submission store.
- secure-link follow-up updates the same `intake_submissions.answers` only after scoped field validation and stale-version checks.
- document follow-up requires Client Portal mode; secure-link mode is information-only.
- Client Portal follow-up delegates request creation to `public.save_client_portal_request_v1` and revocation to the existing M3 owner implementation.
- Portal reconciliation requires a fulfilled M3 request plus real client response evidence before any intake answer patch may be merged.
- `review_intake_submission_v1` remains the only final approve/reject path; follow-up never auto-approves an intake.

## Security contract

- public follow-up tokens are deterministic only through HMAC-SHA256 with a 32-byte secret generated inside Postgres; the secret is never committed to GitHub.
- only the hash of the capability token is persisted in follow-up evidence.
- the public capability has an explicit expiry and revocation path.
- exactly one open follow-up is allowed per submission.
- retryable staff issuance is idempotent and request-payload conflicts fail closed.
- secure-link and Portal modes are mutually exclusive at the persistence constraint.
- Portal mode is transaction-bound: the intake link's CRM lead must already be converted to the same transaction used by the Portal request.
- cross-workspace references are rejected by workspace-scoped FKs and owning-command checks.
- browser roles have no table access to private follow-up evidence or HMAC secrets.

## Failure / recovery states

- stale submission version → reject;
- duplicate operation with identical payload → return same follow-up identity/capability;
- duplicate operation with changed payload → idempotency conflict;
- expired/revoked token → reject;
- second open follow-up on same submission → reject;
- unknown/out-of-scope requested field → reject;
- empty information response → reject;
- Portal request without a transaction bound to the intake lead → reject;
- Portal reconcile before request fulfillment/evidence → reject;
- changed/terminal intake review state → reject;
- revocation propagates to an open Portal request through M3 authority.

## Real Cloud gate required before B can close

11.6-B closed after authenticated Real Cloud proved fresh setup, secure capability issuance/retry, scoped draft/final response, stale rejection, expiry/revocation, one-open-follow-up rule, Portal request delegation/evidence reconciliation, workspace isolation, direct-write denial, audit evidence and cleanup/zero-residue. Security/performance advisors were compared before/after; B introduced zero new security findings and zero B-related performance findings. Formal evidence: `docs/PHASE11_6B_CLOSURE.md`.
