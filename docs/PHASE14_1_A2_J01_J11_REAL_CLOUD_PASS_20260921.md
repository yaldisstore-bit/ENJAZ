# Phase 14.1 A2/A3 — linked J01–J11 real cloud + real-auth Chromium PASS (2026-09-21)

**Exact executable SHA:** `a2f0706a03a410d5bf736fed1209e7643c72d70a`  
**GitHub Actions run:** #35605875580 — SUCCESS  
**Disposable lab:** `nqhgaukutkyvfumbtbtg` only. Production was not mutated.

## What passed

- The same isolated source graph completed J01 company → J02 transaction → J03 procedure → J04 field → J05 follow-up → J06 payment/reversal → J07 document/PDF → J08 independently authenticated client portal → J09 archive/restore → J10 governance → J11 engagement/contract.
- Evidence runner reported **129 checks**, `passed=true`, `cleanupPassed=true`.
- J10 governance included ownership replay/conflict, beneficial owner, dated representation expiry, same-workspace workforce non-escalation, foreign denial, stale resolution rejection, governed capital change and direct-capital bypass denial.
- J11 included foreign/workforce denial, retainer replay, contract revision replay/conflict, foreign RLS/transition denial, stale version rejection, signature provenance requirement, effective/superseded lifecycle and revision-history preservation.
- A3 real-auth Chromium passed at **1280 / 430 / 390 / 360 / 320** for staff and client surfaces. Client offline refresh failed closed and recovered online. Browser diagnostics showed `fatalCount=0` on the five client widths.
- The production build intentionally compacts client-portal CSS class names. A3 was corrected to use stable data/semantic selectors rather than source CSS tokens.
- Final linked cleanup succeeded and the workflow evidence gate accepted the zero-residue result.

## What this does NOT certify

This run deliberately remains **NOT full A2** and **NOT full A3**. The remaining Phase 14.1 gates are:

1. N02: complete same-workspace non-authorized-role negative matrix across all required business domains.
2. N13: expired-session fail-closed + safe resumption proof. Supabase access tokens remain valid until their JWT expiry after sign-out, so sign-out alone must not be mislabeled as token-expiry evidence.
3. Physical Android keyboard/back-gesture evidence and a published authenticated client-portal certificate.
4. Final exact-head comprehensive regression, merge, exact-main deployed/live recertification, then independent formal Phase 14.1 closure.

Historical isolated Auth/import run #35530804118 remains useful evidence for N10-style missing/unmapped target quarantine and no silent repair, but it is not substituted for the remaining current-head gates.

**Release state:** PR #225 stays DRAFT; Phase 14.1 stays IN_PROGRESS; Phase 14.2 stays LOCKED.
