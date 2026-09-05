import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowOf } from '../src/data/contracts/dataTypes.ts';
import {
  buildTransaction360Snapshot,
  TRANSACTION_360_TIMELINE_LIMIT,
  type Transaction360Section,
  type Transaction360Source,
} from '../src/features/transactions/transaction360Model.ts';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const TRANSACTION_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY_ID = '33333333-3333-4333-8333-333333333333';

const ready = <T>(items: readonly T[] = []): Transaction360Section<T> => Object.freeze({ state: 'ready', items });

function transaction(patch: Partial<RowOf<'transactions'>> = {}): RowOf<'transactions'> {
  return {
    id: TRANSACTION_ID, workspace_id: WORKSPACE_ID, company_id: COMPANY_ID, primary_contact_id: null,
    type: 'تأسيس شركة', department: 'الشركات', status: 'active', priority: 'high', current_fee: 250_000,
    created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-04T08:00:00.000Z', last_activity_at: '2026-09-04T08:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
    ...patch,
  };
}

function company(): RowOf<'companies'> {
  return {
    id: COMPANY_ID, workspace_id: WORKSPACE_ID, legal_name: 'شركة الاختبار', display_name: 'الاختبار', capital: null, address: null, activities: null,
    registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null,
    created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z', deleted_at: null,
  };
}

function source(patch: Partial<Transaction360Source> = {}): Transaction360Source {
  return {
    transaction: transaction(), company: company(), contact: null, contactState: 'missing',
    routes: ready(), activity: ready(), notes: ready(), followups: ready(), payments: ready(), feeChanges: ready(), documents: ready(), workflows: ready(), blockers: ready(),
    ...patch,
  };
}

test('transaction 360 refuses deleted transactions', () => {
  assert.throws(() => buildTransaction360Snapshot(source({ transaction: transaction({ deleted_at: '2026-09-05T08:00:00.000Z' }) })), /Deleted transaction/);
});

test('transaction 360 keeps missing company relation explicit', () => {
  const snapshot = buildTransaction360Snapshot(source({ company: null }), Date.parse('2026-09-05T12:00:00.000Z'));
  assert.equal(snapshot.companyMissing, true);
  assert.equal(snapshot.companyLabel, 'بيانات الشركة غير متاحة');
});

test('transaction 360 timeline is deterministic, bounded and preserves invalid timestamps explicitly', () => {
  const activity = Array.from({ length: TRANSACTION_360_TIMELINE_LIMIT + 5 }, (_, index): RowOf<'transaction_activity'> => ({
    id: `activity-${String(index).padStart(3, '0')}`, workspace_id: WORKSPACE_ID, transaction_id: TRANSACTION_ID,
    event_type: 'status', summary: `حدث ${index}`, occurred_at: index === 0 ? 'not-a-date' : `2026-09-04T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
    source_entity_type: null, source_entity_id: null, metadata: {}, actor_user_id: null, legacy_id: null, legacy_source: null,
  }));
  const snapshot = buildTransaction360Snapshot(source({ activity: ready(activity) }), Date.parse('2026-09-05T12:00:00.000Z'));
  assert.equal(snapshot.timeline.length, TRANSACTION_360_TIMELINE_LIMIT);
  assert.equal(snapshot.timelineTruncated, true);
  assert.equal(snapshot.timeline.some((item) => item.timestampValid === false), false, 'invalid oldest item should fall outside the bounded newest timeline');
  assert.ok(snapshot.timeline[0]!.occurredAt >= snapshot.timeline.at(-1)!.occurredAt);
});

test('transaction 360 exposes follow-up, finance and risk summaries without inventing unavailable sections', () => {
  const followups: RowOf<'transaction_followups'>[] = [
    { id: 'f1', workspace_id: WORKSPACE_ID, transaction_id: TRANSACTION_ID, title: 'متابعة متأخرة', due_at: '2026-09-01T08:00:00.000Z', status: 'open', created_at: '2026-08-30T08:00:00.000Z', completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null },
    { id: 'f2', workspace_id: WORKSPACE_ID, transaction_id: TRANSACTION_ID, title: 'مكتملة', due_at: '2026-09-02T08:00:00.000Z', status: 'completed', created_at: '2026-08-30T08:00:00.000Z', completed_at: '2026-09-02T09:00:00.000Z', completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null },
  ];
  const payments: RowOf<'payments'>[] = [
    { id: 'p1', workspace_id: WORKSPACE_ID, transaction_id: TRANSACTION_ID, company_id: COMPANY_ID, amount: 100_000, method: 'cash', paid_at: '2026-09-03T08:00:00.000Z', status: 'posted', receipt_ref: 'R-1', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-03T08:00:00.000Z' },
  ];
  const blockers: RowOf<'transaction_blockers'>[] = [
    { id: 'b1', workspace_id: WORKSPACE_ID, transaction_id: TRANSACTION_ID, title: 'مستند ناقص', severity: 'critical', note: null, status: 'open', opened_at: '2026-09-03T08:00:00.000Z', resolved_at: null },
  ];
  const snapshot = buildTransaction360Snapshot(source({
    followups: ready(followups), payments: ready(payments), blockers: ready(blockers),
    documents: Object.freeze({ state: 'unavailable', items: Object.freeze([]) }),
  }), Date.parse('2026-09-05T12:00:00.000Z'));
  assert.deepEqual(snapshot.followupSummary, { active: 1, overdue: 1, completed: 1 });
  assert.deepEqual(snapshot.financialSummary, { postedCount: 1, postedTotal: 100_000, precisionSafe: true, feeChanges: 0 });
  assert.equal(snapshot.risk.open, 1);
  assert.equal(snapshot.risk.highOrCritical, 1);
  assert.equal(snapshot.sectionStates.documents, 'unavailable');
});

test('transaction 360 never marks unsafe money as exact', () => {
  const snapshot = buildTransaction360Snapshot(source({ transaction: transaction({ current_fee: Number.MAX_SAFE_INTEGER }) }), Date.parse('2026-09-05T12:00:00.000Z'));
  assert.equal(snapshot.feePrecisionSafe, false);
});
