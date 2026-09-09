# ENJAZ Phase 8.7 — Real Cloud Zero-Escape Evidence

Status: **PASS — ZERO RESIDUE**

Phase: **8.7 — Operations Zero-Escape Destruction Gate**
Implementation branch: `phase8-7-operations-zero-escape`
Supabase project: `ENJAZ`
Project ref: `juzxriirhkuzviwnhkbd`
Project health at verification: **ACTIVE_HEALTHY**
PostgreSQL: **17.6.1**

## M17 — concurrent intake abuse escape repaired and destroyed

The Phase 8.4 public-intake limiter originally performed count → insert without serializing competing requests for the same secure link. Phase 8.7 repaired this without adding a table, public RPC, or new write authority:

- `20260909094008 phase_8_7_intake_rate_limit_serialization`

`private.enforce_public_intake_rate_v1(uuid,text)` now locks the parent `intake_links` row with `FOR UPDATE` before count + decision + insert. Existing limits remain **120/hour** and **4 save/submit events per 30 seconds**. Live verification proved `SECURITY DEFINER`, empty `search_path`, anon/authenticated direct EXECUTE both false, and the serialization lock present.

Real concurrency used one temporary form/link and five `save_public_intake_v1` requests queued in one transaction through the already-installed `pg_net 0.20.4`:

- `20260909094235 phase_8_7_live_m17_concurrency_probe_fixture`
- `20260909094403 phase_8_7_live_m17_concurrency_dispatch` — legacy-key transport attempt: 5×401, zero write events/submissions; not counted as the concurrency result.
- `20260909094439 phase_8_7_live_m17_concurrency_dispatch_publishable`
- `20260909094526 phase_8_7_live_m17_concurrency_probe_cleanup`

The valid simultaneous batch produced exactly **4 × HTTP 200** and **1 × HTTP 500 / SQLSTATE 54000 / `ENJAZ_INTAKE_RATE_LIMITED`**, with zero timeouts. All four successes referenced one submission identity with versions 1→4. Pre-cleanup census: **4 save_draft events, 0 submit events, 1 submission, version 4, status draft**. Final M17 fixture census: links/forms/fields/submissions/events = **0/0/0/0/0**.

**M17 concurrent abuse destruction: PASS — ZERO RESIDUE.**

## M1 — workflow replay / stale / idempotency conflict

Production accepted:

- `20260909095155 phase_8_7_live_m1_zero_escape_probe_v3`

A fully isolated temporary company + transaction + two-stage workflow fixture was exercised under a real authenticated workspace member. The probe proved:

- first allowed transition succeeds;
- exact replay with the same idempotency key does not create a second transition event;
- stale stage is rejected as `ENJAZ_WORKFLOW_STALE_STAGE`;
- reuse of the same idempotency key with a different payload is rejected as `ENJAZ_WORKFLOW_TRANSITION_IDEMPOTENCY_CONFLICT`;
- resulting stage is exactly 2 with exactly one transition event;
- transaction status remains `active` and `current_fee` remains exactly `1.00`;
- cleanup leaves no probe company, transaction, workflow instance, transition event or template.

**M1 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**

## M5 — field offline identity / replay / stale isolation

Production accepted:

- `20260909095410 phase_8_7_live_m5_offline_zero_escape_probe_v2`

The authenticated field probe proved:

- authenticated direct INSERT/UPDATE authority on field authority tables remains denied;
- stale assignment mutation is rejected as `ENJAZ_FIELD_ASSIGNMENT_STALE`;
- the offline `client_operation_id` becomes the canonical visit ID;
- exact check-in replay returns the same visit as duplicate rather than creating another visit;
- same operation ID with payload drift is rejected as `ENJAZ_FIELD_IDEMPOTENCY_CONFLICT`;
- exactly one visit exists after replay pressure;
- the field path creates zero payment rows;
- probe receipts/visit/assignment/transaction/company and helper functions are removed.

**M5 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**

## M6 — guarded CRM conversion replay / finance isolation

Production accepted:

- `20260909095550 phase_8_7_live_m6_conversion_zero_escape_probe_v2`

A real authenticated CRM flow created an isolated service → lead → qualified lead → service request → accepted quotation → guarded conversion. The probe proved:

- direct CRM authority-table mutation remains denied;
- context still declares company/transaction writes as `guarded_conversion_rpc_only` and finance ledger authority `none`;
- the accepted quotation binds authoritative `currentFee=118750`;
- first conversion is non-duplicate;
- second conversion returns `wasDuplicate=true` and the same company/transaction identity;
- exactly one conversion audit and one transaction exist after replay;
- conversion writes zero payment rows;
- all probe CRM/Core records are removed.

**M6 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**

## M15 — branch/team permissions / stale ownership / sibling isolation

Production accepted:

- `20260909095745 phase_8_7_live_m15_permission_zero_escape_probe`

The probe created a temporary Auth identity with its own isolated workspace, then added that identity only as organization workforce to the real owner's workspace. It proved:

- workforce does not acquire a legacy `workspace_memberships` row in the owner's workspace;
- direct organization mutation remains denied;
- branch-A manager access inherits downward to its department/team;
- sibling branch B remains invisible;
- team access explanation retains the exact source membership, source scope `branch`, and role `manager`;
- owner-governed structure mutation by workforce is denied;
- stale ownership version is rejected as `ENJAZ_ORG_OWNERSHIP_STALE`;
- transfer into unmanaged sibling branch is rejected;
- transfer into managed descendant team succeeds and advances ownership version to 2;
- cross-workspace organization context fails closed;
- transaction `updated_at`, status, priority and `current_fee=100.00` remain unchanged;
- payment and financial-ledger rows remain zero;
- ownership history contains exactly assigned + transferred events;
- temporary Auth user/workspace/company/transaction/organization rows/helpers are completely removed.

**M15 Phase-8 Zero-Escape cloud destruction: PASS — ZERO RESIDUE.**

## Automation failure isolation — required Phase 8.7 dimension

Production accepted:

- `20260909095841 phase_8_7_live_automation_failure_isolation_probe`

The authenticated automation probe proved:

- direct automation-table mutation remains denied;
- stale rule mutation is rejected as `ENJAZ_AUTOMATION_RULE_STALE`;
- exact dispatch replay returns the same run and creates exactly one follow-up side effect;
- sensitive workflow action remains `awaiting_approval` instead of executing directly;
- explicit human rejection changes the run to `skipped`;
- rejection replay is idempotent;
- authority remains `automation_rules_and_runs`, workflow write authority remains `existing_workflow_rpc_only_after_human_approval`, finance write authority remains `none`;
- all probe automation/follow-up/company/transaction records and helpers are removed.

**Automation failure-isolation Real Cloud destruction: PASS — ZERO RESIDUE.**

## Unified zero-residue census

After all successful Phase 8.7 cloud probes, a unified production census returned **0** for every tracked residue category:

- probe companies;
- probe transactions;
- workflow instances;
- workflow templates;
- field assignments tied to probe work;
- Phase-8.7 CRM leads;
- temporary M15 Auth users;
- organization branches;
- organization departments;
- organization teams;
- `private.enjaz_phase87_%` probe helper functions.

The earlier M17-specific final census also returned zero links/forms/fields/submissions/events. No temporary extension remains; the pre-existing `pg_net` extension was reused without modification.

## Advisor review

The Phase 8.7 M17 repair grants no new direct execution authority. Security advisor findings remain on pre-existing intentionally exposed public/authenticated RPC surfaces and Auth configuration; the new private limiter helper is not anon/authenticated executable. Performance advisor findings are unrelated existing index advisories; Phase 8.7 introduced no new table or foreign key.

## Real Cloud gate result

**Phase 8.7 Real Cloud Verification: PASS — ZERO RESIDUE.**

M1, M5, M6, M17, the Phase-8 portion of M15, and automation failure isolation have current-production destructive cloud evidence. Phase 8.7 itself remains `IN_PROGRESS`: Real Browser, deployed-live verification, exact-PR gate matrix, merge and exact-main post-merge recertification are still required before Phase 9.1 may be authorized.
