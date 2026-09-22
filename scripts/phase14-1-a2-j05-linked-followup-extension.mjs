import { randomUUID } from 'node:crypto';

// Invoked inside the same authenticated J01-J04 disposable-workspace journey.
// The caller owns credentials, fixture lifecycle, and isolated cleanup.
export async function checkLinkedFollowup({
  owner, outsider, fresh, workspaceId, transactionId, readCount, verify,
}) {
  const ws=workspaceId, id=randomUUID();
  const args={
    p_workspace_id:ws, p_transaction_id:transactionId,
    p_followup_id:id, p_title:'J05 followup after field handoff',
    p_due_at:new Date(Date.now()+2*86400000).toISOString(),
  };
  const denied=await outsider.client.rpc('create_transaction_followup_v1',args);
  verify(Boolean(denied.error)&&await readCount('transaction_followups',ws)===0,
    'J05_CROSS_WORKSPACE_CREATE_DENIED');
  const created=await owner.client.rpc('create_transaction_followup_v1',args);
  verify(!created.error&&created.data?.followupId===id&&
    created.data?.transactionId===transactionId&&created.data?.status==='open',
    'J05_CREATED_ON_SAME_J04_HANDED_OFF_TRANSACTION');
  const replay=await fresh.rpc('create_transaction_followup_v1',args);
  verify(!replay.error&&replay.data?.followupId===id&&
    await readCount('transaction_followups',ws)===1,
    'J05_RETRY_SAME_FOLLOWUP_ID_NO_DUPLICATE');
  const conflict=await owner.client.rpc('create_transaction_followup_v1',
    {...args,p_title:'conflicting payload'});
  verify(Boolean(conflict.error)&&await readCount('transaction_followups',ws)===1,
    'J05_RETRY_DIFFERENT_PAYLOAD_DENIED');
  const [owned,foreign]=await Promise.all([
    fresh.from('transaction_followups')
      .select('id,workspace_id,transaction_id,status').eq('id',id).single(),
    outsider.client.from('transaction_followups').select('id').eq('id',id),
  ]);
  verify(!owned.error&&owned.data?.workspace_id===ws&&
    owned.data?.transaction_id===transactionId&&owned.data?.status==='open'&&
    (foreign.error||foreign.data?.length===0),
    'J05_FRESH_JWT_SOURCE_READ_AND_FOREIGN_RLS_DENIAL');
  const action=(name,until=null)=>({
    p_workspace_id:ws,p_followup_id:id,p_action:name,p_snoozed_until:until,
  });
  const forbidden=await outsider.client.rpc('mutate_transaction_followup_state_v1',action('complete'));
  verify(Boolean(forbidden.error),'J05_OUTSIDER_COMPLETION_DENIED');
  const snoozed=await owner.client.rpc('mutate_transaction_followup_state_v1',
    action('snooze',new Date(Date.now()+3*86400000).toISOString()));
  verify(!snoozed.error&&snoozed.data?.status==='open'&&Boolean(snoozed.data?.snoozedUntil),
    'J05_SNOOZE_OPEN_FOLLOWUP');
  const woke=await fresh.rpc('mutate_transaction_followup_state_v1',action('wake'));
  verify(!woke.error&&woke.data?.status==='open'&&woke.data?.snoozedUntil===null,
    'J05_WAKE_WITH_FRESH_JWT');
  const done=await owner.client.rpc('mutate_transaction_followup_state_v1',action('complete'));
  verify(!done.error&&done.data?.status==='completed'&&done.data?.completedBy===owner.id,
    'J05_OWNER_COMPLETION');
  const duplicate=await fresh.rpc('mutate_transaction_followup_state_v1',action('complete'));
  verify(Boolean(duplicate.error)&&await readCount('transaction_followups',ws)===1,
    'J05_TERMINAL_REPLAY_REJECTED');
  const persisted=await fresh.from('transaction_followups')
    .select('id,workspace_id,transaction_id,status,completed_by,completed_at')
    .eq('id',id).single();
  verify(!persisted.error&&persisted.data?.workspace_id===ws&&
    persisted.data?.transaction_id===transactionId&&
    persisted.data?.status==='completed'&&persisted.data?.completed_by===owner.id&&
    Boolean(persisted.data?.completed_at),
    'J05_DURABLE_SAME_J01_TO_J04_TRANSACTION_AFTER_HANDOFF');
}
