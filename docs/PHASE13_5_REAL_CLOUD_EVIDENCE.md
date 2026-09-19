# Phase 13.5 — Import Destruction Gate — Real Cloud Evidence

**Status:** PASS / ZERO RESIDUE  
**Production project:** `juzxriirhkuzviwnhkbd` — never used as the destructive target.  
**Isolated lab:** `nqhgaukutkyvfumbtbtg` / `eu-central-1`.

## Hosted DB/RLS destructive certificate

Migration `phase13_5_hosted_db_destruction_certificate_v2` executed against the isolated Supabase lab and passed. It exercised the real certified Phase 13.3 import RPC plus Phase 13.4 readback/comparison authority under Supabase PostgreSQL roles.

Verified destructive classes include anonymous denial, same-workspace non-owner denial, outsider denial, exact atomic import, exact replay, changed replay conflict, exact money and clean A2/A3 equality without closure, money/relationship/lifecycle/missing-target drift, corrupt durable ledger fail-closed, forged manifest, stage-order tamper, forbidden target table, duplicate target ID, forced late-transaction failure with rollback of prior writes, and 5001 fail-closed before durable persistence.

The first attempt failed only because the temporary manifest table had not been granted to the test `authenticated` role; the transaction rolled back and residue was independently confirmed zero. The corrected v2 certificate grants the temporary fixture table inside the test transaction and passed.

## Real Auth/JWT destructive certificate

Temporary GitHub runner **35448348574**, job **105911092315**, invoked isolated Edge Function `phase13-5-auth-destruction-cert` with the lab's low-privilege legacy anon JWT while `verify_jwt=true`. Admin credentials remained inside Supabase runtime environment.

Returned certificate:

- schema: `enjaz.phase13-5.auth-destruction-certificate.v1`
- `passed=true`
- `functionalPassed=true`
- `cleanupPassed=true`
- checks: **11/11 PASS**

Named checks:

1. `real_users_and_sessions`
2. `anon_member_outsider_denied`
3. `owner_real_import`
4. `exact_replay`
5. `changed_replay_conflict`
6. `owner_a2_a3_clean_no_closure`
7. `member_base_visible_reconcile_denied`
8. `forged_manifest_closed`
9. `money_drift_detected`
10. `missing_target_explicit`
11. `generated_id_preclaim_denied`

The temporary runner branch was reset to canonical `main` immediately after success. The Edge certificate function was replaced by version **2**, fixed **410 Gone**, `verify_jwt=true`.

## Final zero residue

After all certificates:

- marked Phase 13.5 Auth users: **0**
- workspaces: **0**
- workspace memberships: **0**
- import jobs: **0**
- contacts: **0**
- companies: **0**
- transactions: **0**
- Supabase security advisor findings: **0**
- Supabase performance advisor findings: **0**

## Decision boundary

A1 source contract, A2 disposable PostgreSQL and A3 isolated Real Cloud destruction are implementation-certified. This evidence does not itself close Phase 13.5 or authorize Phase 14.1. Exact final PR-head gates, implementation merge and exact-main/deployed-live recertification remain mandatory.
