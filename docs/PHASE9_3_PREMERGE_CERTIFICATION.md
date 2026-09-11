# ENJAZ Phase 9.3 — Pre-merge Certification

Phase: **9.3 — Corporate Governance & Ownership Engine — M2**  
Lifecycle: **IN_PROGRESS / SUCCESSOR LOCKED**  
Candidate head: `7483fc76cd57dde2fc8d06b31a78e44a540f9c76`

This document records the certified implementation candidate before merge. It does **not** close Phase 9.3 and does **not** authorize Phase 9.4; published `/ENJAZ/live/` and exact-main post-merge evidence remain mandatory.

## Four-track product gate

- Product: **PASS** — complete approved M2 scope is implemented: ownership, beneficial owners, directors/managers/authorized persons, powers, resolutions, capital history, transfers/effective history, unified legal timeline, as-of context and governance risk alerts.
- UI/UX: **PASS** — the M2 cockpit is integrated in real Company 360, Arabic-first/RTL, permission-aware and verified at 1280/430/390/360/320.
- Engineering: **PASS** — typed domain/command boundaries, RLS, SELECT-only browser tables, governed RPC mutation, optimistic concurrency, replay/idempotency, append/effective-dated history and no shadow company/person truth.
- Certification: **IN_PROGRESS** — pre-merge gates and Real Cloud/Browser are green; published live and exact-main post-merge certification are still pending.

## Exact-head gate

Run `34566887668` on head `7483fc76cd57dde2fc8d06b31a78e44a540f9c76`: **SUCCESS**.

Certified evidence:

- foundation destruction: `10/10` PASS;
- ownership persistence destruction: `10/10` PASS;
- full-M2 persistence destruction: `10/10` PASS;
- capital command-authority hardening: `2/2` PASS;
- governance command/runtime: `7/7` PASS;
- full functional regression: `217/217` PASS;
- database audit: PASS;
- database audit self-test: `25/25` PASS;
- Major Systems Zero-Escape audit: PASS;
- secret audit: PASS;
- TypeScript: PASS.

## Production JavaScript governance

The original hard startup ceiling remains **670000 bytes** and was not raised.

Exact candidate build:

- root initial JS: `563507 / 670000` PASS;
- root total JS: `705782 / 760000` PASS;
- Pages `/live/` initial JS: `563529 / 670000` PASS;
- Pages `/live/` total JS: `705804 / 760000` PASS;
- largest lazy chunk: `69454 / 140000` PASS.

The original headroom authorization evidence remains preserved separately; these figures are the later full-M2 runtime certification measurements.

## Real Browser

Run `34566887789` on the same candidate lineage: **SUCCESS**.

The cumulative browser gate passed Shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, both destruction waves, production bridge, Phase 9.1 Smart Risk, Phase 9.2 Search/Saved Views and Phase 9.3 Company Governance.

Phase 9.3 itself passed Chromium at **1280 / 430 / 390 / 360 / 320**, including Company 360 integration, historical as-of reload, governed capital edit boundary, horizontal-overflow protection, touch geometry and exact ar-IQ rendering of a capital value larger than JavaScript’s safe integer range.

## Real Cloud

Supabase project: `juzxriirhkuzviwnhkbd`, PostgreSQL 17.6.

Applied Phase-9.3 migration chain:

- `20260910182755` ownership persistence;
- `20260910183131` authenticated ownership probe;
- `20260910183216` ownership FK-index hardening;
- `20260910215942` full governance registry;
- `20260910220431` capital command-authority hardening;
- `20260911042403` full-governance authenticated probe v2.

Fresh verification reports phase-owned security-advisor warnings `0`, phase-owned unindexed foreign keys `0`, and zero residue across the full M2 probe workspace/company/contacts/ownership/beneficial-owner/authority/resolution/capital/governance/audit state.

See `docs/PHASE9_3_REAL_CLOUD_EVIDENCE.md`.

## Remaining closure gates

Before Phase 9.3 may become `CLOSED` and Phase 9.4 may become `AUTHORIZED`, all of the following still must pass on canonical main:

1. implementation PR checks;
2. merge to main;
3. exact-main cumulative certification;
4. verified GitHub Pages `/ENJAZ/live/` deployment;
5. Live External attack against the actually published application;
6. formal closure evidence with zero unresolved critical/high/functional blockers.

Until then `phase9_4Allowed=false` and the successor remains **LOCKED**.
