# Phase 13.3 — Ordered Import — A1 Deterministic Import Plan

**Status:** IN PROGRESS  
**Base:** `501f5eaad31ba13b3e81d8acd28add4a631ac6bd` — final merged Phase 13.2 closure  
**Predecessor:** Phase 13.2 — CLOSED / explicit mapping + relationship preview certified  
**Successor:** Phase 13.4 — Reconciliation — LOCKED

## Objective

A1 converts a **clean, explicitly mapped Phase 13.2 preview** into a deterministic ordered-import plan without executing a single write.

The ordering is fixed by the already-certified relationship graph:

1. `contacts`
2. `companies`
3. `transactions`

This order guarantees that every certified relationship points only to an earlier import stage:
- companies.primary_contact_id → contacts
- transactions.company_id → companies
- transactions.primary_contact_id → contacts

## Authority law

- Phase 13.2 remains the only mapping/normalization authority.
- A1 does not remap, renormalize, infer, repair or guess legacy data.
- Any unmapped type, duplicate key, dangling link, undeclared relationship or review-required record blocks the import plan.
- A1 emits symbolic relationship bindings only; it does not assign foreign keys.
- A1 does not generate target IDs or idempotency keys.
- A1 does not persist the plan and does not execute import.
- A1 adds no DB migration/table, write RPC, Edge import authority or client UI.
- Phase 13.4 remains LOCKED.

## Output contract

Schema: `enjaz.legacy.ordered-import.plan.v1`

The plan includes:
- exact source snapshot + mapping plan identifiers;
- fixed stage order;
- deterministic item ordinals;
- mapped target table and normalized fields copied from the Phase 13.2 preview;
- symbolic relationship bindings using source keys only;
- explicit no-write/no-ID/no-FK flags.

## Fail-closed blockers

Plan generation fails if any of the following exists:
- zero mapped records;
- unmapped legacy type;
- duplicate legacy record key;
- dangling link;
- unmapped relationship link;
- quarantined relationship intent;
- any record marked `reviewRequired`;
- any relationship whose target stage is not earlier than its source stage.

## Frozen boundary

Client budgets remain frozen:
- initial JS: 670000 bytes
- total JS: 760000 bytes
- CSS: 180000 bytes
- budget increase: forbidden
- client UI delta: forbidden

## A1 exit

A1 may be certified only after:
- dedicated source tests pass;
- Phase 13.1 + 13.2 regressions remain green;
- functional regression remains green;
- DB audit/selftest unchanged;
- roadmap + M1–M18 governance remain green;
- secrets, TypeScript, build and frozen budgets pass.

**Phase 13.4 — Reconciliation remains LOCKED.**
