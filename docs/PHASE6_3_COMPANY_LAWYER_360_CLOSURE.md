# Phase 6.3 — Company / Lawyer 360° — Closure Evidence

Status: **CLOSED — post-merge recertification complete**

## Certified implementation

- Implementation head: `c3d8d886424c52113b8bf78bdace95528f429c5f`
- Pull request: #85
- Pre-closure result: **22/22 pull-request workflows SUCCESS, 0 failures**
- `unresolvedDefectCount=0`
- Production JavaScript budget remains **670000 bytes**; certified build = **669997/670000 bytes**.
- Canonical post-merge recertification: **COMPLETE** on `main@46165bfc9f3237b7ff77e7ca11baed3272910831`.
- Phase 6.4 is now authorized; Phase 7 remains locked.

## Phase 6.3 evidence

The stage delivers one shared, read-only Company / Lawyer 360° surface composed from the authoritative Phase 6.1 and Phase 6.2 loaders. It does not create a parallel persistence channel, database, direct Supabase access, ad-hoc fetch channel, localStorage/sessionStorage state, or duplicate business truth.

The unified surface preserves company identity and legal facts, transactions, people/company relationships, documents, activity, operational blockers, and bounded financial context. Lawyer/contact profiles preserve current and ended company relationships as truthful historical context. Truncated reads are explicitly marked partial; unsafe monetary precision fails closed.

## Real-browser acceptance

Phase 6.3 gate run `34037876673` completed SUCCESS, including:

- canonical R2 + Legacy-Zero preservation;
- Phase 6.3 composition audit;
- 3/3 entity360 composition tests;
- 144/144 full functional regression;
- secrets, database, roadmap, TypeScript and production build gates;
- production asset budget;
- isolated Phase 6.3 preview;
- **Real Chromium 7/7** covering unified company/lawyer context, historical ended relationships, no NaN/undefined leakage, and 1280/430/390/360/320 viewport survival with horizontal-overflow and mobile touch-target checks.

Backward browser compatibility was also recertified:

- Phase 6.2 Lawyers / Contacts run `34037876628` — SUCCESS including Real Chromium.
- Phase 6.1 Companies run `34037876709` — SUCCESS including Real Chromium.
- Cumulative Real Browser run `34037876774` — SUCCESS through shell, Golden, Core Work, Records, Operational Intelligence, Zero-Lost, Destruction wave 1, Destruction wave 2, and Production Bridge Auth + Home + Executive + Account.

## Defects discovered and closed during the gate

1. Chromium exposed the company sort `<select>` at 40px height. The component was fixed at the shared CSS source to use `var(--ez-r2-touch-min)`; the test was not weakened.
2. Phase 6.2 Chromium exposed duplicate accessible entity headings after adding the nested 360° title. The shared 360 heading received its own compact accessible identity (`360°`) while preserving the visible entity title, eliminating strict semantic collision without removing information.
3. The first semantic wording exceeded the 670000-byte JavaScript cap. The cap was not raised; wording was compacted while preserving semantics. Final certified JavaScript is **669997/670000 bytes**.
4. Canonical post-merge recertification exposed a Pages verifier defect: the production bridge was measured with `/ENJAZ/` rather than canonical `/`, producing `670003/670000` solely from the six additional path bytes. PR #86 corrected the verifier without changing product code or raising the budget. The final canonical deployment then passed all latest gates.

## Key pre-closure workflow evidence

- Governance: `34037876746`
- Canonical Promotion: `34037876690`
- Quality: `34037876624`
- WCAG: `34037876654`
- Phase 6.1: `34037876709`
- Phase 6.2: `34037876628`
- Phase 6.3: `34037876673`
- Destruction & Reality QA: `34037876794`
- Real Browser cumulative: `34037876774`

All 22 workflows on implementation head `c3d8d886424c52113b8bf78bdace95528f429c5f` completed SUCCESS.

## Canonical post-merge result

The final canonical target is `46165bfc9f3237b7ff77e7ca11baed3272910831` after the verified Pages correction in PR #86.

- **9/9 final successful workflows, 0 failures**.
- Cumulative Real Browser run `34039348382` — SUCCESS through Production Bridge.
- Final Live External run `34039447623` — SUCCESS, including `Attack the actual published application`.
- One older Live External run `34039399127` was superseded and cancelled by concurrency when the newer verified Pages deployment replaced it; it is not counted as a failure and its successor passed.
- Detailed evidence: `docs/PHASE6_3_POSTMERGE_RECERTIFICATION.md`.

## Transition decision

Canonical post-merge recertification is complete. Phase 6.4 — Companies & People Destruction Gate is the only newly authorized phase; later phases remain locked by the roadmap.

- `exitGatePassed=true`
- `unresolvedDefectCount=0`
- `postMergeRecertification.status=COMPLETE`
- `phase6_4Allowed=true`
- `phase7Allowed=false`
- `nextPhase=6.4`
- post-merge recertification: **COMPLETE**
