# ENJAZ Phase 12.4 — A2 Authenticated M8 Retrieval Edge — Kickoff

**Status:** IN_PROGRESS  
**Predecessor:** A1 — Grounded Regulatory Assistance Contract — CERTIFIED  
**A1 source Gate:** #3 / 35379162122 — PASS  
**A1 certification-commit Gate:** #6 / 35379260589 — PASS

## Purpose

A2 connects the certified A1 pure contract to the existing Phase 9.4 / M8 read runtime.

The Edge boundary may read regulatory authority only through the authenticated caller JWT and only through:

- `public.search_regulatory_knowledge_v1`
- `public.get_regulatory_knowledge_entry_v1`

## Authority law

- caller JWT is mandatory;
- the user is resolved with `auth.getUser(token)`;
- no service-role/secret key is used;
- no admin Supabase client exists;
- no direct table read/write exists;
- no source ingestion or mutation RPC exists;
- `asOf` from A1 is passed unchanged into both search and entry retrieval;
- each search `sourceId + versionId` must match the retrieved entry's exact official version;
- workspace access remains enforced by the existing M8 RPC authority;
- no provider path exists;
- no response/query/source persistence exists.

## Output

A2 returns the A1 schema `enjaz.regulatory.assistance.v1`, preserving official source text and structured facts as authoritative, interpretation as non-authoritative, exact citations, and fail-closed/no-fabrication behavior.

## Not authorized

No DB migration, new regulatory truth store, service-role regulatory reads, source mutation, generated interpretation persistence, client UI, or Phase 12.5 work is authorized.
