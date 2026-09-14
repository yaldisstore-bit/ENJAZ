# Phase 10.6 — Documents Zero-Escape Gate — Kickoff

**Status:** IN_PROGRESS  
**Base:** `662ae5ebda43c45a889bddf4872ba610c71b7862`  
**Predecessor:** Phase 10.5 — CLOSED  
**Successor:** locked until the Zero-Escape exit gate passes.

## Mission

Phase 10.6 is a destruction-and-hardening gate for the complete document path. It adds no shadow document authority and may not weaken any Phase 10.1–10.5 invariant.

The gate must prove that ENJAZ fails closed for:

- missing storage objects;
- zero-byte, oversized, corrupt or type-spoofed binaries;
- broken or impossible document metadata;
- OCR/provider failure and stale extraction output;
- malicious/path-bearing uploads and active-content markers where detectable;
- long reports, multi-page pagination and reserved footer/signature/identity zones;
- offline/network interruption and safe retry/reconciliation;
- cross-workspace and unauthenticated access.

## Authority law

- `documents` + `document_versions` remain the issued-document authority.
- `document_upload_sessions` remains the guarded upload transaction boundary.
- Document Intelligence never becomes authoritative business data without review/verification.
- Reports/PDF remain projections of their canonical source snapshots.
- Contract revision authority remains `engagement_contract_revisions`; Phase 10.6 does not globally close M16.
- Browser code may not directly promote a binary to `ready`, forge storage paths, bypass RLS, or invent a verified OCR result.
- A failed binary validation must remove/quarantine the untrusted object and leave no acknowledged document version.
- Retry must reuse one operation identity and must not blindly repeat an outcome-unknown write.

## Required evidence before closure

1. Dedicated Phase 10.6 source/authority audit.
2. Destruction tests covering every dimension above.
3. Phase 10.1 Vault, 10.2 OCR, 10.3 Factory, 10.4 Reports/PDF and 10.5 Contract regressions remain green.
4. TypeScript, production build and frozen JS/CSS budgets remain green.
5. Real Chromium/mobile evidence through the governed minimum viewport.
6. Exact merged SHA recertification on `main`.
7. GitHub Pages + Live External deployed evidence.
8. Critical blockers = 0, High blockers = 0, functional blockers = 0.

A green branch alone cannot close Phase 10.6.
