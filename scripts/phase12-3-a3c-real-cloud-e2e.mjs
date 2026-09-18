// A3-C Real Cloud lineage: snapshot RPC named-argument hardening is source-controlled before this probe rerun.
import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase12_3_a3c_self_reminder_real_cloud',DIR='artifacts/phase12-3-a3c-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set(),fixtures={renewals:[],occurrences:[]};
const evidence={schema:'enjaz.phase12-3-a3c-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 12.3-A3C ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');
const dateOnly=ms=>new Date(ms).toISOString().slice(0,10);

async function createUser(label){
  const email=`enjaz-123a3c-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
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
    const {data,error}=await admin.from('workspaces').select('id,timezone').eq('owner_user_id',x.id).limit(2);
    if(error)throw error;
    if(data?.length===1){x.workspaceId=data[0].id;workspaces.add(data[0].id);x.timezone=data[0].timezone;return data[0]}
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
async function renewalFixture(ws,userId,label,days=3){
  const renewalId=uuid(),occurrenceId=uuid(),dueDate=dateOnly(Date.now()+days*86400000);
  let x=await admin.from('renewals').insert({
    id:renewalId,workspace_id:ws,title:`A3C ${label}`,due_date:dueDate,recurrence_rule:'FREQ=YEARLY',status:'active',version:1
  });if(x.error)throw x.error;fixtures.renewals.push(renewalId);
  x=await admin.from('renewal_occurrences').insert({
    id:occurrenceId,workspace_id:ws,renewal_id:renewalId,occurrence_sequence:1,
    anchor_due_date:dueDate,due_date:dueDate,recurrence_rule_snapshot:'FREQ=YEARLY',
    source_renewal_version:1,status:'pending',materialized_by:userId
  });if(x.error)throw x.error;fixtures.occurrences.push(occurrenceId);
  return {renewalId,occurrenceId,dueDate};
}
async function notificationsFor(ws,sourceId){
  const {data,error}=await admin.from('in_app_notifications')
    .select('id,workspace_id,user_id,category,priority,title,source_type,source_id,event_key,source_version,scheduled_for')
    .eq('workspace_id',ws).eq('source_type','renewal_occurrence').eq('source_id',sourceId);
  if(error)throw error;return data??[];
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
  assert(response.status===200&&response.data?.result?.status==='approved','explicit_reminder_approval_recorded');
  return {requestId,decisionKey,response};
}

async function run(){
  const owner=await signIn(await createUser('owner')),outsider=await signIn(await createUser('outsider'));
  const ownerWs=await workspace(owner),outsiderWs=await workspace(outsider),ws=ownerWs.id,other=outsiderWs.id;
  assert(ws!==other,'fresh_workspace_isolation');
  const primary=await renewalFixture(ws,owner.id,'PRIMARY',3);
  const rollback=await renewalFixture(ws,owner.id,'ROLLBACK',4);
  const foreign=await renewalFixture(other,outsider.id,'FOREIGN',3);
  const followupsBefore=await followupCount(ws);

  const badKind=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'other',sourceId:primary.occurrenceId,operationId:uuid(),scheduledFor:new Date(Date.now()+3600000).toISOString()
  });
  assert(badKind.status===400&&badKind.data?.error?.code==='ACTION_SOURCE_KIND_INVALID','source_kind_validation_is_400');

  const recipientInjection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId:uuid(),
    scheduledFor:new Date(Date.now()+3600000).toISOString(),recipientUserId:outsider.id
  });
  assert(recipientInjection.status===400&&recipientInjection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','prepare_recipient_injection_denied');

  const escalationInjection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId:uuid(),
    scheduledFor:new Date(Date.now()+3600000).toISOString(),mode:'escalation'
  });
  assert(escalationInjection.status===400&&escalationInjection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','prepare_escalation_injection_denied');

  const followupInjection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId:uuid(),
    scheduledFor:new Date(Date.now()+3600000).toISOString(),followupId:uuid()
  });
  assert(followupInjection.status===400&&followupInjection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','prepare_followup_side_effect_injection_denied');

  const directRegistration=await owner.client.rpc('copilot_register_schedule_reminder_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'a'.repeat(64),
    p_source_kind:'renewal_occurrence',p_source_id:primary.occurrenceId,p_operation_id:uuid(),
    p_scheduled_for:new Date(Date.now()+3600000).toISOString(),p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(directRegistration.error),'browser_reminder_registration_denied');

  const bogusSchedule=new Date(Date.now()+2*3600000).toISOString();
  const mismatch=await admin.rpc('copilot_register_schedule_reminder_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'0'.repeat(64),
    p_source_kind:'renewal_occurrence',p_source_id:primary.occurrenceId,p_operation_id:uuid(),
    p_scheduled_for:bogusSchedule,p_expires_at:new Date(Date.now()+600000).toISOString()
  });
  assert(Boolean(mismatch.error)&&errText(mismatch.error).includes('ENJAZ_COPILOT_ACTION_HASH_CONFLICT'),'database_recomputes_reminder_hash');

  const scheduledFor=new Date(Date.now()+2*3600000).toISOString(),operationId=uuid(),prepareId=uuid();
  const prepared=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId,scheduledFor
  });
  assert(prepared.status===200&&prepared.data?.schema==='enjaz.copilot.agent.action.v1','reminder_prepare_structured_success',String(prepared.status)+':'+String(prepared.data?.error?.code??'NO_CODE'));
  const proposal=prepared.data?.result;
  assert(proposal?.status==='pending_approval'&&proposal?.action?.kind==='reminder.schedule','reminder_prepare_is_approval_gated');
  assert(proposal?.action?.sourceKind==='renewal_occurrence'&&proposal?.action?.sourceId===primary.occurrenceId,'reminder_exact_source_bound');
  assert(proposal?.action?.operationId===operationId&&proposal?.action?.scheduledFor===scheduledFor,'reminder_exact_operation_time_bound');
  assert(proposal?.action?.recipient==='self'&&proposal?.action?.mode==='reminder','reminder_self_mode_hard_locked');
  assert(proposal?.executionAllowed===false&&proposal?.genericWriteToolAllowed===false,'reminder_prepare_no_execution_authority');

  const prepareReplay=await edge(owner.token,{
    workspaceId:ws,requestId:prepareId,operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId,scheduledFor
  });
  assert(prepareReplay.status===200&&prepareReplay.data?.result?.proposalId===proposal.proposalId&&prepareReplay.data?.result?.replayed===true,'reminder_prepare_exact_replay_idempotent');

  const beforeApproval=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_schedule_reminder',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()
  });
  assert(beforeApproval.status===409&&beforeApproval.data?.error?.code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','reminder_execution_before_approval_denied');
  assert((await notificationsFor(ws,primary.occurrenceId)).length===0,'before_reminder_approval_zero_notification');

  const cross=await edge(outsider.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:primary.occurrenceId,operationId:uuid(),scheduledFor
  });
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_reminder_prepare_denied');

  const tampered=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_schedule_reminder',
    proposalId:proposal.proposalId,proposalHash:'f'.repeat(64),executionKey:uuid()
  });
  assert(tampered.status===409&&tampered.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_reminder_hash_denied');

  const executionInjection=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_schedule_reminder',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid(),
    recipientUserId:outsider.id,mode:'escalation',scheduledFor:new Date(Date.now()+5000).toISOString()
  });
  assert(executionInjection.status===400&&executionInjection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','reminder_execution_business_field_injection_denied');

  await approve(owner,ws,proposal);
  const executionKey=uuid(),executionRequestId=uuid();
  const executed=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_schedule_reminder',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(executed.status===200&&executed.data?.result?.actionKind==='reminder.schedule','approved_reminder_executes');
  assert(executed.data?.result?.targetId===primary.occurrenceId&&executed.data?.result?.operationId===operationId,'reminder_executes_exact_identity');
  assert(executed.data?.result?.scheduledFor===scheduledFor&&executed.data?.result?.domainAuthority==='dispatch_scheduling_attention_v1','reminder_delegates_existing_scheduling_authority');

  const rows=await notificationsFor(ws,primary.occurrenceId);
  assert(rows.length===1,'exactly_one_reminder_notification_created');
  const row=rows[0];
  assert(row.user_id===owner.id&&row.workspace_id===ws,'reminder_recipient_is_approving_actor_only');
  assert(row.category==='renewal'&&row.priority==='normal','reminder_mode_not_escalation');
  assert(row.source_type==='renewal_occurrence'&&row.source_id===primary.occurrenceId,'canonical_reminder_source_exact');
  assert(new Date(row.scheduled_for).toISOString()===scheduledFor,'canonical_reminder_schedule_exact');

  const replay=await edge(owner.token,{
    workspaceId:ws,requestId:executionRequestId,operation:'execute_schedule_reminder',
    proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey
  });
  assert(replay.status===200&&replay.data?.result?.replayed===true,'reminder_execution_exact_replay_idempotent');
  assert((await notificationsFor(ws,primary.occurrenceId)).length===1,'reminder_replay_no_duplicate_notification');
  assert((await followupCount(ws))===followupsBefore,'reminder_never_creates_followup_side_effect');

  const terminalDue=new Date(Date.now()+3*3600000).toISOString();
  const terminal=await admin.from('renewal_occurrences').update({
    status:'completed',completed_by:owner.id,completed_at:new Date().toISOString()
  }).eq('workspace_id',ws).eq('id',rollback.occurrenceId);
  if(terminal.error)throw terminal.error;
  const terminalPrepare=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:rollback.occurrenceId,operationId:uuid(),scheduledFor:terminalDue
  });
  assert(terminalPrepare.status===409&&terminalPrepare.data?.error?.code==='ENJAZ_SCHEDULING_ATTENTION_SOURCE_TERMINAL','terminal_source_rejected_at_prepare');

  const rollback2=await renewalFixture(ws,owner.id,'ROLLBACK2',5);
  const rollbackSchedule=new Date(Date.now()+3*3600000).toISOString(),rollbackOperation=uuid();
  const rollbackPrepared=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'prepare_schedule_reminder',
    sourceKind:'renewal_occurrence',sourceId:rollback2.occurrenceId,operationId:rollbackOperation,scheduledFor:rollbackSchedule
  });
  assert(rollbackPrepared.status===200&&rollbackPrepared.data?.result?.proposalId,'reminder_rollback_proposal_prepared');
  const rollbackApproval=await approve(owner,ws,rollbackPrepared.data.result);
  const complete=await admin.from('renewal_occurrences').update({
    status:'completed',completed_by:owner.id,completed_at:new Date().toISOString()
  }).eq('workspace_id',ws).eq('id',rollback2.occurrenceId);
  if(complete.error)throw complete.error;

  const failed=await edge(owner.token,{
    workspaceId:ws,requestId:uuid(),operation:'execute_schedule_reminder',
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,executionKey:uuid()
  });
  assert(failed.status===404&&failed.data?.error?.code==='ENJAZ_SCHEDULING_RENEWAL_OCCURRENCE_NOT_FOUND','reminder_domain_failure_propagates');
  assert((await notificationsFor(ws,rollback2.occurrenceId)).length===0,'reminder_domain_failure_zero_notification');

  const approvalReplay=await edge(owner.token,{
    workspaceId:ws,requestId:rollbackApproval.requestId,
    proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,
    decision:'approve',decisionKey:rollbackApproval.decisionKey
  });
  assert(approvalReplay.status===200&&approvalReplay.data?.result?.status==='approved'&&approvalReplay.data?.result?.replayed===true,'reminder_domain_failure_rolls_back_consumption');

  assert((await notificationsFor(other,foreign.occurrenceId)).length===0,'foreign_workspace_zero_reminder_mutation');
  assert((await followupCount(ws))===followupsBefore,'final_zero_followup_side_effect');
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
    for(const id of fixtures.renewals){
      const {data,error}=await admin.from('renewals').select('id').eq('id',id);if(error)throw error;if(data?.length)throw new Error('renewal residue');
    }
    for(const id of fixtures.occurrences){
      const {data,error}=await admin.from('renewal_occurrences').select('id').eq('id',id);if(error)throw error;if(data?.length)throw new Error('occurrence residue');
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
