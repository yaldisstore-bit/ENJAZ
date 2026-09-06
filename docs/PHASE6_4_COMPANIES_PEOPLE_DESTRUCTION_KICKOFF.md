# Phase 6.4 — Companies & People Destruction Gate — Kickoff

Status: **ACTIVE / NOT CLOSED**

## Certified base

Phase 6.4 starts from canonical `main@ce47fb2123608371139953496fdb95f4c82f2a63` after Phase 6.3 Company / Lawyer 360° closed, its canonical post-merge recertification completed, and `phase6_4Allowed=true` was recorded on main.

## Frozen destruction scope

The master roadmap fixes Phase 6.4 to destructive validation of:

- missing relations;
- duplicates;
- huge names;
- mixed-language data;
- large relation graphs;
- invalid legacy mappings.

This stage does not add a new product domain. It attacks the already-built Phase 6.1 Companies, Phase 6.2 Lawyers / Contacts and Phase 6.3 Company / Lawyer 360° surfaces and fixes only defects proven by the gate.

## Required attack classes

- Missing company/contact targets must remain explicit and must never be fabricated.
- Duplicate records/relations must never create silent duplicate writes or ambiguous current relationships.
- Huge names, notes and mixed Arabic/Latin/digit text must remain bounded, searchable and visually safe.
- Large relation graphs must stay bounded and must expose truncation instead of pretending completeness.
- Invalid non-null legacy/date mappings must fail closed; malformed timestamps may not be interpreted as a current relationship.
- Deleted/merged/inactive entities must remain truthful across list/profile/360 composition.
- Unsafe monetary precision remains hidden rather than guessed.
- Production JavaScript remains `<= 670000` bytes.
- Canonical R2, Legacy-Zero, Phase 6.1/6.2/6.3 contracts and cumulative real-browser acceptance must remain green.

## First proven defect

Kickoff analysis found `P6-4-RELATION-INVALID-DATE`: `isCurrentCompanyRelation()` currently treats a malformed non-null `valid_from` or `valid_to` as an unbounded side of the relationship because failed `Date.parse()` produces `NaN` and the predicate accepts non-finite values. This can turn invalid legacy mappings into apparently current relationships.

The gate must add a regression test and fix this behavior before the defect count may return to zero.

## Locked boundaries

- Phase 7 — Finance remains locked until Phase 6.4 closes and canonical post-merge recertification succeeds.
- Phase 8 — Workflow/Automation remains locked.
- No shadow data layer, direct Supabase client, localStorage/sessionStorage business truth or duplicated persistence is permitted.

## Exit rule

Phase 6.4 remains ACTIVE until the dedicated machine audit, destructive unit/service tests, full functional regression, Phase 6.1/6.2/6.3 cumulative gates, database/secrets/roadmap/TypeScript/build/budget gates, dedicated Real Chromium destruction and cumulative Real Browser Acceptance all pass with `unresolvedDefectCount=0`.

Until then:

- `exitGatePassed=false`
- `phase7Allowed=false`
- `nextPhase=null`
