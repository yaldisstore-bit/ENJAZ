# Phase 9.6 — M18 Real Cloud Evidence

Status: **REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**

## Certified boundary

Phase 9.6 certifies **read-only derived process intelligence** over source-owned operational history. It does not create a process event store or any process-intelligence persistence.

Certified Supabase project:

- project ref: `juzxriirhkuzviwnhkbd`
- project name: `ENJAZ`
- project state at certification: `ACTIVE_HEALTHY`
- applied certification migration: `20260912105428 — phase_9_6_live_authenticated_process_probe`
- repository migration: `database/migrations/phase_9_6_live_authenticated_process_probe.sql`

## Source authority verified

The cloud probe uses only existing source-owned histories:

- `transaction_activity`
- `workflow_instances`
- `workflow_transition_events`
- `field_assignments`
- `field_visits`
- `field_visit_evidence`

`field_sync_receipts` is deliberately **not** a process-path input. Its live RLS policy is actor-scoped (`created_by = auth.uid()` plus workspace membership), so Phase 9.6 treats it only as integrity/replay evidence.

## Authenticated owner verification

The migration created fixed temporary fixtures and then executed reads under `set local role authenticated` with the real workspace owner JWT subject.

The authenticated owner successfully observed exactly one expected row in each certified history source:

- transaction lifecycle activity: PASS
- workflow instance: PASS
- workflow transition event: PASS
- field assignment: PASS
- field visit: PASS
- field evidence: PASS
- owner's own sync receipt: PASS

No service-role read was accepted as certification evidence.

## Negative permission verification

The same migration switched to an authenticated outsider subject with no workspace membership and proved zero visibility across:

- `transaction_activity`
- `workflow_instances`
- `workflow_transition_events`
- `field_assignments`
- `field_visits`
- `field_visit_evidence`
- `field_sync_receipts`

Result: **OUTSIDER_RLS_ISOLATION = PASS**.

The probe also verified:

- `anon` has no SELECT privilege over the M18 workflow/field history sources used by this path;
- browser-authenticated roles do not gain direct mutation authority over workflow transitions or field-operation history tables;
- the `field_sync_receipts_select_own` policy remains actor-scoped;
- no public table/view/materialized-view matching process-mining/process-intelligence/predictive-operation shadow persistence exists.

## Zero-residue verification

The migration deleted all fixed fixtures before commit. A separate post-commit query independently verified:

- workspaces: `0`
- companies: `0`
- transactions: `0`
- transaction activity: `0`
- workflow instances: `0`
- workflow transition events: `0`
- field assignments: `0`
- field visits: `0`
- field visit evidence: `0`
- field sync receipts: `0`
- shadow process objects: `0`

Result: **PASS_ZERO_RESIDUE**.

## Advisor review

Supabase Security and Performance Advisors were run after certification.

- Phase-9.6-owned security findings: **0**
- Phase-9.6-owned performance findings: **0**

The project still has unrelated/pre-existing advisor findings owned by earlier domains, including CRM/Intake/Auth security notices and legacy workflow/CRM foreign-key/index observations. Phase 9.6 did not introduce, mutate, or claim to resolve those findings. They remain outside this M18 certification boundary and must not be misreported as Phase 9.6 defects or silently ignored at their owning hardening gates.

## Certification conclusion

**REAL_CLOUD_CERTIFIED / PASS_ZERO_RESIDUE**

M18 remains `ACTIVE`, not globally closed, because Phase 15 is still a governing anchor. Phase 9.7 remains locked. Real Cloud certification authorizes Phase 9.6 to proceed to the canonical runtime/UI implementation and Real Browser validation; it does not itself close Phase 9.6.
