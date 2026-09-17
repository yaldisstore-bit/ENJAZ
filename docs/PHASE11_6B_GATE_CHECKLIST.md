# Phase 11.6-B — Gate checklist

This file is intentionally conservative. It records what must pass before README may advertise 11.6-B as the current certified slice.

- [x] 11.6-A merged to exact main `d44b27411f3b994eb79f9e75ea0f8c15984c0412`.
- [x] canonical M17 submission authority preserved (`intake_submissions`).
- [x] bridge evidence kept in `private`, not a public shadow submission table.
- [x] HMAC capability secret generated inside Postgres and never committed.
- [x] M3 request creation/revocation delegated to existing owning commands.
- [x] Portal transaction bound to the intake-linked CRM lead conversion.
- [x] stale/idempotency/expiry/revocation/one-open constraints encoded.
- [x] TypeScript governed gateway added.
- [x] source authority audit added.
- [x] gateway and destructive source tests added.
- [ ] Phase 11.6 CI gate PASS on PR head.
- [ ] Quality / Constitution / Major Systems gates PASS on PR head.
- [ ] Real Cloud migrations applied successfully.
- [ ] authenticated Real Cloud probe PASS.
- [ ] before/after security + performance advisor delta accepted.
- [ ] cleanup / zero-residue PASS.
- [ ] README advanced to 11.6-B.
- [ ] merge + exact-main post-merge recertification PASS.

11.6-C and Phase 11.7 remain locked until their predecessor gates are satisfied.
