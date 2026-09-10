# Phase 9.2 — Real Cloud Certification Evidence

Status: **PASS — authenticated zero-residue destruction probe completed on ENJAZ production Supabase**

## Target

- Supabase project: `juzxriirhkuzviwnhkbd` (`ENJAZ`)
- Project status during certification: `ACTIVE_HEALTHY`
- PostgreSQL: 17.x hosted Supabase

No service-role key was placed in the browser or repository runtime. Database verification was executed through the connected administrative Supabase control plane; the product runtime remains publishable-key only.

## Production baseline defect discovered and repaired

The production database still contained the Phase-1 `public.saved_views` table shape (`surface / filters / sort / pinned / position`) while Phase 9.2 owns a new definition-only authority contract. The legacy table contained **0 rows**.

A fail-closed migration guard was therefore added before the Phase 9.2 persistence migration:

- if no `saved_views` table exists: no-op;
- if the Phase 9.2 schema already exists: no-op;
- if a legacy schema contains rows: abort with `ENJAZ_SAVED_VIEWS_LEGACY_DATA_REQUIRES_MANUAL_MIGRATION`;
- only an empty legacy table may be replaced;
- `DROP ... CASCADE` is forbidden.

This prevents silent deletion of saved user definitions in any other environment.

## Applied production migration chain

The following migrations were applied successfully to the real ENJAZ Supabase project:

1. `20260910103833` — `phase_9_2_00_saved_views_legacy_guard`
2. `20260910103933` — `phase_9_2_saved_views_search_intelligence`
3. `20260910104006` — `phase_9_2_global_search_intelligence`
4. `20260910104151` — `phase_9_2_global_search_invoker_grant_fix`
5. `20260910104751` — `phase_9_2_live_authenticated_search_saved_views_probe`
6. `20260910104851` — `phase_9_2_saved_views_fk_index_hardening`

## Runtime authority defect discovered and repaired

The first real privilege inspection found that `public.global_search_v1` was correctly `SECURITY INVOKER`, but its delegated private helper had no `EXECUTE` grant for `authenticated`. Static tests had not exposed this runtime bridge problem.

The repair preserves the intended model:

- public `global_search_v1`: authenticated execute = **YES**, anon execute = **NO**, SECURITY DEFINER = **NO**;
- private `global_search_v1_impl`: authenticated execute = **YES**, anon execute = **NO**;
- the public wrapper remains SECURITY INVOKER;
- no source-business write authority was added.

## Saved Views live database contract

Verified against production after migration:

- `public.saved_views` RLS = **enabled**;
- authenticated table privilege = **SELECT only**;
- authenticated INSERT / UPDATE / DELETE = **NO**;
- anon SELECT = **NO**;
- only visible-row policy: `saved_views_select_authorized`;
- canonical columns include `owner_user_id`, `domain`, `visibility`, `team_id`, `definition`, `version`, `operation_id`, `deleted_at`;
- canonical definition/schema/domain/size and visibility-target constraints are present;
- optimistic version and operation-id uniqueness indexes are present;
- owner-user foreign key is covered by `saved_views_owner_user_fk_idx` after the post-DDL performance advisor identified the missing standalone coverage.

## Authenticated destructive proof

`phase_9_2_live_authenticated_search_saved_views_probe` executed successfully inside a transaction using the same `auth.uid()` JWT-claim simulation pattern certified in earlier ENJAZ cloud phases.

The probe proved:

- an isolated Workforce actor cannot search another workspace before M15 membership;
- saved-view metadata does not leak cross-workspace;
- direct browser DML on `saved_views` is denied;
- Owner RPC creation succeeds for personal, team and workspace visibility;
- create replay with the same operation id is idempotent;
- stale optimistic version writes fail closed;
- Owner global search returns canonical results across all five domains: transactions, companies, people, procedures and documents;
- every returned deep link is internal under `/app/`;
- after a single team-scoped M15 membership and transaction ownership assignment, Workforce sees team/workspace views but not personal views;
- Workforce global search reveals the assigned transaction only and does not reveal owner-only companies/people/procedures/documents;
- Workforce cannot create a workspace-shared view without Owner authority;
- Saved Views/Search operations do not mutate transaction lifecycle or finance truth.

## Zero-residue proof

After the authenticated destruction probe, elevated verification returned zero for all probe residue classes checked, including:

- temporary auth user;
- temporary workspace;
- saved views;
- company/contact/transaction/document fixtures;
- organization member/scope/ownership fixtures;
- Saved View audit rows created by the probe.

The probe helper functions were dropped before commit.

## Supabase advisors after Phase 9.2 DDL

Security Advisor reported **no finding introduced by Phase 9.2**. Existing warnings belong to previously shipped Intake/CRM/Workflow surfaces and Auth leaked-password configuration and are outside this phase's authority boundary.

Performance Advisor initially identified `saved_views_owner_user_id_fkey` as uncovered. Phase 9.2 added `saved_views_owner_user_fk_idx`. Other advisor findings belong to pre-existing tables/indexes outside Phase 9.2.

## Real Cloud conclusion

Phase 9.2 Real Cloud authority is **PASS**. This evidence does not by itself close Phase 9.2: Real Chromium, exact-head pull-request gates, merge, Pages `/live` publication and post-merge recertification are still required before `phase9_3Allowed` may become true.
