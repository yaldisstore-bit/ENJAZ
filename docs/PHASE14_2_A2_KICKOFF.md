# Phase 14.2 — Integration Platform / API / Webhooks — A2

**Status:** IN PROGRESS — AUTHORITATIVE PERSISTENCE / ISOLATED POSTGRES GATE

**Canonical base:** `87cc1eab58ace98b37364d66974da712d1ca85ae` — A1 merged with 95/95 checks

## Outcome

A2 converts the A1 source contract into a server-only PostgreSQL authority boundary. It adds workspace-bound service accounts, hashed credential records, webhook subscriptions, immutable delivery attempts and immutable idempotency receipts. Raw API tokens and raw signing secrets are never persisted.

## Authority model

- Browser roles receive no table or lifecycle-function privilege.
- Only the internal `service_role` can call credential, revocation, webhook-registration and idempotency functions.
- Credential issuance and account revocation require both the canonical `workspaces.owner_user_id` identity and its matching `owner` membership in the exact workspace; an owner-labelled secondary membership is insufficient.
- Composite foreign keys bind credentials, subscriptions and receipts to the same workspace/service-account pair.
- Service-account revocation atomically revokes active credentials and disables active subscriptions.
- Delivery attempts and idempotency receipts reject `UPDATE` and `DELETE`, including privileged accidental mutation paths.
- The migration creates no generic business-table write function and grants no third party direct database access.

## Verification

The source gate checks schema shape, grants, immutable evidence and serialized replay behavior. A disposable PostgreSQL 17 job compiles the exact migration and destructively verifies:

1. browser denial and explicit server authority;
2. owner-only issuance;
3. same-workspace member, forged owner-labelled membership and cross-workspace owner denial;
4. absence of raw-secret columns;
5. scoped webhook registration and cross-workspace rejection;
6. exact idempotency replay and changed-request conflict;
7. immutable delivery/receipt evidence;
8. revocation closure and exact isolated residue counts.

The fixture contains synthetic identifiers only and must never run against a Supabase or production endpoint.

## Non-claims

A2 does not deploy the migration to Supabase, issue a real credential, expose a public API, perform a live webhook delivery, prove DNS-resolution SSRF defense, add the Arabic management UI, certify Real Cloud/Real Browser/deployed-live, close Phase 14.2 or authorize Phase 14.3.

## Next

After exact-head CI passes, A3 must install and destructively verify this boundary on an independently isolated Supabase target with real owner/member/outsider principals and zero marked residue. Subsequent slices still owe the Edge/API transport, delivery worker and premium Arabic/RTL management UI.

