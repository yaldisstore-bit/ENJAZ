# Phase 5.2 — Transaction Create/Edit

Status: **CLOSED ✅**. Closure evidence: `docs/PHASE5_2_TRANSACTION_CREATE_EDIT_CLOSURE.md`. **Phase 5.3 remains not started until this closure is merged and canonical `main` is re-certified.**

Phase 5.2 began only after Phase 5.1 was closed and certified on canonical `main`. This phase owns transaction creation and safe editing; it does **not** start 360° details, archive/restore lifecycle, full workflow-engine management, or the Phase 5.5 destruction gate.

## Governing scope

The implementation must provide:

- validated transaction create and edit forms;
- authoritative company selection and company/contact relationship validation;
- transaction type, department, state, priority and current fee fields;
- completion/station dates where the selected state or station assignment requires them;
- transaction station/work assignment through the preserved transaction-route model;
- optional transaction notes through the preserved notes model;
- explicit handling of fee edits without silently erasing the previous fee fact;
- live writes only through the authenticated workspace-scoped Data Layer;
- deterministic fixture behavior for public preview / CI with no production writes;
- loading, validation, saving, success, conflict, partial-write/outcome-unknown and retry-safe error states;
- mobile/RTL/keyboard-safe presentation using the frozen UI V2 system.

## Data-integrity rules

1. `workspace_id`, record identity, deletion fields and archival fields are never supplied by the form.
2. A transaction company is required and must exist in the current workspace.
3. A selected primary contact must exist in the workspace and be related to the selected company by `company_contacts` or the company primary-contact relation.
4. Transaction type is required and remains within the frozen database length contract.
5. Status is limited to `active`, `stalled`, or `completed`; priority is limited to `low`, `normal`, `high`, or `urgent`.
6. `current_fee` must be positive and precision-safe before it is represented as a JavaScript number.
7. `completed_at` is required when the state is completed and is cleared for non-completed states.
8. Phase 5.2 never archives, restores, deletes, or reactivates archived/deleted transactions; those remain Phase 5.4.
9. Station assignment is represented as transaction-route history rather than overwriting an earlier route fact.
10. Notes are append-only facts; editing a transaction does not mutate or erase historical notes.
11. A changed fee must produce an explicit fee-change fact with a reason; the UI may not silently replace financial history.
12. Stale edit sources must fail as a conflict instead of silently overwriting a newer transaction state.
13. Any multi-write partial outcome must be surfaced explicitly; the UI may not claim an all-or-nothing save when that was not proven.

## Scope boundaries

Not part of Phase 5.2:

- Transaction 360° timeline/details composition — Phase 5.3.
- Archive / restore / deleted lifecycle UI — Phase 5.4.
- Full transaction destruction campaign — Phase 5.5.
- Full workflow template authoring / workflow engine UI — Phase 8.
- Full company/contact management — Phase 6.
- Full finance ledger/payment implementation — Phase 7.

## Release gate

Phase 5.2 cannot close until all of the following are green:

- Phase 5.2 architecture audit;
- dedicated model/service destructive tests;
- complete functional regression suite;
- frozen UI V2 cumulative gates;
- Phase 4.2 / 4.3 / 4.4 and Phase 5.1 cumulative guards;
- TypeScript and production build;
- strict production asset budget;
- real Chromium create/edit validation on desktop and narrow Android-sized viewports;
- keyboard/open-sheet interaction checks;
- no horizontal overflow and no sub-44px interactive controls;
- PR mergeability and post-merge canonical `main` re-certification.

The implementation, destructive certification, and permanent cumulative gate protection are documented in `docs/PHASE5_2_TRANSACTION_CREATE_EDIT_CLOSURE.md`.

**Next phase remains locked:** Phase 5.3 — Transaction Details / 360° does not begin until this release gate is green, this closure is merged, and canonical `main` is re-certified.
