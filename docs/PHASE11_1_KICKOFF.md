# Phase 11.1 — Notifications & Follow-ups — Kickoff

**Status:** IN PROGRESS  
**Base:** `9c3fc01c40d6ddfccd2a423720c5a19fa19efa49`  
**Predecessor:** Phase 10.6 — Documents Zero-Escape Gate — CLOSED  
**Authorized successor after closure:** Phase 11.2 — Universal Inbox Integration — LOCKED

## Objective

Build the governed notification and follow-up authority for ENJAZ without creating a second source of truth for work that already exists.

Phase 11.1 owns notification lifecycle and the general follow-up experience. It must compose existing authoritative work/domain events, existing transaction follow-ups, existing notification preferences and existing delivery history. A notification may point to source work, but it may never replace or fabricate the underlying business fact.

## Existing authority that must be reused

- `transaction_followups` — existing authoritative transaction follow-up records, including due state, completion and snooze state.
- `notification_preferences` — existing per-workspace/per-user reminder preference authority.
- `notification_deliveries` — existing notification delivery-history authority.
- `calendar_events` and `renewals` — existing due-date sources where a notification/follow-up projection is required; Phase 11.1 may consume them but does not take ownership of their source facts.
- existing workflow, transaction, finance, document, contract and operational histories remain the source authority for events generated from those domains.

## Non-negotiable authority laws

1. No shadow notification/follow-up fact store may duplicate `transaction_followups`, `notification_preferences`, `notification_deliveries`, or another domain's authoritative record.
2. Notification identity must be deterministic enough to deduplicate/reconcile repeated source events.
3. A repeated event may collapse presentation/delivery, but must not destroy source provenance.
4. Read/unread, snooze, cancel, complete and delivery state must have explicit lifecycle rules; impossible transitions fail closed.
5. Quiet hours/preferences affect notification delivery/presentation only; they may not erase or mutate the source business event.
6. Follow-up completion must preserve who/when evidence where the authoritative record supports it.
7. Snoozing an item must not silently mark it complete or change the source due fact.
8. Archived/deleted/completed source records may not continue to generate actionable follow-up work unless a surviving authoritative obligation explicitly requires it.
9. Cross-workspace references and delivery are forbidden.
10. Browser presentation may not invent authoritative delivery or completion outcomes.
11. Optional email/push delivery is out of scope until an explicit provider authority is integrated; Phase 11.1 must work fully in-app without pretending external delivery succeeded.
12. Frozen performance budgets remain `670000` initial JS / `760000` total JS / `180000` CSS.

## Initial implementation stage

`AUTHORITY_DISCOVERY_AND_LIFECYCLE_CONTRACT`

The first stage is intentionally schema-conservative. Existing tables and RLS are inspected before any migration is authorized. A new schema object is permitted only if a concrete Phase 11.1 requirement cannot be represented safely by the existing authority.

## Initial destruction targets

- duplicate/replayed source event;
- cross-workspace source or target;
- impossible read/snooze/cancel/complete transition;
- snooze that loses due/source provenance;
- completed/archived source still surfacing as actionable;
- quiet-hours suppression that deletes a notification fact;
- delivery marked successful without authoritative evidence;
- stale source revision promoted into a fresh notification;
- repeated reconnect/reload producing duplicate actionable notifications;
- narrow Arabic/RTL notification and follow-up surfaces.

## Exit law

Phase 11.1 cannot close from a branch-only green build. Closure requires the implemented authority, Real Cloud permission/lifecycle evidence where writes are introduced or changed, Real Browser/mobile evidence, exact-main certification, Pages and Live External evidence, zero Critical/High/functional blockers, and formal closure documentation.
