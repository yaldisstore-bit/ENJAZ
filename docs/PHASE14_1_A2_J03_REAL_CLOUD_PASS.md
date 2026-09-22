# Phase 14.1 A2 — J03 authenticated government procedure journey (2026-09-20)

**Scope: a narrow, independently authenticated company → transaction → procedure (J01–J03) integration slice. NOT full eleven-domain A2 certification.**

## Observed hosted evidence

- [GitHub Actions run 35532339095](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35532339095) completed **SUCCESS** on exact code SHA `4cba0b241d628d8629736e28d5b047e305226869` in the disposable isolated Supabase lab `nqhgaukutkyvfumbtbtg`; no production mutation.
- Protected lab-credential preflight, locked dependency install, live Auth test, strict narrow-scope result guard and upload of the run-specific `phase141-a2-j03-procedure-real-cloud` evidence artifact all succeeded.
- Ten explicit J03 checks passed: empty-lab prerequisite; two independently authenticated users with distinct personal workspaces; owner-created company/transaction lineage; government procedure started by real owner JWT (catalog fixture setup explicitly done by test admin); durable workflow instance verified through a fresh owner login; idempotent replay yielded the same instance without a duplicate; outsider read/start were denied; mismatched workspace/transaction/procedure command was denied.
- After the run, an **independent read-only database inspection** returned zero Auth users/sessions, workspaces, companies, transactions, government entities, procedures, workflow templates, workflow instances, workflow transition events and storage objects. The workflow also required `passed === true` and `cleanupPassed === true`. This verifies isolated test fixture cleanup at this observation, rather than merely an empty pre-run snapshot.

## Explicit limits

- The procedure/template/entity **catalog is test-admin scaffolded**. This certificate covers a real authenticated owner **business action** against a prepared catalog; it does not certify end-user catalog creation or a government-office integration.
- The test covers the **start** of the first procedure stage and idempotent replay, not a full multi-stage transition, field assignment, follow-up, payment/reversal, document factory, client portal or archive/restore journey.
- The outsider negative checks do not replace a full authorized member, denied same-workspace role, independently scoped client, expired-auth and published-device matrix.
- This narrow success does not certify physical Android, published portal, exact-main deployed-live or Phase 14.1 closure. Keep PR #225 DRAFT and Phase 14.2 LOCKED.

## Next independent gate

Implement J04 field work linked to this authoritative workflow instance with real owner/assignee identities and explicit negative permissions, plus idempotency/offline retry evidence, before linking J05 follow-ups and finance. Maintain lab-only fixtures and independent zero-residue checks. Each new code/fixture change needs its own exact-head run; source-only checks must not be relabeled as hosted E2E.
