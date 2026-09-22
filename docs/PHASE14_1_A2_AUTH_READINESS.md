# Phase 14.1 A2 — isolated Auth readiness, 2026-09-20

## Current result

The hosted Auth/import smoke is **BLOCKED_MISSING_GITHUB_ENVIRONMENT_SECRETS**.
The eleven-domain A2 journey has not started. PR #225 remains a draft, Phase
14.1 remains in progress, and Phase 14.2 remains locked.

The [first smoke run, 35524524949](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35524524949),
on source `03e5ac129b2837fc1638859f87a65387b5f08ffa`, failed at the
pre-network guard. Its runner environment contained empty `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. Installation and the
test harness were skipped. The subsequent artifact step also failed because
there was no test evidence file. This was a configuration failure, not a
successful Auth test or an observed application defect.

## Isolated lab repair

Read-only inspection found no non-internal trigger on `auth.users` in lab
`nqhgaukutkyvfumbtbtg`. In contrast, production has
`enjaz_bootstrap_auth_user` calling `private.bootstrap_auth_user()`.
The existing tracked migration
`database/migrations/phase_1_3_auth_workspace_signup_trigger.sql` contains
this exact bootstrap implementation. Its absence in the lab was a missed
migration, not an untracked production function.

That existing migration was applied to the disposable lab only, behind an
empty-auth-users/empty-workspaces guard. It creates the profile, personal
workspace, owner membership and workspace settings on account creation.
Production was read-only throughout this investigation.

Post-change catalog checks verified:

- the trigger exists and is enabled on `auth.users`;
- its function remains in `private`, with a fixed search path;
- neither `anon` nor `authenticated` can execute the function directly;
- the security advisor snapshot still reports the prior 19 informational
  no-policy findings, 2 anon definer warnings and 43 authenticated definer
  warnings; no new bootstrap-function exposure was introduced.

A transaction-rollback bootstrap probe was attempted but the SQL connector
rejected its INSERT with `25006: cannot execute INSERT in a read-only
transaction`. The boundary was preserved. **No successful runtime bootstrap
or real Auth/JWT result is claimed.** A following read-only count confirmed
zero Auth users, sessions, profiles, workspaces, memberships, settings,
companies, transactions and storage objects. This is an observed empty-state
snapshot, not cleanup evidence for a completed hosted journey.

The earlier structural inventory is retained as a dated snapshot. Its
function-drift list predates this repair. Calendar and other function drift
remain separately unresolved; restoring bootstrap does not certify parity.

## Smoke diagnostics and configuration

`scripts/phase14-1-a2-isolated-auth-preflight.mjs` now runs before package
installation or fixture requests. It pins the exact allowed lab origin,
rejects production/other projects and key-role substitutions, requires both
explicit isolated-test confirmations, and writes sanitized diagnostics even
when configuration is missing. It does not make network calls, authenticate
JWTs, or authorize phase closure. Decoded legacy JWT metadata is used only to
reject obvious mismatches; the server must still validate keys and tokens.

The workflow always uploads `preflight.json`. When the harness actually runs,
it also uploads that harness's independent evidence. The workflow name now
states its scope: existing Auth/import smoke, **not the full A2 journey**.

Configure the following existing GitHub environment, without changing any
production secret: `phase13-4-isolated-real-cloud`.

| Environment secret | Required source |
| --- | --- |
| `PHASE13_4_SUPABASE_URL` | Exact lab origin `https://nqhgaukutkyvfumbtbtg.supabase.co` |
| `PHASE13_4_SUPABASE_PUBLISHABLE_KEY` | An enabled publishable/anon key from that lab |
| `PHASE13_4_SUPABASE_SECRET_KEY` | A secret/service-role key from that lab only |

Keys must stay in protected configuration, never in source, reports or chat.
The connected Supabase tools expose publishable keys but no secret-key read
operation. The current GitHub browser session is signed out, so protected
environment settings could not be inspected or updated in this work block.

## Next required evidence

1. Make the lab-only environment secrets available and rerun the smoke on the
   current branch. Require actual Auth login, isolation checks and cleanup.
2. Resolve remaining function parity and run the eleven-domain, independently
   authenticated owner/member/denied-role/outsider/client journey.
3. Complete A3 authenticated mobile and published-portal evidence, then full
   source-head/main/live verification and separate formal phase closure.

Passing local preflight tests or existing repository CI does not complete any
of these live gates.
