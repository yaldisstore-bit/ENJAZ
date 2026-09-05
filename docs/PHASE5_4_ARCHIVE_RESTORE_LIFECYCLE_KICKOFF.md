# ENJAZ Phase 5.4 — Archive / Restore / Lifecycle

Status: **IN PROGRESS**

Canonical base: `main` at `924b40b1f8c21d212aa2857a4a3265401af99a84` after Phase 5.3 was merged and re-certified through Quality, real Chromium, Pages and Live External gates.

## Scope

Phase 5.4 owns safe transaction lifecycle mutation only:

- Archive a non-deleted transaction by setting `archived_at` without inventing a database status that does not exist.
- Restore an archived transaction by clearing `archived_at` while preserving its underlying `active` / `stalled` / `completed` status.
- Reactivate a completed transaction explicitly by returning it to `active`, clearing `completed_at`, and clearing `archived_at` when present.
- Preserve all historical notes, routes, payments, fee history and follow-ups; lifecycle actions must not erase history.
- Record lifecycle facts in append-only `transaction_activity` because the frozen `entity_lifecycle_events` schema is scoped to company/contact lifecycle and must not be misused for transactions.
- Prevent stale or repeated lifecycle writes from silently overwriting newer transaction state.
- Keep archived/completed/deleted transactions suppressed from Daily Work and active operational surfaces until an explicit valid restore/reactivation makes them active again.

## Data-model truth

The frozen transaction schema allows `status` values `active`, `stalled`, and `completed`. It does **not** allow a synthetic `archived` status. Archive state is represented by `archived_at`.

Therefore:

- `archive` sets `archived_at` and preserves `status`.
- `restore` clears `archived_at` and preserves `status`.
- A restored completed transaction remains completed and therefore still belongs to the closed/archived list until a separate explicit `reactivate` action is performed.
- `reactivate` sets `status = active`, clears `completed_at`, and clears `archived_at`.

## Follow-up invariant

Archiving does not destructively cancel historical follow-up rows. Existing operational selectors already exclude work whose parent transaction is archived/completed/deleted. This means:

1. archive suppresses open follow-ups from active work surfaces without deleting them;
2. restore/reactivate is the explicit business action that can make preserved open follow-ups operational again;
3. no hidden bulk status rewrite is allowed merely to make the UI look clean.

## Safety gates

Phase 5.4 must fail closed when:

- the authenticated user has no workspace;
- the transaction does not exist in the authenticated workspace;
- the transaction is deleted;
- the transaction changed after the lifecycle context was loaded;
- archive is requested for an already archived transaction;
- restore is requested for a transaction that is not archived;
- reactivate is requested for a transaction that is not completed;
- lifecycle note input exceeds its bounded contract;
- supporting activity history cannot be confirmed (core mutation may succeed, but success must carry an explicit warning rather than claiming a perfectly clean outcome).

## Boundary locks

- No delete/purge implementation is introduced here.
- No payment mutation, receipt logic, ledger rewrite or Finance authority moves forward from Phase 7.
- No workflow stage mutation moves forward from Phase 8.
- No broad Phase 5.5 destruction closure is claimed here; Phase 5.5 remains the final Transactions Core destruction gate.
- No legacy UI/runtime DNA may be revived.

## First implementation slice

The first slice builds and tests the authoritative lifecycle model/service before visual wiring:

- pure lifecycle capability + patch model;
- authenticated workspace-scoped loader;
- exact open-follow-up context with a bounded capacity guard;
- stale-write protection;
- archive / restore / reactivate mutations;
- append-only transaction activity record with explicit unconfirmed-history warning;
- dedicated unit/service tests and architecture audit;
- cumulative Quality Gate integration.

Phase 5.4 is not complete until its UI actions, confirmation states, real-browser destruction, cumulative guards, closure evidence, merge to `main`, and post-merge external re-certification are green.