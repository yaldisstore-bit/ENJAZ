# ENJAZ Phase 12.3 — A3-E Governed Document Draft Adapter

**Status:** IN PROGRESS  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Certified predecessors:** A3-A `followup.snooze`, A3-B `followup.create`, A3-C self `reminder.schedule`, and A3-D `document.request` are Real Cloud certified.

## New adapter

A3-E adds exactly one fifth low-risk adapter:

- action: `document.draft`
- prepare: `prepare_document_draft`
- execute: `execute_document_draft`
- canonical read authority: `public.get_document_factory_v1`
- canonical mutation authority: `public.generate_document_draft_v1`

## Deliberate restrictions

- execution stops at Document Factory status `review_required`.
- review, approval/return, render, finalization, Vault output and submission packs are not exposed.
- `contactId` and `ocrAnalysisId` are hard-locked to null in A3-E.
- caller may bind only a published template version, generation request ID, title, and optional company/transaction IDs.
- every exposed business input is digest-bound before approval.
- prepare uses caller-JWT Document Factory authority and caller-JWT RLS reads for optional company/transaction validation.
- service role stores proposal/trace evidence only and never reads or mutates Document Factory business truth.
- execution accepts only proposal ID/hash plus a single-use execution key.
- PostgreSQL loads approved fields and invokes `generate_document_draft_v1`; no generic tool exists.
- Document Factory revalidates membership, template publication/activation and source facts at execution.
- domain failure rolls back proposal consumption atomically.
- no client UI delta; frozen JS/CSS budgets remain unchanged.
- Phase 12.4 remains LOCKED.
