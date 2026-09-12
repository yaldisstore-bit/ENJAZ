# Phase 9.4 — Regulatory / Knowledge Base Engine — Real Cloud Evidence

Status: **PASS_ZERO_RESIDUE**

Supabase project: `juzxriirhkuzviwnhkbd`

## Applied Phase 9.4 migrations

- `20260911072927` — `phase_9_4_regulatory_knowledge_persistence`
- `20260911073147` — `phase_9_4_regulatory_knowledge_fk_index_hardening`
- `20260911073533` — `phase_9_4_regulatory_knowledge_service_role_bridge`
- `20260911141327` — `phase_9_4_regulatory_version_generated_search_guard_hardening`
- `20260911141412` — `phase_9_4_live_authenticated_regulatory_probe`

## Authority boundary verified

- `regulatory_sources`, `regulatory_source_versions`, and `regulatory_derived_artifacts` have RLS enabled.
- Browser roles receive no direct INSERT / UPDATE / DELETE table authority.
- Official-global ingestion RPC is unavailable to `anon` and `authenticated` and executable by `service_role` only.
- Workspace-curated version mutation requires the organization owner through the existing M15 authority helpers.
- Derived editorial / AI artifacts require an authorized organization actor and are persisted with `authoritative=false`.
- Public regulatory RPCs remain `SECURITY INVOKER`; privileged implementation functions stay in `private` with a pinned empty `search_path`.

## Destructive Real Cloud journey

The production schema was attacked with a transaction-isolated probe covering:

1. official-global revision 1 ingestion;
2. exact idempotent replay;
3. official-global revision 2 append and revision-1 half-open interval closure;
4. authenticated/anon official-ingestion ACL denial;
5. owner-authorized workspace-curated revision 1;
6. curated replay;
7. stale expected-revision rejection;
8. curated revision 2 append and deterministic supersession;
9. AI-summary artifact creation with `authoritative=false`;
10. derived-artifact replay without duplication;
11. historical as-of resolution for both official and curated sources;
12. cross-workspace derived-artifact denial;
13. direct browser-table mutation privilege denial;
14. outsider read denial for workspace-curated truth while authenticated official-global reading remains allowed;
15. audit evidence for workspace-sensitive writes.

All fixtures were executed inside a PL/pgSQL exception subtransaction and deliberately rolled back. A separate post-probe query confirmed:

- probe workspaces: `0`
- probe memberships: `0`
- probe sources: `0`
- probe versions: `0`
- probe artifacts: `0`
- probe audit events: `0`

Result: **PASS_ZERO_RESIDUE**.

## Defect discovered by the Real Cloud probe

The first real multi-version append exposed a genuine database defect: the immutable-version trigger compared `to_jsonb(NEW)` to `to_jsonb(OLD)` while `search_document` is a `GENERATED ALWAYS` column. In a `BEFORE UPDATE` trigger that generated field can have a transient value, so the guard incorrectly rejected the legitimate history-closing update with `ENJAZ_REGULATORY_VERSION_IMMUTABLE`.

The fix does not weaken immutability. The comparison now excludes only:

- `effective_to` — the allowed half-open history close;
- `ended_by_operation_id` — the audit operation closing that interval;
- `search_document` — a generated derivative of immutable official text/title.

Every other current or future non-derived business field remains in the fail-closed JSON comparison. Delete remains forbidden. The defect received a permanent regression test.

## Advisors after certification

- Phase-owned security advisor warnings: **0**.
- Phase-owned unindexed foreign keys: **0**.
- Existing advisor findings outside regulatory tables/functions belong to earlier systems and are not introduced by Phase 9.4.
- New regulatory indexes may initially appear under the informational `unused_index` advisor until production workload uses them; that is not an integrity/security defect.

## Certification decision

Persistence status: **REAL_CLOUD_CERTIFIED**.

This certification opens Phase 9.4 Runtime/UI implementation. It does **not** close Phase 9.4, does not authorize Phase 9.5, and does not promote M8 globally to CLOSED.
