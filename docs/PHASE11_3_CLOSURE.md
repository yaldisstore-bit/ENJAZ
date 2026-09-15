# Phase 11.3 — Client Portal — M3 — Formal Closure

**Status:** CLOSED / CERTIFIED  
**Closure date:** 2026-09-15  
**Predecessor:** Phase 11.2 — CLOSED / certified  
**Major system:** M3 — Client Portal — remains operationally ACTIVE  
**Authorized successor:** Phase 11.4 — Omnichannel Communications Hub — M4

## Closure statement

Phase 11.3 is closed only after the Client Portal implementation was merged, published from an exact `main` SHA, exercised through real Supabase authentication in real Chromium, attacked through the public Pages deployment, and re-certified with zero known Critical, High, or functional blockers.

The closure does **not** convert a portal user into ENJAZ staff or workforce authority. `workspace_memberships` and `organization_members` remain separate trust roots, client access remains explicit/object-scoped and deny-by-default, and portal writes remain governed/audited actions rather than direct browser DML against core business tables.

## Certified lineage

- Phase 11.3-D implementation PR: **#173**
- Implementation branch head: `87863fa715a2f9e045d0ed19506dde5383a625ba`
- Implementation merge on `main`: `30627b5f771b41f977bae1742d3c0eaf8ca66f53`
- Published-certificate correction PR: **#174**
- Certificate correction head: `2b494f3f3346c9041d5afbc78bfbaf4bd59ed694`
- Exact certified `main` SHA: `f99d5a4a3eff8aefc7346ebb2a8e74f8a3de2fe8`

The first post-implementation published certificate correctly failed on run `34964413677` because its UI assertion waited for a request card that the successful workflow intentionally removes from the overview after fulfillment. That failure was **not bypassed**. PR #174 changed only the certificate assertion so it verifies the same request in the authoritative Requests center as `مكتمل`, after which database, isolation, audit, fresh-login, multi-viewport, and zero-residue checks still run normally.

## Certified evidence

- PR #174 Phase 11.3 Gate: run `34964827940` — **PASS**, including Real Chromium at 1280 / 430 / 390 / 360 / 320 px.
- PR #174 Quality Gate: run `34964828699` — **PASS**.
- Exact-main Quality Gate on `f99d5a4a3eff8aefc7346ebb2a8e74f8a3de2fe8`: run `34965017371` — **PASS**.
- Verified Pages Preview / `/live` exact-SHA deployment: run `34965220159` — **PASS**.
- Published Client Portal Certificate: run `34965281229` — **PASS**.
  - exact deployed SHA verification
  - disposable real Supabase auth user
  - invitation discovery and self-activation
  - isolated portal shell
  - governed information reply and fulfilled-request UI state
  - authoritative database verification
  - no staff/workforce trust minted
  - audit evidence
  - authenticated reloads at 1280 / 430 / 390 / 360 / 320 px
  - zero-residue cleanup
- Live External Gate: run `34965281142` — **PASS** for HTTPS/public HTML, frozen review root, real `/live` application, and published deep-link behavior.

## Authority and security invariants retained

- Portal principals never inherit workspace-wide staff trust.
- Portal principals never inherit organization workforce trust.
- Every client grant remains exact-workspace and exact-object scoped.
- Company access never silently grants transaction access.
- Revoked/expired/future/malformed grants fail closed.
- Client-safe projections exclude internal notes, risk/intelligence signals, raw storage/checksum/OCR metadata, and staff-only finance data.
- Portal action tables remain non-direct-browser-authority surfaces; client mutations use governed functions/edges and produce audit evidence.
- Editable `user_metadata` is not an authorization root.
- No service-role/secret key exists in browser code.
- Frozen budgets remain unchanged: 670000 single JS bytes, 760000 total JS bytes, 180000 CSS bytes.

## Exit decision

**PASS**

- Known Critical blockers: **0**
- Known High blockers: **0**
- Known functional blockers: **0**
- Deployed live critical path: **PASS**
- Post-merge recertification: **PASS**
- Phase 11.3 exit gate: **PASS**

Phase 11.4 may become active only after this formal closure change itself is merged to canonical `main`. Until that merge, this document is closure-candidate evidence; after merge it is the canonical Phase 11.3 closure record.
