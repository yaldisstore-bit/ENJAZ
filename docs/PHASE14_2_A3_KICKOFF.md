# Phase 14.2 A3 — Isolated Supabase Real Auth/RLS

## Objective

Move Phase 14.2 from disposable PostgreSQL persistence proof to a **real, isolated Supabase project/branch** with authenticated principals and hosted RLS verification. Production remains forbidden as a destructive test target.

## A2 baseline

- PR #232 merged into `main`.
- Merge commit: `ec6d191ed5732c8f21be016cf2af488cfcc07a5d`.
- Exact A2 head `b3580691de8bc179983bfe1cab30ba6ee415c48d`: 94/94 workflow runs completed; 90 success, 4 expected skipped, 0 failed.
- Disposable PostgreSQL A2 fixture: 13/13 assertions pass.

## A3 safety boundary

A3 must fail closed unless all of the following are true:

1. A real-cloud run is explicitly confirmed.
2. The target is explicitly confirmed as an isolated branch/project.
3. Production and isolated refs are both present and distinct.
4. `SUPABASE_URL` exactly matches the isolated project ref.
5. A publishable key and a distinct non-publishable secret key are supplied.
6. Production data is never used for destructive fixtures.
7. No service-role/secret key reaches browser code.
8. Every exposed-table path used by A3 remains protected by RLS and workspace authorization.

The source preflight is implemented in:
`scripts/phase14-2-a3-isolated-auth-preflight.mjs`

Its negative contract is covered by:
`tests/phase14-2-a3-isolated-auth-preflight.test.mjs`

The source/readiness gate is:
`.github/workflows/phase14-2-integration-a3-readiness.yml`

## Required hosted acceptance

A3 is not complete until an isolated Supabase target proves at minimum:

- owner authentication succeeds with a real user session;
- same-workspace authorized access succeeds;
- same-workspace unauthorized role escalation is denied;
- cross-workspace access is denied;
- anonymous access is denied;
- revoked/expired integration credentials are denied;
- integration persistence remains bound to one workspace;
- webhook subscription persistence obeys workspace and scope restrictions;
- idempotency/replay rules remain intact under hosted Postgres/RLS;
- test Auth/data residue is removed and verified;
- security advisors are reviewed after any hosted schema change.

## Current external blocker

The connected Supabase tool currently returns **zero accessible projects**. Therefore no real hosted Auth/RLS certificate can be truthfully claimed yet. The repository-side A3 safety/readiness work continues independently and remains explicitly non-certifying.

## Non-claims

This slice does **not** claim a deployed public API, live webhook delivery, production migration, real-browser client certification, or Phase 14.2 closure.
