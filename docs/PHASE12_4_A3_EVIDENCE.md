# ENJAZ Phase 12.4 — A3 Search↔Entry Binding Hardening — Evidence

**Status:** CERTIFIED / PASS  
**Certified at:** 2026-09-18  
**Slice:** A3 — Search↔Entry Binding Hardening  
**Major system:** M8 — Regulatory / Knowledge Base Engine  
**Successor:** Phase 12.5 remains **LOCKED**.

## Purpose

A3 hardens the integrity boundary between the existing M8 search and entry read authorities without creating any new regulatory truth or mutation path.

The Edge now binds the authoritative search result to the subsequently retrieved entry across:

- caller/root `workspaceId`;
- caller/root `asOf`;
- `sourceId`;
- `versionId`;
- `sourceHash`;
- `scope`;
- scope/workspace shape.

The following fail closed:

- search root workspace drift;
- search root as-of drift;
- malformed/non-authoritative search items;
- official-global source carrying a workspace;
- workspace-curated source belonging to another workspace;
- duplicate source rows;
- same-source version ambiguity;
- entry source/version/hash/scope drift;
- entry workspace/as-of drift;
- unconfigured entry after a search result advertised the source.

## Source certificate

A3 Gate **#3 / 35381052846** — **PASS**  
Certified source head: `d70fc17539885c2c45a35023a2b40769492f0edc`

The gate certified:

- Phase 12.4 lifecycle/authority audit;
- A1 grounded contract preservation;
- A2 caller-JWT Edge preservation;
- **8/8 A3 adversarial binding tests**;
- Phase 9.4 runtime authority tests;
- preservation markers for the Phase 9.4 rollback-only positive runtime probe;
- TypeScript;
- production build;
- frozen production budgets.

## Live Edge

`enjaz-regulatory-assistant`:

- status: **ACTIVE**
- version: **3**
- `verify_jwt=true`
- deployment digest: `6b6f3c5d00c8db41ad06c7a3e4ee7e1ee702c3f25c369fd1477fe9ed56bcc8d9`
- database migrations added by A3: **0**
- permanent regulatory fixtures added by A3: **0**

## Real Cloud safety replay

Workflow:

- `.github/workflows/phase12-4-a3-real-cloud-e2e.yml`
- run **#1 / 35381162760**
- head: `aff25554ebbb964dca0e078932929fb1e4bd836d`
- artifact: **10562785271**
- artifact digest: `sha256:ba4d51d43e7c3024c36c631e8a1ec89562131a0bc0be1e42e8423287da59c888`
- live safety checks: **18/18 PASS**
- cleanup: **PASS**
- auth/workspace residue: **0**
- regulatory mutation: **0**

The live replay reconfirmed after Edge v3 deployment:

- JWT required;
- invalid JWT denied;
- authenticated empty-store request remains structurally successful;
- no authoritative context means zero citations/source text/structured facts;
- no-fabrication answer remains explicit;
- interpretation remains non-authoritative and provider-free;
- cross-workspace request denied;
- authority-escape fields denied;
- invalid as-of and unbounded limit denied;
- POST-only boundary;
- second-workspace empty-store safety;
- zero mutation of regulatory sources, versions and derived artifacts.

## Positive M8 authority preservation

The canonical live M8 store was still empty during the A3 live replay:

- regulatory sources: **0**
- regulatory source versions: **0**
- regulatory derived artifacts: **0**

A3 deliberately does **not** seed fake permanent regulatory truth.

Positive M8 persistence/retrieval semantics remain inherited from the formally certified Phase 9.4 authority, whose rollback-only Real Cloud probes create official-global and workspace-curated versions inside a deliberately rolled-back database subtransaction and prove:

- official/curated separation;
- version lineage;
- historical as-of resolution;
- source-version binding;
- derived-artifact non-authority;
- cross-workspace denial;
- zero residue.

A3 Gate #3 preserves the Phase 9.4 runtime tests and the rollback-probe contract. A new populated-source HTTP journey is **not claimed** while the canonical live M8 store contains no authoritative sources.

## Certification decision

**PASS — A3 Search↔Entry Binding Hardening is certified.**

A3 strengthens retrieval integrity only. It adds no source authority, provider authority, persistence path, client UI, database migration or mutation capability.

Phase 12.5 remains **LOCKED**.
