import { randomUUID } from 'node:crypto';

// Executed inside the existing disposable, independently authenticated J01-J05
// journey. Never owns credentials, creates a privileged finance row, or
// modifies production. The enclosing runner performs scoped fixture cleanup.
export async function checkLinkedFinance({
  owner, outsider, fresh, workspaceId, transactionId, companyId, readCount, verify,
}) {
  const ws = workspaceId;
  const paymentKey = randomUUID();
  const paidAt = new Date().toISOString();
  const postArgs = {
    p_workspace_id: ws,
    p_transaction_id: transactionId,
    p_amount: '135.25',
    p_method: 'cash',
    p_paid_at: paidAt,
    p_note: 'J06 isolated linked payment',
    p_idempotency_key: paymentKey,
    p_cashbox_id: null,
    p_engagement_id: null,
  };
  const foreignPost = await outsider.client.rpc('post_payment_v1', postArgs);
  verify(Boolean(foreignPost.error) &&
    await readCount('payments', ws) === 0,
    'J06_FOREIGN_WORKSPACE_PAYMENT_DENIED');

  const posted = await owner.client.rpc('post_payment_v1', postArgs);
  verify(!posted.error && Boolean(posted.data?.paymentId) &&
    posted.data?.transactionId === transactionId &&
    posted.data?.companyId === companyId &&
    String(posted.data?.amount) === '135.25' &&
    posted.data?.status === 'posted' &&
    posted.data?.wasDuplicate === false &&
    await readCount('payments', ws) === 1,
    'J06_REAL_JWT_EXACT_CENTS_POSTED_ON_LINKED_TRANSACTION');
  const paymentId = posted.data.paymentId;

  const replay = await fresh.rpc('post_payment_v1', postArgs);
  verify(!replay.error && replay.data?.paymentId === paymentId &&
    replay.data?.wasDuplicate === true &&
    await readCount('payments', ws) === 1,
    'J06_NEW_SESSION_SAME_KEY_PAYMENT_REPLAY_NO_DOUBLE_POST');
  const conflicting = await owner.client.rpc('post_payment_v1',
    { ...postArgs, p_amount: '135.26' });
  verify(Boolean(conflicting.error) && await readCount('payments', ws) === 1,
    'J06_SAME_KEY_DIFFERENT_CENTS_DENIED');

  const [receipt, foreignRow, foreignReceipt] = await Promise.all([
    fresh.rpc('get_payment_receipt_v1',
      { p_workspace_id: ws, p_payment_id: paymentId }),
    outsider.client.from('payments').select('id').eq('id', paymentId),
    outsider.client.rpc('get_payment_receipt_v1',
      { p_workspace_id: ws, p_payment_id: paymentId }),
  ]);
  verify(!receipt.error && receipt.data?.paymentId === paymentId &&
    receipt.data?.transactionId === transactionId &&
    receipt.data?.companyId === companyId &&
    receipt.data?.status === 'posted' &&
    String(receipt.data?.amount) === '135.25' &&
    (foreignRow.error || foreignRow.data?.length === 0) &&
    (foreignReceipt.error || foreignReceipt.data === null),
    'J06_FRESH_JWT_RECEIPT_READ_AND_FOREIGN_RLS');

  const reverseKey = randomUUID();
  const reverseArgs = {
    p_workspace_id: ws,
    p_payment_id: paymentId,
    p_reason: 'J06 controlled isolated reversal',
    p_idempotency_key: reverseKey,
  };
  const foreignReverse = await outsider.client.rpc('reverse_payment_v1', reverseArgs);
  verify(Boolean(foreignReverse.error) &&
    await readCount('payment_reversals', ws) === 0,
    'J06_FOREIGN_WORKSPACE_REVERSAL_DENIED');
  const reversed = await owner.client.rpc('reverse_payment_v1', reverseArgs);
  verify(!reversed.error && Boolean(reversed.data?.reversalId) &&
    reversed.data?.paymentId === paymentId &&
    reversed.data?.wasDuplicate === false &&
    await readCount('payment_reversals', ws) === 1,
    'J06_AUTHENTICATED_REVERSAL_EXACTLY_ONCE');
  const reversalId = reversed.data.reversalId;
  const reversalReplay = await fresh.rpc('reverse_payment_v1', reverseArgs);
  verify(!reversalReplay.error &&
    reversalReplay.data?.reversalId === reversalId &&
    reversalReplay.data?.wasDuplicate === true &&
    await readCount('payment_reversals', ws) === 1,
    'J06_FRESH_JWT_REVERSAL_RETRY_NO_DOUBLE_REVERSAL');
  const competingReversal = await owner.client.rpc('reverse_payment_v1',
    { ...reverseArgs, p_idempotency_key: randomUUID() });
  verify(Boolean(competingReversal.error) &&
    await readCount('payment_reversals', ws) === 1,
    'J06_NEW_KEY_SECOND_REVERSAL_DENIED');

  const final = await fresh.rpc('get_payment_receipt_v1',
    { p_workspace_id: ws, p_payment_id: paymentId });
  verify(!final.error && final.data?.paymentId === paymentId &&
    final.data?.transactionId === transactionId &&
    final.data?.companyId === companyId &&
    String(final.data?.amount) === '135.25' &&
    final.data?.status === 'reversed' &&
    final.data?.reversal?.reversalId === reversalId &&
    await readCount('payments', ws) === 1 &&
    await readCount('payment_reversals', ws) === 1,
    'J06_DURABLE_J01_TO_J05_PAYMENT_AND_REVERSAL_SOURCE_JOIN');
}
