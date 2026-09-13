# Phase 10.1 — Real Cloud Evidence

Status: **IN PROGRESS**  
Phase 10.2+: **LOCKED**

This evidence records only what has actually passed against the production Supabase project `juzxriirhkuzviwnhkbd` and the governed Phase 10.1 branch. It deliberately does not mark the signed-binary path complete until an authenticated end-to-end upload reaches Storage through the deployed Edge Function.

## Current certified code/runtime candidate

Clean candidate head before this evidence-only update: `72fde5c96bf05d335dcef567ab8cf40eb044954c`.

Natural, non-probe gates on that exact head:

- Document Vault Gate `34742481433` — **SUCCESS** (80-check authority audit, 10/10 Vault tests, 218/218 functional regression, DB/roadmap/major-systems integrity, secret audit, TypeScript, production build, `/live/` build, fixed budgets, Phase 10.2 lock).
- Project Quality Constitution `34742481445` — **SUCCESS**.
- Dedicated Document Vault Real Browser `34742481439` — **SUCCESS**.
- General Real Browser Acceptance `34742481472` — **SUCCESS** across Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, destruction wave 1, destruction wave 2, Production Bridge, and Phase 9.1–9.4 runtime suites.

The dedicated Document Vault browser guard executes the actual Phase 10.1 UI workflow at **1280 / 430 / 390 / 360 / 320** and passed all five governed widths. It covers loading, empty/error recovery, new upload, company/transaction relation, version drawer/history, real v2 UI path, version download, archive, pagination to offset 100, RTL/no horizontal overflow, and minimum interactive control geometry.

## Runtime and fixed budgets

The React compatibility runtime remains Preact-based, but the originally adopted `preact@10.27.2` was found by the new high-severity dependency gate to be affected by `GHSA-36hm-qxxp-pg3m` (JSON VNode Injection). The vulnerability was not ignored or allowlisted.

A one-time governed npm runner generated `package.json` and `package-lock.json` with exact `preact@10.29.8`, ran a locked install and high-severity audit, committed the generated metadata, and was then physically removed. The clean candidate therefore contains no temporary upgrade workflow.

Dedicated run `34742481439` subsequently passed `npm audit --audit-level=high` on the clean candidate.

Certified production budget on `72fde5c96bf05d335dcef567ab8cf40eb044954c`:

- raw distribution: **769,808**
- initial JS: **390,947 / 670,000**
- total JS: **583,513 / 760,000**
- lazy JS: **192,566**
- largest lazy chunk: **53,363 / 140,000**
- CSS: **179,997 / 180,000**
- gzip JS+CSS: **188,804**

The `/ENJAZ/live/` build also passed its fixed budget:

- raw distribution: **769,874**
- initial JS: **390,969 / 670,000**
- total JS: **583,535 / 760,000**
- lazy JS: **192,566**
- largest lazy chunk: **53,363 / 140,000**
- CSS: **179,997 / 180,000**
- gzip JS+CSS: **188,817**

No budget ceiling was raised.

## Browser defects discovered and repaired by the dedicated guard

The dedicated Phase 10.1 reality guard found two defects that the generic matrix did not expose:

1. **Async upload form lifetime** — the new-document submit path used `e.currentTarget.reset()` after awaiting the upload. In the Preact/React-compatible event lifetime this could make a successful upload appear as a UI failure and prevent the refresh. The form element is now captured before the first await and reset through the stable reference.
2. **Native select touch targets** — company/transaction selects rendered at approximately 23 px high across every governed width while other controls were 44 px. The Document Vault surface now governs selects at 44 px. The first styling form exceeded the immutable CSS ceiling by 145 bytes, so it was compacted without lowering the 44 px target or raising the budget. The final CSS is 179,997 bytes.

The same unchanged browser assertions then passed at all five widths.

## Production database deployment

Applied successfully:

1. `phase_10_1_document_vault`
2. `phase_10_1_fk_index_hardening`
3. `phase_10_1_edge_transport_probe_dispatch`
4. `phase_10_1_temp_auth_probe_dispatch`
5. `phase_10_1_real_cloud_db_probe`
6. `phase_10_1_probe_transport_cleanup`
7. `phase_10_1_auth_settings_probe_dispatch`
8. `phase_10_1_auth_settings_probe_cleanup`

The transport/settings dispatch migrations are one-time evidence probes, not product schema. The earlier transport-dispatch source files were removed from the branch after execution and cleanup because replaying them during a reset would resend external Auth requests and retaining publishable-key-shaped literals violated repository secret-audit policy. The Auth settings probe table was also removed immediately after its response was recorded.

Post-deployment checks confirmed:

- `public.document_upload_sessions` exists and has RLS enabled.
- Phase 10.1 document/version metadata columns exist.
- `prepare_document_upload_v1` and service-only acknowledgement RPCs exist.
- `authenticated` has no direct INSERT/UPDATE/DELETE authority on `documents` or `document_versions`.
- temporary transport/settings probe bookkeeping was removed.
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

A second advisor run reports **21** unindexed foreign keys, all belonging to earlier systems. No Phase 10.1 foreign key remains in the unindexed-FK findings. Newly created 10.1 indexes appearing as unused immediately after creation is expected.

Security advisor notes:

- `document_upload_sessions` has RLS with no row policies by design: the table is fully revoked from browser roles and is reachable only through the guarded RPC boundary.
- authenticated `SECURITY DEFINER` warnings on the public vault RPCs are expected for this design; the public functions call the private workspace-membership guard and direct table mutation is revoked.
- unrelated pre-existing project warnings are not asserted as Phase 10.1 closure evidence.

## Production Edge Function

`enjaz-document-vault` is deployed and **ACTIVE**:

- version: `1`
- deployment id: `8e4eccee-128d-46a6-a5ac-96cf94cf4a0a`
- deployed source SHA: `11999258ea42f6f1f8fa88b4d7c729b767b5f6ee61061b024138e3af7625fb20`
- `verify_jwt`: **true**

The deployed function uses authenticated user context for guarded RPCs and server credentials only for Storage signing/verification and service acknowledgement. Upload URLs use `upsert:false`; acknowledgement verifies actual object byte size and MIME before promoting a version; downloads are short-lived signed URLs.

## Auth / transport evidence

A real Auth transport request verified that anonymous sign-in is disabled in production:

- HTTP `422`
- `anonymous_provider_disabled`

Anonymous Auth was **not enabled** for testing.

A disposable signup attempt was rejected before user creation (`email_address_invalid`). No test user/session was retained.

A later read-only Auth settings probe to the project's public `/auth/v1/settings` endpoint returned HTTP 200 and confirmed:

- email provider: enabled;
- signup: enabled;
- `mailer_autoconfirm`: **false**;
- anonymous users: **disabled**;
- phone auth: **disabled**.

Production Auth currently contains one confirmed user and no test-marked user. That real account is intentionally not being used or reset for certification. Because email auto-confirm is disabled, an arbitrary public signup would create an unconfirmed account without a usable JWT; we intentionally did not leave such an account behind and did not weaken Auth settings.

The currently available Supabase connector exposes public-key discovery and database/project operations but no Auth Admin `createUser` action and no secret/service-role-key retrieval. A temporary unauthenticated/admin bootstrap Edge endpoint was also rejected as a certification strategy because it would manufacture a privileged bypass solely to make the test pass.

## Remaining closure boundary — NOT YET PASSED

The private bucket `enjaz-documents-private` does **not** yet have certified creation through the production Storage API. The deployed Edge Function creates/verifies it only after a valid authenticated user invocation reaches the function. We intentionally did **not** write directly to `storage.buckets`, because Supabase documents Storage schema tables as read-only for application operations.

The dedicated Phase 10.1 browser acceptance is now **PASSED**, so the remaining closure boundary is exclusively the real authenticated Storage path:

1. authenticated Edge `prepare` with a valid non-production-test-user JWT;
2. creation/verification of the private 50 MiB MIME-restricted bucket through Storage API;
3. signed browser upload with `upsert:false`;
4. pre-object acknowledgement rejection;
5. exact object byte-size and MIME validation;
6. successful acknowledgement producing exactly one v1 row;
7. v2 upload to a distinct path preserving v1;
8. signed download of selected versions;
9. mismatch object cleanup/failure behavior through the real Storage API;
10. archive preserving the uploaded objects/history;
11. cleanup of test objects/rows and deletion of the disposable Auth identity.

Until that authenticated Storage sequence is passed and recorded, **Phase 10.1 remains IN PROGRESS and Phase 10.2 remains LOCKED**.
