# Phase 10.1 — Real Cloud Evidence

Status: **IN PROGRESS**  
Phase 10.2+: **LOCKED**

This evidence records only what has actually passed against the production Supabase project `juzxriirhkuzviwnhkbd` and the governed Phase 10.1 branch. It deliberately does not mark the signed-binary path complete until an authenticated end-to-end upload reaches Storage through the deployed Edge Function.

## Current certified code/runtime candidate

Current replay-hardened candidate: `b009da0ea45dfde169edcf2a32d5773722401e82`.

Natural, non-probe gates on that exact head:

- Document Vault Gate `34742912758` — **SUCCESS** (authority/replay contract audit, 10/10 Vault tests, 218/218 functional regression, DB/roadmap/major-systems integrity, secret audit, TypeScript, production build, `/live/` build, fixed budgets, Phase 10.2 lock).
- Project Quality Constitution `34742912836` — **SUCCESS**.
- Dedicated Document Vault Real Browser `34742912786` — **SUCCESS**, including the five governed widths and high-severity dependency audit.
- General Real Browser Acceptance `34742912806` — **SUCCESS** across Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, destruction wave 1, destruction wave 2, Production Bridge, and Phase 9.1–9.4 runtime suites.

The dedicated Document Vault browser guard executes the actual Phase 10.1 UI workflow at **1280 / 430 / 390 / 360 / 320** and passed all five governed widths. It covers loading, empty/error recovery, new upload, company/transaction relation, version drawer/history, real v2 UI path, version download, archive, pagination to offset 100, RTL/no horizontal overflow, and minimum interactive control geometry.

## Runtime and fixed budgets

The React compatibility runtime remains Preact-based, but the originally adopted `preact@10.27.2` was found by the new high-severity dependency gate to be affected by `GHSA-36hm-qxxp-pg3m` (JSON VNode Injection). The vulnerability was not ignored or allowlisted.

A one-time governed npm runner generated `package.json` and `package-lock.json` with exact `preact@10.29.8`, ran a locked install and high-severity audit, committed the generated metadata, and was then physically removed. The clean candidate therefore contains no temporary upgrade workflow.

Dedicated browser runs subsequently pass `npm audit --audit-level=high`.

The latest application runtime changes after the Preact upgrade are Edge/SQL/audit-contract only, so the certified client bundle remains within the same fixed ceilings. Last exact measured production budget:

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
9. `phase_10_1_ack_replay_hardening`

The transport/settings dispatch migrations are one-time evidence probes, not product schema. Their temporary bookkeeping has been removed. No probe sessions, documents or workspaces remain.

Post-deployment checks confirmed:

- `public.document_upload_sessions` exists and has RLS enabled.
- Phase 10.1 document/version metadata columns exist.
- `prepare_document_upload_v1` and service-only acknowledgement RPCs exist.
- `authenticated` has no direct INSERT/UPDATE/DELETE authority on `documents` or `document_versions`.
- `get_document_upload_claim_v1` now accepts only uploader-owned `prepared` or `acknowledged` sessions after the workspace membership guard.
- an acknowledged claim returns `binaryAuthoritative=true`.
- `authenticated` and `service_role` may execute the upload-claim RPC while `anon` may not.

## Production DB destructive probe

`phase_10_1_real_cloud_db_probe` executed successfully against production using rollback-contained fixtures. It certified:

- browser/direct table mutation lane is denied;
- authenticated prepare RPC is allowed while anon prepare and authenticated service acknowledgement are denied;
- invalid MIME and >50 MiB uploads fail before authority mutation;
- prepare is replay-safe/idempotent;
- generated Storage paths contain workspace/document/version/operation identity and do not contain the original filename;
- no `document_versions` row exists before acknowledgement;
- outsider workspace access is rejected;
- acknowledgement creates exactly one authoritative v1 and the service acknowledgement RPC is duplicate-safe;
- a failed later upload never becomes a version and does not damage the current ready document;
- a subsequent valid upload becomes v2 at a new immutable path while v1 is preserved;
- version-specific download claims resolve the correct paths;
- detail history exposes both versions;
- archive preserves binary/version history and excludes the document from the normal vault while retaining it in `includeArchived`;
- all destructive fixtures were rolled back and residue checks passed.

## Acknowledgement replay hardening

While designing the final real Storage E2E, a boundary bug was found before certification: the service RPC `acknowledge_document_upload_v1` was duplicate-safe, but the Edge broker could not reach that duplicate-safe path after a successful first acknowledgement because `get_document_upload_claim_v1` previously exposed only `prepared` sessions.

The defect was fixed without weakening authority:

- migration `phase_10_1_ack_replay_hardening` allows the authenticated uploader to recover its immutable claim in `prepared` or `acknowledged` state only;
- `prepared` claims remain `binaryAuthoritative=false`;
- `acknowledged` claims are `binaryAuthoritative=true`;
- failed/cancelled states are not replayable;
- the Edge broker validates this state/authority pairing;
- an acknowledged replay goes through `ack_replay_rpc` directly to the already duplicate-safe service acknowledgement RPC using the stored path, size and MIME, instead of pretending to be a first acknowledgement and re-running initial Storage verification.

This contract is now guarded by the Phase 10.1 authority audit and passed all normal CI/browser gates on `b009da0ea45dfde169edcf2a32d5773722401e82`.

The migration is applied in production as version `20260913063446`.

## Database advisors after replay deployment

A post-deployment performance advisor still reports **21** unindexed foreign keys, all belonging to earlier systems. No Phase 10.1 foreign key appears in the unindexed-FK findings. The Phase 10.1 covering indexes appear only as newly unused indexes, which is expected before real Storage traffic.

Security advisor notes:

- `document_upload_sessions` has RLS with no row policies by design: the table is fully revoked from browser roles and is reachable only through guarded RPC boundaries.
- authenticated `SECURITY DEFINER` notices on the Document Vault RPCs are expected for this design because they explicitly run the private workspace-membership guard and direct table mutation is revoked.
- unrelated pre-existing warnings, including leaked-password protection being disabled and earlier-system lints, are not asserted as Phase 10.1 closure evidence.

## Production Edge Function

`enjaz-document-vault` is deployed and **ACTIVE** with replay hardening:

- version: **2**
- deployment id: `8e4eccee-128d-46a6-a5ac-96cf94cf4a0a`
- deployed bundle SHA-256: `cb17bbda466e73117558e578e07aa3a52814d43565c0c449c95a67f02338d774`
- `verify_jwt`: **true**

A production fetch of the deployed function source confirms the v2 code contains the acknowledged-claim validation and `ack_replay_rpc` branch from the governed repository candidate.

The deployed function uses authenticated user context for guarded RPCs and server credentials only for Storage signing/verification and service acknowledgement. Upload URLs use `upsert:false`; first acknowledgement verifies actual object byte size and MIME before promoting a version; acknowledged replay routes to the duplicate-safe RPC; downloads are short-lived signed URLs.

## Auth / transport evidence

A real Auth transport request verified that anonymous sign-in is disabled in production:

- HTTP `422`
- `anonymous_provider_disabled`

Anonymous Auth was **not enabled** for testing.

A disposable signup attempt was rejected before user creation (`email_address_invalid`). No test user/session was retained.

A read-only Auth settings probe to the project's public `/auth/v1/settings` endpoint returned HTTP 200 and confirmed:

- email provider: enabled;
- signup: enabled;
- `mailer_autoconfirm`: **false**;
- anonymous users: **disabled**;
- phone auth: **disabled**.

Production Auth contains one confirmed user and no test-marked user. That real account is intentionally not being used or reset for certification. Because email auto-confirm is disabled, an arbitrary public signup would create an unconfirmed account without a usable JWT; we intentionally did not leave such an account behind and did not weaken Auth settings.

The available Supabase connector provides database/project/Edge operations but no Auth Admin `createUser` action and no service-role-key retrieval. A privileged Real-Cloud test runner requiring admin/service-role credentials was not added after the platform safety layer blocked that path; no attempt was made to bypass or obfuscate the restriction. A temporary unauthenticated/admin bootstrap Edge endpoint was also rejected as a certification strategy because it would manufacture a privileged bypass solely to make the test pass.

## Remaining closure boundary — NOT YET PASSED

A production read after the v2 deployment confirms that bucket `enjaz-documents-private` still does **not** exist. This is expected: deployment itself does not create Storage state. The Edge broker creates/verifies the bucket through the Storage API only after a valid authenticated invocation reaches it. We intentionally did **not** write directly to `storage.buckets`.

All code, browser, dependency, migration and Edge-v2 replay-hardening gates are green. The remaining closure boundary is exclusively the real authenticated Storage path using a disposable confirmed test identity:

1. authenticated Edge `prepare` with a valid disposable-user JWT;
2. creation/verification of the private 50 MiB MIME-restricted bucket through Storage API;
3. signed browser upload with `upsert:false`;
4. pre-object acknowledgement rejection;
5. exact object byte-size and MIME validation;
6. successful acknowledgement producing exactly one v1 row;
7. Edge acknowledgement replay returning the same v1 as a duplicate-safe success;
8. mismatch object cleanup/failure behavior through the real Storage API;
9. v2 upload to a distinct path preserving v1;
10. signed download of selected versions;
11. archive preserving the uploaded objects/history;
12. cleanup of test objects/rows and deletion of the disposable Auth identity.

Until that authenticated Storage sequence is passed and recorded, **Phase 10.1 remains IN PROGRESS and Phase 10.2 remains LOCKED**.
