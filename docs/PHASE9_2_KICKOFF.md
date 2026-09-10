# ENJAZ Phase 9.2 — Smart Saved Views & Cross-domain Search Intelligence

**Status: IN PROGRESS**

Branch: `phase9-2-smart-saved-views-search-intelligence`  
Base: `158b3c383509d99edab0bddb3fe676b17b4e7051` — formal Phase 9.1 closure merge.

## Authorization

Phase 9.1 is formally `CLOSED`, its exit gate passed, and `phase9_2Allowed=true`. Phase 9.2 is therefore the only authorized implementation stage. **Phase 9.3 remains LOCKED** until Phase 9.2 completes its own Zero-Escape evidence and formal closure.

## Product contract

Phase 9.2 turns mature ENJAZ filters/finders into durable saved operational views and permission-aware global discovery without creating a second source of truth.

Required behavior:

1. A user can save, rename and delete a filtered operational view.
2. A saved view may retain query, filters, sort, date/range and bounded page-size configuration, but never persisted result rows or ephemeral page navigation.
3. The existing transaction contract `enjaz.transactions.list.v1` must be reused through an explicit adapter; its semantics may not be copied or silently redefined.
4. Global search covers the authorized portions of transactions, companies, people, procedures and documents.
5. Results are grouped by domain and are returned only through permission-scoped authoritative reads.
6. A domain that lacks sufficient authoritative evidence is omitted fail-closed; no placeholder entity, count or metadata may reveal inaccessible data.
7. Search results deep-link only to exact internal ENJAZ destinations/entities. External or invented destinations are forbidden.
8. Personal saved views are the default. Team/workspace visibility requires explicit existing organizational permission; visibility metadata alone never grants access.
9. Existing filters/finders and domain data services are reused rather than duplicated.

## Authority boundaries

- Saved-view persistence: **database-backed + RLS required**.
- Global search: **permission-scoped authoritative reads only**.
- Source business entity write authority from search/saved-view code: **NONE**.
- Shadow entity/result store: **FORBIDDEN**.
- Persisted search result rows: **FORBIDDEN**.
- Cross-workspace search: **FORBIDDEN**.
- Unauthorized fallback results or metadata leakage: **FORBIDDEN**.
- Search/saved-view UI must not bypass RLS or infer hidden entities from counts/errors.

## Foundation already established

- `src/features/searchIntelligence/searchSavedViewContract.ts`
  - `enjaz.saved-view.v1`
  - `enjaz.global-search-result.v1`
  - five-domain contract
  - bounded flat-filter definition
  - internal deep-link validation
  - explicit personal/team/workspace visibility
  - transaction adapter reusing `enjaz.transactions.list.v1`
- `tests/phase9-2-search-saved-views-foundation.test.ts`
  - schema/domain fail-closed attacks
  - malformed filters/ranges/page sizes
  - transaction semantic-drift attacks
  - unauthorized/external result-reference attacks
  - no source-business mutation authority assertion

## Persistence/RLS gate

Before saved views can be called live:

- create one authoritative `saved_views` persistence model rather than client/local shadow storage;
- bind every row to a workspace and creator/owner identity;
- personal reads/writes must be owner-safe;
- team/workspace visibility must reuse the existing M15 organizational authorization model and explicit scope membership;
- no workforce user may be promoted into legacy `workspace_memberships` merely to make saved views work;
- malformed definitions and unsupported domains must fail closed;
- indexes/constraints must support bounded workspace/user/domain queries;
- Real Cloud must attack cross-workspace access, shared-scope escalation, unauthorized writes, stale/deleted membership, malformed JSON and cleanup residue.

## Global-search gate

Before global search can be called complete:

- each domain must query its authoritative source under existing RLS/permission boundaries;
- permission is enforced before result grouping/rendering;
- no cross-domain aggregation layer may become a shadow truth store;
- documents are returned only where a current authoritative document source actually exists; unavailable authority means that domain is omitted, not fabricated;
- result references must resolve to exact internal destinations/entities;
- empty/no-access/error states must not disclose hidden entity existence.

## Verification requirements

Phase 9.2 cannot close without all of the following:

- deterministic foundation and persistence/service destruction tests;
- full functional regression;
- database audit + database audit self-test;
- roadmap + major-system governance + secret + TypeScript checks;
- unchanged hard production JavaScript ceiling: **670000 bytes** (`budgetIncreaseAllowed=false`);
- authenticated **Real Cloud** RLS/permission destruction with zero residue;
- **Real Chromium** at desktop and narrow mobile widths, including saved-view create/rename/delete/apply and cross-domain search/deep-link behavior;
- exact-head pull-request workflow matrix with zero failures;
- exact merged-SHA post-merge recertification;
- Pages/deployed-live verification and Live External attack of the actual published application;
- zero critical/high/functional blockers.

## Successor lock

**Phase 9.3 — Corporate Governance & Ownership Engine remains LOCKED.** No Phase 9.3+ implementation is authorized by this kickoff.
