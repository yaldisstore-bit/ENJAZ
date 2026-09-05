# ENJAZ Rebirth 2.0 — R2.0-7 Operational Intelligence Kickoff

Status: **ACTIVE**

Branch: `r2-0-7-operational-intelligence`

R2.0-7 starts only after the formal closure of R2.0-6 Records & Relationships. The approved Golden Experience, closed Core Work migration and closed Records & Relationships layer remain frozen reference points.

## Scope

R2.0-7 migrates exactly these seven domains into Rebirth 2.0:

- Finance — ledger/workspace grammar with movement, due items and numeric hierarchy.
- Operations — operational pulse, ownership, workload and next action.
- Workflow — stage lanes, transitions, blockers and ownership.
- Automation — triggers, conditions, actions and execution health.
- Command Center — executive focus, cross-domain exceptions and decision queue.
- Risk / Insights — risk map, signals and saved-view style intelligence surfaces.
- Copilot — contextual assistant workspace tied to current product context without claiming unsupported production intelligence.

## Composition rule

One visual identity, seven task-appropriate workspace grammars. A universal dashboard/card-wall template is forbidden.

Finance must feel like a ledger. Workflow must make state movement visible. Automation must expose causality. Operations must expose ownership and next action. Command Center must prioritize decisions. Risk must prioritize signals and severity. Copilot must remain context-first.

## Truthfulness boundary

R2.0-7 presentation may consume or represent only capabilities supported by the authoritative inventory and Data Layer. Preview specimens must not claim production writes, generated intelligence, automation mutation, financial mutation or AI execution when those behaviors are not yet connected and proven.

Authoritative foundations already present include workspace-scoped payments, payment reversals, fee changes, financial ledger entries, workflow states/instances, automation runs and intelligence snapshots. Existing business/data semantics remain untouched.

## Hard barriers

- Phase 5.5 remains locked.
- Canonical runtime remains `ui-v2`.
- `src/main.tsx` must not boot UiR2Root before R2.0-11.
- No imports from `src/ui-v2` or `src/ui-rebirth` presentation code.
- Approved Golden identity and all R2.0-5/R2.0-6 behavior must regress cleanly.
- Locked five-color palette remains absolute.
- 1280 / 430 / 390 / 360 / 320 are mandatory browser widths.

## Initial implementation pass

1. Activate R2.0-7 machine state.
2. Add an isolated `src/ui-r2/operational-intelligence` workspace family.
3. Integrate the seven canonical launcher destinations into UiR2Root.
4. Add stage-specific structural guard and CI gate.
5. Add real-browser R2.0-7 scenarios before closure.
6. Mark Feature Parity only after each migrated capability is both implemented and tested.

## Exit target

R2.0-7 may close only when every in-scope operational-intelligence capability is represented truthfully, uses its correct workspace grammar, passes Golden/Core Work/Records regressions, passes TypeScript/build/budget, and passes real-browser evidence at all hard widths.

The next allowed stage after closure is **R2.0-8 — Find Anything & Zero-Lost UX**.
