import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase12_3_a3b_followup_create_real_cloud',DIR='artifacts/phase12-3-a3b-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set(),fixtures={companies:[],transactions:[],followups:[]};
const evidence={schema:'enjaz.phase12-3-a3b-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.3-A3B ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');

async function createUser(label){
  const email=`enjaz-123a3b-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
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
async function transactionFixture(ws,label){
  const companyId=uuid(),transactionId=uuid();
  let x=await admin.from('companies').insert({
    id:companyId,workspace_id:ws,legal_name:`A3B ${label}`,display_name:`A3B ${label}`,status:'active'
  });if(x.error)throw x.error;fixtures.companies.push(companyId);
  x=await admin.from('transactions').insert({
    id:transactionId,workspace_id:ws,company_id:companyId,type:'A3B Agent Probe',department:'Copilot',
    status:'active',priority:'normal',current_fee:250000
  });if(x.error)throw x.error;fixtures.transactions.push(transactionId);
  return {companyId,transactionId};
}
async function followup(id){
  const {data,error}=await admin.from('transaction_followups').select('id,workspace_id,transaction_id,title,due_at,status,snoozed_until').eq('id',id).maybeSingle();
  if(error)throw error;return data;
}
async function followupCount(ws){
  const {count,error}=await admin.from('transaction_followups').select('id',{head:true,count:'exact'}).eq('workspace_id',ws);
  if(error)throw error;return count??0;
}
async function approve(owner,ws,prepared){
  const requestId=uuid(),decisionKey=uuid();
  const response=await edge(owner.token,{
    workspaceId:ws,requestId,proposalId:prepared.proposalId,proposalHash:prepared.proposalHash,
    decision:'approve',decisionKey
  });
  assert(response.status===200&&response.data?.result?.status==='approved','explicit_create_approval_recorded');
  return {requestId,decisionKey,response};
}

async function run(){
  const owner=await signIn(await createUser('owner')),outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner),other=await workspace(outsider);
  assert(ws!==other,'fresh_workspace_isolation');
  const primary=await transactionFixture(ws,'PRIMARY'),rollback=await transactionFixture(ws,'ROLLBACK');
  await transactionFixture(other,'FOREIGN');
  const ownerBefore=await followupCount(ws),otherBefore=await followupCount(other);

  const invalidTransaction=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_create',transactionId:'bad',
    followupId:uuid(),title:'متابعة رسمية',dueAt:new Date(Date.now()+3600000).toISOString()
  });
  assert(invalidTransaction.status===400&&invalidTransaction.data?.error?.code==='TRANSACTION_ID_INVALID','transaction_validation_is_400');

  const invalidTitle=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_create',transactionId:primary.transactionId,
    followupId:uuid(),title:'',dueAt:new Date(Date.now()+3600000).toISOString()
  });
  assert(invalidTitle.status===400&&invalidTitle.data?.error?.code==='ACTION_TITLE_INVALID','title_validation_is_400');

  const directRegistration=await owner.client.rpc('copilot_register_followup_create_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'a'.repeat(64),
    p_transaction_id:primary.transactionId,p_followup_id:uuid(),p_title:'ممنوع مباشر',
    p_due_at:new Date(Date.now()+3600000).toISOString(),p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(directRegistration.error),'browser_create_registration_denied');

  const bogusFollowup=uuid();
  const bogusDue=new Date(Date.now()+2*60*60*1000).toISOString();
  const mismatch=await admin.rpc('copilot_register_followup_create_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'0'.repeat(64),
    p_transaction_id:primary.transactionId,p_followup_id:bogusFollowup,p_title:'تدقيق الهاش',
    p_due_at:bogusDue,p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(mismatch.error)&&errText(mismatch.error).includes('ENJAZ_COPILOT_ACTION_HASH_CONFLICT'),'database_recomputes_nested_create_hash');

  const followupId=uuid(),dueAt=new Date(Date.now()+2*60*60*1000).toISOString(),title='متابعة | كتاب رسمي';
  fixtures.followups.push(followupId);
  const prepareId=uuid();
  const prepared=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_followup_create',
    transactionId:primary.transactionId,followupId,title,dueAt
  });
  assert(prepared.status===200&&prepared.data?.schema==='enjaz.copilot.agent.action.v1','create_prepare_structured_success');
  const proposal=prepared.data?.result;
  assert(proposal?.status==='pending_approval'&&proposal?.action?.kind==='followup.create','create_prepare_is_approval_gated');
  assert(proposal?.action?.transactionId===primary.transactionId&&proposal?.action?.followupId===followupId,'create_exact_identity_bound');
  assert(proposal?.action?.title===title&&proposal?.action?.dueAt===dueAt,'create_exact_content_time_bound');
  assert(proposal?.executionAllowed===false&&proposal?.genericWriteToolAllowed===false,'create_prepare_no_execution_authority');

  const prepareReplay=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_followup_create',
    transactionId:primary.transactionId,followupId,title,dueAt
  });
  assert(prepareReplay.status===200&&prepareReplay.data?.result?.proposalId===proposal.proposalId&&prepareReplay.data?.result?.replayed===true,'create_prepare_exact_replay_idempotent');

  const beforeApproval=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_create',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()
  });
  assert(beforeApproval.status===409&&beforeApproval.data?.error?.code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','create_execution_before_approval_denied');
  assert((await followup(followupId))===null,'before_create_approval_zero_mutation');

  const cross=await edge(outsider.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_create',
    transactionId:primary.transactionId,followupId:uuid(),title:'محاولة عابرة',dueAt
  });
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_create_prepare_denied');

  const tampered=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_create',
    proposalId:proposal.proposalId,proposalHash:'f'.repeat(64),executionKey:uuid()
  });
  assert(tampered.status===409&&tampered.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_create_hash_denied');

  const injection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_create',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid(),
    title:'عنوان مزور'
  });
  assert(injection.status===400&&injection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','create_execution_business_field_injection_denied');

  await approve(owner,ws,proposal);
  const executionKey=uuid(),executionRequestId=uuid();
  const executed=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_followup_create',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(executed.status===200&&executed.data?.result?.actionKind==='followup.create','approved_create_executes');
  assert(executed.data?.result?.targetId===followupId&&executed.data?.result?.transactionId===primary.transactionId,'create_executes_exact_identity');
  assert(executed.data?.result?.title===title&&executed.data?.result?.dueAt===dueAt,'create_executes_exact_content_time');
  assert(executed.data?.result?.domainAuthority==='create_transaction_followup_v1','create_delegates_existing_domain_authority');
  const created=await followup(followupId);
  assert(created?.status==='open'&&created.transaction_id===primary.transactionId,'canonical_followup_created');
  assert(created?.title===title&&new Date(created.due_at).toISOString()===dueAt,'canonical_followup_exact_fields');

  const replay=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_followup_create',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(replay.status===200&&replay.data?.result?.replayed===true,'create_execution_exact_replay_idempotent');
  assert((await followupCount(ws))===ownerBefore+1,'create_replay_no_duplicate_followup');

  const rollbackFollowupId=uuid(),rollbackDue=new Date(Date.now()+3*60*60*1000).toISOString();
  fixtures.followups.push(rollbackFollowupId);
  const rollbackPrepared=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_create',
    transactionId:rollback.transactionId,followupId:rollbackFollowupId,title:'متابعة rollback',dueAt:rollbackDue
  });
  assert(rollbackPrepared.status===200&&rollbackPrepared.data?.result?.proposalId,'create_rollback_proposal_prepared');
  const rollbackApproval=await approve(owner,ws,rollbackPrepared.data.result);

  const softDelete=await admin.from('transactions').update({
    deleted_at:new Date().toISOString(),deleted_by:owner.id,deletion_reason:'A3B rollback probe'
  }).eq('workspace_id',ws).eq('id',rollback.transactionId);
  if(softDelete.error)throw softDelete.error;
  assert((await followup(rollbackFollowupId))===null,'rollback_target_not_precreated');

  const failed=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_create',
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,executionKey:uuid()
  });
  assert(failed.status===400&&failed.data?.error?.code==='ENJAZ_FOLLOWUP_TRANSACTION_INVALID','create_domain_failure_propagates');
  assert((await followup(rollbackFollowupId))===null,'create_domain_failure_zero_business_mutation');

  const approvalReplay=await edge(owner.token,{
    workspaceId:ws,requestId:rollbackApproval.requestId,
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,
    decision:'approve',decisionKey:rollbackApproval.decisionKey
  });
  assert(approvalReplay.status===200&&approvalReplay.data?.result?.status==='approved'&&approvalReplay.data?.result?.replayed===true,'create_domain_failure_rolls_back_consumption');

  assert((await followupCount(ws))===ownerBefore+1,'owner_workspace_exactly_one_agent_create');
  assert((await followupCount(other))===otherBefore,'foreign_workspace_zero_create_mutation');
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
    for(const [table,ids] of Object.entries(fixtures)){
      if(!ids.length)continue;
      const source=table==='followups'?'transaction_followups':table;
      const {data,error}=await admin.from(source).select('id').in('id',ids);if(error)throw error;
      if(data?.length)throw new Error(`${source} residue`);
    }
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
