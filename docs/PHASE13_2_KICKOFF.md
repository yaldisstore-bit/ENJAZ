# Phase 13.2 — Normalize & Map — A1 Explicit Mapping Contract

**Status:** IN PROGRESS  
**Base:** `aa8e402eeb6ed03bee9fb446bc2c741da37df7dc` — final merged Phase 13.1 closure  
**Predecessor:** Phase 13.1 — CLOSED / certified read-only intake  
**Successor:** Phase 13.3 — Ordered Import — LOCKED

## Objective

A1 introduces a deterministic, reviewable **mapping preview** over the already-certified Phase 13.1 snapshot contract.

It may normalize and map only when the caller supplies an explicit mapping plan. It does not execute import and does not persist anything.

## Authority law

- Phase 13.1 snapshot intake remains the only source parser.
- Legacy snapshots are non-authoritative.
- A mapping plan is review metadata, not business authority.
- Every mapped legacy type must be named exactly; no aliases, case-folding, fuzzy matching or inferred synonyms.
- Every mapped source field and target field must be named explicitly.
- Unmapped source fields are ignored, never silently copied.
- Unmapped legacy types remain `QUARANTINED_UNMAPPED_TYPE`.
- A1 cannot assign relationship foreign keys, IDs, workspace IDs, timestamps, deletion fields or lifecycle authority.
- A1 cannot write ENJAZ tables.

## A1 target scope

Only preview targets are allowed:
- `companies`
- `contacts`
- `transactions`

A1 safe target fields are deliberately narrow:
- companies: `legal_name`, `display_name`, `capital`, `address`, `activities`, `registration_number`, `legal_status`
- contacts: `display_name`, `contact_type`, `phone`, `email`, `notes`
- transactions: `type`, `department`, `current_fee`

Reserved/authority-bearing fields such as `id`, `workspace_id`, relationship IDs, status/priority, created/updated/deleted timestamps and archival/lifecycle fields are forbidden in A1.

## Normalization rules

Only three deterministic rules exist:
- `identity_scalar`: preserves a JSON scalar only.
- `trim_text`: requires a string and trims surrounding Unicode whitespace.
- `strict_number`: accepts a finite number or an unambiguous plain decimal string; commas, exponents, blank values and surrounding whitespace are rejected.

No date parsing, enum inference, transliteration, alias repair, relationship inference or default-value synthesis exists in A1.

## Preview law

The output is `enjaz.legacy.mapping.preview.v1` and is always:
- in-memory only;
- `readOnly=true`;
- `persistencePerformed=false`;
- `importExecutionAllowed=false`;
- `targetMutationAllowed=false`;
- `eligibleForOrderedImport=false`.

Duplicate record keys and dangling links from Phase 13.1 remain explicit review issues. A mapping preview never repairs them.

## Frozen system boundary

A1 adds:
- no DB migration/table;
- no write RPC;
- no Edge Function;
- no client UI/CSS;
- no provider authority;
- no budget increase.

## Successor lock

**Phase 13.3 — Ordered Import remains LOCKED.**
