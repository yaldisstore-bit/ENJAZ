import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RowOf } from '../../data/contracts/dataTypes.ts';
import { buildFinancialIntelligenceSnapshot } from '../../features/finance/financeIntelligence.ts';
import type { FinanceSource } from '../../features/finance/financeModel.ts';
import { FinancialIntelligencePanel } from './Phase73FinancialIntelligenceExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import './finance.css';
import './phase72.css';
import './phase73.css';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';
const C3 = '22222222-2222-4222-8222-222222222223';

function company(id: string, name: string): RowOf<'companies'> {
  return { id, workspace_id: W, legal_name: name, display_name: name, capital: null, address: null, activities: null, registration_number: null, legal_status: null, primary_contact_id: null, status: 'active', merged_into_id: null, legacy_id: null, legacy_source: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-09-07T00:00:00.000Z', deleted_at: null };
}

function transaction(id: string, companyId: string, fee: number, createdAt: string, legacy: string): RowOf<'transactions'> {
  return { id, workspace_id: W, company_id: companyId, primary_contact_id: null, type: 'معاملة شركات', department: 'مسجل الشركات', status: 'active', priority: 'normal', current_fee: fee, created_at: createdAt, updated_at: '2026-09-07T00:00:00.000Z', last_activity_at: '2026-09-07T00:00:00.000Z', completed_at: null, archived_at: null, deleted_at: null, deleted_by: null, deletion_reason: null, legacy_id: legacy, legacy_source: null };
}

function payment(id: string, transactionId: string, companyId: string, amount: number, paidAt: string, status = 'posted'): RowOf<'payments'> {
  return { id, workspace_id: W, transaction_id: transactionId, company_id: companyId, amount, method: 'cash', paid_at: paidAt, status, receipt_ref: `ENJ-R-2026-${id.slice(-4)}`, note: null, legacy_id: null, legacy_source: null, created_at: paidAt };
}

function ledger(id: string, direction: 'in' | 'out', amount: number, occurredAt: string): RowOf<'financial_ledger_entries'> {
  return { id, workspace_id: W, transaction_id: null, company_id: null, entry_type: direction === 'out' ? 'expense' : 'adjustment', direction, amount, method: null, category: direction === 'out' ? 'تشغيل' : 'تسوية', source: 'phase73-preview', occurred_at: occurredAt, status: 'posted', note: null, reversal_reason: null, reversed_at: null, metadata: {}, created_at: occurredAt };
}

const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const T2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const T3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const T4 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

const source: FinanceSource = Object.freeze({
  companies: Object.freeze([company(C1, 'قمر السلطان'), company(C2, 'روز بغداد'), company(C3, 'اسراء الخير')]),
  transactions: Object.freeze([
    transaction(T1, C1, 1_500_000, '2026-08-25T09:00:00.000Z', '1042'),
    transaction(T2, C2, 3_000_000, '2026-07-22T09:00:00.000Z', '1048'),
    transaction(T3, C3, 5_500_000, '2026-06-15T09:00:00.000Z', '1051'),
    transaction(T4, C1, 2_500_000, '2026-04-01T09:00:00.000Z', '1056'),
  ]),
  payments: Object.freeze([
    payment('33333333-3333-4333-8333-333333330001', T1, C1, 1_250_000, '2026-09-02T09:00:00.000Z'),
    payment('33333333-3333-4333-8333-333333330002', T2, C2, 1_000_000, '2026-08-18T09:00:00.000Z'),
    payment('33333333-3333-4333-8333-333333330003', T3, C3, 1_250_000, '2026-07-10T09:00:00.000Z'),
    payment('33333333-3333-4333-8333-333333330004', T4, C1, 500_000, '2026-06-08T09:00:00.000Z'),
    payment('33333333-3333-4333-8333-333333330005', T1, C1, 300_000, '2026-09-04T09:00:00.000Z', 'reversed'),
  ]),
  paymentReversals: Object.freeze([{ id: '44444444-4444-4444-8444-444444444441', workspace_id: W, payment_id: '33333333-3333-4333-8333-333333330005', reversed_at: '2026-09-05T09:00:00.000Z', reason: 'تصحيح إيصال', actor_user_id: null }]),
  ledger: Object.freeze([
    ledger('55555555-5555-4555-8555-555555555551', 'out', 350_000, '2026-09-03T09:00:00.000Z'),
    ledger('55555555-5555-4555-8555-555555555552', 'in', 80_000, '2026-08-12T09:00:00.000Z'),
  ]),
  cashboxes: Object.freeze([]),
});

const intelligence = buildFinancialIntelligenceSnapshot(source, '2026-09-07T12:00:00.000Z');

function PreviewApp() {
  return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="finance" dir="rtl"><main id="r2-main" className="r2-main"><div className="r2-screen r2-finance-phase73" data-finance-stage="7.3" data-finance-mode="preview" data-m13-finance-anchor="true"><FinancialIntelligencePanel intelligence={intelligence} /></div></main></div>;
}

const root = document.getElementById('phase73-finance-root');
if (!root) throw new Error('Phase 7.3 preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);
