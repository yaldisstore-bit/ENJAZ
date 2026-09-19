# Phase 13.3 — A3 Authenticated Atomic Import — Real Cloud Evidence

**Slice:** A3 server execution boundary — CERTIFIED at exact branch head `a442a41ec6c6e4eb5166c54ee847d276347c349a`  
**Whole Phase 13.3:** IN_PROGRESS; formal PR/exact-main/deployed-live closure pending.  
**Phase 13.4:** LOCKED.

## Source + live certificate

- Source Gate #23 / `35408155601`: PASS.
- Authenticated Real Cloud run #5 / `35408155675`: SUCCESS, same exact head.
- Real Cloud evidence artifact ID: `10573202713`.
- Uploaded artifact SHA-256: `fa2de4a25d8e4f50cbde383dd84e8cecd5e6fa89e5dc22cf7e29c84f3992888b`.
- DB-source static tests: **14/14 PASS**.
- Real Cloud assertions: **23/23 PASS**.
- Four Phase 13.3 migrations verified applied in project `juzxriirhkuzviwnhkbd`: `20260918234220`, `20260918234522`, `20260918235343`, `20260919000205`.
- Public `execute_legacy_ordered_import_v1` is SECURITY INVOKER; private implementation is SECURITY DEFINER, explicitly granted to authenticated, with `auth.uid()` and workspace-owner check inside its body. Anonymous execute is denied.

## Verified behavior

- Fresh isolated owner and outsider workspaces; anonymous and cross-workspace calls denied with zero mutation.
- Deterministic `contacts → companies → transactions` atomic insertion: one of each with exact source lineage and correct company/contact FK relationships.
- Durable `import_jobs` ledger and exact replay: existing result, no duplicated business rows or job.
- Changed-payload replay conflicts with SQLSTATE `23505`, creating no new records; existing target/source collisions fail closed.
- Deliberate late company numeric overflow after inserting a contact aborts the entire RPC; **0 partial contacts, companies or jobs**.
- Test-workspace/auth cleanup is an explicit passing condition of the authenticated Real Cloud job; the run completed successfully.

## Narrow authority only

The authenticated, owner-checked, explicit-manifest database RPC is certified to write in Phase 13.3. This does not authorize unreviewed legacy data, mass automatic migration, browser secret keys, generic cross-domain writes, source-data guessing, or any 13.4 reconciliation claim.

Only `contacts`, `companies`, and `transactions` are currently supported. Caller-supplied target UUIDs and explicitly reviewed mapping/relationships are mandatory; unknown or unresolved concepts remain quarantined.

**Closure boundary:** A3 certified does not by itself close Phase 13.3. Formal PR-head regression + exact-main post-merge + published-live certification remain pending.
