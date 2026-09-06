# Phase 6.2 — Lawyers / Contacts Kickoff

Status: **ACTIVE / NOT CLOSED**

Phase 6.2 starts only after Phase 6.1 Companies was merged, independently recertified, and explicitly authorized the next stage.

## Certified base

`6a9b940cc267e5fdd59774faed5a976804dff74b`

Phase 6.1 state requirements at kickoff:

- `status=CLOSED`
- `exitGatePassed=true`
- `unresolvedDefectCount=0`
- `postMergeRecertification.status=COMPLETE`
- `phase6_2Allowed=true`
- `nextPhase=6.2`

## Product scope

Phase 6.2 delivers the live workspace-scoped people domain:

- lawyer/contact list
- Arabic-first search, filters, sorting and bounded pagination
- contact/lawyer create and edit
- contact profile
- company relationships through `company_contacts`
- transaction relationships through the canonical transaction `primary_contact_id`
- relevant operational context
- relevant financial context derived from related transactions without opening full Finance
- explicit active/inactive/merged/deleted truthfulness
- stable create identities and stale-write protection where the schema supports it

## Relationship rules

- Company relationship management uses `company_contacts`; no duplicate parallel relation store is allowed.
- A transaction primary contact must be an active, non-deleted contact with a current relation to that transaction's company.
- Ending a company relation must not silently rewrite historical transactions.
- Missing/expired relations are displayed explicitly rather than fabricated.
- Every write stays behind the authenticated workspace-scoped Enjaz Data Layer.

## Safety ceilings

- Contact source ceiling: **5,000 rows**, fail closed beyond it.
- List page size: bounded to 50.
- Profile relationship/context reads are bounded and expose truncation.
- Unsafe or partial financial context is never presented as a complete ledger.

## Explicitly locked

- **Phase 6.3 — Company / Lawyer 360°** remains locked.
- **Phase 7 — full Finance** remains locked.
- **Phase 8 — Workflow / Automation management** remains locked.
- **Phase 10 — Document operations** remains locked.

## Release rule

Phase 6.2 cannot close until its architecture audit, model/service tests, full functional regression, DB/secrets checks, TypeScript, production build, isolated browser fixture, Real Chromium acceptance, cumulative R2 gates, and post-merge recertification are all green with zero unresolved Phase 6.2 defects.
