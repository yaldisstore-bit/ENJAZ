import type { RowOf } from '../../../data/contracts/dataTypes.ts';
import { buildHomeDashboardSnapshot, enrichHomePriorityCompanies } from '../homeDashboardModel.ts';
import { HomeDashboardView } from './HomeDashboardPage.tsx';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_A = '22222222-2222-4222-8222-222222222222';
const COMPANY_B = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-09-03T12:00:00.000Z');

const transactions: readonly RowOf<'transactions'>[] = Object.freeze([
  {
    id: '44444444-4444-4444-8444-444444444444', workspace_id: WORKSPACE_ID, company_id: COMPANY_A, primary_contact_id: null,
    type: 'تجديد إجازة استثمار', department: 'دائرة تسجيل الشركات', status: 'active', priority: 'urgent', current_fee: 2_500_000,
    created_at: '2026-08-20T08:00:00.000Z', updated_at: '2026-09-03T10:00:00.000Z', last_activity_at: '2026-09-03T10:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
  },
  {
    id: '55555555-5555-4555-8555-555555555555', workspace_id: WORKSPACE_ID, company_id: COMPANY_B, primary_contact_id: null,
    type: 'تعديل عقد تأسيس', department: 'النافذة الواحدة', status: 'stalled', priority: 'high', current_fee: 1_250_000,
    created_at: '2026-08-15T08:00:00.000Z', updated_at: '2026-09-02T08:00:00.000Z', last_activity_at: '2026-09-02T08:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
  },
  {
    id: '66666666-6666-4666-8666-666666666666', workspace_id: WORKSPACE_ID, company_id: COMPANY_A, primary_contact_id: null,
    type: 'تغيير مدير مفوض', department: null, status: 'active', priority: 'normal', current_fee: 750_000,
    created_at: '2026-08-28T08:00:00.000Z', updated_at: '2026-09-03T09:00:00.000Z', last_activity_at: '2026-09-03T09:00:00.000Z',
    completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: null, legacy_source: null,
  },
]);

const followups: readonly RowOf<'transaction_followups'>[] = Object.freeze([
  {
    id: '77777777-7777-4777-8777-777777777777', workspace_id: WORKSPACE_ID, transaction_id: transactions[0]!.id,
    title: 'مراجعة كتاب الموافقات', due_at: '2026-09-01T08:00:00.000Z', status: 'open', created_at: '2026-08-28T08:00:00.000Z',
    completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null,
  },
  {
    id: '88888888-8888-4888-8888-888888888888', workspace_id: WORKSPACE_ID, transaction_id: transactions[2]!.id,
    title: 'اتصال بالعميل', due_at: '2026-09-05T08:00:00.000Z', status: 'open', created_at: '2026-09-02T08:00:00.000Z',
    completed_at: null, completed_by: null, snoozed_until: null, legacy_id: null, legacy_source: null,
  },
]);

const blockers: readonly RowOf<'transaction_blockers'>[] = Object.freeze([
  {
    id: '99999999-9999-4999-8999-999999999999', workspace_id: WORKSPACE_ID, transaction_id: transactions[1]!.id,
    title: 'نقص مستند أصلي', severity: 'critical', note: 'المعاملة متوقفة لحين استلام النسخة الأصلية المصدقة.', status: 'open',
    opened_at: '2026-09-02T07:00:00.000Z', resolved_at: null,
  },
]);

const payments: readonly RowOf<'payments'>[] = Object.freeze([
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', workspace_id: WORKSPACE_ID, transaction_id: transactions[0]!.id, company_id: COMPANY_A,
    amount: 1_000_000, method: 'cash', paid_at: '2026-09-01T09:00:00.000Z', status: 'posted', receipt_ref: 'R-4101', note: null,
    legacy_id: null, legacy_source: null, created_at: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', workspace_id: WORKSPACE_ID, transaction_id: transactions[1]!.id, company_id: COMPANY_B,
    amount: 500_000, method: 'transfer', paid_at: '2026-08-30T09:00:00.000Z', status: 'posted', receipt_ref: 'R-4102', note: null,
    legacy_id: null, legacy_source: null, created_at: '2026-08-30T09:00:00.000Z',
  },
]);

const snapshot = enrichHomePriorityCompanies(
  buildHomeDashboardSnapshot(Object.freeze({ transactions, followups, blockers, payments }), NOW),
  new Map([
    [COMPANY_A, 'شركة النخبة للتجارة العامة والخدمات القانونية محدودة المسؤولية'],
    [COMPANY_B, 'بوابة الرافدين للاستثمار والتطوير العقاري محدودة المسؤولية'],
  ]),
);

export function HomeDashboardPreviewPage() {
  return <HomeDashboardView snapshot={snapshot} />;
}
