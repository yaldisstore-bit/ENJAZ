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

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTransaction360MoneySafe(value: number): boolean {
  return Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100));
}

function timelineItem(id: string, kind: Transaction360TimelineKind, title: string, detail: string | null, occurredAt: string): Transaction360TimelineItem {
  return { id, kind, title, detail, occurredAt, timestampValid: timestamp(occurredAt) !== null };
}

function buildTimeline(source: Transaction360Source) {
  const items: Transaction360TimelineItem[] = [];
  for (const row of source.activity.items) items.push(timelineItem(`activity:${row.id}`, 'activity', row.summary.trim() || row.event_type, row.event_type, row.occurred_at));
  for (const row of source.routes.items) items.push(timelineItem(`route:${row.id}`, 'route', row.station_name.trim() || 'محطة معاملة', row.assigned_to_text?.trim() || null, row.occurred_at));
  for (const row of source.notes.items) items.push(timelineItem(`note:${row.id}`, 'note', 'ملاحظة', row.body.trim() || null, row.created_at));
  for (const row of source.feeChanges.items) items.push(timelineItem(`fee:${row.id}`, 'fee', 'تغيير الأتعاب', row.reason.trim() || null, row.effective_at));
  for (const row of source.payments.items) items.push(timelineItem(`payment:${row.id}`, 'payment', 'دفعة مالية', row.receipt_ref.trim() || null, row.paid_at));
  items.sort((a, b) => (timestamp(b.occurredAt) ?? -Infinity) - (timestamp(a.occurredAt) ?? -Infinity) || a.id.localeCompare(b.id));
  return {
    items: items.slice(0, TRANSACTION_360_TIMELINE_LIMIT),
    truncated: [source.activity, source.routes, source.notes, source.feeChanges, source.payments].some((section) => section.state === 'truncated') || items.length > TRANSACTION_360_TIMELINE_LIMIT,
  };
}

function summarizeFollowups(section: Transaction360Source['followups'], nowMs: number) {
  let active = 0, overdue = 0, completed = 0;
  for (const row of section.items) {
    const status = row.status.trim().toLowerCase();
    if (row.completed_at !== null || ['completed', 'done', 'closed'].includes(status)) { completed++; continue; }
    active++;
    const due = timestamp(row.due_at);
    if (due !== null && due < nowMs) overdue++;
  }
  return { active, overdue, completed };
}

function summarizeFinance(source: Transaction360Source) {
  let postedCount = 0, postedTotal = 0, precisionSafe = true;
  for (const row of source.payments.items) {
    if (row.status.trim().toLowerCase() !== 'posted') continue;
    postedCount++;
    if (isTransaction360MoneySafe(row.amount)) postedTotal += row.amount;
    else precisionSafe = false;
  }
  return { postedCount, postedTotal, precisionSafe: precisionSafe && isTransaction360MoneySafe(postedTotal), feeChanges: source.feeChanges.items.length };
}

function currentWorkflow(section: Transaction360Source['workflows']): RowOf<'workflow_instances'> | null {
  return [...section.items].sort((a, b) => (timestamp(b.started_at) ?? -Infinity) - (timestamp(a.started_at) ?? -Infinity) || a.id.localeCompare(b.id))[0] ?? null;
}

function summarizeRisk(section: Transaction360Source['blockers']) {
  let open = 0, highOrCritical = 0;
  for (const row of section.items) {
    const status = row.status.trim().toLowerCase();
    if (row.resolved_at !== null || status === 'resolved' || status === 'closed') continue;
    open++;
    if (['high', 'critical'].includes(row.severity.trim().toLowerCase())) highOrCritical++;
  }
  return { state: section.state, open, highOrCritical, total: section.items.length };
}

export function buildTransaction360Snapshot(source: Transaction360Source, nowMs = Date.now()): Transaction360Snapshot {
  const transaction = source.transaction;
  if (transaction.deleted_at !== null) throw new Error('Deleted transaction cannot be represented by Phase 5.3');
  if (!Number.isFinite(nowMs)) throw new Error('Invalid Phase 5.3 clock');
  const timeline = buildTimeline(source);
  const companyMissing = !source.company || source.company.deleted_at !== null || source.company.id !== transaction.company_id;
  const workflow = currentWorkflow(source.workflows);
  const companyLabel = !companyMissing ? source.company!.display_name?.trim() || source.company!.legal_name.trim() || 'بيانات الشركة غير متاحة' : 'بيانات الشركة غير متاحة';
  const contactLabel = !source.contact || source.contact.deleted_at !== null ? null : source.contact.display_name.trim() || null;
  return {
    id: transaction.id, shortId: transaction.id.slice(0, 8), type: transaction.type.trim() || 'معاملة بلا نوع', department: transaction.department?.trim() || null,
    status: transaction.status, priority: transaction.priority, companyId: transaction.company_id, companyLabel, companyMissing, contactLabel, contactState: source.contactState,
    currentFee: transaction.current_fee, feePrecisionSafe: isTransaction360MoneySafe(transaction.current_fee), createdAt: transaction.created_at, updatedAt: transaction.updated_at,
    lastActivityAt: transaction.last_activity_at, completedAt: transaction.completed_at, archivedAt: transaction.archived_at,
    timeline: timeline.items, timelineTruncated: timeline.truncated, notes: source.notes, followups: source.followups, followupSummary: summarizeFollowups(source.followups, nowMs),
    payments: source.payments, financialSummary: summarizeFinance(source), documents: source.documents,
    workflow: { state: source.workflows.state, current: workflow, total: source.workflows.items.length }, risk: summarizeRisk(source.blockers),
    sectionStates: { routes: source.routes.state, activity: source.activity.state, notes: source.notes.state, followups: source.followups.state, payments: source.payments.state, feeChanges: source.feeChanges.state, documents: source.documents.state, workflows: source.workflows.state, blockers: source.blockers.state },
  };
}
