# ENJAZ Phase 12.4 — A3 Search↔Entry Binding Hardening — Kickoff

**Status:** IN_PROGRESS  
**Predecessor:** A2 — Authenticated M8 Retrieval Edge — CERTIFIED  
**A2 final source Gate:** #7 / 35380605634 — PASS  
**A2 Real Cloud:** #2 / 35380158712 — 18/18 PASS / zero regulatory mutation / zero residue  
**Live Edge before A3:** `enjaz-regulatory-assistant` v2 / `verify_jwt=true`

## Purpose

A3 hardens the integrity boundary between the two existing Phase 9.4 / M8 read authorities:

1. `search_regulatory_knowledge_v1`
2. `get_regulatory_knowledge_entry_v1`

A2 already proved authentication, workspace denial, empty-store fail-closed behavior and zero mutation. A3 prevents a search result and its subsequent entry retrieval from silently drifting apart.

## Exact binding law

The Edge must reject the response if any of these fields drift between the authoritative search result and the authoritative entry:

- request/root `workspaceId`;
- request/root `asOf`;
- `sourceId`;
- `versionId`;
- `sourceHash`;
- `scope`;
- scope/workspace shape:
  - `official_global` → source workspace must be null;
  - `workspace_curated` → source workspace must equal the caller workspace.

A search result that is not authoritative, has malformed IDs/hash/scope, contains duplicate source/version ambiguity, or returns an unconfigured entry after advertising a source must fail closed.

## Authority preserved

A3 adds no new regulatory source, truth store or mutation authority.

Still forbidden:

- service-role/admin regulatory reads;
- direct regulatory table access;
- source ingestion/mutation from the assistant;
- generic SQL/RPC execution;
- provider calls or provider secrets;
- query/source/interpretation persistence;
- client UI changes;
- database migrations;
- Phase 12.5 work.

## Real Cloud strategy

The live M8 store was certified empty in A2. A3 MUST NOT seed permanent fake regulatory truth merely to produce a positive HTTP journey.

Positive M8 persistence/retrieval behavior continues to be preserved by the existing Phase 9.4 rollback-only Real Cloud probes, which create official and workspace-curated versions inside a deliberately rolled-back database subtransaction and prove zero residue.

A3 will therefore certify:

- exact search↔entry binding through pure/source tests;
- Phase 9.4 positive M8 runtime probe preservation;
- live Edge authentication/workspace/fail-closed/zero-mutation behavior after redeploy;
- explicit acknowledgement that a populated-source live HTTP journey is **not claimed while the canonical M8 store is empty**.

## Exit criteria

A3 may be certified only when:

- A1 and A2 remain certified;
- search root workspace/asOf are exact;
- each search item binds sourceId/versionId/sourceHash/scope;
- entry identity/hash/scope/workspace/asOf are exact matches;
- drift/tamper cases fail closed with dedicated errors;
- Phase 9.4 rollback-only positive authority probes remain PASS;
- live A2 safety Real Cloud remains PASS after A3 Edge deployment;
- zero mutation / zero residue remains true;
- frozen budgets remain unchanged;
- Phase 12.5 remains LOCKED.
