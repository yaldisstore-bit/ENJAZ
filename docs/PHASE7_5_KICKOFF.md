# Phase 7.5 — Finance Destruction & Reconciliation Gate

Status: **ACTIVE / NOT CLOSED**

Base: canonical Phase 7.4 closure `75128eabda1c4a8d1b3b53504596a3d227d69874`.

Phase 8 remains **LOCKED**. No green UI or branch-only CI can authorize Phase 8.

## Destruction contract

Phase 7.5 must attack the existing authoritative finance system rather than create another finance implementation. The gate covers:

- huge values at the exact `numeric(18,2)` boundary;
- sub-cent and unsafe money input rejection;
- repeated payment submit and stable idempotency replay;
- network uncertainty with `DATA_OUTCOME_UNKNOWN` and recovery using the same idempotency key;
- compensating reversals and repeated reversal protection;
- stale UI/state after reversal;
- partial history (`statusWithoutReversal`, `reversalWithoutStatus`) and shadow-ledger warnings;
- source-capacity pressure and stalled pagination without sampled reconciliation;
- database-level uniqueness of one reversal event per payment;
- Real Cloud authenticated payment → replay → reversal → reconciliation probe;
- Real Chromium at 1280 / 430 / 390 / 360 / 320;
- deployed-live finance critical path after merge.

## Newly identified Gate Escape risk

The Phase 7.2 RPC serializes reversal commands, but the database did not have a direct uniqueness invariant for `(workspace_id, payment_id)` on `payment_reversals`. Phase 7.5 closes that escape hatch with a fail-closed duplicate preflight plus a unique index. Existing duplicate reversal groups are never auto-deleted: the migration aborts and requires forensic reconciliation.

## Closure rule

Phase 7.5 may close only with zero Critical/High/functional blockers, all destructive tests green, authoritative reconciliation proving no lost/duplicated money event, the database hardening verified, Real Cloud + Real Browser green, exact merged SHA deployed, and deployed-live verification complete.

Production JavaScript budget remains **670000 bytes** and may not be raised to obtain a green gate.
