# ENJAZ Phase 12.3 — A3-B Follow-up Create Real Cloud Evidence

**Decision:** PASS / CERTIFIED  
**Scope:** second low-risk action-specific adapter only: `followup.create`.

## Certified source and live deployment

- Certified source head: `50a1a6dbb344c4b9f953622522227708ee60c570`.
- A3-B source gate: run `35365775441` / Gate #26 — **SUCCESS**.
- Database migration: `phase_12_3_agentic_action_followup_create` version `20260918155614`.
- JS/PostgreSQL nested action hash probe: `2bfd1cff89208f10e1cb57e26d4ed97d880a4d74047c346d08ecd141dd4b252f` — exact match.
- Edge Function: `enjaz-copilot-agent` version **3**, `verify_jwt=true`.
- Edge source head: `dc92b4055815e64e9d5490b39aaee676e78c42de`.
- Edge deployment digest: `fb734498925bddb4bc9585a663a6047eaad883fb3508715f8be50a709c660721`.
- Real Cloud workflow: run `35365775737` / #1 — **SUCCESS**.
- Real Cloud checks: **33/33 PASS**, zero reported failures.

## Real Cloud destructive coverage

The authenticated fresh-workspace probe proved:

- malformed transaction IDs and invalid titles remain explicit 400 validation errors.
- browser/authenticated callers cannot directly register private action proposals.
- PostgreSQL independently recomputes the nested title SHA-256 and outer action digest.
- exact transaction ID, pre-generated follow-up ID, title and due timestamp are bound before approval.
- prepare replay is idempotent.
- execution before explicit approval is denied with zero mutation.
- cross-workspace prepare is denied.
- tampered proposal hashes are denied.
- business fields cannot be injected into the execution request.
- explicit approval is required and recorded.
- execution creates exactly the approved follow-up through `create_transaction_followup_v1`.
- the created row matches the approved transaction, follow-up ID, title and due timestamp exactly.
- exact execution replay is idempotent and creates no duplicate follow-up.
- when the transaction becomes invalid after approval, the domain RPC fails and proposal consumption is rolled back atomically.
- the owner workspace receives exactly one expected agent-created follow-up.
- the foreign workspace receives zero agent-created follow-ups.

## Live zero-residue verification

A direct post-run Supabase verification returned:

- test auth users: **0**
- test companies: **0**
- test transactions: **0**
- test follow-ups: **0**
- `private.copilot_agent_proposals`: **0**
- `private.copilot_agent_approval_events`: **0**

## Advisor posture

- Security Advisor total remains **65** with **0 Copilot-related security findings**.
- Unindexed foreign keys remain at the pre-A3 baseline: **28**.
- No new performance WARN finding is attributable to A3-B.
- The fresh `copilot_agent_proposals_action_transaction_idx` may appear as an expected unused-index INFO until representative traffic accumulates.

## Authority decision

A3-B certifies exactly two low-risk executable adapters in Phase 12.3:

- `followup.snooze`
- `followup.create`

There is still no generic execute tool. Service-role business reads/writes remain forbidden. Finance, ownership, workflow transitions, document publication, communications dispatch and permissions remain locked. Phase 12.4 remains LOCKED.
