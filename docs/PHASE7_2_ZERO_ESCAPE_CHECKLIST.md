# Phase 7.2 — Zero-Escape Checklist

This file is evidence tracking only. An unchecked item blocks closure.

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
- [ ] Phase 7.2 static contract audit green on final candidate head.
- [ ] Phase 7.2 command tests green on final candidate head.
- [ ] Full functional regression green on final candidate head.
- [ ] TypeScript/build/budget green on final candidate head.
- [ ] Real Chromium 1280/430/390/360/320 green on final candidate head.
- [ ] PR-wide required workflows all green with zero failures/in-progress/queued.
- [ ] Exact tested head merged to `main`.
- [ ] Exact merged SHA deployed to `/live/`.
- [ ] Deployed-live finance critical path verified.
- [ ] Canonical post-merge recertification complete.
- [ ] Critical defects = 0.
- [ ] High defects = 0.
- [ ] Functional blockers = 0.

Until every required item is satisfied, Phase 7.2 remains `IN_PROGRESS` / `OPEN` and Phase 7.3 remains locked.
