# Phase 11.2 — Universal Inbox Integration — Kickoff

**Status:** IN PROGRESS  
**Opened on:** 2026-09-14  
**Base:** `6c15d3db7c6c45ea9ee3db2f4e0fe6f1c78e33a7`  
**Predecessor:** Phase 11.1 — Notifications & Follow-ups — CLOSED / certified  
**Successor:** Phase 11.3 — Client Portal — M3 — LOCKED

## Governing objective

Phase 11.2 integrates the already-closed Phase 4.2 Daily Work / Universal Inbox with the governed Phase 11.1 notification lifecycle so users see one truthful actionable work surface without duplicating the underlying business records.

This phase is an integration layer, not a new source-of-truth system.

## Reused authority

The canonical actionable-work projection continues to derive from source-owned records:

- `transaction_followups`;
- `transaction_blockers`;
- `calendar_events`;
- `renewals`;
- `workflow_instances` + `workflow_item_states`;
- active transaction/company context and routing ownership;
- `in_app_notifications` only as governed attention/lifecycle metadata from Phase 11.1.

`notification_deliveries` remains transport history and may not become Inbox state.

## Non-negotiable integration contract

- **No `universal_inbox` shadow table/store.**
- Underlying business records retain completion/status/edit authority.
- Notifications do not create a second copy of an existing follow-up/calendar/renewal/workflow action.
- Notification provenance (`sourceType` + `sourceId`) must be used to merge attention state onto the matching canonical work item when a match exists.
- A notification cannot fabricate an actionable business object that its source authority does not support.
- Completing or changing a work item must call the source-owned service/RPC; marking a notification read/unread/snoozed/cancelled remains notification authority only.
- Cross-workspace composition is forbidden.
- Archived/deleted/completed source work cannot leak back into the active Inbox merely because a stale notification exists.
- Snooze/cancel/read state must not silently mutate the underlying business fact.
- Stable identity and deterministic dedupe are mandatory across refresh/reload.
- Mobile/RTL/touch/no-overflow certification remains required through 320 px.
- Rebirth 2.0 locked palette and frozen budgets remain unchanged.

## Phase 4.2 preservation

Phase 4.2 already closed a real Universal Inbox derived from follow-ups, blockers, calendar, renewals and workflow state. Phase 11.2 must extend that implementation rather than replace it. Existing Phase 4.2 destructive tests and consumers become regression dependencies.

## Initial implementation order

1. Freeze a Phase 11.2 composition/dedupe contract over Daily Work + Phase 11.1 notifications.
2. Add destruction tests for duplicate provenance, stale notifications, completed/archived sources, snooze/cancel/read separation and cross-workspace isolation.
3. Extend the runtime service without adding a shadow persistence layer.
4. Integrate the canonical Today / Universal Inbox UI using the locked design system.
5. Certify Real Browser, exact-main, Pages and Live External before closure.

Phase 11.3 remains locked until Phase 11.2 is formally closed.
