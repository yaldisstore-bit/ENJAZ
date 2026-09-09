# Phase 8.6 — Global Command Center Kickoff

**Status: IN PROGRESS**

Canonical base: `main` @ `80fd1eda9c1c67ef43ec801ba4677dc32ab40c93`, the formally closed Phase 8.5 successor authorization.

## Purpose

Phase 8.6 replaces the old presentation-only Command Center with one live executive surface that can understand cross-domain operational pressure and execute only actions already owned by authoritative domain gateways.

The Command Center is an orchestrator, not a new business authority.

## Hard authority contract

The following are forbidden:

- Command-owned database tables;
- Command-owned write RPCs;
- direct table mutation from presentation components;
- a shadow transaction/workflow/finance/automation/field state;
- finance writes from the Command Center;
- bypassing expected-version, expected-stage, idempotency, client-operation or approval guards;
- displaying a partial executive snapshot as if it were complete when one authoritative domain cannot be read.

The Command Center may read and delegate only through:

1. Home Dashboard / workspace Data Layer;
2. existing Finance Command Gateway;
3. existing Government Procedure Runtime Gateway;
4. existing Automation Command Gateway;
5. existing Field Operations Command Gateway.

## Live command scope

Phase 8.6 ships three real command classes:

- human decisions for pending automation approvals, delegated to `AutomationCommandGateway.decideApproval`;
- allowed workflow transitions for priority work, delegated to `GovernmentProcedureRuntimeGateway.transition` with expected stage + idempotency;
- field assignment reassignment, delegated to `FieldOperationsCommandGateway.reassign` with expected version + reason + client operation id.

Finance is intentionally read/reconciliation-only in this phase. The Command Center can surface integrity warnings and navigate to Finance, but it cannot create a generic executive finance write path.

## Executive snapshot

The live snapshot must fail closed as a unit. It combines:

- active/urgent/stalled transactions;
- overdue follow-ups and critical blockers;
- finance reconciliation warnings;
- automation approvals;
- field assignments/visits and workforce members;
- allowed workflow transitions for bounded priority transactions.

If any required authoritative source fails, the screen must show an unavailable state instead of mixing fresh and stale/fabricated facts.

## UI / UX contract

- canonical destination remains `command`;
- the old R2.0-7 demo Command surface is not used in live runtime after Phase 8.6 promotion;
- locked palette tokens only;
- layered executive hierarchy, not a flat KPI wall;
- real controls have visible disabled/busy/error states;
- touch targets and keyboard focus remain compliant;
- Chromium acceptance covers 1280 / 430 / 390 / 360 / 320 widths.

## Budget and successor lock

The production JavaScript hard budget remains **670000 bytes** and may not be raised by this phase.

**Phase 8.7 — Operations Zero-Escape Destruction Gate remains LOCKED.**

It becomes authorized only after Phase 8.6 implementation, functional regression, dedicated authority tests, Real Chromium, full PR CI and exact-main post-merge recertification are complete.
