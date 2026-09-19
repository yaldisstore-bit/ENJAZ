# Phase 13.4 — A2 Authenticated Readback — Source Proposal

**Status:** SOURCE IN PROGRESS / NOT DEPLOYED / NOT CERTIFIED.
**Base:** A1 PR #213 merged into main as 03934f9a07746096eee9784b8832f5f302ffd58a.
**Whole phase:** 13.4 IN_PROGRESS; 13.5 LOCKED.

## Intended behavior

The readback query must use the real caller JWT, existing workspace-owner authority and table RLS. It binds the existing Phase 13.3 import_jobs record to the exact batch, workspace, idempotency key and SHA-256 of the original execution manifest, then reads each expected target in one SQL statement and one MVCC statement snapshot. Missing rows stay explicit. Monetary fields are returned as decimal strings.

This is source code only. No new Supabase function has been deployed, and no actual imported-data equivalence has been asserted.

## Files and permission boundary

- src/features/import/legacyReconciliationReadback.ts prepares a validated caller-JWT RPC request; no execution or attestation.
- database/migrations/phase_13_4_reconciliation_readback.sql proposes an existing-table, SECURITY INVOKER, STABLE, owner-scoped, RLS-protected read-only function. Anonymous EXECUTE denied; no DML, new tables, service-role business read, automatic repair or Edge/client UI.
- tests/phase13-4-reconciliation-readback.test.ts and tests/phase13-4-reconciliation-db-source.test.mjs are source-only checks and are not Real Cloud evidence.

## Required certifications before deployment / closure

1. Finish exact merged-main A1 inventory, cumulative regressions, published Pages and deployed-live verification; PR-head PASS alone is not sufficient.
2. Independently review SQL, owner/RLS privileges, ledger hash binding, partial reads, decimal semantics and the 5000-item bound.
3. Run authenticated isolated Real Cloud permission and adversarial tests: same-workspace, anonymous, outsider, changed manifest, changed idempotency, missing/replayed job, missing/mismatched/FK-orphan row, concurrent mutation, cleanup and zero residue.
4. Implement A3 expected/observed comparison at a trusted server/DB boundary. Never trust a caller-supplied verified flag or JSON readback; never auto-repair, delete or reimport.
5. Close 13.4 and unlock 13.5 only with independent full Product / UI-UX / Engineering / Certification gates and formal closure evidence.

**Authorization today:** source review and CI only. Do not deploy the proposed migration to production before live safety verification.
