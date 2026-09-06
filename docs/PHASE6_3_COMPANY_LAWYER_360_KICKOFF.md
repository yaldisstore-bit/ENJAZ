# Phase 6.3 — Company / Lawyer 360° Kickoff

Status: **ACTIVE / NOT CLOSED**

## Certified base

Phase 6.3 starts from canonical `main` after Phase 6.2 post-merge recertification completed and explicitly authorized `nextPhase=6.3`.

Base commit: `57d7a3614e2d04add7fd47ae683509f69e1ca662`

## Product contract

Phase 6.3 delivers one unified contextual 360° view for a company or lawyer/contact without creating or duplicating source-of-truth data.

The surface must compose authoritative workspace-scoped sources already established in Phase 6.1 and 6.2. It must reuse company/contact identity, relationships, related transactions, documents, activity, operational blockers/risk context, and only the bounded financial context already legally exposed by earlier phases.

## Architecture rules

- No new canonical business table merely to serve the 360° view.
- No duplicated persistence/cache/localStorage/sessionStorage channel.
- The 360° surface is contextual/read-only in 6.3; mutations remain owned by existing company/contact/transaction flows.
- Required identity failure is fail-closed.
- Optional context may be unavailable/truncated, but must never be fabricated as complete.
- Relationship graphs are bounded and truncation is explicit.
- Deleted/merged/inactive states stay truthful.
- Unsafe monetary precision is never displayed as an exact business fact.
- Production JavaScript budget remains `<= 670000` bytes. Phase 6.3 must reuse/refactor existing 6.1/6.2 runtime instead of raising the limit.

## Locked boundaries

- Phase 6.4 — Companies & People Destruction Gate remains locked until 6.3 closes.
- Phase 7 — Finance remains locked; no full ledger/payment/receivable operations are introduced.
- Phase 8 — Workflow/Automation management remains locked.
- Phase 10 — Document operations/OCR/report mutation remains locked.

## Release gate

Phase 6.3 remains ACTIVE until architecture audit, composition tests, full regression, TypeScript/build/budget, responsive Real Chromium acceptance and cumulative canonical gates pass with zero unresolved Phase 6.3 defects.

Until then:

- `exitGatePassed=false`
- `phase6_4Allowed=false`
- `phase7Allowed=false`
