# Phase 8.2 — Authenticated Real Cloud Evidence

Status: **PASS**

## Target

- Supabase project ref: `juzxriirhkuzviwnhkbd`
- Project status at verification: `ACTIVE_HEALTHY`
- Verification scope: authenticated Phase 8.2 automation authority and security behavior.

## Applied Phase 8.2 cloud anchors

- `phase_8_2_automation_engine`
- `phase_8_2_rpc_security_hardening`
- `phase_8_2_live_authenticated_automation_probe`
- `phase_8_2_fk_index_hardening`

## Verified behavior

The authenticated probe established all of the following:

1. public automation RPC mutation succeeded for the authenticated path while direct mutation of automation tables remained denied;
2. stale rule-version execution failed closed with `ENJAZ_AUTOMATION_RULE_STALE` behavior;
3. dispatch receipt replay was idempotent and produced only one follow-up side effect;
4. a sensitive workflow action entered `awaiting_approval` and could not bypass human approval;
5. approval rejection and decision replay were idempotent;
6. canonical automation context was readable through the approved RPC boundary;
7. probe data was cleaned after verification.

## Authority restrictions preserved

- no `service_role` dependency is part of the authenticated acceptance claim;
- automation has no direct finance write authority;
- finance write authority remains `none`;
- sensitive workflow mutation remains constrained to the existing workflow RPC after human approval;
- direct table mutation is not accepted as an application write path.

## Evidence interpretation

This document preserves the authenticated Real Cloud evidence produced during the certified Phase 8.2 implementation. It does not claim that a new cloud probe was rerun after the merge. Post-merge exact-SHA repository and deployed-path recertification is recorded separately in `docs/PHASE8_2_POSTMERGE_RECERTIFICATION.md`.
