# Phase 8.2 PR Evidence

- Canonical base: `main` @ `65e2c29bc5b656b5c56daa84a893aeff65c5d662`.
- Pull request: `#109` from `phase8-2-automation-engine`.
- Canonical authority remains `automation_rules` / `automation_runs`; no shadow automation store was introduced.
- Phase 8.2 is wired into canonical `test:functional` and `verify:extreme`.
- Real Cloud verification: `PASS` against Supabase project `juzxriirhkuzviwnhkbd` (`ACTIVE_HEALTHY`).
- Authenticated Real Cloud evidence covers: public RPC mutation success with direct table mutation denied, stale-version fail-closed behavior, idempotent dispatch receipt replay with one follow-up side effect, mandatory human approval for sensitive workflow transitions, idempotent rejection/replay, and cleanup of probe rows.
- Real Chromium is required and remains `PENDING` until the final exact-head Phase 8.2 gate completes successfully after all UI/test hardening commits.
- Post-merge recertification remains `PENDING` and must run against the resulting `main` merge SHA before Phase 8.2 can be formally closed.
- Phase 8.3 remains `LOCKED`.
