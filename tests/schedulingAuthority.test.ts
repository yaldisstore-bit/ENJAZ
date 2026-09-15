import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SCHEDULING_AUTHORITY,
  SCHEDULING_LAWS,
  assertGovernedSchedulingMutation,
  schedulingAuthorityDecision,
  schedulingRangesOverlap,
  staffConflictComparisonAllowed,
  workflowDeadlineMayBeGenerated,
} from '../src/features/scheduling/schedulingAuthority.ts';

test('canonical authority reuses calendar, renewal, workflow and workspace timezone truth', () => {
  assert.equal(SCHEDULING_AUTHORITY.calendarEvent, 'calendar_events');
  assert.equal(SCHEDULING_AUTHORITY.renewal, 'renewals');
  assert.equal(SCHEDULING_AUTHORITY.workflowDeadlineRule, 'workflow_template_stages.due_offset_days');
  assert.equal(SCHEDULING_AUTHORITY.workspaceTimezone, 'workspaces.timezone');
});

test('portal appointment response is confirmation input only', () => {
  const decision = schedulingAuthorityDecision('client_portal_appointment_response');
  assert.equal(decision.role, 'confirmation_input_only');
  assert.equal(decision.mayDirectlyMutateCalendarTruth, false);
});

test('field assignment and organization ownership cannot become appointment or staff truth', () => {
  assert.equal(schedulingAuthorityDecision('field_assignment').role, 'field_operation_evidence_only');
  assert.equal(schedulingAuthorityDecision('organization_scope_ownership').role, 'scope_ownership_only');
  assert.equal(SCHEDULING_LAWS.organizationScopeOwnershipMayInferSpecificStaffAssignment, false);
  assert.equal(SCHEDULING_LAWS.fieldAssignmentMayReplaceCalendarTruth, false);
});

test('direct browser scheduling writes fail closed', () => {
  assert.throws(() => assertGovernedSchedulingMutation({
    boundary: 'direct-browser-table-write',
    actorAuthenticated: true,
    workspaceAuthorized: true,
    optimisticVersionMatched: true,
    terminalFact: false,
    action: 'reschedule',
  }), /ENJAZ_SCHEDULING_GOVERNED_COMMAND_REQUIRED/);
});

test('governed mutation requires auth, workspace authority and fresh optimistic version', () => {
  const base = {
    boundary: 'm10-domain-command' as const,
    actorAuthenticated: true,
    workspaceAuthorized: true,
    optimisticVersionMatched: true,
    terminalFact: false,
    action: 'reschedule' as const,
  };
  assert.doesNotThrow(() => assertGovernedSchedulingMutation(base));
  assert.throws(() => assertGovernedSchedulingMutation({ ...base, actorAuthenticated: false }), /AUTH_REQUIRED/);
  assert.throws(() => assertGovernedSchedulingMutation({ ...base, workspaceAuthorized: false }), /WORKSPACE_FORBIDDEN/);
  assert.throws(() => assertGovernedSchedulingMutation({ ...base, optimisticVersionMatched: false }), /STALE_VERSION/);
});

test('terminal scheduling facts cannot be silently resurrected', () => {
  assert.throws(() => assertGovernedSchedulingMutation({
    boundary: 'm10-domain-command', actorAuthenticated: true, workspaceAuthorized: true,
    optimisticVersionMatched: true, terminalFact: true, action: 'reschedule',
  }), /TERMINAL_FACT_IMMUTABLE/);
});

test('staff conflict comparison requires same workspace and explicit same member', () => {
  const a = { workspaceId: 'w1', assignedOrganizationMemberId: 'm1', startsAt: '2026-09-15T08:00:00Z', endsAt: '2026-09-15T09:00:00Z' };
  assert.equal(staffConflictComparisonAllowed(a, { ...a, startsAt: '2026-09-15T08:30:00Z' }), true);
  assert.equal(staffConflictComparisonAllowed(a, { ...a, workspaceId: 'w2' }), false);
  assert.equal(staffConflictComparisonAllowed(a, { ...a, assignedOrganizationMemberId: null }), false);
  assert.equal(staffConflictComparisonAllowed(a, { ...a, assignedOrganizationMemberId: 'm2' }), false);
});

test('overlap detects actual same-staff intervals only', () => {
  const a = { workspaceId: 'w1', assignedOrganizationMemberId: 'm1', startsAt: '2026-09-15T08:00:00Z', endsAt: '2026-09-15T09:00:00Z' };
  const overlap = { ...a, startsAt: '2026-09-15T08:30:00Z', endsAt: '2026-09-15T09:30:00Z' };
  const adjacent = { ...a, startsAt: '2026-09-15T09:00:00Z', endsAt: '2026-09-15T10:00:00Z' };
  assert.equal(schedulingRangesOverlap(a, overlap), true);
  assert.equal(schedulingRangesOverlap(a, adjacent), false);
  assert.equal(schedulingRangesOverlap(a, { ...overlap, assignedOrganizationMemberId: null }), false);
});

test('invalid time range fails closed', () => {
  const a = { workspaceId: 'w1', assignedOrganizationMemberId: 'm1', startsAt: '2026-09-15T10:00:00Z', endsAt: '2026-09-15T09:00:00Z' };
  const b = { workspaceId: 'w1', assignedOrganizationMemberId: 'm1', startsAt: '2026-09-15T08:00:00Z', endsAt: '2026-09-15T11:00:00Z' };
  assert.throws(() => schedulingRangesOverlap(a, b), /RANGE_INVALID/);
});

test('workflow deadline generation requires rule, stage anchor and workspace timezone', () => {
  assert.equal(workflowDeadlineMayBeGenerated({ dueOffsetDays: null, stageAnchorObserved: true, workspaceTimezone: 'Asia/Baghdad' }), false);
  assert.equal(workflowDeadlineMayBeGenerated({ dueOffsetDays: 3, stageAnchorObserved: false, workspaceTimezone: 'Asia/Baghdad' }), false);
  assert.equal(workflowDeadlineMayBeGenerated({ dueOffsetDays: 3, stageAnchorObserved: true, workspaceTimezone: null }), false);
  assert.equal(workflowDeadlineMayBeGenerated({ dueOffsetDays: 3, stageAnchorObserved: true, workspaceTimezone: 'Asia/Baghdad' }), true);
  assert.throws(() => workflowDeadlineMayBeGenerated({ dueOffsetDays: -1, stageAnchorObserved: true, workspaceTimezone: 'Asia/Baghdad' }), /DEADLINE_RULE_INVALID/);
});

test('forbidden inference laws remain fail closed', () => {
  assert.equal(SCHEDULING_LAWS.deviceTimezoneMayBecomeBusinessScheduleAuthority, false);
  assert.equal(SCHEDULING_LAWS.unknownAssignmentMayBeTreatedConflictFree, false);
  assert.equal(SCHEDULING_LAWS.elapsedTimeMayInferAttendanceOutcome, false);
  assert.equal(SCHEDULING_LAWS.systemMayInventMissedDeadlineRootCause, false);
  assert.equal(SCHEDULING_LAWS.externalCalendarMayBecomeCanonicalTruthWithoutGovernedReconciliation, false);
  assert.equal(SCHEDULING_LAWS.crossWorkspaceReferencesAllowed, false);
});

test('database lockdown revokes direct scheduling writes and preserves governed command proof', () => {
  const lockdown = fs.readFileSync(new URL('../database/migrations/phase_11_5_scheduling_direct_write_lockdown.sql', import.meta.url), 'utf8');
  const probe = fs.readFileSync(new URL('../database/migrations/phase_11_5_live_scheduling_lockdown_probe.sql', import.meta.url), 'utf8');

  for (const marker of [
    'revoke insert, update on table public.calendar_events from authenticated',
    'revoke insert, update on table public.renewals from authenticated',
    'drop policy if exists calendar_events_insert_workspace',
    'drop policy if exists calendar_events_update_workspace',
    'drop policy if exists renewals_insert_workspace',
    'drop policy if exists renewals_update_workspace',
  ]) assert.ok(lockdown.includes(marker), `lockdown missing: ${marker}`);

  for (const marker of [
    'P115_DIRECT_CALENDAR_UPDATE_NOT_BLOCKED',
    'P115_DIRECT_CALENDAR_INSERT_NOT_BLOCKED',
    'P115_DIRECT_RENEWAL_UPDATE_NOT_BLOCKED',
    'P115_DIRECT_RENEWAL_INSERT_NOT_BLOCKED',
    'public.mutate_calendar_event_state_v1',
    'public.mutate_renewal_state_v1',
    'P115_GOVERNED_CALENDAR_FAILED',
    'P115_GOVERNED_RENEWAL_FAILED',
    'P115_LOCKDOWN_RECEIPT_RESIDUE',
    'P115_LOCKDOWN_AUDIT_RESIDUE',
  ]) assert.ok(probe.includes(marker), `lockdown probe missing: ${marker}`);
});
