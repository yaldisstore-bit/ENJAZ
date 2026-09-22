import {createClient} from '@supabase/supabase-js';
import crypto from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const OUT='artifacts/phase14-2-a3-hosted/evidence.json';
const MARKER='phase14_2_a3_hosted_auth_rls';
const required=name=>{const v=process.env[name]?.trim();if(!v)throw new Error('MISSING_'+name);return v};
const productionRef=required('PRODUCTION_PROJECT_REF');
const branchRef=required('ENJAZ_A3_BRANCH_REF');
const url=required('SUPABASE_URL').replace(/\/$/,'');
const publishable=required('SUPABASE_PUBLISHABLE_KEY');
const secret=required('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES' ||
   process.env.ENJAZ_A3_ISOLATED_BRANCH_CONFIRM!=='YES' ||
   branchRef===productionRef ||
   !/^[a-z0-9]{20}$/.test(branchRef) ||
   url!==`https://${branchRef}.supabase.co` ||
   secret===publishable ||
   secret.startsWith('sb_publishable_')) {
  throw new Error('PHASE14_2_A3_TARGET_DENIED');
}

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,publishable,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[];
const workspaces=[];
const fixtureIds=[];
const evidence={schema:'enjaz.phase14-2.a3.hosted.v1',projectRef:branchRef,productionRef,startedAt:new Date().toISOString(),checks:[],cleanup:[],passed:false,cleanupPassed:false};
const pass=name=>{evidence.checks.push({name,passed:true});console.log('PASS 14.2 A3 '+name)};
const ensure=(condition,name)=>{if(!condition)throw new Error('FAILED_'+name);pass(name)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function createUser(label){
  const email=`enjaz-a3-${label}-${Date.now()}-${crypto.randomUUID().slice(0,8)}@example.com`;
  const password='Enjaz!14.2-'+crypto.randomUUID()+'Aa9';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER,label}});
  if(error||!data?.user)throw error??new Error('CREATE_USER_FAILED');
  const client=make();
  const login=await client.auth.signInWithPassword({email,password});
  if(login.error||!login.data.session?.access_token)throw login.error??new Error('SIGNIN_FAILED');
  const user={id:data.user.id,email,password,label,client};
  users.push(user);
  return user;
}

async function workspaceFor(user){
  for(let i=0;i<60;i++){
    const {data,error}=await admin.from('workspaces').select('id,owner_user_id').eq('owner_user_id',user.id).limit(2);
    if(error)throw error;
    if(data?.length===1){workspaces.push(data[0].id);return data[0].id}
    await sleep(250);
  }
  throw new Error('WORKSPACE_BOOTSTRAP_TIMEOUT');
}

async function verifyZeroResidue(){
  let ok=true;
  const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError){
    ok=false;
    evidence.cleanup.push({check:'auth_marker_absent',passed:false,error:listError.message});
  } else {
    const marked=(list?.users||[]).filter(u=>u.user_metadata?.enjaz_test_marker===MARKER || u.email?.startsWith('enjaz-a3-'));
    const passed=marked.length===0;
    if(!passed)ok=false;
    evidence.cleanup.push({check:'auth_marker_absent',passed,count:marked.length});
  }

  if(workspaces.length){
    const ws=await admin.from('workspaces').select('id').in('id',workspaces);
    const passed=!ws.error && (ws.data?.length??0)===0;
    if(!passed)ok=false;
    evidence.cleanup.push({check:'workspace_ids_absent',passed,count:ws.data?.length??null,error:ws.error?.message});
  }

  if(fixtureIds.length){
    const rows=await admin.from('integration_service_accounts').select('id').in('id',fixtureIds);
    const passed=!rows.error && (rows.data?.length??0)===0;
    if(!passed)ok=false;
    evidence.cleanup.push({check:'integration_fixture_ids_absent',passed,count:rows.data?.length??null,error:rows.error?.message});
  }
  return ok;
}

async function cleanup(){
  let ok=true;
  for(const workspaceId of [...workspaces].reverse()){
    const {error}=await admin.from('workspaces').delete().eq('id',workspaceId);
    if(error){ok=false;evidence.cleanup.push({workspaceId,passed:false,error:error.message})}
    else evidence.cleanup.push({workspaceId,passed:true});
  }
  for(const user of [...users].reverse()){
    const {error}=await admin.auth.admin.deleteUser(user.id,false);
    if(error){ok=false;evidence.cleanup.push({userId:user.id,passed:false,error:error.message})}
    else evidence.cleanup.push({userId:user.id,passed:true});
  }
  const zero=await verifyZeroResidue();
  evidence.cleanupPassed=ok&&zero;
}

try{
  const owner=await createUser('owner');
  const member=await createUser('member');
  const outsider=await createUser('outsider');
  const ownerWs=await workspaceFor(owner);
  const memberOwnWs=await workspaceFor(member);
  const outsiderWs=await workspaceFor(outsider);
  ensure(new Set([ownerWs,memberOwnWs,outsiderWs]).size===3,'distinct_bootstrapped_workspaces');

  const memberJoin=await admin.from('workspace_memberships').insert({
    workspace_id:ownerWs,
    user_id:member.id,
    role:'member',
  }).select('workspace_id,user_id,role');
  if(memberJoin.error)throw memberJoin.error;
  ensure(memberJoin.data?.length===1 && memberJoin.data[0].role==='member','real_same_workspace_member_created');

  const anonymous=make();
  const anonRead=await anonymous.from('integration_service_accounts').select('id').limit(1);
  ensure(Boolean(anonRead.error),'anonymous_direct_integration_read_denied');

  const ownerRead=await owner.client.from('integration_service_accounts').select('id').limit(1);
  ensure(Boolean(ownerRead.error),'authenticated_owner_direct_integration_read_denied');

  const memberRead=await member.client.from('integration_service_accounts').select('id').limit(1);
  ensure(Boolean(memberRead.error),'authenticated_same_workspace_member_direct_integration_read_denied');

  const outsiderRead=await outsider.client.from('integration_service_accounts').select('id').limit(1);
  ensure(Boolean(outsiderRead.error),'authenticated_outsider_direct_integration_read_denied');

  const fixtureId=crypto.randomUUID();
  fixtureIds.push(fixtureId);
  const inserted=await admin.from('integration_service_accounts').insert({
    id:fixtureId,
    workspace_id:ownerWs,
    name:'A3 hosted fixture',
    scopes:['companies:read'],
    created_by:owner.id,
  }).select('id,workspace_id,status,created_by');
  if(inserted.error)throw inserted.error;
  ensure(inserted.data?.length===1 && inserted.data[0].workspace_id===ownerWs,'service_role_can_persist_isolated_fixture');

  const ownerAfter=await owner.client.from('integration_service_accounts').select('id').eq('id',fixtureId);
  ensure(Boolean(ownerAfter.error),'owner_cannot_bypass_server_only_persistence');

  const memberAfter=await member.client.from('integration_service_accounts').select('id').eq('id',fixtureId);
  ensure(Boolean(memberAfter.error),'same_workspace_member_cannot_read_integration_fixture');

  const outsiderAfter=await outsider.client.from('integration_service_accounts').select('id').eq('id',fixtureId);
  ensure(Boolean(outsiderAfter.error),'cross_workspace_browser_read_denied');

  const adminRead=await admin.from('integration_service_accounts').select('id,workspace_id,status').eq('id',fixtureId);
  if(adminRead.error)throw adminRead.error;
  ensure(adminRead.data?.length===1 && adminRead.data[0].workspace_id===ownerWs,'server_readback_workspace_bound');

  evidence.passed=true;
} finally {
  await cleanup();
  evidence.completedAt=new Date().toISOString();
  await mkdir('artifacts/phase14-2-a3-hosted',{recursive:true});
  await writeFile(OUT,JSON.stringify(evidence,null,2));
}
if(!evidence.passed||!evidence.cleanupPassed)throw new Error('PHASE14_2_A3_HOSTED_ACCEPTANCE_FAILED');
console.log('PASS 14.2 A3 hosted Auth/RLS acceptance with independently verified zero marked residue');
