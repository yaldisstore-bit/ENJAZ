# ENJAZ Phase 7.4 — Financial Reports

Status: `IN_PROGRESS`

## Canonical objective

Deliver authoritative financial reporting by period, company, transaction and cashbox without creating a second finance source of truth.

## Implemented candidate

- exact-money report core reusing the Phase 7.1 money boundary;
- period/company/transaction/cashbox report scopes;
- inclusive date filtering with fail-closed invalid ranges/dates;
- current-fee/open-balance facts separated from period cash movement;
- posted/reversed movement details with reversed lines carrying zero effective value;
- deterministic report fingerprint and direct source provenance;
- CSV + JSON exports derived from the same snapshot rendered on screen;
- print/PDF-ready rendering derived from that same snapshot;
- M16 contract/retainer reporting hook reserved without a shadow finance store;
- cashbox reporting explicitly refuses to invent per-cashbox movement because the current authoritative schema has no cashbox foreign key on payments or ledger entries;
- live finance portal composition preserves Phases 7.2 and 7.3.

## Required closure evidence

- Phase 7.4 unit/regression suite green;
- full functional regression green;
- Phase 7.1/7.2/7.3 preservation gates green;
- secrets/database/roadmap/typecheck/build/budget gates green;
- isolated Real Chromium report journey green at 1280/430/390/360/320;
- PR workflow set fully successful;
- exact merged SHA post-merge recertified on canonical `main`;
- deployed-live finance report critical path verified before Phase 7.5 unlock.

## Governance

Phase 7.4 is not closed by this file. It remains `IN_PROGRESS` until all Zero-Escape evidence above is complete.

**7.5 LOCKED**
