import {randomUUID} from 'node:crypto';

// Real Auth/RPC contract lifecycle over the same generated PDF and company.
// Signature provenance is explicitly synthetic QA metadata, not a legal signature
// or a certificate of representative/client approval authority.
export async function checkLinkedContract({owner,outsider,member,fresh,workspaceId,
  companyId,transactionId,documentId,documentVersionId,draftId,templateVersionId,readCount,verify}) {
  const ws=workspaceId;
  const engagementArgs={p_workspace_id:ws,p_company_id:companyId,p_transaction_id:transactionId,
    p_title:'J11 synthetic retainer',p_engagement_type:'retainer',p_billing_mode:'retainer',
    p_reference:'J11-'+randomUUID(),p_start_on:'2026-01-01',p_end_on:'2026-12-31',
    p_idempotency_key:randomUUID()};
  for(const actor of [outsider,member]) {
    const denied=await actor.client.rpc('create_billing_engagement_v1',engagementArgs);
    verify(denied.error?.code==='42501',actor===member?
      'J11_WORKFORCE_CANNOT_CREATE_OWNER_RETAINER':'J11_FOREIGN_RETAINER_CREATE_DENIED');
  }
  const created=await owner.client.rpc('create_billing_engagement_v1',engagementArgs);
  verify(!created.error&&Boolean(created.data?.engagementId)&&created.data?.wasDuplicate===false,
    'J11_AUTHENTICATED_RETAINER_ON_SAME_COMPANY_TRANSACTION');
  const engagementId=created.data.engagementId;
  const replay=await fresh.rpc('create_billing_engagement_v1',engagementArgs);
  verify(!replay.error&&replay.data?.engagementId===engagementId&&replay.data?.wasDuplicate===true&&
    await readCount('commercial_engagements',ws)===1,'J11_RETAINER_REPLAY_NO_DUPLICATE');
  const contractArgs={p_workspace_id:ws,p_engagement_id:engagementId,
    p_template_version_id:templateVersionId,p_draft_id:draftId,p_title:'J11 synthetic contract revision',
    p_idempotency_key:randomUUID()};
  const foreignCreate=await outsider.client.rpc('create_engagement_contract_revision_v1',contractArgs);
  verify(foreignCreate.error?.code==='42501','J11_FOREIGN_CONTRACT_CREATE_DENIED');
  const contract=await owner.client.rpc('create_engagement_contract_revision_v1',contractArgs);
  verify(!contract.error&&Boolean(contract.data?.revisionId)&&contract.data?.revision===1&&
    contract.data?.status==='draft','J11_REVISION_ADOPTS_EXISTING_CANONICAL_FINAL_DRAFT');
  const revisionId=contract.data.revisionId;
  const duplicate=await fresh.rpc('create_engagement_contract_revision_v1',contractArgs);
  const mismatch=await owner.client.rpc('create_engagement_contract_revision_v1',
    {...contractArgs,p_title:'Conflicting same-key revision'});
  verify(!duplicate.error&&duplicate.data?.revisionId===revisionId&&duplicate.data?.wasDuplicate===true&&
    mismatch.error?.code==='23505'&&await readCount('engagement_contract_revisions',ws)===1,
    'J11_REVISION_REPLAY_AND_PAYLOAD_CONFLICT');
  const read=()=>fresh.from('engagement_contract_revisions')
    .select('id,workspace_id,engagement_id,revision_number,status,version,draft_id,template_version_id,document_id,document_version_id,signature_provenance,signed_at')
    .eq('id',revisionId).single();
  const before=await read();
  verify(!before.error&&before.data?.version===1&&before.data?.draft_id===draftId&&
    before.data?.template_version_id===templateVersionId,'J11_DURABLE_FRESH_JWT_REVISION_LINEAGE');
  const hidden=await outsider.client.from('engagement_contract_revisions').select('id').eq('id',revisionId);
  verify(!hidden.error&&hidden.data?.length===0,'J11_FOREIGN_CONTRACT_RLS_DENIED');
  const base={p_workspace_id:ws,p_revision_id:revisionId,p_document_id:null,p_document_version_id:null,
    p_effective_on:null,p_expires_on:null,p_signature_provenance:null,p_note:null};
  const reviewArgs={...base,p_operation_id:randomUUID(),p_expected_version:1,p_to_status:'under_review'};
  for(const actor of [outsider,member]) {
    const denied=await actor.client.rpc('transition_engagement_contract_revision_v2',reviewArgs);
    verify(denied.error?.code==='42501',actor===member?
      'J11_WORKFORCE_CANNOT_APPROVE_OWNER_CONTRACT':'J11_FOREIGN_CONTRACT_TRANSITION_DENIED');
  }
  const reviewed=await owner.client.rpc('transition_engagement_contract_revision_v2',reviewArgs);
  verify(!reviewed.error&&reviewed.data?.status==='under_review'&&reviewed.data?.version===2,
    'J11_VERSIONED_CONTRACT_REVIEW');
  const reviewedAgain=await fresh.rpc('transition_engagement_contract_revision_v2',reviewArgs);
  const changedReplay=await owner.client.rpc('transition_engagement_contract_revision_v2',
    {...reviewArgs,p_to_status:'approved'});
  verify(!reviewedAgain.error&&reviewedAgain.data?.wasDuplicate===true&&reviewedAgain.data?.version===2&&
    changedReplay.error?.code==='23505','J11_REVIEW_RETRY_NO_DOUBLE_TRANSITION');
  const stale=await owner.client.rpc('transition_engagement_contract_revision_v2',
    {...reviewArgs,p_operation_id:randomUUID(),p_to_status:'approved'});
  const staleRead=await read();
  const staleRejected=Boolean(stale.error)&&(
    stale.error?.code==='40001'||
    String(stale.error?.message??'').includes('ENJAZ_CONTRACT_TRANSITION_STALE')
  );
  verify(staleRejected&&!staleRead.error&&staleRead.data?.version===2&&
    staleRead.data?.status==='under_review',
    'J11_STALE_CONTRACT_VERSION_CANNOT_CHANGE_RETAINER');
  const transition=async(status,expectedVersion,extra={})=>{
    const result=await owner.client.rpc('transition_engagement_contract_revision_v2',{
      ...base,p_operation_id:randomUUID(),p_expected_version:expectedVersion,p_to_status:status,...extra});
    verify(!result.error&&result.data?.status===status&&result.data?.version===expectedVersion+1,
      'J11_TRANSITION_'+status.toUpperCase());
    return result.data;
  };
  await transition('approved',2);
  await transition('signature_pending',3,{p_document_id:documentId,p_document_version_id:documentVersionId});
  const unsigned=await owner.client.rpc('transition_engagement_contract_revision_v2',{
    ...base,p_operation_id:randomUUID(),p_expected_version:4,p_to_status:'signed'});
  verify(unsigned.error?.code==='22023'&&(await read()).data?.version===4,
    'J11_SIGNATURE_PROVENANCE_REQUIRED');
  await transition('signed',4,{p_signature_provenance:{method:'isolated_synthetic_qa',
    testOnly:true,signerUserId:owner.id,documentVersionId}});
  await transition('effective',5,{p_effective_on:'2026-01-01',p_expires_on:'2026-12-31'});
  const final=await read();
  const engagement=await fresh.from('commercial_engagements')
    .select('id,workspace_id,company_id,status,start_on,end_on').eq('id',engagementId).single();
  const link=await fresh.from('commercial_engagement_transactions')
    .select('transaction_id,engagement_id').eq('engagement_id',engagementId);
  verify(!final.error&&final.data?.status==='effective'&&final.data?.version===6&&
    final.data?.document_id===documentId&&final.data?.document_version_id===documentVersionId&&
    final.data?.signature_provenance?.testOnly===true&&Boolean(final.data?.signed_at)&&
    !engagement.error&&engagement.data?.workspace_id===ws&&engagement.data?.company_id===companyId&&
    engagement.data?.status==='active'&&!link.error&&link.data?.length===1&&
    link.data[0].transaction_id===transactionId&&await readCount('documents',ws)===1&&
    await readCount('payments',ws)===1,
    'J11_FRESH_JWT_EFFECTIVE_CONTRACT_RETAINS_J01_J10_SOURCE_GRAPH');
  await transition('superseded',6);
  const revision2=await owner.client.rpc('create_engagement_contract_revision_v1',{
    ...contractArgs,p_idempotency_key:randomUUID(),p_title:'J11 synthetic revision two'});
  verify(!revision2.error&&revision2.data?.revision===2&&revision2.data?.revisionId!==revisionId&&
    await readCount('engagement_contract_revisions',ws)===2&&(await read()).data?.status==='superseded',
    'J11_REVISION_HISTORY_PRESERVES_PREVIOUS_CANONICAL_ARTIFACT');
}
