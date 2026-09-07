# ENJAZ Phase 8.1 — Workflow Engine & Government Procedure OS — M1

**Status: IN_PROGRESS — Phase 8.2 remains locked.**

Phase 8.1 starts only after Phase 7.5 formal closure merge `7e42e69623db7af32797448f00ae3b58735ad794` completed final canonical recertification, including Pages and the published-application attack.

## Governing architecture

ENJAZ already owns one authoritative workflow engine in the Phase-1 baseline:

- `workflow_templates`
- `workflow_template_stages`
- `workflow_template_items`
- `workflow_instances`
- `workflow_stage_states`
- `workflow_item_states`

Phase 8.1 **extends these tables**. It must not introduce a second workflow runtime, duplicate transaction status, or maintain a shadow procedure state beside `workflow_instances`.

## M1 scope in 8.1

This stage adds the Government Procedure Operating System around that workflow engine:

- government entities and branches;
- authoritative procedure catalog linked one-to-one to workflow templates;
- stage requirements/documents/actions through existing template items;
- stage SLA through existing `due_offset_days`;
- exact official reference fees that never become finance ledger/payment facts;
- procedure prerequisites with cycle rejection;
- explicitly allowed transitions;
- transaction-attached procedure instances;
- idempotent start and transition commands;
- optimistic stale-stage rejection;
- immutable transition history and audit evidence;
- frozen item/stage metadata on running instances so template edits do not rewrite history.

## Security boundary

- workspace membership is required for every read/write;
- catalog tables use RLS and least-privilege grants;
- workflow instance/stage mutation becomes RPC-only;
- RPCs validate `auth.uid()` and workspace membership;
- no browser DELETE path is introduced;
- transition-history rows are append-only to browser clients;
- public RPC execution is explicitly revoked from `PUBLIC`/`anon` and granted only to `authenticated`.

## Closure gate

Phase 8.1 remains open until all of the following are proven:

1. migration/schema contract and destructive DB self-tests are green;
2. real authenticated Supabase procedure start → requirement completion → transition → refresh round trip passes;
3. duplicate start/transition replay returns the same authoritative result and payload drift conflicts;
4. invalid/stale transitions and incomplete required items fail closed;
5. official fees remain reference-only and never create finance events;
6. prerequisite cycles are rejected;
7. real Chromium covers desktop/mobile and long Arabic/dense procedure states;
8. zero Critical/High/functional blockers;
9. exact merge SHA is deployed and attacked on `/live/`;
10. post-merge recertification is COMPLETE.

**Phase 8.2 is not authorized by this kickoff.**
