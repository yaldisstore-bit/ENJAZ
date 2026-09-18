# ENJAZ Phase 12.3 — A3-C Self Reminder Scheduling Adapter

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Certified predecessors:** A3-A `followup.snooze` and A3-B `followup.create` are both Real Cloud certified.

## New adapter

A3-C adds exactly one third low-risk adapter:

- action: `reminder.schedule`
- prepare: `prepare_schedule_reminder`
- execute: `execute_schedule_reminder`
- canonical read authority: `public.get_scheduling_deadline_snapshot_v1`
- canonical mutation authority: `public.dispatch_scheduling_attention_v1`

## Deliberate restrictions

- mode is hard-locked to `reminder`; escalation is not exposed.
- recipient is hard-locked to the authenticated approving actor (`auth.uid()`); the request contains no recipient field.
- optional follow-up creation in the underlying M10 RPC is hard-disabled with null follow-up arguments.
- supported source kinds are only `workflow_deadline` and `renewal_occurrence`.
- prepare binds source kind, source ID, domain operation ID and exact scheduled timestamp before approval.
- PostgreSQL independently recomputes the action SHA-256.
- execution accepts only proposal ID/hash + single-use execution key.
- PostgreSQL loads approved fields, validates actor/workspace/hash/kind/approval/expiry/freshness, invokes the existing M10 reminder authority, and consumes approval in the same transaction.
- domain failure rolls back approval consumption.
- no service-role business reads or execution.
- no generic execute operation.
- finance, ownership, documents, messages, workflow transitions and permission mutations remain locked.
- no client UI delta; frozen JS/CSS budgets remain unchanged.
- Phase 12.4 remains LOCKED.
