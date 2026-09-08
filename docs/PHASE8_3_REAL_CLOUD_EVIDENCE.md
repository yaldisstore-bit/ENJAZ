# Phase 8.3 — Authenticated Real Cloud Evidence

Status: **PASS**

## Target

- Supabase project ref: `juzxriirhkuzviwnhkbd`
- Project: `ENJAZ`
- Project status at verification: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6`
- Verification scope: authenticated Phase 8.3 Operations Center + Field Operations authority, offline identity, security boundaries, and cleanup behavior.

## Applied Phase 8.3 cloud anchors

The production migration history records all Phase 8.3 cloud anchors:

- `phase_8_3_operations_field_m5`
- `phase_8_3_offline_visit_identity_hardening`
- `phase_8_3_live_authenticated_field_probe`
- `phase_8_3_fk_index_hardening`

## Verified authenticated behavior

The real-cloud probe used an existing real workspace member and executed the public application RPC boundary under the `authenticated` PostgreSQL role. It established all of the following:

1. direct `INSERT` / `UPDATE` / `DELETE` privileges on `field_assignments`, `field_visits`, `field_visit_evidence`, and `field_sync_receipts` remained denied to `authenticated`;
2. canonical field authority remained `field_assignments_visits_evidence_receipts`, with transaction write authority `none` and finance write authority `none`;
3. workspace location evidence policy could be changed through the approved RPC and round-tripped through canonical context;
4. assignment creation succeeded through the public RPC while a stale expected version failed closed with `ENJAZ_FIELD_ASSIGNMENT_STALE`;
5. the check-in client operation UUID became the canonical visit UUID, preserving an addressable identity before first offline synchronization;
6. check-in replay with the same payload was idempotent and created exactly one visit;
7. replaying the same operation UUID with payload drift failed closed with `ENJAZ_FIELD_IDEMPOTENCY_CONFLICT`;
8. field evidence creation and replay were idempotent and produced exactly one evidence row;
9. checkout recorded the official fee as **field evidence only** and created **zero** rows in `payments` for the probe transaction;
10. checkout replay was idempotent;
11. field-to-office handoff completed through the canonical RPC and replay remained idempotent;
12. final canonical context reflected the completed visit, one evidence item, and visit-scoped check-in/check-out location evidence;
13. all probe companies, transactions, assignments, visits, evidence, receipts, audit artifacts, and private helper functions were removed;
14. the workspace `field_operations_policy` and its previous `updated_at` value were restored after verification.

## Security boundary verification

Post-deployment inspection independently confirmed:

- RLS enabled on **4/4** Phase 8.3 authoritative field tables;
- `authenticated` has SELECT access required by the product but no direct mutation grants on those tables;
- all eight public Phase 8.3 RPCs are `SECURITY INVOKER` wrappers;
- `authenticated` can execute the approved public RPCs;
- `anon` cannot execute those RPCs;
- no Phase 8.3 public RPC gained finance write authority.

## Supabase Advisors

Security Advisor after Phase 8.3 deployment reported no warning introduced by the Phase 8.3 field tables or RPC boundary. Remaining security warnings are pre-existing project findings concerning four Phase 8.1 workflow/government `SECURITY DEFINER` RPCs and the project-level leaked-password-protection setting; they are not introduced by Phase 8.3.

Performance Advisor initially identified Phase 8.3 foreign keys without covering indexes. `phase_8_3_fk_index_hardening` was then deployed. A second advisor run reduced `unindexed_foreign_keys` from 18 to 8, and **all remaining findings belong to pre-existing Phase 8.1/government-workflow tables; no Phase 8.3 foreign-key finding remains**. Newly created Phase 8.3 indexes may naturally appear as unused immediately after deployment and are not treated as defects at creation time.

Supabase remediation references surfaced by the advisor:

- authenticated `SECURITY DEFINER` lint: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- unindexed foreign keys: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Evidence interpretation

This document records a real authenticated production-database verification of Phase 8.3 before merge. The probe is destructive only to uniquely identified probe data and verifies cleanup before commit. It does **not** by itself close Phase 8.3. Formal closure still requires a green exact PR head, merge to `main`, and exact-merge-SHA post-merge recertification.

M5 overall remains governed by its separate Phase 8.7 individual Zero-Escape closure gate.
