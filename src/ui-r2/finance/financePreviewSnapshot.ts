import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildFinanceLedgerSnapshot } from '../../features/finance/financeModel.ts';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const T2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: W, legal_name: name, display_name: name, capital: 100_000_000, address: 'بغداد', activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-08-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', deleted_at: null };
}

function transaction(id: string, companyId: string, legacyId: string, fee: number): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: companyId, primary_contact_id: null, type: 'معاملة شركات', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: fee, created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-06T08:00:00.000Z', last_activity_at: '2026-09-06T08:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: legacyId, legacy_source: null };
}

export const FINANCE_PREVIEW_SNAPSHOT = buildFinanceLedgerSnapshot({
  companies: [company(C1, 'قمر السلطان'), company(C2, 'روز بغداد')],
  transactions: [transaction(T1, C1, '1042', 1_500_000), transaction(T2, C2, '1048', 3_000_000)],
  payments: [
    { id: '33333333-3333-4333-8333-333333333331', workspace_id: W, transaction_id: T1, company_id: C1, amount: 1_250_000, method: 'transfer', paid_at: '2026-09-06T10:40:00.000Z', status: 'posted', receipt_ref: 'R-1042-01', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-06T10:40:00.000Z' },
    { id: '33333333-3333-4333-8333-333333333332', workspace_id: W, transaction_id: T2, company_id: C2, amount: 1_000_000, method: 'cash', paid_at: '2026-09-05T13:20:00.000Z', status: 'posted', receipt_ref: 'R-1048-01', note: null, legacy_id: null, legacy_source: null, created_at: '2026-09-05T13:20:00.000Z' },
  ],
  paymentReversals: [],
  ledger: [
    { id: '55555555-5555-4555-8555-555555555551', workspace_id: W, transaction_id: T1, company_id: C1, entry_type: 'expense', direction: 'out', amount: 175_000, method: 'cash', category: 'رسوم', source: 'manual', occurred_at: '2026-09-06T09:15:00.000Z', status: 'posted', note: 'رسم إجراء', reversal_reason: null, reversed_at: null, metadata: {}, created_at: '2026-09-06T09:15:00.000Z' },
    { id: '55555555-5555-4555-8555-555555555552', workspace_id: W, transaction_id: null, company_id: null, entry_type: 'adjustment', direction: 'out', amount: 90_000, method: null, category: 'تسوية', source: 'manual', occurred_at: '2026-09-05T10:05:00.000Z', status: 'posted', note: null, reversal_reason: null, reversed_at: null, metadata: {}, created_at: '2026-09-05T10:05:00.000Z' },
  ],
  cashboxes: [
    { id: '66666666-6666-4666-8666-666666666661', workspace_id: W, name: 'الخزنة الرئيسية', opening_balance: 15_000_000, opened_at: '2026-01-01T08:00:00.000Z', active: true, created_at: '2026-01-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z' },
  ],
});
