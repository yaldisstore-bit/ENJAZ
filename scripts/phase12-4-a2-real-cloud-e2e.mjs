import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd';
const MARKER='phase12_4_a2_regulatory_empty_store_real_cloud';
const DIR='artifacts/phase12-4-a2-real-cloud';
const OUT=DIR+'/evidence.json';
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error('Missing '+n);return v};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const pub=env('SUPABASE_PUBLISHABLE_KEY');
const secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set();
const evidence={schema:'enjaz.phase12-4-a2-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,mode:'EMPTY_STORE_SAFETY_CERTIFICATION',checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log('PASS 12.4-A2 '+name+(detail?' — '+detail:''))};
const assert=(v,name,detail=null)=>{if(!v)throw new Error('ASSERTION_FAILED:'+name+(detail?':'+detail:''));pass(name,detail)};

async function createUser(label){
  const email='enjaz-124a2-'+label+'-'+Date.now()+'-'+uuid().slice(0,8)+'@example.com';
  const password='EnjAZ!'+uuid()+'Aa9';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
  if(error||!data.user)throw error??new Error('createUser failed');
  const x={id:data.user.id,email,password,client:make(),token:null,label,workspaceId:null};users.push(x);return x;
}
async function signIn(x){
  const {data,error}=await x.client.auth.signInWithPassword({email:x.email,password:x.password});
  if(error||!data.session?.access_token)throw error??new Error('signIn failed');
  x.token=data.session.access_token;return x;
}
async function workspace(x){
  for(let i=0;i<40;i++){
    const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',x.id).limit(2);
    if(error)throw error;
    if(data?.length===1){x.workspaceId=data[0].id;workspaces.add(data[0].id);return data[0].id}
    await sleep(250);
  }
  throw new Error('workspace bootstrap timeout');
}
async function edge(token,body,method='POST'){
  const headers={'content-type':'application/json',apikey:pub};
  if(token)headers.authorization='Bearer '+token;
  const response=await fetch(url+'/functions/v1/enjaz-regulatory-assistant',{method,headers,...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const raw=await response.text();let data=null;try{data=JSON.parse(raw)}catch{data={raw}};
  return {status:response.status,data};
}
async function count(table){
  const {count,error}=await admin.from(table).select('id',{head:true,count:'exact'});
  if(error)throw error;return count??0;
}
async function snapshot(){
  return {
    sources:await count('regulatory_sources'),
    versions:await count('regulatory_source_versions'),
    artifacts:await count('regulatory_derived_artifacts'),
  };
}

async function run(){
  const owner=await signIn(await createUser('owner'));
  const outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner),other=await workspace(outsider);
  assert(ws!==other,'fresh_workspace_isolation');

  const before=await snapshot();
  assert(before.sources===0&&before.versions===0&&before.artifacts===0,'live_m8_store_is_empty_at_a2_certification',JSON.stringify(before));

  const unauth=await edge(null,{workspaceId:ws,requestId:uuid(),operation:'answer',query:'اختبار',asOf:'2026-09-18'});
  assert(unauth.status===401,'jwt_required_by_live_edge',String(unauth.status));

  const invalid=await edge('not-a-jwt',{workspaceId:ws,requestId:uuid(),operation:'answer',query:'اختبار',asOf:'2026-09-18'});
  assert(invalid.status===401,'invalid_jwt_denied',String(invalid.status));

  const query='ENJAZ_A2_NO_AUTHORITY_'+uuid();
  const empty=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'answer',query,asOf:'2026-09-18',limit:4});
  assert(empty.status===200&&empty.data?.schema==='enjaz.regulatory.assistance.v1'&&empty.data?.ok===true,'authenticated_empty_store_answer_success');
  assert(empty.data?.result?.grounding?.authoritativeContextFound===false&&empty.data?.result?.grounding?.sourceCount===0,'empty_store_reports_zero_authority');
  assert(Array.isArray(empty.data?.result?.citations)&&empty.data.result.citations.length===0,'empty_store_zero_citations');
  assert(Array.isArray(empty.data?.result?.officialSourceText)&&empty.data.result.officialSourceText.length===0,'empty_store_zero_official_text');
  assert(Array.isArray(empty.data?.result?.structuredFacts)&&empty.data.result.structuredFacts.length===0,'empty_store_zero_structured_facts');
  assert(empty.data?.result?.interpretation?.authoritative===false&&empty.data?.result?.grounding?.providerUsed===false,'empty_store_interpretation_non_authoritative_no_provider');
  assert(String(empty.data?.result?.answer??'').includes('لن أنشئ تفسيرًا بديلًا'),'empty_store_no_fabrication_message');

  const cross=await edge(outsider.token,{workspaceId:ws,requestId:uuid(),operation:'answer',query,asOf:'2026-09-18'});
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED','cross_workspace_regulatory_assistance_denied');

  const unknown=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'answer',query,asOf:'2026-09-18',provider:'openai'});
  assert(unknown.status===400&&unknown.data?.error?.code==='REQUEST_FIELD_FORBIDDEN','authority_escape_field_denied');

  const badDate=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'answer',query,asOf:'2026-02-30'});
  assert(badDate.status===400&&badDate.data?.error?.code==='AS_OF_INVALID','invalid_asof_denied');

  const badLimit=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'answer',query,asOf:'2026-09-18',limit:9});
  assert(badLimit.status===400&&badLimit.data?.error?.code==='LIMIT_INVALID','unbounded_limit_denied');

  const method=await edge(owner.token,{},'GET');
  assert(method.status===405,'post_only_boundary');

  const otherEmpty=await edge(outsider.token,{workspaceId:other,requestId:uuid(),operation:'answer',query,asOf:'2026-09-18'});
  assert(otherEmpty.status===200&&otherEmpty.data?.result?.grounding?.sourceCount===0,'second_workspace_empty_store_safe');

  const after=await snapshot();
  assert(JSON.stringify(after)===JSON.stringify(before),'edge_causes_zero_regulatory_mutation',JSON.stringify(after));
}

async function cleanup(){
  let ok=true;
  for(const ws of [...workspaces]){
    try{
      const {error}=await admin.from('workspaces').delete().eq('id',ws);if(error)throw error;
      evidence.cleanup.push({kind:'workspace',id:ws,passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'workspace',id:ws,passed:false,error:String(e)})}
  }
  for(const u of users){
    try{
      if(u.token)await admin.auth.admin.signOut(u.token,'global').catch(()=>null);
      const {error}=await admin.auth.admin.deleteUser(u.id,false);if(error)throw error;
      evidence.cleanup.push({kind:'auth_user',id:u.id,passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'auth_user',id:u.id,passed:false,error:String(e)})}
  }
  try{
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;
    if((listed.data?.users??[]).some(u=>u.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth residue');
    for(const ws of workspaces){
      const {data,error}=await admin.from('workspaces').select('id').eq('id',ws);if(error)throw error;
      if(data?.length)throw new Error('workspace residue');
    }
    evidence.cleanup.push({kind:'zero_auth_workspace_residue',passed:true});
  }catch(e){ok=false;evidence.cleanup.push({kind:'zero_auth_workspace_residue',passed:false,error:String(e)})}
  evidence.cleanupPassed=ok;
}
async function save(){
  await mkdir(DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanupPassed;
  if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);
  await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
}
try{await run()}catch(e){fatal=e;console.error(e)}finally{await cleanup();await save()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
