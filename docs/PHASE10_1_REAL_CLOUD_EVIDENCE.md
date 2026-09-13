# Phase 10.1 — Real Cloud Evidence

Status: **IN PROGRESS**  
Phase 10.2+: **LOCKED**

This file records only evidence that actually ran against the production Supabase project `juzxriirhkuzviwnhkbd` or the governed Phase 10.1 branch. Phase 10.1 is intentionally not marked closed until the corrected permanent Real-Cloud certifier completes one clean pass from start to finish, the PR is merged, and post-merge deployed-live recertification passes.

## Governed runtime candidate

The client/runtime line is permanently on exact `preact@10.29.8`. The earlier `10.27.2` pin was upgraded rather than allowlisted after the high-severity advisory `GHSA-36hm-qxxp-pg3m` was detected.

The fully measured application bundle remains inside the immutable ceilings:

- raw distribution: **769,808**
- initial JS: **390,947 / 670,000**
- total JS: **583,513 / 760,000**
- lazy JS: **192,566**
- largest lazy chunk: **53,363 / 140,000**
- CSS: **179,997 / 180,000**
- gzip JS+CSS: **188,804**

The `/ENJAZ/live/` build also passed the fixed ceilings with total JS **583,535 / 760,000**, initial JS **390,969 / 670,000**, CSS **179,997 / 180,000**. No budget was raised.

Two real UI defects were found by the dedicated browser guard and repaired without weakening any rule: the awaited upload form used an unstable event target, and native company/transaction selects were only about 23 px high. The final controls are governed at 44 px and CSS remains below the fixed ceiling.

## Final clean branch certification before evidence refresh

The clean governed runtime head `8df0625d3c2d86d59e257251928ce1eecb27b6bf` passed every normal code/browser gate:

- **Document Vault Gate `34744538738` — SUCCESS**: authority audit **100 checks**, Vault tests **10/10**, functional regression **218/218**, database/roadmap/major-system integrity, secret audit, TypeScript, production build budget, `/live/` build budget, and the explicit Phase 10.2 lock check all passed.
- **Document Vault Real Browser `34744538727` — SUCCESS**: the real UI flow passed upload, v2, version download, archive and pagination at **1280 / 430 / 390 / 360 / 320**, followed by a successful high-severity dependency audit.
- **Real Browser Acceptance `34744538753` — SUCCESS**: Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, Destruction wave 1, Destruction wave 2, Production Bridge, and Phase 9.1 / 9.2 / 9.3 / 9.4 all passed.
- **Project Quality Constitution `34744538723` — SUCCESS**.

The subsequent documentation-only state/evidence refresh does not authorize Phase 10.2 and must itself retain the same normal green gates before merge readiness is considered.

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

The rollback-contained production DB probe certified direct mutation denial, invalid MIME/size rejection, idempotent prepare, path generation, no version before acknowledgement, outsider denial, exactly-one v1 acknowledgement, duplicate-safe service acknowledgement, failed-upload containment, immutable v2 creation preserving v1, version-specific download claims, two-version detail history, archive preservation, inclusive/exclusive archive-list semantics and cleanup.

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

## Real production Storage E2E — authenticated run

A disposable production certifier was executed through a short-lived GitHub OIDC route. No real user account was used. It created temporary confirmed Auth users via the official Auth Admin API, obtained real user JWTs, exercised the deployed `enjaz-document-vault` Edge Function and Supabase Storage API, and cleaned its fixtures afterward.

GitHub workflow run: **`34743779280`**.

The sanitized artifact records **43 successful real-cloud checks** before one harness assertion failure. Proven checks include:

- disposable confirmed Auth users and isolated workspaces;
- direct document INSERT/UPDATE/DELETE denial;
- invalid MIME, >50 MiB and path-bearing filename rejection with no authority residue;
- outsider/cross-workspace prepare rejection;
- real v1 signed upload capability and idempotent prepare;
- acknowledgement before object upload rejected with `STORAGE_OBJECT_NOT_FOUND` while preserving prepared state;
- real signed v1 upload through Storage with `upsert:false`;
- v1 acknowledgement and **duplicate-safe Edge acknowledgement replay**;
- exactly one v1 version;
- byte-exact signed v1 download;
- real v2 prepare/upload/acknowledgement;
- immutable v1/v2 history at distinct paths;
- byte-exact signed v1 and v2 version downloads;
- wrong-size v3 rejection with `STORAGE_SIZE_MISMATCH`;
- mismatched object removal, failed session, no v3 promotion and valid v2 pointer preservation;
- guarded archive RPC;
- archived document excluded from the normal vault list.

### The single first-run failure was a certifier parser defect, not a product defect

The run failed at `archive_retained_in_archive_vault` because the disposable certifier read `normalList.items` / `archiveList.items`. The production RPC and application contract both use the authoritative **`documents`** key. The permanent script is corrected to read:

- `normalList.documents`
- `archiveList.documents`

The production rollback-contained DB probe independently proves the post-archive semantics that the old parser failed to inspect: `includeArchived=false` returns zero active rows, `includeArchived=true` returns the archived document, and both v1/v2 version rows remain after archive.

The permanent certifier additionally checks that v1/v2 Storage binaries remain present after archive, that the bucket is private, and that its size/MIME restrictions remain intact. Those final assertions still require one clean end-to-end permanent-certifier artifact before formal closure.

## Cleanup and current production residue

Cleanup from the authenticated Storage run succeeded for:

- **3 Storage objects**;
- **2 temporary workspaces**;
- **2 temporary Auth users**.

Independent production verification after cleanup reports:

- Phase 10.1 test-marked Auth users: **0**;
- Phase 10.1 test documents: **0**;
- Phase 10.1 test upload sessions: **0**;
- candidate test Storage objects: **0**.

The temporary certification endpoints were not left privileged. Because the available connector cannot delete Edge Function slugs, both were overwritten with inert HTTP 410 tombstones with `verify_jwt=true`:

- `enjaz-phase10-1-real-cloud-certifier` — tombstone **v5**;
- `enjaz-phase10-1-oidc-gateway` — tombstone **v2**.

They are not application runtime endpoints and contain no active certification/bootstrap behavior.

## Production bucket state

The authenticated prepare path created the intended bucket through the Storage API. Current production verification confirms:

- bucket: `enjaz-documents-private`;
- public: **false**;
- file size limit: **52,428,800 bytes (50 MiB)**;
- allowed MIME types: PDF, JPEG, PNG, WebP, DOCX and XLSX only.

The bucket remains product infrastructure; only disposable test objects were removed.

## Credential boundary for the clean rerun

The permanent workflow `.github/workflows/phase10-1-real-cloud-e2e.yml` is **manual only** and reads its privileged credential exclusively from the GitHub Actions Secret `ENJAZ_SUPABASE_SECRET_KEY`. No privileged Supabase secret is stored in the repository, browser bundle, workflow source or evidence artifact.

A one-time presence probe, GitHub run **`34744505666`**, stopped at its preflight before npm installation, product code, or any production request because `ENJAZ_SUPABASE_SECRET_KEY` is not installed in GitHub Actions. This is a credential-infrastructure blocker, not a product-test failure. The one-time probe workflow was immediately removed afterward.

The current ChatGPT GitHub connection can update repository code and workflows but does not expose GitHub Actions Secret administration. The Supabase connector likewise does not expose server secret values for transfer into GitHub. The closure rule is therefore not weakened to work around this tooling boundary.

## Pull request boundary

Draft PR **#151 — `Phase 10.1 — Document Vault production candidate`** targets `main` and is intentionally merge-blocked. The PR contains no one-time OIDC/probe workflow and no embedded `sb_secret_...` value. It must remain Draft until the permanent Real-Cloud workflow produces one clean green artifact.

## Remaining closure boundary

The actual Storage transport is already proven extensively in production, including real v1/v2 binary upload, byte-exact version download, replay-safe acknowledgement, mismatch cleanup and guarded archive. The only real-cloud run failure was the corrected `items` versus `documents` harness parser.

Formal Phase 10.1 closure still requires, in order:

1. install the server-only GitHub Actions Secret `ENJAZ_SUPABASE_SECRET_KEY` without exposing it to source or browser code;
2. run the corrected permanent Real-Cloud certifier to a **single clean full green artifact**;
3. retain all normal Document Vault, dedicated browser, full browser and Quality Constitution gates on the final candidate;
4. make PR #151 merge-ready and merge to `main`;
5. pass post-merge Pages and deployed-live recertification.

Until every item above passes, **Phase 10.1 remains IN PROGRESS, `exitGatePassed=false`, and Phase 10.2 remains LOCKED**.
