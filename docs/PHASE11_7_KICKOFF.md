# Phase 11.7 — Communication Zero-Escape Gate — Kickoff

**Status:** IN_PROGRESS  
**Base:** `5c4b1bfa4cda339fbbd96b7d3bbf938ef560f98a` — formally closed Phase 11.6 closure merge  
**Branch:** `phase11-7-communication-zero-escape`  
**Predecessor:** Phase 11.6 — CLOSED / exact-main + Pages + Live External recertified  
**Successor:** Phase 12.1 — Copilot Foundation — LOCKED

## Purpose

Phase 11.7 is **not a feature-delivery phase**. It is the destructive communication closure gate for the Phase-11 communication-facing systems and their existing authority boundaries.

No new product authority, database table, browser-owned truth store, public write RPC, shadow communication/scheduling/intake/contract store, feature cut or budget increase is authorized by this phase. If destruction exposes a real defect, only the smallest root-cause repair plus permanent regression coverage is allowed.

## Systems under the gate

- **M3 — Client Portal** — individual evidence for portal authorization, revocation and client-safe projection.
- **M4 — Omnichannel Communications Hub** — individual evidence for dedupe, consent/approval, delivery failure and transport/canonical separation.
- **M10 — Scheduling, Appointments & Deadline Engine** — individual evidence for stale targets, timezone-safe rules and terminal scheduling facts.
- **M16 — Engagements, Contracts & Retainers — Phase-11 portion** — individual evidence for stale contract targets, client-decision provenance, renewal and communication bridges.
- **M17 — Smart Intake Forms & Secure Submission Links — Phase-11 portion** — individual evidence for revoked/expired links, follow-up integrity and non-authoritative public intake.

All five major systems remain `ACTIVE` at kickoff. Phase 11.7 opening does not claim global M-system closure.

## Roadmap destruction dimensions

The gate must attack all eight Phase 11.7 failure classes:

1. **large counts** — dense portal grants, messages, appointments, renewals, contracts and intake evidence remain deterministic without hidden truncation or invented truth;
2. **stale targets** — optimistic-version and target-binding mismatches fail closed before authoritative mutation;
3. **duplicate events** — provider messages, outbound commands, retries and bridge commands remain idempotent/deduplicated;
4. **revoked links** — revoked/expired portal grants and intake links cannot resurrect access or authority;
5. **unauthorized portal access** — foreign workspace, forbidden domain, staff-only and ungranted child access are denied;
6. **delivery failure** — failed/unknown transport cannot become canonical communication success or bypass consent/approval;
7. **timezone boundaries** — workspace timezone remains scheduling authority; device/local timezone cannot silently rewrite business schedule truth;
8. **archived relations** — terminal/archived relations cannot silently resurrect scheduling, renewal, contract or intake truth.

## Existing authority that must remain frozen

### M3
- portal principal/grant truth remains the Client Portal authority;
- revoked principals/grants and foreign workspaces fail closed;
- client-safe projections exclude staff-only, risk, intelligence and internal audit domains.

### M4
- `communications` remains canonical business-message truth;
- provider transport evidence is not canonical message truth;
- provider/outbound identities remain deduplicated;
- consent and sensitive approval remain mandatory where required.

### M10
- `calendar_events`, `renewals` and governed workflow deadline rules remain canonical;
- workspace timezone is authoritative;
- portal responses, notifications, field assignments and external calendars remain inputs/projections only;
- terminal facts cannot silently resurrect.

### M16 / M17
- public intake stays non-authoritative until governed review;
- `engagement_contract_revisions` remains M16 contract-revision truth;
- `renewals` remains renewal truth;
- Client Portal approval remains decision evidence only;
- M4 communication remains communication truth;
- stale/cross-workspace/retry-without-idempotency bridge commands fail closed.

## Gate layers

Phase 11.7 follows the project Zero-Escape policy and cannot close from branch CI alone.

Required before formal closure:

- deterministic destruction coverage for all eight dimensions;
- **individual evidence for M3, M4, M10, M16 Phase-11 and M17 Phase-11**;
- authenticated Real Cloud evidence where persistent authority is exercised;
- unauthorized/lower-privilege/cross-workspace denial evidence;
- fresh-workspace and durable round-trip/reload evidence where writes are exercised;
- Real Chromium at **1280 / 430 / 390 / 360 / 320** on applicable Phase-11 surfaces;
- exact merged-SHA Quality / Major Systems / roadmap / Real Browser recertification;
- Pages `/live/` deploy and Live External evidence;
- frozen **670000 initial JS / 760000 total JS / 180000 CSS** budgets;
- Critical / High / functional blockers = **0 / 0 / 0**.

A green branch alone cannot close Phase 11.7.

## Successor lock

**Phase 12.1 — Copilot Foundation remains LOCKED.**

AI work may begin only after Phase 11.7 is formally closed on exact `main`, the deployed-live communication boundary is certified, all required workflows are settled, and the existing business/permission authorities remain stable.
