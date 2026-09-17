# Phase 11.6-B — Intake Follow-up & Client Information Loop — Formal Slice Closure

**Status:** CLOSED / CERTIFIED (closure candidate until PR #191 merges)  
**Closure date:** 2026-09-18  
**Predecessor slice:** 11.6-A — CLOSED / exact-main recertified  
**Authorized successor slice:** 11.6-C — Contract approval, retainer renewal & communication evidence  
**Phase 11.7:** LOCKED

## Closure statement

Phase 11.6-B is formally eligible to close after the governed intake follow-up bridge, secure public capability, Client Portal delegation/reconciliation boundary, Real Cloud SQL destruction probe, authenticated API certificate, advisor hardening and zero-residue cleanup all passed without creating a second intake authority.

`public.intake_submissions` remains canonical M17 submission/review truth. `private.intake_followup_requests` remains bridge evidence only. Secure-link follow-up is information-only, writes only scoped answers back to the same canonical submission after stale/version validation, and never performs final intake approval. Document follow-up remains delegated to Client Portal authority. Portal reconciliation requires a fulfilled M3 request plus actual client evidence.

Closing this slice authorizes only 11.6-C. It does not close Phase 11.6, M17, or M16 globally, and it does not authorize Phase 11.7.

## Certified database lineage

Applied to the real ENJAZ Supabase project `juzxriirhkuzviwnhkbd`:

- `20260917222114` — `phase_11_6_intake_followup_bridge` — **PASS**.
- `20260917222123` — `phase_11_6_intake_followup_public_capability` — **PASS**.
- `20260917222446` — `phase_11_6_intake_followup_advisor_hardening` — **PASS**.
- `20260917222519` — `phase_11_6_live_intake_followup_probe` — **PASS**.

The first B1 attempt exposed a PostgreSQL auto-generated CHECK-constraint name collision. The failed migration rolled back completely; zero B1 tables/functions remained. The constraint was renamed, a destruction regression test was added, and the corrected B1 migration then applied successfully.

## Authenticated Real Cloud API certificate

Real Cloud workflow:

- workflow: **ENJAZ Phase 11.6-B — Real Cloud Intake Follow-up Certificate**.
- run: **#1 / 35282048301**.
- certified source SHA: `f7a0551e0db98316ed168291e070ab333cb1568b`.
- result: **PASS — 32 product checks**.
- artifact: **10522619346**.
- artifact digest: `sha256:bed199614124e82ddaed6448dd2d05f866f07557ceabe29633f04395d5f21f62`.

The authenticated certificate proved:

- fresh confirmed Auth users and isolated workspace bootstrap;
- secure follow-up issuance and 64-hex capability shape;
- idempotent issuance replay;
- one-open-follow-up fail-closed enforcement;
- anonymous direct canonical-submission read denial;
- non-authoritative public capability read contract;
- draft write without canonical answer mutation;
- final scoped answer merge into the same submission;
- idempotent final replay;
- explicit revocation and revoked-capability denial;
- cross-workspace staff denial;
- Client Portal request delegation without a public token;
- intake-lead → transaction binding enforcement;
- real client Portal message evidence;
- fulfilled Portal request evidence;
- governed Portal reconciliation into the same canonical submission;
- staff direct intake-submission write denial;
- client direct Portal-message insert denial;
- audit evidence for requested/responded/portal-reconciled/revoked/client-message events;
- cleanup and zero residue.

## SQL destruction / recovery proof

The Real Cloud SQL probe additionally certified:

- authenticated and anonymous role paths;
- private evidence direct-write denial;
- cross-workspace rejection;
- HMAC capability storage as hash only;
- idempotency conflict behavior;
- one-open rule;
- expiry denial;
- revocation denial;
- Portal reconciliation denial before real client evidence;
- document follow-up delegation to M3;
- Portal revocation propagation;
- audit completeness;
- independent cleanup checks.

External post-probe verification returned:

- test workspaces: **0**;
- follow-up evidence rows for probe workspaces: **0**;
- Portal requests for probe workspaces: **0**;
- intake submissions for probe workspaces: **0**;
- audit rows for probe workspaces: **0**;
- HMAC secret singleton rows: **1**.

## Advisor certificate

Before B migrations:

- security findings: **66**;
- performance findings: **81**;
- unindexed foreign keys: **28**.

After B3 + Real Cloud probe:

- security findings: **66** — **zero B-caused security delta**;
- unindexed foreign keys: **28** — **zero B-caused FK delta**;
- B-related performance findings: **0**.

B2 initially made the two public capability RPCs `SECURITY DEFINER`, which produced four new Supabase linter warnings. B3 moved privileged authority into two narrowly granted `private` capability functions and restored the public PostgREST façades to `SECURITY INVOKER`. Anonymous EXECUTE on private functions is limited to exactly those two capability functions.

Supabase linter references retained for baseline/future hardening:
- RLS enabled without policy: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- anon SECURITY DEFINER executable: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- authenticated SECURITY DEFINER executable: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- unindexed foreign keys: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- unused indexes: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
- duplicate indexes: https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index

## Source / CI evidence

Pre-closure Phase 11.6 gate:

- run **#30 / 35282672323** on `69fa5a0820442db991683a7a2f7c6563547edcdb` — **PASS**.
- 11.6-A authority tests/audit — PASS.
- 11.6-B gateway tests — PASS.
- 11.6-B destructive source tests — PASS.
- Real Cloud certificate static guard — PASS.
- 11.6-B authority audit — PASS.
- database audit + selftest — PASS.
- roadmap integrity — PASS.
- TypeScript — PASS.
- production build — PASS.
- frozen distribution budgets — PASS.
- secret audit — PASS.

The subsequent source-only audit hardening makes final public `SECURITY INVOKER` assertions function-local. The closure commit must pass the same Phase 11.6 gate before PR #191 may merge.

## Retained invariants

- no shadow intake-submission store;
- no raw capability token persistence;
- no secure-link document upload;
- no final intake approval through follow-up;
- one open follow-up per submission;
- stale/version checks fail closed;
- retryable issuance remains idempotent;
- Portal request creation/revocation stays delegated to M3 authority;
- Portal transaction must match the intake-linked converted CRM lead;
- Portal reconciliation requires fulfilled request + real client evidence;
- cross-workspace references remain denied;
- public capability input remains explicitly non-authoritative;
- direct browser table writes remain denied;
- advisor regressions caused by B remain zero;
- frozen distribution budgets remain unchanged.

## Exit decision

**PASS**

- Real Cloud SQL probe: **PASS**.
- Authenticated Real Cloud API certificate: **PASS — 32 checks**.
- expiry / revocation / recovery: **PASS**.
- workspace isolation: **PASS**.
- direct-write denial: **PASS**.
- Portal evidence reconciliation: **PASS**.
- audit reconciliation: **PASS**.
- zero residue: **PASS**.
- new B-caused security advisor findings: **0**.
- new B-caused performance advisor findings: **0**.
- known Critical / High / functional blockers: **0 / 0 / 0**.

11.6-C becomes `AUTHORIZED_NEXT` only through this closure state. Phase 11.7 remains locked until the full Phase 11.6 exit gate passes.
