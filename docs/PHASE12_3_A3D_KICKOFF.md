# ENJAZ Phase 12.3 — A3-D Governed Document Request Adapter

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Certified predecessors:** A3-A `followup.snooze`, A3-B `followup.create`, and A3-C self `reminder.schedule` are Real Cloud certified.

## New adapter

A3-D adds exactly one fourth low-risk adapter:

- action: `document.request`
- prepare: `prepare_document_request`
- execute: `execute_document_request`
- canonical read authority: `public.get_client_portal_admin_authority_v1` plus the existing transaction read boundary
- canonical mutation authority: `public.save_client_portal_request_v1`

## Deliberate restrictions

- request type is hard-locked to `document`.
- required permission remains the M3-owned `upload_requested_document`.
- `resourceShareId` is hard-locked to null.
- `validFrom` is not exposed; M3 applies its canonical execution-time default.
- `expectedVersion` is hard-locked to null: the agent may create a new request but may not edit an existing request.
- principal, transaction, pre-generated portal request ID, title, instructions, due timestamp and validity timestamp are digest-bound before approval.
- due and validity must both remain future and due must not exceed validity.
- prepare uses caller-JWT M3 admin authority; no service-role business read is permitted.
- execution accepts only proposal ID/hash + single-use execution key.
- PostgreSQL loads approved fields and invokes `save_client_portal_request_v1` with `request_type='document'`.
- M3 revalidates owner, shareable principal, transaction, grant and validity at execution.
- grant/principal/domain failure rolls back approval consumption atomically.
- payment, approval, appointment, information/message, finance, ownership, workflow-transition and generic portal actions remain locked.
- no client UI delta; frozen JS/CSS budgets remain unchanged.
- Phase 12.4 remains LOCKED.
