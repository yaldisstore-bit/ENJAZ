import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const PROJECT_REF='juzxriirhkuzviwnhkbd';
const MARKER='phase11_6b_real_cloud_e2e';
const ARTIFACT_DIR='artifacts/phase11-6b-real-cloud';
const EVIDENCE_PATH=`${ARTIFACT_DIR}/evidence.json`;
const requiredEnv=name=>{const value=process.env[name]?.trim();if(!value)throw new Error(`Missing required environment variable: ${name}`);return value};
const url=requiredEnv('SUPABASE_URL').replace(/\/$/,'');
const publishableKey=requiredEnv('SUPABASE_PUBLISHABLE_KEY');
const secretKey=requiredEnv('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES')throw new Error('ENJAZ_REAL_CLOUD_CONFIRM must equal YES');
if(!url.includes(PROJECT_REF))throw new Error('Refusing to run against an unexpected Supabase project');
if(secretKey.startsWith('sb_publishable_')||secretKey===publishableKey)throw new Error('SUPABASE_SECRET_KEY is not privileged');

const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const makeUserClient=()=>createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const publicClient=makeUserClient();
const evidence={schema:'enjaz.phase11-6b-real-cloud-e2e.v1',projectRef:PROJECT_REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
const users=[];
const workspaces=new Set();
const fixtureIds={};
let fatalError=null;
const record=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${name}${detail?` — ${detail}`:''}`)};
const assert=(condition,name,detail=null)=>{if(!condition)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);record(name,detail)};
const uuid=()=>crypto.randomUUID();
const hex64=()=>crypto.randomBytes(32).toString('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rpcErrorMatches=(error,marker)=>Boolean(error&&String(error.message??error.details??error.hint??error.code??'').includes(marker));
const assertRpcError=(error,marker,name)=>assert(Boolean(error)&&rpcErrorMatches(error,marker),name,error?.message??error?.code??'unknown');

async function writeEvidence(){
  await mkdir(ARTIFACT_DIR,{recursive:true});
  evidence.completedAt=new Date().toISOString();
  evidence.passed=!fatalError&&evidence.cleanupPassed;
  if(fatalError)evidence.failure=fatalError instanceof Error?fatalError.message:String(fatalError);
  await writeFile(EVIDENCE_PATH,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
}
async function createUser(label){
  const entropy=`${Date.now()}-${uuid().slice(0,8)}`;
  const email=`enjaz-116b-${label}-${entropy}@example.com`;
  const password=`EnjAZ!${uuid()}Aa9`;
  const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
  if(error||!data.user)throw error??new Error(`Unable to create ${label} user`);
  const entry={id:data.user.id,email,password,client:makeUserClient(),accessToken:null};
  users.push(entry);
  return entry;
}
async function signIn(entry){
  const{data,error}=await entry.client.auth.signInWithPassword({email:entry.email,password:entry.password});
  if(error||!data.session?.access_token)throw error??new Error('Test sign-in returned no token');
  entry.accessToken=data.session.access_token;
  return entry;
}
async function waitForWorkspace(userId){
  for(let attempt=0;attempt<32;attempt++){
    const{data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);
    if(error)throw error;
    if(data?.length===1){workspaces.add(data[0].id);return data[0].id}
    await sleep(250);
  }
  throw new Error('Workspace bootstrap did not materialize');
}
async function insert(table,row){
  const{error}=await admin.from(table).insert(row);
  if(error)throw new Error(`${table} fixture insert failed: ${error.message}`);
}
async function one(table,columns,filters){
  let q=admin.from(table).select(columns);
  for(const [k,v] of Object.entries(filters))q=q.eq(k,v);
  const{data,error}=await q.maybeSingle();
  if(error)throw error;
  return data;
}
async function cleanupAll(){
  let ok=true;
  for(const workspaceId of workspaces){
    try{
      const{error}=await admin.from('workspaces').delete().eq('id',workspaceId);
      if(error)throw error;
      evidence.cleanup.push({kind:'workspace',passed:true});
    }catch(error){ok=false;evidence.cleanup.push({kind:'workspace',passed:false,error:error instanceof Error?error.message:String(error)})}
  }
  for(const entry of users){
    try{
      if(entry.accessToken)await admin.auth.admin.signOut(entry.accessToken,'global').catch(()=>null);
      const{error}=await admin.auth.admin.deleteUser(entry.id,false);
      if(error)throw error;
      evidence.cleanup.push({kind:'auth_user',passed:true});
    }catch(error){ok=false;evidence.cleanup.push({kind:'auth_user',passed:false,error:error instanceof Error?error.message:String(error)})}
  }
  try{
    const workspaceIds=[...workspaces];
    if(workspaceIds.length){
      const{data,error}=await admin.from('workspaces').select('id').in('id',workspaceIds);
      if(error)throw error;
      if((data??[]).length)throw new Error('workspace residue remains');
    }
    for(const [table,id] of [
      ['intake_submissions',fixtureIds.secureSubmissionId],
      ['intake_submissions',fixtureIds.revokeSubmissionId],
      ['intake_submissions',fixtureIds.portalSubmissionId],
      ['intake_submissions',fixtureIds.unboundSubmissionId],
      ['intake_submissions',fixtureIds.crossSubmissionId],
      ['client_portal_principals',fixtureIds.principalId],
    ]){
      if(!id)continue;
      const{data,error}=await admin.from(table).select('id').eq('id',id);
      if(error)throw error;
      if((data??[]).length)throw new Error(`${table} fixture residue remains`);
    }
    if(fixtureIds.portalRequestId){
      const{data,error}=await admin.from('client_portal_requests').select('id').eq('id',fixtureIds.portalRequestId);
      if(error)throw error;
      if((data??[]).length)throw new Error('client_portal_requests fixture residue remains');
    }
    if(fixtureIds.messageId){
      const{data,error}=await admin.from('client_portal_messages').select('id').eq('id',fixtureIds.messageId);
      if(error)throw error;
      if((data??[]).length)throw new Error('client_portal_messages fixture residue remains');
    }
    const marked=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(marked.error)throw marked.error;
    if((marked.data?.users??[]).some(user=>user.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth-user residue remains');
    evidence.cleanup.push({kind:'zero_residue_verification',passed:true});
  }catch(error){ok=false;evidence.cleanup.push({kind:'zero_residue_verification',passed:false,error:error instanceof Error?error.message:String(error)})}
  evidence.cleanupPassed=ok;
}

try{
  const staff=await signIn(await createUser('staff'));
  const client=await signIn(await createUser('client'));
  const staffWorkspace=await waitForWorkspace(staff.id);
  const clientWorkspace=await waitForWorkspace(client.id);
  assert(staffWorkspace!==clientWorkspace,'isolated_bootstrap_workspaces');
  record('disposable_confirmed_auth_users_created');

  const companyId=uuid(),txId=uuid(),otherTxId=uuid(),leadId=uuid(),unboundLeadId=uuid();
  const formId=uuid(),clientFormId=uuid();
  const fieldPhone=uuid(),fieldEmail=uuid(),fieldNote=uuid(),clientField=uuid();
  const secureLinkId=uuid(),revokeLinkId=uuid(),portalLinkId=uuid(),unboundLinkId=uuid(),crossLinkId=uuid();
  const secureSubmissionId=uuid(),revokeSubmissionId=uuid(),portalSubmissionId=uuid(),unboundSubmissionId=uuid(),crossSubmissionId=uuid();
  const principalId=uuid(),grantId=uuid();
  Object.assign(fixtureIds,{companyId,txId,otherTxId,leadId,unboundLeadId,formId,clientFormId,secureSubmissionId,revokeSubmissionId,portalSubmissionId,unboundSubmissionId,crossSubmissionId,principalId});

  await insert('companies',{id:companyId,workspace_id:staffWorkspace,legal_name:'__ENJAZ_116B_COMPANY__',status:'active'});
  await insert('transactions',[
    {id:txId,workspace_id:staffWorkspace,company_id:companyId,type:'Phase 11.6-B primary',status:'active',priority:'normal',current_fee:1},
    {id:otherTxId,workspace_id:staffWorkspace,company_id:companyId,type:'Phase 11.6-B unrelated',status:'active',priority:'normal',current_fee:1},
  ]);
  await insert('crm_leads',[
    {id:leadId,workspace_id:staffWorkspace,display_name:'__ENJAZ_116B_CONVERTED__',source:'real_cloud_probe',stage:'converted',converted_company_id:companyId,converted_transaction_id:txId,created_by:staff.id},
    {id:unboundLeadId,workspace_id:staffWorkspace,display_name:'__ENJAZ_116B_UNBOUND__',source:'real_cloud_probe',stage:'inquiry',created_by:staff.id},
  ]);
  await insert('intake_forms',[
    {id:formId,workspace_id:staffWorkspace,name:'__ENJAZ_116B_FORM__',public_title:'استكمال البيانات',public_description:'اختبار حي مؤقت',active:true,created_by:staff.id},
    {id:clientFormId,workspace_id:clientWorkspace,name:'__ENJAZ_116B_CROSS_FORM__',public_title:'عزل مساحة العمل',public_description:'اختبار حي مؤقت',active:true,created_by:client.id},
  ]);
  await insert('intake_form_fields',[
    {id:fieldPhone,workspace_id:staffWorkspace,form_id:formId,field_key:'phone',label:'الهاتف',field_type:'phone',required:true,position:1,config:{}},
    {id:fieldEmail,workspace_id:staffWorkspace,form_id:formId,field_key:'email',label:'البريد الإلكتروني',field_type:'email',required:false,position:2,config:{}},
    {id:fieldNote,workspace_id:staffWorkspace,form_id:formId,field_key:'note',label:'ملاحظة',field_type:'textarea',required:false,position:3,config:{}},
    {id:clientField,workspace_id:clientWorkspace,form_id:clientFormId,field_key:'phone',label:'الهاتف',field_type:'phone',required:true,position:1,config:{}},
  ]);
  await insert('intake_links',[
    {id:secureLinkId,workspace_id:staffWorkspace,form_id:formId,lead_id:null,token_hash:hex64(),expires_at:new Date(Date.now()+7*86400000).toISOString(),issued_by:staff.id},
    {id:revokeLinkId,workspace_id:staffWorkspace,form_id:formId,lead_id:null,token_hash:hex64(),expires_at:new Date(Date.now()+7*86400000).toISOString(),issued_by:staff.id},
    {id:portalLinkId,workspace_id:staffWorkspace,form_id:formId,lead_id:leadId,token_hash:hex64(),expires_at:new Date(Date.now()+7*86400000).toISOString(),issued_by:staff.id},
    {id:unboundLinkId,workspace_id:staffWorkspace,form_id:formId,lead_id:unboundLeadId,token_hash:hex64(),expires_at:new Date(Date.now()+7*86400000).toISOString(),issued_by:staff.id},
    {id:crossLinkId,workspace_id:clientWorkspace,form_id:clientFormId,lead_id:null,token_hash:hex64(),expires_at:new Date(Date.now()+7*86400000).toISOString(),issued_by:client.id},
  ]);
  const submittedAt=new Date().toISOString();
  await insert('intake_submissions',[
    {id:secureSubmissionId,workspace_id:staffWorkspace,form_id:formId,link_id:secureLinkId,status:'submitted',answers:{phone:'07700000000'},submitted_at:submittedAt},
    {id:revokeSubmissionId,workspace_id:staffWorkspace,form_id:formId,link_id:revokeLinkId,status:'submitted',answers:{phone:'07700000001'},submitted_at:submittedAt},
    {id:portalSubmissionId,workspace_id:staffWorkspace,form_id:formId,link_id:portalLinkId,status:'submitted',answers:{email:'old@example.com'},submitted_at:submittedAt},
    {id:unboundSubmissionId,workspace_id:staffWorkspace,form_id:formId,link_id:unboundLinkId,status:'submitted',answers:{email:'unbound@example.com'},submitted_at:submittedAt},
    {id:crossSubmissionId,workspace_id:clientWorkspace,form_id:clientFormId,link_id:crossLinkId,status:'submitted',answers:{phone:'07800000000'},submitted_at:submittedAt},
  ]);
  await insert('client_portal_principals',{id:principalId,workspace_id:staffWorkspace,user_id:client.id,status:'active',activated_at:new Date().toISOString(),version:1,created_by:staff.id});
  await insert('client_portal_grants',{id:grantId,workspace_id:staffWorkspace,principal_id:principalId,target_type:'transaction',transaction_id:txId,permissions:['view','message'],valid_from:new Date(Date.now()-60000).toISOString(),version:1,created_by:staff.id});
  record('real_cloud_fixture_created');

  const secureKey=uuid();
  const secureArgs={
    p_workspace_id:staffWorkspace,p_submission_id:secureSubmissionId,p_expected_submission_version:1,
    p_mode:'secure_link',p_request_kind:'information',p_requested_fields:['phone','email'],
    p_title:'استكمال البيانات',p_instructions:'يرجى تحديث الهاتف والبريد الإلكتروني',
    p_expires_in_hours:24,p_idempotency_key:secureKey,
    p_portal_principal_id:null,p_portal_transaction_id:null,p_portal_request_id:null,
  };
  const issue=await staff.client.rpc('issue_intake_followup_v1',secureArgs);
  if(issue.error)throw issue.error;
  assert(issue.data?.mode==='secure_link'&&issue.data?.status==='open','secure_followup_issued');
  assert(/^[0-9a-f]{64}$/.test(issue.data?.token??''),'secure_capability_token_shape');
  assert(issue.data?.submissionVersion===2,'secure_issue_advances_review_version');
  const secureToken=issue.data.token,secureFollowupId=issue.data.followupId;

  const replay=await staff.client.rpc('issue_intake_followup_v1',secureArgs);
  if(replay.error)throw replay.error;
  assert(replay.data?.wasDuplicate===true&&replay.data?.token===secureToken&&replay.data?.followupId===secureFollowupId,'secure_issue_idempotent_replay');

  const secondOpen=await staff.client.rpc('issue_intake_followup_v1',{...secureArgs,p_idempotency_key:uuid(),p_expected_submission_version:2});
  assertRpcError(secondOpen.error,'ENJAZ_INTAKE_FOLLOWUP_ALREADY_OPEN','second_open_followup_rejected');

  const directAnon=await publicClient.from('intake_submissions').select('id').eq('id',secureSubmissionId).maybeSingle();
  assert(Boolean(directAnon.error),'anon_cannot_select_canonical_submission');

  const publicRead=await publicClient.rpc('get_public_intake_followup_v1',{p_token:secureToken});
  if(publicRead.error)throw publicRead.error;
  assert(publicRead.data?.publicAuthority==='non_authoritative_followup_input'&&publicRead.data?.followupId===secureFollowupId,'public_capability_read_non_authoritative');

  const draft=await publicClient.rpc('save_public_intake_followup_v1',{p_token:secureToken,p_patch:{phone:'07711111111'},p_finalize:false});
  if(draft.error)throw draft.error;
  assert(draft.data?.status==='open'&&draft.data?.authoritative===false,'public_draft_is_non_authoritative');
  const beforeFinalize=await one('intake_submissions','id,version,answers,status',{id:secureSubmissionId,workspace_id:staffWorkspace});
  assert(beforeFinalize?.version===2&&beforeFinalize?.answers?.phone==='07700000000','draft_does_not_mutate_canonical_answers');

  const finalPatch={phone:'07711111111',email:'phase116b@example.com'};
  const final=await publicClient.rpc('save_public_intake_followup_v1',{p_token:secureToken,p_patch:finalPatch,p_finalize:true});
  if(final.error)throw final.error;
  assert(final.data?.status==='responded'&&final.data?.submissionVersion===3&&final.data?.authoritative===false,'secure_finalize_reconciled');
  const afterFinalize=await one('intake_submissions','id,version,answers,status',{id:secureSubmissionId,workspace_id:staffWorkspace});
  assert(afterFinalize?.version===3&&afterFinalize?.answers?.phone===finalPatch.phone&&afterFinalize?.answers?.email===finalPatch.email&&afterFinalize?.status==='under_review','secure_finalize_updates_same_submission_only');

  const finalReplay=await publicClient.rpc('save_public_intake_followup_v1',{p_token:secureToken,p_patch:finalPatch,p_finalize:true});
  if(finalReplay.error)throw finalReplay.error;
  assert(finalReplay.data?.wasDuplicate===true&&finalReplay.data?.submissionVersion===3,'secure_finalize_idempotent_replay');

  const revokeKey=uuid();
  const revokeIssue=await staff.client.rpc('issue_intake_followup_v1',{
    ...secureArgs,p_submission_id:revokeSubmissionId,p_idempotency_key:revokeKey,p_requested_fields:['phone'],p_expected_submission_version:1,
  });
  if(revokeIssue.error)throw revokeIssue.error;
  const revoke=await staff.client.rpc('revoke_intake_followup_v1',{p_workspace_id:staffWorkspace,p_followup_id:revokeIssue.data.followupId,p_expected_version:1,p_reason:'Real Cloud revocation proof'});
  if(revoke.error)throw revoke.error;
  assert(revoke.data?.status==='revoked','secure_followup_revoked');
  const revokedRead=await publicClient.rpc('get_public_intake_followup_v1',{p_token:revokeIssue.data.token});
  assertRpcError(revokedRead.error,'ENJAZ_INTAKE_FOLLOWUP_REVOKED','revoked_capability_denied');

  const cross=await staff.client.rpc('issue_intake_followup_v1',{
    ...secureArgs,p_workspace_id:clientWorkspace,p_submission_id:crossSubmissionId,p_idempotency_key:uuid(),p_requested_fields:['phone']
  });
  assertRpcError(cross.error,'ENJAZ_CRM_WORKSPACE_FORBIDDEN','cross_workspace_staff_issue_denied');

  const portalRequestId=uuid(),portalKey=uuid();
  fixtureIds.portalRequestId=portalRequestId;
  const portalIssue=await staff.client.rpc('issue_intake_followup_v1',{
    p_workspace_id:staffWorkspace,p_submission_id:portalSubmissionId,p_expected_submission_version:1,
    p_mode:'client_portal',p_request_kind:'information',p_requested_fields:['email'],
    p_title:'استكمال البريد الإلكتروني',p_instructions:'يرجى إرسال البريد الصحيح',
    p_expires_in_hours:24,p_idempotency_key:portalKey,
    p_portal_principal_id:principalId,p_portal_transaction_id:txId,p_portal_request_id:portalRequestId,
  });
  if(portalIssue.error)throw portalIssue.error;
  assert(portalIssue.data?.mode==='client_portal'&&portalIssue.data?.portalRequestId===portalRequestId&&portalIssue.data?.token===null,'portal_followup_issued_without_public_token');
  assert(portalIssue.data?.submissionVersion===2,'portal_issue_advances_review_version');

  const unbound=await staff.client.rpc('issue_intake_followup_v1',{
    p_workspace_id:staffWorkspace,p_submission_id:unboundSubmissionId,p_expected_submission_version:1,
    p_mode:'client_portal',p_request_kind:'information',p_requested_fields:['email'],
    p_title:'Unbound portal check',p_instructions:'must fail',p_expires_in_hours:24,p_idempotency_key:uuid(),
    p_portal_principal_id:principalId,p_portal_transaction_id:txId,p_portal_request_id:uuid(),
  });
  assertRpcError(unbound.error,'ENJAZ_INTAKE_FOLLOWUP_PORTAL_TRANSACTION_UNBOUND','unbound_portal_transaction_denied');

  const messageId=uuid();
  fixtureIds.messageId=messageId;
  const clientMessage=await client.client.rpc('send_client_portal_message_v1',{
    p_workspace_id:staffWorkspace,p_transaction_id:txId,p_request_id:portalRequestId,p_message_id:messageId,p_body:'البريد الصحيح portal116b@example.com'
  });
  if(clientMessage.error)throw clientMessage.error;
  assert(clientMessage.data?.requestId===portalRequestId&&clientMessage.data?.wasDuplicate===false,'client_portal_message_recorded');
  const portalRequest=await one('client_portal_requests','id,status,version,principal_id,transaction_id',{id:portalRequestId,workspace_id:staffWorkspace});
  assert(portalRequest?.status==='fulfilled'&&portalRequest?.version===2&&portalRequest?.principal_id===principalId&&portalRequest?.transaction_id===txId,'portal_request_fulfilled_by_real_client_evidence');

  const reconcile=await staff.client.rpc('reconcile_portal_intake_followup_v1',{
    p_workspace_id:staffWorkspace,p_followup_id:portalIssue.data.followupId,p_expected_followup_version:1,
    p_expected_submission_version:2,p_answer_patch:{email:'portal116b@example.com'}
  });
  if(reconcile.error)throw reconcile.error;
  assert(reconcile.data?.status==='responded'&&reconcile.data?.submissionVersion===3&&reconcile.data?.portalRequestId===portalRequestId,'portal_evidence_reconciled');
  const portalSubmission=await one('intake_submissions','id,version,answers,status',{id:portalSubmissionId,workspace_id:staffWorkspace});
  assert(portalSubmission?.version===3&&portalSubmission?.answers?.email==='portal116b@example.com'&&portalSubmission?.status==='under_review','portal_reconcile_updates_same_submission_only');

  const staffDirectUpdate=await staff.client.from('intake_submissions').update({answers:{tampered:'yes'}}).eq('id',portalSubmissionId);
  assert(Boolean(staffDirectUpdate.error),'staff_direct_submission_update_denied');
  const clientDirectInsert=await client.client.from('client_portal_messages').insert({id:uuid(),workspace_id:staffWorkspace,principal_id:principalId,transaction_id:txId,request_id:portalRequestId,body:'FORBIDDEN',actor_user_id:client.id});
  assert(Boolean(clientDirectInsert.error),'client_direct_portal_message_insert_denied');

  const audit=await admin.from('audit_events').select('action,entity_id,actor_user_id').eq('workspace_id',staffWorkspace).in('action',[
    'intake.followup.requested','intake.followup.responded','intake.followup.portal_reconciled','intake.followup.revoked','client_portal.message.sent'
  ]);
  if(audit.error)throw audit.error;
  const actions=new Set((audit.data??[]).map(x=>x.action));
  for(const action of ['intake.followup.requested','intake.followup.responded','intake.followup.portal_reconciled','intake.followup.revoked','client_portal.message.sent']){
    assert(actions.has(action),`audit_evidence_${action.replaceAll('.','_')}`);
  }
  record('real_cloud_11_6b_product_checks_complete',`${evidence.checks.length} checks`);
}catch(error){
  fatalError=error;
  console.error(error);
}finally{
  await cleanupAll();
  if(!evidence.cleanupPassed&&!fatalError)fatalError=new Error('Cleanup or zero-residue verification failed');
  await writeEvidence();
}
if(fatalError)process.exitCode=1;
