import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { FinanceCommandGateway, FinancePaymentContext, FinanceReceipt } from '../../features/finance/financeCommands.ts';
import { FINANCE_PREVIEW_SNAPSHOT } from './financePreviewSnapshot.ts';
import { Phase72FinanceExperience, type FinanceTransactionOption } from './Phase72FinanceExperience.tsx';
import '../runtime/shell-base.css';
import '../runtime/shell.css';
import '../runtime/accessibility-hardening.css';
import './finance.css';
import './phase72.css';

const W = '11111111-1111-4111-8111-111111111111';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const T2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const CASH = '66666666-6666-4666-8666-666666666661';
const ENG = '77777777-7777-4777-8777-777777777771';

const transactions: readonly FinanceTransactionOption[] = Object.freeze([
  Object.freeze({ id: T1, companyId: C1, title: 'معاملة 1042', companyLabel: 'قمر السلطان', feeCents: 150_000_000n, collectedCents: 125_000_000n, outstandingCents: 25_000_000n }),
  Object.freeze({ id: T2, companyId: C2, title: 'معاملة 1048', companyLabel: 'روز بغداد', feeCents: 300_000_000n, collectedCents: 100_000_000n, outstandingCents: 200_000_000n }),
]);

function initialReceipt(): FinanceReceipt {
  return Object.freeze({
    paymentId: '33333333-3333-4333-8333-333333333332', receiptRef: 'ENJ-R-2026-00000001', receiptSerial: 1n,
    receiptToken: '88888888-8888-4888-8888-888888888881', amountCents: 100_000_000n, method: 'cash', paidAt: '2026-09-06T13:20:00.000Z',
    status: 'posted', transactionId: T2, companyId: C2, cashboxId: CASH, engagementId: null, note: 'دفعة تجريبية لمعاينة 7.2',
    snapshot: Object.freeze({ companyName: 'روز بغداد', transactionLabel: 'معاملة 1048', version: 1 }), reversal: null, wasDuplicate: false,
  });
}

function initialContext(): FinancePaymentContext {
  return Object.freeze({
    cashboxes: Object.freeze([Object.freeze({ id: CASH, name: 'الخزنة الرئيسية', openingBalanceCents: 1_500_000_000n, active: true })]),
    engagements: Object.freeze([Object.freeze({ id: ENG, companyId: C1, title: 'Retainer متابعة الشركات', reference: 'RET-2026-17', type: 'retainer' as const, billingMode: 'retainer' as const, status: 'active', transactionIds: Object.freeze([T1]) })]),
    recentReceipts: Object.freeze([initialReceipt()]),
    reconciliation: Object.freeze({ postedTotalCents: 225_000_000n, reversedTotalCents: 0n, statusWithoutReversal: 0, reversalWithoutStatus: 0, shadowLedgerEntries: 0, integrityWarnings: 0, moneyAuthority: 'payments_plus_non_payment_ledger' as const }),
  });
}

function PreviewApp() {
  const [context, setContext] = useState<FinancePaymentContext>(() => initialContext());
  const receiptCache = useRef(new Map<string, FinanceReceipt>(initialContext().recentReceipts.map((item) => [item.paymentId, item])));

  const gateway = useMemo<FinanceCommandGateway>(() => Object.freeze({
    async loadContext() { return context; },
    async postPayment(input) {
      const receipt: FinanceReceipt = Object.freeze({
        paymentId: '33333333-3333-4333-8333-333333333399', receiptRef: 'ENJ-R-2026-00000002', receiptSerial: 2n,
        receiptToken: '88888888-8888-4888-8888-888888888882', amountCents: input.amountCents, method: input.method, paidAt: input.paidAt,
        status: 'posted', transactionId: input.transactionId, companyId: transactions.find((item) => item.id === input.transactionId)?.companyId ?? C1,
        cashboxId: input.cashboxId, engagementId: input.engagementId, note: input.note,
        snapshot: Object.freeze({ companyName: transactions.find((item) => item.id === input.transactionId)?.companyLabel ?? 'شركة', transactionLabel: transactions.find((item) => item.id === input.transactionId)?.title ?? 'معاملة', version: 1 }),
        reversal: null, wasDuplicate: false,
      });
      receiptCache.current.set(receipt.paymentId, receipt);
      setContext((current) => Object.freeze({ ...current, recentReceipts: Object.freeze([receipt, ...current.recentReceipts]), reconciliation: Object.freeze({ ...current.reconciliation, postedTotalCents: current.reconciliation.postedTotalCents + input.amountCents }) }));
      return receipt;
    },
    async reversePayment(input) {
      const reversal = Object.freeze({ reversalId: '99999999-9999-4999-8999-999999999991', reversalRef: 'ENJ-RV-2026-00000001', paymentId: input.paymentId, reason: input.reason, reversedAt: '2026-09-07T01:20:00.000Z', snapshot: Object.freeze({ version: 1, reason: input.reason }), wasDuplicate: false });
      const currentReceipt = receiptCache.current.get(input.paymentId);
      if (!currentReceipt) throw new Error('Preview receipt not found');
      const reversed: FinanceReceipt = Object.freeze({ ...currentReceipt, status: 'reversed', reversal });
      receiptCache.current.set(input.paymentId, reversed);
      setContext((current) => Object.freeze({ ...current, recentReceipts: Object.freeze(current.recentReceipts.map((item) => item.paymentId === input.paymentId ? reversed : item)), reconciliation: Object.freeze({ ...current.reconciliation, postedTotalCents: current.reconciliation.postedTotalCents - currentReceipt.amountCents, reversedTotalCents: current.reconciliation.reversedTotalCents + currentReceipt.amountCents }) }));
      return reversal;
    },
    async getReceipt(_workspaceId, paymentId) {
      const found = receiptCache.current.get(paymentId);
      if (!found) throw new Error('Preview receipt not found');
      return found;
    },
    async createCashbox(input) {
      const cashbox = Object.freeze({ id: '66666666-6666-4666-8666-666666666699', name: input.name, openingBalanceCents: input.openingBalanceCents, active: true, wasDuplicate: false });
      setContext((current) => Object.freeze({ ...current, cashboxes: Object.freeze([...current.cashboxes, cashbox]) }));
      return cashbox;
    },
    async createEngagement(input) {
      const item = Object.freeze({ id: '77777777-7777-4777-8777-777777777799', companyId: input.companyId, title: input.title, reference: input.reference, type: input.type, billingMode: input.billingMode, status: 'active', transactionIds: Object.freeze([input.transactionId]), wasDuplicate: false });
      setContext((current) => Object.freeze({ ...current, engagements: Object.freeze([...current.engagements, item]) }));
      return item;
    },
  }), [context]);

  return <div className="r2-shell" data-r2-runtime-mode="preview" data-destination="finance" dir="rtl"><main id="r2-main" className="r2-main"><Phase72FinanceExperience snapshot={FINANCE_PREVIEW_SNAPSHOT} context={context} transactions={transactions} commandGateway={gateway} workspaceId={W} onChanged={() => undefined} mode="preview" /></main></div>;
}

const root = document.getElementById('phase72-finance-root');
if (!root) throw new Error('Phase 7.2 preview root missing');
createRoot(root).render(<StrictMode><PreviewApp /></StrictMode>);
