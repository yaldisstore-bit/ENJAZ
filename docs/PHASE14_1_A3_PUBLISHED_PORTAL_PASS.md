# Phase 14.1 A3 — Exact-SHA Published Portal Pass

**Status:** PASS for the published-portal portion of A3 only. Physical Android remains open, Phase 14.1 remains `IN_PROGRESS`, Phase 14.2 remains `LOCKED`, and PR #225 remains `DRAFT`.

## Evidence anchor

- Workflow: `ENJAZ Phase 14.1 A2 — Linked J01-J11 + N02/N13 Real Cloud`
- Run: `35682270629`
- Exact executable head: `6ff525f103579d5f5f0392aecd4bd58d0e96a68e`
- Isolated lab: `nqhgaukutkyvfumbtbtg`
- Production project: `juzxriirhkuzviwnhkbd` (deny-listed and not mutated)

The runner built that exact head, wrote an exact-SHA deployment manifest, opened a checksum-pinned temporary public HTTPS tunnel, verified the manifest through the public endpoint, and then ran the signed-in staff/client browser journey against that endpoint. The log records 17 Chromium cases across 1280/430/390/360/320, offline recovery, `A3_EXACT_SHA_EPHEMERAL_HTTPS_PUBLISHED_PORTAL`, `A3_PUBLISHED_PORTAL_TUNNEL_CLOSED_AFTER_TEST`, and an integrated result of 151 checks with `passed: true` and `cleanupPassed: true`.

## Safety boundary

- The public URL was random, temporary, not printed as evidence, and not retained.
- The tunnel process was stopped before certification and the local preview was closed.
- The Supabase secret key was removed from the public preview and browser environments.
- All authenticated fixtures used the isolated lab and the run independently reported zero residue.
- No production deployment, production database mutation, merge, release, or Phase 14.1 closure is claimed.

## Remaining A3 gate

A real physical Android device still must exercise the signed-in staff and client surfaces, including RTL layout, touch navigation, keyboard/IME behavior, back navigation, and network loss/recovery. Emulator, desktop responsive mode, and the successful five-width Chromium certificate do not satisfy that physical-device gate.
