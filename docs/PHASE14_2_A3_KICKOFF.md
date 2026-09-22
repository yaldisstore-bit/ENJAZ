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
6. A TLS PostgreSQL URL is present and cryptographically routed by Supabase to the same isolated ref.
7. Production data is never used for destructive fixtures.
8. No service-role, database credential or secret key reaches browser code or evidence artifacts.
9. Every exposed-table path used by A3 remains protected by RLS and workspace authorization.

The source preflight is implemented in:
`scripts/phase14-2-a3-isolated-auth-preflight.mjs`

Its negative contract is covered by:
`tests/phase14-2-a3-isolated-auth-preflight.test.mjs`

The source/readiness gate is:
`.github/workflows/phase14-2-integration-a3-readiness.yml`

## Hosted execution package

The repository now contains a complete, fail-closed hosted execution package:

- `scripts/phase14-2-a3-hosted-auth-rls.mjs` creates three fresh real Auth principals, proves owner/member authenticated membership access, invokes the PostgreSQL certificate and removes only marker-bound Auth/workspace fixtures.
- `tests/fixtures/phase14-2-a3-hosted-postgres.sql` exercises ten hosted authority assertions inside a transaction and then rolls it back, including owner/member/outsider/anonymous boundaries, expiry, revocation, webhook scope/workspace binding and idempotency replay.
- `tests/phase14-2-a3-hosted-source.test.mjs` protects the isolation, cleanup and evidence-redaction contract.
- `.github/workflows/phase14-2-integration-a3-hosted.yml` is manual-only and bound to the existing isolated environment. It applies the A2 schema only when absent and requires the protected `PHASE14_2_SUPABASE_DB_URL` secret.

This package is executable readiness, not hosted evidence. A passing workflow run and post-change Supabase security-advisor review are still mandatory.

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

The connected Supabase tool still returns **zero accessible projects** as of 2026-09-22. Therefore the protected database URL cannot be obtained or verified through the connected project inventory, the manual hosted workflow has not been run, and security advisors cannot yet be reviewed. No real hosted Auth/RLS certificate is claimed.

## Non-claims

This slice does **not** claim a deployed public API, live webhook delivery, production migration, real-browser client certification, or Phase 14.2 closure.
