# Phase 13.4 — Hosted Supabase DB/RLS Evidence

**Status:** HOSTED DB/RLS VERIFIED / AUTH-API TRANSPORT PENDING  
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

## Remaining certification gap

This evidence is a real hosted Supabase PostgreSQL/RLS certificate, but it is **not yet the Auth-API transport certificate** required by the original branch-only Node harness.

The connected Supabase tooling exposes the lab URL and publishable/anon keys but not the lab service-role/secret key needed for Auth Admin user creation. The ordinary execution environment also cannot reach the external Auth endpoint directly. No production credential is permitted as a substitute.

Therefore:

- Hosted DB/RLS: **PASS**
- source + disposable PostgreSQL: **PASS**
- zero residue: **PASS**
- Auth-API / real user token transport: **PENDING**
- production deployment: **NOT AUTHORIZED**
- automatic repair: **NOT AUTHORIZED**
- Phase 13.5: **LOCKED**
