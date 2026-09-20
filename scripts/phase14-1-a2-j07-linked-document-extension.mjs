import { randomUUID, createHash } from 'node:crypto';

const LAB='nqhgaukutkyvfumbtbtg',BUCKET='enjaz-documents-private';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

// Same authenticated J01-J06 disposable workspace; caller owns isolated
// credentials and removes this workspace's generated objects before DB cleanup.
// Do not treat a source-only or a deployed-function check as a real PDF result.
export async function checkLinkedDocument({
 owner,outsider,fresh,admin,workspaceId,transactionId,companyId,
 publishableKey,storagePaths,readCount,verify,
}) {
 const ws=workspaceId,templateId=randomUUID(),versionId=randomUUID();
 if(process.env.ENJAZ_A2_BRANCH_REF!==LAB||
    process.env.SUPABASE_URL!=='https://'+LAB+'.supabase.co'||
    process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES')
   throw Error('J07_ISOLATED_TARGET_DENIED');
 const b=await admin.storage.getBucket(BUCKET);
 verify(!b.error&&b.data?.public===false&&Number(b.data?.file_size_limit)===52_428_800,
   'J07_LAB_DOCUMENT_BUCKET_REMAINS_PRIVATE');
 const title='كتاب إنجاز المختبري المرتبط بالمعاملة';
 const body=['كتاب رسمي — إنجاز','الشركة / {{company_name}}',
  'المعاملة / {{transaction_type}}',
  'هذا الكتاب من مستندات الاختبار السحابي المعزول ويطابق مصدر المعاملة.'].join('\n');
 const tokenSchema={
  company_name:{source:'company',field:'legal_name',required:true},
  transaction_type:{source:'transaction',field:'type',required:true},
 };
 const saved=await owner.client.rpc('save_document_template_v1',{
  p_workspace_id:ws,p_template_id:templateId,
  p_name:'قالب اختبار J07',p_kind:'official-letter',
  p_body_source:body,p_token_schema:tokenSchema,p_active:true,
 });
 verify(!saved.error,'J07_REAL_OWNER_TEMPLATE_SAVED');
 const version=await owner.client.rpc('create_document_template_version_v1',{
  p_workspace_id:ws,p_request_id:versionId,p_template_id:templateId,
  p_body_source:body,p_token_schema:tokenSchema,
 });
 verify(!version.error&&version.data?.versionId===versionId,
   'J07_REAL_OWNER_IMMUTABLE_TEMPLATE_VERSION');
 const published=await owner.client.rpc('publish_document_template_version_v1',{
  p_workspace_id:ws,p_version_id:versionId,
 });
 verify(!published.error&&published.data?.state==='published',
   'J07_REAL_OWNER_TEMPLATE_PUBLISHED');
 const outside=await outsider.client.rpc('generate_document_draft_v1',{
  p_workspace_id:ws,p_request_id:randomUUID(),
  p_template_version_id:versionId,p_title:title,
  p_company_id:companyId,p_transaction_id:transactionId,
  p_contact_id:null,p_ocr_analysis_id:null,
 });
 verify(Boolean(outside.error)&&await readCount('document_drafts',ws)===0,
   'J07_OUTSIDER_DOCUMENT_GENERATION_DENIED');
 const generated=await owner.client.rpc('generate_document_draft_v1',{
  p_workspace_id:ws,p_request_id:randomUUID(),
  p_template_version_id:versionId,p_title:title,
  p_company_id:companyId,p_transaction_id:transactionId,
  p_contact_id:null,p_ocr_analysis_id:null,
 });
 verify(!generated.error&&Boolean(generated.data?.draftId)&&
   generated.data?.status==='review_required'&&
   await readCount('document_drafts',ws)===1,
   'J07_SAME_TRANSACTION_REVIEW_REQUIRED_DRAFT_CREATED');
 const draftId=generated.data.draftId;
 const freshDraft=await fresh.from('document_drafts')
  .select('id,workspace_id,company_id,transaction_id,status,compiled_content')
  .eq('id',draftId).single();
 verify(!freshDraft.error&&freshDraft.data?.workspace_id===ws&&
   freshDraft.data?.company_id===companyId&&
   freshDraft.data?.transaction_id===transactionId&&
   freshDraft.data?.status==='review_required'&&
   freshDraft.data?.compiled_content.includes('كتاب رسمي'),
   'J07_FRESH_JWT_DURABLE_TRANSACTION_DOCUMENT_PROVENANCE');
 const approved=await owner.client.rpc('review_document_draft_v1',{
  p_workspace_id:ws,p_draft_id:draftId,p_decision:'approve',
  p_note:'J07 isolated authenticated review',
 });
 verify(!approved.error&&approved.data?.status==='approved',
   'J07_AUTHENTICATED_HUMAN_REVIEW_APPROVED');
 const render=await owner.client.rpc('request_document_render_v1',{
  p_workspace_id:ws,p_request_id:randomUUID(),p_draft_id:draftId,
 });
 verify(!render.error&&Boolean(render.data?.jobId)&&
   render.data?.status==='queued',
   'J07_GOVERNED_RENDER_REQUESTED');
 const jobId=render.data.jobId;
 const endpoint='https://'+LAB+'.supabase.co/functions/v1/enjaz-document-render';
 const ownerSession=await owner.client.auth.getSession();
 const token=ownerSession.data?.session?.access_token;
 if(!token)throw Error('J07_REAL_OWNER_JWT_MISSING');
 const invoke=async jwt=>{
  const response=await fetch(endpoint,{
   method:'POST',headers:{apikey:publishableKey,Authorization:'Bearer '+jwt,
    'Content-Type':'application/json'},
   body:JSON.stringify({workspaceId:ws,jobId}),
  });
  return {status:response.status,data:await response.json().catch(()=>null)};
 };
 const blocked=await outsider.client.auth.getSession();
 const foreignToken=blocked.data?.session?.access_token;
 if(!foreignToken)throw Error('J07_OUTSIDER_JWT_MISSING');
 const foreign=await invoke(foreignToken);
 verify([401,403,404].includes(foreign.status)&&
   await readCount('documents',ws)===0,
   'J07_OUTSIDER_RENDER_GATEWAY_DENIED');
 const result=await invoke(token);
 verify(result.status===200&&result.data?.ok===true&&
   result.data?.status==='succeeded'&&
   Boolean(result.data?.documentId)&&
   Boolean(result.data?.documentVersionId),
   'J07_REAL_EDGE_ARABIC_PDF_RENDER_SUCCEEDED');
 const documentId=result.data.documentId,documentVersionId=result.data.documentVersionId;
 const [document,docVersion]=await Promise.all([
  fresh.from('documents')
   .select('id,workspace_id,company_id,transaction_id,document_type,mime_type,size_bytes,checksum,status')
   .eq('id',documentId).single(),
  fresh.from('document_versions')
   .select('id,workspace_id,document_id,mime_type,size_bytes,checksum,storage_path')
   .eq('id',documentVersionId).single(),
 ]);
 verify(!document.error&&!docVersion.error&&
   document.data?.workspace_id===ws&&document.data?.company_id===companyId&&
   document.data?.transaction_id===transactionId&&
   document.data?.document_type==='generated-official'&&
   document.data?.status==='ready'&&
   document.data?.mime_type==='application/pdf'&&
   docVersion.data?.document_id===documentId&&
   docVersion.data?.workspace_id===ws&&
   docVersion.data?.mime_type==='application/pdf'&&
   Boolean(docVersion.data?.storage_path),
   'J07_FRESH_OWNER_JWT_VAULT_SOURCE_JOIN');
 const path=docVersion.data.storage_path;
 storagePaths.add(path);
 const binary=await admin.storage.from(BUCKET).download(path);
 if(binary.error||!binary.data)throw Error('J07_PRIVATE_PDF_BINARY_MISSING');
 const bytes=Buffer.from(await binary.data.arrayBuffer());
 verify(bytes.subarray(0,5).toString('ascii')==='%PDF-'&&bytes.byteLength>5000&&
   sha256(bytes)===docVersion.data.checksum&&
   sha256(bytes)===document.data.checksum&&
   bytes.byteLength===Number(docVersion.data.size_bytes)&&
   bytes.byteLength===Number(document.data.size_bytes),
   'J07_REAL_PDF_BINARY_SHA256_AND_VAULT_SIZE_MATCH');
 const again=await invoke(token);
 verify(again.status===200&&again.data?.wasDuplicate===true&&
   again.data?.documentId===documentId&&
   again.data?.documentVersionId===documentVersionId&&
   await readCount('documents',ws)===1,
   'J07_RENDER_RETRY_SAME_DOCUMENT_AND_VERSION');
 const final=await owner.client.rpc('finalize_document_draft_v1',{
  p_workspace_id:ws,p_draft_id:draftId,p_render_job_id:jobId,
 });
 verify(!final.error&&final.data?.status==='final'&&
   final.data?.documentId===documentId&&
   final.data?.documentVersionId===documentVersionId,
   'J07_FINALIZE_APPROVED_SOURCE_ONLY');
 const source=await fresh.from('document_drafts')
   .select('id,workspace_id,transaction_id,company_id,status,final_document_id,final_document_version_id')
   .eq('id',draftId).single();
 const hidden=await outsider.client.from('documents')
   .select('id').eq('id',documentId);
 verify(!source.error&&source.data?.workspace_id===ws&&
   source.data?.transaction_id===transactionId&&
   source.data?.company_id===companyId&&
   source.data?.status==='final'&&
   source.data?.final_document_id===documentId&&
   source.data?.final_document_version_id===documentVersionId&&
   (hidden.error||hidden.data?.length===0),
   'J07_DURABLE_J01_TO_J06_FINAL_DOCUMENT_AND_FOREIGN_RLS');
}
