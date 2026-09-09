# Phase 8.5 — Multi-Branch / Departments / Teams — M15 Foundation — Formal Closure

Status: **CLOSED**  
Exit gate: **PASS**  
Successor: **Phase 8.6 — Global Command Center AUTHORIZED**  
M15 overall: **NOT GLOBALLY CLOSED — Phase 8.5 foundation slice is complete; M1–M18 Zero-Escape closure remains governed separately**

## Certified implementation chain

- Phase 8.5 base: `4fff1f6b25687d8ca305edac3d5a033e77e224c9`
- Implementation branch: `phase8-5-multi-branch-teams`
- Final certified implementation head: `9afe0a6dd3bc8f060c8f12f3e7d8ab21d5349398`
- Implementation PR: **#117 — Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation**
- Canonical implementation merge: `4ec57a7c691d7a97af533d719f0e0d9653a93173`

The implementation PR was green on its exact final head with **34/34 pull-request workflows SUCCESS**, dedicated Phase 8.5 Real Chromium, authenticated Real Cloud zero-residue verification, cumulative Real Browser acceptance and zero known Critical/High/functional blockers.

## Final exact-main certification

For `main` at `4ec57a7c691d7a97af533d719f0e0d9653a93173`:

- exact-SHA completed workflow census: **19/19 SUCCESS**;
- failure: **0**;
- cancelled: **0**;
- queued: **0**;
- in-progress: **0**;
- Pages Preview run `34319169055`: **SUCCESS**;
- Live External Gate run `34319223039`: **SUCCESS**;
- cumulative Real Browser run `34319111823`: **SUCCESS**;
- published application external Chromium/WCAG attack: **PASS**.

See `docs/PHASE8_5_POSTMERGE_RECERTIFICATION.md`.

## M15 authority closure

Phase 8.5 delivers the organizational foundation without creating a second workspace trust model.

The certified authority model proves:

- `workspace_memberships` remains the owner-only workspace trust root;
- non-owner workforce authorization lives in `organization_members` plus explicit scope memberships;
- the organizational hierarchy is workspace → branch → department → team;
- scope inheritance is downward only and every inherited decision remains source-explainable;
- team membership does not grant parent access and sibling access is denied;
- cross-workspace organizational access is forbidden;
- direct authenticated organizational table mutation is denied;
- guarded RPCs own structural and ownership mutation;
- organization actions do not gain transaction lifecycle write authority;
- organization actions have no finance-ledger write authority.

## Real Cloud closure

Authenticated Real Cloud verification is **PASS — ZERO RESIDUE**.

The live destructive probe proved owner and workforce boundaries, branch/department/team creation, stale-write rejection, explicit branch-manager membership, downward inheritance, sibling isolation, managed-descendant ownership transfer, cross-workspace denial, exact ownership audit events, and zero transaction-lifecycle or finance-ledger mutation.

Final independent probe census returned zero temporary Auth users, probe companies/transactions, organization members, branches, departments, teams, transaction ownership rows, ownership events and private probe helper functions.

See `docs/PHASE8_5_REAL_CLOUD_EVIDENCE.md`.

## Production defect discovered and repaired

The Phase 8.5 implementation PR initially exposed a real governance escape: `src/ui-r2/organization/organization.css` used literal/foreign colors outside the locked R2 palette. Quality and cumulative UI gates correctly failed.

The defect was repaired at final implementation head `9afe0a6dd3bc8f060c8f12f3e7d8ab21d5349398` by rebinding the organization surface to the locked R2 palette tokens. The failing gates were not waived; the full PR matrix was rerun and passed.

## Final regression evidence

On the final certified implementation head before merge:

- Phase 8.5 organization command/authority tests: **9/9 PASS**;
- full functional regression: **217/217 PASS**;
- dedicated Phase 8.5 Real Chromium: **9/9 PASS**;
- full pull-request workflow matrix: **34/34 SUCCESS**;
- production JavaScript hard ceiling: **670000 bytes, unchanged**.

## Defect ledger at closure

- unresolved defects: **0**
- critical defects: **0**
- high defects: **0**
- functional blockers: **0**
- Real Cloud cleanup blockers: **0**

## Major-system boundary

Phase 8.5 closes the assigned foundation slice for **M15 — Multi-Branch, Departments & Team Operating Model**.

It does **not** declare M15 globally `CLOSED` under the M1–M18 Zero-Escape policy. Later assigned integration, enterprise behavior, destruction, security and deployed-live system-wide closure evidence remains authoritative for final M15 closure.

The following capabilities remain explicitly deferred from this foundation slice and are not fabricated as complete:

- canonical runtime promotion where separately budgeted;
- branch cashboxes;
- advanced service routing;
- automated workload balancing;
- temporary leave delegation;
- advanced branch dashboards;
- full assignment-rule orchestration.

## Transition law

Phase 8.5 is formally closed because schema/authority boundaries, explicit RLS-verifiable inheritance, operational ownership audit, Real Cloud zero-residue destruction, exact-head PR certification, exact-main deployment recertification, cumulative Real Browser and actual public Live External testing all passed on the certified chain.

Therefore **Phase 8.6 — Global Command Center is the sole authorized successor**. Phase 8.6 must still satisfy its own kickoff, implementation, destructive testing, Real Cloud/Browser evidence and formal closure; this authorization does not pre-approve any Phase 8.6 result.