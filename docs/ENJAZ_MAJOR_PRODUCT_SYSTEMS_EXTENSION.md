# ENJAZ Major Product Systems — Extension M15–M18

This file is part of the governing **Major Product Systems Expansion** and carries the same release rules. These are additional end-to-end systems, not small supporting capabilities.

## M15 — Multi-Branch, Departments & Team Operating Model
**Roadmap anchor: Phase 8 + Phase 15**

Core capabilities:
- Multiple offices/branches inside one workspace.
- Departments and teams with scoped visibility where configured.
- Branch-specific queues, cashboxes, service availability and reporting.
- Controlled cross-branch transfer of a transaction with full audit.
- Assignment rules based on service, branch, department, workload and availability.
- Temporary delegation and leave coverage.
- Workload balancing with explicit human override.
- Branch manager dashboards without bypassing row-level permissions.
- Cross-branch company/client identity without duplicating the company record.
- Consolidated owner view across all branches.

## M16 — Engagements, Contracts & Retainers
**Roadmap anchor: Phase 7 + Phase 10 + Phase 11**

Core capabilities:
- Client engagement/mandate records independent from individual transactions.
- Fixed-fee, milestone, hourly, retainer and mixed commercial models.
- Contract start/end/renewal and notice periods.
- Included services/limits and overage rules.
- Retainer balance/consumption tied to authoritative finance.
- Contract amendments with version history.
- Approval and signature-ready document generation through Document Factory.
- Renewal alerts and expired-contract enforcement rules.
- Profitability by engagement, client and service.
- Prevent new billable work when configured contractual prerequisites are missing.

## M17 — Smart Intake Forms & Secure Submission Links
**Roadmap anchor: Phase 8 + Phase 11**

Core capabilities:
- Build external intake forms from approved field types.
- Conditional questions and required-document rules.
- Secure expiring submission links.
- Mobile camera/file upload.
- Duplicate client/company detection before import.
- Review queue: external submissions never become authoritative records silently.
- Accept/reject/map each submitted field with audit.
- Convert approved intake into lead/company/contact/transaction/procedure pack.
- Client can resume an incomplete submission securely.
- Submission status page without exposing internal workspace data.
- Anti-abuse/rate-limit boundary for public forms.

## M18 — Process Mining & Predictive Operations
**Roadmap anchor: Phase 9 + Phase 15**

Core capabilities:
- Reconstruct real process paths from authoritative transaction/workflow events.
- Compare expected procedure path vs actual path.
- Identify rework loops, repeated correction stages and queue bottlenecks.
- Cycle-time distributions by service/authority/stage/employee/branch.
- Detect abnormal aging before SLA breach.
- Predict likely delay range using historical ENJAZ facts with confidence/limitations displayed.
- Recommend staffing/routing changes as proposals, never silent mutations.
- Measure before/after effect of workflow changes.
- Drill every finding back to source cases/events.
- No opaque score may block or penalize a user without explainable source facts.

All M15–M18 systems require schema, RLS/permissions, service layer, complete live journey, destructive tests, mobile/Chromium acceptance, audit for sensitive writes, and post-merge recertification before they count as implemented.
