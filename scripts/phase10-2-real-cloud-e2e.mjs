import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import crypto from 'node:crypto';

const PROJECT_REF='juzxriirhkuzviwnhkbd';
const BUCKET='enjaz-documents-private';
const ARTIFACT_DIR='artifacts/phase10-2-real-cloud';
const EVIDENCE_PATH=`${ARTIFACT_DIR}/evidence.json`;
const required=(name)=>{const value=process.env[name]?.trim();if(!value)throw new Error(`Missing required environment variable: ${name}`);return value};
const url=required('SUPABASE_URL').replace(/\/$/,'');
const publishableKey=required('SUPABASE_PUBLISHABLE_KEY');
const secretKey=required('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES')throw new Error('ENJAZ_REAL_CLOUD_CONFIRM must equal YES');
if(!url.includes(PROJECT_REF))throw new Error('Refusing to run against an unexpected Supabase project');
if(secretKey.startsWith('sb_publishable_')||secretKey===publishableKey)throw new Error('SUPABASE_SECRET_KEY is not privileged');

const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const makeUserClient=()=>createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const uuid=()=>crypto.randomUUID();
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const evidence={schema:'enjaz.phase10-2-real-cloud-e2e.v1',phase:'10.2',provider:'azure-document-intelligence/prebuilt-layout-v4',sourceAuthority:'SOURCE_FILE_REMAINS_AUTHORITATIVE',startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[]};
let fatal=null;const objectPaths=new Set();let workspaceId=null,user=null,accessToken=null;
const record=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const assert=(condition,name,detail=null)=>{if(!condition)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);record(name,detail)};

function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function pngChunk(type,data){const t=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([length,t,data,crc])}
const FONT={
 A:['01110','10001','10001','11111','10001','10001','10001'],C:['01111','10000','10000','10000','10000','10000','01111'],E:['11111','10000','10000','11110','10000','10000','11111'],J:['00111','00010','00010','00010','00010','10010','01100'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],' ':['00000','00000','00000','00000','00000','00000','00000']};
function makeProbePng(text='ENJAZ OCR 102 TEST'){
 const scale=10,glyphW=5,gap=2,margin=30,width=margin*2+(text.length*(glyphW+gap)-gap)*scale,height=margin*2+7*scale,stride=1+width*3,raw=Buffer.alloc(stride*height,255);
 for(let y=0;y<height;y++)raw[y*stride]=0;
 [...text].forEach((ch,index)=>{const rows=FONT[ch]??FONT[' '];for(let gy=0;gy<7;gy++)for(let gx=0;gx<glyphW;gx++)if(rows[gy][gx]==='1')for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const x=margin+(index*(glyphW+gap)+gx)*scale+sx,y=margin+gy*scale+sy,pos=y*stride+1+x*3;raw[pos]=0;raw[pos+1]=0;raw[pos+2]=0}});
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);
}
async function writeEvidence(){await mkdir(ARTIFACT_DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanup.every(x=>x.passed);if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);await writeFile(EVIDENCE_PATH,`${JSON.stringify(evidence,null,2)}\n`,'utf8')}
async function createUser(){const entropy=`${Date.now()}-${uuid().slice(0,8)}`,email=`enjaz-phase10-2-${entropy}@example.com`,password=`EnjAZ!${uuid()}Aa9`;const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:'phase10_2_real_cloud_e2e'}});if(error||!data.user)throw error??new Error('Unable to create disposable user');user={id:data.user.id,email,password,client:makeUserClient()};const signed=await user.client.auth.signInWithPassword({email,password});if(signed.error||!signed.data.session?.access_token)throw signed.error??new Error('Disposable user sign-in failed');accessToken=signed.data.session.access_token;record('disposable_authenticated_user_created')}
async function waitWorkspace(){for(let i=0;i<30;i++){const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',user.id).limit(2);if(error)throw error;if(data?.length===1){workspaceId=data[0].id;record('isolated_workspace_bootstrapped');return}await sleep(250)}throw new Error('Workspace bootstrap did not materialize')}
async function edge(slug,body){const response=await fetch(`${url}/functions/v1/${slug}`,{method:'POST',headers:{apikey:publishableKey,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>null);return{ok:response.ok,status:response.status,data}}
async function rememberSession(id){const {data,error}=await admin.from('document_upload_sessions').select('storage_path').eq('id',id).maybeSingle();if(error)throw error;if(data?.storage_path)objectPaths.add(data.storage_path)}
async function uploadVersion({documentId=null,bytes,fileName}){const operationId=uuid(),prepared=await edge('enjaz-document-vault',{action:'prepare',workspaceId,operationId,documentId,title:'Phase 10.2 Azure OCR Certification',documentType:'OCR certification',fileName,mimeType:'image/png',byteSize:bytes.byteLength});assert(prepared.ok&&typeof prepared.data?.signedUrl==='string',documentId?'v2_prepare_succeeded':'v1_prepare_succeeded',`HTTP ${prepared.status}`);await rememberSession(operationId);const form=new FormData();form.append('cacheControl','3600');form.append('',new Blob([bytes],{type:'image/png'}),fileName);const sent=await fetch(prepared.data.signedUrl,{method:'PUT',headers:{'x-upsert':'false'},body:form});assert(sent.ok,documentId?'v2_signed_upload_succeeded':'v1_signed_upload_succeeded',`HTTP ${sent.status}`);const ack=await edge('enjaz-document-vault',{action:'acknowledge',operationId});assert(ack.ok&&Number.isSafeInteger(ack.data?.ack?.versionNumber),documentId?'v2_acknowledged':'v1_acknowledged');return{documentId:ack.data.ack.documentId,versionNumber:ack.data.ack.versionNumber}}
async function cleanup(){
 for(const path of objectPaths){try{const {error}=await admin.storage.from(BUCKET).remove([path]);if(error&&!/not found/i.test(error.message))throw error;evidence.cleanup.push({kind:'storage_object',passed:true})}catch(error){evidence.cleanup.push({kind:'storage_object',passed:false,error:error instanceof Error?error.message:String(error)})}}
 if(workspaceId){try{const {error}=await admin.from('workspaces').delete().eq('id',workspaceId);if(error)throw error;evidence.cleanup.push({kind:'workspace',passed:true})}catch(error){evidence.cleanup.push({kind:'workspace',passed:false,error:error instanceof Error?error.message:String(error)})}}
 if(user){try{if(accessToken)await admin.auth.admin.signOut(accessToken,'global');const {error}=await admin.auth.admin.deleteUser(user.id,false);if(error)throw error;evidence.cleanup.push({kind:'auth_user',passed:true})}catch(error){evidence.cleanup.push({kind:'auth_user',passed:false,error:error instanceof Error?error.message:String(error)})}}
}

try{
 const bucket=await admin.storage.getBucket(BUCKET);if(bucket.error)throw bucket.error;assert(bucket.data.public===false,'source_bucket_is_private');
 await createUser();await waitWorkspace();
 const png=makeProbePng();assert(png.byteLength>1000,'valid_nontrivial_png_fixture',`${png.byteLength} bytes`);
 const v1=await uploadVersion({bytes:png,fileName:'phase10-2-azure-ocr-v1.png'});assert(v1.versionNumber===1,'authoritative_v1_created');
 const requestId=uuid(),extraction=await edge('enjaz-document-intelligence',{action:'extract',workspaceId,documentId:v1.documentId,requestId,versionNumber:1});assert(extraction.ok,'azure_edge_request_succeeded',`HTTP ${extraction.status}`);assert(extraction.data?.state==='review_required','azure_completed_to_review_required',extraction.data?.state??'missing');assert(extraction.data?.provider==='azure-document-intelligence/prebuilt-layout-v4','azure_provider_confirmed');assert(extraction.data?.sourceAuthoritative===true,'edge_preserves_source_authority');
 const analysisId=extraction.data.analysisId,{data:analysis,error:analysisError}=await admin.from('document_analysis').select('document_version_id,source_version_number,verification_state,ocr_text,page_results,confidence,provider,provenance').eq('id',analysisId).single();if(analysisError)throw analysisError;assert(analysis.source_version_number===1,'analysis_bound_to_exact_v1');assert(analysis.verification_state==='review_required','database_review_required_state');assert(Array.isArray(analysis.page_results)&&analysis.page_results.length>=1,'azure_page_provenance_persisted',`${analysis.page_results?.length??0} page(s)`);assert(typeof analysis.ocr_text==='string'&&analysis.ocr_text.trim().length>0,'azure_ocr_text_persisted',`${analysis.ocr_text?.trim().length??0} chars`);assert(Number(analysis.confidence)>=0&&Number(analysis.confidence)<=1,'azure_confidence_bounded');assert(analysis.provenance?.sourceAuthority==='SOURCE_FILE_REMAINS_AUTHORITATIVE','database_preserves_source_authority');
 const reviewed=await user.client.rpc('review_document_extraction_v1',{p_workspace_id:workspaceId,p_analysis_id:analysisId,p_decision:'accept',p_corrected_fields:null,p_note:'Phase 10.2 real-cloud certification'});if(reviewed.error)throw reviewed.error;assert(reviewed.data?.state==='reviewed','human_review_transition_succeeded');
 const verified=await user.client.rpc('verify_document_extraction_v1',{p_workspace_id:workspaceId,p_analysis_id:analysisId,p_note:'Phase 10.2 real-cloud explicit verification'});if(verified.error)throw verified.error;assert(verified.data?.state==='verified'&&verified.data?.verified===true,'explicit_verification_succeeded');assert(verified.data?.promotedToSource===false,'verified_ocr_never_replaces_source');
 const v2=await uploadVersion({documentId:v1.documentId,bytes:makeProbePng('ENJAZ OCR 102 TEST 2'),fileName:'phase10-2-azure-ocr-v2.png'});assert(v2.versionNumber===2,'authoritative_v2_created');const {data:stale,error:staleError}=await admin.from('document_analysis').select('verification_state,failure_code').eq('id',analysisId).single();if(staleError)throw staleError;assert(stale.verification_state==='superseded'&&stale.failure_code==='SOURCE_VERSION_STALE','new_source_version_supersedes_verified_ocr');
 record('real_azure_ocr_certification_complete');
}catch(error){fatal=error;console.error(error instanceof Error?error.message:String(error))}finally{await cleanup();await writeEvidence()}
if(fatal||!evidence.passed)process.exitCode=1;
