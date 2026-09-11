# Phase 9.4 — Regulatory / Knowledge Base Engine — M8 Foundation Kickoff

Status: **IN PROGRESS — FOUNDATION**

Base: `c81cc8fa3732ac97248fdaaabc72cc5f7f26b29f` — the formal Phase 9.3 closure merge.

## Why this phase exists

ENJAZ needs regulatory knowledge that can be trusted as evidence, not merely searched as text. Phase 9.4 establishes the first M8 authority boundary for laws, regulations, instructions, circulars, official notices and procedural knowledge while preserving the distinction between official source truth, structured facts, editorial interpretation and AI assistance.

## Authority model

1. **Official source identity** is explicit: jurisdiction, issuer, source kind and official reference/code.
2. **Official source versions** are immutable/versioned, effective-dated and provenance-bound.
3. **Official global sources** are never directly authored by an ordinary browser session; later persistence must use privileged ingestion/verification commands.
4. **Workspace-curated knowledge** is tenant-scoped, RLS-protected and cannot masquerade as an official source.
5. **Editorial interpretation and AI summaries are derived artifacts only**. They must reference authoritative source/version identifiers and can never set authoritative truth.
6. Historical resolution is deterministic as-of a date; ambiguity fails closed.
7. Search normalization/indexing is a derived representation and may never rewrite official source text or metadata.
8. Citations are built only from an actual source/version/provenance tuple; the system never fabricates a regulatory citation.

## Foundation scope

The foundation contract covers:

- source kinds and source scopes;
- source identity and official provenance;
- strict ISO publication/effective intervals;
- SHA-256 source fingerprints;
- immutable revision lineage and explicit supersession;
- duplicate/fork/cycle protection;
- non-overlapping authoritative effective periods;
- deterministic historical `as-of` resolution;
- Arabic-first normalized retrieval helpers isolated from source truth;
- source-grounded citation output;
- derived editorial/AI artifacts with a hard `authoritative=false` contract.

## Destructive foundation gate

The foundation gate must reject at least the following classes of corruption:

- missing or malformed provenance;
- malformed source identity/scope;
- invalid effective intervals;
- duplicate version/revision identities;
- overlapping active official versions;
- broken/cyclic/forked version lineage;
- AI or editorial content attempting to become authoritative;
- ambiguous historical resolution;
- citation/source mismatches;
- mutation of source truth by search normalization;
- Phase 9.5 successor escape before 9.4 closure.

## What is deliberately not implemented in the foundation

No production regulatory tables, ingestion RPCs, workspace curation persistence or final regulatory UI are created in this foundation commit. Those remain locked until this contract passes exact-head CI. This keeps Product → UI/UX → Engineering → Certification explicit and prevents database/UI work from outrunning the authority model.

## Successor law

Phase 9.5 remains **LOCKED**. M8 remains **ACTIVE**, not globally closed, because its second governing anchor is Phase 12. Phase 9.4 itself cannot close before Real Cloud, Real Browser, Pages and deployed-live recertification of its own canonical runtime.
