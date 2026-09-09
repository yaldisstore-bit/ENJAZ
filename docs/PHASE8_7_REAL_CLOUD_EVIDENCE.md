# ENJAZ Phase 8.7 — Real Cloud Zero-Escape Evidence

Status: **PASS — ZERO RESIDUE**

Phase: **8.7 — Operations Zero-Escape Destruction Gate**
Implementation branch: `phase8-7-operations-zero-escape`
Certified branch head before this evidence commit: `4422f7913fc7a94f7bc4bf923c9fa93ebcc3586c`
Supabase project: `ENJAZ`
Project ref: `juzxriirhkuzviwnhkbd`
Project health at verification: **ACTIVE_HEALTHY**
PostgreSQL: **17.6.1**

## Real defect under test — M17 concurrent intake abuse escape

The Phase 8.4 public-intake limiter originally performed a recent/hourly event count followed by event insertion without serializing competing requests for the same secure link. Multiple concurrent save/submit requests could therefore observe the same stale count before any competing insert committed.

Phase 8.7 repaired this without adding a table, public RPC, or new write authority. Production accepted migration:

- `20260909094008 phase_8_7_intake_rate_limit_serialization`

The private `private.enforce_public_intake_rate_v1(uuid,text)` function now locks the parent `intake_links` row with `FOR UPDATE` before count + decision + insert. The existing limits remain unchanged: **120/hour** and **4 save/submit events per 30 seconds**.

Security verification on the live database proved:

- function remains `SECURITY DEFINER` only because it is an existing private authority helper;
- `search_path` remains empty;
- `anon` direct EXECUTE = **false**;
- `authenticated` direct EXECUTE = **false**;
- the function body contains the per-link `FOR UPDATE` serialization point;
- the production public RPC remains the only public intake write entry point.

## Concurrent Real Cloud destruction

A dedicated isolated fixture used one temporary intake form, one optional text field and one secure link. The raw bearer token was never stored; only its SHA-256 hash was inserted.

Probe migrations:

- `20260909094235 phase_8_7_live_m17_concurrency_probe_fixture`
- `20260909094403 phase_8_7_live_m17_concurrency_dispatch` — transport attempt with the retired legacy anon key; all five calls returned HTTP 401 and produced **zero write events / zero submissions**. This attempt is retained as negative transport evidence and was not counted as the concurrency test.
- `20260909094439 phase_8_7_live_m17_concurrency_dispatch_publishable` — five requests queued in one transaction through the installed `pg_net 0.20.4`; all began after the same commit using the current publishable API key.
- `20260909094526 phase_8_7_live_m17_concurrency_probe_cleanup`

The five simultaneous `save_public_intake_v1` requests produced exactly:

- **4 × HTTP 200**;
- **1 × HTTP 500 / SQLSTATE 54000 / `ENJAZ_INTAKE_RATE_LIMITED`**;
- **0 timeouts**;
- all four successful responses referenced the **same submission identity**;
- successful response versions resolved to **1, 2, 3, 4**;
- database census before cleanup: **4 save_draft events, 0 submit events, 1 submission, version 4, status draft**.

This is the required concurrency property: the fifth concurrent request cannot pass the four-write/30-second boundary, and the successful requests do not create duplicate submissions.

## Zero-residue cleanup

The cleanup migration removed the probe in dependency-safe order. The final production census returned:

- probe links: **0**;
- probe forms: **0**;
- probe form fields: **0**;
- probe submissions: **0**;
- probe intake events: **0**.

No temporary extension, table, public RPC, execute grant, Storage object or business record remains from this probe. The pre-existing `pg_net` extension was reused and not modified.

## Advisor review

After the repair, the private rate-limit helper itself is not reported as anon/authenticated executable. Security advisor findings remain on intentionally public/authenticated pre-existing Phase 8 RPC surfaces and Auth configuration; the Phase 8.7 repair did not grant new public or authenticated execution authority. Performance advisor findings are unrelated pre-existing index advisories; the serialization repair introduces no new table or foreign key.

## Gate result

**M17 concurrent abuse destruction: PASS — ZERO RESIDUE.**

This Real Cloud result strengthens but does not close Phase 8.7. M1/M5/M6/M17 and the Phase-8 portion of M15 still require the complete Phase 8.7 Zero-Escape gate, Real Browser, deployed-live evidence, exact-PR matrix, merge and exact-main post-merge recertification before Phase 9.1 may be authorized.
