# Phase 3.2 — Navigation Architecture

## Status

Phase 3.2 establishes the canonical navigation architecture above the frozen Phase 3.1 App Shell and ENJAZ Design System 1.0.

It does **not** build business screens. Every product destination is a navigation boundary whose real content remains `reserved` until the delivery phase named in the Master Roadmap.

## Governing scope

The Phase 3.2 contract covers exactly the roadmap requirements:

- Final route map for product domains.
- Section transitions and deterministic back behavior.
- Deep-link-safe routing.
- Correct active navigation state.
- Navigation permissions and availability contracts.

Phase 3.3 remains responsible for global search, notification/inbox entry, quick create/actions, and command/operations global entry points.

## Canonical primary navigation — 5 slots

The Phase 3.1 five-slot mobile shell remains structurally frozen. Phase 3.2 binds those five slots to real canonical destinations:

| Slot | Route |
| --- | --- |
| الرئيسية | `/app` |
| اليوم | `/app/today` |
| المعاملات | `/app/transactions` |
| الشركات | `/app/companies` |
| المزيد | `/app/more` |

No sixth bottom-navigation slot is invented. Secondary domains remain under the `More` navigation ownership contract.

## Final route map — 18 product domain roots

The product-domain route map is centralized in `src/core/routing/navigationContract.ts` and the actual path literals remain centralized in `src/core/routing/routes.ts`.

The 18 product roots are:

1. Home — `/app`
2. Today / Daily Work — `/app/today`
3. Transactions — `/app/transactions`
4. Companies — `/app/companies`
5. People / Lawyers — `/app/people`
6. Finance — `/app/finance`
7. Workflows — `/app/workflows`
8. Automation — `/app/automation`
9. Operations Center — `/app/operations`
10. Command Center — `/app/command`
11. Risk — `/app/risk`
12. Saved Views — `/app/saved-views`
13. Intelligence — `/app/intelligence`
14. Documents — `/app/documents`
15. Reports — `/app/reports`
16. Notifications — `/app/notifications`
17. Follow-ups — `/app/follow-ups`
18. ENJAZ Copilot — `/app/copilot`

`/app/more` is a shell navigation hub, not a nineteenth business domain.

## Content availability boundary

Every product record declares:

- `permission: authenticated`
- `contentState: reserved`
- its future delivery phase from Phase 4 through Phase 12

This separation is deliberate. A route being available does not mean its business screen has been implemented. Phase 3.2 may route the user to a stable boundary page, but it must not implement finance, transactions, companies, workflows, documents, notifications, AI, or any other business logic early.

## Active navigation state

Active state is calculated from the current pathname instead of being hardcoded in the Shell.

Rules:

- `/app` activates Home only.
- `/app/today/...` activates Today.
- `/app/transactions/...` activates Transactions.
- `/app/companies/...` activates Companies.
- Secondary product paths such as `/app/finance/...` or `/app/documents/...` activate More.
- Unknown `/app/...` paths do not impersonate Home.
- Prefix collisions such as `/app/transactions-old` do not activate Transactions.

The active item owns `aria-current="page"`; inactive items do not.

## Deep-link safety

Navigation path normalization handles:

- optional leading slash,
- repeated slashes,
- trailing slashes,
- query/hash suffixes,
- nested route paths.

Product-domain resolution uses route-boundary matching rather than unsafe string prefixes.

For the GitHub Pages preview, `.github/workflows/enjaz-pages-preview.yml` copies `dist/index.html` to `dist/404.html`. This preserves SPA fallback when a direct preview Deep-link is refreshed. The preview router also keeps `basename: import.meta.env.BASE_URL`.

Production hosting must preserve the same SPA rewrite principle.

## Back behavior

Back behavior is deterministic and Deep-link safe.

Phase 3.2 intentionally does not call `history.back()` or `navigate(-1)` as the only contract, because a user may open a URL directly from outside ENJAZ.

Rules:

- Home has no Shell back destination.
- A product root returns to `/app`.
- A nested product path returns to its product root first.
- More returns to `/app`.
- An unknown path under `/app/...` safely returns to `/app`.
- A path outside the application receives no fabricated back destination.

Future detail screens can extend the same parent-route contract without changing the Shell architecture.

## Section transitions

`AppShellFrame` keys the route stage by the normalized pathname. `navigation.css` applies the frozen motion tokens for a short section-entry transition.

`prefers-reduced-motion: reduce` disables that animation completely.

No transition uses `transition: all`, arbitrary duration literals, or raw visual values outside Design Tokens.

## Permissions

All current product destinations require authenticated access and remain physically mounted below `ProtectedRoute` and `AppShell` in the real router.

The permission contract is centralized and does not invent UI-only roles such as admin/manager/accountant. Authorization remains an application/data-security responsibility rather than a hidden CSS or menu condition.

The auth-free preview router exists only for static proof pages and contains no production data access.

## Preview and proof surfaces

- Navigation Lab: `/foundation/navigation`
- Frozen Shell Lab: `/foundation/shell`

The Navigation Lab demonstrates:

- 5 primary destinations,
- 18 domain roots,
- secondary-domain ownership by More,
- active-state resolution,
- safe-back resolution,
- route labels, canonical paths, permissions, and future delivery phases.

Preview product boundaries are safe mock-free structural pages; they do not contain business records.

## Mobile / RTL requirements

Navigation continues to inherit Phase 2 and 3.1 guarantees:

- RTL logical layout only.
- Minimum touch target preserved.
- Bottom navigation remains five slots.
- Safe Areas remain owned by App Shell.
- Long paths and labels wrap safely.
- Small-phone adaptation remains explicit.
- Focus-visible treatment remains tokenized.
- Reduced motion remains supported.

## Quality Gate

`verify:phase3.2` must extend, not replace, the frozen Phase 3.1 gate:

`verify:phase3.1 → navigation audit → navigation destructive selftest → roadmap audit`

The navigation audit verifies route-map integrity, active state, Deep-link behavior, safe back, permission/availability separation, protected mounting, preview mounting, GitHub Pages `404.html` fallback, CSS/token discipline, phase boundaries, versioning, documentation, and CI wiring.

The destructive selftest deliberately corrupts routes, duplicates paths, breaks More ownership, removes authentication declarations, marks business content implemented too early, breaks Home route boundaries, removes safe back, hardcodes active state, restores disabled navigation, removes protected or preview route mounts, removes the Pages fallback, injects raw CSS/tiny text/`!important`, removes reduced-motion handling, removes navigation CSS, downgrades version/gates, and corrupts roadmap/documentation markers. Every deliberate regression must be rejected.

## Phase boundary

Phase 3.2 is complete only when:

- behavior tests pass,
- the navigation audit is fully green,
- the destructive selftest rejects every deliberate regression,
- the frozen Phase 3.1 and all Phase 2 gates still pass,
- real TypeScript check passes,
- production Vite build passes,
- `dist/index.html` is asserted,
- GitHub Actions passes on the PR,
- the merged `main` commit passes the same gate again.

Only then may ENJAZ advance to **Phase 3.3 — Global Interaction Surfaces**.
