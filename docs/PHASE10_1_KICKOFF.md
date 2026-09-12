# Phase 10.1 — Document Vault — Kickoff

**Status:** IN PROGRESS  
**Canonical base:** `78456e22c4f4eb0be1f81b255c7efbb3195a21fb` — formally closed Phase 9.7 main.  
**Successor:** Phase 10.2 remains **LOCKED** until 10.1 is formally closed and post-merge/deployed-live recertified.

## Authority decision

Phase 10.1 does **not** create a second document store. Existing `public.documents` remains the authoritative current-document metadata record and `public.document_versions` remains the authoritative binary-version history. Existing company/transaction relations remain workspace-aware and are preserved.

A new `document_upload_sessions` relation is transfer state only. It is not document truth and is not exposed as a browser-writable table.

## Binary boundary

- dedicated bucket: `enjaz-documents-private`;
- private only;
- browser never chooses an object path;
- object keys contain server-generated workspace/document/version/operation identifiers, never the original filename;
- upload uses a two-hour signed token generated server-side with `upsert:false`;
- the server verifies object existence, exact byte size and MIME before acknowledgement;
- only acknowledgement may append `document_versions` and promote `documents.status` to `ready`;
- failed/mismatched uploads never enter authoritative version history;
- download is a short-lived server-signed URL after authenticated workspace authorization;
- service-role credentials never enter browser code.

## Mutation law

Direct authenticated INSERT/UPDATE/DELETE on `documents` and `document_versions` is removed. Mutations are guarded RPC only. Documents are archived, not destructively deleted. New binary revisions use new paths and new version numbers; overwrite-in-place is forbidden.

## Phase 10.1 scope

In scope: secure upload, metadata-first preparation, version history, company/transaction linkage, list/search/detail, signed download, archive, empty/error/loading states and mobile-first Vault UI.

Out of scope and still locked: OCR/extraction/review (10.2), Document Factory/M7 (10.3), report/PDF generation (10.4), M16 engagement documents (10.5), and the Phase 10 destruction closure gate (10.6).
