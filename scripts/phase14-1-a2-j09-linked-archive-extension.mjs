import {randomUUID} from 'node:crypto';
// J09 authenticated archive → fresh-session reload → restore of the SAME
// J01–J08 transaction. Data API update is the existing lifecycle persistence
// surface; this is not a real browser UI nor an activity-history certificate.
// The enclosing disposable runner owns every marked fixture and cleanup.
export async function checkLinkedArchive({
  owner, outsider, fresh, workspaceId, transactionId, companyId,
  documentId, readCount, verify,
}) {
  const ws=workspaceId;
  const original=await fresh.from('transactions')
    .select('id,workspace_id,company_id,archived_at,deleted_at,status,updated_at')
    .eq('id',transactionId).single();
  verify(!original.error&&original.data?.id===transactionId&&
    original.data?.workspace_id===ws&&original.data?.company_id===companyId&&
    original.data?.archived_at===null&&original.data?.deleted_at===null,
    'J09_AUTHENTICATED_ACTIVE_SOURCE_TRANSACTION');
  const stamp=new Date().toISOString();
  const patch={archived_at:stamp,updated_at:stamp,last_activity_at:stamp};
  const forbidden=await outsider.client.from('transactions').update(patch)
    .eq('id',transactionId).eq('workspace_id',ws).select('id');
  verify(Boolean(forbidden.error)||forbidden.data?.length===0,
    'J09_OUTSIDER_CANNOT_ARCHIVE_OTHER_WORKSPACE');
  const archive=await owner.client.from('transactions').update(patch)
    .eq('id',transactionId).eq('workspace_id',ws)
    .is('archived_at',null).eq('updated_at',original.data.updated_at)
    .select('id,archived_at,company_id').single();
  verify(!archive.error&&archive.data?.id===transactionId&&
    Boolean(archive.data?.archived_at)&&archive.data?.company_id===companyId,
    'J09_OWNER_OPTIMISTIC_ARCHIVE_ON_SOURCE_TRANSACTION');
  const stale=await owner.client.from('transactions').update(patch)
    .eq('id',transactionId).eq('workspace_id',ws)
    .is('archived_at',null).eq('updated_at',original.data.updated_at).select('id');
  verify((stale.error||stale.data?.length===0)&&
    await readCount('transactions',ws)===1,
    'J09_STALE_SECOND_ARCHIVE_DOES_NOT_CHANGE_TRANSACTION');

  const archived=await fresh.from('transactions')
    .select('id,workspace_id,company_id,archived_at,deleted_at,status')
    .eq('id',transactionId).single();
  verify(!archived.error&&archived.data?.id===transactionId&&
    archived.data?.workspace_id===ws&&archived.data?.company_id===companyId&&
    Boolean(archived.data?.archived_at)&&archived.data?.deleted_at===null,
    'J09_ARCHIVE_DURABLE_FRESH_OWNER_JWT');
  const blockedPayment=await owner.client.rpc('post_payment_v1',{
    p_workspace_id:ws,p_transaction_id:transactionId,p_amount:'1.00',
    p_method:'transfer',p_paid_at:new Date().toISOString(),
    p_note:'J09 archive rejection probe',p_idempotency_key:randomUUID(),
    p_cashbox_id:null,p_engagement_id:null,
  });
  verify(Boolean(blockedPayment.error)&&await readCount('payments',ws)===1,
    'J09_ARCHIVED_TRANSACTION_CANNOT_ACCEPT_NEW_PAYMENT');

  const [sourceDocument,receipt,followups]=await Promise.all([
    fresh.from('documents').select('id,transaction_id,company_id,status')
      .eq('id',documentId).single(),
    fresh.from('payments').select('id,transaction_id,company_id,status')
      .eq('transaction_id',transactionId).limit(2),
    fresh.from('transaction_followups').select('id,transaction_id,status')
      .eq('transaction_id',transactionId).limit(2),
  ]);
  verify(!sourceDocument.error&&sourceDocument.data?.id===documentId&&
    sourceDocument.data?.transaction_id===transactionId&&
    sourceDocument.data?.company_id===companyId&&
    !receipt.error&&receipt.data?.length===1&&
    receipt.data[0].transaction_id===transactionId&&
    !followups.error&&followups.data?.length===1&&
    followups.data[0].transaction_id===transactionId,
    'J09_ARCHIVE_PRESERVES_DOCUMENT_RECEIPT_AND_FOLLOWUP_LINKS');

  const foreignRestore=await outsider.client.from('transactions')
    .update({archived_at:null,updated_at:new Date().toISOString()})
    .eq('id',transactionId).eq('workspace_id',ws).select('id');
  verify(Boolean(foreignRestore.error)||foreignRestore.data?.length===0,
    'J09_OUTSIDER_CANNOT_RESTORE_OTHER_WORKSPACE');
  const restoredAt=new Date(Date.now()+1000).toISOString();
  const restored=await owner.client.from('transactions')
    .update({archived_at:null,updated_at:restoredAt,last_activity_at:restoredAt})
    .eq('id',transactionId).eq('workspace_id',ws)
    .eq('archived_at',archive.data.archived_at)
    .select('id,archived_at,company_id').single();
  verify(!restored.error&&restored.data?.id===transactionId&&
    restored.data?.archived_at===null&&restored.data?.company_id===companyId,
    'J09_OWNER_RESTORED_SAME_ARCHIVED_TRANSACTION');
  const final=await fresh.from('transactions')
    .select('id,workspace_id,company_id,archived_at,deleted_at,status')
    .eq('id',transactionId).single();
  verify(!final.error&&final.data?.id===transactionId&&
    final.data?.workspace_id===ws&&final.data?.company_id===companyId&&
    final.data?.archived_at===null&&final.data?.deleted_at===null&&
    await readCount('transactions',ws)===1&&
    await readCount('documents',ws)===1&&
    await readCount('payments',ws)===1,
    'J09_DURABLE_ARCHIVE_RESTORE_WITH_NO_ORPHAN_LINKS');
}
