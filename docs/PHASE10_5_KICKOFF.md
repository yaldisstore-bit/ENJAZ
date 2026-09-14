# Phase 10.5 — Engagement/Contract Document Layer — M16

Status: **IN_PROGRESS**  
Predecessor: **Phase 10.4 — CLOSED + exact-main / Real Browser / Real Cloud / Pages / Live External certified**  
Successor: **Phase 10.6 — LOCKED**

## Authority contract

Phase 10.5 extends M16 without creating parallel authorities:

- Commercial engagement authority remains `commercial_engagements`.
- Transaction links remain `commercial_engagement_transactions`.
- Money authority remains Phase 7 Finance (`payments`, `payment_reversals`, `financial_ledger_entries`, `cashbox_accounts`).
- Issued document authority remains `documents` + immutable `document_versions`.
- Document generation authority remains Document Factory (`document_templates`, `document_drafts`, `pdf_jobs`).
- Contract revision authority is `engagement_contract_revisions`, which references those canonical authorities rather than replacing them.

M16 is **not globally CLOSED** in this phase. Phase 7 anchors Finance, Phase 10 anchors contract/document authority, and Phase 11 still owns the communication/renewal anchor.

## Delivered in the current branch

- TypeScript contract lifecycle and destruction tests.
- Database authority migration with composite workspace-scoped foreign keys.
- RLS SELECT boundary and RPC-only authoritative mutations.
- Governed revision lineage, dates, signature provenance, immutable signed artifact binding and engagement lifecycle projection.
- Signature rollback hardening and finalized Document Factory draft import support.
- Authenticated Real Cloud destruction probe on the connected Supabase project, including owner access, outsider denial, idempotency, signature/effective lifecycle and zero residue.
- Runtime `EngagementContractGateway` using the exact Supabase RPC/RLS authority.
- Phase 10.5 CI audit expanded to fail closed if any of these authority pieces disappear.

## Remaining before closure

- Wire the runtime gateway into the production resource graph and contract UI.
- Build review/signature/effective-date UX with Arabic/RTL/mobile-first behavior.
- Real Browser certification and mobile destruction tests.
- Exact-main, Pages, Live External and formal closure evidence.

Phase 10.6 remains locked until every Phase 10.5 exit gate is certified.
