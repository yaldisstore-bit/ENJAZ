# Phase 12.4 — Regulatory Knowledge Assistance — M8 — Formal Closure

**Status:** CLOSED / CERTIFIED  
**Closure date:** 2026-09-18  
**Formal predecessor:** Phase 12.3 closure `cc01d06be81be27e614d80c9edaa86bdf4e79634`  
**Implementation PR:** #203  
**Implementation head:** `940862eb22d9876038958942475f90b7179ab6f5`  
**Implementation merge SHA:** `974ff00abab45bfa6615b39cd4c31e0b20b7dfa0`  
**Authorized successor:** Phase 12.5 — AI Zero-Escape & Safety Gate — AUTHORIZED_NEXT

## Closure decision

**PASS**

Phase 12.4 is formally closed. Regulatory Knowledge Assistance is certified as a read-only, caller-authorized assistance layer over the existing Phase 9.4 / M8 regulatory truth authority. It does not create a second regulatory store, does not mutate regulatory truth, and does not promote generated interpretation into authoritative legal fact.

The Phase 12.4 implementation passed source certification for A1/A2/A3, authenticated Real Cloud safety evidence, complete implementation-PR certification, exact-main cumulative regression, the original Phase 9.4 Regulatory Knowledge gate, cumulative Real Browser, Pages deployment, Live External verification and the published authenticated client certificate.

## Certified slices

### A1 — Grounded Regulatory Assistance Contract

- response schema: `enjaz.regulatory.assistance.v1`
- opening operation: `answer`
- explicit ISO `asOf` required
- authoritative official text and structured facts are separated from non-authoritative interpretation
- exact source version/hash/provenance citations required
- missing authority: fail closed / no fabrication
- ambiguous `asOf`: fail closed
- provider path: absent
- persistence path: absent
- source Gate #3 / `35379162122`: PASS
- certification Gate #6 / `35379260589`: PASS

### A2 — Authenticated M8 Retrieval Edge

- caller JWT only
- read authorities are exactly:
  - `search_regulatory_knowledge_v1`
  - `get_regulatory_knowledge_entry_v1`
- no service-role/admin regulatory client
- no direct table access
- no mutation RPC
- Edge v2 / `verify_jwt=true`
- final source Gate #7 / `35380605634`: PASS
- Real Cloud #2 / `35380158712`: **18/18 PASS**
- zero regulatory mutation: PASS
- zero residue: PASS
- empty-store fail-closed/no-fabrication: PASS
- cross-workspace denial: PASS
- artifact `10561173790`
- artifact digest `sha256:7e8efac16e3ca078268be2e52a4afb7f62f5bd902fdeb582975e6936a82c7020`

### A3 — Search↔Entry Binding Hardening

- binding covers `workspaceId`, `asOf`, `sourceId`, `versionId`, `sourceHash` and `scope`
- `official_global` requires null source workspace
- `workspace_curated` requires caller workspace
- duplicate-source ambiguity, version drift, hash drift, scope drift, workspace drift and unconfigured-after-search all fail closed
- permanent fake regulatory truth seeding: forbidden
- populated live HTTP journey is not falsely claimed while the canonical M8 store is empty
- Edge v3 / `verify_jwt=true`
- live digest: `6b6f3c5d00c8db41ad06c7a3e4ee7e1ee702c3f25c369fd1477fe9ed56bcc8d9`
- A3 source Gate #3 / `35381052846`: PASS
- A3 certification Gate #5 / `35381351939`: PASS
- final branch Gate #6 / `35381474061`: PASS
- Real Cloud #1 / `35381162760`: **18/18 PASS**
- zero regulatory mutation: PASS
- zero residue: PASS
- artifact `10562785271`
- artifact digest `sha256:ba4d51d43e7c3024c36c631e8a1ec89562131a0bc0be1e42e8423287da59c888`

## Preserved M8 authority

The only regulatory truth authority remains Phase 9.4 / M8:

- official and workspace-curated sources remain distinct;
- official source truth remains append/version/effective-dated;
- provenance remains mandatory;
- historical `asOf` resolution remains deterministic;
- ambiguous authority fails closed;
- source normalization cannot mutate source truth;
- editorial interpretation is never authoritative;
- AI/assistance output is never authoritative;
- citations bind to an exact source version.

Phase 12.4 adds no database migration or new regulatory truth store.

Still forbidden after closure:

- direct regulatory table reads/writes from the assistant;
- source ingestion/mutation through the assistant;
- service-role regulatory reads;
- generic SQL/RPC execution;
- generated interpretation persistence;
- raw query/source-text persistence;
- provider/browser secret paths;
- client UI delta.

## Live runtime decision

Final live Edge:

- function: `enjaz-regulatory-assistant`
- status: ACTIVE
- version: **3**
- `verify_jwt=true`
- deployment digest: `6b6f3c5d00c8db41ad06c7a3e4ee7e1ee702c3f25c369fd1477fe9ed56bcc8d9`

Final advisor comparison:

- security total: **65**
- new Phase 12.4 security findings: **0**
- unindexed foreign keys: **28**
- new performance WARN findings: **0**

## Pull-request certificate

Implementation PR **#203** head `940862eb22d9876038958942475f90b7179ab6f5`.

- A1 Gate **#28 / 35383132904** — PASS
- A2 Gate **#17 / 35383132829** — PASS
- A3 Gate **#7 / 35383133541** — PASS
- Phase 9.4 Regulatory Knowledge Gate **#786 / 35383132884** — PASS
- Quality **#1762 / 35383132757** — PASS
- Major Systems Zero-Escape **#879 / 35383132838** — PASS
- Roadmap **#1810 / 35383132655** — PASS
- Project Quality Constitution **#2525 / 35383132738** — PASS
- cumulative Real Browser **#1678 / 35383132517** — PASS
- complete PR inventory: **86/86 completed = 85 success + 1 expected skipped; 0 failures**

The expected skipped workflow was the unrelated Real Azure Arabic OCR Exit Certificate.

## Exact-main post-merge certificate

Exact implementation merge SHA: `974ff00abab45bfa6615b39cd4c31e0b20b7dfa0`.

Critical runs:

- Quality **#1763 / 35383591859** — PASS
- Major Systems Zero-Escape **#880 / 35383591715** — PASS
- Roadmap **#1811 / 35383591928** — PASS
- Project Quality Constitution **#2526 / 35383591833** — PASS
- Phase 9.4 Regulatory Knowledge **#787 / 35383591750** — PASS
- Intelligence Zero-Escape **#663 / 35383591949** — PASS
- cumulative Real Browser **#1679 / 35383591860** — PASS
- GitHub Pages build/deploy **#197 / 35383590500** — PASS
- Pages Preview **#1581 / 35383653660** — PASS / deployed
- Live External **#1254 / 35383771057** — PASS
- Published Client Portal **#188 / 35383770968** — PASS

Exact-main inventory:

- workflows: **38**
- success: **38**
- failures: **0**
- queued: **0**
- in progress: **0**
- events: **34 push + 3 workflow_run + 1 dynamic**

The Phase 12.4-specific A1/A2/A3 source workflows are branch/PR-scoped by design; their exact implementation head is certified in PR #203, while exact-main is independently covered by the cumulative gates above including the original Phase 9.4 Regulatory Knowledge gate.

## Frozen client distribution

Phase 12.4 adds no client UI delta.

Canonical build:

- initial JS: **431,032 / 670,000 bytes**
- total JS: **759,568 / 760,000 bytes**
- margin: **432 bytes**
- CSS: **179,989 / 180,000 bytes**

Published Pages `/live/`:

- initial JS: **431,246 / 670,000 bytes**
- total JS: **759,985 / 760,000 bytes**
- margin: **15 bytes**
- CSS: **179,989 / 180,000 bytes**

Budget increase: **0**.  
Feature cut for budget: **0**.

## Defect / residue decision

- known Critical defects: **0**
- known High defects: **0**
- known functional blockers: **0**
- A2/A3 Real Cloud regulatory mutation: **0**
- A2/A3 cleanup residue: **0**
- PR workflow failures: **0**
- exact-main workflow failures: **0**
- new security regressions: **0**
- new performance WARN regressions: **0**

## M8 global-system law

Phase 12.4 closes the Phase-12 assistance anchor of M8 but does **not** prematurely mark M8 globally CLOSED. M8 remains `ACTIVE` until the downstream Phase 12.5 AI Zero-Escape & Safety Gate supplies the independent system-level adversarial evidence required by the major-system closure law.

## Successor authorization

Phase 12.5 — AI Zero-Escape & Safety Gate is now **AUTHORIZED_NEXT**.

Phase 12.5 must attack the M9/M8 AI surfaces for hallucination and missing-data resistance, prompt injection, malicious documents, permission escape, structured-output regression, approval/tool bypass and provider-outage recovery. It may not weaken the authority boundaries certified in Phases 12.1–12.4.
