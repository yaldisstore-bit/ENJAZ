# Phase 10.2 — Document Intelligence / OCR — Real Cloud Evidence

Status: **PASS — CLOUD AUTHORITY BOUNDARY / PROVIDER PENDING**

## Certified run

- Branch: `phase10-2-document-intelligence-ocr`
- Certified commit: `be84f5627785d1f41c39761455452e31aa3aad51`
- GitHub Actions run: `34759239683`
- Workflow: `ENJAZ Phase 10.2 — Real Cloud Document Intelligence E2E`
- Supabase project: `juzxriirhkuzviwnhkbd`
- Evidence schema: `enjaz.phase10-2-real-cloud-e2e.v1`
- Result: `passed: true`
- External OCR provider connected at certification: `false`

## Authenticated production-cloud checks

The certificate used a disposable confirmed Auth user and its automatically bootstrapped workspace against the real Supabase project. It exercised the production Document Vault and Document Intelligence authority boundaries with the repository-only privileged test secret.

The run proved:

1. A real private PDF v1 can be prepared, uploaded through the signed Vault broker and acknowledged as immutable source version 1.
2. Direct authenticated browser insertion into `document_analysis` is denied by PostgreSQL (`42501`).
3. An extraction request is bound to the exact immutable source version.
4. Server-only extraction start/completion moves the analysis into `review_required` without changing the source file.
5. An authenticated human can review/correct extracted fields.
6. Verification is a distinct step and returns `promotedToSource: false`; verified intelligence remains derived.
7. The verified v1 provenance is persisted.
8. Uploading and acknowledging a real source v2 automatically supersedes the previously verified v1 intelligence with `SOURCE_VERSION_STALE`.
9. Re-verifying the stale analysis cannot restore verification and returns `SOURCE_VERSION_CHANGED`.
10. `get_document_intelligence_v1` exposes the stale provenance explicitly against current source version 2.
11. Calling the deployed `enjaz-document-intelligence` Edge Function with the real authenticated user fails safely and explicitly with HTTP 503 `OCR_PROVIDER_NOT_CONFIGURED` because no external provider is configured yet.
12. That provider absence is persisted as an explicit failed analysis rather than hidden or promoted.

## Zero-residue cleanup

The run removed both test Storage objects, deleted the disposable workspace, and deleted the disposable Auth user. Every cleanup item in the evidence artifact reports `passed: true`.

## Provider boundary

This certificate does **not** claim real OCR-provider completion. It deliberately records provider absence as a safe, explicit condition:

`providerConnected: false`

Therefore Phase 10.2 remains **IN PROGRESS**. A real provider must be configured server-side, then a second Real Cloud certificate must prove actual OCR output, page provenance, review, verification and stale-source invalidation through the deployed provider path before the phase can close.

Phase 10.3 remains locked.
