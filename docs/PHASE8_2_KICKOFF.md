# Phase 8.2 — Automation Engine Kickoff

Status: **IN_PROGRESS**  
Base: `65e2c29bc5b656b5c56daa84a893aeff65c5d662` — canonical Phase 8.1 closure merge.

## Governing contract

Phase 8.2 extends the **existing** `automation_rules` + `automation_runs` baseline. It must not create a second workflow engine, duplicate transaction state, or a shadow finance mutation path.

Required capabilities:
- human-readable trigger / condition / action rules;
- rule activation/deactivation with stale-version protection;
- dispatch receipt idempotency and changed-payload conflict rejection;
- explicit `started / awaiting_approval / succeeded / skipped / failed` execution states;
- action-level execution evidence;
- human approval before sensitive workflow transitions;
- approved workflow mutations call the already-authoritative `transition_workflow_v1` boundary;
- automation has **no finance write authority**;
- audit evidence for rule changes, dispatches and approval decisions;
- Real Cloud, Real Chromium, merge, deployed-live and post-merge recertification before closure.

## Initial implementation shape

- Existing `automation_rules`: canonical rule definition authority.
- Existing `automation_runs`: canonical execution/run authority.
- `automation_run_actions`: per-action execution ledger, not a second business-state store.
- `automation_approval_requests`: explicit human approval evidence for sensitive actions.
- RPC-only rule mutation/dispatch/approval boundaries.

## Successor lock

**Phase 8.3 — Operations Center + Field Operations — M5 remains LOCKED** until Phase 8.2 is CLOSED and post-merge recertified.
