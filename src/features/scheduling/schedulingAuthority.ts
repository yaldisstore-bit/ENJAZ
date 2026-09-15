export type SchedulingCanonicalSource =
  | 'calendar_event'
  | 'renewal'
  | 'workflow_deadline_rule';

export type SchedulingExternalInput =
  | 'client_portal_appointment_response'
  | 'field_assignment'
  | 'organization_scope_ownership'
  | 'notification'
  | 'external_calendar';

export const SCHEDULING_AUTHORITY = Object.freeze({
  calendarEvent: 'calendar_events',
  renewal: 'renewals',
  workflowDeadlineRule: 'workflow_template_stages.due_offset_days',
  workflowDeadlineInstance: 'workflow_instances.template_snapshot_and_workflow_stage_states',
  workspaceTimezone: 'workspaces.timezone',
  notificationAttention: 'in_app_notifications',
  notificationDelivery: 'notification_deliveries',
  followup: 'transaction_followups',
  workforceIdentity: 'organization_members',
  organizationOwnership: 'transaction_organization_ownership',
  fieldAssignment: 'field_assignments',
  portalAppointmentResponse: 'client_portal_appointment_responses',
  audit: 'audit_events',
} as const);

export const SCHEDULING_LAWS = Object.freeze({
  shadowAppointmentStoreAllowed: false,
  shadowCalendarStoreAllowed: false,
  shadowRenewalStoreAllowed: false,
  portalResponseMayMutateSchedulingTruthDirectly: false,
  fieldAssignmentMayReplaceCalendarTruth: false,
  organizationScopeOwnershipMayInferSpecificStaffAssignment: false,
  deviceTimezoneMayBecomeBusinessScheduleAuthority: false,
  unknownAssignmentMayBeTreatedConflictFree: false,
  elapsedTimeMayInferAttendanceOutcome: false,
  systemMayInventMissedDeadlineRootCause: false,
  externalCalendarMayBecomeCanonicalTruthWithoutGovernedReconciliation: false,
  rescheduleHistoryRequired: true,
  attendanceOutcomeExplicitRequired: true,
  deadlineSourceProvenanceRequired: true,
  explicitStaffAssignmentRequiredForStaffConflictDetection: true,
  optimisticConcurrencyRequired: true,
  idempotencyRequiredForRetryableCommands: true,
  auditRequiredForSensitiveWrites: true,
  crossWorkspaceReferencesAllowed: false,
  terminalFactSilentResurrectionAllowed: false,
  directBrowserSchedulingLifecycleWriteAllowed: false,
  directBrowserRenewalLifecycleWriteAllowed: false,
} as const);

export interface SchedulingAuthorityDecision {
  readonly source: SchedulingCanonicalSource | SchedulingExternalInput;
  readonly role:
    | 'canonical_schedule_truth'
    | 'canonical_renewal_truth'
    | 'deadline_rule_truth'
    | 'confirmation_input_only'
    | 'field_operation_evidence_only'
    | 'scope_ownership_only'
    | 'attention_projection_only'
    | 'external_projection_only';
  readonly mayDirectlyMutateCalendarTruth: boolean;
  readonly mayDirectlyMutateRenewalTruth: boolean;
}

const DECISIONS: Readonly<Record<SchedulingAuthorityDecision['source'], SchedulingAuthorityDecision>> = Object.freeze({
  calendar_event: Object.freeze({
    source: 'calendar_event',
    role: 'canonical_schedule_truth',
    mayDirectlyMutateCalendarTruth: true,
    mayDirectlyMutateRenewalTruth: false,
  }),
  renewal: Object.freeze({
    source: 'renewal',
    role: 'canonical_renewal_truth',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: true,
  }),
  workflow_deadline_rule: Object.freeze({
    source: 'workflow_deadline_rule',
    role: 'deadline_rule_truth',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
  client_portal_appointment_response: Object.freeze({
    source: 'client_portal_appointment_response',
    role: 'confirmation_input_only',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
  field_assignment: Object.freeze({
    source: 'field_assignment',
    role: 'field_operation_evidence_only',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
  organization_scope_ownership: Object.freeze({
    source: 'organization_scope_ownership',
    role: 'scope_ownership_only',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
  notification: Object.freeze({
    source: 'notification',
    role: 'attention_projection_only',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
  external_calendar: Object.freeze({
    source: 'external_calendar',
    role: 'external_projection_only',
    mayDirectlyMutateCalendarTruth: false,
    mayDirectlyMutateRenewalTruth: false,
  }),
});

export function schedulingAuthorityDecision(source: SchedulingAuthorityDecision['source']): SchedulingAuthorityDecision {
  return DECISIONS[source];
}

export interface GovernedSchedulingMutationInput {
  readonly boundary: 'm10-domain-command' | 'direct-browser-table-write';
  readonly actorAuthenticated: boolean;
  readonly workspaceAuthorized: boolean;
  readonly optimisticVersionMatched: boolean;
  readonly terminalFact: boolean;
  readonly action: 'create' | 'reschedule' | 'complete' | 'cancel' | 'record_attendance';
}

export function assertGovernedSchedulingMutation(input: GovernedSchedulingMutationInput): void {
  if (input.boundary !== 'm10-domain-command') throw new Error('ENJAZ_SCHEDULING_GOVERNED_COMMAND_REQUIRED');
  if (!input.actorAuthenticated) throw new Error('ENJAZ_SCHEDULING_AUTH_REQUIRED');
  if (!input.workspaceAuthorized) throw new Error('ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN');
  if (!input.optimisticVersionMatched) throw new Error('ENJAZ_SCHEDULING_STALE_VERSION');
  if (input.terminalFact && input.action !== 'record_attendance') throw new Error('ENJAZ_SCHEDULING_TERMINAL_FACT_IMMUTABLE');
}

export interface StaffConflictInput {
  readonly workspaceId: string;
  readonly assignedOrganizationMemberId: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
}

function time(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error('ENJAZ_SCHEDULING_TIME_INVALID');
  return parsed;
}

export function staffConflictComparisonAllowed(a: StaffConflictInput, b: StaffConflictInput): boolean {
  if (a.workspaceId !== b.workspaceId) return false;
  if (a.assignedOrganizationMemberId === null || b.assignedOrganizationMemberId === null) return false;
  return a.assignedOrganizationMemberId === b.assignedOrganizationMemberId;
}

export function schedulingRangesOverlap(a: StaffConflictInput, b: StaffConflictInput): boolean {
  if (!staffConflictComparisonAllowed(a, b)) return false;
  const aStart = time(a.startsAt);
  const bStart = time(b.startsAt);
  const aEnd = a.endsAt === null ? aStart : time(a.endsAt);
  const bEnd = b.endsAt === null ? bStart : time(b.endsAt);
  if (aEnd < aStart || bEnd < bStart) throw new Error('ENJAZ_SCHEDULING_RANGE_INVALID');
  return aStart < bEnd && bStart < aEnd;
}

export interface DeadlineAuthorityInput {
  readonly dueOffsetDays: number | null;
  readonly stageAnchorObserved: boolean;
  readonly workspaceTimezone: string | null;
}

export function workflowDeadlineMayBeGenerated(input: DeadlineAuthorityInput): boolean {
  if (input.dueOffsetDays === null) return false;
  if (!Number.isSafeInteger(input.dueOffsetDays) || input.dueOffsetDays < 0) throw new Error('ENJAZ_SCHEDULING_DEADLINE_RULE_INVALID');
  if (!input.stageAnchorObserved) return false;
  if (!input.workspaceTimezone || !input.workspaceTimezone.trim()) return false;
  return true;
}
