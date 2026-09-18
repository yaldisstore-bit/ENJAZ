import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase12_3_agentic_a2_real_cloud',DIR='artifacts/phase12-3-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set(),companyIds=[];
const evidence={schema:'enjaz.phase12-3-a2-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.3-A2 ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');

async function createUser(label){
 const email=`enjaz-123-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
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
async function edge(token,body){
 const headers={'content-type':'application/json',apikey:pub};
 if(token)headers.authorization=`Bearer ${token}`;
 const response=await fetch(`${url}/functions/v1/enjaz-copilot-agent`,{method:'POST',headers,body:JSON.stringify(body)});
 const raw=await response.text();let data=null;try{data=JSON.parse(raw)}catch{data={raw}};
 return {status:response.status,data};
}
async function createCompany(ws,name){
 const id=uuid();
 const {error}=await admin.from('companies').insert({id,workspace_id:ws,legal_name:name,display_name:name,status:'active'});
 if(error)throw error;companyIds.push(id);return id;
}
async function counts(ws,tables){
 return Object.fromEntries(await Promise.all(tables.map(async table=>{
   const {count,error}=await admin.from(table).select('id',{head:true,count:'exact'}).eq('workspace_id',ws);
   if(error)throw error;return [table,count??0];
 })));
}

async function run(){
 const owner=await signIn(await createUser('owner')),outsider=await signIn(await createUser('outsider'));
 const ws=await workspace(owner),other=await workspace(outsider);
 assert(ws!==other,'fresh_workspace_isolation');

 const stamp=Date.now().toString(36).toUpperCase(),alpha=`P123ALPHA${stamp}`,foreign=`P123FOREIGN${stamp}`;
 const alphaId=await createCompany(ws,alpha),foreignId=await createCompany(other,foreign);
 assert(alphaId!==foreignId,'fixture_identity_isolation');

 const watched=['companies','transactions','payments','documents','renewals','communications','calendar_events','intake_submissions'];
 const beforeOwner=await counts(ws,watched),beforeOther=await counts(other,watched);

 const browserBoundary=await owner.client.rpc('copilot_begin_request_v3',{
   p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_operation:'plan',p_payload_hash:'a'.repeat(64),p_limit:20
 });
 assert(Boolean(browserBoundary.error),'browser_service_boundary_denied',errText(browserBoundary.error));

 const browserProposal=await owner.client.rpc('copilot_register_agent_proposal_v1',{
   p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'b'.repeat(64),p_expires_at:new Date(Date.now()+600000).toISOString()
 });
 assert(Boolean(browserProposal.error),'browser_proposal_registration_denied');

 const browserPrivate=await owner.client.schema('private').from('copilot_agent_proposals').select('id').limit(1);
 assert(Boolean(browserPrivate.error),'browser_private_proposal_read_denied');
 const servicePrivate=await admin.schema('private').from('copilot_agent_proposals').select('id').limit(1);
 assert(Boolean(servicePrivate.error),'service_direct_private_proposal_read_denied');

 const anonymous=await edge(null,{workspaceId:ws,requestId:uuid(),operation:'plan',goal:'راجع الشركة',contextQuery:alpha});
 assert(anonymous.status===401,'edge_requires_authentication',String(anonymous.status));

 const raw=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'plan',goal:'راجع الشركة',contextQuery:alpha,prompt:'forbidden'});
 assert(raw.status===400&&raw.data?.error?.code==='REQUEST_FIELD_FORBIDDEN','raw_prompt_field_rejected',`${raw.status}:${raw.data?.error?.code}`);

 const planId=uuid();
 const plan=await edge(owner.token,{workspaceId:ws,requestId:planId,operation:'plan',goal:'راجع الشركة واقترح الخطوات الآمنة',contextQuery:alpha});
 assert(plan.status===200&&plan.data?.schema==='enjaz.copilot.agent.plan.v1'&&plan.data?.ok===true,'plan_structured_success');
 assert(plan.data?.result?.grounding?.authoritativeContextFound===true&&plan.data?.result?.grounding?.providerUsed===false,'plan_grounded_provider_free');
 assert(plan.data?.result?.citations?.some(c=>c?.domain==='companies'&&c?.entityId===alphaId),'plan_exact_authoritative_citation');
 assert(plan.data?.result?.proposal?.executionAllowed===false&&plan.data?.approval===null,'plan_execution_locked');

 const hidden=await edge(outsider.token,{workspaceId:other,requestId:uuid(),operation:'plan',goal:'ابحث عن الشركة',contextQuery:alpha});
 assert(hidden.status===200&&hidden.data?.result?.grounding?.authoritativeContextFound===false,'cross_workspace_context_omitted');

 const forbidden=await edge(outsider.token,{workspaceId:ws,requestId:uuid(),operation:'plan',goal:'راجع الشركة',contextQuery:alpha});
 assert(forbidden.status===403&&forbidden.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_edge_denied');

 const proposalRequestId=uuid();
 const proposalBody={workspaceId:ws,requestId:proposalRequestId,operation:'propose',goal:'حضّر اقتراح متابعة لهذه الشركة',contextQuery:alpha};
 const proposed=await edge(owner.token,proposalBody);
 assert(proposed.status===200&&proposed.data?.ok===true,'proposal_structured_success');
 const approval=proposed.data?.approval;
 assert(approval?.status==='pending'&&typeof approval?.proposalId==='string'&&/^[0-9a-f]{64}$/.test(String(approval?.proposalHash)),'proposal_private_evidence_registered');
 assert(approval?.actorBound===true&&approval?.workspaceBound===true&&approval?.digestBound===true,'proposal_binding_flags');
 assert(approval?.executionAllowed===false&&approval?.businessMutationAllowed===false&&approval?.singleUseRequired===true,'proposal_execution_stays_locked');

 const proposalReplay=await edge(owner.token,proposalBody);
 assert(proposalReplay.status===200&&proposalReplay.data?.approval?.proposalId===approval.proposalId&&proposalReplay.data?.approval?.replayed===true,'proposal_exact_replay_idempotent');

 const proposalChanged=await edge(owner.token,{...proposalBody,goal:'غيّر الاقتراح بنفس request id'});
 assert(proposalChanged.status===409&&proposalChanged.data?.error?.code==='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT','proposal_changed_replay_conflict');

 const expiryRequestId=uuid(),expiryHash=hash(`expiry:${expiryRequestId}`),expiryAt=Date.now()+45000;
 const expiryReg=await admin.rpc('copilot_register_agent_proposal_v1',{
   p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:expiryRequestId,p_proposal_hash:expiryHash,p_expires_at:new Date(expiryAt).toISOString()
 });
 if(expiryReg.error)throw expiryReg.error;
 assert(typeof expiryReg.data?.proposalId==='string','short_lived_proposal_registered');

 const tampered=await edge(owner.token,{
   workspaceId:ws,requestId:uuid(),proposalId:approval.proposalId,proposalHash:'0'.repeat(64),decision:'approve',decisionKey:uuid()
 });
 assert(tampered.status===409&&tampered.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_digest_denied');

 const outsiderApproval=await edge(outsider.token,{
   workspaceId:ws,requestId:uuid(),proposalId:approval.proposalId,proposalHash:approval.proposalHash,decision:'approve',decisionKey:uuid()
 });
 assert(outsiderApproval.status===403&&outsiderApproval.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','foreign_actor_workspace_denied');

 const decisionRequestId=uuid(),decisionKey=uuid();
 const approved=await edge(owner.token,{
   workspaceId:ws,requestId:decisionRequestId,proposalId:approval.proposalId,proposalHash:approval.proposalHash,decision:'approve',decisionKey
 });
 assert(approved.status===200&&approved.data?.result?.status==='approved','explicit_approval_recorded');
 assert(approved.data?.result?.executionAllowed===false&&approved.data?.result?.businessMutationAllowed===false,'approved_still_not_executable');

 const approvedReplay=await edge(owner.token,{
   workspaceId:ws,requestId:decisionRequestId,proposalId:approval.proposalId,proposalHash:approval.proposalHash,decision:'approve',decisionKey
 });
 assert(approvedReplay.status===200&&approvedReplay.data?.result?.replayed===true,'approval_exact_replay_idempotent');

 const changedDecision=await edge(owner.token,{
   workspaceId:ws,requestId:decisionRequestId,proposalId:approval.proposalId,proposalHash:approval.proposalHash,decision:'reject',decisionKey
 });
 assert(changedDecision.status===409&&changedDecision.data?.error?.code==='ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT','approval_changed_replay_conflict');

 const proposal2=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'propose',goal:'حضّر اقتراح متابعة ثانٍ',contextQuery:alpha});
 assert(proposal2.status===200&&proposal2.data?.approval?.status==='pending','second_proposal_registered');
 const reusedKey=await edge(owner.token,{
   workspaceId:ws,requestId:uuid(),proposalId:proposal2.data.approval.proposalId,proposalHash:proposal2.data.approval.proposalHash,decision:'approve',decisionKey
 });
 assert(reusedKey.status===409&&reusedKey.data?.error?.code==='ENJAZ_COPILOT_APPROVAL_REPLAY_CONFLICT','decision_key_cross_proposal_replay_denied');

 const rejected=await edge(owner.token,{
   workspaceId:ws,requestId:uuid(),proposalId:proposal2.data.approval.proposalId,proposalHash:proposal2.data.approval.proposalHash,decision:'reject',decisionKey:uuid()
 });
 assert(rejected.status===200&&rejected.data?.result?.status==='rejected','explicit_rejection_recorded');
 assert(rejected.data?.result?.executionAllowed===false,'rejected_not_executable');

 await sleep(Math.max(0,expiryAt-Date.now()+1500));
 const expired=await edge(owner.token,{
   workspaceId:ws,requestId:uuid(),proposalId:expiryReg.data.proposalId,proposalHash:expiryHash,decision:'approve',decisionKey:uuid()
 });
 assert(expired.status===410&&expired.data?.error?.code==='ENJAZ_COPILOT_APPROVAL_EXPIRED','expired_approval_denied');

 const afterOwner=await counts(ws,watched),afterOther=await counts(other,watched);
 for(const table of watched){
   assert(afterOwner[table]===beforeOwner[table],`no_owner_business_mutation_${table}`,String(beforeOwner[table]));
   assert(afterOther[table]===beforeOther[table],`no_outsider_business_mutation_${table}`,String(beforeOther[table]));
 }
 pass('no_agent_business_mutation');
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
   if(companyIds.length){
     const {data,error}=await admin.from('companies').select('id').in('id',companyIds);if(error)throw error;
     if(data?.length)throw new Error('company residue');
   }
   const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;
   if((listed.data?.users??[]).some(u=>u.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth residue');
   evidence.cleanup.push({kind:'zero_public_auth_residue',passed:true});
 }catch(e){ok=false;evidence.cleanup.push({kind:'zero_public_auth_residue',passed:false,error:String(e)})}
 evidence.cleanupPassed=ok;
}
async function save(){
 await mkdir(DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanupPassed;
 if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);
 await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
}

try{await run()}catch(e){fatal=e;console.error(e)}finally{await cleanup();await save()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
