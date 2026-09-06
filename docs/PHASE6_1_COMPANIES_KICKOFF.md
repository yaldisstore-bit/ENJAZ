# Phase 6.1 — Companies

Status: **ACTIVE / NOT CLOSED**

Phase 6.1 starts only after Phase 5.5 was closed, merged, and independently recertified on canonical `main`.

## Certified base

- canonical base: `3381dfdb3d85f36836052e6611d5d14e12cfb7f7`
- Phase 5: **CLOSED**
- Phase 5.5: **CLOSED**, zero unresolved destructive defects
- Phase 5.5 post-merge recertification: **COMPLETE**
- latest base deployment chain, including Real Browser and Live External: green before this branch was opened

## Required 6.1 scope

1. Company list.
2. Arabic-first search.
3. Filters and deterministic sorting/pagination.
4. Company create.
5. Company edit with stale-write rejection.
6. Full company details from authoritative workspace-scoped repositories.
7. Related transactions.
8. Related documents as read-only context.
9. Bounded finance context without claiming Phase 7 accounting scope.
10. Related contacts as read-only context without opening Phase 6.2 relationship management.
11. Company activity.
12. Operational risk derived from related transaction blockers.

## Safety rules

- Deleted companies are never presented as current records.
- Merged company records are read-only in 6.1.
- Company list fails closed above the 5,000-row source ceiling; it must not show an authoritative partial list.
- Related collections are bounded and must expose truncation instead of pretending the loaded slice is complete.
- Company creation uses a stable operation UUID and get-before-create replay protection so an unknown write result cannot silently create duplicates.
- Editing re-reads the company and rejects stale `updated_at` state before mutation.
- No direct Supabase client, ad-hoc fetch, localStorage database, or shadow company store is allowed in the feature/UI layer.
- A failed or unknown write must never be rendered as confirmed success.

## Explicit non-scope

- Phase 6.2 — Lawyers / Contacts CRUD and relationship management: **LOCKED**.
- Phase 6.3 — Company / Lawyer 360°: **LOCKED**.
- Phase 7 full Finance behavior: **LOCKED**; 6.1 may only compose bounded existing facts.
- Phase 10 document upload/delete/OCR/report operations: **LOCKED**.

## Exit rule

This phase remains **ACTIVE** until its model/service tests, full functional regression, architecture audit, database/secrets/roadmap checks, TypeScript, production build/budget, and real-browser Companies acceptance are all green with zero unresolved Phase 6.1 defects. Only a separate closure record may mark 6.1 closed or unlock Phase 6.2.
