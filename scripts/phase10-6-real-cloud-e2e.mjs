import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const PROJECT_REF='juzxriirhkuzviwnhkbd';
const BUCKET='enjaz-documents-private';
const MAX_BYTES=52_428_800;
const MARKER='phase10_6_real_cloud_e2e';
const TITLE_PREFIX='Phase 10.6 E2E';
const ARTIFACT_DIR='artifacts/phase10-6-real-cloud';
const EVIDENCE_PATH=`${ARTIFACT_DIR}/evidence.json`;
const requiredEnv=name=>{const value=process.env[name]?.trim();if(!value)throw new Error(`Missing required environment variable: ${name}`);return value};
const url=requiredEnv('SUPABASE_URL').replace(/\/$/,'');
const publishableKey=requiredEnv('SUPABASE_PUBLISHABLE_KEY');
const secretKey=requiredEnv('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES')throw new Error('ENJAZ_REAL_CLOUD_CONFIRM must equal YES');
if(!url.includes(PROJECT_REF))throw new Error('Refusing to run against an unexpected Supabase project');
if(secretKey.startsWith('sb_publishable_')||secretKey===publishableKey)throw new Error('SUPABASE_SECRET_KEY is not privileged');

const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const makeUserClient=()=>createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const evidence={schema:'enjaz.phase10-6-real-cloud-e2e.v1',projectRef:PROJECT_REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
const users=[];
const workspaces=new Set();
const objectPaths=new Set();
const operationIds=new Set();
let fatalError=null;
const record=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const assert=(condition,name,detail=null)=>{if(!condition)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);record(name,detail)};
const uuid=()=>crypto.randomUUID();
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bytes=text=>new TextEncoder().encode(text);

async function writeEvidence(){await mkdir(ARTIFACT_DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatalError&&evidence.cleanupPassed;if(fatalError)evidence.failure=fatalError instanceof Error?fatalError.message:String(fatalError);await writeFile(EVIDENCE_PATH,`${JSON.stringify(evidence,null,2)}\n`,'utf8')}
async function adminCreateTestUser(label){const entropy=`${Date.now()}-${uuid().slice(0,8)}`,email=`enjaz-phase10-6-${label}-${entropy}@example.com`,password=`EnjAZ!${uuid()}Aa9`;const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});if(error||!data.user)throw error??new Error(`Unable to create ${label} user`);const entry={id:data.user.id,email,password,client:makeUserClient(),accessToken:null};users.push(entry);return entry}
async function signIn(entry){const{data,error}=await entry.client.auth.signInWithPassword({email:entry.email,password:entry.password});if(error||!data.session?.access_token)throw error??new Error('Test sign-in returned no token');entry.accessToken=data.session.access_token;return entry}
async function waitForWorkspace(userId){for(let attempt=0;attempt<24;attempt++){const{data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);if(error)throw error;if(data?.length===1){workspaces.add(data[0].id);return data[0].id}await sleep(250)}throw new Error('Workspace bootstrap did not materialize')}
async function edge(entry,body){if(!entry.accessToken)throw new Error('Missing test JWT');const response=await fetch(`${url}/functions/v1/enjaz-document-vault`,{method:'POST',headers:{apikey:publishableKey,Authorization:`Bearer ${entry.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:response.status,ok:response.ok,data:await response.json().catch(()=>null)}}
async function unauthenticatedEdge(body){const response=await fetch(`${url}/functions/v1/enjaz-document-vault`,{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:response.status,ok:response.ok,data:await response.json().catch(()=>null)}}
async function uploadSignedUrl(signedUrl,payload,mimeType,fileName){const form=new FormData();form.append('cacheControl','3600');form.append('',new Blob([payload],{type:mimeType}),fileName);const response=await fetch(signedUrl,{method:'PUT',headers:{'x-upsert':'false'},body:form});const text=await response.text().catch(()=>'');if(!response.ok)throw new Error(`Signed upload failed (${response.status}) ${text.slice(0,160)}`)}
async function getSession(operationId){const{data,error}=await admin.from('document_upload_sessions').select('id,workspace_id,document_id,version_number,storage_path,state,failure_code,checksum,document_version_id').eq('id',operationId).maybeSingle();if(error)throw error;if(data?.storage_path)objectPaths.add(data.storage_path);return data}
async function objectPresent(path){const{data,error}=await admin.storage.from(BUCKET).info(path);return Boolean(data&&!error)}
async function versionCount(documentId){const{data,error}=await admin.from('document_versions').select('id,version_number,checksum,storage_path').eq('document_id',documentId).order('version_number');if(error)throw error;for(const row of data??[])if(row.storage_path)objectPaths.add(row.storage_path);return data??[]}
async function prepare(entry,workspaceId,{name='valid',fileName=`${name}.pdf`,mimeType='application/pdf',payload,checksum=payload?sha256(payload):null,byteSize=payload?.byteLength??1,documentId=null}={}){const operationId=uuid();operationIds.add(operationId);const response=await edge(entry,{action:'prepare',workspaceId,operationId,documentId,title:`${TITLE_PREFIX} ${name}`,documentType:'zero_escape_probe',companyId:null,transactionId:null,fileName,mimeType,byteSize,checksum});const session=await getSession(operationId);return{operationId,response,session}}
async function assertRejectedPrepare(entry,workspaceId,override,name){const operationId=uuid();operationIds.add(operationId);const payload={action:'prepare',workspaceId,operationId,title:`${TITLE_PREFIX} reject ${name}`,fileName:`${name}.pdf`,mimeType:'application/pdf',byteSize:4,checksum:'0'.repeat(64),...override};const response=await edge(entry,payload);assert(!response.ok,name,`HTTP ${response.status}`);const residue=await getSession(operationId);assert(residue===null,`${name}_no_session_residue`)}
async function assertFailedBinaryCase(primary,workspaceId,{name,fileName=`${name}.pdf`,payload,expectedError,checksum=sha256(payload)}){const probe=await prepare(primary,workspaceId,{name,fileName,payload,checksum});assert(probe.response.ok&&typeof probe.response.data?.signedUrl==='string',`${name}_prepare`);assert(probe.session?.state==='prepared',`${name}_prepared_state`);await uploadSignedUrl(probe.response.data.signedUrl,payload,'application/pdf',fileName);const ack=await edge(primary,{action:'acknowledge',operationId:probe.operationId});assert(ack.status===409&&ack.data?.error===expectedError,`${name}_rejected`,`${ack.status}:${ack.data?.error??'none'}`);const failed=await getSession(probe.operationId);assert(failed?.state==='failed'&&failed.failure_code===expectedError,`${name}_session_failed`);assert(!(await objectPresent(failed.storage_path)),`${name}_object_removed`);assert((await versionCount(failed.document_id)).length===0,`${name}_no_version_promotion`);return failed}

async function cleanupAll(){let ok=true;
  for(const path of objectPaths){try{const{error}=await admin.storage.from(BUCKET).remove([path]);if(error&&!/not found/i.test(error.message))throw error;evidence.cleanup.push({kind:'storage_object',passed:true})}catch(error){ok=false;evidence.cleanup.push({kind:'storage_object',passed:false,error:error instanceof Error?error.message:String(error)})}}
  for(const workspaceId of workspaces){try{const{error}=await admin.from('workspaces').delete().eq('id',workspaceId);if(error)throw error;evidence.cleanup.push({kind:'workspace',passed:true})}catch(error){ok=false;evidence.cleanup.push({kind:'workspace',passed:false,error:error instanceof Error?error.message:String(error)})}}
  for(const entry of users){try{if(entry.accessToken)await admin.auth.admin.signOut(entry.accessToken,'global');const{error}=await admin.auth.admin.deleteUser(entry.id,false);if(error)throw error;evidence.cleanup.push({kind:'auth_user',passed:true})}catch(error){ok=false;evidence.cleanup.push({kind:'auth_user',passed:false,error:error instanceof Error?error.message:String(error)})}}
  try{if(operationIds.size){const{data,error}=await admin.from('document_upload_sessions').select('id').in('id',[...operationIds]);if(error)throw error;if((data??[]).length!==0)throw new Error('upload-session residue remains')}const{data:docs,error:docsError}=await admin.from('documents').select('id').ilike('title',`${TITLE_PREFIX}%`);if(docsError)throw docsError;if((docs??[]).length!==0)throw new Error('document residue remains');const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;const marked=(listed.data?.users??[]).filter(user=>user.user_metadata?.enjaz_test_marker===MARKER);if(marked.length!==0)throw new Error('auth-user residue remains');evidence.cleanup.push({kind:'zero_residue_verification',passed:true})}catch(error){ok=false;evidence.cleanup.push({kind:'zero_residue_verification',passed:false,error:error instanceof Error?error.message:String(error)})}
  evidence.cleanupPassed=ok;
}

try{
  const bucket=await admin.storage.getBucket(BUCKET);if(bucket.error||!bucket.data)throw bucket.error??new Error('Private bucket missing');assert(bucket.data.public===false,'bucket_private');
  const primary=await signIn(await adminCreateTestUser('primary')),outsider=await signIn(await adminCreateTestUser('outsider'));
  const primaryWorkspace=await waitForWorkspace(primary.id),outsiderWorkspace=await waitForWorkspace(outsider.id);record('disposable_confirmed_auth_users_created');assert(primaryWorkspace!==outsiderWorkspace,'isolated_workspaces');

  const unauth=await unauthenticatedEdge({action:'acknowledge',operationId:uuid()});assert(!unauth.ok&&(unauth.status===401||unauth.status===403),'unauthenticated_edge_denied',`HTTP ${unauth.status}`);
  await assertRejectedPrepare(primary,primaryWorkspace,{byteSize:0},'zero_byte_rejected');
  await assertRejectedPrepare(primary,primaryWorkspace,{byteSize:MAX_BYTES+1},'oversized_rejected');
  await assertRejectedPrepare(primary,primaryWorkspace,{fileName:'../escape.pdf'},'path_filename_rejected');
  const crossPrepare=await prepare(outsider,primaryWorkspace,{name:'cross-workspace',payload:bytes('%PDF-1.4\nforeign\n%%EOF')});assert(!crossPrepare.response.ok,'cross_workspace_prepare_denied',`HTTP ${crossPrepare.response.status}`);assert(crossPrepare.session===null,'cross_workspace_prepare_no_session');

  const validBytes=bytes('%PDF-1.4\nENJAZ Phase 10.6 valid binary\n%%EOF\n'),validChecksum=sha256(validBytes);
  const valid=await prepare(primary,primaryWorkspace,{name:'valid',payload:validBytes,checksum:validChecksum});assert(valid.response.ok&&typeof valid.response.data?.signedUrl==='string','valid_prepare_signed_capability');assert(valid.session?.state==='prepared'&&valid.session.checksum===validChecksum,'prepared_checksum_bound');
  const authAckDenied=await primary.client.rpc('acknowledge_document_upload_v2',{p_operation_id:valid.operationId,p_storage_path:valid.session.storage_path,p_actual_byte_size:validBytes.byteLength,p_actual_mime_type:'application/pdf',p_actual_checksum:validChecksum});assert(Boolean(authAckDenied.error),'authenticated_direct_ack_v2_denied',authAckDenied.error?.code??'denied');
  const outsiderClaim=await outsider.client.rpc('get_document_upload_claim_v2',{p_operation_id:valid.operationId});assert(Boolean(outsiderClaim.error),'outsider_claim_v2_denied',outsiderClaim.error?.code??'denied');
  const earlyAck=await edge(primary,{action:'acknowledge',operationId:valid.operationId});assert(earlyAck.status===409&&earlyAck.data?.error==='STORAGE_OBJECT_NOT_FOUND','missing_object_ack_rejected');assert((await getSession(valid.operationId))?.state==='prepared','missing_object_preserves_prepared_state');
  await uploadSignedUrl(valid.response.data.signedUrl,validBytes,'application/pdf','valid.pdf');record('valid_signed_upload_succeeded');
  const validAck=await edge(primary,{action:'acknowledge',operationId:valid.operationId});assert(validAck.ok&&validAck.data?.ack?.checksum===validChecksum&&validAck.data?.ack?.versionNumber===1,'valid_checksum_bound_ack');
  const replay=await edge(primary,{action:'acknowledge',operationId:valid.operationId});assert(replay.ok&&replay.data?.ack?.wasDuplicate===true&&replay.data?.ack?.checksum===validChecksum,'valid_ack_replay_idempotent');
  const validSession=await getSession(valid.operationId),validVersions=await versionCount(validSession.document_id);assert(validSession?.state==='acknowledged'&&validSession.checksum===validChecksum,'acknowledged_session_checksum');assert(validVersions.length===1&&validVersions[0].checksum===validChecksum,'exactly_one_checksum_bound_version');
  const{data:current,error:currentError}=await admin.from('documents').select('id,status,checksum,storage_path').eq('id',validSession.document_id).single();if(currentError)throw currentError;assert(current.status==='ready'&&current.checksum===validChecksum,'current_document_checksum_pointer');if(current.storage_path)objectPaths.add(current.storage_path);
  const download=await edge(primary,{action:'download',workspaceId:primaryWorkspace,documentId:validSession.document_id,versionNumber:1});assert(download.ok&&typeof download.data?.signedUrl==='string','valid_signed_download');const downloaded=await fetch(download.data.signedUrl);const downloadedBytes=new Uint8Array(await downloaded.arrayBuffer());assert(downloaded.ok&&Buffer.compare(Buffer.from(downloadedBytes),Buffer.from(validBytes))===0,'valid_download_bytes_exact');
  const outsiderDownload=await edge(outsider,{action:'download',workspaceId:primaryWorkspace,documentId:validSession.document_id,versionNumber:1});assert(!outsiderDownload.ok,'cross_workspace_download_denied',`HTTP ${outsiderDownload.status}`);

  const activeBytes=bytes('%PDF-1.4\n1 0 obj\n<< /OpenAction 2 0 R /JavaScript (alert) >>\nendobj\n%%EOF\n');
  await assertFailedBinaryCase(primary,primaryWorkspace,{name:'active-pdf',payload:activeBytes,expectedError:'BINARY_PDF_ACTIVE_CONTENT_FORBIDDEN'});
  const corruptBytes=bytes('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n');
  await assertFailedBinaryCase(primary,primaryWorkspace,{name:'corrupt-pdf',payload:corruptBytes,expectedError:'BINARY_PDF_CORRUPT'});
  const spoofBytes=bytes('%PDF-1.4\nspoof extension\n%%EOF\n');
  await assertFailedBinaryCase(primary,primaryWorkspace,{name:'spoof-extension',fileName:'spoof-extension.jpg',payload:spoofBytes,expectedError:'BINARY_EXTENSION_MISMATCH'});
  const mismatchBytes=bytes('%PDF-1.4\nchecksum mismatch\n%%EOF\n');
  await assertFailedBinaryCase(primary,primaryWorkspace,{name:'checksum-mismatch',payload:mismatchBytes,checksum:'0'.repeat(64),expectedError:'BINARY_CHECKSUM_MISMATCH'});

  record('real_cloud_zero_escape_product_checks_complete',`${evidence.checks.length} checks`);
}catch(error){fatalError=error;console.error(error)}finally{
  await cleanupAll();
  if(!evidence.cleanupPassed&&!fatalError)fatalError=new Error('Cleanup or zero-residue verification failed');
  await writeEvidence();
}
if(fatalError)process.exitCode=1;
