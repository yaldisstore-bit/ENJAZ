import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = read('database/migrations/phase_7_2_payments_receipts_m16.sql');
const hardening = read('database/migrations/phase_7_2_rpc_security_hardening.sql');
const indexes = read('database/migrations/phase_7_2_fk_index_hardening.sql');
const commands = read('src/features/finance/financeCommands.ts');
const runtime = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const ui = read('src/ui-r2/finance/Phase72FinanceExperience.tsx');
const css = read('src/ui-r2/finance/phase72.css');
const portal = read('src/ui-r2/finance/LiveFinanceProductionPortal.tsx');

const failures = [];
const check = (name, condition, detail = '') => {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
};
const has = (text, value) => text.includes(value);

check('m16_engagement_table', has(base, 'create table if not exists public.commercial_engagements'));
check('m16_transaction_link_table', has(base, 'create table if not exists public.commercial_engagement_transactions'));
check('m16_has_no_money_column', !/create table if not exists public\.commercial_engagements[\s\S]*?\b(amount|balance|paid_amount|total_amount)\s+numeric/i.test(base));
check('payments_idempotency', has(base, 'payments_idempotency_unique unique (workspace_id, idempotency_key)'));
check('reversals_idempotency', has(base, 'payment_reversals_idempotency_unique unique (workspace_id, idempotency_key)'));
check('cashbox_idempotency', has(base, 'cashbox_finance_idempotency_unique_idx'));
check('immutable_receipt_snapshot', has(base, 'receipt_snapshot jsonb') && has(base, "'receiptSnapshot'"));
check('stable_receipt_reference', has(base, "'ENJ-R-'"));
check('stable_reversal_reference', has(base, "'ENJ-RV-'"));
check('cash_requires_cashbox', has(base, "p_method = 'cash' and p_cashbox_id is null"));
check('payment_transaction_lock', has(base, 'for update;') && has(base, 'ENJAZ_PAYMENT_TRANSACTION_INVALID'));
check('reversal_atomic_status_guard', has(base, "update public.payments set status = 'reversed'") && has(base, 'ENJAZ_REVERSAL_STATUS_RACE'));
check('audit_payment_posted', has(base, "'payment.posted'"));
check('audit_payment_reversed', has(base, "'payment.reversed'"));
check('transaction_activity_posted', has(base, "'payment_posted'"));
check('transaction_activity_reversed', has(base, "'payment_reversed'"));
check('reconciliation_rpc', has(base, 'finance_payment_reconciliation_v1'));
check('shadow_ledger_detection', has(base, "'shadowLedgerEntries'") && has(base, "'payments_plus_non_payment_ledger'"));
check('direct_payment_insert_revoked', has(base, 'revoke insert, update, delete on table public.payments from anon, authenticated'));
check('direct_reversal_insert_revoked', has(base, 'revoke insert, update, delete on table public.payment_reversals from anon, authenticated'));
check('direct_cashbox_insert_revoked', has(base, 'revoke insert, update, delete on table public.cashbox_accounts from anon, authenticated'));

const publicRpcNames = [
  'create_finance_cashbox_v1', 'create_billing_engagement_v1', 'finance_payment_reconciliation_v1',
  'finance_payment_context_v1', 'post_payment_v1', 'reverse_payment_v1', 'get_payment_receipt_v1',
];
for (const name of publicRpcNames) {
  const wrapper = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}[\\s\\S]*?security\\s+invoker`, 'i');
  check(`public_${name}_final_invoker`, wrapper.test(hardening));
  const privateImpl = new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.[a-z0-9_]*${name.replace(/_v1$/, '')}[a-z0-9_]*[\\s\\S]*?security\\s+definer`, 'i');
  check(`private_${name}_guarded_impl`, privateImpl.test(hardening), 'privileged implementation must be private');
}
check('public_definer_revoked_by_hardening', has(hardening, 'security invoker') && has(hardening, 'revoke all on function private.'));
check('fk_index_cashbox_creator', has(indexes, 'cashbox_accounts_finance_created_by_idx'));
check('fk_index_payment_cashbox', has(indexes, 'payments_cashbox_fk_idx'));
check('fk_index_payment_creator', has(indexes, 'payments_created_by_idx'));
check('fk_index_engagement_creator', has(indexes, 'commercial_engagements_created_by_idx'));
check('fk_index_engagement_tx_creator', has(indexes, 'commercial_engagement_transactions_created_by_idx'));

check('command_gateway_exists', has(commands, 'createSupabaseFinanceCommandGateway'));
check('gateway_uses_rpc_only', has(commands, "'post_payment_v1'") && has(commands, "'reverse_payment_v1'") && !/\.from\(['\"]payments['\"]\)/.test(commands));
check('write_timeout_is_unknown', has(commands, "'DATA_OUTCOME_UNKNOWN'"));
check('exact_bigint_boundary', has(commands, 'amountCents: bigint') && has(commands, 'financeCentsToDecimal'));
check('runtime_finance_provider', has(runtime, 'FinanceCommandProvider') && has(runtime, 'createSupabaseFinanceCommandGateway'));
check('live_portal_uses_72', has(portal, 'ConnectedPhase72FinanceExperience'));
check('ui_stage_marker', has(ui, 'data-finance-stage="7.2"') && has(ui, 'data-m16-finance="true"'));
check('ui_has_payment', has(ui, 'ترحيل الدفعة وإصدار الإيصال'));
check('ui_has_reversal', has(ui, 'تأكيد عكس الدفعة'));
check('ui_has_receipt_print', has(ui, 'window.print()'));
check('ui_has_cashbox', has(ui, 'إنشاء خزنة مالية'));
check('ui_has_m16', has(ui, 'عقد أو Retainer'));
check('ui_has_idempotency_explanation', has(ui, 'Idempotency'));
check('mobile_320_guard', has(css, '@media(max-width:360px)'));
check('print_receipt_contract', has(css, '@media print') && has(css, '[data-print-receipt="true"]') === false ? has(css, '.r2-f72-receipt-paper') : true);
check('reduced_motion', has(css, 'prefers-reduced-motion'));

if (failures.length) {
  console.error('Phase 7.2 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`Phase 7.2 audit PASS (${42 + publicRpcNames.length * 2} contract checks)`);
