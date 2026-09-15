# Phase 11.4-C — Provider Ingress/Egress & Governed Actions — Evidence

**Status:** EXIT GATE PASSED FOR SLICE 11.4-C  
**Phase 11.4 overall:** IN PROGRESS  
**Next slice:** 11.4-D — Unified Communications Experience & Certification  
**Phase 11.5:** LOCKED

## What this slice proves

Phase 11.4-C adds the governed provider boundary around the existing canonical `communications` authority. It does not create provider-specific message truth, shadow attachments, or shadow work items.

Implemented provider adapters are:

- Resend email ingress/egress;
- Twilio SMS ingress/egress;
- Twilio WhatsApp ingress/egress.

Provider credentials remain server-side only. The Edge gateway exposes no browser CORS authority. Webhook routes use provider cryptographic signatures, while outbound dispatch requires a separate server-only internal key.

## Real Cloud database evidence

The following production migrations are applied on Supabase project `juzxriirhkuzviwnhkbd`:

- `20260915162021` — `phase_11_4_omnichannel_governed_actions`
- `20260915162147` — `phase_11_4_omnichannel_conversion_hardening`
- `20260915162338` — `phase_11_4_live_governed_actions_probe`
- `20260915162456` — `phase_11_4_omnichannel_advisor_hardening`
- `20260915162756` — `phase_11_4_live_governed_actions_post_advisor_probe`
- `20260915164650` — `phase_11_4_omnichannel_provider_attachment_registration`
- `phase_11_4_edge_gateway_fail_closed_probe_dispatch`
- `phase_11_4_edge_gateway_fail_closed_probe_cleanup`

The destructive governed-actions probe completed inside a transaction and rolled back with zero residue. It proved:

- consent fails closed;
- outbound idempotency and inbound provider replay deduplication;
- sensitive outbound approval before transport;
- rendered outbound content immutability;
- provider event replay deduplication;
- deterministic link, ambiguous `review_required`, and no guessed auto-link;
- audited manual relink with stale-version rejection;
- idempotent communication-to-follow-up conversion;
- task conversion through canonical `transaction_followups` authority;
- Client Portal document-request ownership boundary;
- audit evidence for sensitive operations.

A second probe ran the public command facades under the actual `authenticated` database role after advisor hardening and passed with zero residue.

## Security / performance hardening

Public authenticated commands are `SECURITY INVOKER` facades over private, membership-checking implementations. The seven foreign-key index findings introduced by this slice were eliminated before certification.

The new authority tables intentionally have no browser read/write grants. RLS-without-policy informational advisor entries on deny-by-default internal tables are therefore expected and do not represent browser exposure. Older project-wide advisor findings outside M4 remain outside this slice and are not claimed as fixed here.

No provider token, webhook signing secret, raw endpoint, or raw provider payload is stored in the public M4 authority model.

## Document Vault authority

Outbound provider attachments are read from canonical Document Vault documents. Inbound supported attachments are binary-validated, checksum-bound, stored in the private Document Vault bucket, registered as canonical `documents` + `document_versions`, linked through `communication_document_links`, and audited.

There is no provider-specific attachment truth store.

## Provider gateway deployment

Supabase Edge Function:

- name: `enjaz-communications`
- state at certification: `ACTIVE`
- deployed version: `1`
- `verify_jwt=false` intentionally because provider webhooks cannot present a Supabase user JWT; the function implements custom cryptographic authentication instead.

Authentication boundaries:

- Resend webhook: Svix signature over the raw request body with timestamp tolerance;
- Twilio webhook: documented HMAC-SHA1 request signature validation;
- internal outbound dispatch: `ENJAZ_COMMUNICATIONS_INTERNAL_KEY`, constant-time compared and never exposed to the browser.

The provider crypto/normalization unit suite passes **6/6**, including the documented Twilio request-signature vector, Resend/Svix tamper and stale-timestamp rejection, HMAC endpoint fingerprints, merge-field fail-closed behavior, status mapping, and WhatsApp destination canonicalization.

## Deployed fail-closed evidence

A real POST to the deployed `/dispatch` route without the internal key returned:

- HTTP `401`
- `{ "ok": false, "error": "INTERNAL_AUTH_REQUIRED" }`

The temporary HTTP probe fixture was then removed. Follow-up verification showed no probe residue.

## Configured-provider status

At certification time the production database contains **0 configured `communication_provider_accounts`**. No Resend/Twilio credentials or provider account were invented merely to make the gate green.

Therefore:

`providerConfiguredIntegrationVerification = PENDING_NOT_CONFIGURED`

This is compliant with the Phase 11.4 contract, which requires provider integration where configured. Real configured-provider/sandbox evidence remains required if/when an integration is enabled, and overall Phase 11.4 cannot close until the 11.4-D certification gate is satisfied.

## Exit decision

**11.4-C exit gate: PASS.**

This does **not** close Phase 11.4. Slice 11.4-D must still deliver and certify the unified communications experience, review queue, search, unanswered-client state/SLA, real browser/mobile acceptance, fresh-workspace bootstrap, exact merged/deployed SHA, and post-merge recertification. Phase 11.5 remains locked.
