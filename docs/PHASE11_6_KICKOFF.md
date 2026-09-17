# Phase 11.6 — Smart Intake & Contract Communication — M17 + M16 — Kickoff

**Status:** IN PROGRESS  
**Opened on:** 2026-09-18  
**Base:** `14a670e8dd2d892a7039fd7a52437a8c6274aa2a`  
**Predecessor:** Phase 11.5 — Scheduling, Appointments & Deadline Engine — CLOSED / certified  
**Major systems:** M17 — Smart Intake Forms & Secure Submission Links — ACTIVE; M16 — Engagements, Contracts & Retainers — ACTIVE  
**Successor:** Phase 11.7 — Communication Zero-Escape Gate — LOCKED

## Governing objective

Connect ENJAZ smart intake, client-facing approvals, contract/retainer lifecycle, renewal attention and communication evidence into one governed operating journey without creating a second intake, contract, renewal, portal or communications authority.

Phase 11.6 is an authority-composition phase. It must extend the existing M17 and M16 anchors and reuse M3/M4/M10 where those systems own client responses, communications or renewals.

## Existing authorities that remain authoritative

- `intake_forms`, `intake_links` and `intake_submissions` remain the M17 smart-intake authority established in Phase 8.4.
- Public intake submissions remain non-authoritative external input until the existing governed review path accepts/rejects them.
- `crm_leads` and `crm_conversion_audits` retain commercial pre-transaction/conversion authority; Phase 11.6 may not create a second lead/conversion store.
- `commercial_engagements` remains canonical commercial-engagement authority.
- `engagement_contract_revisions` remains M16 canonical contract-revision authority.
- `documents` + immutable `document_versions` remain issued contract-artifact authority; Document Factory retains draft/template authority.
- `renewals` remains the canonical renewal fact; Phase 11.6 may derive contract/retainer renewal attention but may not create a shadow renewal source.
- `client_portal_requests`, `client_portal_document_approval_targets` and `client_portal_document_approval_responses` remain M3 client-request/approval evidence authority.
- `client_portal_messages` remains governed portal interaction evidence.
- `communications` remains M4 canonical business-communication truth.
- `in_app_notifications` remains attention/lifecycle metadata and `notification_deliveries` remains notification transport evidence.
- `audit_events` remains cross-system audit authority.

## Required authority laws

1. Public intake input is never authoritative merely because it was submitted; governed review remains mandatory.
2. Follow-up/re-contact activity around an intake may not create a second submission fact.
3. Client approval/rejection is decision evidence only. Canonical contract lifecycle changes must pass through the M16 owning command.
4. A portal message or communication event cannot become contract state.
5. A notification cannot become canonical communication state.
6. Contract/retainer renewal reminders must project from canonical contract/renewal facts; reminders cannot become renewal truth.
7. Phase 11.6 may not create a second contract revision, renewal, portal approval or communication store.
8. Cross-workspace source/target references fail closed.
9. Expired/revoked intake links cannot be silently resurrected.
10. Terminal/superseded/terminated contract revisions cannot be silently reopened.
11. Retryable bridge commands require idempotency and stale-version protection.
12. Client-visible requests/decisions require explicit provenance back to the canonical intake/contract/renewal target.
13. Externally visible request/decision flows require communication evidence through the owning M3/M4 boundary.
14. Sensitive writes require attributable audit evidence.
15. M17 and M16 remain globally ACTIVE after this phase unless their separate roadmap Zero-Escape closure policy is satisfied.
16. Phase 11.7 remains locked until Phase 11.6 deployed-live exit requirements pass.

## Delivery slices

### 11.6-A — Authority & boundary contract
- freeze M17/M16/M3/M4/M10 authority composition;
- prove public intake remains non-authoritative until governed review;
- define client-decision → M16 command boundary;
- define contract/retainer renewal → canonical `renewals` boundary;
- define communication evidence and audit requirements;
- destructive cross-workspace, direct-write, stale and idempotency tests.

### 11.6-B — Intake follow-up & client information loop
- staff follow-up over an existing intake submission without duplicating submission truth;
- governed request for missing information/documents through Client Portal authority;
- response reconciliation into the existing intake review state;
- expiry/revocation/retry/offline behavior with attributable evidence.

### 11.6-C — Contract approval, retainer renewal & communication evidence
- governed client contract/retainer approval/rejection request bound to canonical M16 artifact/revision;
- decision evidence feeding the M16 command rather than mutating contract rows directly;
- contract/retainer renewal attention derived through canonical `renewals`;
- communications evidence through M3/M4 boundaries and audit reconciliation.

### 11.6-D — Unified experience & certification
- one Arabic/RTL/mobile-first journey for pending intake follow-up, client approvals and contract/retainer renewals;
- real stale/revoked/offline/failure/conflict states;
- Real Chromium at 1280 / 430 / 390 / 360 / 320;
- authenticated Real Cloud fresh-workspace, durable-write, permission, conflict/recovery and zero-residue probes;
- exact merged/deployed SHA, Pages, Live External and post-merge recertification.

## Explicit non-goals

- No replacement CRM/intake system.
- No replacement Client Portal or communications hub.
- No shadow contract/retainer store.
- No shadow renewal/reminder authority.
- No provider credentials or invented messaging provider claims.
- No automatic conversion of unreviewed public intake into company/transaction/contract facts.
- No global M16/M17 closure claim inside 11.6.

## Exit requirements

Phase 11.6 cannot close until all of the following are proven:

- authority composition has no duplicate business truth;
- reviewed intake follow-up preserves M17 review authority;
- client approval is evidence feeding M16 owning commands, not direct contract mutation;
- contract/retainer renewal attention reuses canonical `renewals`;
- portal/communication/audit evidence is reconciled and workspace-scoped;
- revoked/expired/stale/cross-workspace/retry cases fail closed;
- authenticated Real Cloud durable write/read round trip and fresh-workspace bootstrap;
- permission matrix and direct-write denial;
- Real Chromium/mobile acceptance at 1280 / 430 / 390 / 360 / 320;
- frozen production budgets remain within governed caps with no cap increase;
- zero known Critical/High/functional blockers;
- exact merged/deployed SHA + Pages + Live External + post-merge recertification.

## Successor lock

**Phase 11.7 — Communication Zero-Escape Gate remains LOCKED.**
