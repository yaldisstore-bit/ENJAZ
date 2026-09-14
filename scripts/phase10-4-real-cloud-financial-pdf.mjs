import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';
import {buildServerFinancialReport,reportIdentity} from '../supabase/functions/enjaz-financial-report-render/finance-core.ts';

const PROJECT_REF='juzxriirhkuzviwnhkbd';
const ARTIFACT_DIR='artifacts/phase10-4-real-cloud-financial-pdf';
const EVIDENCE_PATH=`${ARTIFACT_DIR}/evidence.json`;
const PDF_PATH=`${ARTIFACT_DIR}/financial-report.pdf`;
const env=(name)=>{const value=process.env[name]?.trim();if(!value)throw new Error(`Missing required environment variable: ${name}`);return value};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const publishableKey=env('SUPABASE_PUBLISHABLE_KEY');
const secretKey=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES')throw new Error('ENJAZ_REAL_CLOUD_CONFIRM must equal YES');
if(!url.includes(PROJECT_REF))throw new Error('Refusing unexpected Supabase project');
if(secretKey.startsWith('sb_publishable_')||secretKey===publishableKey)throw new Error('SUPABASE_SECRET_KEY is not privileged');

const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const freshUserClient=()=>createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const uuid=()=>crypto.randomUUID();
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const evidence={schema:'enjaz.phase10-4-real-cloud-financial-pdf.v1',projectRef:PROJECT_REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],output:null};
let user=null,workspaceId=null,fatal=null;
const record=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const assert=(ok,name,detail=null)=>{if(!ok)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);record(name,detail)};
const transient=(status,message='')=>[429,500,502,503,504,546].includes(Number(status))||/gateway timeout|temporar|network|fetch failed|socket|econnreset|etimedout|resource/i.test(String(message));

async function createUser(){
 const email=`enjaz-phase10-4-report-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:'phase10_4_real_cloud_financial_pdf_v1'}});
 if(created.error||!created.data.user)throw created.error??new Error('Unable to create disposable user');
 const client=freshUserClient(),signed=await client.auth.signInWithPassword({email,password});
 if(signed.error||!signed.data.session?.access_token)throw signed.error??new Error('No disposable-user JWT');
 return{id:created.data.user.id,email,password,client,token:signed.data.session.access_token};
}
async function workspaceFor(userId){
 for(let i=0;i<28;i++){
  const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);
  if(error)throw error;
  if(data?.length===1)return data[0].id;
  await sleep(250);
 }
 throw new Error('Workspace bootstrap timeout');
}
async function rpc(name,args){const result=await user.client.rpc(name,args);if(result.error)throw result.error;return result.data}
async function readAll(table,columns){const {data,error}=await user.client.from(table).select(columns).eq('workspace_id',workspaceId).range(0,999);if(error)throw error;return data??[]}
async function loadSource(){
 const [companies,transactions,payments,paymentReversals,ledger,cashboxes]=await Promise.all([
  readAll('companies','id,workspace_id,legal_name,display_name'),
  readAll('transactions','id,workspace_id,company_id,type,current_fee,deleted_at,legacy_id'),
  readAll('payments','id,workspace_id,transaction_id,company_id,amount,paid_at,status,receipt_ref,cashbox_id'),
  readAll('payment_reversals','id,workspace_id,payment_id'),
  readAll('financial_ledger_entries','id,workspace_id,transaction_id,company_id,entry_type,direction,amount,category,occurred_at,status'),
  readAll('cashbox_accounts','id,workspace_id,name,opening_balance,active'),
 ]);
 return{
  companies:companies.map(r=>({...r,legal_name:String(r.legal_name??''),display_name:r.display_name==null?null:String(r.display_name)})),
  transactions:transactions.map(r=>({...r,type:String(r.type??''),current_fee:Number(r.current_fee),deleted_at:r.deleted_at==null?null:String(r.deleted_at),legacy_id:r.legacy_id==null?null:String(r.legacy_id)})),
  payments:payments.map(r=>({...r,amount:Number(r.amount),paid_at:String(r.paid_at),status:String(r.status??''),receipt_ref:String(r.receipt_ref??''),cashbox_id:r.cashbox_id==null?null:String(r.cashbox_id)})),
  paymentReversals:paymentReversals.map(r=>({id:String(r.id),workspace_id:String(r.workspace_id),payment_id:String(r.payment_id)})),
  ledger:ledger.map(r=>({...r,transaction_id:r.transaction_id==null?null:String(r.transaction_id),company_id:r.company_id==null?null:String(r.company_id),entry_type:String(r.entry_type??''),direction:String(r.direction??''),amount:Number(r.amount),category:r.category==null?null:String(r.category),occurred_at:String(r.occurred_at),status:String(r.status??'')})),
  cashboxes:cashboxes.map(r=>({...r,name:String(r.name??''),opening_balance:Number(r.opening_balance),active:r.active===true})),
 };
}
async function edge(body,attempts=4){
 let last=null;
 for(let attempt=0;attempt<attempts;attempt++){
  const response=await fetch(`${url}/functions/v1/enjaz-financial-report-render`,{method:'POST',headers:{apikey:publishableKey,Authorization:`Bearer ${user.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(response.ok||!transient(response.status,Buffer.from(bytes).toString('utf8'))||attempt===attempts-1)return{response,bytes};
  last={status:response.status,body:Buffer.from(bytes).toString('utf8')};
  await sleep(700*(2**attempt));
 }
 throw new Error(`Renderer retry exhausted: ${JSON.stringify(last)}`);
}
async function cleanup(){
 if(workspaceId){
  try{
   const {error}=await admin.from('workspaces').delete().eq('id',workspaceId);if(error)throw error;
   const tables=['workspaces','companies','transactions','payments','payment_reversals','financial_ledger_entries','cashbox_accounts'];
   for(const table of tables){const column=table==='workspaces'?'id':'workspace_id';const {data,error:probeError}=await admin.from(table).select(column).eq(column,workspaceId).limit(1);if(probeError)throw probeError;if((data?.length??0)!==0)throw new Error(`residue:${table}`)}
   evidence.cleanup.push({kind:'workspace_finance_zero_residue',id:workspaceId,passed:true,tables});
  }catch(error){evidence.cleanup.push({kind:'workspace_finance_zero_residue',id:workspaceId,passed:false,error:String(error)})}
 }
 if(user){
  try{const {error}=await admin.auth.admin.deleteUser(user.id,false);if(error)throw error;evidence.cleanup.push({kind:'auth_user',id:user.id,passed:true})}
  catch(error){evidence.cleanup.push({kind:'auth_user',id:user.id,passed:false,error:String(error)})}
 }
}
async function persist(){
 evidence.completedAt=new Date().toISOString();
 const cleanupFailed=evidence.cleanup.some(item=>item.passed!==true);
 evidence.passed=!fatal&&!cleanupFailed;
 if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);else if(cleanupFailed)evidence.failure='Zero-residue cleanup failed';
 await mkdir(ARTIFACT_DIR,{recursive:true});
 await writeFile(EVIDENCE_PATH,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
}

try{
 user=await createUser();workspaceId=await workspaceFor(user.id);record('disposable_authenticated_workspace_ready');
 const companyId=uuid(),transactionId=uuid();
 const companyInsert=await admin.from('companies').insert({id:companyId,workspace_id:workspaceId,legal_name:'شركة إنجاز العربية للتقارير المالية محدودة المسؤولية',display_name:'إنجاز العربية',capital:100000000,address:'العراق - بغداد - اليرموك',registration_number:'ENJAZ-FIN-104',legal_status:'محدودة المسؤولية'});if(companyInsert.error)throw companyInsert.error;
 const txInsert=await admin.from('transactions').insert({id:transactionId,workspace_id:workspaceId,company_id:companyId,type:'تقرير مالي رسمي',department:'مسجل الشركات',status:'active',priority:'normal',current_fee:250000});if(txInsert.error)throw txInsert.error;
 record('canonical_financial_fixture_created');
 for(let i=0;i<32;i++){
  await rpc('post_payment_v1',{p_workspace_id:workspaceId,p_transaction_id:transactionId,p_amount:'1000.00',p_method:'cash',p_paid_at:`2026-09-${String((i%20)+1).padStart(2,'0')}T${String(8+(i%10)).padStart(2,'0')}:00:00.000Z`,p_note:`Phase 10.4 cloud PDF pagination fixture ${i+1}`,p_idempotency_key:uuid(),p_cashbox_id:null,p_engagement_id:null});
 }
 record('governed_financial_rows_created','32 payments through post_payment_v1');
 const query={kind:'period',from:'2026-09-01',to:'2026-09-30',companyId:null,transactionId:null,cashboxId:null};
 const source=await loadSource(),report=buildServerFinancialReport(source,query,'2026-09-30T23:59:59.999Z');
 assert(report.movements.length>=32,'server_report_has_multipage_pressure',`${report.movements.length} movements`);
 const expectedIdentity=reportIdentity(workspaceId,report);
 const rendered=await edge({workspaceId,query,expectedFingerprint:report.fingerprint});
 const contentType=rendered.response.headers.get('content-type')??'',headerFingerprint=rendered.response.headers.get('x-enjaz-report-fingerprint')??'',headerIdentity=rendered.response.headers.get('x-enjaz-report-identity')??'',headerPages=Number(rendered.response.headers.get('x-enjaz-report-pages')??'0');
 assert(rendered.response.status===200&&contentType.toLowerCase().startsWith('application/pdf'),'deployed_financial_renderer_returned_pdf',`HTTP ${rendered.response.status}`);
 assert(Buffer.from(rendered.bytes.slice(0,5)).toString('ascii')==='%PDF-'&&rendered.bytes.byteLength>5000,'real_financial_pdf_binary_verified',`${rendered.bytes.byteLength} bytes`);
 assert(headerFingerprint===report.fingerprint,'real_financial_pdf_fingerprint_verified',headerFingerprint);
 assert(headerIdentity===expectedIdentity,'real_financial_pdf_identity_verified');
 assert(Number.isSafeInteger(headerPages)&&headerPages>=2,'real_arabic_financial_pdf_multipage_verified',`${headerPages} pages`);
 const latin=Buffer.from(rendered.bytes).toString('latin1'),binaryPages=(latin.match(/\/Type\s*\/Page\b/g)||[]).length,imageObjects=(latin.match(/\/Subtype\s*\/Image\b/g)||[]).length;
 assert(binaryPages===headerPages,'real_pdf_page_tree_matches_header',`${binaryPages} pages`);
 assert(imageObjects>=2,'real_pdf_qr_barcode_image_objects_embedded',`${imageObjects} image objects`);
 await mkdir(ARTIFACT_DIR,{recursive:true});await writeFile(PDF_PATH,rendered.bytes);
 const stale=await edge({workspaceId,query,expectedFingerprint:'ENJAZ-FR-0000000000000000'},1);assert(stale.response.status===409,'stale_fingerprint_rejected','HTTP 409');
 const foreign=await edge({workspaceId:uuid(),query,expectedFingerprint:report.fingerprint},1);assert(foreign.response.status===403,'foreign_workspace_rejected','HTTP 403');
 evidence.output={pdfPath:PDF_PATH,byteSize:rendered.bytes.byteLength,pages:headerPages,fingerprint:report.fingerprint,identity:headerIdentity,binaryPageCount:binaryPages,imageObjectCount:imageObjects,movements:report.movements.length};
}catch(error){fatal=error;console.error(error)}finally{await cleanup();await persist()}
if(!evidence.passed)process.exit(1);
console.log(`PASS phase10_4_real_cloud_financial_pdf_certificate — ${evidence.output.pages} pages / ${evidence.output.byteSize} bytes / zero residue`);
