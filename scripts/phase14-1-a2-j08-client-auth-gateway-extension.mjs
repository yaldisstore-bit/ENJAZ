import {randomUUID} from 'node:crypto';

// Independent client Auth/JWT and explicit transaction/company/resource shares.
// Runs only after the same disposable J01-J07 journey. Admin seeds strictly
// marked portal invitations/grants; this does NOT certify staff grant UI or
// a published portal. The parent owns marked workspace/Auth cleanup.
export async function checkLinkedClientPortal({
  owner, outsider, admin, makeUser, workspaceId, transactionId, companyId,
  documentId, readCount, verify,
}) {
  const ws=workspaceId;
  const client=await makeUser('portal-client');
  verify(client.id!==owner.id&&client.id!==outsider.id&&
    client.workspaceId!==ws&&client.workspaceId!==outsider.workspaceId,
    'J08_CLIENT_SEPARATE_REAL_AUTH_IDENTITY_AND_PERSONAL_WORKSPACE');

  // A client JWT must never automatically receive staff/workforce trust.
  const staff=await admin.from('workspace_memberships').select('user_id')
    .eq('workspace_id',ws).eq('user_id',client.id);
  const staffOrg=await admin.from('organization_members').select('user_id')
    .eq('workspace_id',ws).eq('user_id',client.id);
  verify(!staff.error&&!staffOrg.error&&staff.data?.length===0&&staffOrg.data?.length===0,
    'J08_CLIENT_HAS_NO_STAFF_OR_WORKFORCE_MEMBERSHIP');
  const before=await client.client.rpc('get_client_portal_read_model_v1',
    {p_workspace_id:ws});
  verify(Boolean(before.error),
    'J08_UNINVITED_CLIENT_JWT_DENIED');

  // Explicit one-principal, one-workspace test-admin invitations. These are
  // scaffolding, NOT an end-user authorization/grant-management certificate.
  const principalId=randomUUID();
  const inserted=await admin.from('client_portal_principals').insert({
    id:principalId,workspace_id:ws,user_id:client.id,
    status:'invited',created_by:owner.id,
  }).select('id,version').single();
  if(inserted.error||inserted.data?.id!==principalId)throw Error('J08_PRINCIPAL_SCAFFOLD_FAILED');
  const invitations=await client.client.rpc('list_client_portal_invitations_v1');
  verify(!invitations.error&&Array.isArray(invitations.data)&&
    invitations.data.some(x=>x.workspaceId===ws&&x.principalId===principalId),
    'J08_REAL_CLIENT_JWT_DISCOVERS_ONLY_OWN_INVITATION');
  const outsiderActivation=await outsider.client.rpc('activate_client_portal_invitation_v1',
    {p_workspace_id:ws,p_expected_version:inserted.data.version});
  verify(Boolean(outsiderActivation.error),
    'J08_FOREIGN_STAFF_CANNOT_ACTIVATE_CLIENT_INVITATION');
  const activate=await client.client.rpc('activate_client_portal_invitation_v1',
    {p_workspace_id:ws,p_expected_version:inserted.data.version});
  verify(!activate.error&&activate.data?.principalId===principalId&&
    activate.data?.status==='active',
    'J08_REAL_CLIENT_SELF_ACTIVATION_NOT_STAFF_MEMBERSHIP');
  const noGrants=await client.client.rpc('get_client_portal_read_model_v1',
    {p_workspace_id:ws});
  verify(!noGrants.error&&
    Array.isArray(noGrants.data?.transactions)&&noGrants.data.transactions.length===0&&
    Array.isArray(noGrants.data?.documents)&&noGrants.data.documents.length===0&&
    Array.isArray(noGrants.data?.receipts)&&noGrants.data.receipts.length===0,
    'J08_ACTIVE_PRINCIPAL_WITHOUT_GRANTS_SEES_NO_INTERNAL_BUSINESS');

  const companyGrant=randomUUID(),txGrant=randomUUID();
  const grants=await admin.from('client_portal_grants').insert([
    {id:companyGrant,workspace_id:ws,principal_id:principalId,
      target_type:'company',company_id:companyId,permissions:['view'],created_by:owner.id},
    {id:txGrant,workspace_id:ws,principal_id:principalId,
      target_type:'transaction',transaction_id:transactionId,
      permissions:['view','view_finance'],created_by:owner.id},
  ]).select('id');
  if(grants.error||grants.data?.length!==2)throw Error('J08_EXPLICIT_GRANT_SCAFFOLD_FAILED');
  const payment=await admin.from('payments').select('id,transaction_id,company_id')
    .eq('workspace_id',ws).eq('transaction_id',transactionId).limit(2);
  if(payment.error||payment.data?.length!==1)throw Error('J08_AUTHORITATIVE_PAYMENT_SOURCE_MISSING');
  const shares=await admin.from('client_portal_resource_shares').insert([
    {id:randomUUID(),workspace_id:ws,principal_id:principalId,
      transaction_id:transactionId,resource_type:'document',document_id:documentId,
      created_by:owner.id},
    {id:randomUUID(),workspace_id:ws,principal_id:principalId,
      transaction_id:transactionId,resource_type:'receipt',payment_id:payment.data[0].id,
      created_by:owner.id},
  ]).select('id');
  if(shares.error||shares.data?.length!==2)throw Error('J08_RESOURCE_SHARE_SCAFFOLD_FAILED');

  const fresh=await client.client.auth.signInWithPassword({
    email:client.email,password:client.password,
  });
  verify(!fresh.error&&Boolean(fresh.data?.session?.access_token),
    'J08_CLIENT_INDEPENDENT_FRESH_JWT');
  const model=await client.client.rpc('get_client_portal_read_model_v1',
    {p_workspace_id:ws});
  verify(!model.error&&
    model.data?.companies?.some(c=>c.id===companyId)&&
    model.data?.transactions?.some(t=>t.id===transactionId&&t.companyId===companyId)&&
    model.data?.documents?.some(d=>d.id===documentId&&d.transactionId===transactionId)&&
    model.data?.receipts?.some(r=>r.paymentId===payment.data[0].id&&
      r.transactionId===transactionId&&r.companyId===companyId),
    'J08_JWT_EXPLICIT_COMPANY_TRANSACTION_DOCUMENT_RECEIPT_PROJECTION');
  verify(model.data?.companies?.every(x=>x.id===companyId)&&
    model.data?.transactions?.every(x=>x.id===transactionId)&&
    model.data?.documents?.every(x=>x.id===documentId)&&
    model.data?.receipts?.every(x=>x.paymentId===payment.data[0].id)&&
    !JSON.stringify(model.data).includes('storage_path')&&
    !JSON.stringify(model.data).includes('checksum'),
    'J08_CLIENT_SAFE_FIELDS_WITH_NO_UNSHARED_OR_INTERNAL_RECORDS');
  const direct=await client.client.from('documents')
    .select('id,storage_path,checksum').eq('id',documentId);
  const member=await client.client.from('workspace_memberships')
    .select('role').eq('workspace_id',ws);
  verify((direct.error||direct.data?.length===0)&&
    (member.error||member.data?.length===0),
    'J08_PORTAL_CLIENT_CANNOT_USE_DIRECT_STAFF_DATA_API');

  const revoked=await admin.from('client_portal_grants').update({
    revoked_at:new Date().toISOString(),
  }).eq('workspace_id',ws).eq('principal_id',principalId).select('id');
  if(revoked.error||revoked.data?.length!==2)throw Error('J08_SCOPED_REVOKE_FAILED');
  const after=await client.client.rpc('get_client_portal_read_model_v1',
    {p_workspace_id:ws});
  verify(!after.error&&after.data?.companies?.length===0&&
    after.data?.transactions?.length===0&&
    after.data?.documents?.length===0&&
    after.data?.receipts?.length===0,
    'J08_REVOKED_EXPLICIT_GRANTS_REMOVE_ALL_SHARED_PROJECTIONS');
  verify(await readCount('client_portal_principals',ws)===1&&
    await readCount('client_portal_grants',ws)===2&&
    await readCount('client_portal_resource_shares',ws)===2,
    'J08_SCAFFOLD_BOUND_TO_ONE_DISPOSABLE_WORKSPACE');
}
