# Phase 8.3 — Operations Center + Field Operations — M5 — Kickoff

Status: **IN PROGRESS**  
Base: `698ba49fe80d8bc297a041afd253b01787dc460b`  
Authorized by: **Phase 8.2 CLOSED + `phase8_3Allowed=true`**

## Purpose

Phase 8.3 turns the existing operations destination from a presentation surface into an authoritative operational control center and delivers the M5 ENJAZ Field Operations / Runner Mode anchor as a real mobile-first workflow.

This phase is not allowed to create a second transaction/workflow truth. Transactions, blockers, workflow and automation remain owned by their existing canonical systems. Field operations owns assignments, visits, field evidence and synchronization receipts only.

## Operations Center contract

The live Operations Center must derive queues and health from canonical facts:

- active/stalled transaction workload;
- open critical/high blockers;
- active workflow state and overdue/blocked operational items where authoritative data exists;
- automation runs/pending approvals without creating shadow automation state;
- field assignments and visit outcomes;
- explicit empty/error/offline states instead of fabricated dashboard values.

## M5 field contract

The Runner Mode must support:

1. daily visit route/queue;
2. assignment to a real workspace member;
3. check-in/check-out with location evidence only when workspace policy explicitly enables it;
4. photo/document/receipt evidence linked to the exact case/visit;
5. official fee paid, reference number and counter/department visited;
6. could-not-complete reason taxonomy with note/evidence;
7. offline draft queue with guarded, replay-safe synchronization;
8. office → field and field → office handoff evidence;
9. one-tap next required action after a visit without silently mutating workflow state;
10. emergency reassignment with audit;
11. visit history and productivity metrics without continuous/invasive tracking.

## Authority boundaries

- Field operations may never invent transaction, workflow, finance or document truth.
- Official fee captured during a visit is field evidence; it is **not** a finance ledger write or a posted payment.
- Workflow progression remains through the existing workflow RPC authority.
- Automation remains through the Phase 8.2 automation authority.
- File bytes remain in the canonical document/storage pipeline; field evidence records may reference canonical document IDs.
- Location evidence is optional, policy-controlled and visit-scoped; no background tracking contract is introduced.
- Direct browser mutation of field tables is not an approved production write path; writes must pass RPC/service boundaries with membership, assignment, stale-state and idempotency checks.

## Offline law

Offline support must fail safe:

- local drafts carry stable client operation IDs;
- sync is idempotent using server-side receipts;
- stale assignment/visit state returns an explicit conflict instead of overwriting server state;
- duplicate submit/retry does not duplicate visit events or evidence;
- the UI keeps unsynced local drafts visible until canonical acknowledgement;
- field evidence is never displayed as uploaded until the server/document pipeline acknowledges it.

## Required destructive evidence before closure

- schema/data contract and FK/RLS audit;
- authenticated Real Cloud write/read/reload round trip;
- negative membership and cross-workspace tests;
- assignment ownership and reassignment conflict tests;
- duplicate/replayed sync tests;
- stale check-in/check-out and double-completion tests;
- offline → reconnect → sync → refresh journey;
- optional location policy ON/OFF tests;
- evidence linkage and missing-document fail-closed tests;
- Real Chromium/mobile acceptance at 1280/430/390/360/320;
- Android keyboard/back/reload/deep-link/long Arabic/dense queue stress;
- exact-head PR-wide regression;
- exact merged SHA Pages/live-external/deployed-path recertification;
- zero Critical/High/functional blocker defects.

## Successor lock

**Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17 remains LOCKED.**

It is not authorized until Phase 8.3 is formally closed with required Real Cloud, Real Browser, offline/conflict and post-merge evidence. M5 overall may become a closure candidate here, but global M5 closure remains subject to its individual Phase 8.7 Zero-Escape evidence.
