# Phase 10.1 — Real Cloud Evidence

Status: **IN PROGRESS**  
Phase 10.2+: **LOCKED**

This file records only evidence that actually ran against the production Supabase project `juzxriirhkuzviwnhkbd` or the governed Phase 10.1 branch. Phase 10.1 is intentionally not marked closed until the corrected Real-Cloud certifier completes one clean pass from start to finish.

## Governed runtime candidate

The client/runtime line is permanently on exact `preact@10.29.8`. The earlier `10.27.2` pin was upgraded rather than allowlisted after the high-severity advisory `GHSA-36hm-qxxp-pg3m` was detected.

The latest fully measured application bundle remains inside the immutable ceilings:

- raw distribution: **769,808**
- initial JS: **390,947 / 670,000**
- total JS: **583,513 / 760,000**
- lazy JS: **192,566**
- largest lazy chunk: **53,363 / 140,000**
- CSS: **179,997 / 180,000**
- gzip JS+CSS: **188,804**

The `/ENJAZ/live/` build also passed the fixed ceilings with total JS **583,535 / 760,000**, initial JS **390,969 / 670,000**, CSS **179,997 / 180,000**. No budget was raised.

Before the Real-Cloud evidence work, the clean `10.29.8` candidate passed all normal gates: Document Vault authority/contract tests, **10/10** Vault tests, **218/218** functional regression, TypeScript, fixed production and Pages budgets, the dedicated Document Vault Chromium suite at **1280 / 430 / 390 / 360 / 320**, dependency high-severity audit, the full R2 cumulative browser matrix, and the Project Quality Constitution.

The dedicated browser guard previously found and repaired two real UI defects without weakening its rules: the awaited upload form used an unstable event target, and native company/transaction selects were only about 23 px high. The final controls are governed at 44 px and CSS remains under the fixed ceiling.

## Production database and authority boundary

Production migrations include the Phase 10.1 authority migration, FK index hardening, rollback-contained destructive probes/cleanup, Auth-setting evidence probes, and `phase_10_1_ack_replay_hardening`.

The deployed database currently enforces:

- `documents` as current authoritative metadata/current binary pointer;
- `document_versions` as acknowledged version history;
- `document_upload_sessions` as temporary transfer state only;
- no direct authenticated INSERT/UPDATE/DELETE authority on `documents` or `document_versions`;
- guarded workspace membership for prepare/list/detail/download/archive;
- service-only acknowledgement/failure promotion;
- generated workspace/document/version/operation Storage paths;
- no overwrite-in-place contract;
- no destructive document delete contract.

The rollback-contained production DB probe certified direct mutation denial, invalid MIME/size rejection, idempotent prepare, path generation, no version before acknowledgement, outsider denial, exactly-one v1 acknowledgement, duplicate-safe service acknowledgement, failed-upload containment, immutable v2 creation preserving v1, version-specific download claims, two-version detail history, archive preservation and cleanup.

All Phase 10.1 foreign-key relationships introduced/touched by the vault have covering indexes. Remaining unindexed-FK advisor findings belong to earlier systems.

## Acknowledgement replay hardening

A real boundary defect was found before final Storage certification: `acknowledge_document_upload_v1` itself was duplicate-safe, but the Edge broker could not reach that duplicate-safe branch after the first successful acknowledgement because `get_document_upload_claim_v1` exposed only `prepared` sessions.

`phase_10_1_ack_replay_hardening` fixes that without broadening authority:

- only the authenticated uploader can recover its claim;
- only `prepared` and `acknowledged` states are recoverable;
- prepared claims remain `binaryAuthoritative=false`;
- acknowledged claims return `binaryAuthoritative=true`;
- failed/cancelled sessions remain non-replayable;
- the Edge broker routes an acknowledged replay through `ack_replay_rpc` directly to the duplicate-safe service acknowledgement using the stored path/size/MIME.

The migration is applied in production, and `enjaz-document-vault` is deployed **ACTIVE v2**, `verify_jwt=true`, bundle SHA-256 `cb17bbda466e73117558e578e07aa3a52814d43565c0c449c95a67f02338d774`.

## Real production Storage E2E — first authenticated run

A disposable production certifier was executed through a short-lived GitHub OIDC route. No real user account was used. The run created temporary confirmed Auth users via the official Auth Admin API, obtained real user JWTs, exercised the deployed `enjaz-document-vault` Edge Function and Supabase Storage API, and cleaned its fixtures afterward.

GitHub workflow run: **`34743779280`**.

The production run passed all of the following before its single harness assertion failure:

- disposable confirmed Auth users and isolated workspaces;
- direct document INSERT denied;
- invalid MIME rejected with no authority residue;
- >50 MiB input rejected with no authority residue;
- path-bearing filename rejected with no authority residue;
- outsider/cross-workspace prepare rejected with no authority residue;
- real v1 signed upload capability returned;
- prepare replay was idempotent and produced only one document;
- acknowledgement before object upload returned `STORAGE_OBJECT_NOT_FOUND` and preserved `prepared` state;
- real signed v1 upload succeeded through Storage with `upsert:false`;
- v1 acknowledgement succeeded;
- **Edge acknowledgement replay succeeded as duplicate-safe**, proving the replay hardening in the real transport path;
- exactly one v1 version existed;
- direct document UPDATE and DELETE were denied;
- signed v1 download returned byte-exact content;
- real v2 prepare/upload/acknowledgement succeeded;
- v1 and v2 history were both preserved at distinct immutable paths;
- signed v1 and v2 downloads were byte-exact;
- a deliberately wrong-size v3 object was rejected with `STORAGE_SIZE_MISMATCH`;
- the bad object was removed;
- the upload session became failed;
- no v3 version was promoted;
- the ready document pointer remained on valid v2;
- archive RPC succeeded;
- the archived document disappeared from the normal vault list.

### The single first-run failure was a certifier parser defect, not a product defect

The run then failed on `archive_retained_in_archive_vault`. Investigation showed the production RPC and application contract were correct: `get_document_vault_v1` returns the array under **`documents`**, and `parseVaultList` reads `x.documents`.

The disposable certifier mistakenly read `normalList.items` / `archiveList.items`. Therefore it could not see any returned document after archive even though the production RPC response contract was correct. This was a test-harness bug, not evidence that archive filtering failed.

The permanent Real-Cloud script has now been corrected to read:

- `normalList.documents`
- `archiveList.documents`

The one-time OIDC workflow and its one-time self-repair workflow were physically removed from the governed branch after the correction.

## Cleanup and current production residue

Cleanup from the first real Storage run succeeded for:

- **3 Storage objects**;
- **2 temporary workspaces**;
- **2 temporary Auth users**.

An independent production query after cleanup reports:

- Phase 10.1 test-marked Auth users: **0**;
- Phase 10.1 test documents: **0**;
- Phase 10.1 test upload sessions: **0**.

The temporary certification endpoints were not left privileged. Because the available connector cannot delete Edge Function names, both temporary function slugs were overwritten with inert tombstones that return HTTP 410 and have `verify_jwt=true`:

- `enjaz-phase10-1-real-cloud-certifier` — tombstone **v4**;
- `enjaz-phase10-1-oidc-gateway` — tombstone **v2**.

They are not part of the application runtime and contain no active certification/bootstrap behavior.

## Production bucket state after the real run

The authenticated prepare path created the intended bucket through the Storage API. A current production read confirms:

- bucket: `enjaz-documents-private`;
- public: **false**;
- file size limit: **52,428,800 bytes (50 MiB)**;
- allowed MIME types: PDF, JPEG, PNG, WebP, DOCX and XLSX only.

The bucket remains as product infrastructure; only test objects were removed.

## Auth safety decisions

Production email Auth is enabled, but `mailer_autoconfirm=false`; anonymous and phone Auth are disabled. The real account in production was never reset or used for certification. No Auth setting was weakened to make tests pass.

The permanent Real-Cloud certifier is a manual workflow only. It requires a server-side GitHub Secret named `ENJAZ_SUPABASE_SECRET_KEY`; the privileged key is never stored in the repository, browser bundle or evidence artifact. The script creates disposable confirmed users via Auth Admin, signs them in normally to obtain user JWTs, performs the real Storage sequence, and removes users/workspaces/objects in `finally` cleanup.

## Remaining closure boundary

The actual Storage transport is now substantially proven in production, including real v1/v2 binary upload, exact download, replay-safe acknowledgement and mismatch cleanup. The sole first-run failure was the now-corrected `items` versus `documents` harness parser.

Before Phase 10.1 may close, the corrected permanent Real-Cloud certifier must complete **one clean full run** so the post-archive assertions and bucket assertions are part of the same green evidence artifact. After that, the branch must pass its normal Document Vault Gate, dedicated Document Vault browser gate, general Real Browser Acceptance and Quality Constitution on the final candidate, then merge and pass post-merge Pages/live checks.

Until those conditions are met, **Phase 10.1 remains IN PROGRESS and Phase 10.2 remains LOCKED**.
