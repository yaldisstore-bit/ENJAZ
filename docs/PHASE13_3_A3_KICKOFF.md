# Phase 13.3 — A3 Authenticated Atomic Server Execution Boundary

**Status:** IN PROGRESS  
**A2 predecessor:** CERTIFIED / Gate #10 / `35403767829`  
**Successor:** Phase 13.4 — Reconciliation — LOCKED

## Objective

Turn the deterministic A2 execution manifest into a **server-controlled, authenticated, idempotent and atomic** ordered import boundary.

A3 is the first Phase 13 slice that may eventually execute real writes, but **opening A3 does not authorize writes yet**. Write authority remains false until the database/server boundary and Real Cloud evidence are separately certified.

## Required execution law

Before any import execution can be enabled:

- the caller must be authenticated and a current member of the explicit workspace;
- the A2 `workspaceId`, `batchId` and `idempotencyKey` must be preserved exactly;
- target IDs remain caller-supplied canonical UUIDs — the server may not invent replacements;
- idempotency must be enforced server-side and exact replay must return the existing outcome;
- changed-payload replay with the same idempotency identity must fail closed;
- stage order remains `contacts → companies → transactions`;
- relationships may be assigned only after their target stage exists;
- all writes for one batch must be atomic;
- any validation, permission, FK or domain failure must roll back the whole batch;
- cross-workspace IDs and pre-existing conflicting target IDs must fail closed;
- no silent upsert/overwrite of existing ENJAZ records;
- imported rows must preserve explicit legacy lineage through existing `legacy_id` / `legacy_source` fields;
- execution must not bypass canonical domain constraints or weaken RLS;
- no browser service-role or secret credential is allowed.

## Supabase security boundary

Current Supabase guidance requires minimum grants plus explicit authorization. A3 must therefore avoid a browser-exposed privileged shortcut. Any privileged helper must live behind a narrowly granted authenticated RPC/server boundary, validate `auth.uid()` and workspace membership, and be independently tested for cross-workspace denial and replay safety.

## A3 opening state

At A3 opening:
- `orderedImportExecutionAllowed=false`
- `importExecutionAllowed=false`
- `databaseWritesAllowed=false`
- `targetEnjazMutationAllowed=false`
- `workspacePermissionVerified=false`
- `idempotencyEnforcementPerformed=false`
- `a3DatabaseAuthorityApplied=false`
- `a3RealCloudCertified=false`

These may change only after source, database and Real Cloud certification.

**Phase 13.4 — Reconciliation remains LOCKED.**
