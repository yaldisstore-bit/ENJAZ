# Phase 14.2 A4 — Isolated Vault + Webhook Delivery PASS

**Status:** PASS  
**Run:** 36556094374 (run #15)  
**Certified head:** `0889d4789081b523502ace797cfe3076219866bc`  
**Target:** isolated Supabase lab `nqhgaukutkyvfumbtbtg` only  
**Production target:** prohibited

## Verified

- fail-closed target identity check passed;
- A2 integration foundation was present;
- A4 Vault/outbox migration applied idempotently;
- real hosted Auth/workspace bootstrap passed;
- matching webhook event was enqueued;
- server-only claim returned the Vault-backed signing secret;
- retry then successful delivery produced append-only evidence;
- abandoned worker lease recovery passed;
- mutation of delivery evidence was denied;
- authenticated/browser-role access to worker RPC was denied;
- Vault decrypt/hash binding passed;
- transactional fixture and Vault cleanup passed;
- sanitized evidence asserted `passed=true`, `cleanupPassed=true`, `vaultUsed=true`;
- no database credential or raw secret material was recorded in evidence.

## Lineage

The earlier hosted certificate run 36136776160 passed on `b7ea351a7db324e9a3e3677bebd15592eb6a63d3`. The only later change before PR #238 merge was to the source-gate workflow, not the Vault migration, hosted runner, fixture or worker. PR #240 reran the hosted certificate on the closeout head and passed again.

## Remaining boundary

This does not certify the public deployed application. Phase 14.2 remains IN_PROGRESS and Phase 14.3 remains LOCKED until deployed-live/post-merge certification and formal closure are complete.
