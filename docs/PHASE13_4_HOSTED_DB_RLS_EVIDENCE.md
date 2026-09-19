# Phase 13.4 — Hosted Supabase DB/RLS Evidence

**Status:** REAL CLOUD IMPLEMENTATION CERTIFIED / FORMAL CLOSURE PENDING  
**Production project ref:** `juzxriirhkuzviwnhkbd` — unchanged by this evidence.  
**Isolated lab project ref:** `nqhgaukutkyvfumbtbtg`  
**Region / engine:** `eu-central-1` / PostgreSQL 17.6  
**Successor:** Phase 13.5 remains **LOCKED**.

## Isolation path

The intended Supabase development-branch path was attempted after explicit cost confirmation at **USD 0.01344/hour**, but Supabase rejected branch creation because the ENJAZ organization is on the Free plan and Branching requires Pro or above. No branch was created and no hourly branch cost began.

A separate project was then cost-checked at **USD 0/month**, explicitly confirmed, and created in the same Supabase organization and region as a disposable Phase 13.4 lab. Production was never used as the destructive target.

## Lab schema and security alignment

The lab contains only the Phase 13.4 minimum relational surface:

- `workspaces`
- `workspace_memberships`
- `import_jobs`
- `contacts`
- `companies`
- `transactions`

The initial lab scaffold exposed `workspaces` and `workspace_memberships` without RLS. Before certification, their grants and policies were aligned to the current production contract:

- anon SELECT/INSERT/UPDATE/DELETE denied;
- `workspaces`: authenticated SELECT/INSERT/UPDATE using owner/member policies;
- `workspace_memberships`: authenticated SELECT/INSERT only, using self/owner policies;
- `private.is_workspace_owner(uuid)` remains the canonical owner boundary;
- the four reconciliation source tables retain workspace-scoped RLS.

After alignment, Supabase security advisors returned **0 lints**.

## Installed reviewed source

The lab installed the reviewed Phase 13.3 import authority and Phase 13.4 proposals only:

- Phase 13.3 ordered import execution;
- idempotency fast-path;
- replay hardening;
- conflict SQLSTATE hardening;
- Phase 13.4 A2 readback;
- Phase 13.4 A3 trusted comparison.

The lab also received the final A3 rowset-alignment implementation from source SHA `98e477e103ddd6afeb49622e9ed1b61a115b8129`.

## Hosted DB/RLS certificate v1

A transactional cloud certificate executed the real Phase 13.3 import RPC under Supabase's actual `authenticated` role and `auth.uid()` contract, using synthetic JWT claim IDs only inside the isolated lab. It verified:

- missing import job fails closed in A2 and A3;
- anon cannot execute A2 or A3;
- outsider cannot read/compare the owner's workspace;
- real Phase 13.3 import succeeds atomically;
- clean A2 readback returns the exact three ordered rows;
- exact decimals `120.50` / `135.25` survive readback;
- company/contact relationship IDs are exact;
- clean A3 comparison reports 3/3 matched but never grants reconciliation or closure authority;
- exact import replay is idempotent;
- same-workspace member can see the base ledger through membership RLS but cannot bypass canonical-owner A2/A3;
- relationship, money and lifecycle drift are detected;
- one company carrying identity + lifecycle + field + money + relationship drift preserves all five difference codes;
- restoring that row returns equality without closure authority;
- mutually corrupted durable counts fail closed.

The migration succeeded and then deleted every synthetic row before commit.

## Hosted DB/RLS adversarial certificate

A second successful transactional certificate verified:

- exact replay remains deterministic;
- changed-payload replay with the same idempotency identity conflicts;
- forged manifest fails A2 and A3;
- wrong idempotency and wrong batch fail closed;
- normalized field drift is explicit;
- legacy/source identity drift is explicit;
- missing transaction remains visible in A2 and becomes exactly `MISSING_TARGET` in A3;
- an unfinished ledger (`finished_at IS NULL`) is rejected by both A2 and A3.

Again, all synthetic rows were deleted before commit.

## 5000-item cloud defect and fix

The first hosted A3 attempt at the documented maximum of **5000 items** failed inside Supabase with:

`could not write to file ... pgsql_tmp ... No space left on device`

The failing migration transaction rolled back completely, leaving zero test rows and no failed migration entry.

The source cause was the A3 comparison repeatedly indexing the large materialized `observedRows` JSON array by ordinal before building a second report array. A lab-only candidate changed this to:

- materialize expected items once;
- materialize observed rows once with ordinality;
- join the two rowsets on ordinal.

With that equivalent rowset alignment, hosted A2 **5000** and A3 **5000** both succeeded in the same Free-plan Supabase lab. A dedicated **5001** certificate also succeeded by proving both A2 and A3 fail closed above the hard limit.

The same optimization was then promoted to draft PR #214 with a source regression test forbidding the old repeated JSON array indexing pattern.

## Zero residue

Post-certificate read-only checks report:

- workspaces: **0**
- workspace memberships: **0**
- import jobs: **0**
- contacts: **0**
- companies: **0**
- transactions: **0**

Supabase security advisors: **0 lints**.

Only reviewed schema/functions and migration history remain in the disposable lab.

## Exact production RLS policy parity

After the initial hosted certificates, the six-table lab RLS surface was compared directly against production rather than assumed equivalent. The lab was completed to match the production policy set and then re-certified:

- production policy count across `workspaces`, `workspace_memberships`, `import_jobs`, `contacts`, `companies`, and `transactions`: **15**;
- isolated lab policy count across the same six tables: **15**;
- normalized policy names, roles, commands, `USING` expressions and `WITH CHECK` expressions: **15/15 exact parity**;
- a dedicated hosted role/claim certificate proved RLS is actually enforced under `SET ROLE authenticated` + `auth.uid()`: outsider sees **0** owner-ledger rows, canonical owner sees **1**, same-workspace member sees **1**;
- after exact policy parity, the real Phase 13.3 import + owner A2/A3 + member/outsider/anon boundary certificate was re-run successfully;
- post-certificate residue remained **0** across Auth marker users and all six fixture tables; security/performance advisors remained **0 lints**.

This closes the risk that the hosted lab might have passed against a weaker or materially different RLS policy surface than production.

## Auth API / real-user-token certificate

A final hosted Auth transport certificate was executed on the same isolated project without exposing any service-role credential outside Supabase.

The certificate used a temporary Edge Function authenticated with Supabase's current `@supabase/server` `auth: "publishable"` boundary. The public low-privilege publishable key was supplied on the `apikey` header through `pg_net`; the function obtained its isolated-project admin client only from Supabase-managed runtime secrets.

The invocation returned **HTTP 200** with schema `enjaz.phase13-4.auth-api-edge-certificate.v2`, `passed=true`, `functionalPassed=true`, and `cleanupPassed=true`. It executed **10/10 PASS checks**:

- real Auth users were created and signed in;
- owner JWT missing-job A2/A3 fail-closed;
- anonymous A2/A3 RPC execution denied;
- outsider JWT cannot read or compare the owner workspace;
- owner JWT executes the real Phase 13.3 ordered-import RPC;
- owner JWT receives the exact A2 readback;
- owner JWT receives clean A3 snapshot equality with no closure authority;
- same-workspace member can see the base ledger through RLS but cannot bypass canonical-owner A2/A3;
- forged manifest fails closed under a real owner token;
- exact replay remains idempotent under a real owner token.

After the response, the temporary certificate Function was replaced by version **4** returning fixed **410 Gone** with `verify_jwt=true`. The temporary invocation table was dropped.

Final read-only residue verification reports:

- marked Auth users: **0**
- workspaces: **0**
- workspace memberships: **0**
- import jobs: **0**
- contacts: **0**
- companies: **0**
- transactions: **0**
- temporary invoke table: **absent**
- Supabase security-advisor lints: **0**
- Supabase performance-advisor lints: **0**

No production credential or production mutation was used.

## Implementation certification decision

Combined source, disposable PostgreSQL, hosted DB/RLS/adversarial/limit and real Auth-token transport evidence now satisfies the Phase 13.4 implementation certificate.

Therefore:

- Hosted DB/RLS: **PASS**
- Auth API / real user token transport: **PASS**
- source + disposable PostgreSQL: **PASS**
- 5000 accepted / 5001 fail-closed: **PASS**
- zero residue: **PASS**
- production deployment: **NOT AUTHORIZED BY THIS IMPLEMENTATION CERTIFICATE**
- automatic repair: **NOT AUTHORIZED**
- formal Phase 13.4 closure: **PENDING exact PR-head gates, implementation merge, exact-main/deployed-live recertification**
- Phase 13.5: **LOCKED**
