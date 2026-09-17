# Phase 11.6-C — Contract Approval, Retainer Renewal & Communication Evidence

**Status:** IN PROGRESS  
**Base:** `314ff5a297420b4842a0bba78c3575d84e85c707` — merged Phase 11.6-B closure  
**Predecessor slice:** 11.6-B — CLOSED / Real Cloud certified  
**Successor slice:** 11.6-D — LOCKED  
**Phase 11.7:** LOCKED

## Product objective

Connect client contract/retainer approval evidence, canonical M16 contract transitions, canonical M10 renewal facts and M4 communication evidence without creating a second contract, client-decision, renewal or communication authority.

## Canonical composition

- `public.engagement_contract_revisions` remains M16 contract-revision truth.
- `public.commercial_engagements` remains engagement truth.
- `public.client_portal_requests`, `public.client_portal_document_approval_targets` and `public.client_portal_document_approval_responses` remain M3 request/decision evidence.
- `public.renewals` remains the canonical renewal fact; C may add explicit contract provenance to that authority but may not create a shadow renewal record.
- `public.communications` remains M4 communication truth; notification rows are attention/transport evidence only.
- `public.audit_events` remains cross-system audit authority.

## C1 — M16 transition concurrency & retry hardening

The existing Phase 10.5 transition function predates the Phase 11.6 optimistic-concurrency law. C must close that gap before any client decision can feed M16:

- add a monotonically increasing revision `version`;
- add an idempotent operation receipt for retryable contract transitions;
- expose a governed transition façade requiring `operationId + expectedVersion`;
- reject stale versions and payload-changing replays;
- revoke browser execution of the unversioned transition façade after the governed replacement is live;
- update the TypeScript M16 gateway and tests to use the governed façade;
- preserve all existing transition legality, artifact, signature, effective/expiry and audit rules.

## C2 — Client contract decision → M16 bridge

A client approval/rejection remains M3 decision evidence. The bridge may reconcile it into M16 only when all bindings are explicit:

- M3 request type is `approval` with `approve_document`;
- request/response/principal/transaction/document remain the existing M3 authorities;
- a private bridge binding maps exactly one M3 request to one M16 revision and records the revision version at issue;
- the request transaction must belong to the same commercial engagement as the M16 revision;
- the shared document must be the governed contract artifact/draft target for that revision;
- decision must already exist and the M3 request must be fulfilled;
- `approved` may feed only the legal M16 transition expected by the bound revision state;
- `rejected` may feed only the legal return/rework transition expected by the bound revision state;
- the bridge calls the governed M16 owner command; it never updates `engagement_contract_revisions` directly;
- stale revision, changed approval target, revoked request/share, cross-workspace scope or replay conflict fails closed;
- reconciliation is idempotent and attributable.

## C3 — Contract renewal provenance & communication evidence

Renewal attention must remain derived from canonical authorities:

- an effective M16 revision with a valid `expires_on` may be linked to an existing canonical `renewals` row;
- provenance is stored on/through the canonical renewal authority, not a second renewal table;
- company/transaction scope must match the engagement/revision scope;
- recurrence/materialization/completion/cancellation continues through existing M10 commands;
- C may project renewal attention but may not mark a renewal complete/cancelled directly;
- client-visible approval/renewal requests require M3/M4 evidence;
- outbound communication evidence must be created through the existing governed M4 command boundary;
- communication/notification rows may never mutate contract or renewal truth by themselves.

## Security / failure contract

- direct browser writes to contract revisions, private bridge bindings and governed receipts are denied;
- direct client approval response never mutates M16 contract truth;
- retryable commands require operation identity;
- stale expected version fails closed;
- one M3 approval request cannot bind to multiple contract revisions;
- one reconciliation cannot apply two conflicting decisions;
- terminal `expired` / `terminated` / `superseded` revisions cannot be silently reopened;
- cross-workspace and cross-engagement references fail closed;
- revoked/expired Portal authority fails closed;
- missing communication evidence for externally visible flows fails closed where required;
- all sensitive bridge writes emit attributable audit evidence.

## Explicit non-goals

- no replacement M3 approval system;
- no duplicate contract revision table;
- no shadow renewal/reminder authority;
- no direct provider transport implementation;
- no automatic signature;
- no automatic contract effectiveness based only on a client message or Portal decision;
- no global M16/M17 closure claim.

## Exit gate required before C can close

11.6-C remains open until source/destruction tests and authenticated Real Cloud prove:

- versioned/idempotent M16 transition owner behavior;
- direct old transition path is no longer browser-authorized;
- valid and invalid client decision bindings;
- approved/rejected decision reconciliation through M16 owner command;
- stale/replay/cross-workspace/cross-engagement/revoked-target fail-closed behavior;
- renewal provenance uses canonical `renewals`;
- M10 renewal owner boundaries remain intact;
- M4 communication evidence is canonical and does not become contract state;
- audit reconciliation;
- advisor before/after comparison with zero silently accepted C-caused findings;
- cleanup / zero residue.

11.6-D remains locked until this C exit gate passes.
