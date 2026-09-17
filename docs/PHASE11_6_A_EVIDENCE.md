# Phase 11.6-A — Authority & Boundary Contract — Evidence

**Status:** CANDIDATE — awaiting PR CI  
**Base:** `14a670e8dd2d892a7039fd7a52437a8c6274aa2a`

## Delivered

- Canonical authority map for M17 intake, M16 contracts, M10 renewals, M3 portal decisions and M4 communications.
- Explicit law that public intake stays non-authoritative until governed review.
- Explicit law that client approval/rejection is decision evidence only and cannot directly mutate canonical contract state.
- Explicit law that communication/notification evidence cannot become contract or renewal truth.
- Governed 11.6 bridge assertion requiring auth, workspace isolation, optimistic freshness and idempotency for retryable commands.
- Contract-renewal eligibility boundary that requires an effective canonical contract and an existing canonical renewal fact.
- Client-decision binding guard requiring the existing `approval` + `approve_document` portal permission and canonical artifact scope.
- Destructive authority tests and a fail-closed source audit.
- Dedicated CI workflow with roadmap, TypeScript, production build, frozen-budget and secret checks.
- README moved from `AUTHORIZED NEXT` to `11.6-A IN PROGRESS` while keeping Phase 11.7 locked.

## Intentionally not delivered in 11.6-A

- No new database table.
- No new write RPC.
- No change to M17/M16 global status.
- No Real Cloud claim.
- No Real Browser claim.
- No Phase 11.7 authorization.

Those belong to later 11.6 slices and final certification.
