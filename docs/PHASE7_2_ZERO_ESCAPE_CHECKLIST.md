# Phase 7.2 — Zero-Escape Checklist

This file is the canonical closure checklist for Phase 7.2. Every required item below is satisfied on the certified implementation and merged/deployed evidence chain.

- [x] Authoritative payment/reversal schema and command contract implemented.
- [x] Direct browser mutation of sensitive finance tables revoked.
- [x] M16 finance anchor does not create a second money store.
- [x] Idempotency exists for cashbox, engagement, payment and reversal commands.
- [x] Immutable receipt and reversal snapshots exist.
- [x] Payment/reversal audit and transaction activity exist.
- [x] Reconciliation detects status mismatch and shadow-ledger payment events.
- [x] Public RPC surface hardened to `SECURITY INVOKER`; privileged bodies are private.
- [x] Supabase Security Advisor rerun after hardening with Phase 7.2 Definer warnings eliminated.
- [x] New Phase 7.2 unindexed foreign keys hardened.
- [x] Real authenticated Supabase payment→receipt→replay→reverse→reconcile probe passed.
- [x] Probe cleanup independently verified.
- [x] Phase 7.2 static contract audit green on final candidate head.
- [x] Phase 7.2 command tests green on final candidate head.
- [x] Full functional regression green on final candidate head.
- [x] TypeScript/build/budget green on final candidate head.
- [x] Real Chromium 1280/430/390/360/320 green on final candidate head.
- [x] PR-wide required workflows all green with zero failures/in-progress/queued: `26/26 SUCCESS`.
- [x] Exact tested head `da4800ddf4df2ecca49b01d1b40db0546fd70a13` merged to `main`.
- [x] Canonical merge commit is `192711cfcc36bf041ab0e576f8ab3899dc63b7a6`.
- [x] Exact merged SHA deployed to `/live/` through Pages run `34084227883` with build/deploy SUCCESS.
- [x] Deployed-live finance/public critical path verified by Live External run `34084261408`.
- [x] Published application attack passed.
- [x] Canonical post-merge recertification complete: `11/11 SUCCESS`, zero failure/in-progress/queued/cancelled.
- [x] Critical defects = 0.
- [x] High defects = 0.
- [x] Functional blockers = 0.

**Closure result: Phase 7.2 = CLOSED + POST-MERGE RECERTIFIED.**

The M16 finance/commercial anchor owned by this phase is complete; the whole M16 system is not declared closed because later assigned M16 slices remain.

**Next authorized stage: Phase 7.3 — Financial Intelligence.**
