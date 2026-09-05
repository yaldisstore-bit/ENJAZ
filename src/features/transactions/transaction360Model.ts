import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type Transaction360SectionState = 'ready' | 'truncated' | 'unavailable';
export type Transaction360TimelineKind = 'activity' | 'route' | 'note' | 'fee' | 'payment';

export const TRANSACTION_360_SECTION_LIMIT = 100;
export const TRANSACTION_360_TIMELINE_LIMIT = 200;

export interface Transaction360Section<T> {
  readonly state: Transaction360SectionState;
  readonly items: readonly T[];
}

export interface Transaction360Source {
  readonly transaction: RowOf<'transactions'>;
  readonly company: RowOf<'companies'> | null;
  readonly contact: RowOf<'contacts'> | null;
  readonly contactState: 'ready' | 'missing' | 'unavailable';
  readonly routes: Transaction360Section<RowOf<'transaction_routes'>>;
  readonly activity: Transaction360Section<RowOf<'transaction_activity'>>;
  readonly notes: Transaction360Section<RowOf<'transaction_notes'>>;
  readonly followups: Transaction360Section<RowOf<'transaction_followups'>>;
  readonly payments: Transaction360Section<RowOf<'payments'>>;
  readonly feeChanges: Transaction360Section<RowOf<'fee_changes'>>;
  readonly documents: Transaction360Section<RowOf<'documents'>>;
  readonly workflows: Transaction360Section<RowOf<'workflow_instances'>>;
  readonly blockers: Transaction360Section<RowOf<'transaction_blockers'>>;
}

export interface Transaction360TimelineItem {
  readonly id: string;
  readonly kind: Transaction360TimelineKind;
  readonly title: string;
  readonly detail: string | null;
  readonly occurredAt: string;
  readonly timestampValid: boolean;
}

export interface Transaction360Snapshot {
  readonly id: string;
  readonly shortId: string;
  readonly type: string;
  readonly department: string | null;
  readonly status: string;
  readonly priority: string;
  readonly companyId: string;
  readonly companyLabel: string;
  readonly companyMissing: boolean;
  readonly contactLabel: string | null;
  readonly contactState: 'ready' | 'missing' | 'unavailable';
  readonly currentFee: number;
  readonly feePrecisionSafe: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastActivityAt: string;
  readonly completedAt: string | null;
  readonly archivedAt: string | null;
  readonly timeline: readonly Transaction360TimelineItem[];
  readonly timelineTruncated: boolean;
  readonly notes: Transaction360Section<RowOf<'transaction_notes'>>;
  readonly followups: Transaction360Section<RowOf<'transaction_followups'>>;
  readonly followupSummary: Readonly<{ active: number; overdue: number; completed: number }>;
  readonly payments: Transaction360Section<RowOf<'payments'>>;
  readonly financialSummary: Readonly<{ postedCount: number; postedTotal: number; precisionSafe: boolean; feeChanges: number }>;
  readonly documents: Transaction360Section<RowOf<'documents'>>;
  readonly workflow: Readonly<{ state: Transaction360SectionState; current: RowOf<'workflow_instances'> | null; total: number }>;
  readonly risk: Readonly<{ state: Transaction360SectionState; open: number; highOrCritical: number; total: number }>;
  readonly sectionStates: Readonly<Record<'routes' | 'activity' | 'notes' | 'followups' | 'payments' | 'feeChanges' | 'documents' | 'workflows' | 'blockers', Transaction360SectionState>>;
}

function safeTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTransaction360MoneySafe(value: number): boolean {
  return Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100));
}

function relationLabel(company: RowOf<'companies'> | null): string {
  if (!company || company.deleted_at !== null) return 'بيانات الشركة غير متاحة';
  return company.display_name?.trim() || company.legal_name.trim() || 'بيانات الشركة غير متاحة';
}

function contactLabel(contact: RowOf<'contacts'> | null): string | null {
  if (!contact || contact.deleted_at !== null) return null;
  return contact.display_name.trim() || null;
}

function timelineItem(id: string, kind: Transaction360TimelineKind, title: string, detail: string | null, occurredAt: string): Transaction360TimelineItem {
  return Object.freeze({ id, kind, title, detail, occurredAt, timestampValid: safeTimestamp(occurredAt) !== null });
}

function buildTimeline(source: Transaction360Source): Readonly<{ items: readonly Transaction360TimelineItem[]; truncated: boolean }> {
  const items: Transaction360TimelineItem[] = [];
  for (const row of source.activity.items) items.push(timelineItem(`activity:${row.id}`, 'activity', row.summary.trim() || row.event_type, row.event_type, row.occurred_at));
  for (const row of source.routes.items) items.push(timelineItem(`route:${row.id}`, 'route', row.station_name.trim() || 'محطة معاملة', row.assigned_to_text?.trim() || null, row.occurred_at));
  for (const row of source.notes.items) items.push(timelineItem(`note:${row.id}`, 'note', 'ملاحظة', row.body.trim() || null, row.created_at));
  for (const row of source.feeChanges.items) items.push(timelineItem(`fee:${row.id}`, 'fee', 'تغيير الأتعاب', row.reason.trim() || null, row.effective_at));
  for (const row of source.payments.items) items.push(timelineItem(`payment:${row.id}`, 'payment', 'دفعة مالية', row.receipt_ref.trim() || null, row.paid_at));

  items.sort((a, b) => {
    const aTime = safeTimestamp(a.occurredAt) ?? Number.NEGATIVE_INFINITY;
    const bTime = safeTimestamp(b.occurredAt) ?? Number.NEGATIVE_INFINITY;
    return bTime - aTime || a.id.localeCompare(b.id);
  });
  const truncatedBySource = [source.activity, source.routes, source.notes, source.feeChanges, source.payments].some((section) => section.state === 'truncated');
  const truncated = truncatedBySource || items.length > TRANSACTION_360_TIMELINE_LIMIT;
  return Object.freeze({ items: Object.freeze(items.slice(0, TRANSACTION_360_TIMELINE_LIMIT)), truncated });
}

function summarizeFollowups(section: Transaction360Source['followups'], nowMs: number) {
  let active = 0;
  let overdue = 0;
  let completed = 0;
  for (const row of section.items) {
    const status = row.status.trim().toLowerCase();
    const done = row.completed_at !== null || status === 'completed' || status === 'done' || status === 'closed';
    if (done) { completed += 1; continue; }
    active += 1;
    const due = safeTimestamp(row.due_at);
    if (due !== null && due < nowMs) overdue += 1;
  }
  return Object.freeze({ active, overdue, completed });
}

function summarizeFinance(source: Transaction360Source) {
  let postedCount = 0;
  let postedTotal = 0;
  let precisionSafe = true;
  for (const row of source.payments.items) {
    if (row.status.trim().toLowerCase() !== 'posted') continue;
    postedCount += 1;
    if (!isTransaction360MoneySafe(row.amount)) precisionSafe = false;
    else postedTotal += row.amount;
  }
  if (!isTransaction360MoneySafe(postedTotal)) precisionSafe = false;
  return Object.freeze({ postedCount, postedTotal, precisionSafe, feeChanges: source.feeChanges.items.length });
}

function currentWorkflow(section: Transaction360Source['workflows']): RowOf<'workflow_instances'> | null {
  const sorted = [...section.items].sort((a, b) => {
    const aTime = safeTimestamp(a.started_at) ?? Number.NEGATIVE_INFINITY;
    const bTime = safeTimestamp(b.started_at) ?? Number.NEGATIVE_INFINITY;
    return bTime - aTime || a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

function summarizeRisk(section: Transaction360Source['blockers']) {
  let open = 0;
  let highOrCritical = 0;
  for (const row of section.items) {
    const status = row.status.trim().toLowerCase();
    if (row.resolved_at !== null || status === 'resolved' || status === 'closed') continue;
    open += 1;
    const severity = row.severity.trim().toLowerCase();
    if (severity === 'high' || severity === 'critical') highOrCritical += 1;
  }
  return Object.freeze({ state: section.state, open, highOrCritical, total: section.items.length });
}

export function buildTransaction360Snapshot(source: Transaction360Source, nowMs = Date.now()): Transaction360Snapshot {
  if (source.transaction.deleted_at !== null) throw new Error('Deleted transaction cannot be represented by Phase 5.3');
  if (!Number.isFinite(nowMs)) throw new Error('Invalid Phase 5.3 clock');

  const timeline = buildTimeline(source);
  const companyMissing = !source.company || source.company.deleted_at !== null || source.company.id !== source.transaction.company_id;
  const workflow = currentWorkflow(source.workflows);
  const sectionStates = Object.freeze({
    routes: source.routes.state,
    activity: source.activity.state,
    notes: source.notes.state,
    followups: source.followups.state,
    payments: source.payments.state,
    feeChanges: source.feeChanges.state,
    documents: source.documents.state,
    workflows: source.workflows.state,
    blockers: source.blockers.state,
  });

  return Object.freeze({
    id: source.transaction.id,
    shortId: source.transaction.id.slice(0, 8),
    type: source.transaction.type.trim() || 'معاملة بلا نوع',
    department: source.transaction.department?.trim() || null,
    status: source.transaction.status,
    priority: source.transaction.priority,
    companyId: source.transaction.company_id,
    companyLabel: relationLabel(source.company),
    companyMissing,
    contactLabel: contactLabel(source.contact),
    contactState: source.contactState,
    currentFee: source.transaction.current_fee,
    feePrecisionSafe: isTransaction360MoneySafe(source.transaction.current_fee),
    createdAt: source.transaction.created_at,
    updatedAt: source.transaction.updated_at,
    lastActivityAt: source.transaction.last_activity_at,
    completedAt: source.transaction.completed_at,
    archivedAt: source.transaction.archived_at,
    timeline: timeline.items,
    timelineTruncated: timeline.truncated,
    notes: source.notes,
    followups: source.followups,
    followupSummary: summarizeFollowups(source.followups, nowMs),
    payments: source.payments,
    financialSummary: summarizeFinance(source),
    documents: source.documents,
    workflow: Object.freeze({ state: source.workflows.state, current: workflow, total: source.workflows.items.length }),
    risk: summarizeRisk(source.blockers),
    sectionStates,
  });
}
