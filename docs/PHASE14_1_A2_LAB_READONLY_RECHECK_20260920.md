# Phase 14.1 A2 — isolated lab read-only recheck (2026-09-20)

**Scope:** Direct read-only inspection of the existing disposable Supabase lab `nqhgaukutkyvfumbtbtg`, plus comparison to the existing production project's **function catalog only**. This is a preparatory structural/empty-state observation, **not** an authenticated real-user / JWT / RLS / complete eleven-domain journey certificate.

## Verified live lab inventory

- The isolated lab reports `ACTIVE_HEALTHY`.
- The lab has **124 public base tables**, **124 public tables with RLS enabled**, and **200 public functions**.
- Exact current Phase 14.1 structural requirements: **23/23 named business tables present, 23/23 RLS enabled, 13/13 named public RPCs present** (see `docs/PHASE14_1_A2_HOSTED_PREREQUISITES.json`).
- The `auth.users` trigger named `enjaz_bootstrap_auth_user` exists and is enabled. Presence is catalog-level evidence, **not** proof of actual Auth signup or workspace bootstrap.
- At the time of observation, counts were zero for `auth.users`, `auth.sessions`, `public.workspaces`, `public.companies`, `public.transactions` and `storage.objects`. **This is a pre-run empty-state snapshot, not post-run zero-residue cleanup evidence.**

## Function-parity caveat (read-only catalog comparison)

The current lab has **437** functions across `public` and `private` versus **439** in production. These two production signatures were not present in the lab:

- `private.get_scheduling_calendar_v1_impl(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer)`
- `public.get_scheduling_calendar_v1(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,integer)`

A raw `md5(pg_get_functiondef(oid))` catalog comparison additionally reported **61 differing definition strings** among matching signatures. A differing string hash does **not** by itself establish a runtime or authorization defect: a reviewed semantic/function-privilege comparison is required before replaying any migration. Do not copy untracked production functions or grant additional privileges just to match hashes. The historical lab-structure report predates the later Auth-trigger repair and must not be used to infer that bootstrap is still absent.

## What is still blocked

- The last isolated GitHub Auth/import smoke, run [35525512497](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35525512497), failed **before network/fixtures** because its runner received no lab URL, publishable/anon key or secret/service-role key. GitHub's protected environment-secret values are not available via the current repository connector, so a direct successful rerun has **not** been observed.
- GitHub protected environment `phase13-4-isolated-real-cloud` needs three **lab-only** secrets: `PHASE13_4_SUPABASE_URL`, `PHASE13_4_SUPABASE_PUBLISHABLE_KEY`, `PHASE13_4_SUPABASE_SECRET_KEY`. The URL must be exactly `https://nqhgaukutkyvfumbtbtg.supabase.co`; other keys must be retrieved from this same lab and entered **only** into protected GitHub settings, never source, evidence or chat.
- The existing Auth/import smoke is **not** the complete A2 test. A genuine, independent owner/member/denied-role/outsider/client JWT and RLS journey across all eleven domains, negative permissions, money/replay/rollback, marked test cleanup and zero residue is still required. Full A3 mobile/published portal and exact-main deployed-live checks remain separate.

**Safety:** Keep PR #225 a draft, Phase 14.1 in progress and 14.2 locked. No production writes or destructive probes; no new paid branch; no assumption that RLS enabled means its row policies were proven with actual independent users.
