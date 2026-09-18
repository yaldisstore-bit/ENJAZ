# ENJAZ Phase 12.3 — A3-B Follow-up Creation Adapter

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Certified predecessor:** A3-A `followup.snooze` — certification commit `bcd3f559435d0921c6a734cbd1f54df4cb18faab`, Gate #18 and Real Cloud #3 PASS; governance recording commit `58349438c8b2bc09e24aea8138ae6103435ae7e4` Gate #19 PASS.

## New adapter

A3-B adds exactly one second low-risk adapter:

- action: `followup.create`
- prepare: `prepare_followup_create`
- execute: `execute_followup_create`
- canonical domain authority: `public.create_transaction_followup_v1`

A3-A `followup.snooze` remains certified and unchanged.

## Zero-Escape laws

- No generic `execute` operation exists.
- Prepare binds workspace, transaction ID, pre-generated follow-up ID, exact trimmed title and exact due timestamp before approval.
- The title is SHA-256 hashed first; the title digest is included in the outer canonical action digest so delimiter/content ambiguity cannot alter action identity.
- PostgreSQL independently recomputes the exact nested SHA-256 with `pgcrypto`.
- Execution accepts only proposal ID/hash and a single-use execution key; it never accepts transaction, follow-up ID, title or due date again.
- PostgreSQL loads approved action fields, validates actor/workspace/hash/kind/expiry/due freshness, delegates to existing `create_transaction_followup_v1`, and consumes approval in the same transaction.
- Domain failure rolls back approval consumption.
- Exact execution replay is idempotent; conflicting replay fails closed.
- Business validation remains under the existing authenticated domain RPC and JWT context.
- Service-role business reads/writes remain forbidden.
- Only `followup.snooze` and `followup.create` are authorized; all other mutations remain locked.
- No client UI is added; frozen JS/CSS budgets remain unchanged.
- Phase 12.4 remains LOCKED.
