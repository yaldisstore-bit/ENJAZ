# ENJAZ Phase 7.4 — Financial Reports Closure

**Status: CLOSED — Zero-Escape exit gate passed.**

Phase 7.4 is closed for the reporting scope owned by this stage: authoritative finance reports by period, company, transaction and cashbox; deterministic screen/export/print totals; direct drill-down provenance; explicit reversed-movement semantics; and the M16 reporting hook without a shadow finance store.

This closure does **not** close the whole M16 Engagements, Contracts & Retainers system. Later contract-document, communication and other assigned M16 slices remain governed by their own phases.

## Certified implementation

- Exact tested implementation head: `7dba0c48e5782df5093deae57c6f10677b32fbce`.
- Pull request: **#103**.
- Pull-request workflows: **28/28 SUCCESS**, with zero failure/in-progress/queued at the release-to-merge decision.
- Dedicated pre-merge Phase 7.4 gate run `34096775256`: **SUCCESS**.
- Phase 7.4 report/model suite, full functional regression, Phase 7.1/7.2/7.3 preservation, secrets, destructive database self-test, roadmap, TypeScript, production build and budget all passed.
- Real Chromium acceptance passed at **1280 / 430 / 390 / 360 / 320** with no horizontal escape.
- Production JavaScript: **588519 / 670000 bytes**, without raising the budget.

## Reporting integrity

- Money remains exact `bigint` cents through the shared finance boundary.
- Reversed payment/ledger lines remain visible as source facts while their effective report movement is zero.
- Company and transaction reports cannot inherit unattributable workspace cashbox opening balances.
- Cashbox reports explicitly refuse to fabricate per-cashbox movement when the authoritative schema provides no payment/ledger cashbox foreign key.
- Report fingerprints are deterministic.
- CSV, JSON and print/PDF are derived from the same report snapshot shown on screen.
- Source evidence references point directly to authoritative payment or financial-ledger identifiers.
- The M16 reporting hook is `reserved-no-shadow-store`; no contract/retainer reporting money store was created.

## Production budget correction

Before Phase 7.4, canonical production JavaScript was effectively at the hard ceiling. The implementation initially exceeded the unchanged `670000`-byte limit.

The accepted fix did not weaken or raise the budget. ENJAZ production runtime stopped loading unused Supabase Storage, Functions and Realtime surfaces and retained only the Auth + PostgREST runtime actually required by the application contract. Authentication, `.from()` and `.rpc()` behavior remained behind the same ENJAZ boundaries and passed full regression, TypeScript, production build, browser, Pages and deployed-live validation.

This reduced production JavaScript to **588519 bytes**, leaving durable headroom for later governed stages.

## Merge and canonical post-merge evidence

- PR #103 was merged using the exact tested head.
- Canonical recertified merge commit: `d4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858`.
- Canonical `main` push workflows: **10/10 SUCCESS**.
- Failure: **0**; queued: **0**; in-progress: **0**.
- Dedicated Phase 7.4 post-merge gate run `34097286172`: **SUCCESS**.
- Pages Preview/deploy run `34097333825`: **SUCCESS**; canonical production bridge, `/live/` build, both JavaScript budgets, artifact upload and Pages deployment all passed.
- Real Browser Acceptance run `34097286214`: **SUCCESS**, including shell/cumulative reality, Zero-Lost, destruction waves 1 and 2, and production-bridge Auth/Home/Executive/Account.
- Live External run `34097378705`: **SUCCESS**; public deployment probe, HTTPS/HTML contract, external Chromium/WCAG tooling and **Attack the actual published application** all passed.

## Defect gate

- Critical defects: **0**.
- High defects: **0**.
- Functional blockers: **0**.
- Unresolved closure defects: **0**.

## Decision

Phase 7.4 satisfies the Zero-Escape closure law and is canonically **CLOSED + POST-MERGE RECERTIFIED**.

**Next authorized implementation stage: Phase 7.5 — Finance Destruction & Reconciliation Gate.**

Phase 8 remains locked until Phase 7.5 is completed and recertified.
