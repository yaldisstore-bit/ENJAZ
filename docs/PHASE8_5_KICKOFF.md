# Phase 8.5 — Multi-Branch / Departments / Teams — M15 Foundation

Status: **IN PROGRESS**

Base: `4fff1f6b25687d8ca305edac3d5a033e77e224c9`

Phase 8.4 is formally closed and post-closure recertified. Phase 8.5 is the sole authorized successor.

## Purpose

Build the first authoritative M15 organizational operating model without creating a parallel authentication system or weakening the existing workspace trust boundary.

The existing `workspace_memberships` table remains the **owner-only workspace trust root** and its role constraint stays unchanged. In canonical audit language: workspace_memberships table remains the **owner-only workspace trust root**. Phase 8.5 does **not** insert non-owner employees into that legacy table because many pre-M15 RLS policies and privileged RPCs intentionally treat a workspace-membership row as workspace-wide authority.

Non-owner workforce authorization is therefore modeled in a dedicated `organization_members` table. These rows still reference the same canonical `auth.users` identities, are created/disabled only by the workspace owner through guarded RPCs, and never satisfy legacy workspace-wide membership checks.

`workspace -> branch -> department -> team`

A workforce member may receive explicit membership at one or more organizational scopes. Any inherited access must be derived from a concrete recorded scope membership and must be explainable by query/RLS evidence.

## Delivery boundary

Phase 8.5 is an **isolated live-slice delivery**: schema, service/command layer, complete organizational UI journey and Real Chromium are implemented and certified through the dedicated Phase 8.5 preview. Canonical runtime promotion is intentionally deferred to a separate budgeted promotion step because the existing production JavaScript contract remains capped at **670000 bytes** and may not be raised or bypassed.

This follows the Phase 8.4 delivery pattern: the phase slice may prove its full journey without silently inflating the canonical production bundle. The frozen R2 information architecture remains unchanged, no duplicate organization destination is created, and M15 must not be imported into `UiR2ProductionRoot` or `UiR2LiveRoot` during this foundation slice.

## Foundation scope

- canonical organization members referencing `auth.users`, controlled by the workspace owner;
- canonical branches inside one workspace;
- departments optionally attached to a branch;
- teams attached to a department;
- explicit branch/department/team membership with role `member`, `lead` or `manager`;
- explicit active/inactive lifecycle and validity window for workforce/scope memberships;
- operational ownership records that attach existing authoritative transactions to a branch/department/team without duplicating Company, Contact or Transaction;
- auditable cross-scope ownership transfer primitive;
- owner consolidated view across the whole workspace;
- scoped view for non-owner workforce members based only on explicit/inherited organization membership;
- RLS-verifiable inheritance and fail-closed cross-workspace boundaries.

## Authority laws

1. `workspace_memberships` remains owner-only and unchanged. It is the root trust boundary for owner access and legacy ENJAZ authority.
2. Non-owner workforce users live in `organization_members`, referencing canonical `auth.users`. They are authorization records, not a second authentication system.
3. Only the workspace owner may create, reactivate or deactivate an organization member through the M15 RPC boundary. Direct workforce DML is forbidden.
4. An organization member must never satisfy legacy `workspace_memberships` RLS or legacy privileged RPC membership checks merely by being a workforce member.
5. Organizational membership never grants access outside the same workspace.
6. A team must belong to one department; a department may belong to one branch or be workspace-wide when explicitly configured.
7. Inheritance is downward only: branch membership may include descendant departments/teams; department membership may include descendant teams; team membership grants no sibling/parent scope.
8. Any inherited permission must retain the explicit source membership that justified it.
9. Operational ownership never duplicates or rewrites authoritative Company/Contact identity.
10. Transaction ownership may be scoped organizationally, but transaction lifecycle authority remains with the existing transaction/workflow boundaries.
11. Finance ledger write authority remains `none` for Phase 8.5.
12. Direct anonymous organizational writes are forbidden.
13. Client code may not infer hidden cross-branch access; the database/RPC contract is authoritative.
14. The canonical JavaScript cap stays 670000 bytes; Phase 8.5 may not raise it or conceal phase assets inside the production bundle.

## Deferred M15 capabilities

This foundation intentionally does not claim completion of all M15. Canonical runtime promotion, branch-specific cashboxes, service routing, automated workload balancing, temporary leave delegation, advanced branch dashboards and full assignment-rule orchestration remain later M15 work and require their own gates.

## Exit requirements

Phase 8.5 cannot close until it has:

- canonical schema + indexes + RLS;
- proof that organization members do not unlock legacy workspace-wide access or legacy privileged RPCs;
- explicit inheritance proofs and denial proofs;
- command/service boundary;
- complete isolated organizational UI/live journey;
- transaction operational ownership + transfer audit journey;
- Real Chromium mobile/desktop acceptance;
- unchanged canonical production JavaScript budget;
- authenticated Real Cloud verification with zero probe residue;
- zero Critical/High/functional blocker defects;
- exact-merge-SHA post-merge recertification.

## Successor lock

**Phase 8.6 — Global Command Center remains LOCKED.**

It is not authorized until Phase 8.5 is formally closed. M15 overall also remains open until its separate Zero-Escape evidence under Phase 8.7 / later roadmap anchors is satisfied.
