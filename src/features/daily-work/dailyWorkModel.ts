import type { Json } from '../../core/supabase/database.types.ts';
import type { RowOf } from '../../data/contracts/dataTypes.ts';

export const DAILY_WORK_ITEM_LIMIT = 60;
export const DAILY_WORK_RENEWAL_HORIZON_DAYS = 7;
export const DAILY_WORK_CALENDAR_HORIZON_HOURS = 36;

export type DailyWorkSourceKind = 'followup' | 'blocker' | 'calendar' | 'renewal' | 'workflow';
export type DailyWorkTone = 'danger' | 'warning' | 'gold' | 'info' | 'success' | 'neutral';
export type DailyWorkBucket = 'overdue' | 'today' | 'action' | 'upcoming';

export interface DailyWorkItem {
  readonly id: string;
  readonly sourceId: string;
  readonly source: DailyWorkSourceKind;
  readonly title: string;
  readonly subject: string;
  readonly ownerLabel: string;
  readonly stateLabel: string;
  readonly tone: DailyWorkTone;
  readonly bucket: DailyWorkBucket;
  readonly dueAt: string | null;
  readonly transactionId: string | null;
  readonly companyId: string | null;
  readonly score: number;
  readonly completable: boolean;
  readonly snoozable: boolean;
}

export interface DailyWorkSummary {
  readonly total: number;
  readonly overdue: number;
  readonly dueToday: number;
  readonly approvals: number;
  readonly blocked: number;
  readonly upcoming: number;
}

export interface DailyWorkSnapshot {
  readonly generatedAt: string;
  readonly summary: DailyWorkSummary;
  readonly focus: DailyWorkItem | null;
  readonly items: readonly DailyWorkItem[];
}

export interface DailyWorkSource {
  readonly transactions: readonly RowOf<'transactions'>[];
  readonly companies: readonly RowOf<'companies'>[];
  readonly routes: readonly RowOf<'transaction_routes'>[];
  readonly followups: readonly RowOf<'transaction_followups'>[];
  readonly blockers: readonly RowOf<'transaction_blockers'>[];
  readonly calendar: readonly RowOf<'calendar_events'>[];
  readonly renewals: readonly RowOf<'renewals'>[];
  readonly workflowInstances: readonly RowOf<'workflow_instances'>[];
  readonly workflowItemStates: readonly RowOf<'workflow_item_states'>[];
}

function safeDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateOnly(value: string): Date | null {
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function sameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function dueBucket(due: Date | null, now: Date): DailyWorkBucket {
  if (!due) return 'action';
  if (due.getTime() < now.getTime() && !sameDay(due, now)) return 'overdue';
  if (sameDay(due, now)) return 'today';
  return 'upcoming';
}

function stateForDue(bucket: DailyWorkBucket): Readonly<{ label: string; tone: DailyWorkTone; baseScore: number }> {
  if (bucket === 'overdue') return { label: 'متأخرة', tone: 'danger', baseScore: 108 };
  if (bucket === 'today') return { label: 'اليوم', tone: 'gold', baseScore: 88 };
  if (bucket === 'upcoming') return { label: 'قادمة', tone: 'info', baseScore: 52 };
  return { label: 'بحاجة إجراء', tone: 'warning', baseScore: 78 };
}

function activeTransactionMap(rows: readonly RowOf<'transactions'>[]): Map<string, RowOf<'transactions'>> {
  return new Map(rows
    .filter((row) => row.deleted_at === null && row.archived_at === null && row.status !== 'completed')
    .map((row) => [row.id, row]));
}

function activeCompanyMap(rows: readonly RowOf<'companies'>[]): Map<string, RowOf<'companies'>> {
  return new Map(rows
    .filter((row) => row.deleted_at === null && row.status === 'active')
    .map((row) => [row.id, row]));
}

function latestOwnerMap(rows: readonly RowOf<'transaction_routes'>[]): Map<string, string> {
  const ordered = [...rows].sort((a, b) => (safeDate(b.occurred_at)?.getTime() ?? 0) - (safeDate(a.occurred_at)?.getTime() ?? 0));
  const result = new Map<string, string>();
  for (const row of ordered) {
    if (result.has(row.transaction_id)) continue;
    const label = row.assigned_to_text?.trim();
    if (label) result.set(row.transaction_id, label);
  }
  return result;
}

function companyLabel(company: RowOf<'companies'> | undefined): string | null {
  if (!company) return null;
  return company.display_name?.trim() || company.legal_name.trim();
}

function subjectLabel(
  transactionId: string | null,
  companyId: string | null,
  transactions: ReadonlyMap<string, RowOf<'transactions'>>,
  companies: ReadonlyMap<string, RowOf<'companies'>>,
): string {
  const transaction = transactionId ? transactions.get(transactionId) : undefined;
  const company = companyId
    ? companies.get(companyId)
    : transaction
      ? companies.get(transaction.company_id)
      : undefined;
  const companyName = companyLabel(company);
  if (transaction && companyName) return `${companyName} · ${transaction.type}`;
  if (companyName) return companyName;
  if (transaction) return transaction.type;
  return 'مساحة العمل';
}

function ownerLabel(transactionId: string | null, owners: ReadonlyMap<string, string>): string {
  return transactionId ? owners.get(transactionId) ?? 'أنت' : 'أنت';
}

function ageBoost(date: Date | null, now: Date, max = 16): number {
  if (!date) return 0;
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
  return Math.min(max, days);
}

function findWorkflowItemTitle(snapshot: Json, itemKey: string): string | null {
  if (Array.isArray(snapshot)) {
    for (const value of snapshot) {
      const title = findWorkflowItemTitle(value, itemKey);
      if (title) return title;
    }
    return null;
  }
  if (!snapshot || typeof snapshot !== 'object') return null;
  const record = snapshot as Record<string, Json | undefined>;
  const keyCandidate = [record.key, record.item_key, record.template_item_key, record.id]
    .find((value) => typeof value === 'string' && value === itemKey);
  if (keyCandidate && typeof record.title === 'string' && record.title.trim()) return record.title.trim();
  for (const value of Object.values(record)) {
    if (value === undefined) continue;
    const title = findWorkflowItemTitle(value, itemKey);
    if (title) return title;
  }
  return null;
}

function blockerPresentation(severity: string): Readonly<{ label: string; tone: DailyWorkTone; score: number }> {
  if (severity === 'critical') return { label: 'عائق حرج', tone: 'danger', score: 132 };
  if (severity === 'high') return { label: 'عائق مرتفع', tone: 'danger', score: 116 };
  if (severity === 'medium') return { label: 'عائق متوسط', tone: 'warning', score: 92 };
  return { label: 'عائق', tone: 'warning', score: 74 };
}

function freezeItem(item: DailyWorkItem): DailyWorkItem {
  return Object.freeze(item);
}

export function buildDailyWorkSnapshot(source: DailyWorkSource, now: Date = new Date()): DailyWorkSnapshot {
  const transactions = activeTransactionMap(source.transactions);
  const companies = activeCompanyMap(source.companies);
  const owners = latestOwnerMap(source.routes);
  const workflowInstances = new Map(source.workflowInstances
    .filter((row) => row.status === 'active' && transactions.has(row.transaction_id))
    .map((row) => [row.id, row]));
  const candidates: DailyWorkItem[] = [];

  for (const row of source.followups) {
    if (row.status !== 'open' || !transactions.has(row.transaction_id)) continue;
    const snoozedUntil = row.snoozed_until ? safeDate(row.snoozed_until) : null;
    if (snoozedUntil && snoozedUntil.getTime() > now.getTime()) continue;
    const due = safeDate(row.due_at);
    const bucket = dueBucket(due, now);
    const presentation = stateForDue(bucket);
    const transaction = transactions.get(row.transaction_id)!;
    candidates.push(freezeItem({
      id: `followup:${row.id}`,
      sourceId: row.id,
      source: 'followup',
      title: row.title,
      subject: subjectLabel(row.transaction_id, transaction.company_id, transactions, companies),
      ownerLabel: ownerLabel(row.transaction_id, owners),
      stateLabel: presentation.label,
      tone: presentation.tone,
      bucket,
      dueAt: row.due_at,
      transactionId: row.transaction_id,
      companyId: transaction.company_id,
      score: presentation.baseScore + ageBoost(due, now),
      completable: true,
      snoozable: true,
    }));
  }

  for (const row of source.blockers) {
    if (row.status !== 'open' || !transactions.has(row.transaction_id)) continue;
    const transaction = transactions.get(row.transaction_id)!;
    const opened = safeDate(row.opened_at);
    const presentation = blockerPresentation(row.severity);
    candidates.push(freezeItem({
      id: `blocker:${row.id}`,
      sourceId: row.id,
      source: 'blocker',
      title: row.title,
      subject: subjectLabel(row.transaction_id, transaction.company_id, transactions, companies),
      ownerLabel: ownerLabel(row.transaction_id, owners),
      stateLabel: presentation.label,
      tone: presentation.tone,
      bucket: 'action',
      dueAt: row.opened_at,
      transactionId: row.transaction_id,
      companyId: transaction.company_id,
      score: presentation.score + ageBoost(opened, now, 10),
      completable: false,
      snoozable: false,
    }));
  }

  const calendarHorizon = now.getTime() + DAILY_WORK_CALENDAR_HORIZON_HOURS * 3_600_000;
  for (const row of source.calendar) {
    if (row.status !== 'scheduled') continue;
    if (row.transaction_id && !transactions.has(row.transaction_id)) continue;
    if (row.company_id && !companies.has(row.company_id)) continue;
    const due = safeDate(row.starts_at);
    if (!due || due.getTime() > calendarHorizon) continue;
    const bucket = dueBucket(due, now);
    const presentation = stateForDue(bucket);
    candidates.push(freezeItem({
      id: `calendar:${row.id}`,
      sourceId: row.id,
      source: 'calendar',
      title: row.title,
      subject: subjectLabel(row.transaction_id, row.company_id, transactions, companies),
      ownerLabel: ownerLabel(row.transaction_id, owners),
      stateLabel: bucket === 'overdue' ? 'موعد فات' : bucket === 'today' ? 'موعد اليوم' : 'موعد قريب',
      tone: presentation.tone,
      bucket,
      dueAt: row.starts_at,
      transactionId: row.transaction_id,
      companyId: row.company_id,
      score: presentation.baseScore + 4,
      completable: true,
      snoozable: false,
    }));
  }

  const renewalHorizon = now.getTime() + DAILY_WORK_RENEWAL_HORIZON_DAYS * 86_400_000;
  for (const row of source.renewals) {
    if (row.status !== 'active') continue;
    if (row.transaction_id && !transactions.has(row.transaction_id)) continue;
    if (row.company_id && !companies.has(row.company_id)) continue;
    const due = dateOnly(row.due_date);
    if (!due || due.getTime() > renewalHorizon) continue;
    const bucket = dueBucket(due, now);
    const presentation = stateForDue(bucket);
    candidates.push(freezeItem({
      id: `renewal:${row.id}`,
      sourceId: row.id,
      source: 'renewal',
      title: row.title,
      subject: subjectLabel(row.transaction_id, row.company_id, transactions, companies),
      ownerLabel: ownerLabel(row.transaction_id, owners),
      stateLabel: bucket === 'overdue' ? 'تجديد متأخر' : bucket === 'today' ? 'تجديد اليوم' : 'تجديد قريب',
      tone: presentation.tone,
      bucket,
      dueAt: `${row.due_date}T12:00:00`,
      transactionId: row.transaction_id,
      companyId: row.company_id,
      score: presentation.baseScore + 7,
      completable: true,
      snoozable: false,
    }));
  }

  for (const row of source.workflowItemStates) {
    if (row.status !== 'pending') continue;
    const instance = workflowInstances.get(row.workflow_instance_id);
    if (!instance) continue;
    const transaction = transactions.get(instance.transaction_id)!;
    const title = findWorkflowItemTitle(instance.template_snapshot, row.template_item_key) ?? 'إجراء ضمن سير العمل';
    candidates.push(freezeItem({
      id: `workflow:${row.id}`,
      sourceId: row.id,
      source: 'workflow',
      title,
      subject: subjectLabel(instance.transaction_id, transaction.company_id, transactions, companies),
      ownerLabel: ownerLabel(instance.transaction_id, owners),
      stateLabel: 'بحاجة إجراء',
      tone: 'warning',
      bucket: 'action',
      dueAt: null,
      transactionId: instance.transaction_id,
      companyId: transaction.company_id,
      score: 84,
      completable: true,
      snoozable: false,
    }));
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const leftDue = left.dueAt ? (safeDate(left.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? (safeDate(right.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return left.id.localeCompare(right.id, 'ar');
  });

  const summary: DailyWorkSummary = Object.freeze({
    total: candidates.length,
    overdue: candidates.filter((item) => item.bucket === 'overdue').length,
    dueToday: candidates.filter((item) => item.bucket === 'today').length,
    approvals: candidates.filter((item) => item.source === 'workflow').length,
    blocked: candidates.filter((item) => item.source === 'blocker').length,
    upcoming: candidates.filter((item) => item.bucket === 'upcoming').length,
  });
  const items = Object.freeze(candidates.slice(0, DAILY_WORK_ITEM_LIMIT));
  return Object.freeze({
    generatedAt: now.toISOString(),
    summary,
    focus: items[0] ?? null,
    items,
  });
}
