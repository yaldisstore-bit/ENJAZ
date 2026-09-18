# ENJAZ Phase 12.4 — Regulatory Knowledge Assistance — M8 — Kickoff

**Status:** IN_PROGRESS  
**Opening slice:** A1 — Grounded Regulatory Assistance Contract  
**Exact base:** `cc01d06be81be27e614d80c9edaa86bdf4e79634` — formal Phase 12.3 closure merge  
**Major system:** M8 — Regulatory / Knowledge Base Engine  
**Successor:** Phase 12.5 — AI Zero-Escape & Safety Gate — **LOCKED**

## Purpose

Phase 12.4 adds an assistance layer over the already-certified M8 regulatory truth established in Phase 9.4. It MUST NOT create a second regulatory source of truth.

A1 is contract-only and read-only. It defines how a regulatory answer is grounded, temporally resolved and cited before any live Edge retrieval slice is authorized.

## Inherited authoritative boundary

The only regulatory truth authority inherited by Phase 12.4 is the Phase 9.4 / M8 contract:

- official and workspace-curated sources remain distinct;
- official source truth is append/version/effective-dated;
- provenance is mandatory;
- historical `asOf` resolution is deterministic;
- ambiguous `asOf` resolution fails closed;
- source normalization never mutates source truth;
- editorial interpretation is never authoritative;
- AI output is never authoritative;
- citations must bind to an exact source version.

Existing read authorities to be consumed by later live slices:

- `public.search_regulatory_knowledge_v1`
- `public.get_regulatory_knowledge_entry_v1`

A1 does not call these RPCs yet; it only defines the pure server-side contract that a later authenticated Edge boundary must feed with caller-authorized M8 results.

## A1 request contract

Schema: `enjaz.regulatory.assistance.v1`

Opening operation:

- `answer`

Required inputs:

- `workspaceId`
- `requestId`
- `operation=answer`
- `query`
- explicit ISO `asOf`

Optional:

- `limit` bounded to 1..8

Unknown or authority-escape fields are rejected.

## A1 output law

Every successful result must distinguish three layers:

1. **official source text** — authoritative, exact-version bound;
2. **structured source facts** — authoritative metadata from the same exact version;
3. **assistance / interpretation** — explicitly `authoritative:false`.

Every citation must bind:

- `sourceId`
- `versionId`
- `sourceHash`
- `sourceUrl`
- `retrievedOn`
- issuer/reference/effective-date label.

If no authoritative context exists, the answer must fail closed semantically: return an explicit no-authority result and never fabricate a regulatory answer.

If more than one version of the same source is supplied for the same `asOf`, A1 must reject it as ambiguous.

## Forbidden in A1

- source ingestion or source mutation;
- derived-artifact persistence;
- direct table reads or writes;
- generic SQL/RPC execution;
- service-role business/regulatory reads;
- browser provider calls or browser secrets;
- OpenAI/Anthropic/provider SDK path;
- raw query, raw source text or generated interpretation persistence;
- client UI changes;
- database migrations;
- Edge deployment;
- authoritative AI/editorial output;
- Phase 12.5 work.

## Frozen budgets

A1 adds no client bundle. Existing ceilings remain:

- initial JS: **670000**
- total JS: **760000**
- CSS: **180000**

No budget increase and no feature cut are authorized.

## Exit from A1

A1 may be certified only when:

- exact Phase 12.3 closure lineage is preserved;
- Phase 9.4 M8 authority is reused, not duplicated;
- request/hash/source/citation/ambiguity/no-fabrication tests pass;
- no provider or persistence path exists;
- cumulative governance/roadmap gates stay green;
- Phase 12.5 remains locked.

