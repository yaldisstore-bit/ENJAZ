# Phase 3.3 — Global Interaction Surfaces

## Status

Phase 3.3 adds the four global entry points required by the frozen ENJAZ Master Roadmap on top of the completed App Shell 3.1 and Navigation Architecture 3.2.

It does **not** implement domain business screens early. Global surfaces discover or delegate to authoritative product routes; they do not create a second transaction, company, notification, operations, or command implementation inside the Shell.

## Governing roadmap scope

Phase 3.3 covers exactly:

1. Global search entry point.
2. Notification/inbox entry point.
3. Global create/quick-action entry point where justified.
4. Command/operations entry point without duplicating domain logic.

Phase 3.4 remains responsible for Shell Destruction: keyboard, back, rotation, route refresh/deep-link, session expiry, offline shell, narrow screens, and long-label torture.

## One global contract

`src/core/interactions/globalInteractionContract.ts` is the central contract for the four surfaces.

The contract freezes:

- exactly four surface IDs: `search`, `inbox`, `quickCreate`, `control`;
- presentation ownership (`dialog`, `route`, `sheet`);
- search minimum query length of two characters;
- a bounded search result window of eight;
- notification badge containment at `99+`;
- delegated Quick Create intents;
- delegated Inbox targets;
- delegated Operations/Command targets.

No Supabase client, repository, data gateway, or write operation exists in this contract.

## Global Search

Global Search is a real, usable shell-level search entry point in 3.3, but its authority is intentionally limited to the product navigation map.

It searches the same `PRODUCT_NAVIGATION_ROUTES` contract that drives the Navigation Architecture. Therefore it can find sections such as Transactions, Finance, Documents, Reports, and Follow-ups without inventing business records or creating a shadow search index.

Rules:

- fewer than two normalized characters returns no result;
- results are bounded to eight;
- results resolve to canonical product routes;
- the result explicitly states the future delivery phase while content is reserved;
- closing the search clears the query;
- no business-record search is claimed in Phase 3.3.

Record-level search is integrated by each authoritative domain when that domain is delivered and may later feed the global surface without changing its Shell contract.

## Notification / Inbox entry

The global Inbox control delegates to the canonical Notifications route. The contract also records Follow-ups as the second inbox-owned domain for future Universal Inbox composition.

Phase 3.3 does **not** fabricate unread counts. The Shell accepts a bounded optional count and defaults to zero until Phase 11 supplies authoritative notification state.

Badge rules contain large counts as `99+` and ignore invalid/non-positive values.

## Quick Create

Quick Create is justified as a global entry point, but ENJAZ does not duplicate forms in the App Shell.

The three frozen intents are:

- New Transaction → Transactions → Phase 5.
- New Company → Companies → Phase 6.
- New Follow-up → Follow-ups → Phase 11.

Every intent remains `reserved`. The Phase 3.3 sheet identifies the owning domain and opens its canonical route. The actual create form/action is introduced only by the owning phase.

This keeps one source of validation, one source of persistence, and one permission model for each business action.

## Command / Operations entry

One global Control surface delegates to:

- Operations Center → Phase 8.
- Command Center → Phase 8.

The App Shell contains no workflow engine, automation engine, queue logic, command execution, or cross-domain mutation. It provides the entry point only.

## Shell integration

`GlobalInteractionSurfaces` is mounted exactly once by `AppShellFrame`, directly beneath the existing Top Bar identity/account row.

The five frozen bottom-navigation slots remain untouched. Phase 3.3 does not invent a sixth bottom-navigation destination.

The surfaces use existing Design System primitives:

- `Dialog` for Global Search;
- `BottomSheet` for Quick Create and Control;
- `TextField` for the search input;
- canonical React Router `Link`s for route delegation.

## Accessibility, RTL, mobile and motion

The surfaces preserve the frozen Phase 2/3 contracts:

- Arabic-first / RTL logical layout;
- minimum touch target from `--size-touch-min`;
- `aria-haspopup="dialog"` and `aria-expanded` on overlay triggers;
- dialog semantics inherited from the Design System overlay primitive;
- live search-result feedback with `aria-live="polite"`;
- notification count included in the accessible Inbox label;
- visible focus using the tokenized focus contract;
- small-phone four-slot adaptation;
- coarse-pointer-friendly targets;
- hover motion only for fine hover-capable pointers;
- `prefers-reduced-motion` removes non-essential movement;
- no raw colors, tiny raw font values, `!important`, arbitrary z-index, or `transition: all`.

## Proof surface

The auth-free structural lab is:

`/foundation/interactions`

It demonstrates the actual four-surface component with a bounded 20-item badge fixture plus the frozen contract facts. It contains no production records or Supabase access.

## Phase boundary

The following remain outside 3.3:

- transaction/company/follow-up create forms;
- business-record global search;
- real notification queries/read state;
- Universal Inbox aggregation;
- workflow/automation execution;
- Operations Center business modules;
- Command Center business modules;
- any AI/copilot integration.

Those capabilities stay owned by their roadmap phases.

## Quality Gate

`verify:phase3.3` must extend the immutable 3.2 gate:

`verify:phase3.2 → global-interactions audit → global-interactions destructive selftest → roadmap audit`

The 3.3 audit verifies contract completeness, delegation ownership, search/badge bounds, accessibility, App Shell single mounting, route/lab wiring, token-only CSS, mobile/RTL/reduced-motion behavior, versioning, documentation, and CI wiring.

The destructive selftest deliberately corrupts those contracts and requires the audit to reject every mutation.

Phase 3.3 is complete only when:

- behavior/contract tests pass;
- the Phase 3.3 audit is fully green;
- the Phase 3.3 destructive selftest rejects every deliberate regression;
- Phase 3.2 and all older gates remain green;
- real TypeScript `tsc -b` passes;
- Vite production build passes;
- `dist/index.html` is asserted;
- GitHub Actions is green on the Pull Request;
- the merged `main` commit passes the same gate;
- GitHub Pages successfully deploys the same merged `main` SHA.

Only then may ENJAZ advance to **Phase 3.4 — Shell Destruction Gate**.
