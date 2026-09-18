# Phase 13.1 — Read-only Legacy Snapshot Intake — Kickoff

**Status:** IN PROGRESS  
**Base:** `a7a17d6309e43cff68968be33deecbdac57ed4ed` — final merged Phase 12.5 closure  
**Predecessor:** Phase 12.5 — CLOSED / M8 + M9 ZERO_ESCAPE_V1 certified  
**Successor:** Phase 13.2 — Normalize & Map — LOCKED

## Objective

Accept a bounded legacy export as **read-only evidence**, preserve its raw structural meaning, and produce a deterministic structural inventory before any mapping or import authority exists.

Phase 13.1-A1 owns only:

- strict snapshot-envelope validation;
- bounded JSON-safe legacy record preservation in memory;
- deterministic counts by legacy record type;
- duplicate `type + id` detection;
- dangling-link detection;
- review/quarantine signalling.

It does **not** own normalization, target-model mapping, ordered import, writes, reconciliation, client UI, new database tables, new write RPCs, or Edge authority.

## Authority law

- The legacy snapshot is **not authoritative ENJAZ truth**.
- Intake is read-only and in-memory in A1.
- No legacy field is silently renamed, normalized, merged, deduplicated, or coerced into M1–M18.
- No unknown concept may be guessed into a target ENJAZ table/system.
- Duplicate records and dangling links are surfaced for review; they are not silently repaired.
- Phase 13.2 is the first phase allowed to define explicit source→target mappings.
- Phase 13.3 is the first phase allowed to define ordered import behavior.
- Existing ENJAZ domain authorities and RLS remain unchanged.

## A1 snapshot contract

Schema: `enjaz.legacy.snapshot.intake.v1`

Envelope:

- `snapshotId`
- `source.system`
- optional `source.exportId`
- UTC `capturedAt`
- `records[]`

Each record carries only:

- legacy `type`
- legacy `id`
- opaque JSON-safe `fields`
- optional structural `links[]` with `kind / targetType / targetId`

Unknown envelope/record/link control fields fail closed.

## Structural inventory

A1 may derive only:

- total record count;
- deterministic record-type counts;
- duplicate `type:id` keys;
- links whose target `type:id` is absent;
- `requiresReview`.

The inventory explicitly states:

- `authoritative=false`
- `readOnly=true`
- `mappingPerformed=false`
- `normalizationPerformed=false`
- `persistencePerformed=false`
- `writePlanGenerated=false`

## Safety bounds

- snapshot: max 8 MiB;
- records: max 5,000;
- record: max 128 KiB;
- links per record: max 256;
- nested JSON depth: max 8;
- no NaN/Infinity/undefined/function values.

## Frozen client budget

No 13.1-A1 client UI/CSS is added. Existing ceilings remain:

- initial JS 670000 bytes;
- total JS 760000 bytes;
- CSS 180000 bytes;
- budget increase forbidden.

## A1 certification

Required before A1 can be certified:

- lifecycle/base/successor lock audit;
- strict-envelope negative tests;
- opaque Arabic/legacy field preservation;
- deterministic inventory;
- duplicate quarantine;
- dangling-link quarantine;
- resolved-link non-quarantine;
- nested invalid JSON rejection;
- no persistence / mapping / normalization / write-plan behavior;
- full functional regression;
- DB audit unchanged;
- major-system closure governance unchanged;
- secrets + TypeScript + build + frozen budget PASS.

## Successor lock

**Phase 13.2 — Normalize & Map remains LOCKED.**
