import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase12_3_a3_followup_snooze_real_cloud',DIR='artifacts/phase12-3-a3-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set(),fixtures={companies:[],transactions:[],followups:[]};
const evidence={schema:'enjaz.phase12-3-a3-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.3-A3 ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');

async function createUser(label){
  const email=`enjaz-123a3-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
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
async function fixture(ws,label){
  const companyId=uuid(),transactionId=uuid(),followupId=uuid();
  let x=await admin.from('companies').insert({
    id:companyId,workspace_id:ws,legal_name:`A3 ${label}`,display_name:`A3 ${label}`,status:'active'
  });if(x.error)throw x.error;fixtures.companies.push(companyId);
  x=await admin.from('transactions').insert({
    id:transactionId,workspace_id:ws,company_id:companyId,type:'A3 Agent Probe',department:'Copilot',
    status:'active',priority:'normal',current_fee:250000
  });if(x.error)throw x.error;fixtures.transactions.push(transactionId);
  x=await admin.from('transaction_followups').insert({
    id:followupId,workspace_id:ws,transaction_id:transactionId,title:`A3 ${label} follow-up`,
    due_at:new Date(Date.now()+24*60*60*1000).toISOString(),status:'open'
  });if(x.error)throw x.error;fixtures.followups.push(followupId);
  return {companyId,transactionId,followupId};
}
async function followup(id){
  const {data,error}=await admin.from('transaction_followups').select('id,status,snoozed_until').eq('id',id).single();
  if(error)throw error;return data;
}
async function approve(owner,ws,prepared){
  const requestId=uuid(),decisionKey=uuid();
  const response=await edge(owner.token,{
    workspaceId:ws,requestId,proposalId:prepared.proposalId,proposalHash:prepared.proposalHash,
    decision:'approve',decisionKey
  });
  assert(response.status===200&&response.data?.result?.status==='approved','explicit_action_approval_recorded');
  return {requestId,decisionKey,response};
}

async function run(){
  const owner=await signIn(await createUser('owner')),outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner),other=await workspace(outsider);
  assert(ws!==other,'fresh_workspace_isolation');
  const primary=await fixture(ws,'PRIMARY'),rollback=await fixture(ws,'ROLLBACK');
  const foreign=await fixture(other,'FOREIGN');
  assert(primary.followupId!==foreign.followupId,'fixture_identity_isolation');

  const directRegistration=await owner.client.rpc('copilot_register_followup_snooze_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'a'.repeat(64),
    p_followup_id:primary.followupId,p_snoozed_until:new Date(Date.now()+3600000).toISOString(),
    p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(directRegistration.error),'browser_action_registration_denied');

  const mismatch=await admin.rpc('copilot_register_followup_snooze_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'0'.repeat(64),
    p_followup_id:primary.followupId,p_snoozed_until:new Date(Date.now()+3600000).toISOString(),
    p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(mismatch.error)&&errText(mismatch.error).includes('ENJAZ_COPILOT_ACTION_HASH_CONFLICT'),'database_recomputes_action_hash');

  const snoozedUntil=new Date(Date.now()+2*60*60*1000).toISOString();
  const prepareId=uuid();
  const prepared=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_followup_snooze',
    followupId:primary.followupId,snoozedUntil
  });
  assert(prepared.status===200&&prepared.data?.schema==='enjaz.copilot.agent.action.v1','prepare_structured_success');
  const proposal=prepared.data?.result;
  assert(proposal?.status==='pending_approval'&&proposal?.action?.kind==='followup.snooze','prepare_is_approval_gated');
  assert(proposal?.action?.followupId===primary.followupId&&proposal?.action?.snoozedUntil===snoozedUntil,'prepared_action_exact_fields');
  assert(proposal?.executionAllowed===false&&proposal?.genericWriteToolAllowed===false,'prepared_action_no_execution_authority');

  const prepareReplay=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_followup_snooze',
    followupId:primary.followupId,snoozedUntil
  });
  assert(prepareReplay.status===200&&prepareReplay.data?.result?.proposalId===proposal.proposalId&&prepareReplay.data?.result?.replayed===true,'prepare_exact_replay_idempotent');

  const beforeApproval=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_snooze',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()
  });
  assert(beforeApproval.status===409&&beforeApproval.data?.error?.code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','execution_before_approval_denied');
  assert((await followup(primary.followupId)).snoozed_until===null,'before_approval_zero_mutation');

  const cross=await edge(outsider.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_snooze',
    followupId:primary.followupId,snoozedUntil
  });
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_prepare_denied');

  const tamperedExecute=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_snooze',
    proposalId:proposal.proposalId,proposalHash:'f'.repeat(64),executionKey:uuid()
  });
  assert(tamperedExecute.status===409&&tamperedExecute.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_execute_hash_denied');

  const extraField=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_snooze',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid(),
    followupId:foreign.followupId
  });
  assert(extraField.status===400&&extraField.data?.error?.code==='ACTION_FIELD_FORBIDDEN','execution_business_field_injection_denied');

  await approve(owner,ws,proposal);
  const executionKey=uuid(),executionRequestId=uuid();
  const executed=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_followup_snooze',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(executed.status===200&&executed.data?.result?.actionKind==='followup.snooze','approved_action_executes');
  assert(executed.data?.result?.targetId===primary.followupId&&executed.data?.result?.replayed===false,'execution_exact_target_single_use');
  assert(executed.data?.result?.domainAuthority==='mutate_transaction_followup_state_v1','execution_delegates_existing_domain_authority');
  const after=await followup(primary.followupId);
  assert(after.status==='open'&&new Date(after.snoozed_until).toISOString()===snoozedUntil,'canonical_followup_snoozed_exactly');

  const executionReplay=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_followup_snooze',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(executionReplay.status===200&&executionReplay.data?.result?.replayed===true,'execution_exact_replay_idempotent');
  assert(new Date((await followup(primary.followupId)).snoozed_until).toISOString()===snoozedUntil,'execution_replay_no_second_mutation');

  const genericProposal=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'propose',goal:'راجع المعاملة واقترح الإجراء التالي',contextQuery:'A3 PRIMARY'
  });
  assert(genericProposal.status===200&&genericProposal.data?.approval?.proposalId,'generic_plan_proposal_exists');
  await approve(owner,ws,genericProposal.data.approval);
  const genericExecute=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_snooze',
    proposalId:genericProposal.data.approval.proposalId,proposalHash:genericProposal.data.approval.proposalHash,executionKey:uuid()
  });
  assert(genericExecute.status===409&&genericExecute.data?.error?.code==='ENJAZ_COPILOT_ACTION_KIND_CONFLICT','generic_proposal_cannot_execute_action');

  const rollbackTime=new Date(Date.now()+3*60*60*1000).toISOString();
  const rollbackPrepared=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_followup_snooze',
    followupId:rollback.followupId,snoozedUntil:rollbackTime
  });
  assert(rollbackPrepared.status===200&&rollbackPrepared.data?.result?.proposalId,'rollback_proposal_prepared');
  const rollbackApproval=await approve(owner,ws,rollbackPrepared.data.result);
  const terminal=await owner.client.rpc('mutate_transaction_followup_state_v1',{
    p_workspace_id:ws,p_followup_id:rollback.followupId,p_action:'complete',p_snoozed_until:null
  });
  if(terminal.error)throw terminal.error;
  assert(terminal.data?.status==='completed','rollback_fixture_made_terminal');

  const failedExecution=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_followup_snooze',
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,executionKey:uuid()
  });
  assert(failedExecution.status===409&&failedExecution.data?.error?.code==='ENJAZ_FOLLOWUP_TERMINAL_FINAL','domain_failure_propagates');

  const approvalReplay=await edge(owner.token,{
    workspaceId:ws,requestId:rollbackApproval.requestId,
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,
    decision:'approve',decisionKey:rollbackApproval.decisionKey
  });
  assert(approvalReplay.status===200&&approvalReplay.data?.result?.status==='approved'&&approvalReplay.data?.result?.replayed===true,'domain_failure_rolls_back_consumption');

  const primaryFinal=await followup(primary.followupId),rollbackFinal=await followup(rollback.followupId),foreignFinal=await followup(foreign.followupId);
  assert(primaryFinal.status==='open'&&primaryFinal.snoozed_until!==null,'primary_only_expected_mutation');
  assert(rollbackFinal.status==='completed'&&rollbackFinal.snoozed_until===null,'failed_agent_action_added_no_mutation');
  assert(foreignFinal.status==='open'&&foreignFinal.snoozed_until===null,'foreign_workspace_zero_mutation');
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
