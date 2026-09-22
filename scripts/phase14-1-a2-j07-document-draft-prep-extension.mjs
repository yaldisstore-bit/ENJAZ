import { randomUUID } from 'node:crypto';

// J07 preparatory hosted test: authoritative draft, review and render-request
// gates only. It does NOT render/upload/verify a PDF or certify full J07.
// Called inside the disposable J01-J06 Auth journey; owner of cleanup is caller.
export async function checkLinkedDocumentDraftPrep({
  owner, outsider, fresh, workspaceId, transactionId, companyId,
  outsiderCompanyId, companyName, transactionType, readCount, verify,
}) {
  const ws = workspaceId;
  const templateId = randomUUID(), versionId = randomUUID();
  const schema = {
    company_name: {source:'company', field:'legal_name', required:true},
    transaction_type: {source:'transaction', field:'type', required:true},
  };
  const body = 'الشركة / {{company_name}}\\nالمعاملة / {{transaction_type}}';
  const templateArgs = {
    p_workspace_id:ws, p_template_id:templateId,
    p_name:'قالب J07 المختبري', p_kind:'official-letter',
    p_body_source:body, p_token_schema:schema, p_active:true,
  };
  const outsiderTemplate = await outsider.client.rpc('save_document_template_v1',templateArgs);
  verify(Boolean(outsiderTemplate.error) && await readCount('document_templates',ws)===0,
    'J07_PREP_OUTSIDER_CANNOT_CREATE_OWNER_TEMPLATE');
  const saved = await owner.client.rpc('save_document_template_v1',templateArgs);
  verify(!saved.error && await readCount('document_templates',ws)===1,
    'J07_PREP_OWNER_TEMPLATE_SAVED');
  const versionArgs = {
    p_workspace_id:ws,p_request_id:versionId,p_template_id:templateId,
    p_body_source:body,p_token_schema:schema,
  };
  const version = await owner.client.rpc('create_document_template_version_v1',versionArgs);
  verify(!version.error && version.data?.versionId===versionId &&
    version.data?.state==='draft' && await readCount('document_template_versions',ws)===1,
    'J07_PREP_IMMUTABLE_TEMPLATE_VERSION');
  const published = await owner.client.rpc('publish_document_template_version_v1',
    {p_workspace_id:ws,p_version_id:versionId});
  verify(!published.error && published.data?.state==='published',
    'J07_PREP_OWNER_PUBLISHED_VERSION');
  const requestId=randomUUID();
  const draftArgs = {
    p_workspace_id:ws,p_request_id:requestId,p_template_version_id:versionId,
    p_title:'طلب J07 المختبري',p_company_id:companyId,
    p_transaction_id:transactionId,p_contact_id:null,p_ocr_analysis_id:null,
  };
  const outsiderDraft=await outsider.client.rpc('generate_document_draft_v1',draftArgs);
  verify(Boolean(outsiderDraft.error) && await readCount('document_drafts',ws)===0,
    'J07_PREP_OUTSIDER_CANNOT_GENERATE_OWNER_DRAFT');
  const foreignCompany=await owner.client.rpc('generate_document_draft_v1',{
    ...draftArgs,p_request_id:randomUUID(),p_company_id:outsiderCompanyId,
  });
  verify(Boolean(foreignCompany.error) && await readCount('document_drafts',ws)===0,
    'J07_PREP_FOREIGN_COMPANY_LINK_REJECTED');
  const generated=await owner.client.rpc('generate_document_draft_v1',draftArgs);
  verify(!generated.error && Boolean(generated.data?.draftId) &&
    generated.data?.status==='review_required' &&
    generated.data?.wasDuplicate===false,
    'J07_PREP_OWNER_GENERATED_FROM_SAME_COMPANY_TRANSACTION');
  const draftId=generated.data.draftId;
  const replay=await fresh.rpc('generate_document_draft_v1',draftArgs);
  verify(!replay.error && replay.data?.draftId===draftId &&
    replay.data?.wasDuplicate===true &&
    await readCount('document_drafts',ws)===1,
    'J07_PREP_FRESH_JWT_DRAFT_IDEMPOTENCY');
  const drift=await owner.client.rpc('generate_document_draft_v1',{
    ...draftArgs,p_title:'طلب مختلف لنفس المفتاح',
  });
  verify(Boolean(drift.error) && await readCount('document_drafts',ws)===1,
    'J07_PREP_SAME_KEY_DIFFERENT_TITLE_DENIED');
  const owned=await fresh.from('document_drafts')
    .select('id,workspace_id,company_id,transaction_id,status,compiled_content,template_version_id')
    .eq('id',draftId).single();
  const foreignRead=await outsider.client.from('document_drafts')
    .select('id').eq('id',draftId);
  verify(!owned.error && owned.data?.workspace_id===ws &&
    owned.data?.company_id===companyId &&
    owned.data?.transaction_id===transactionId &&
    owned.data?.template_version_id===versionId &&
    owned.data?.status==='review_required' &&
    owned.data?.compiled_content?.includes(companyName) &&
    owned.data?.compiled_content?.includes(transactionType) &&
    (foreignRead.error || foreignRead.data?.length===0),
    'J07_PREP_FRESH_JWT_DURABLE_SOURCE_FACTS_AND_OUTSIDER_RLS');
  const earlyRequest=await owner.client.rpc('request_document_render_v1',{
    p_workspace_id:ws,p_request_id:randomUUID(),p_draft_id:draftId,
  });
  verify(Boolean(earlyRequest.error) && await readCount('pdf_jobs',ws)===0,
    'J07_PREP_RENDER_REQUIRES_APPROVAL');
  const foreignApprove=await outsider.client.rpc('review_document_draft_v1',{
    p_workspace_id:ws,p_draft_id:draftId,p_decision:'approve',p_note:'unauthorized',
  });
  verify(Boolean(foreignApprove.error),
    'J07_PREP_OUTSIDER_CANNOT_APPROVE_OWNER_DRAFT');
  const approved=await owner.client.rpc('review_document_draft_v1',{
    p_workspace_id:ws,p_draft_id:draftId,p_decision:'approve',
    p_note:'J07 owner isolated approval',
  });
  verify(!approved.error && approved.data?.status==='approved',
    'J07_PREP_OWNER_APPROVAL_PERSISTED');
  const renderKey=randomUUID();
  const renderArgs={p_workspace_id:ws,p_request_id:renderKey,p_draft_id:draftId};
  const requested=await fresh.rpc('request_document_render_v1',renderArgs);
  verify(!requested.error && Boolean(requested.data?.jobId) &&
    requested.data?.status==='queued' && requested.data?.wasDuplicate===false,
    'J07_PREP_FRESH_JWT_RENDER_REQUEST_QUEUED');
  const jobId=requested.data.jobId;
  const replayRequest=await owner.client.rpc('request_document_render_v1',renderArgs);
  verify(!replayRequest.error && replayRequest.data?.jobId===jobId &&
    replayRequest.data?.wasDuplicate===true && await readCount('pdf_jobs',ws)===1,
    'J07_PREP_RENDER_REQUEST_REPLAY_NO_DUPLICATE');
  const prematureFinal=await owner.client.rpc('finalize_document_draft_v1',{
    p_workspace_id:ws,p_draft_id:draftId,p_render_job_id:jobId,
  });
  const finalDraft=await fresh.from('document_drafts')
    .select('id,status,final_document_id,final_document_version_id')
    .eq('id',draftId).single();
  verify(Boolean(prematureFinal.error) && !finalDraft.error &&
    finalDraft.data?.status==='approved' &&
    finalDraft.data?.final_document_id===null &&
    finalDraft.data?.final_document_version_id===null &&
    await readCount('documents',ws)===0,
    'J07_PREP_FINALIZATION_REQUIRES_REAL_RENDER_AND_PRIVATE_PDF');
}
