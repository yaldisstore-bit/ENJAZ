# Phase 14.1 A2 — J04 real hosted field operations evidence (2026-09-20)

**Narrow-scope PASS: authenticated company → transaction → government-procedure start → field assignment → check-in/out → handoff; NOT full eleven-domain A2.**

## Source and execution evidence

- [GitHub Actions run #35534114130](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35534114130) completed **SUCCESS** for exact executable commit `baedcdae2be2ea0a3889a66492238ac176304af9` against isolated disposable project `nqhgaukutkyvfumbtbtg` (production ref `juzxriirhkuzviwnhkbd` remains outside this test).
- Protected credential/safety preflight, locked dependency installation, pre-network syntax check, real hosted runner, isolated-evidence assertion and artifact upload all passed. Logs record **25 PASS checks**, covering the J01–J03 predecessor journey and J04 authenticated owner assignment, fresh-session readback, outsider/foreign-assignee denial, check-in, same-operation replay, conflicting replay denial, visit checkout, checkout replay, office handoff, handoff replay, stale handoff rejection and the durable joined source identities.
- Admin access only prepares a disposable government/catalog fixture and performs scoped cleanup. Assignment, check-in/out and handoff are exercised through existing public domain RPCs under a real signed-in user's JWT.
- The runner's scope/cleanup guard required `passed===true` and `cleanupPassed===true` and explicitly `completeElevenDomainA2===false`. Attached artifact: `phase141-a2-j04-field-real-cloud`.
- An **independent read-only lab count after completion** verified zero auth users/sessions, workspaces, companies, transactions, workflow instances, field assignments, field visits, field sync receipts and storage objects. No production writes or direct field-table privilege grants were made.

## Scope limitations

This proves one owner-assigned workflow's check-in/out/handoff and deterministic retry of the same operation identity; it does **not** prove physical Android offline networking, a separately authenticated same-workspace non-owner assignee, general concurrent handoff, all eleven domains, the published portal, or deployed-main recertification. Further J05–J11 live joins, adversarial role tests, A3 device, and exact-main/live gates remain outstanding. Keep PR #225 DRAFT, 14.1 IN_PROGRESS, 14.2 LOCKED.
