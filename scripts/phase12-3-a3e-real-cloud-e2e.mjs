import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd';
const MARKER='phase12_3_a3e_document_draft_real_cloud';
const DIR='artifacts/phase12-3-a3e-real-cloud';
const OUT=DIR+'/evidence.json';
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error('Missing '+n);return v};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const pub=env('SUPABASE_PUBLISHABLE_KEY');
const secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set();
const fixtures={companies:[],transactions:[],templates:[],versions:[],drafts:[]};
const evidence={schema:'enjaz.phase12-3-a3e-real-cloud.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log('PASS 12.3-A3E '+name+(detail?' — '+detail:''))};
const assert=(v,name,detail=null)=>{if(!v)throw new Error('ASSERTION_FAILED:'+name+(detail?':'+detail:''));pass(name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');

async function createUser(label){
  const email='enjaz-123a3e-'+label+'-'+Date.now()+'-'+uuid().slice(0,8)+'@example.com';
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
async function approve(owner,ws,proposal){
  const requestId=uuid(),decisionKey=uuid();
  const response=await edge(owner.token,{workspaceId:ws,requestId,proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,decision:'approve',decisionKey});
  assert(response.status===200&&response.data?.result?.status==='approved','explicit_document_draft_approval_recorded');
  return {requestId,decisionKey,response};
}
async function companyTransaction(ws,label){
  const companyId=uuid(),transactionId=uuid();
  let x=await admin.from('companies').insert({id:companyId,workspace_id:ws,legal_name:'شركة A3E '+label+' محدودة المسؤولية',display_name:'A3E '+label,capital:100000000,address:'العراق - بغداد',registration_number:'A3E-'+label+'-'+Date.now(),legal_status:'محدودة المسؤولية'});
  if(x.error)throw x.error;fixtures.companies.push(companyId);
  x=await admin.from('transactions').insert({id:transactionId,workspace_id:ws,company_id:companyId,type:'معاملة '+label,department:'مسجل الشركات',status:'active',priority:'normal',current_fee:250000});
  if(x.error)throw x.error;fixtures.transactions.push(transactionId);
  return {companyId,transactionId};
}
async function templateBundle(owner,ws,label,{publish=true}={}){
  const templateId=uuid(),versionId=uuid();
  const body='كتاب A3E '+label+'\nالشركة / {{company_name}}\nالمعاملة / {{transaction_type}}';
  const tokenSchema={company_name:{source:'company',field:'legal_name',required:true},transaction_type:{source:'transaction',field:'type',required:true}};
  let r=await owner.client.rpc('save_document_template_v1',{p_workspace_id:ws,p_template_id:templateId,p_name:'قالب A3E '+label,p_kind:'official-letter',p_body_source:body,p_token_schema:tokenSchema,p_active:true});
  if(r.error)throw r.error;fixtures.templates.push(templateId);
  r=await owner.client.rpc('create_document_template_version_v1',{p_workspace_id:ws,p_request_id:versionId,p_template_id:templateId,p_body_source:body,p_token_schema:tokenSchema});
  if(r.error)throw r.error;fixtures.versions.push(versionId);
  if(publish){
    r=await owner.client.rpc('publish_document_template_version_v1',{p_workspace_id:ws,p_version_id:versionId});
    if(r.error)throw r.error;
    assert(r.data?.state==='published','template_version_published',label);
  }
  return {templateId,versionId,body,tokenSchema};
}
async function setTemplateActive(owner,ws,t,active){
  const r=await owner.client.rpc('save_document_template_v1',{p_workspace_id:ws,p_template_id:t.templateId,p_name:'قالب A3E rollback',p_kind:'official-letter',p_body_source:t.body,p_token_schema:t.tokenSchema,p_active:active});
  if(r.error)throw r.error;
  return r.data;
}
async function draftByRequest(ws,generationRequestId){
  const {data,error}=await admin.from('document_drafts')
    .select('id,workspace_id,template_version_id,transaction_id,company_id,title,compiled_content,status,generation_request_id,approved_at,final_document_id,final_document_version_id,finalized_at,provenance,fact_snapshot')
    .eq('workspace_id',ws).eq('generation_request_id',generationRequestId).maybeSingle();
  if(error)throw error;return data;
}
async function count(table,ws){
  const {count,error}=await admin.from(table).select('id',{head:true,count:'exact'}).eq('workspace_id',ws);
  if(error)throw error;return count??0;
}

async function run(){
  const owner=await signIn(await createUser('owner'));
  const outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner),other=await workspace(outsider);
  assert(ws!==other,'fresh_workspace_isolation');

  const primary=await companyTransaction(ws,'PRIMARY');
  await companyTransaction(other,'FOREIGN');
  const published=await templateBundle(owner,ws,'PUBLISHED',{publish:true});
  const unpublished=await templateBundle(owner,ws,'UNPUBLISHED',{publish:false});
  const rollbackTemplate=await templateBundle(owner,ws,'ROLLBACK',{publish:true});

  const before={drafts:await count('document_drafts',ws),jobs:await count('pdf_jobs',ws),documents:await count('documents',ws)};
  const otherBefore=await count('document_drafts',other);

  const unpublishedPrepare=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'prepare_document_draft',generationRequestId:uuid(),templateVersionId:unpublished.versionId,title:'مسودة غير منشورة',companyId:primary.companyId,transactionId:primary.transactionId});
  assert(unpublishedPrepare.status===404&&unpublishedPrepare.data?.error?.code==='ENJAZ_DOCUMENT_FACTORY_PUBLISHED_TEMPLATE_VERSION_REQUIRED','prepare_requires_published_template_version');

  const injectBase={workspaceId:ws,requestId:uuid(),operation:'prepare_document_draft',generationRequestId:uuid(),templateVersionId:published.versionId,title:'مسودة آمنة',companyId:primary.companyId,transactionId:primary.transactionId};
  for(const [field,value,name] of [
    ['contactId',uuid(),'contact_injection_denied'],
    ['ocrAnalysisId',uuid(),'ocr_injection_denied'],
    ['decision','approve','review_injection_denied'],
    ['renderJobId',uuid(),'render_injection_denied'],
    ['finalize',true,'finalize_injection_denied']
  ]){
    const response=await edge(owner.token,{...injectBase,requestId:uuid(),[field]:value});
    assert(response.status===400&&response.data?.error?.code==='ACTION_FIELD_FORBIDDEN',name);
  }

  const direct=await owner.client.rpc('copilot_register_document_draft_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'a'.repeat(64),
    p_generation_request_id:uuid(),p_template_version_id:published.versionId,p_title:'ممنوع مباشر',
    p_company_id:primary.companyId,p_transaction_id:primary.transactionId,p_expires_at:new Date(Date.now()+10*60*1000).toISOString()
  });
  assert(Boolean(direct.error),'browser_document_draft_registration_denied');

  const mismatch=await admin.rpc('copilot_register_document_draft_proposal_v1',{
    p_workspace_id:ws,p_actor_user_id:owner.id,p_request_id:uuid(),p_proposal_hash:'0'.repeat(64),
    p_generation_request_id:uuid(),p_template_version_id:published.versionId,p_title:'تدقيق الهاش',
    p_company_id:primary.companyId,p_transaction_id:primary.transactionId,p_expires_at:new Date(Date.now()+10*60*1000).toISOString()
  });
  assert(Boolean(mismatch.error)&&errText(mismatch.error).includes('ENJAZ_COPILOT_ACTION_HASH_CONFLICT'),'database_recomputes_document_draft_hash');

  const generationRequestId=uuid(),prepareId=uuid(),title='مسودة كتاب رسمي — A3E';
  const prepared=await edge(owner.token,{workspaceId:ws,requestId:prepareId,operation:'prepare_document_draft',generationRequestId,templateVersionId:published.versionId,title,companyId:primary.companyId,transactionId:primary.transactionId});
  assert(prepared.status===200&&prepared.data?.schema==='enjaz.copilot.agent.action.v1','document_draft_prepare_structured_success',String(prepared.status)+':'+String(prepared.data?.error?.code??'NO_CODE'));
  const proposal=prepared.data?.result;
  assert(proposal?.status==='pending_approval'&&proposal?.action?.kind==='document.draft','document_draft_prepare_is_approval_gated');
  assert(proposal?.action?.outputStatus==='review_required'&&proposal?.action?.contactId===null&&proposal?.action?.ocrAnalysisId===null,'document_draft_prepare_hard_locks_review_required_only');
  assert(proposal?.action?.generationRequestId===generationRequestId&&proposal?.action?.templateVersionId===published.versionId,'document_draft_exact_generation_template_bound');
  assert(proposal?.action?.companyId===primary.companyId&&proposal?.action?.transactionId===primary.transactionId&&proposal?.action?.title===title,'document_draft_exact_business_inputs_bound');
  assert(proposal?.executionAllowed===false&&proposal?.genericWriteToolAllowed===false,'document_draft_prepare_no_execution_authority');

  const prepareReplay=await edge(owner.token,{workspaceId:ws,requestId:prepareId,operation:'prepare_document_draft',generationRequestId,templateVersionId:published.versionId,title,companyId:primary.companyId,transactionId:primary.transactionId});
  assert(prepareReplay.status===200&&prepareReplay.data?.result?.proposalId===proposal.proposalId&&prepareReplay.data?.result?.replayed===true,'document_draft_prepare_exact_replay_idempotent');

  const beforeApproval=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()});
  assert(beforeApproval.status===409&&beforeApproval.data?.error?.code==='ENJAZ_COPILOT_ACTION_APPROVAL_REQUIRED','document_draft_execution_before_approval_denied');
  assert((await draftByRequest(ws,generationRequestId))===null,'before_document_draft_approval_zero_mutation');

  const cross=await edge(outsider.token,{workspaceId:ws,requestId:uuid(),operation:'prepare_document_draft',generationRequestId:uuid(),templateVersionId:published.versionId,title:'محاولة عابرة',companyId:primary.companyId,transactionId:primary.transactionId});
  assert(cross.status===403&&cross.data?.error?.code==='ENJAZ_COPILOT_WORKSPACE_FORBIDDEN','cross_workspace_document_draft_prepare_denied');

  const tampered=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:'f'.repeat(64),executionKey:uuid()});
  assert(tampered.status===409&&tampered.data?.error?.code==='ENJAZ_COPILOT_PROPOSAL_HASH_CONFLICT','tampered_document_draft_hash_denied');

  const executionInjection=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid(),title:'mutated'});
  assert(executionInjection.status===400&&executionInjection.data?.error?.code==='ACTION_FIELD_FORBIDDEN','document_draft_execution_business_field_injection_denied');

  await approve(owner,ws,proposal);
  const executionKey=uuid(),executionRequestId=uuid();
  const executed=await edge(owner.token,{workspaceId:ws,requestId:executionRequestId,operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey});
  assert(executed.status===200&&executed.data?.result?.actionKind==='document.draft','approved_document_draft_executes');
  assert(executed.data?.result?.domainAuthority==='generate_document_draft_v1','document_draft_delegates_existing_m7_authority');
  assert(executed.data?.result?.generationRequestId===generationRequestId&&executed.data?.result?.templateVersionId===published.versionId,'document_draft_executes_exact_generation_template');
  assert(executed.data?.result?.companyId===primary.companyId&&executed.data?.result?.transactionId===primary.transactionId&&executed.data?.result?.title===title,'document_draft_executes_exact_business_inputs');
  assert(executed.data?.result?.contactId===null&&executed.data?.result?.ocrAnalysisId===null&&executed.data?.result?.draftStatus==='review_required','document_draft_execution_stops_before_human_review');

  const row=await draftByRequest(ws,generationRequestId);
  assert(row?.workspace_id===ws&&row?.template_version_id===published.versionId&&row?.company_id===primary.companyId&&row?.transaction_id===primary.transactionId,'canonical_document_draft_exact_scope');
  assert(row?.status==='review_required'&&row?.approved_at===null&&row?.final_document_id===null&&row?.final_document_version_id===null&&row?.finalized_at===null,'canonical_document_draft_review_required_only');
  assert(row?.title===title&&row?.compiled_content?.includes('شركة A3E PRIMARY')&&row?.compiled_content?.includes('معاملة PRIMARY'),'canonical_document_draft_authoritative_facts_compiled');
  assert(row?.provenance?.input?.requestedContactId===null&&row?.provenance?.input?.ocrAnalysisId===null,'canonical_document_draft_contact_ocr_null');
  fixtures.drafts.push(row.id);
  assert((await count('document_drafts',ws))===before.drafts+1,'exactly_one_document_draft_created');
  assert((await count('pdf_jobs',ws))===before.jobs&&(await count('documents',ws))===before.documents,'no_render_or_vault_side_effect');

  const replay=await edge(owner.token,{workspaceId:ws,requestId:executionRequestId,operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey});
  assert(replay.status===200&&replay.data?.result?.replayed===true,'document_draft_execution_exact_replay_idempotent');
  assert((await count('document_drafts',ws))===before.drafts+1,'document_draft_replay_no_duplicate_draft');

  const secondKey=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'execute_document_draft',proposalId:proposal.proposalId,proposalHash:proposal.proposalHash,executionKey:uuid()});
  assert(secondKey.status===409&&secondKey.data?.error?.code==='ENJAZ_COPILOT_EXECUTION_REPLAY_CONFLICT','document_draft_single_use_execution_enforced');

  const rollbackGenerationId=uuid();
  const rollbackPrepared=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'prepare_document_draft',generationRequestId:rollbackGenerationId,templateVersionId:rollbackTemplate.versionId,title:'مسودة rollback',companyId:primary.companyId,transactionId:primary.transactionId});
  assert(rollbackPrepared.status===200&&rollbackPrepared.data?.result?.proposalId,'document_draft_rollback_proposal_prepared');
  const rollbackApproval=await approve(owner,ws,rollbackPrepared.data.result);
  await setTemplateActive(owner,ws,rollbackTemplate,false);
  const failed=await edge(owner.token,{workspaceId:ws,requestId:uuid(),operation:'execute_document_draft',proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,executionKey:uuid()});
  assert(failed.status===404&&failed.data?.error?.code==='ENJAZ_DOCUMENT_FACTORY_TEMPLATE_INACTIVE','document_draft_domain_failure_propagates');
  assert((await draftByRequest(ws,rollbackGenerationId))===null,'document_draft_domain_failure_zero_business_mutation');

  const approvalReplay=await edge(owner.token,{workspaceId:ws,requestId:rollbackApproval.requestId,proposalId:rollbackPrepared.data.result.proposalId,proposalHash:rollbackPrepared.data.result.proposalHash,decision:'approve',decisionKey:rollbackApproval.decisionKey});
  assert(approvalReplay.status===200&&approvalReplay.data?.result?.status==='approved'&&approvalReplay.data?.result?.replayed===true,'document_draft_domain_failure_rolls_back_consumption');

  assert((await count('document_drafts',other))===otherBefore,'foreign_workspace_zero_document_draft_mutation');
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
    const tableMap={companies:'companies',transactions:'transactions',templates:'document_templates',versions:'document_template_versions',drafts:'document_drafts'};
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
