# Phase 13.5 — Import Destruction Gate — A1 Kickoff

**Status:** IN_PROGRESS / A1 STATIC CROSS-BOUNDARY DESTRUCTION  
**Exact base:** `64b78767ebd3b0112e752f979d5448f78bdfd2cf` — corrected canonical Phase 13.4 closure/deployment record.  
**Successor:** Phase 14.1 — Cross-domain Journeys — **LOCKED**.

## Purpose

Phase 13.5 is not a feature-delivery phase. It is the destructive Zero-Escape gate over the complete legacy-import chain:

`snapshot → normalize/map → ordered plan → caller-supplied ID binding → authenticated import RPC → reconciliation`.

It must prove that the certified write boundary cannot silently broaden from the three explicitly mapped Phase 13 tables into the expanded M1–M18 model.

## Frozen authority

No new table, write RPC, Edge Function authority, client UI, generated target ID, inferred legacy mapping, automatic repair or unreviewed bulk import is allowed.

The only import targets inherited from Phase 13.3 remain:

- `contacts`
- `companies`
- `transactions`

Production A2/A3 reconciliation functions inherited from Phase 13.4 are read-only `STABLE SECURITY INVOKER`, authenticated-only evidence functions. They do not authorize repair or closure.

## A1 destruction matrix

A1 attacks the source contracts before any destructive hosted run:

- expanded-model target escape into documents, workflow/procedure state, ownership/governance or other M1–M18 tables;
- unknown legacy types and undeclared relationship vocabulary;
- count ceilings and 5001-record/item overflow;
- orphan/dangling relations;
- duplicate source keys and duplicate caller-supplied target IDs;
- unsafe money precision, exponent/comma syntax and silent rounding;
- hidden control fields at snapshot, mapping, binding and execution-manifest layers;
- workspace/write/repair/reconciliation/closure authority preclaims;
- relationship dependency/order drift;
- idempotency-key corruption and deterministic replay;
- caller-input mutation traps.

A clean path is permitted only to produce the already-certified non-executed RPC envelope for the existing `execute_legacy_ordered_import_v1` boundary. A1 itself performs no database write.

## Exit from A1

A1 may become PASS only when its dedicated workflow proves:

1. all destruction tests pass;
2. Phase 13.1–13.4 audits and core import tests remain green;
3. full functional/database/governance regression remains green;
4. secrets/type/build/frozen budgets remain green;
5. no client delta or authority expansion appears.

A1 PASS still does **not** unlock Phase 14.1. Phase 13.5 must continue through isolated Real Cloud destruction, exact PR-head, merge, exact-main, Real Browser and deployed-live evidence before formal closure.
