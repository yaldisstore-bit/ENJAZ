# Phase 4.1 — Home / Dashboard

## Status

**IN PROGRESS 🚧**

Phase 4.1 is the first business screen delivered after the frozen Design System and completed Application Shell. It replaces the temporary authenticated Home placeholder with a real, workspace-scoped operational dashboard.

It is not complete until its PR, merged `main`, production artifact, and GitHub Pages deployment are green on the required final SHA. Phase 4.2 has not started.

## Product purpose

The Home screen answers one question: **what needs attention now?**

It may show only operational facts that can be derived from authoritative ENJAZ data. Decorative counters, fabricated trends, placeholder percentages, and fake business records are prohibited.

Required 4.1 content:

- active work volume;
- urgent/stalled work;
- pending and overdue follow-ups;
- prioritized blockers and overdue work;
- a clearly scoped financial snapshot;
- meaningful operational health signals;
- loading, empty, error, recovery, and precision-warning states.

## Workspace boundary discovered during implementation

The Phase 1 Data Layer required a workspace id, but the application did not yet expose a post-login path to resolve the authenticated user's workspace. Phase 4.1 fixes that gap at the correct boundary rather than deriving a workspace id from `user.id` or coupling a feature directly to Supabase.

`WorkspaceDataGateway.resolveWorkspaceIdForUser()` reads `workspace_memberships` inside the centralized data adapter. The existing RLS policy permits a user to select only their own membership. Feature code receives the result only through `EnjazDataLayerFactory.resolveWorkspaceId()`.

Regression tests protect:

- exact `workspace_memberships` table use;
- `user_id` filtering;
- invalid UUID rejection before a query;
- null membership behavior;
- RLS error normalization.

## Authoritative Home source

`homeDashboardService.ts` loads data only through the workspace-scoped repositories:

- active transactions;
- open follow-ups;
- open blockers;
- posted payments.

The loader paginates in bounded 100-row pages until the source is complete. A page that claims more data but returns zero rows is treated as an error; the Home screen must never silently turn a partial dataset into a business metric.

## Active work rules

A transaction contributes to Home active-work facts only when:

- `deleted_at` is null;
- `archived_at` is null;
- status is not `completed`.

This prevents the historical class of bug where archived work continued to behave as active work.

Open follow-ups are counted as pending **only when their parent transaction is still active by the same rule above**. A follow-up attached to an archived, deleted, or completed transaction cannot leak into Home's `openFollowups`, `overdueFollowups`, operational signals, or priority queue. This rule was added after a real Phase 4.1 regression was found during pre-CI review: the first implementation excluded archived work from priorities but still counted an archived transaction's open follow-up in Home metrics.

A follow-up becomes an overdue priority only when it is open, due before the current instant, not snoozed into the future, and belongs to an active transaction.

## Priority model

The deterministic priority queue is capped at **6** visible items and sorts by operational severity:

1. critical blockers;
2. high blockers;
3. overdue follow-ups, with bounded age weight;
4. urgent transactions;
5. stalled transactions.

The queue links only to existing product roots at this phase. It does not invent transaction-detail routes before Phase 5.

## Financial snapshot boundary

The Home finance card is intentionally narrower than the future Phase 7 ledger. It shows:

- current fees of active transactions;
- `posted` payments tied to those active transactions;
- the non-negative difference as outstanding active-work value.

Reversed payments and payments belonging to archived/non-active work do not contribute.

Because generated Postgres numeric fields currently enter the browser as JavaScript `number`, the model checks whether cents remain inside the safe-integer range. If not, `precisionSafe` becomes false and the UI explicitly warns that the value must not be treated as a final accounting calculation. **Phase 7 remains the authoritative accounting implementation.**

## UI and Design System

The real route `/app` renders `HomeDashboardPage` inside the authenticated App Shell. The view is built from the frozen Design System and Phase 2 patterns, including `RiskSignalPattern`, cards, badges, skeletons, and empty-state primitives.

`home-dashboard.css` must remain:

- semantic-token only;
- RTL/logical-property safe;
- responsive down to narrow phone layouts;
- focus-visible;
- reduced-motion aware;
- free of raw colors, `!important`, numeric z-index escalation, `transition: all`, and arbitrary visual values.

The page includes real loading and retry/error states. If a source load fails, Home does not display partial business totals.

## Deterministic proof surface

`/foundation/home`

The preview uses fixed non-production fixtures but passes them through the same `buildHomeDashboardSnapshot()` and renders the same `HomeDashboardView`. This is a structural/visual proof surface, not evidence of live cloud records.

GitHub Pages preview mode also maps `/app` to this deterministic Home view so the first business screen can be reviewed safely without credentials.

## Phase boundaries

During 4.1:

- Home is the only `contentState: 'implemented'` product route.
- Today / Daily Work remains `reserved` until 4.2.
- Executive Briefing remains 4.3.
- The Phase 4 destruction gate remains 4.4.
- Transactions, Companies, Finance and later domains remain owned by their roadmap phases.

## Quality Gate

The 4.1 gate must extend the complete Phase 3.4 gate; prior destruction suites are preserved through deterministic forward-compatibility normalization rather than skipped.

4.1 adds checks for:

- workspace membership resolution;
- complete pagination;
- active/archive/delete lifecycle filtering;
- archived follow-ups being excluded from all active Home metrics;
- snooze and overdue semantics;
- priority ordering and bounded density;
- payment status and active-work finance scope;
- unsafe money precision disclosure;
- real `/app` Home route;
- deterministic `/foundation/home` preview;
- frozen Design System compliance;
- Home-only navigation implementation;
- Phase 4.2 lock.

A destructive selftest intentionally corrupts those facts and requires the audit to reject every mutation.

## Exit criteria

Phase 4.1 becomes complete only when:

- behavior/contract tests pass;
- Phase 4.1 audit is fully green;
- every deliberate 4.1 regression is rejected;
- Phase 3.4 and all older gates remain green;
- real TypeScript `tsc -b` passes;
- Vite production build passes;
- `dist/index.html` is asserted;
- GitHub Actions is green on the 4.1 PR;
- merged `main` passes the same gate;
- a verified production artifact is retained;
- GitHub Pages publishes the same final `main` SHA.

Only after that may the roadmap advance to **Phase 4.2 — Daily Work / Universal Inbox**.
