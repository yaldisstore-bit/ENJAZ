# ENJAZ Phase 8.5 — Real Cloud + Real Chromium Evidence

Status: **PASS — ZERO RESIDUE**

Base main SHA: `4fff1f6b25687d8ca305edac3d5a033e77e224c9`  
Implementation branch: `phase8-5-multi-branch-teams`  
Supabase project ref: `juzxriirhkuzviwnhkbd`

## Real Chromium

Certified browser head: `878515b3e31447ff782f2526c0d25b923bd07d05`  
GitHub Actions run: `34316783572`

The Phase 8.5 gate passed **9/9 Real Chromium tests** after the 320px geometry repair and selector hardening. The same run also passed:

- closed Phase 8.4 preservation;
- Phase 8.5 static organization audit;
- 9/9 M15 command/authority tests;
- 217/217 full functional regression tests;
- database + roadmap integrity;
- secrets audit + TypeScript;
- production build with the unchanged JavaScript ceiling;
- isolated Phase 8.5 preview build and preview-size gate.

Production JavaScript remained **669,685 / 670,000 bytes**. M15 remains an isolated live phase slice and is not promoted into the canonical runtime in Phase 8.5.

## Real Cloud schema application

The live ENJAZ project was confirmed `ACTIVE_HEALTHY` before applying Phase 8.5. Preflight showed that the organization tables/RPCs did not yet exist.

The production database accepted these migrations in order:

1. `phase_8_5_multi_branch_departments_teams_m15`
2. `phase_8_5_m15_fk_index_hardening`
3. `phase_8_5_live_authenticated_organization_probe`

Post-DDL verification proved:

- all seven M15 authority tables exist;
- RLS is enabled on all seven tables;
- seven scoped SELECT policies exist;
- authenticated direct table mutation remains denied;
- all eight public M15 RPCs are `SECURITY INVOKER` with an empty `search_path`;
- all private authorization/mutation helpers are `SECURITY DEFINER` with an empty `search_path`;
- `anon` has no EXECUTE authority on the public M15 RPCs;
- authenticated has the intended EXECUTE authority on the public RPC surface.

## Supabase advisor hardening

The first post-DDL performance advisor identified Phase 8.5 foreign keys without covering indexes. No budget, authorization, or data-semantics workaround was used.

`phase_8_5_m15_fk_index_hardening` added fourteen targeted indexes covering the newly introduced M15 foreign keys. The subsequent performance advisor returned **zero `unindexed_foreign_keys` findings for M15 tables**.

The post-probe security advisor returned **no Phase 8.5 security warning**. Remaining advisor findings belong to predecessor functionality/project-wide settings and are not introduced by M15.

## Authenticated destructive cloud probe

`phase_8_5_live_authenticated_organization_probe` ran against the real production database using the same `auth.uid()` JWT claim boundary used by authenticated requests.

Because the live project had one real owner and no second user, the probe created a fixed temporary Auth workforce identity. ENJAZ's existing Auth bootstrap trigger created that user's own isolated workspace. The probe then added that identity to the real owner's workspace **only through `organization_members`**, never through `workspace_memberships`.

The probe verified all of the following before cleanup:

- real owner `auth.uid()` resolution;
- authenticated organization tables are read-only and direct DML fails closed;
- owner authority context reports `organization_structure_scoped_ownership`;
- legacy workspace trust remains `owner_only_unchanged`;
- workforce authority remains `organization_members_and_scope_memberships`;
- transaction lifecycle write authority remains `none`;
- finance-ledger write authority remains `none`;
- owner can create branch → department → team through guarded RPCs;
- stale branch writes fail with `ENJAZ_ORG_BRANCH_STALE`;
- owner can add an existing Auth identity as workforce without creating a legacy membership;
- owner can grant an explicit branch-manager source membership;
- branch membership inherits downward to the branch's department/team;
- sibling branch/department/team rows remain invisible through RLS;
- inherited access returns the exact source membership ID and source scope/role;
- workforce cannot mutate owner-governed structure;
- workforce cannot transfer operational ownership into an unmanaged sibling branch;
- a branch manager can transfer ownership to a managed descendant team;
- cross-workspace organization access fails closed;
- ownership assignment + transfer create exactly two ownership audit events;
- transaction status, priority, fee, and `updated_at` remain unchanged;
- zero `payments` and zero `financial_ledger_entries` are created by organizational ownership changes.

## Zero-residue proof

The probe deletes its own exact-ID fixtures, its temporary bootstrapped workspace/Auth identity, related audit rows, and its private helper functions before committing.

An independent post-probe census returned:

- temporary Auth users: **0**
- probe companies: **0**
- probe transactions: **0**
- organization members: **0**
- probe branches: **0**
- probe departments: **0**
- probe teams: **0**
- transaction organization ownership rows: **0**
- ownership event rows: **0**
- private Phase 8.5 probe helper functions: **0**

This is a true zero-residue Real Cloud pass.

## Current gate position

Real Cloud: **PASS**  
Real Chromium: **PASS**  
Post-merge recertification: **PENDING**  
Phase 8.5 status: **IN PROGRESS** until exact-head PR gates, merge, and exact merged-SHA recertification complete.  
Phase 8.6: **LOCKED**.
