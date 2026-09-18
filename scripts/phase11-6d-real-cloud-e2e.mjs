import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase11_6d_real_cloud_e2e',DIR='artifacts/phase11-6d-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const anon=make(),users=[],workspaces=new Set();
const evidence={schema:'enjaz.phase11-6d-real-cloud-e2e.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),hex64=()=>crypto.randomBytes(32).toString('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errHas=(e,m)=>Boolean(e&&String(e.message??e.details??e.hint??e.code??'').includes(m));

async function createUser(label){
 const email=`enjaz-116d-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
 const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
 if(error||!data.user)throw error??new Error('createUser failed');
 const x={id:data.user.id,email,password,client:make(),token:null};users.push(x);return x;
}
async function signIn(x){const{data,error}=await x.client.auth.signInWithPassword({email:x.email,password:x.password});if(error||!data.session?.access_token)throw error??new Error('signIn failed');x.token=data.session.access_token;return x}
async function workspace(userId){
 for(let i=0;i<32;i++){const{data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);if(error)throw error;if(data?.length===1){workspaces.add(data[0].id);return data[0].id}await sleep(250)}
 throw new Error('workspace bootstrap timeout');
}
async function insert(table,row){const{error}=await admin.from(table).insert(row);if(error)throw new Error(`${table}: ${error.message}`)}
async function cleanup(){
 let ok=true;
 for(const ws of workspaces){try{const{error}=await admin.from('workspaces').delete().eq('id',ws);if(error)throw error;evidence.cleanup.push({kind:'workspace',passed:true})}catch(e){ok=false;evidence.cleanup.push({kind:'workspace',passed:false,error:String(e)})}}
 for(const u of users){try{if(u.token)await admin.auth.admin.signOut(u.token,'global').catch(()=>null);const{error}=await admin.auth.admin.deleteUser(u.id,false);if(error)throw error;evidence.cleanup.push({kind:'auth_user',passed:true})}catch(e){ok=false;evidence.cleanup.push({kind:'auth_user',passed:false,error:String(e)})}}
 try{
  const ids=[...workspaces];if(ids.length){const{data,error}=await admin.from('workspaces').select('id').in('id',ids);if(error)throw error;if(data?.length)throw new Error('workspace residue')}
  const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;
  if((listed.data?.users??[]).some(u=>u.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth residue');
  evidence.cleanup.push({kind:'zero_residue',passed:true});
 }catch(e){ok=false;evidence.cleanup.push({kind:'zero_residue',passed:false,error:String(e)})}
 evidence.cleanupPassed=ok;
}
async function saveEvidence(){await mkdir(DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanupPassed;if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8')}

try{
 const staff=await signIn(await createUser('staff')),outsider=await signIn(await createUser('outsider'));
 const ws=await workspace(staff.id),otherWs=await workspace(outsider.id);
 assert(ws!==otherWs,'fresh_workspace_isolation');

 const form=uuid(),field=uuid(),link=uuid(),submission=uuid();
 await insert('intake_forms',{id:form,workspace_id:ws,name:'__ENJAZ_116D_FORM__',public_title:'استكمال بيانات',public_description:'temporary D certificate',active:true,created_by:staff.id});
 await insert('intake_form_fields',{id:field,workspace_id:ws,form_id:form,field_key:'phone',label:'الهاتف',field_type:'phone',required:true,position:1,config:{}});
 await insert('intake_links',{id:link,workspace_id:ws,form_id:form,lead_id:null,token_hash:hex64(),expires_at:new Date(Date.now()+86400000).toISOString(),issued_by:staff.id});
 await insert('intake_submissions',{id:submission,workspace_id:ws,form_id:form,link_id:link,status:'submitted',answers:{phone:'07700000000'},submitted_at:new Date().toISOString()});
 pass('fresh_workspace_fixture_created');

 const issue=await staff.client.rpc('issue_intake_followup_v1',{
  p_workspace_id:ws,p_submission_id:submission,p_expected_submission_version:1,p_mode:'secure_link',p_request_kind:'information',
  p_requested_fields:['phone'],p_title:'استكمال رقم الهاتف',p_instructions:'يرجى تحديث رقم الهاتف',p_expires_in_hours:24,
  p_idempotency_key:uuid(),p_portal_principal_id:null,p_portal_transaction_id:null,p_portal_request_id:null
 });
 if(issue.error)throw issue.error;
 assert(issue.data?.status==='open'&&issue.data?.submissionVersion===2,'durable_followup_write_committed');

 const projection=await staff.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});
 if(projection.error)throw projection.error;
 const item=(projection.data?.items??[]).find(x=>x.id===issue.data.followupId);
 assert(item?.kindLabel==='استكمال بيانات'&&item?.attentionLabel==='بانتظار الطرف الخارجي'&&item?.ownerPath===null,'separate_transaction_projection_roundtrip');
 assert(item?.stale===false,'fresh_projection_not_stale');

 const anonRead=await anon.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});
 assert(Boolean(anonRead.error),'anon_rpc_denied');
 const outsiderRead=await outsider.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});
 assert(errHas(outsiderRead.error,'ENJAZ_CRM_WORKSPACE_FORBIDDEN'),'cross_workspace_projection_denied');

 const bump=await admin.from('intake_submissions').update({version:3}).eq('workspace_id',ws).eq('id',submission);if(bump.error)throw bump.error;
 const stale=await staff.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});if(stale.error)throw stale.error;
 assert(stale.data?.items?.find(x=>x.id===issue.data.followupId)?.stale===true,'stale_source_exposed_not_hidden');

 const restore=await admin.from('intake_submissions').update({version:2}).eq('workspace_id',ws).eq('id',submission);if(restore.error)throw restore.error;
 const recovered=await staff.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});if(recovered.error)throw recovered.error;
 assert(recovered.data?.items?.find(x=>x.id===issue.data.followupId)?.stale===false,'stale_recovery_visible');

 const revoke=await staff.client.rpc('revoke_intake_followup_v1',{p_workspace_id:ws,p_followup_id:issue.data.followupId,p_expected_version:1,p_reason:'11.6-D Real Cloud certificate'});
 if(revoke.error)throw revoke.error;
 const terminal=await staff.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:true,p_limit:200});if(terminal.error)throw terminal.error;
 const revoked=terminal.data?.items?.find(x=>x.id===issue.data.followupId);
 assert(revoked?.attentionLabel==='ملغى','revoked_terminal_truth_visible');

 const hidden=await staff.client.rpc('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:'all',p_include_terminal:false,p_limit:200});if(hidden.error)throw hidden.error;
 assert(!(hidden.data?.items??[]).some(x=>x.id===issue.data.followupId),'terminal_hidden_when_not_requested');

 pass('permission_conflict_recovery_matrix');
}catch(e){fatal=e;console.error(e)}finally{await cleanup();await saveEvidence()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
