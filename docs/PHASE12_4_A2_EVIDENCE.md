# ENJAZ Phase 12.4 — A2 Authenticated M8 Retrieval Edge — Real Cloud Evidence

**Status:** CERTIFIED / PASS  
**Certified at:** 2026-09-18  
**Slice:** A2 — Authenticated M8 Retrieval Edge  
**Major system:** M8 — Regulatory / Knowledge Base Engine  
**Successor:** Phase 12.5 remains **LOCKED**.

## Certified boundary

A2 connects the pure A1 regulatory-assistance contract to the already-certified Phase 9.4 / M8 read authority.

Allowed read authority is exactly:

- `public.search_regulatory_knowledge_v1`
- `public.get_regulatory_knowledge_entry_v1`

Authority constraints:

- caller JWT required;
- user resolved through the caller-authenticated Supabase client;
- no service-role/admin regulatory reads;
- no direct regulatory table access;
- no source ingestion or mutation;
- no generic SQL/RPC execution;
- no provider path;
- no query/source/interpretation persistence;
- `asOf` is caller supplied and passed into existing M8 read RPCs;
- search result source/version identity must match retrieved official version;
- cross-workspace access fails closed;
- missing authority produces a non-authoritative no-fabrication response.

## Source certification

- A2 Source Gate **#3 / 35379906297** — **PASS**
- certified source head: `1cc82ee01da3a8de863820448e7e57585c4f0ae3`
- organization workspace denials are normalized to `ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED`.

## Live Edge

`enjaz-regulatory-assistant`:

- status: **ACTIVE**
- version: **2**
- `verify_jwt=true`
- deployment digest: `a6c5332b1b9e382730f9518c1a684d8a1dea993f3685c65fd8fdd5e70c874a64`
- no Phase 12.4 database migration was required.

## Authenticated Real Cloud certificate

Workflow:

- `.github/workflows/phase12-4-a2-real-cloud-e2e.yml`
- run **#2 / 35380158712**
- head: `3425bf92b8a75770ea10b19454df3be33b6a63f0`
- artifact: **10561173790**
- artifact digest: `sha256:7e8efac16e3ca078268be2e52a4afb7f62f5bd902fdeb582975e6936a82c7020`
- result: **18/18 PASS**
- cleanup: **PASS**
- auth/workspace residue: **0**

Certified checks:

1. fresh workspace isolation;
2. live M8 source/version/artifact store was empty at A2 certification;
3. missing JWT denied;
4. invalid JWT denied;
5. authenticated empty-store answer succeeds structurally;
6. zero authoritative context is reported;
7. zero citations;
8. zero official source text;
9. zero structured facts;
10. interpretation remains non-authoritative and provider-free;
11. no-fabrication message emitted;
12. cross-workspace regulatory assistance denied;
13. authority-escape request field denied;
14. invalid `asOf` denied;
15. unbounded limit denied;
16. POST-only boundary enforced;
17. second workspace receives the same empty-store fail-closed behavior;
18. Edge causes zero regulatory mutation.

## Zero-residue artifact facts

The uploaded evidence records:

- `passed: true`
- `checks.length: 18`
- `cleanupPassed: true`
- two disposable workspaces removed;
- two disposable auth users removed;
- `zero_auth_workspace_residue: passed`.

## Advisor state

After the A2 Edge rollout:

- security total: **65**
- new Phase 12.4 security findings: **0**
- unindexed foreign keys: **28**
- new performance WARN findings: **0**
- unused-index INFO remains **52** and is unrelated to A2 because A2 adds no database objects.

## Certification decision

**PASS — A2 is Real Cloud certified.**

This certificate proves the authenticated Edge boundary fails closed safely when the M8 store has no authoritative content. It does not yet certify a populated-source positive retrieval journey; that is reserved for a later Phase 12.4 slice.

Phase 12.5 remains **LOCKED**.
