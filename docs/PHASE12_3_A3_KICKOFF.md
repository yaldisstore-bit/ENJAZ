# ENJAZ Phase 12.3 — A3-A Action-Specific Execution

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Certified predecessor:** A2 Approval Binding — source gate #12 + Real Cloud #2 PASS on `03216a7a246f03ed2a39c78db4a46f8efa3ec80c`.

## Opening executable adapter

A3 opens exactly one low-risk adapter:

- action: `followup.snooze`
- prepare operation: `prepare_followup_snooze`
- execute operation: `execute_followup_snooze`
- canonical domain authority: `public.mutate_transaction_followup_state_v1`

No other business action is authorized by A3-A.

## Zero-Escape laws

1. There is still no generic `execute` operation or generic SQL/RPC tool.
2. The proposal SHA-256 is calculated from a canonical action string and is independently recalculated inside PostgreSQL with `pgcrypto`.
3. Exact action fields are persisted before approval: workspace, target follow-up and snooze timestamp.
4. The execution request does not contain the target follow-up or snooze timestamp; it contains only proposal identity/hash and a single-use execution key.
5. PostgreSQL locks the approved proposal, validates actor/workspace/hash/kind/expiry, invokes the existing follow-up domain RPC and marks the approval `consumed` inside one transaction.
6. If the domain RPC fails, proposal consumption rolls back with it.
7. Exact execution replay with the same execution key is idempotent; a different execution key after consumption fails closed.
8. Business reads use the authenticated user client/RLS. Service-role business reads and writes remain forbidden.
9. `complete`, `cancel`, `wake`, finance, documents, communications, ownership, workflow transitions and permissions remain unauthorized.
10. No client UI is added in A3-A; frozen JS/CSS budgets remain unchanged.
11. Phase 12.4 remains LOCKED.
