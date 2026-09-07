# Phase 7.5 — Real Cloud Finance Destruction Evidence

Date: 2026-09-07
Project: `juzxriirhkuzviwnhkbd` (ENJAZ)
Status: **PASS**

## Database hardening

The Phase 7.5 reversal uniqueness migration was applied to the real ENJAZ Supabase project only after a forensic preflight confirmed **0** duplicate `(workspace_id, payment_id)` reversal groups. The resulting database invariant is `payment_reversals_workspace_payment_unique_idx` on `public.payment_reversals(workspace_id, payment_id)`.

No duplicate reversal rows were deleted or silently repaired. The migration is fail-closed if duplicate history exists.

## Authenticated real-cloud destruction probe

The migration `phase_7_5_live_finance_destruction_probe` executed successfully through Supabase's trusted migration channel against the real ENJAZ cloud database. The probe:

- derived an existing real `auth.users` member and a real workspace membership instead of hard-coding an identity;
- set JWT claims for that user and switched with `SET LOCAL ROLE authenticated`;
- verified `auth.uid()` resolved to the derived real user;
- posted the exact `numeric(18,2)` boundary value `9999999999999999.99` through `public.post_payment_v1`;
- read the immutable receipt back through `public.get_payment_receipt_v1` and proved the huge value did not drift;
- replayed the identical payment idempotency key and received `wasDuplicate=true` instead of a second payment;
- reused the same idempotency key with a changed amount and proved the server raised the expected unique/idempotency conflict;
- reversed the payment through `public.reverse_payment_v1`, then replayed the same reversal idempotency key and received `wasDuplicate=true`;
- required `public.finance_payment_reconciliation_v1(...)->>'integrityWarnings' = 0` after the round trip;
- attempted a second direct reversal for the same payment and proved the database uniqueness invariant rejected it;
- removed all probe business rows and helper functions before completion.

## Post-probe forensic verification

A read-only verification after the probe returned all of the following:

- `probe_companies = 0`
- `probe_transactions = 0`
- `probe_helpers = 0`
- `duplicate_reversal_groups = 0`
- `phase75_unique_index = payment_reversals_workspace_payment_unique_idx`

The authenticated role was independently verified to have EXECUTE permission on `post_payment_v1`, `reverse_payment_v1`, `get_payment_receipt_v1`, and `finance_payment_reconciliation_v1`.

## Closure boundary

This evidence completes the **Real Cloud finance critical path** requirement for Phase 7.5. It does **not** close Phase 7.5 by itself. Real Browser, pull-request gates, canonical merge, deployed-live verification and post-merge recertification must still pass before Phase 8 can be authorized.
