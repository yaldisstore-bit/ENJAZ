# Phase 13.3 — Ordered Import — A2 Explicit Target-ID & Idempotency Binding

**Status:** IN PROGRESS  
**A1 predecessor:** CERTIFIED / Gate #2  
**Successor:** A3 execution boundary — LOCKED until A2 source certification

## Objective

Bind the clean A1 import plan to an explicit workspace, import batch, idempotency key and caller-supplied target UUIDs without executing any write.

A2 turns symbolic source keys into a deterministic execution manifest, but that manifest remains non-executable.

## Binding law

- Every A1 item must receive exactly one caller-supplied canonical UUID target ID.
- Target IDs must be unique inside the batch.
- Source keys must match the A1 item set exactly; missing or extra bindings fail closed.
- `workspaceId` and `batchId` must be explicit canonical UUIDs.
- `idempotencyKey` must be explicit and stable; A2 never invents it.
- Existing A1 order is preserved exactly.
- Relationship source/target keys are resolved to caller-supplied target IDs, but no FK write/assignment occurs.
- Workspace membership/permission is **not claimed** by A2; it must be proven at the server execution boundary.
- Replaying identical inputs must produce a byte-for-byte identical manifest.

## Still forbidden

- target-ID generation;
- database persistence;
- import execution;
- ENJAZ target mutation;
- FK assignment/write;
- server-side idempotency reservation;
- rollback execution;
- DB migration/table;
- write RPC;
- Edge import authority;
- client UI.

**Phase 13.4 — Reconciliation remains LOCKED.**
