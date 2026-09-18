import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase12_1_copilot_foundation_e2e',DIR='artifacts/phase12-1-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set();
const evidence={schema:'enjaz.phase12-1-real-cloud-e2e.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.1 ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');
const errHas=(e,m)=>errText(e).includes(m);
const payloadHash=(ws,operation)=>crypto.createHash('sha256').update(JSON.stringify({workspaceId:ws,operation})).digest('hex');

async function createUser(label){
 const email=`enjaz-121-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
 if(error||!data.user)throw error??new Error('createUser failed');
 const x={id:data.user.id,email,password,client:make(),token:null,label,workspaceId:null};users.push(x);return x;
}
async function signIn(x){const{data,error}=await x.client.auth.signInWithPassword({email:x.email,password:x.password});if(error||!data.session?.access_token)throw error??new Error('signIn failed');x.token=data.session.access_token;return x}
async function workspace(x){
 for(let i=0;i<40;i++){const{data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',x.id).limit(2);if(error)throw error;if(data?.length===1){x.workspaceId=data[0].id;workspaces.add(data[0].id);return data[0].id}await sleep(250)}
 throw new Error('workspace bootstrap timeout');
}
async function edge(token,body){
 const headers={'content-type':'application/json',apikey:pub};
 if(token)headers.authorization=`Bearer ${token}`;
 const response=await fetch(`${url}/functions/v1/enjaz-copilot-foundation`,{method:'POST',headers,body:JSON.stringify(body)});
 const raw=await response.text();let data=null;try{data=JSON.parse(raw)}catch{data={raw}};
 return{status:response.status,data};
}
async function begin(ws,actor,requestId,operation,limit=20){
 return admin.rpc('copilot_begin_request_v1',{p_workspace_id:ws,p_actor_user_id:actor,p_request_id:requestId,p_operation:operation,p_payload_hash:payloadHash(ws,operation),p_limit:limit});
}
async function finish(ws,actor,requestId,traceId,status,errorCode=null){
 return admin.rpc('copilot_finish_request_v1',{p_workspace_id:ws,p_actor_user_id:actor,p_request_id:requestId,p_trace_id:traceId,p_status:status,p_error_code:errorCode,p_provider_name:null,p_model_name:null,p_latency_ms:1,p_metadata:{resultKind:'real_cloud_probe'}});
}
async function businessCount(table,ws){const{count,error}=await admin.from(table).select('id',{head:true,count:'exact'}).eq('workspace_id',ws);if(error)throw error;return count??0}

async function run(){
 const owner=await signIn(await createUser('owner')),outsider=await signIn(await createUser('outsider')),rate=await signIn(await createUser('rate'));
 const ws=await workspace(owner),other=await workspace(outsider),rateWs=await workspace(rate);
 assert(ws!==other&&ws!==rateWs&&other!==rateWs,'fresh_workspace_isolation');

 const direct=await owner.client.rpc('copilot_begin_request_v1',{p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_operation:'capabilities',p_payload_hash:payloadHash(ws,'capabilities'),p_limit:20});
 assert(Boolean(direct.error),'browser_service_rpc_denied',errText(direct.error));

 const traceRead=await owner.client.schema('private').from('copilot_request_traces').select('id').limit(1);
 assert(Boolean(traceRead.error),'browser_private_trace_read_denied');

 const anonymous=await edge(null,{workspaceId:ws,requestId:uuid(),operation:'capabilities'});
 assert(anonymous.status===401,'edge_requires_authentication',String(anonymous.status));

 const rawId=uuid();
 const raw=await edge(owner.token,{workspaceId:ws,requestId:rawId,operation:'capabilities',prompt:'must-not-persist'});
 assert(raw.status===400&&raw.data?.error?.code==='REQUEST_FIELD_FORBIDDEN','raw_prompt_field_rejected',`${raw.status}:${String(raw.data?.error?.code)}`);

 const capId=uuid(),cap=await edge(owner.token,{workspaceId:ws,requestId:capId,operation:'capabilities'});
 assert(cap.status===200&&cap.data?.schema==='enjaz.copilot.foundation.v1'&&cap.data?.ok===true,'capabilities_structured_success');
 assert(cap.data?.result?.providerConfigured===false&&cap.data?.result?.toolExecution===false&&cap.data?.result?.businessMutation===false,'capabilities_no_provider_or_tool_authority');
 const traceId=cap.data?.traceId;
 assert(typeof traceId==='string','capabilities_trace_id_present');

 const capReplay=await edge(owner.token,{workspaceId:ws,requestId:capId,operation:'capabilities'});
 assert(capReplay.status===200&&capReplay.data?.traceId===traceId,'exact_replay_same_trace');

 const changed=await edge(owner.token,{workspaceId:ws,requestId:capId,operation:'provider_probe'});
 assert(changed.status===409&&changed.data?.error?.code==='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT','changed_replay_conflict');

 const finishConflict=await finish(ws,owner.id,capId,traceId,'failed','SHOULD_CONFLICT');
 assert(errHas(finishConflict.error,'ENJAZ_COPILOT_TRACE_COMPLETION_CONFLICT'),'trace_completion_conflict_fails_closed',errText(finishConflict.error));

 const foreign=await edge(outsider.token,{workspaceId:ws,requestId:uuid(),operation:'capabilities'});
 assert(foreign.status===403&&foreign.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_denied');

 const providerId=uuid(),provider=await edge(owner.token,{workspaceId:ws,requestId:providerId,operation:'provider_probe'});
 assert(provider.status===503&&provider.data?.error?.code==='PROVIDER_NOT_CONFIGURED'&&provider.data?.ok===false,'provider_unconfigured_structured_failure');
 const providerReplay=await begin(ws,owner.id,providerId,'provider_probe',20);if(providerReplay.error)throw providerReplay.error;
 assert(providerReplay.data?.replayed===true&&providerReplay.data?.status==='provider_unavailable'&&providerReplay.data?.traceId===provider.data?.traceId,'provider_failure_trace_reconciled');

 const rateId1=uuid(),r1=await begin(rateWs,rate.id,rateId1,'capabilities',3);if(r1.error)throw r1.error;
 assert(r1.data?.allowed===true&&r1.data?.rateCount===1,'rate_request_one_allowed');
 const r1Replay=await begin(rateWs,rate.id,rateId1,'capabilities',3);if(r1Replay.error)throw r1Replay.error;
 assert(r1Replay.data?.replayed===true&&r1Replay.data?.rateCount===null,'rate_exact_replay_no_second_quota');
 for(const [n,id] of [[2,uuid()],[3,uuid()]]){
   const x=await begin(rateWs,rate.id,id,'capabilities',3);if(x.error)throw x.error;
   assert(x.data?.allowed===true&&x.data?.rateCount===n,`rate_request_${n}_allowed`);
 }
 const denied=await begin(rateWs,rate.id,uuid(),'capabilities',3);if(denied.error)throw denied.error;
 assert(denied.data?.allowed===false&&denied.data?.rateCount===4,'rate_limit_denies_fourth_new_request');

 const wait=60000-(Date.now()%60000)+1200;await sleep(wait);
 const recovered=await begin(rateWs,rate.id,uuid(),'capabilities',3);if(recovered.error)throw recovered.error;
 assert(recovered.data?.allowed===true&&recovered.data?.rateCount===1,'rate_limit_next_window_recovery');

 for(const target of [ws,other,rateWs]){
   for(const table of ['companies','transactions','payments','documents','renewals','communications','calendar_events','intake_submissions']){
     assert(await businessCount(table,target)===0,`no_business_write_${table}_${target.slice(0,8)}`);
   }
 }
 pass('no_business_authority_mutation');

 const serviceTrace=await admin.schema('private').from('copilot_request_traces').select('id').limit(1);
 assert(Boolean(serviceTrace.error),'service_role_direct_private_trace_read_denied');

 if(process.env.ENJAZ_PHASE12_2_EXTENSION==='YES'){
   const {verifyPhase122Context}=await import('./phase12-2-real-cloud-extension.mjs');
   const extension=await verifyPhase122Context({
     admin,
     owner,
     outsider,
     workspaceId:ws,
     outsiderWorkspaceId:other,
     edgeUrl:`${url}/functions/v1/enjaz-copilot-context`,
     publishableKey:pub,
   });
   assert(extension?.passed===true&&extension?.cleanupPassed===true,'phase12_2_context_extension',`${extension?.checks??0} checks`);
 }
}

async function cleanup(){
 let ok=true;
 for(const ws of [...workspaces]){
  try{const{error}=await admin.from('workspaces').delete().eq('id',ws);if(error)throw error;evidence.cleanup.push({kind:'workspace',id:ws,passed:true})}
  catch(e){ok=false;evidence.cleanup.push({kind:'workspace',id:ws,passed:false,error:String(e)})}
 }
 for(const u of users){
  try{if(u.token)await admin.auth.admin.signOut(u.token,'global').catch(()=>null);const{error}=await admin.auth.admin.deleteUser(u.id,false);if(error)throw error;evidence.cleanup.push({kind:'auth_user',id:u.id,passed:true})}
  catch(e){ok=false;evidence.cleanup.push({kind:'auth_user',id:u.id,passed:false,error:String(e)})}
 }
 try{
  const ids=[...workspaces];if(ids.length){const{data,error}=await admin.from('workspaces').select('id').in('id',ids);if(error)throw error;if(data?.length)throw new Error('workspace residue')}
  const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;
  if((listed.data?.users??[]).some(u=>u.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth residue');
  evidence.cleanup.push({kind:'zero_public_auth_residue',passed:true});
 }catch(e){ok=false;evidence.cleanup.push({kind:'zero_public_auth_residue',passed:false,error:String(e)})}
 evidence.cleanupPassed=ok;
}
async function save(){await mkdir(DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanupPassed;if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8')}

try{await run()}catch(e){fatal=e;console.error(e)}finally{await cleanup();await save()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
