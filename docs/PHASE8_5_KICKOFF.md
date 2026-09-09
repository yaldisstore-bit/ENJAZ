# Phase 8.5 — Multi-Branch / Departments / Teams — M15 Foundation

Status: **IN PROGRESS**

Base: `4fff1f6b25687d8ca305edac3d5a033e77e224c9`

Phase 8.4 is formally closed and post-closure recertified. Phase 8.5 is the sole authorized successor.

## Purpose

Build the first authoritative M15 organizational operating model without creating a parallel authentication system or weakening the existing workspace trust boundary.

The existing `workspace_memberships` table remains the root workspace-membership authority. Phase 8.5 extends that root from `owner` to `owner | member`, but **does not** allow a `member` row to satisfy the legacy workspace-wide RLS membership predicates. Member creation/status changes are owner-only RPC writes, and organizational access is derived separately from explicit branch/department/team scope membership.

`workspace -> branch -> department -> team`

A user may receive explicit membership at one or more organizational scopes. Any inherited access must be derived from a concrete recorded membership and must be explainable by query/RLS evidence.

## Foundation scope

- canonical workspace root members (`owner | member`) with owner-only mutation authority;
- canonical branches inside one workspace;
- departments optionally attached to a branch;
- teams attached to a department;
- explicit branch/department/team membership with role `member`, `lead` or `manager`;
- explicit active/inactive lifecycle and validity window for memberships;
- operational ownership records that attach existing authoritative transactions to a branch/department/team without duplicating Company, Contact or Transaction;
- auditable cross-scope ownership transfer primitive;
- owner consolidated view across the whole workspace;
- scoped view for non-owner members based only on explicit/inherited organization membership;
- RLS-verifiable inheritance and fail-closed cross-workspace boundaries.

## Authority laws

1. `workspace_memberships` remains the root trust boundary. Its role constraint becomes `owner | member`; only an authenticated workspace owner may create, reactivate or deactivate a `member` through the Phase 8.5 RPC boundary. Direct member DML remains forbidden.
2. A `member` root row must **not** unlock the legacy workspace-wide RLS policies. Phase 8.5 replaces the self-visible membership policy with an owner-only legacy visibility policy; member workspace resolution and organizational authorization occur through explicit guarded RPC/helpers.
3. Organizational membership never grants access outside the same workspace.
4. A team must belong to one department; a department may belong to one branch or be workspace-wide when explicitly configured.
5. Inheritance is downward only: branch membership may include descendant departments/teams; department membership may include descendant teams; team membership grants no sibling/parent scope.
6. Any inherited permission must retain the explicit source membership that justified it.
7. Operational ownership never duplicates or rewrites authoritative Company/Contact identity.
8. Transaction ownership may be scoped organizationally, but transaction lifecycle authority remains with the existing transaction/workflow boundaries.
9. Finance ledger write authority remains `none` for Phase 8.5.
10. Direct anonymous organizational writes are forbidden.
11. Client code may not infer hidden cross-branch access; the database/RPC contract is authoritative.

## Deferred M15 capabilities

This foundation intentionally does not claim completion of all M15. Branch-specific cashboxes, service routing, automated workload balancing, temporary leave delegation, advanced branch dashboards and full assignment-rule orchestration remain later M15 work and require their own gates.

## Exit requirements

Phase 8.5 cannot close until it has:

- canonical schema + indexes + RLS;
- proof that a root `member` does not inherit legacy workspace-wide access;
- explicit inheritance proofs and denial proofs;
- command/service boundary;
- organizational UI/live journey;
- transaction operational ownership + transfer audit journey;
- Real Chromium mobile/desktop acceptance;
- authenticated Real Cloud verification with zero probe residue;
- zero Critical/High/functional blocker defects;
- exact-merge-SHA post-merge recertification.

## Successor lock

**Phase 8.6 — Global Command Center remains LOCKED.**

It is not authorized until Phase 8.5 is formally closed. M15 overall also remains open until its separate Zero-Escape evidence under Phase 8.7 / later roadmap anchors is satisfied.
