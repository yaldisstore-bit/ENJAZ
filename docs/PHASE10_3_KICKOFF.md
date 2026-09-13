# Phase 10.3 — Document Factory & Official Form Engine — M7 — Kickoff

**Status:** IN PROGRESS  
**Base:** `667f2cc3892d8167e5880f030a1ff6dd6baf47b9`  
**Predecessor:** Phase 10.2 — CLOSED + exact-main Pages + Live External certified

## Objective

Build ENJAZ's governed document factory for deterministic official requests, letters, decisions, authorizations, reports and submission packs without creating a second document/source authority.

The existing logical factory tables are reused:

- `document_templates`
- `document_drafts`
- `correspondence_registry`
- `pdf_jobs`

The authoritative binary/output boundary remains the private Document Vault: `documents` + immutable `document_versions`.

## Non-negotiable authority model

1. A logical template is not enough to issue an official document; every official generation must bind to an immutable **template version**.
2. Every generated result must preserve the exact input fact snapshot and provenance used to compile it.
3. Finalization/issuance is a governed domain action, never an ordinary browser table update.
4. A finalized/issued artifact is linked to an authoritative `documents` / `document_versions` output; no shadow binary store is allowed.
5. Generated output cannot mutate company, transaction, finance, governance, contact or source-document truth.
6. OCR from Phase 10.2 may not feed an official artifact unless the extraction is explicitly verified and still current for the authoritative source version.
7. Once a template version has been used for an issued artifact it is immutable.
8. Regenerating from the same template version + fact snapshot must be reproducible.
9. Approval/finalization actor, time, source entities, template version, output document/version and checksums must be auditable.
10. Arabic/RTL layout, professional pagination, repeating rows/tables, conditional sections and deterministic PDF/export are first-class release requirements.

## Delivery track

1. Establish Phase 10.3 governance and activate M7.
2. Extend the existing schema with immutable template-version and generation provenance authority.
3. Replace sensitive direct-browser finalization writes with governed RPC/domain commands.
4. Implement approved merge fields, deterministic compile and review/approval lifecycle.
5. Bind finalized output to the Document Vault and stable correspondence identity.
6. Add official-form/PDF generation, QR/barcode identity and submission-pack composition.
7. Build the mobile/RTL Document Factory UI on the same domain service boundary.
8. Destructively test stale facts, unverified OCR, template drift, duplicate issuance, permission attacks, pagination, large tables and failed generation.
9. Certify Real Cloud, Real Browser, exact-main Pages and Live External before closure.

## Frozen budgets

- Initial JavaScript: `670000` bytes
- Total JavaScript: `760000` bytes
- CSS: `180000` bytes
- Budget increase: **forbidden unless separately governed**

## Successor lock

Phase 10.4 is **LOCKED** until Phase 10.3 and M7 satisfy their governing exit evidence. Starting Phase 10.3 does not imply M7 closure.
