# Phase 11.3 — Client Portal — M3 — Kickoff

**Status:** IN PROGRESS  
**Opened on:** 2026-09-15  
**Base:** `232086905c7df82738e55a5dd6ef9893ed11e9e1`  
**Predecessor:** Phase 11.2 — Universal Inbox Integration — CLOSED / certified  
**Major system:** M3 — Client Portal — ACTIVE  
**Successor:** Phase 11.4 — Omnichannel Communications Hub — M4 — LOCKED

## Governing objective

Build a secure external client portal that is deliberately separate from ENJAZ staff authority. A client may authenticate as a real Supabase `auth.users` identity, but that identity must never gain workspace-wide trust merely because it can enter the portal.

The portal is an object-scoped sharing system, not a second staff application. Every visible company, transaction, document, request, approval, payment/receipt fact or client action must be traceable to an explicit active client-portal grant and to the authoritative ENJAZ source record.

## Existing authorities that remain authoritative

- `workspace_memberships` remains the owner-only workspace trust root.
- M15 `organization_members` remains workforce authorization only; client accounts must not be inserted there.
- `companies`, `transactions`, transaction lifecycle/history, `documents`/document versions, Finance records, calendar/visit facts and existing audit facts remain authoritative in their current systems.
- M17 public intake remains a non-authoritative external submission/review boundary; it must not be repurposed into authenticated client-portal authority.
- Supabase Auth remains authentication authority. Portal authorization must be stored in server-governed ENJAZ records and must not depend on editable `user_metadata`.

## Required Phase 11.3 authority model

1. A portal principal references one canonical `auth.users` identity and one workspace, but does not create a `workspace_memberships` or `organization_members` row.
2. Portal membership has an explicit lifecycle: invited/active/revoked (or an equivalent fail-closed model). Revocation must immediately remove portal authorization without deleting or mutating staff records.
3. Visibility is deny-by-default and object-scoped. A client sees only companies/transactions explicitly shared with that portal principal or through a recorded portal relationship.
4. Child facts may be projected only from an already-authorized parent object and only from an explicit client-safe projection. Internal tables are not globally exposed to portal users.
5. Direct portal access to internal notes, risk/intelligence signals, staff-only finance, organization/workforce data, internal audit metadata, secrets, unrelated companies/transactions and raw workspace-wide tables is forbidden.
6. Portal reads must use purpose-built governed boundaries (RLS-safe tables/views or guarded RPC/read models). `TO authenticated` by itself is never sufficient authorization.
7. Portal-visible views must not bypass RLS. Any view used through the Data API must be `security_invoker` or otherwise kept outside the exposed API surface.
8. Any `SECURITY DEFINER` helper must be private/non-exposed where possible, have a fixed safe search path, derive actor identity from `auth.uid()`, and never be used as a blanket permission bypass.
9. Public callable functions must have explicit execute grants; default `PUBLIC` execution is forbidden for privileged portal operations.
10. Browser code may use only the normal publishable/authenticated client. No service-role/secret key may appear in client code.
11. Every externally shared object, revocation, approval/rejection, upload, read receipt and other sensitive client write must create attributable audit evidence.
12. Client writes cannot mutate authoritative staff facts directly unless a dedicated command boundary owns that exact transition. Uploads, approvals, comments and confirmations must enter governed source-specific commands.
13. Duplicate submission/replay and stale-state mutation must fail safely and must not create duplicate authoritative records.
14. Cross-workspace and cross-client leakage is a Critical blocker.
15. Phase 11.4 remains locked until Phase 11.3 and M3 satisfy their exit gates.

## Delivery slices

### 11.3-A — Authority & isolation foundation
- portal principal/membership authority;
- explicit company/transaction grant model;
- revocation semantics;
- share/audit provenance;
- deny-by-default permission matrix;
- destructive leakage tests.

### 11.3-B — Client-safe read model
- allowed companies/transactions;
- live client-safe transaction timeline/status;
- client-safe document/request/payment/receipt projections;
- explicit exclusion of internal-only fields;
- deep-link/session/reload behavior.

### 11.3-C — Governed client actions
- requested-document upload into the correct case;
- document/draft approval or rejection with comment;
- client question/message bound to the exact transaction;
- appointment/visit confirmation;
- read receipts for critical requests;
- idempotent and auditable writes.

### 11.3-D — Portal experience & certification
- separate client-facing route/shell and permission model;
- invitation/activation/revocation journey;
- mobile-first RTL experience;
- Real Chromium at 1280/430/390/360/320;
- authenticated Real Cloud permission matrix;
- deployed-live critical path and post-merge recertification.

## Explicit non-goals / deferrals

- Phase 11.3 does not implement the Phase 11.4 omnichannel provider hub.
- It does not grant clients access to staff UI or workforce roles.
- It does not create a shadow Company, Transaction, Document or Finance store.
- It does not expose arbitrary workspace search, BI, risk or internal notes.
- It does not claim M3 CLOSED from a preview or CI-only result.

## Exit requirements

Phase 11.3 / M3 cannot close until all of the following are proven:

- authoritative portal schema/data contract;
- full RLS/grant permission matrix with unauthorized, revoked, other-client and other-workspace denial proofs;
- no internal-only field leakage;
- authenticated Real Cloud invite/activate/read/write/revoke round trip on the intended project;
- durable write verification after fresh query/session boundary;
- complete client journey using authoritative source facts;
- network/retry/conflict/replay protection;
- audit evidence for sensitive external actions;
- Real Chromium/mobile acceptance at 1280/430/390/360/320;
- frozen production budgets remain within the existing caps unless separately governed;
- zero known Critical/High/functional blockers;
- exact merged/deployed SHA Pages + Live External + authenticated critical-path recertification;
- machine M3 Zero-Escape evidence satisfies `docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md`.

## Successor lock

**Phase 11.4 — Omnichannel Communications Hub — M4 remains LOCKED.**

It is not authorized until Phase 11.3 is formally closed and M3 has the required Zero-Escape evidence.
