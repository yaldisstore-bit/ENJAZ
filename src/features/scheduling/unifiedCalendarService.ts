import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';

export type UnifiedCalendarSourceKind = 'appointment' | 'workflow_deadline' | 'renewal_occurrence';
export type UnifiedCalendarAuthority = UnifiedCalendarSourceKind | null;
export type UnifiedCalendarConflictState = 'clear' | 'conflict' | 'unknown_assignment' | 'unknown_range' | 'not_applicable';
export type UnifiedCalendarTemporalState =
  | 'cancelled' | 'completed' | 'upcoming' | 'in_progress' | 'past_unresolved'
  | 'completed_on_time' | 'completed_late' | 'overdue' | 'due_today';

export interface UnifiedCalendarFilters {
  readonly windowStart?: string | null;
  readonly windowEnd?: string | null;
  readonly staffMemberId?: string | null;
  readonly companyId?: string | null;
  readonly transactionId?: string | null;
  readonly authority?: UnifiedCalendarAuthority;
  readonly limit?: number;
}

export interface UnifiedCalendarItem {
  readonly id: string;
  readonly sourceKind: UnifiedCalendarSourceKind;
  readonly canonicalId: string;
  readonly title: string;
  readonly eventType: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly allDay: boolean;
  readonly localDate: string;
  readonly status: string;
  readonly temporalState: UnifiedCalendarTemporalState;
  readonly isUpcoming: boolean;
  readonly isOverdue: boolean;
  readonly transactionId: string | null;
  readonly transactionLabel: string | null;
  readonly companyId: string | null;
  readonly companyLabel: string | null;
  readonly staffMemberIds: readonly string[];
  readonly conflictState: UnifiedCalendarConflictState;
  readonly isConflict: boolean;
  readonly confirmationStatus: string | null;
  readonly attendanceOutcome: string | null;
  readonly version: number | null;
  readonly workflowInstanceId: string | null;
  readonly renewalId: string | null;
  readonly occurrenceSequence: number | null;
  readonly stagePosition: number | null;
  readonly dueDate: string | null;
  readonly cutoffAt: string | null;
  readonly rescheduleCount: number;
  readonly lastRescheduledAt: string | null;
  readonly lastRescheduleReason: string | null;
  readonly missReviewRecorded: boolean;
}

export interface UnifiedCalendarSummary {
  readonly totalCount: number;
  readonly returnedCount: number;
  readonly appointmentCount: number;
  readonly workflowDeadlineCount: number;
  readonly renewalOccurrenceCount: number;
  readonly conflictCount: number;
  readonly overdueCount: number;
  readonly upcomingCount: number;
  readonly pastUnresolvedAppointmentCount: number;
}

export interface UnifiedCalendarSnapshot {
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly timezone: string;
  readonly asOf: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly filters: Readonly<{
    staffMemberId: string | null;
    companyId: string | null;
    transactionId: string | null;
    authority: UnifiedCalendarAuthority;
  }>;
  readonly summary: UnifiedCalendarSummary;
  readonly items: readonly UnifiedCalendarItem[];
  readonly exportBoundary: Readonly<{
    mode: 'outbound_projection_only';
    externalStateCanonical: false;
    externalMutationAllowed: false;
  }>;
}

export class UnifiedCalendarWorkspaceUnavailableError extends Error {
  constructor() { super('scheduling workspace unavailable'); this.name = 'UnifiedCalendarWorkspaceUnavailableError'; }
}

export class UnifiedCalendarError extends Error {
  readonly code: string;
  constructor(code: string, message = code) { super(message); this.name = 'UnifiedCalendarError'; this.code = code; }
}

const SOURCE_KINDS = new Set<UnifiedCalendarSourceKind>(['appointment','workflow_deadline','renewal_occurrence']);
const CONFLICT_STATES = new Set<UnifiedCalendarConflictState>(['clear','conflict','unknown_assignment','unknown_range','not_applicable']);
const TEMPORAL_STATES = new Set<UnifiedCalendarTemporalState>([
  'cancelled','completed','upcoming','in_progress','past_unresolved',
  'completed_on_time','completed_late','overdue','due_today',
]);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UnifiedCalendarError('INVALID_CALENDAR_PAYLOAD');
  return value as Record<string, unknown>;
}
function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return value;
}
function nullableString(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return value;
}
function integer(value: unknown, field: string, nullable = false): number | null {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return value;
}
function instant(value: unknown, field: string): string {
  const parsed = string(value,field);
  if (!Number.isFinite(Date.parse(parsed))) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return parsed;
}
function nullableInstant(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : instant(value,field);
}
function date(value: unknown, field: string): string {
  const parsed = string(value,field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return parsed;
}
function nullableDate(value: unknown, field: string): string | null { return value == null ? null : date(value,field); }
function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry)) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return Object.freeze([...value]);
}
function enumValue<T extends string>(value: unknown, allowed: Set<T>, field: string): T {
  const parsed = string(value,field) as T;
  if (!allowed.has(parsed)) throw new UnifiedCalendarError(`INVALID_${field.toUpperCase()}`);
  return parsed;
}
function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const row = error as Record<string,unknown>;
    if (typeof row.message === 'string') return row.message;
    if (typeof row.code === 'string') return row.code;
  }
  return String(error || 'SCHEDULING_CALENDAR_RPC_FAILED');
}
function throwRpc(error: unknown): never {
  const text = errorText(error);
  const marker = text.match(/ENJAZ_[A-Z0-9_]+/)?.[0] ?? 'SCHEDULING_CALENDAR_RPC_FAILED';
  throw new UnifiedCalendarError(marker,text);
}

function parseItem(value: unknown): UnifiedCalendarItem {
  const row = object(value);
  const sourceKind = enumValue(row.sourceKind,SOURCE_KINDS,'sourceKind');
  const conflictState = enumValue(row.conflictState,CONFLICT_STATES,'conflictState');
  const temporalState = enumValue(row.temporalState,TEMPORAL_STATES,'temporalState');
  return Object.freeze({
    id:string(row.id,'id'), sourceKind, canonicalId:string(row.canonicalId,'canonicalId'),
    title:string(row.title,'title'), eventType:string(row.eventType,'eventType'),
    startsAt:instant(row.startsAt,'startsAt'), endsAt:nullableInstant(row.endsAt,'endsAt'),
    allDay:boolean(row.allDay,'allDay'), localDate:date(row.localDate,'localDate'),
    status:string(row.status,'status'), temporalState,
    isUpcoming:boolean(row.isUpcoming,'isUpcoming'), isOverdue:boolean(row.isOverdue,'isOverdue'),
    transactionId:nullableString(row.transactionId), transactionLabel:nullableString(row.transactionLabel),
    companyId:nullableString(row.companyId), companyLabel:nullableString(row.companyLabel),
    staffMemberIds:stringArray(row.staffMemberIds,'staffMemberIds'), conflictState,
    isConflict:boolean(row.isConflict,'isConflict'),
    confirmationStatus:nullableString(row.confirmationStatus), attendanceOutcome:nullableString(row.attendanceOutcome),
    version:integer(row.version,'version',true), workflowInstanceId:nullableString(row.workflowInstanceId),
    renewalId:nullableString(row.renewalId), occurrenceSequence:integer(row.occurrenceSequence,'occurrenceSequence',true),
    stagePosition:integer(row.stagePosition,'stagePosition',true), dueDate:nullableDate(row.dueDate,'dueDate'),
    cutoffAt:nullableInstant(row.cutoffAt,'cutoffAt'), rescheduleCount:integer(row.rescheduleCount,'rescheduleCount') as number,
    lastRescheduledAt:nullableInstant(row.lastRescheduledAt,'lastRescheduledAt'), lastRescheduleReason:nullableString(row.lastRescheduleReason),
    missReviewRecorded:boolean(row.missReviewRecorded,'missReviewRecorded'),
  });
}

function parseSnapshot(value: unknown): UnifiedCalendarSnapshot {
  const row = object(value);
  if (row.schema !== 'enjaz.scheduling-calendar.v1') throw new UnifiedCalendarError('INVALID_CALENDAR_SCHEMA');
  const filters = object(row.filters);
  const summary = object(row.summary);
  const boundary = object(row.exportBoundary);
  if (!Array.isArray(row.items)) throw new UnifiedCalendarError('INVALID_CALENDAR_ITEMS');
  const authority = filters.authority == null ? null : enumValue(filters.authority,SOURCE_KINDS,'authority');
  if (boundary.mode !== 'outbound_projection_only' || boundary.externalStateCanonical !== false || boundary.externalMutationAllowed !== false) {
    throw new UnifiedCalendarError('INVALID_CALENDAR_EXPORT_BOUNDARY');
  }
  return Object.freeze({
    workspaceId:string(row.workspaceId,'workspaceId'), actorUserId:string(row.actorUserId,'actorUserId'), timezone:string(row.timezone,'timezone'),
    asOf:instant(row.asOf,'asOf'), windowStart:instant(row.windowStart,'windowStart'), windowEnd:instant(row.windowEnd,'windowEnd'),
    filters:Object.freeze({ staffMemberId:nullableString(filters.staffMemberId), companyId:nullableString(filters.companyId), transactionId:nullableString(filters.transactionId), authority }),
    summary:Object.freeze({
      totalCount:integer(summary.totalCount,'totalCount') as number, returnedCount:integer(summary.returnedCount,'returnedCount') as number,
      appointmentCount:integer(summary.appointmentCount,'appointmentCount') as number,
      workflowDeadlineCount:integer(summary.workflowDeadlineCount,'workflowDeadlineCount') as number,
      renewalOccurrenceCount:integer(summary.renewalOccurrenceCount,'renewalOccurrenceCount') as number,
      conflictCount:integer(summary.conflictCount,'conflictCount') as number,
      overdueCount:integer(summary.overdueCount,'overdueCount') as number,
      upcomingCount:integer(summary.upcomingCount,'upcomingCount') as number,
      pastUnresolvedAppointmentCount:integer(summary.pastUnresolvedAppointmentCount,'pastUnresolvedAppointmentCount') as number,
    }),
    items:Object.freeze(row.items.map(parseItem)),
    exportBoundary:Object.freeze({ mode:'outbound_projection_only', externalStateCanonical:false, externalMutationAllowed:false }),
  });
}

function validateInput(input: UnifiedCalendarFilters): void {
  if (input.windowStart != null && !Number.isFinite(Date.parse(input.windowStart))) throw new UnifiedCalendarError('INVALID_WINDOW_START');
  if (input.windowEnd != null && !Number.isFinite(Date.parse(input.windowEnd))) throw new UnifiedCalendarError('INVALID_WINDOW_END');
  if (input.windowStart && input.windowEnd && Date.parse(input.windowEnd)<=Date.parse(input.windowStart)) throw new UnifiedCalendarError('INVALID_WINDOW_RANGE');
  if (input.authority != null && !SOURCE_KINDS.has(input.authority)) throw new UnifiedCalendarError('INVALID_AUTHORITY');
  if (input.limit != null && (!Number.isSafeInteger(input.limit) || input.limit<1 || input.limit>1000)) throw new UnifiedCalendarError('INVALID_LIMIT');
}

export async function loadUnifiedCalendar(
  factory: EnjazDataLayerFactory,userId: string,input: UnifiedCalendarFilters = {},
): Promise<UnifiedCalendarSnapshot> {
  validateInput(input);
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new UnifiedCalendarWorkspaceUnavailableError();
  if (!factory.rpc) throw new UnifiedCalendarError('SCHEDULING_CALENDAR_RPC_UNAVAILABLE');
  const result = await factory.rpc<unknown>('get_scheduling_calendar_v1',{
    p_workspace_id:workspaceId,
    p_window_start:input.windowStart ?? null,
    p_window_end:input.windowEnd ?? null,
    p_staff_member_id:input.staffMemberId ?? null,
    p_company_id:input.companyId ?? null,
    p_transaction_id:input.transactionId ?? null,
    p_authority:input.authority ?? null,
    p_limit:input.limit ?? 500,
  });
  if (result.error) throwRpc(result.error);
  return parseSnapshot(result.data);
}
