# ENJAZ Phase 12.3 — A3-E Governed Document Draft — Real Cloud Evidence

**Status:** CERTIFIED / PASS  
**Certified at:** 2026-09-18  
**Slice:** A3-E — `document.draft`  
**Major system:** M9 — Agentic ENJAZ Copilot  
**Successor:** Phase 12.4 remains **LOCKED**.

## Certified authority

A3-E adds exactly one fifth action-specific adapter:

- action: `document.draft`
- prepare: `prepare_document_draft`
- execute: `execute_document_draft`
- caller-JWT read authority: `public.get_document_factory_v1`
- caller-JWT execution authority: `public.generate_document_draft_v1`
- output state: **`review_required` only**
- contact input: **FORBIDDEN / hard-null**
- OCR input: **FORBIDDEN / hard-null**
- review / render / finalize: **NOT EXPOSED**
- generic write/execute tool: **NOT PRESENT**
- service-role business reads/writes: **NOT PRESENT**

A3-A `followup.snooze`, A3-B `followup.create`, A3-C self `reminder.schedule`, and A3-D `document.request` remain certified and preserved.

## Source certification before live rollout

- Phase 12.3 A3-E source Gate **#82 / 35374235291**: **PASS**
- source head: `d228afdb4538d73889834c82d0adc3117f4b5739`
- preservation fixed for five adapters without weakening A1/A2/A3-A/A3-B/A3-C/A3-D restrictions.

## Live database

Applied migration:

- version: **20260918172603**
- name: `phase_12_3_agentic_action_document_draft`
- source: `database/migrations/phase_12_3_agentic_action_document_draft.sql`

Live authority checks:

- `public.copilot_begin_request_v8`: service-role execute only
- `public.copilot_register_document_draft_proposal_v1`: service-role execute only
- `public.copilot_execute_document_draft_v1`: authenticated execute only
- anon execute: **false**
- browser proposal registration: **denied**
- private hash helper remains non-executable outside its internal authority.

Advisor comparison after A3-E:

- security total: **65**
- new security findings: **0**
- unindexed foreign keys: **28**
- performance WARN additions: **0**
- unused-index INFO count: **52** (one new A3-E partial index is expected before workload accumulation).

## Live Edge deployment

`enjaz-copilot-agent`:

- status: **ACTIVE**
- version: **10**
- `verify_jwt=true`
- deployment digest: `7e02eaba7f28c9289cb297e83e54d9b574a7da50f8780aba0e276532ef23f1d1`

The Edge boundary uses `copilot_begin_request_v8`, keeps business reads on the caller-JWT client, stores only proposal/trace evidence through service authority, and delegates mutation only through the existing M7 domain RPC.

## Authenticated Real Cloud certificate

Workflow:

- `.github/workflows/phase12-3-a3e-real-cloud-e2e.yml`
- run **#1 / 35374393612**
- head: `4a8e810f2a62f413a928d085a1a48a920d73b25e`
- artifact: **10559173568**
- artifact digest: `sha256:904403569bb385195bc7bd0af2ac62f926469da8e1d90255581f4cafef65d849`
- result: **44/44 PASS**
- cleanup: **PASS**
- public/auth residue: **0**

Certified behaviors include:

1. fresh workspace isolation;
2. published template version required;
3. contact/OCR/review/render/finalize injection rejected;
4. authenticated browser cannot register proposal evidence directly;
5. database recomputes the document-draft proposal digest;
6. prepare is approval-gated and exact-input bound;
7. prepare replay is idempotent;
8. execution before approval is denied with zero mutation;
9. cross-workspace prepare is denied;
10. tampered proposal hash is denied;
11. execution request cannot inject business fields;
12. explicit approval is required;
13. execution delegates exactly to `generate_document_draft_v1`;
14. canonical draft is created with exact workspace/template/company/transaction/title binding;
15. canonical output remains `review_required`;
16. contact/OCR provenance inputs remain null;
17. authoritative company/transaction facts are compiled;
18. exactly one draft is created;
19. no PDF render job or Vault document side effect occurs;
20. exact execution replay is idempotent;
21. second execution key is rejected;
22. domain failure after approval produces zero business mutation;
23. domain failure rolls back proposal consumption atomically;
24. foreign workspace receives zero document-draft mutation;
25. all disposable workspaces/users/domain fixtures are removed.

## Zero-residue artifact facts

The uploaded evidence records:

- `passed: true`
- `checks.length: 44`
- `cleanupPassed: true`
- two disposable workspaces removed;
- two disposable auth users removed;
- `zero_public_auth_residue: passed`.

## Certification decision

**PASS — A3-E is Real Cloud certified.**

A3-E is restricted to governed draft generation ending at human-review-required state. It does not authorize document review, approval, render, finalization, Vault issuance, submission packs, finance mutation, ownership mutation, workflow/legal transitions, or any generic execution surface.

Phase 12.4 remains **LOCKED** until Phase 12.3 receives its own formal exit/closure certificate.
