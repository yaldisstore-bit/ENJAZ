import assert from 'node:assert/strict';
import test from 'node:test';
import type { EnjazDataLayerFactory } from '../src/data/createDataLayer.ts';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import type { DailyWorkSnapshot } from '../src/features/daily-work/dailyWorkModel.ts';
import { buildExecutiveBriefingSnapshot } from '../src/features/executive-briefing/executiveBriefingModel.ts';
import { loadExecutiveBriefing } from '../src/features/executive-briefing/executiveBriefingService.ts';
import type { HomeDashboardSnapshot } from '../src/features/home/homeDashboardModel.ts';

const NOW = new Date('2026-09-04T12:00:00.000Z');

function payment(id: string, amount: number, paidAt: string, status = 'posted'): RowOf<'payments'> {
  return {
    id,
    workspace_id: '00000000-0000-4000-8000-000000000001',
    transaction_id: '00000000-0000-4000-8000-000000000010',
    company_id: '00000000-0000-4000-8000-000000000020',
    amount,
    method: 'cash',
    paid_at: paidAt,
    status,
    receipt_ref: `R-${id}`,
    note: null,
    legacy_id: null,
    legacy_source: null,
    created_at: paidAt,
  };
}

function home(overrides: Partial<HomeDashboardSnapshot> = {}): HomeDashboardSnapshot {
  return {
    activeTransactions: 8,
    urgentTransactions: 2,
    stalledTransactions: 1,
    openFollowups: 4,
    overdueFollowups: 2,
    openBlockers: 2,
    criticalBlockers: 1,
    finance: { activeFees: 10_000_000, collectedAgainstActive: 6_000_000, outstandingActive: 4_000_000, precisionSafe: true },
    priorities: [{ id: 'blocker:b1', transactionId: 't1', companyId: 'c1', companyLabel: 'شركة الاختبار', title: 'عائق حرج', reason: 'يمنع الإغلاق.', level: 'critical', score: 120, destination: '/app/transactions' }],
    signals: [],
    ...overrides,
  };
}

function daily(overrides: Partial<DailyWorkSnapshot> = {}): DailyWorkSnapshot {
  return {
    generatedAt: NOW.toISOString(),
    summary: { total: 9, overdue: 2, dueToday: 3, approvals: 1, blocked: 2, upcoming: 2 },
    focus: null,
    items: [],
    ...overrides,
  };
}

test('executive briefing combines risk, workload, and two seven-day posted-payment windows', () => {
  const snapshot = buildExecutiveBriefingSnapshot(home(), daily(), [
    payment('p1', 2_000_000, '2026-09-03T10:00:00.000Z'),
    payment('p2', 1_000_000, '2026-08-31T10:00:00.000Z'),
    payment('p3', 4_000_000, '2026-08-26T10:00:00.000Z'),
    payment('p4', 9_000_000, '2026-09-03T10:00:00.000Z', 'reversed'),
  ], NOW);

  assert.equal(snapshot.state, 'critical');
  assert.equal(snapshot.finance.posted7d, 3_000_000);
  assert.equal(snapshot.finance.postedPrevious7d, 4_000_000);
  assert.equal(snapshot.finance.deltaAmount, -1_000_000);
  assert.equal(snapshot.finance.trend, 'down');
  assert.equal(snapshot.finance.postedCount7d, 2);
  assert.equal(snapshot.risks.criticalBlockers, 1);
  assert.equal(snapshot.workload.approvals, 1);
  assert.ok(snapshot.decisions.some((item) => item.destination === 'transactions'));
  assert.ok(snapshot.decisions.some((item) => item.destination === 'today'));
  assert.ok(snapshot.decisions.some((item) => item.destination === 'finance'));
});

test('executive briefing can be stable without manufacturing an exception', () => {
  const stableHome = home({ urgentTransactions: 0, stalledTransactions: 0, openFollowups: 0, overdueFollowups: 0, openBlockers: 0, criticalBlockers: 0, priorities: [] });
  const stableDaily = daily({ summary: { total: 0, overdue: 0, dueToday: 0, approvals: 0, blocked: 0, upcoming: 0 } });
  const snapshot = buildExecutiveBriefingSnapshot(stableHome, stableDaily, [], NOW);
  assert.equal(snapshot.state, 'stable');
  assert.equal(snapshot.decisions.length, 0);
  assert.equal(snapshot.finance.trend, 'flat');
});

test('executive briefing refuses false monetary precision', () => {
  const snapshot = buildExecutiveBriefingSnapshot(home(), daily(), [payment('huge', Number.MAX_SAFE_INTEGER, '2026-09-03T10:00:00.000Z')], NOW);
  assert.equal(snapshot.finance.precisionSafe, false);
});

test('executive briefing service composes existing Home and Daily Work sources through the data layer', async () => {
  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const transaction: RowOf<'transactions'> = {
    id: '00000000-0000-4000-8000-000000000010', workspace_id: workspaceId, company_id: '00000000-0000-4000-8000-000000000020', primary_contact_id: null,
    type: 'تأسيس', department: null, status: 'active', priority: 'normal', current_fee: 1_000_000,
    created_at: NOW.toISOString(), updated_at: NOW.toISOString(), last_activity_at: NOW.toISOString(), completed_at: null, archived_at: null, deleted_at: null,
    deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
  };
  const company: RowOf<'companies'> = {
    id: '00000000-0000-4000-8000-000000000020', workspace_id: workspaceId, legal_name: 'شركة الاختبار', display_name: null, capital: null, address: null,
    activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null,
    created_at: NOW.toISOString(), updated_at: NOW.toISOString(), deleted_at: null,
  };
  const payments = [payment('service-p1', 250_000, '2026-09-03T10:00:00.000Z')];
  const repository = <T>(items: readonly T[]) => ({
    async list() { return { items, offset: 0, limit: 100, total: items.length, hasMore: false }; },
    async getById(id: string) { return (items as readonly any[]).find((item) => item.id === id) ?? null; },
  });
  const layer = {
    transactions: repository([transaction]), companies: repository([company]), transactionRoutes: repository([]), followups: repository([]), blockers: repository([]),
    calendar: repository([]), renewals: repository([]), workflowInstances: repository([]), workflowItemStates: repository([]), payments: repository(payments),
  };
  const factory = {
    async resolveWorkspaceId() { return workspaceId; },
    forWorkspace() { return layer; },
  } as unknown as EnjazDataLayerFactory;

  const result = await loadExecutiveBriefing(factory, 'user-1', NOW);
  assert.equal(result.workspaceId, workspaceId);
  assert.equal(result.snapshot.finance.posted7d, 250_000);
  assert.equal(result.snapshot.state, 'stable');
  assert.equal(result.snapshot.summary.includes('1 معاملة نشطة'), true);
});
