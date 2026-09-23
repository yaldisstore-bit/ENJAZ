# Phase 14.2 — A4 Integration Management UI kickoff

**Status:** IN PROGRESS

A3 real hosted Auth/RLS certification passed after the workforce-membership fix. A4 begins the product/UI surface required before Phase 14.2 can close.

## Scope

- Add a canonical Arabic/RTL R2 destination for integrations.
- Surface scoped credentials, one-time-secret semantics, webhook subscriptions, delivery history, retry/dead-letter states, and safety boundaries.
- Keep all secret/service-role authority server-only.
- Preserve workspace binding and fail-closed behavior proven by A3.
- Follow with live data wiring, webhook delivery worker, retry/dead-letter execution, Real Browser and deployed-live certification.

## Non-claims

This first A4 slice does not yet deploy the public API, issue credentials from the browser, deliver live webhooks, or close Phase 14.2.

## Exit

A4 completes only after product, UI/UX, engineering and certification tracks are all PASS and formal Phase 14.2 closure is merged.
