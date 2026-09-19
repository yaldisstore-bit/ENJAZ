# Phase 13.4 — Reconciliation — Formal Closure Evidence

**Decision proposed:** PASS / formally close Phase 13.4.  
**Date:** 2026-09-19.  
**Predecessor:** Phase 13.3 closure `ee14330d5aa5d4da51b7e5d5c7fe7b4d64dae584`.  
**Implementation PR:** #214.  
**Certified implementation head:** `97ce9a65a9b9a062b43868241ebd0520f970543c`.  
**Implementation merge / exact-main SHA:** `cbf654ccc3728bb639d057883ad0847f7721d38e`.  
**Successor after this closure merges:** Phase 13.5 — Import Destruction Gate.

## Product and authority boundary

Phase 13.4 closes only the explicit reconciliation evidence boundary for the Phase 13.3 ordered-import contract. A2 reads the exact hash-bound import ledger and imported target rows; A3 compares the original manifest to A2 evidence inside PostgreSQL. Both production functions are `STABLE SECURITY INVOKER`, owner/RLS scoped, callable only by `authenticated`, and read-only.

Snapshot equality never sets `reconciled=true`, never grants `closureAuthorized`, never repairs, deletes or reimports a row and never expands the Phase 13.3 write boundary. This closure does not claim that any specific user's historical import was reconciled; Phase 13.5 must independently destroy/test the import boundary before any wider authority.

## Implementation PR certificate

PR #214 exact head `97ce9a65a9b9a062b43868241ebd0520f970543c`:

- **87/87 completed = 86 SUCCESS + 1 expected SKIPPED; 0 failures, 0 pending**.
- Phase 13.4 Gate `35440635266`: SUCCESS.
- Quality `35440635413`: SUCCESS.
- Real Browser `35440635371`: SUCCESS.
- Hosted Real Cloud implementation certificate: PASS with zero residue.

## Source / PostgreSQL regression certificate

Exact-main Phase 13.4 Gate `35441049046`:

- A1 plan tests: **6/6**.
- A1 destruction tests: **6/6**.
- A2 readback source tests: **5/5**.
- A2/A3 DB-source tests: **6/6**.
- Real Cloud workflow source guard: **4/4**.
- cloud-preflight guard: **4/4**.
- preserved Phase 13.3 execution tests: **32/32 + 14/14**.
- functional regression: **219/219**.
- disposable PostgreSQL 17: **16 A2 PASS + 17 A3 PASS**.

## Real Cloud certificate

Disposable Supabase project `nqhgaukutkyvfumbtbtg` in `eu-central-1` proved:

- exact production policy parity: **15/15**;
- owner / outsider / same-workspace non-owner / anon isolation;
- real Phase 13.3 ordered import;
- exact decimal and relationship readback;
- identity, lifecycle, field, money and relationship drift;
- missing targets, forged manifest, wrong batch/idempotency, corrupt/unfinished ledger states;
- exact replay idempotency;
- hosted A2/A3 **5000 PASS** and **5001 fail-closed PASS** after the A3 rowset-alignment fix;
- real Auth user creation/sign-in and JWT transport: **10/10 PASS**;
- final Auth/data residue: **0**;
- lab security and performance advisor lints: **0 / 0**.

Full hosted evidence: `docs/PHASE13_4_HOSTED_DB_RLS_EVIDENCE.md`.

## Production read-only deployment

After implementation merge and exact-main recertification, the certified functions were installed on production project `juzxriirhkuzviwnhkbd`:

- `20260919125100 phase_13_4_reconciliation_readback`
- `20260919125103 phase_13_4_a3_trusted_comparison`
- `20260919125253 phase_13_4_production_comment_normalization`

Live metadata proves for A2 and A3:

- `SECURITY DEFINER=false` → SECURITY INVOKER;
- volatility `STABLE`;
- `anon EXECUTE=false`;
- `PUBLIC EXECUTE=false`;
- `authenticated EXECUTE=true`.

Phase-owned production Security Advisor findings: **0**. The deployment created no Phase 13.4 table and performed no business-row insert/update/delete.

## Exact-main / deployed-live certificate

On exact implementation main `cbf654ccc3728bb639d057883ad0847f7721d38e`:

- **48/48 workflow runs completed = 42 SUCCESS + 6 expected duplicate workflow_run SKIPPED**;
- failures / queued / in-progress: **0 / 0 / 0**;
- Phase 13.4 Gate `35441049046`: SUCCESS;
- Quality `35441049230`: SUCCESS;
- Real Browser `35441049242`: SUCCESS;
- Pages build/deployment `35441048370`: SUCCESS;
- Pages Preview `35441105457`: SUCCESS;
- Live External `35441132445`: SUCCESS;
- Published Client Portal `35441132432`: SUCCESS;
- Project Quality Constitution `35441049135`: SUCCESS;
- Major Systems Zero-Escape `35441049016`: SUCCESS.

Repeated downstream workflow_run events after the first successful Pages/Live/Portal certificates were skipped by design and are recorded as expected skips, not failures.

## Frozen performance and four-track quality

- Initial JavaScript: **431224 / 670000 bytes**.
- Total JavaScript: **759952 / 760000 bytes**.
- CSS: **179989 / 180000 bytes**.
- Product: PASS.
- UI/UX: PASS — no client delta; cumulative Real Browser and deployed-live gates passed.
- Engineering: PASS — read-only owner/RLS authority, strict ledger binding, zero-repair comparison and hosted 5000 hardening.
- Certification: PASS — exact PR-head, Real Cloud/Auth, production read-only deployment and exact-main deployed-live evidence.
- Known Critical / High / functional blockers: **0 / 0 / 0**.

## Closure and successor

Phase 13.4 satisfies its exit gate. Phase 13.5 — Import Destruction Gate becomes **AUTHORIZED_NEXT only when this formal closure change is merged to canonical main**.

The successor inherits permanent restrictions: no invented legacy mappings, no silent repair, no autogenerated target IDs, no unreviewed bulk import and no broader write authority without its own destructive evidence.
