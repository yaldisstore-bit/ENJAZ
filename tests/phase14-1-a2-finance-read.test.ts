import test from 'node:test';
import assert from 'node:assert/strict';
import type { FinanceReceipt } from '../src/features/finance/financeCommands.ts';
import type { CrossDomainJourneyReadProof } from '../src/features/journeys/crossDomainJourneyReadProof.ts';
import {
  verifyCrossDomainFinanceRead, CrossDomainFinanceProofError,
} from '../src/features/journeys/crossDomainJourneyFinanceProof.ts';

const W = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const T = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const R = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const payment = (overrides: Record<string, unknown> = {}) => ({
  id: P, workspace_id: W, company_id: C, transaction_id: T,
  amount: 0.29, method: 'cash', status: 'posted', receipt_ref: 'QA-1', ...overrides,
});
const reversal = (overrides: Record<string, unknown> = {}) => ({
  id: R, payment_id: P, workspace_id: W, ...overrides,
});
const receipt = (overrides: Record<string, unknown> = {}): FinanceReceipt => ({
  paymentId: P, transactionId: T, companyId: C, amountCents: 29n,
  method: 'cash', status: 'posted', receiptRef: 'QA-1', reversal: null, ...overrides,
}) as FinanceReceipt;
const source = (
  payments: readonly Record<string, unknown>[] = [payment()],
  reversals: readonly Record<string, unknown>[] = [],
): CrossDomainJourneyReadProof => ({
  workspaceId: W, company: { id: C }, transaction: { id: T },
  payments, reversals, procedures: [], followups: [], documents: [],
  proofKind: 'AUTHENTICATED_INTERNAL_READ_ONLY',
  atomicMultiDomainSnapshotCertified: false, clientVisibilityCertified: false,
}) as unknown as CrossDomainJourneyReadProof;
const gateway = (value: FinanceReceipt, calls: string[] = []) => ({
  async getReceipt(workspaceId: string, paymentId: string) {
    calls.push(workspaceId + ':' + paymentId);
    return value;
  },
});
const reason = (code: CrossDomainFinanceProofError['reason']) =>
  (error: unknown) => error instanceof CrossDomainFinanceProofError && error.reason === code;

test('A2 money crosscheck preserves exact cents and consumes the existing scoped receipt gateway', async () => {
  const calls: string[] = [];
  const result = await verifyCrossDomainFinanceRead(source(), gateway(receipt(), calls));
  assert.equal(result.postedTotalCents, 29n);
  assert.equal(result.reversedTotalCents, 0n);
  assert.equal(result.observedNetPaymentCents, 29n);
  assert.equal(result.completeFinanceLedgerCertified, false);
  assert.equal(result.clientVisibilityCertified, false);
  assert.deepEqual(calls, [W + ':' + P]);
  assert.ok(Object.isFrozen(result));
});

test('A2 correctly excludes an already reversed receipt, without manufacturing shadow ledger entries', async () => {
  const reverse = { reversalId: R, paymentId: P };
  const result = await verifyCrossDomainFinanceRead(
    source([payment({ status: 'reversed' })], [reversal()]),
    gateway(receipt({ status: 'reversed', reversal: reverse })),
  );
  assert.equal(result.postedTotalCents, 29n);
  assert.equal(result.reversedTotalCents, 29n);
  assert.equal(result.observedNetPaymentCents, 0n);
});

test('A2 rejects duplicate payment and reversal identities before double-counting', async () => {
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment(), payment()]), gateway(receipt()),
  ), reason('DUPLICATE'));
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment({ status: 'reversed' })], [reversal(), reversal({ id: C })]),
    gateway(receipt({ status: 'reversed' })),
  ), reason('DUPLICATE'));
});

test('A2 rejects mismatched workspace, company, transaction and wrong receipt reference', async () => {
  for (const patch of [
    { workspace_id: C }, { company_id: T }, { transaction_id: C },
  ]) await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment(patch)]), gateway(receipt()),
  ), reason('SOURCE_DRIFT'));
  await assert.rejects(verifyCrossDomainFinanceRead(
    source(), gateway(receipt({ receiptRef: 'FORGED' })),
  ), reason('SOURCE_DRIFT'));
});

test('A2 rejects amount tampering, bad precision and non-finite money without rounding away a cent', async () => {
  await assert.rejects(verifyCrossDomainFinanceRead(
    source(), gateway(receipt({ amountCents: 30n })),
  ), reason('SOURCE_DRIFT'));
  for (const amount of [-1, 0, 0.291, Number.NaN, 100000000000000.01]) {
    await assert.rejects(verifyCrossDomainFinanceRead(
      source([payment({ amount })]), gateway(receipt()),
    ), reason('AMOUNT_PRECISION'));
  }
});

test('A2 rejects hidden reversal, missing reversal, forged reversal id and orphan reversal', async () => {
  await assert.rejects(verifyCrossDomainFinanceRead(
    source(), gateway(receipt({ status: 'reversed', reversal: { reversalId: R, paymentId: P } })),
  ), reason('SOURCE_DRIFT'));
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment({ status: 'reversed' })], [reversal()]),
    gateway(receipt({ status: 'reversed', reversal: null })),
  ), reason('REVERSAL_DRIFT'));
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment({ status: 'reversed' })], [reversal()]),
    gateway(receipt({ status: 'reversed', reversal: { reversalId: C, paymentId: P } })),
  ), reason('REVERSAL_DRIFT'));
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment()], [reversal({ payment_id: C })]),
    gateway(receipt()),
  ), reason('REVERSAL_DRIFT'));
});

test('A2 zero payments cause zero financial reads and no inferred money', async () => {
  const calls: string[] = [];
  const result = await verifyCrossDomainFinanceRead(source([], []), gateway(receipt(), calls));
  assert.equal(result.observedNetPaymentCents, 0n);
  assert.deepEqual(result.receipts, []);
  assert.deepEqual(calls, []);
});

test('A2 denies contradictory posted payment with a recorded reversal', async () => {
  await assert.rejects(verifyCrossDomainFinanceRead(
    source([payment()], [reversal()]),
    gateway(receipt()),
  ), reason('REVERSAL_DRIFT'));
});
