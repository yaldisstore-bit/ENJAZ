# Phase 10.1 — Real Cloud Evidence

Status: **IN PROGRESS**  
Phase 10.2+: **LOCKED**

This evidence records what has actually passed against the production Supabase project `juzxriirhkuzviwnhkbd`. It deliberately does not mark the signed-binary path complete until an authenticated end-to-end upload reaches Storage through the deployed Edge Function.

## Certified code/runtime candidate

Clean pre-cloud runtime head: `c7c406f8d37df080e891c55b7734387f1e5821d3`.

Normal, non-probe gates on that head:

- Document Vault Gate `34740283533` — **SUCCESS** (authority audit, 10/10 vault tests, 218/218 regression, DB/roadmap/major-systems integrity, secrets, TypeScript, canonical build, `/live/` build, fixed budgets, Phase 10.2 lock).
- Project Quality Constitution `34740283504` — **SUCCESS**.
- Real Browser Acceptance `34740283464` — **SUCCESS** across 1280 / 430 / 390 / 360 / 320, including Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, destruction wave 1, destruction wave 2, Production Bridge, and Phase 9.1–9.4 runtime suites.

Permanent compatibility runtime is pinned in `package.json` / `package-lock.json` and canonical Vite configs. Certified production budget after adoption:

- total JS: **583,531 / 760,000**
- initial JS: **390,940 / 670,000**
- lazy JS: **192,591**
- CSS: **179,984**

## Production database deployment

Applied successfully:

1. `phase_10_1_document_vault`
2. `phase_10_1_fk_index_hardening`
3. `phase_10_1_edge_transport_probe_dispatch`
4. `phase_10_1_temp_auth_probe_dispatch`
5. `phase_10_1_real_cloud_db_probe`
6. `phase_10_1_probe_transport_cleanup`

The two transport-dispatch migrations in items 3–4 were one-time external side-effect probes, not product schema. Their source files were removed from the branch after execution and cleanup because replaying them during a reset would resend Auth HTTP requests, and retaining their publishable-key-shaped literals violated the repository secret-audit policy. Their applied production migration records and the captured results below remain historical evidence. The permanent product migration, hardening migration, rollback-contained DB certification probe and cleanup remain governed separately.

Post-deployment checks confirmed:

- `public.document_upload_sessions` exists and has RLS enabled.
- Phase 10.1 document/version metadata columns exist.
- `prepare_document_upload_v1` and service-only acknowledgement RPCs exist.
- `authenticated` has no direct INSERT/UPDATE/DELETE authority on `documents` or `document_versions`.
- temporary transport probe bookkeeping was removed.
- no probe sessions, documents or workspaces remain.

## Production DB destructive probe

`phase_10_1_real_cloud_db_probe` executed successfully against production using rollback-contained fixtures. It certified:

- browser/direct table mutation lane is denied;
- authenticated prepare RPC is allowed while anon prepare and authenticated service acknowledgement are denied;
- invalid MIME and >50 MiB uploads fail before authority mutation;
- prepare is replay-safe/idempotent;
- generated Storage paths contain workspace/document/version/operation identity and do not contain the original filename;
- no `document_versions` row exists before acknowledgement;
- outsider workspace access is rejected;
- acknowledgement creates exactly one authoritative v1 and acknowledgement replay is duplicate-safe;
- a failed later upload never becomes a version and does not damage the current ready document;
- a subsequent valid upload becomes v2 at a new immutable path while v1 is preserved;
- version-specific download claims resolve the correct paths;
- detail history exposes both versions;
- archive preserves binary/version history and excludes the document from the normal vault while retaining it in `includeArchived`;
- all destructive fixtures were rolled back and residue checks passed.

## Database advisors

Immediately after the primary migration, the performance advisor reported 27 unindexed foreign keys, including six introduced/touched by Phase 10.1. `phase_10_1_fk_index_hardening` added covering indexes for all six Phase 10.1 relationships.

A second advisor run reports **21** unindexed foreign keys, all belonging to earlier systems. No Phase 10.1 foreign key remains in the unindexed-FK findings. Newly created 10.1 indexes appear as unused, which is expected immediately after creation.

Security advisor notes:

- `document_upload_sessions` has RLS with no row policies by design: the table is fully revoked from browser roles and is reachable only through the guarded RPC boundary.
- authenticated `SECURITY DEFINER` warnings on the public vault RPCs are expected for this design; the public functions call the private workspace-membership guard and direct table mutation is revoked.
- unrelated pre-existing project warnings (for example leaked-password protection and earlier systems) are not asserted as Phase 10.1 closure evidence.

## Production Edge Function

`enjaz-document-vault` is deployed and **ACTIVE**:

- version: `1`
- deployment id: `8e4eccee-128d-46a6-a5ac-96cf94cf4a0a`
- deployed source SHA: `11999258ea42f6f1f8fa88b4d7c729b767b5f6ee61061b024138e3af7625fb20`
- `verify_jwt`: **true**

The deployed function uses the authenticated user context for guarded RPCs and server credentials only for Storage signing/verification and service acknowledgement. Upload URLs are generated with `upsert:false`; acknowledgement checks the actual object byte size and MIME before promoting a version; downloads are short-lived signed URLs.

## Auth / transport evidence

A real `pg_net` request to Supabase Auth verified that anonymous sign-in is disabled in production:

- HTTP `422`
- `anonymous_provider_disabled`

Anonymous Auth was **not enabled** for testing.

A disposable email signup transport attempt was rejected by Auth before user creation (`email_address_invalid`). No test user/session was retained. The probe transport table was subsequently removed.

## Remaining closure boundary — NOT YET PASSED

The private bucket `enjaz-documents-private` does **not** yet exist. The deployed Edge Function creates/verifies it through the Storage API only after a valid authenticated invocation reaches the function. We intentionally did **not** write directly to `storage.buckets`, because Supabase documents the Storage schema as read-only for application operations.

Therefore the following must remain **pending** before Phase 10.1 can close:

1. authenticated Edge `prepare` with a real user JWT;
2. creation/verification of the private 50 MiB MIME-restricted bucket through Storage API;
3. signed browser upload with `upsert:false`;
4. pre-object acknowledgement rejection;
5. exact object byte-size and MIME validation;
6. successful acknowledgement producing exactly one v1 row;
7. v2 upload to a distinct path preserving v1;
8. signed download of selected versions;
9. mismatch object cleanup/failure behavior through the real Storage API;
10. archive preserving the uploaded objects/history;
11. cleanup of test objects/rows;
12. dedicated Phase 10.1 browser acceptance covering the Document Vault UI itself.

Until those are passed and recorded, **Phase 10.1 remains IN PROGRESS and Phase 10.2 remains LOCKED**.
