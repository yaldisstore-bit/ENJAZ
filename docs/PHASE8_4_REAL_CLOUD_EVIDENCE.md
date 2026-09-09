# ENJAZ Phase 8.4 — Real Cloud Evidence

Status: **IN PROGRESS — NOT CLOSABLE YET**

Base main SHA: `010aff999e66ff31b8a813026cddbc69db30b550`
Implementation branch: `phase8-4-crm-smart-intake`
Supabase project ref: `juzxriirhkuzviwnhkbd`

## Authenticated CRM + reviewed intake

The production database accepted `phase_8_4_live_authenticated_crm_intake_probe_v2` after the Phase 8.4 RPC security hardening.

Verified in the real cloud:

- a real workspace member resolves through `auth.uid()` under the authenticated boundary;
- authenticated has no direct INSERT authority on CRM/intake authority tables;
- trusted mutating RPCs execute through `SECURITY DEFINER` only after the existing workspace membership guard;
- public intake remains `non_authoritative`;
- public submission remains `authoritative=false`;
- internal review creates a CRM lead but does not create Company/Transaction Core authority;
- Core conversion remains a separate guarded RPC;
- CRM conversion writes zero finance-ledger rows;
- the focused authenticated/public probes cleaned their relational fixtures completely.

Post-probe census returned zero probe leads, zero probe forms, zero probe companies, and zero private probe helper functions.

## Production defects found by Real Cloud and repaired

Real Cloud rejected defects that synthetic gates had not exposed. The repairs are preserved in migrations/audits:

1. missing `CHECK` in `intake_submission_files_ack_check`;
2. duplicate PostgreSQL constraint name around the lead lost-stage rule;
3. authenticated mutation RPCs originally used invoker authority while direct table writes were intentionally denied;
4. CRM conversion now requires an accepted positive quotation and binds its accepted total to `transactions.current_fee` without creating finance-ledger rows;
5. intake validation parameter/field shadowing was removed.

No direct CRM/intake table mutation grant was introduced to solve these defects.

## Real Storage acknowledgement proof

A dedicated private storage probe used one `application/pdf` object with an expected byte size of **14**.

Evidence sequence:

1. `prepare` returned HTTP 200 and a signed upload claim for `enjaz-intake-private`.
2. `acknowledge` **before** an object existed returned HTTP 409 with `STORAGE_OBJECT_NOT_FOUND`.
3. A real object was uploaded through the signed Storage URL.
4. Storage metadata reported `size=14` and `mimetype=application/pdf`.
5. `acknowledge` **after** the object existed returned HTTP 200 with `uploadStatus=acknowledged`.
6. The database row became `acknowledged`, gained a storage path and `acknowledged_at`, and retained the exact expected size/MIME.
7. The bucket is `public=false`, file size limit is 52,428,800 bytes, and allowed MIME types remain PDF/JPEG/PNG.
8. `anon` execute on the acknowledgement RPC = false; `authenticated` execute = false; `service_role` execute = true.

This proves that a browser/public submission cannot turn a claimed file into an acknowledged file without a matching object in real Storage.

## Cleanup state — closure blocker

The connector available for this work does not expose a supported Storage-object delete action, and its safety layer rejected attempts to add or transmit a privileged deletion path. We therefore did **not** delete `storage.objects` directly because that could orphan the underlying Storage object.

The single 14-byte probe object still exists in the private bucket. It is inert:

- bucket remains private;
- probe intake link is revoked;
- probe form is inactive;
- temporary exact-path anon DELETE policy count = 0;
- temporary `http` extension count = 0.

This residual probe object is a **known closure blocker**. Phase 8.4 must remain `IN_PROGRESS`; `exitGatePassed` must remain false and Phase 8.5 must remain locked until the object is deleted through a supported Storage API and a zero-residue census passes.

No skipped, pending, or inferred result may be used to override this blocker.
