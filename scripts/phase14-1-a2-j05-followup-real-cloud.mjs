import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const LAB='nqhgaukutkyvfumbtbtg',PROD='juzxriirhkuzviwnhkbd';
const MARKER='phase14_1_a2_j05_followup_real_cloud';
const OUT='artifacts/phase14-1-a2-j05-followup/evidence.json';
const env=n=>{const x=process.env[n]?.trim();if(!x)throw new Error('MISSING_'+n);return x;};
const url=env('SUPABASE_URL'),pub=env('SUPABASE_PUBLISHABLE_KEY'),key=env('SUPABASE_SECRET_KEY');
if(env('ENJAZ_A2_BRANCH_REF')!==LAB||url!==`https://${LAB}.supabase.co`||
   process.env.PRODUCTION_PROJECT_REF!==PROD||
   process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||
   process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES'||
   key===pub||key.startsWith('sb_publishable_'))throw Error('J05_ISOLATED_TARGET_DENIED');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,key,options),make=()=>createClient(url,pub,options);
const users=[],checks=[];
const evidence={schema:'enjaz.phase14-1.a2.j05-transaction-followup.v1',
 projectRef:LAB,productionProjectRef:PROD,scope:['J01_COMPANY','J02_TRANSACTION','J05_FOLLOWUP'],
 linkedJ03J04:false,completeElevenDomainA2:false,phase14_1Closed:false,
 passed:false,cleanupPassed:false,checks,cleanup:[],startedAt:new Date().toISOString()};
const verify=(ok,name)=>{if(!ok)throw Error('FAILED_'+name);checks.push(name);console.log('PASS J05 '+name);};
const count=async(table,ws=null)=>{
 let query=admin.from(table).select('*',{head:true,count:'exact'});
 if(ws)query=query.eq('workspace_id',ws);
 const {count:n,error}=await query;
 if(error||!Number.isInteger(n))throw Error('COUNT_DENIED_'+table);
 return n;
};
async function createUser(label){
 const email=`enjaz-j05-${label}-${randomUUID()}@example.com`,password='Enjaz!14.1-'+randomUUID()+'Aa9';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,
  user_metadata:{enjaz_test_marker:MARKER,label}});
 if(created.error||!created.data?.user?.id)throw Error('AUTH_CREATE_FAILED');
 const user={id:created.data.user.id,email,password,client:make()};users.push(user);
 const login=await user.client.auth.signInWithPassword({email,password});
 if(login.error||!login.data?.session?.access_token)throw Error('REAL_SIGNIN_FAILED');
 let ws=[];
 for(let i=0;i<40;i++){
  const result=await admin.from('workspaces').select('id').eq('owner_user_id',user.id).limit(2);
  if(result.error)throw Error('BOOTSTRAP_READ_DENIED');
  ws=result.data??[];if(ws.length===1)break;
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 verify(ws.length===1,label+'_PERSONAL_WORKSPACE');
 user.ws=ws[0].id;return user;
}
const createParams=(ws,tx,id,due,title)=>({
 p_workspace_id:ws,p_transaction_id:tx,p_followup_id:id,p_title:title,p_due_at:due
});
const stateParams=(ws,id,action,snooze=null)=>({
 p_workspace_id:ws,p_followup_id:id,p_action:action,p_snoozed_until:snooze
});
async function test(){
 const prior=await admin.auth.admin.listUsers({page:1,perPage:1000});
 if(prior.error||!prior.data?.users)throw Error('BASELINE_AUTH_DENIED');
 verify(prior.data.users.length===0&&
  (await Promise.all(['workspaces','companies','transactions','transaction_followups'].map(count))).every(x=>x===0),
  'EXCLUSIVE_EMPTY_ISOLATED_LAB');
 const owner=await createUser('owner'),outsider=await createUser('outsider'),ws=owner.ws;
 verify(ws!==outsider.ws,'DISTINCT_OWNER_OUTSIDER_WORKSPACES');
 const company=await owner.client.from('companies').insert({
  workspace_id:ws,legal_name:'شركة J05 المختبرية',capital:120.50
 }).select('id').single();
 if(company.error||!company.data?.id)throw Error('OWNER_COMPANY_CREATE_FAILED');
 const tx=await owner.client.from('transactions').insert({
  workspace_id:ws,company_id:company.data.id,type:'J05_LIVE_FOLLOWUP',current_fee:135.25
 }).select('id,workspace_id,company_id').single();
 verify(!tx.error&&tx.data?.company_id===company.data.id&&tx.data?.workspace_id===ws,
  'OWNER_J01_J02_REAL_TRANSACTION_LINEAGE');
 const id=randomUUID(),due=new Date(Date.now()+2*86400000).toISOString();
 const args=createParams(ws,tx.data.id,id,due,'J05 linked followup');
 const denied=await outsider.client.rpc('create_transaction_followup_v1',args);
 verify(Boolean(denied.error)&&await count('transaction_followups',ws)===0,
  'OUTSIDER_CANNOT_CREATE_OWNER_FOLLOWUP');
 const first=await owner.client.rpc('create_transaction_followup_v1',args);
 verify(!first.error&&first.data?.followupId===id&&first.data?.transactionId===tx.data.id&&
  first.data?.status==='open','OWNER_AUTHENTICATED_TRANSACTION_FOLLOWUP_CREATED');
 const fresh=make(),login=await fresh.auth.signInWithPassword({email:owner.email,password:owner.password});
 if(login.error||!login.data?.session?.access_token)throw Error('FRESH_AUTH_FAILED');
 const again=await fresh.rpc('create_transaction_followup_v1',args);
 verify(!again.error&&again.data?.followupId===id&&await count('transaction_followups',ws)===1,
  'SAME_ID_REPLAY_ONE_DURABLE_FOLLOWUP');
 const conflict=await owner.client.rpc('create_transaction_followup_v1',{...args,p_title:'changed payload'});
 verify(Boolean(conflict.error)&&await count('transaction_followups',ws)===1,
  'SAME_ID_DIFFERENT_PAYLOAD_DENIED');
 const [reloaded,foreign]=await Promise.all([
  fresh.from('transaction_followups').select('id,workspace_id,transaction_id,status')
   .eq('id',id).single(),
  outsider.client.from('transaction_followups').select('id').eq('id',id)
 ]);
 verify(!reloaded.error&&reloaded.data?.id===id&&reloaded.data?.workspace_id===ws&&
  reloaded.data?.transaction_id===tx.data.id&&reloaded.data?.status==='open'&&
  (foreign.error||foreign.data?.length===0),'FRESH_JWT_SOURCE_READ_AND_OUTSIDER_RLS');
 const foreignMutate=await outsider.client.rpc('mutate_transaction_followup_state_v1',
  stateParams(ws,id,'complete'));
 verify(Boolean(foreignMutate.error),'OUTSIDER_CANNOT_COMPLETE_OWNER_FOLLOWUP');
 const until=new Date(Date.now()+3*86400000).toISOString();
 const snoozed=await owner.client.rpc('mutate_transaction_followup_state_v1',
  stateParams(ws,id,'snooze',until));
 verify(!snoozed.error&&snoozed.data?.status==='open'&&Boolean(snoozed.data?.snoozedUntil),
  'OWNER_SNOOZE_LINKED_FOLLOWUP');
 const woke=await fresh.rpc('mutate_transaction_followup_state_v1',stateParams(ws,id,'wake'));
 verify(!woke.error&&woke.data?.status==='open'&&woke.data?.snoozedUntil===null,
  'FRESH_JWT_WAKE_FOLLOWUP');
 const completed=await owner.client.rpc('mutate_transaction_followup_state_v1',
  stateParams(ws,id,'complete'));
 verify(!completed.error&&completed.data?.status==='completed'&&completed.data?.completedBy===owner.id,
  'OWNER_COMPLETION');
 const duplicate=await fresh.rpc('mutate_transaction_followup_state_v1',stateParams(ws,id,'complete'));
 verify(Boolean(duplicate.error)&&await count('transaction_followups',ws)===1,
  'TERMINAL_SECOND_COMPLETION_DENIED');
 const final=await fresh.from('transaction_followups')
  .select('id,workspace_id,transaction_id,status,completed_by,completed_at').eq('id',id).single();
 verify(!final.error&&final.data?.workspace_id===ws&&final.data?.transaction_id===tx.data.id&&
  final.data?.status==='completed'&&final.data?.completed_by===owner.id&&Boolean(final.data?.completed_at),
  'DURABLE_J01_J02_J05_SAME_SOURCE');
}
async function cleanup(){
 let ok=true;
 for(const user of users){
  try{
   const r=await admin.from('workspaces').select('id').eq('owner_user_id',user.id).limit(2);
   if(r.error||(r.data?.length??0)>1)throw Error('AMBIGUOUS_WORKSPACE');
   for(const ws of r.data??[]){
    const d=await admin.from('workspaces').delete().eq('id',ws.id).eq('owner_user_id',user.id).select('id');
    if(d.error||d.data?.length!==1)throw Error('MARKED_WORKSPACE_DELETE_DENIED');
   }
   evidence.cleanup.push({kind:'marked_workspace',passed:true});
  }catch{ok=false;evidence.cleanup.push({kind:'marked_workspace',passed:false});}
 }
 for(const user of users){
  try{
   const r=await admin.auth.admin.deleteUser(user.id,false);
   if(r.error)throw Error('MARKED_AUTH_DELETE_DENIED');
   evidence.cleanup.push({kind:'marked_auth_user',passed:true});
  }catch{ok=false;evidence.cleanup.push({kind:'marked_auth_user',passed:false});}
 }
 try{
  const result=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(result.error||result.data?.users?.some(u=>u.user_metadata?.enjaz_test_marker===MARKER)||
   (await Promise.all(['workspaces','companies','transactions','transaction_followups'].map(count))).some(x=>x!==0))
   throw Error('MARKED_FIXTURE_RESIDUE');
  evidence.cleanup.push({kind:'independent_zero_residue',passed:true});
 }catch{ok=false;evidence.cleanup.push({kind:'independent_zero_residue',passed:false});}
 evidence.cleanupPassed=ok;
}
let failure=null;
try{await test();}catch(e){failure=String(e?.message??'UNKNOWN').slice(0,110);console.error('J05_TEST_FAILED',failure);}
finally{
 await cleanup();evidence.completedAt=new Date().toISOString();
 evidence.passed=failure===null&&evidence.cleanupPassed;
 if(failure)evidence.failureCode=failure;
 await mkdir('artifacts/phase14-1-a2-j05-followup',{recursive:true});
 await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n');
}
if(failure||!evidence.cleanupPassed)process.exitCode=1;
