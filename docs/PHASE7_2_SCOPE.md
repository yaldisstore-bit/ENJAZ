# Phase 7.2 Scope Freeze — Payments & Receipts + M16 Finance

Phase 7.2 delivers one authoritative finance write path on top of the already closed Phase 7.1 read model.

## In scope

- posted payments with exact money boundaries;
- stable immutable receipts;
- duplicate-submit/idempotency protection;
- controlled cashboxes;
- compensating payment reversals;
- payment/reversal audit + transaction activity;
- finance reconciliation and shadow-ledger detection;
- M16 commercial engagement/contract/retainer finance anchor without a second money store;
- production UI for payment, receipt, reversal, cashbox and M16 linkage;
- print-safe receipt surface and stable verification token;
- authenticated real-cloud probe;
- Real Chromium at 1280/430/390/360/320;
- failure/unknown-outcome behavior that preserves idempotency;
- deployment and post-merge recertification before closure.

## Explicitly not in scope

- Phase 7.3 financial intelligence;
- Phase 7.4 final financial reporting;
- Phase 7.5 full finance destruction/reconciliation closure;
- Phase 10 M16 document/signature layer;
- Phase 11 M16 renewal/client communication layer.

## Closure rule

A green branch is insufficient. `7.2 CLOSED` requires the exact merged SHA to be deployed, the deployed finance critical path to be verified, and post-merge recertification to be complete under Zero-Escape governance.
