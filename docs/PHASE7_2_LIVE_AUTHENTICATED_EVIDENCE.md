# Phase 7.2 — Live Authenticated Cloud Evidence

Status: **PRODUCTION PROBE PASSED — closure still pending**

This evidence does not close Phase 7.2. It records one mandatory Zero-Escape layer: the real Supabase authenticated database round-trip.

## Production project

- Project: ENJAZ
- Project ref: `juzxriirhkuzviwnhkbd`
- Migration: `phase_7_2_live_authenticated_finance_probe`
- Applied migration version: `20260907011201`

## What the probe proved

The migration derives an existing real `auth.users` / `workspace_memberships` identity dynamically. No generated user ID or workspace ID is hard-coded.

It then configures the JWT subject and switches the transaction to the Postgres `authenticated` role before exercising the same public RPC boundary used by the browser.

The authenticated journey proves:

1. `auth.uid()` resolves to the real workspace member.
2. A finance cashbox can be created only through the guarded command RPC.
3. Replaying the same cashbox idempotency key returns the same command outcome rather than creating a second cashbox.
4. An M16 Retainer can be created and attached to an authoritative company/transaction.
5. Replaying the M16 idempotency key is duplicate-safe.
6. A cash payment of `12345.67` survives exact numeric round-trip.
7. The payment is bound to the authoritative transaction/company, cashbox and M16 engagement.
8. Replaying the payment with the same idempotency key returns the existing payment/receipt instead of creating a duplicate money event.
9. `get_payment_receipt_v1` returns the immutable receipt snapshot and company provenance.
10. `reverse_payment_v1` performs a compensating reversal without deleting the receipt.
11. Replaying the reversal key is duplicate-safe.
12. The final receipt remains addressable with `status = reversed` and the exact reversal reference.
13. `finance_payment_reconciliation_v1` reports zero integrity warnings.
14. No payment-shaped shadow entry was created in `financial_ledger_entries`.
15. Every probe company, transaction, cashbox, engagement, payment, reversal, transaction activity and audit trace created by the probe is removed before the migration commits.

A post-probe production query independently confirmed zero remaining probe companies, transactions, cashboxes, engagements and payments.

## Security evidence

The first Phase 7.2 migration intentionally introduced guarded command bodies. Supabase Security Advisor then identified the public `SECURITY DEFINER` exposure as a warning. Phase 7.2 did not accept that warning as final state.

`phase_7_2_rpc_security_hardening` moved privileged command bodies to the unexposed `private` schema and replaced the seven public API endpoints with `SECURITY INVOKER` wrappers. The security advisor was rerun afterwards and the Phase 7.2 `authenticated_security_definer_function_executable` findings were eliminated.

The remaining `auth_leaked_password_protection` warning is an existing project-level Auth configuration item and is not represented here as fixed by Phase 7.2.

## Performance evidence

Supabase Performance Advisor identified five new unindexed foreign keys introduced by Phase 7.2. `phase_7_2_fk_index_hardening` added covering indexes for all five before closure work continued.

## What remains before closure

Phase 7.2 remains open until branch CI, Real Chromium/mobile acceptance, merge, exact merged-SHA Pages deployment, deployed-live critical path, and canonical post-merge recertification are all complete with zero Critical/High/functional blockers.
