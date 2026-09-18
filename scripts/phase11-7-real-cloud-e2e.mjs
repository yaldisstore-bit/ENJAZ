import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd',MARKER='phase11_7_real_cloud_e2e',DIR='artifacts/phase11-7-real-cloud',OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,''),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_'))throw new Error('Real Cloud safety guard failed');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],workspaces=new Set();
const evidence={schema:'enjaz.phase11-7-real-cloud-e2e.v1',projectRef:REF,startedAt:new Date().toISOString(),completedAt:null,passed:false,systems:{M4:[],M10:[]},cleanup:[],cleanupPassed:false};
let fatal=null;
const uuid=()=>crypto.randomUUID(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(system,name,detail=null)=>{evidence.systems[system].push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS ${system} ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,system,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${system}:${name}${detail?`:${detail}`:''}`);pass(system,name,detail)};
const errText=e=>String(e?.message??e?.details??e?.hint??e?.code??'');
const errHas=(e,m)=>errText(e).includes(m);

async function createUser(label){
 const email=`enjaz-117-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`,password=`EnjAZ!${uuid()}Aa9`;
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
 if(error||!data.user)throw error??new Error('createUser failed');
 const x={id:data.user.id,email,password,client:make(),token:null,label};users.push(x);return x;
}
async function signIn(x){const{data,error}=await x.client.auth.signInWithPassword({email:x.email,password:x.password});if(error||!data.session?.access_token)throw error??new Error('signIn failed');x.token=data.session.access_token;return x}
async function workspace(userId){
 for(let i=0;i<40;i++){const{data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);if(error)throw error;if(data?.length===1){workspaces.add(data[0].id);return data[0].id}await sleep(250)}
 throw new Error('workspace bootstrap timeout');
}
async function insert(table,row){const{error}=await admin.from(table).insert(row);if(error)throw new Error(`${table}: ${error.message}`)}
async function updateWorkspaceTimezone(ws){const{error}=await admin.from('workspaces').update({timezone:'Asia/Baghdad'}).eq('id',ws);if(error)throw error}
function dateAtUtcNine(days){
 const d=new Date(Date.now()+days*86400000);d.setUTCHours(9,0,0,0);return d;
}

async function runM4(){
 const staff=await signIn(await createUser('m4-staff')),outsider=await signIn(await createUser('m4-outsider'));
 const ws=await workspace(staff.id),other=await workspace(outsider.id);
 assert(ws!==other,'M4','fresh_workspace_isolation');

 const company=uuid(),contact=uuid(),tx=uuid(),provider=uuid(),standard=uuid(),sensitive=uuid();
 const fp='a'.repeat(64),missing='b'.repeat(64);
 await insert('companies',{id:company,workspace_id:ws,legal_name:'__ENJAZ_117_M4_COMPANY__',status:'active'});
 await insert('contacts',{id:contact,workspace_id:ws,display_name:'__ENJAZ_117_M4_CONTACT__',contact_type:'client',email:'phase117@example.invalid',status:'active'});
 await insert('transactions',{id:tx,workspace_id:ws,company_id:company,primary_contact_id:contact,type:'Phase 11.7 M4 probe',status:'active',priority:'normal',current_fee:1});
 await insert('communication_provider_accounts',{id:provider,workspace_id:ws,channel:'email',provider:'phase117_probe',external_account_ref:'phase117-real-cloud',display_name:'Phase 11.7 Probe',capabilities:['send','receive','delivery_receipts'],enabled:true,created_by:staff.id});
 await insert('communication_channel_consents',{workspace_id:ws,contact_id:contact,channel:'email',endpoint_fingerprint:fp,status:'granted',source:'phase117_probe',updated_by:staff.id});
 await insert('communication_endpoint_bindings',{workspace_id:ws,provider_account_id:provider,endpoint_fingerprint:fp,company_id:company,contact_id:contact,transaction_id:tx,source:'explicit',created_by:staff.id});
 pass('M4','fresh_workspace_fixture_created');

 const direct=await staff.client.from('communication_outbound_commands').select('id').limit(1);
 assert(Boolean(direct.error),'M4','direct_support_table_read_denied');

 const saveStd=await staff.client.rpc('save_communication_template_v1',{p_workspace_id:ws,p_template_id:standard,p_expected_version:null,p_channel:'email',p_name:'Phase 11.7 Standard',p_subject_template:null,p_body_template:'Hello {{name}}',p_sensitivity:'standard',p_active:true});
 if(saveStd.error)throw saveStd.error;
 const saveSensitive=await staff.client.rpc('save_communication_template_v1',{p_workspace_id:ws,p_template_id:sensitive,p_expected_version:null,p_channel:'email',p_name:'Phase 11.7 Sensitive',p_subject_template:'Sensitive subject',p_body_template:'Sensitive body {{name}}',p_sensitivity:'sensitive',p_active:true});
 if(saveSensitive.error)throw saveSensitive.error;
 assert(saveStd.data?.version===1&&saveSensitive.data?.version===1,'M4','governed_templates_created');

 const denied=await staff.client.rpc('prepare_communication_outbound_v1',{p_workspace_id:ws,p_provider_account_id:provider,p_idempotency_key:'phase117-consent-denied',p_endpoint_fingerprint:missing,p_contact_id:contact,p_transaction_id:tx,p_conversation_id:null,p_template_id:standard,p_template_version:1,p_subject:null,p_body_text:'Denied body',p_summary:'Denied',p_document_ids:[]});
 assert(errHas(denied.error,'ENJAZ_COMMUNICATION_CONSENT_REQUIRED'),'M4','missing_consent_fails_closed',errText(denied.error));

 const args={p_workspace_id:ws,p_provider_account_id:provider,p_idempotency_key:'phase117-standard',p_endpoint_fingerprint:fp,p_contact_id:contact,p_transaction_id:tx,p_conversation_id:null,p_template_id:standard,p_template_version:1,p_subject:null,p_body_text:'Hello Probe',p_summary:'Phase 11.7',p_document_ids:[]};
 const first=await staff.client.rpc('prepare_communication_outbound_v1',args);if(first.error)throw first.error;
 const dup=await staff.client.rpc('prepare_communication_outbound_v1',args);if(dup.error)throw dup.error;
 assert(first.data?.status==='queued'&&Boolean(first.data?.attemptId),'M4','standard_outbound_governed');
 assert(dup.data?.wasDuplicate===true&&dup.data?.communicationId===first.data?.communicationId&&dup.data?.attemptId===first.data?.attemptId,'M4','duplicate_outbound_idempotent');

 const sensitivePrepare=await staff.client.rpc('prepare_communication_outbound_v1',{...args,p_idempotency_key:'phase117-sensitive',p_template_id:sensitive,p_subject:'Sensitive subject',p_body_text:'Sensitive body Probe'});
 if(sensitivePrepare.error)throw sensitivePrepare.error;
 assert(sensitivePrepare.data?.status==='awaiting_approval'&&sensitivePrepare.data?.approvalStatus==='pending'&&!sensitivePrepare.data?.attemptId,'M4','sensitive_outbound_requires_approval');
 const approved=await staff.client.rpc('decide_communication_outbound_v1',{p_workspace_id:ws,p_command_id:sensitivePrepare.data.commandId,p_expected_version:sensitivePrepare.data.version,p_decision:'approve',p_reason:'Phase 11.7 certificate'});
 if(approved.error)throw approved.error;
 assert(approved.data?.status==='queued'&&approved.data?.approvalStatus==='approved'&&Boolean(approved.data?.attemptId),'M4','sensitive_outbound_governed_approval');

 const foreign=await outsider.client.rpc('prepare_communication_outbound_v1',{...args,p_idempotency_key:'phase117-foreign'});
 assert(errHas(foreign.error,'ENJAZ_COMMUNICATION_WORKSPACE_FORBIDDEN'),'M4','cross_workspace_command_denied',errText(foreign.error));

 const response=await fetch(`${url}/functions/v1/enjaz-communications`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workspaceId:ws,commandId:first.data.commandId})});
 assert(response.status===401,'M4','edge_dispatch_requires_internal_auth',String(response.status));
 const after=await admin.from('communications').select('status').eq('id',first.data.communicationId).single();
 if(after.error)throw after.error;
 assert(after.data?.status==='queued','M4','unauthorized_dispatch_did_not_forge_delivery');
}

async function runM10(){
 const staff=await signIn(await createUser('m10-staff')),outsider=await signIn(await createUser('m10-outsider'));
 const ws=await workspace(staff.id),other=await workspace(outsider.id);await updateWorkspaceTimezone(ws);
 assert(ws!==other,'M10','fresh_workspace_isolation');
 const member=uuid(),event=uuid(),op=uuid();
 await insert('organization_members',{id:member,workspace_id:ws,user_id:staff.id,status:'active',valid_from:new Date(Date.now()-86400000).toISOString(),valid_until:null,created_by:staff.id});

 const start=dateAtUtcNine(7),end=new Date(start.getTime()+3600000);
 const direct=await staff.client.from('calendar_events').insert({id:uuid(),workspace_id:ws,title:'FORBIDDEN DIRECT',event_type:'review',starts_at:start.toISOString(),ends_at:end.toISOString(),status:'scheduled',version:1});
 assert(Boolean(direct.error),'M10','direct_calendar_write_denied');

 const args={p_workspace_id:ws,p_event_id:event,p_operation_id:op,p_title:'Phase 11.7 durable appointment',p_event_type:'review',p_starts_at:start.toISOString(),p_ends_at:end.toISOString(),p_transaction_id:null,p_company_id:null,p_contact_id:null,p_workflow_instance_id:null,p_staff_member_ids:[member],p_note:'Phase 11.7 Real Cloud'};
 const created=await staff.client.rpc('create_calendar_event_v1',args);if(created.error)throw created.error;
 assert(created.data?.schema==='enjaz.scheduling-calendar-event.v2'&&created.data?.version===1&&created.data?.status==='scheduled','M10','governed_calendar_create');
 const replay=await staff.client.rpc('create_calendar_event_v1',args);if(replay.error)throw replay.error;
 assert(replay.data?.wasDuplicate===true&&replay.data?.version===1,'M10','calendar_create_idempotent');

 const stale=await staff.client.rpc('reschedule_calendar_event_v1',{p_workspace_id:ws,p_event_id:event,p_operation_id:uuid(),p_expected_version:99,p_starts_at:new Date(start.getTime()+86400000).toISOString(),p_ends_at:new Date(end.getTime()+86400000).toISOString(),p_reason:'Expected stale rejection'});
 assert(errHas(stale.error,'ENJAZ_SCHEDULING_STALE_VERSION'),'M10','stale_target_rejected',errText(stale.error));

 const newStart=new Date(start.getTime()+86400000),newEnd=new Date(end.getTime()+86400000);
 const recovered=await staff.client.rpc('reschedule_calendar_event_v1',{p_workspace_id:ws,p_event_id:event,p_operation_id:uuid(),p_expected_version:1,p_starts_at:newStart.toISOString(),p_ends_at:newEnd.toISOString(),p_reason:'Recover with current version'});
 if(recovered.error)throw recovered.error;
 assert(recovered.data?.version===2&&recovered.data?.startsAt===newStart.toISOString(),'M10','stale_recovery_committed');

 const anchor=newStart.toISOString().slice(0,10);
 const view=await staff.client.rpc('list_unified_calendar_v2',{p_workspace_id:ws,p_anchor_date:anchor,p_view:'day',p_source:'appointment',p_staff_member_id:member,p_company_id:null,p_transaction_id:null,p_limit:100});
 if(view.error)throw view.error;
 const item=(view.data?.items??[]).find(x=>x.id===event);
 assert(view.data?.workspaceTimezone==='Asia/Baghdad'&&item?.authority==='calendar_events'&&item?.rescheduleCount===1,'M10','baghdad_timezone_durable_projection');

 const foreign=await outsider.client.rpc('list_unified_calendar_v2',{p_workspace_id:ws,p_anchor_date:anchor,p_view:'day',p_source:'all',p_staff_member_id:null,p_company_id:null,p_transaction_id:null,p_limit:100});
 assert(errHas(foreign.error,'ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN'),'M10','cross_workspace_calendar_denied',errText(foreign.error));

 const persisted=await admin.from('private.scheduling_command_receipts').select('operation_id').eq('workspace_id',ws).eq('operation_id',op);
 if(persisted.error)throw persisted.error;
 assert(persisted.data?.length===1,'M10','durable_command_receipt_single');
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
  evidence.cleanup.push({kind:'zero_residue',passed:true});
 }catch(e){ok=false;evidence.cleanup.push({kind:'zero_residue',passed:false,error:String(e)})}
 evidence.cleanupPassed=ok;
}
async function save(){await mkdir(DIR,{recursive:true});evidence.completedAt=new Date().toISOString();evidence.passed=!fatal&&evidence.cleanupPassed;if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8')}

try{await runM4();await runM10()}catch(e){fatal=e;console.error(e)}finally{await cleanup();await save()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
