import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd';
const MARKER='phase12_3_a3d_document_request_real_cloud';
const DIR='artifacts/phase12-3-a3d-real-cloud';
const OUT=DIR+'/evidence.json';
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error('Missing '+n);return v};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const pub=env('SUPABASE_PUBLISHABLE_KEY');
const secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set();
const fixtures={companies:[],transactions:[],requests:[],principals:[],grants:[]};
const evidence={schema:'enjaz.phase12-3-a3d-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log('PASS 12.3-A3D '+name+(detail?' — '+detail:''))};
const assert=(v,name,detail=null)=>{if(!v)throw new Error('ASSERTION_FAILED:'+name+(detail?':'+detail:''));pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');

async function createUser(label){
  const email='enjaz-123a3d-'+label+'-'+Date.now()+'-'+uuid().slice(0,8)+'@example.com';
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
async function edge(token,body){
  const headers={'content-type':'application/json',apikey:pub};
  if(token)headers.authorization='Bearer '+token;
  const response=await fetch(url+'/functions/v1/enjaz-copilot-agent',{method:'POST',headers,body:JSON.stringify(body)});
  const raw=await response.text();let data=null;try{data=JSON.parse(raw)}catch{data={raw}};
  return {status:response.status,data};
}
async function transactionFixture(ws,label){
  const companyId=uuid(),transactionId=uuid();
  let x=await admin.from('companies').insert({
    id:companyId,workspace_id:ws,legal_name:'A3D '+label,display_name:'A3D '+label,status:'active'
  });if(x.error)throw x.error;fixtures.companies.push(companyId);
  x=await admin.from('transactions').insert({
    id:transactionId,workspace_id:ws,company_id:companyId,type:'A3D Agent Probe',department:'Copilot',
    status:'active',priority:'normal',current_fee:250000
  });if(x.error)throw x.error;fixtures.transactions.push(transactionId);
  return {companyId,transactionId};
}
async function portalPrincipal(owner,ws,clientUser){
  const {data,error}=await owner.client.rpc('save_client_portal_principal_v1',{
    p_workspace_id:ws,p_user_id:clientUser.id,p_contact_id:null,p_status:'invited',p_expected_version:null
  });
  if(error)throw error;
  const id=String(data?.principalId??'');
  if(!id)throw new Error('principal id missing');
  fixtures.principals.push(id);
  return {id,version:Number(data.version),status:String(data.status)};
}
async function grant(owner,ws,principalId,transactionId,permissions){
  const {data,error}=await owner.client.rpc('save_client_portal_grant_v1',{
    p_workspace_id:ws,p_principal_id:principalId,p_grant_id:null,p_expected_version:null,
    p_target_type:'transaction',p_target_id:transactionId,p_permissions:permissions,
    p_valid_from:null,p_valid_until:null
  });
  if(error)throw error;
  const id=String(data?.grantId??'');
  if(!id)throw new Error('grant id missing');
  fixtures.grants.push(id);
  return {id,version:Number(data.version),permissions:Array.isArray(data.permissions)?data.permissions:[]};
}
async function requestRow(id){
  const {data,error}=await admin.from('client_portal_requests')
    .select('id,workspace_id,principal_id,transaction_id,request_type,required_permission,resource_share_id,title,instructions,due_at,status,valid_from,valid_until,version,created_by')
    .eq('id',id).maybeSingle();
  if(error)throw error;return data;
}
async function requestCount(ws){
  const {count,error}=await admin.from('client_portal_requests').select('id',{head:true,count:'exact'}).eq('workspace_id',ws);
  if(error)throw error;return count??0;
}
async function approve(owner,ws,proposal){
  const requestId=uuid(),decisionKey=uuid();
  const response=await edge(owner.token,{
    workspaceId:ws,requestId,proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,
    decision:'approve',decisionKey
  });
  assert(response.status===200&&response.data?.result?.status==='approved','explicit_document_request_approval_recorded');
  return {requestId,decisionKey,response};
}

async function run(){
  const owner=await signIn(await createUser('owner'));
  const clientUser=await createUser('client');
  const outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner),clientWs=await workspace(clientUser),other=await workspace(outsider);
  assert(ws!==other&&ws!==clientWs,'fresh_workspace_isolation');

  const primary=await transactionFixture(ws,'PRIMARY');
  const denied=await transactionFixture(ws,'DENIED');
  const rollback=await transactionFixture(ws,'ROLLBACK');
  await transactionFixture(other,'FOREIGN');

  const principal=await portalPrincipal(owner,ws,clientUser);
  assert(principal.status==='invited','invited_principal_fixture_preserved');
  const primaryGrant=await grant(owner,ws,principal.id,primary.transactionId,['view','upload_requested_document']);
  await grant(owner,ws,principal.id,denied.transactionId,['view','message']);
  const rollbackGrant=await grant(owner,ws,principal.id,rollback.transactionId,['view','upload_requested_document']);
  assert(primaryGrant.permissions.includes('view')&&primaryGrant.permissions.includes('upload_requested_document'),'canonical_document_grant_created');

  const ownerBefore=await requestCount(ws),otherBefore=await requestCount(other);

  const deniedPermission=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_document_request',
    principalId:principal.id,transactionId:denied.transactionId,portalRequestId:uuid(),
    title:'طلب مرفوض',instructions:null,
    dueAt:new Date(Date.now()+2*60*60*1000).toISOString(),
    validUntil:new Date(Date.now()+24*60*60*1000).toISOString()
  });
  assert(deniedPermission.status===403&&deniedPermission.data?.error?.code==='ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED','prepare_requires_view_plus_upload_permission');

  const escapeBase={
    workspaceId:ws,requestId:uuid(),operation:'prepare_document_request',
    principalId:principal.id,transactionId:primary.transactionId,portalRequestId:uuid(),
    title:'طلب مستند',instructions:null,
    dueAt:new Date(Date.now()+2*60*60*1000).toISOString(),
    validUntil:new Date(Date.now()+24*60*60*1000).toISOString()
  };
  for(const [field,value,name] of [
    ['requestType','payment','request_type_injection_denied'],
    ['resourceShareId',uuid(),'resource_share_injection_denied'],
    ['expectedVersion',1,'request_update_injection_denied'],
    ['validFrom',new Date().toISOString(),'valid_from_injection_denied']
  ]){
    const response=await edge(owner.token,{...escapeBase,requestId:uuid(),[field]:value});
    assert(response.status===400&&response.data?.error?.code==='ACTION_FIELD_FORBIDDEN',name);
  }

  const direct=await owner.client.rpc('copilot_register_document_request_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'a'.repeat(64),
    p_principal_id:principal.id,p_transaction_id:primary.transactionId,p_portal_request_id:uuid(),
    p_title:'ممنوع مباشر',p_instructions:null,
    p_due_at:new Date(Date.now()+2*60*60*1000).toISOString(),
    p_valid_until:new Date(Date.now()+24*60*60*1000).toISOString(),
    p_expires_at:new Date(Date.now()+10*60*1000).toISOString()
  });
  assert(Boolean(direct.error),'browser_document_request_registration_denied');

  const mismatch=await admin.rpc('copilot_register_document_request_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'0'.repeat(64),
    p_principal_id:principal.id,p_transaction_id:primary.transactionId,p_portal_request_id:uuid(),
    p_title:'تدقيق الهاش',p_instructions:'نص',
    p_due_at:new Date(Date.now()+2*60*60*1000).toISOString(),
    p_valid_until:new Date(Date.now()+24*60*60*1000).toISOString(),
    p_expires_at:new Date(Date.now()+10*60*1000).toISOString()
  });
  assert(Boolean(mismatch.error)&&errText(mismatch.error).includes('ENJAZ_COPILOT_ACTION_HASH_CONFLICT'),'database_recomputes_document_request_hash');

  const portalRequestId=uuid(),prepareId=uuid();
  fixtures.requests.push(portalRequestId);
  const title='طلب مستند | رسمي';
  const instructions='يرجى رفع النسخة الموقعة';
  const dueAt=new Date(Date.now()+3*60*60*1000).toISOString();
  const validUntil=new Date(Date.now()+48*60*60*1000).toISOString();
  const prepared=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_document_request',
    principalId:principal.id,transactionId:primary.transactionId,portalRequestId,
    title,instructions,dueAt,validUntil
  });
  assert(prepared.status===200&&prepared.data?.schema==='enjaz.copilot.agent.action.v1','document_request_prepare_structured_success',String(prepared.status)+':'+String(prepared.data?.error?.code??'NO_CODE'));
  const proposal=prepared.data?.result;
  assert(proposal?.status==='pending_approval'&&proposal?.action?.kind==='document.request','document_request_prepare_is_approval_gated');
  assert(proposal?.action?.requestType==='document'&&proposal?.action?.resourceShareId===null,'document_request_semantics_hard_locked');
  assert(proposal?.action?.principalId===principal.id&&proposal?.action?.transactionId===primary.transactionId&&proposal?.action?.portalRequestId===portalRequestId,'document_request_exact_identity_bound');
  assert(proposal?.action?.title===title&&proposal?.action?.instructions===instructions&&proposal?.action?.dueAt===dueAt&&proposal?.action?.validUntil===validUntil,'document_request_exact_content_time_bound');
  assert(proposal?.executionAllowed===false&&proposal?.genericWriteToolAllowed===false,'document_request_prepare_no_execution_authority');
  assert(principal.status==='invited','invited_principal_prepare_supported');

  const prepareReplay=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_document_request',
    principalId:principal.id,transactionId:primary.transactionId,portalRequestId,
    title,instructions,dueAt,validUntil
  });
  assert(prepareReplay.status===200&&prepareReplay.data?.result?.proposalId===proposal.proposalId&&prepareReplay.data?.result?.replayed===true,'document_request_prepare_exact_replay_idempotent');

  const beforeApproval=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()
  });
  assert(beforeApproval.status===409&&beforeApproval.data?.error?.code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','document_request_execution_before_approval_denied');
  assert((await requestRow(portalRequestId))===null,'before_document_request_approval_zero_mutation');

  const cross=await edge(outsider.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_document_request',
    principalId:principal.id,transactionId:primary.transactionId,portalRequestId:uuid(),
    title:'محاولة عابرة',instructions:null,dueAt,validUntil
  });
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_document_request_prepare_denied');

  const tampered=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:'f'.repeat(64),executionKey:uuid()
  });
  assert(tampered.status===409&&tampered.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_document_request_hash_denied');

  const injection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid(),requestType:'payment'
  });
  assert(injection.status===400&&injection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','document_request_execution_business_field_injection_denied');

  await approve(owner,ws,proposal);
  const executionKey=uuid(),executionRequestId=uuid();
  const executed=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(executed.status===200&&executed.data?.result?.actionKind==='document.request','approved_document_request_executes');
  assert(executed.data?.result?.targetId===portalRequestId&&executed.data?.result?.principalId===principal.id&&executed.data?.result?.transactionId===primary.transactionId,'document_request_executes_exact_identity');
  assert(executed.data?.result?.title===title&&executed.data?.result?.instructions===instructions&&executed.data?.result?.dueAt===dueAt&&executed.data?.result?.validUntil===validUntil,'document_request_executes_exact_content_time');
  assert(executed.data?.result?.requestType==='document'&&executed.data?.result?.resourceShareId===null,'document_request_execution_stays_document_only');
  assert(executed.data?.result?.domainAuthority==='save_client_portal_request_v1','document_request_delegates_existing_m3_authority');

  const row=await requestRow(portalRequestId);
  assert(row?.workspace_id===ws&&row?.principal_id===principal.id&&row?.transaction_id===primary.transactionId,'canonical_document_request_exact_scope');
  assert(row?.request_type==='document'&&row?.required_permission==='upload_requested_document'&&row?.resource_share_id===null,'canonical_document_request_permission_shape');
  assert(row?.title===title&&row?.instructions===instructions,'canonical_document_request_exact_content');
  assert(new Date(row.due_at).toISOString()===dueAt&&new Date(row.valid_until).toISOString()===validUntil,'canonical_document_request_exact_timing');
  assert(row?.status==='open'&&row?.version===1&&row?.created_by===owner.id,'canonical_document_request_created_once_by_owner');

  const replay=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(replay.status===200&&replay.data?.result?.replayed===true,'document_request_execution_exact_replay_idempotent');
  assert((await requestCount(ws))===ownerBefore+1,'document_request_replay_no_duplicate_request');

  const secondKey=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_document_request',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()
  });
  assert(secondKey.status===409&&secondKey.data?.error?.code==='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT','document_request_single_use_execution_enforced');

  const rollbackRequestId=uuid(),rollbackDue=new Date(Date.now()+4*60*60*1000).toISOString(),rollbackValid=new Date(Date.now()+72*60*60*1000).toISOString();
  fixtures.requests.push(rollbackRequestId);
  const rollbackPrepared=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_document_request',
    principalId:principal.id,transactionId:rollback.transactionId,portalRequestId:rollbackRequestId,
    title:'طلب rollback',instructions:null,dueAt:rollbackDue,validUntil:rollbackValid
  });
  assert(rollbackPrepared.status===200&&rollbackPrepared.data?.result?.proposalId,'document_request_rollback_proposal_prepared');
  const rollbackApproval=await approve(owner,ws,rollbackPrepared.data.result);

  const revoked=await owner.client.rpc('revoke_client_portal_grant_v1',{
    p_workspace_id:ws,p_grant_id:rollbackGrant.id,p_expected_version:rollbackGrant.version,p_reason:'A3D rollback probe'
  });
  if(revoked.error)throw revoked.error;

  const failed=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_document_request',
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,executionKey:uuid()
  });
  assert(failed.status===403&&failed.data?.error?.code==='ENJAZ_PORTAL_REQUEST_PERMISSION_REQUIRED','document_request_domain_failure_propagates');
  assert((await requestRow(rollbackRequestId))===null,'document_request_domain_failure_zero_business_mutation');

  const approvalReplay=await edge(owner.token,{
    workspaceId:ws,requestId:rollbackApproval.requestId,
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,
    decision:'approve',decisionKey:rollbackApproval.decisionKey
  });
  assert(approvalReplay.status===200&&approvalReplay.data?.result?.status==='approved'&&approvalReplay.data?.result?.replayed===true,'document_request_domain_failure_rolls_back_consumption');

  assert((await requestCount(ws))===ownerBefore+1,'owner_workspace_exactly_one_agent_document_request');
  assert((await requestCount(other))===otherBefore,'foreign_workspace_zero_document_request_mutation');
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
    const tableMap={companies:'companies',transactions:'transactions',requests:'client_portal_requests',principals:'client_portal_principals',grants:'client_portal_grants'};
    for(const [key,ids] of Object.entries(fixtures)){
      if(!ids.length)continue;
      const {data,error}=await admin.from(tableMap[key]).select('id').in('id',ids);if(error)throw error;
      if(data?.length)throw new Error(tableMap[key]+' residue');
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
