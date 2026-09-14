# ENJAZ Phase 10.4 — Certification Status

Phase 10.4 remains **IN PROGRESS**. This document is a truth ledger, not a closure certificate.

## Certified

- Deterministic A4 pagination contract: **PASS**.
- Blank-page, overflow, footer, signature-reservation, repeated-table-header, and stable identity destruction tests: **PASS**.
- Canonical financial report adapter and same-snapshot export/preflight contract: **PASS**.
- Client ↔ server financial report parity for period/company/transaction/cashbox: **PASS**.
- Authenticated server-render gateway fail-closed contract, including stale-fingerprint rejection: **PASS**.
- `enjaz-financial-report-render` is deployed as **version 2** with JWT verification enabled.
- The renderer body-height defect was corrected to use the actual drawable body geometry (`TOP - CONTENT_BOTTOM`) and the Phase 10.4 audit now rejects the former invalid formula.
- Real Chromium browser/mobile/print-media journey: **PASS — 8/8** on certificate SHA `aa57241310e3321654676c557c3550bb30f52ac6`.
- Certified browser widths: **1280, 430, 390, 360, 320 px**.
- Browser certificate proves the UI journey only; its injected renderer is an explicit test double and is **not** accepted as real-cloud PDF output evidence.
- Production JavaScript/CSS budgets remain frozen and within Phase 10.4 limits.

## Real-cloud v2 preliminary certificate

The deployed v2 renderer produced a real authenticated financial PDF successfully on workflow run `34845721524`, rerun attempt 2:

- Real cloud PDF: **PASS**.
- Output: **44,301 bytes / 3 A4 pages**.
- Financial fingerprint: `ENJAZ-FR-be24946900477ff3`.
- Renderer fingerprint and stable identity: **verified**.
- PDF page-tree count versus renderer certificate: **verified**.
- QR + barcode image objects: **verified**.
- Stale fingerprint rejection: **HTTP 409 — PASS**.
- Foreign workspace rejection: **HTTP 403 — PASS**.
- Disposable workspace/auth cleanup: **zero residue — PASS**.
- Poppler binary inspection (`pdfinfo`, `pdftotext`, `pdfimages`): **PASS**.
- Extracted signature/footer markers and QR/barcode images: **PASS**.
- Evidence artifact: `10347263754`.

This preliminary pass was intentionally **not yet promoted to final Phase 10.4 cloud certification** because the workflow still had a temporary safe error-diagnostic preload during that run. The diagnostic has now been removed. A clean rerun on the final branch SHA is required before the state file may set `realCloudPdfOutputCertified=true`.

## Still required before closure

- Clean authenticated real-cloud Arabic/RTL multi-page financial PDF certificate with the temporary diagnostic removed: **PENDING FINAL CLEAN RERUN**.
- Exact-main certification after the canonical Phase 10.4 merge candidate is established: **PENDING**.
- GitHub Pages `/live/` and Live External public-browser certification for the exact main SHA: **PENDING**.

## Closure guard

Until every pending item above is certified:

- `exitGatePassed` must remain `false`.
- Phase 10.5 must remain locked.
- No local mock, browser stub, static marker, successful build, or preliminary diagnostic-assisted run may substitute for the final clean real-cloud certificate.
