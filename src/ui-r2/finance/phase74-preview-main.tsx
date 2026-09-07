import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import type { FinanceSource } from '../../features/finance/financeModel.ts';
import { FinancialReportsPanel } from './Phase74FinancialReportsExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import './finance.css';
import './phase74.css';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const T2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const B1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: W, legal_name: name, display_name: name, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-07T00:00:00.000Z', deleted_at: null };
}
function transaction(id: string, companyId: string, fee: number, legacy: string): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: companyId, primary_contact_id: null, type: 'معاملة شركات', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: fee, created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-09-07T00:00:00.000Z', last_activity_at: '2026-09-07T00:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: legacy, legacy_source: null };
}
function payment(id: string, transactionId: string, companyId: string, amount: number, paidAt: string, status = 'posted'): RowOf<'payments'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, amount, method: 'cash', paid_at: paidAt, status, receipt_ref: `ENJ-R-${id}`, note: null, legacy_id: null, legacy_source: null, created_at: paidAt };
}
function ledger(id: string, direction: 'in' | 'out', amount: number, occurredAt: string, companyId: string | null, transactionId: string | null): RowOf<'financial_ledger_entries'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, entry_type: direction === 'out' ? 'expense' : 'adjustment', direction, amount, method: null, category: direction === 'out' ? 'تشغيل' : 'تسوية', source: 'phase74-preview', occurred_at: occurredAt, status: 'posted', note: null, reversal_reason: null, reversed_at: null, metadata: {}, created_at: occurredAt };
}

const source: FinanceSource = Object.freeze({
  companies: Object.freeze([company(C1, 'قمر السلطان'), company(C2, 'اسراء الخير')]),
  transactions: Object.freeze([transaction(T1, C1, 2_500_000, '1056'), transaction(T2, C2, 4_000_000, '1057')]),
  payments: Object.freeze([
    payment('P001', T1, C1, 1_250_000, '2026-09-02T09:00:00.000Z'),
    payment('P002', T2, C2, 1_500_000, '2026-09-03T09:00:00.000Z'),
    payment('P003', T1, C1, 250_000, '2026-09-04T09:00:00.000Z', 'reversed'),
  ]),
  paymentReversals: Object.freeze([{ id: '44444444-4444-4444-8444-444444444441', workspace_id: W, payment_id: 'P003', reversed_at: '2026-09-05T09:00:00.000Z', reason: 'تصحيح', actor_user_id: null }]),
  ledger: Object.freeze([
    ledger('L001', 'out', 350_000, '2026-09-03T12:00:00.000Z', C1, T1),
    ledger('L002', 'in', 100_000, '2026-09-04T12:00:00.000Z', C2, T2),
  ]),
  cashboxes: Object.freeze([{ id: B1, workspace_id: W, name: 'الصندوق الرئيسي', opening_balance: 2_000_000, opened_at: '2026-01-01T00:00:00.000Z', active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-07T00:00:00.000Z' }]),
});

function PreviewApp() {
  return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="finance" dir="rtl"><main id="r2-main" className="r2-main"><div className="r2-screen r2-finance-phase74" data-finance-stage="7.4" data-finance-mode="preview" data-finance-report-authority="canonical"><FinancialReportsPanel source={source} /></div></main></div>;
}

const root = document.getElementById('phase74-finance-root');
if (!root) throw new Error('Phase 7.4 preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);
