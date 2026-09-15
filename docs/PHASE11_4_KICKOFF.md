# Phase 11.4 — Omnichannel Communications Hub — M4 — Kickoff

**Status:** IN PROGRESS  
**Opened on:** 2026-09-15  
**Base:** `90abedd5af199fa497e3c7e4b8c5b2d5e18967d6`  
**Predecessor:** Phase 11.3 — Client Portal — CLOSED / certified  
**Major system:** M4 — Omnichannel Communications Hub — ACTIVE  
**Successor:** Phase 11.5 — Scheduling, Appointments & Deadline Engine — M10 — LOCKED

## Governing objective

Turn ENJAZ communications into one governed conversation history per authorized client/company/transaction instead of a collection of provider-specific inboxes. Email, WhatsApp Business and SMS are transports when configured; they are not independent sources of business truth.

A provider event may prove that a message was received, accepted, delivered, failed or read, but it must not silently create a second authoritative message fact. Every canonical communication must remain workspace-scoped, attributable, deduplicated and linked only through explicit or reviewable entity matching.

## Existing authorities that remain authoritative

- `communications` is the existing canonical ENJAZ communication fact and must be evolved rather than replaced by a shadow message store.
- `companies`, `contacts` and `transactions` remain the entity/link authorities.
- `client_portal_messages` remains the governed M3 portal interaction source. M4 may reconcile/link it into conversation history, but must not rewrite its authority.
- `notification_deliveries` remains Phase 11.1 transport history for notifications only. It must not become conversation or Inbox state.
- `in_app_notifications` remains attention/lifecycle metadata, not communication truth.
- Document Vault / canonical `documents` remain attachment authority. Provider attachment URLs or bytes cannot become a second document store.
- `audit_events` remains the cross-system audit evidence authority.
- Staff workspace trust remains `workspace_memberships`; M15 workforce authority remains `organization_members`.

## Required Phase 11.4 authority model

1. A canonical communication fact belongs to exactly one workspace and has a stable identity independent of provider retries/webhook redelivery.
2. Conversation/thread grouping is a governed projection over canonical communication facts; it may not invent duplicate message rows to represent the same provider message.
3. Provider account credentials, signing secrets and access tokens are server-side secrets only. They may never appear in browser bundles, public tables, logs, audit summaries or client-readable metadata.
4. Provider ingress must be idempotent. A provider message/event identifier plus provider account/channel scope must deduplicate webhook retries before business facts are created.
5. Transport attempts/events may be many-to-one with a canonical outbound communication. They are delivery evidence, not additional messages.
6. Inbound automatic matching may link only when the match is deterministic under explicit workspace rules. Ambiguous or unknown inbound communication must remain unlinked/review-required rather than being guessed onto a company/contact/transaction.
7. Manual re-linking must be authorized, version/concurrency guarded and fully audited with old/new linkage evidence.
8. Cross-workspace matching, provider-account confusion and endpoint reuse must fail closed. A phone number/email alone is never sufficient workspace authority.
9. Consent and channel eligibility must be checked before outbound send where required. Missing/withdrawn consent or blocked channel state must fail closed rather than merely warn.
10. Sensitive outbound templates may require an approval state under workspace policy. A browser action cannot bypass that approval boundary.
11. Templates and merge fields are content-generation inputs only. Rendered outbound content must be captured as immutable send evidence before provider dispatch.
12. Provider delivery/read states cannot mutate authoritative transaction/company lifecycle fields directly.
13. Attachments must be ingested or referenced through Document Vault governance before they become authoritative ENJAZ attachments.
14. Conversion of a communication into follow-up/task/document request must call the owning domain command and retain provenance back to the source communication.
15. Search must remain workspace/authorization scoped and cannot expose provider secrets, hidden recipients, raw webhook payloads or unrelated client conversations.
16. Duplicate sends, webhook replay, stale relink and concurrent send/retry races must have deterministic idempotent outcomes.
17. Every sensitive send, receive, match, relink, consent decision, approval transition, attachment ingestion and conversion action requires attributable audit evidence.
18. Public Data API exposure must be explicit. New public tables require RLS plus least-privilege grants; `TO authenticated` alone is not authorization.
19. Privileged database functions may not rely on editable `user_metadata`. Any genuinely privileged helper must have explicit execute grants and a safe fixed search path.
20. Phase 11.5 remains locked until 11.4 passes its deployed-live exit gate.

## Delivery slices

### 11.4-A — Canonical authority & dedupe contract
- canonical communication vs transport-event authority;
- channel/provider/account identity rules;
- deterministic dedupe/idempotency contract;
- deterministic/ambiguous/unmatched entity-link policy;
- manual relink authorization/audit contract;
- consent/approval fail-closed contract;
- destructive cross-workspace/provider-replay tests.

### 11.4-B — Conversation & transport data model
- evolve the existing `communications` authority without a shadow store;
- governed conversation/thread projection;
- provider account/endpoints without browser-readable credentials;
- inbound/outbound transport attempt and delivery-event evidence;
- consent/channel eligibility state;
- indexes, RLS, explicit Data API grants and reconciliation probes.

### 11.4-C — Provider ingress/egress & governed actions
- email ingestion/sending where configured;
- WhatsApp Business integration where configured;
- SMS integration where configured;
- verified webhook ingress and replay protection;
- templates/merge fields and optional outbound approval;
- Document Vault attachments;
- convert communication to owning follow-up/task/document-request commands.

### 11.4-D — Unified communications experience & certification
- one authorized conversation timeline;
- unread/awaiting-reply state and unanswered-client SLA;
- safe manual re-link review queue;
- authorized conversation search;
- real failure/retry/offline/conflict states;
- Real Chromium 1280/430/390/360/320;
- real-cloud/provider-sandbox where configured;
- exact merged/deployed SHA and post-merge recertification.

## Explicit non-goals / deferrals

- Phase 11.4 does not configure or invent real provider credentials that are not already supplied and authorized.
- It does not use Supabase Auth email/SMS hooks as the business communications hub; authentication messaging and business communications are separate domains.
- It does not replace Client Portal, Universal Inbox, Notifications, Document Vault, Companies, Contacts or Transactions authority.
- It does not treat `notification_deliveries` as canonical client communication history.
- It does not claim provider delivery/read state when the provider cannot prove it.
- It does not activate Phase 11.5 before 11.4 formal closure.

## Platform security note

Supabase's current Data API model requires explicit grants for newly created public tables as platform defaults move to opt-in exposure. Every Phase 11.4 public table must therefore pair explicit least-privilege grants with RLS. Views exposed through the Data API must be RLS-safe (`security_invoker` where applicable), and provider secrets remain backend-only.

## Exit requirements

Phase 11.4 / M4 cannot close until all of the following are proven:

- canonical conversation/message/transport authority with no duplicate business-message fact;
- provider retry/webhook replay idempotency and reconciliation;
- deterministic match + ambiguous/unmatched review + audited relink behavior;
- workspace/provider-account isolation and negative permission matrix;
- consent and optional outbound-approval enforcement;
- Document Vault attachment authority preserved;
- conversions call authoritative owning-domain commands without shadow work items;
- authenticated Real Cloud durable write/read round trip;
- real configured-provider or provider-sandbox ingress/egress evidence where integration is enabled;
- failure/retry/conflict/replay recovery evidence;
- audit reconciliation for sensitive communication actions;
- Real Chromium/mobile acceptance at 1280/430/390/360/320;
- frozen production budgets remain within their governed caps unless separately authorized;
- zero known Critical/High/functional blockers;
- exact merged/deployed SHA + Live External + post-merge recertification.

## Successor lock

**Phase 11.5 — Scheduling, Appointments & Deadline Engine — M10 remains LOCKED.**
