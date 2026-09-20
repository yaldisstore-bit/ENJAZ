import type { FinanceCommandGateway, FinanceReceipt } from '../finance/financeCommands.ts';
import type { CrossDomainJourneyReadProof } from './crossDomainJourneyReadProof.ts';

// Read-only reconciliation against the existing authoritative receipt RPC.
// This is NOT a replacement money ledger, an RLS certificate or an atomic DB snapshot.
export class CrossDomainFinanceProofError extends Error {
  readonly reason: 'AMOUNT_PRECISION' | 'DUPLICATE' | 'SOURCE_DRIFT' | 'REVERSAL_DRIFT';
  constructor(reason: CrossDomainFinanceProofError['reason']) {
    super(`Cross-domain finance proof rejected: ${reason}`);
    this.name = 'CrossDomainFinanceProofError';
    this.reason = reason;
  }
}

export interface CrossDomainFinanceReadProof {
  readonly transactionId: string;
  readonly companyId: string;
  readonly receipts: readonly FinanceReceipt[];
  readonly postedTotalCents: bigint;
  readonly reversedTotalCents: bigint;
  readonly observedNetPaymentCents: bigint;
  readonly proofKind: 'AUTHENTICATED_READ_ONLY_RECEIPT_CROSSCHECK';
  readonly completeFinanceLedgerCertified: false;
  readonly clientVisibilityCertified: false;
}

function cents(value: number): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 ||
      !Number.isSafeInteger(Math.round(value * 100)) ||
      !Number.isFinite(value * 100) ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.0000001)
    throw new CrossDomainFinanceProofError('AMOUNT_PRECISION');
  return BigInt(Math.round(value * 100));
}

/**
 * Cross-check existing payment rows with per-payment receipts (authoritative
 * financial command read) under the same workspace. Never directly mutate a
 * payment/reversal, and do not claim overall ledger equality or user permissions.
 */
export async function verifyCrossDomainFinanceRead(
  source: CrossDomainJourneyReadProof,
  finance: Pick<FinanceCommandGateway, 'getReceipt'>,
): Promise<CrossDomainFinanceReadProof> {
  const ids = new Set<string>();
  const reversals = new Map<string, string>();
  const reversedIds = new Set<string>();
  for (const row of source.reversals) {
    if (reversedIds.has(row.id) || reversals.has(row.payment_id))
      throw new CrossDomainFinanceProofError('DUPLICATE');
    reversedIds.add(row.id);
    reversals.set(row.payment_id, row.id);
  }

  const receipts: FinanceReceipt[] = [];
  let postedTotalCents = 0n;
  let reversedTotalCents = 0n;
  for (const payment of source.payments) {
    if (ids.has(payment.id)) throw new CrossDomainFinanceProofError('DUPLICATE');
    ids.add(payment.id);
    if (payment.workspace_id !== source.workspaceId ||
        payment.transaction_id !== source.transaction.id ||
        payment.company_id !== source.company.id)
      throw new CrossDomainFinanceProofError('SOURCE_DRIFT');
    const amountCents = cents(payment.amount);
    const receipt = await finance.getReceipt(source.workspaceId, payment.id);
    if (receipt.paymentId !== payment.id ||
        receipt.transactionId !== source.transaction.id ||
        receipt.companyId !== source.company.id ||
        receipt.receiptRef !== payment.receipt_ref ||
        receipt.method !== payment.method ||
        receipt.amountCents !== amountCents ||
        receipt.status !== payment.status)
      throw new CrossDomainFinanceProofError('SOURCE_DRIFT');
    const reversalId = reversals.get(payment.id);
    if (reversalId !== undefined) {
      if (receipt.status !== 'reversed' || !receipt.reversal ||
          receipt.reversal.paymentId !== payment.id || receipt.reversal.reversalId !== reversalId)
        throw new CrossDomainFinanceProofError('REVERSAL_DRIFT');
      reversedTotalCents += receipt.amountCents;
    } else if (receipt.reversal !== null || receipt.status !== 'posted') {
      throw new CrossDomainFinanceProofError('REVERSAL_DRIFT');
    }
    postedTotalCents += receipt.amountCents;
    receipts.push(receipt);
  }
  if (reversals.size !== [...reversals.keys()].filter(id => ids.has(id)).length)
    throw new CrossDomainFinanceProofError('REVERSAL_DRIFT');
  return Object.freeze({
    transactionId: source.transaction.id, companyId: source.company.id,
    receipts: Object.freeze(receipts),
    postedTotalCents, reversedTotalCents,
    observedNetPaymentCents: postedTotalCents - reversedTotalCents,
    proofKind: 'AUTHENTICATED_READ_ONLY_RECEIPT_CROSSCHECK' as const,
    completeFinanceLedgerCertified: false as const,
    clientVisibilityCertified: false as const,
  });
}
